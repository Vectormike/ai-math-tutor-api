import { questionRepository } from '../repositories/questionRepository';
import { answerRepository } from '../repositories/answerRepository';
import { userRepository } from '../repositories/userRepository';
import { aiService } from '../infrastructure/ai';
import { redisService } from '../infrastructure/redis';
import {
	Question,
	UserHistory,
	QuestionResponse,
	AnswerResponse,
	BulkIngestRequest,
	BulkIngestResponse,
	BulkIngestResult
} from '../types';
import { logger } from '../utils/logger';

export class QuestionService {
	async submitQuestion(
		question: string,
		userId: string,
		questionType: string = 'other'
	): Promise<QuestionResponse | AnswerResponse> {
		try {
			const user = await userRepository.getUserById(userId);
			if (!user) {
				throw new Error('User not found');
			}

			const cacheKey = redisService.generateQuestionCacheKey(question);
			const cachedAnswer = await redisService.get<AnswerResponse>(cacheKey);

			if (cachedAnswer) {
				logger.info('Cache hit for question:', { cacheKey, userId });

				const questionRecord = await questionRepository.createQuestion(
					userId,
					question,
					questionType
				);

				if (questionRecord) {
					await answerRepository.createAnswer(
						questionRecord.id,
						cachedAnswer.steps,
						cachedAnswer.final_answer,
						cachedAnswer.explanation,
						cachedAnswer.processing_time_ms || 0
					);
				}

				return {
					...cachedAnswer,
					id: questionRecord?.id || 'cached',
					created_at: new Date().toISOString()
				};
			}

			const questionRecord = await questionRepository.createQuestion(
				userId,
				question,
				questionType
			);

			if (!questionRecord) {
				throw new Error('Failed to create question');
			}

			await questionRepository.updateQuestionStatus(questionRecord.id, 'processing');

			try {
				const aiStartTime = Date.now();
				const aiResponse = await aiService.solveMathProblem(question, questionType);
				console.log('aiResponse', aiResponse);
				const processingTime = Date.now() - aiStartTime;

				const answerRecord = await answerRepository.createAnswer(
					questionRecord.id,
					aiResponse.steps,
					aiResponse.final_answer,
					aiResponse.explanation,
					processingTime,
					aiResponse.ai_model_used
				);

				if (answerRecord) {
					await questionRepository.updateQuestionStatus(questionRecord.id, 'completed');

					const answerResponse: AnswerResponse = {
						id: questionRecord.id,
						question: question,
						question_type: questionType,
						status: 'completed',
						steps: aiResponse.steps,
						final_answer: aiResponse.final_answer,
						explanation: aiResponse.explanation,
						created_at: answerRecord.created_at.toISOString(),
						processing_time_ms: processingTime
					};

					await redisService.set(cacheKey, answerResponse, 3600);

					logger.info('Question processed successfully:', {
						questionId: questionRecord.id,
						userId,
						processingTime,
						stepCount: aiResponse.steps.length
					});

					return answerResponse;
				}
			} catch (aiError) {
				logger.error('AI processing error:', {
					questionId: questionRecord.id,
					error: aiError
				});
				await questionRepository.updateQuestionStatus(questionRecord.id, 'failed');
			}

			return {
				id: questionRecord.id,
				status: 'processing',
				message: 'Question submitted successfully. Processing may take a moment.'
			};

		} catch (error) {
			logger.error('Error in submitQuestion:', {
				userId,
				question,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
			throw error;
		}
	}

	async getQuestionWithAnswer(questionId: string): Promise<AnswerResponse | null> {
		try {
			const questionWithAnswer = await questionRepository.getQuestionWithAnswer(questionId);

			if (!questionWithAnswer) {
				return null;
			}

			return {
				id: questionWithAnswer.id,
				question: questionWithAnswer.question_text,
				question_type: questionWithAnswer.question_type,
				status: questionWithAnswer.status,
				steps: questionWithAnswer.answer?.steps || [],
				final_answer: questionWithAnswer.answer?.final_answer || '',
				explanation: questionWithAnswer.answer?.explanation || '',
				created_at: questionWithAnswer.created_at.toISOString(),
				processing_time_ms: questionWithAnswer.answer?.processing_time_ms || 0
			};
		} catch (error) {
			logger.error('Error in getQuestionWithAnswer:', { questionId, error });
			throw error;
		}
	}

	async deleteQuestion(questionId: string): Promise<boolean> {
		try {
			return await questionRepository.deleteQuestion(questionId);
		} catch (error) {
			logger.error('Error in deleteQuestion:', { questionId, error });
			throw error;
		}
	}

	async getUserHistory(
		userId: string,
		page: number = 1,
		limit: number = 10
	): Promise<UserHistory | null> {
		try {
			const cacheKey = redisService.generateUserHistoryCacheKey(userId, page);
			const cachedHistory = await redisService.get<UserHistory>(cacheKey);

			if (cachedHistory) {
				logger.debug('Cache hit for user history:', { userId, page });
				return cachedHistory;
			}

			const user = await userRepository.getUserById(userId);
			if (!user) {
				throw new Error('User not found');
			}

			const history = await questionRepository.getUserHistory(userId, page, limit);

			if (history) {
				await redisService.set(cacheKey, history, 300);
			}

			return history;
		} catch (error) {
			logger.error('Error in getUserHistory:', { userId, page, limit, error });
			throw error;
		}
	}

	async getQuestionsByStatus(status: string, limit: number = 100): Promise<Question[]> {
		try {
			return await questionRepository.getQuestionsByStatus(status, limit);
		} catch (error) {
			logger.error('Error in getQuestionsByStatus:', { status, limit, error });
			throw error;
		}
	}

	async getQuestionStats(): Promise<any> {
		try {
			return await questionRepository.getQuestionStats();
		} catch (error) {
			logger.error('Error in getQuestionStats:', { error });
			throw error;
		}
	}

	async processPendingQuestions(): Promise<void> {
		try {
			const pendingQuestions = await questionRepository.getQuestionsByStatus('pending', 10);

			for (const question of pendingQuestions) {
				try {
					await questionRepository.updateQuestionStatus(question.id, 'processing');

					const aiStartTime = Date.now();
					const aiResponse = await aiService.solveMathProblem(
						question.question_text,
						question.question_type
					);
					const processingTime = Date.now() - aiStartTime;

					await answerRepository.createAnswer(
						question.id,
						aiResponse.steps,
						aiResponse.final_answer,
						aiResponse.explanation,
						processingTime
					);

					await questionRepository.updateQuestionStatus(question.id, 'completed');

					logger.info('Background processing completed:', { questionId: question.id });
				} catch (error) {
					logger.error('Error processing pending question:', {
						questionId: question.id,
						error
					});
					await questionRepository.updateQuestionStatus(question.id, 'failed');
				}
			}
		} catch (error) {
			logger.error('Error in processPendingQuestions:', { error });
			throw error;
		}
	}

	async bulkIngestQuestions(bulkRequest: BulkIngestRequest): Promise<BulkIngestResponse> {
		const startTime = Date.now();
		const results: BulkIngestResult[] = [];
		let successful = 0;
		let failed = 0;

		logger.info('Starting bulk ingest:', {
			totalQuestions: bulkRequest.questions.length
		});

		// Process questions in parallel for better performance
		const processPromises = bulkRequest.questions.map(async (questionRequest) => {
			const questionStartTime = Date.now();

			try {
				// Verify user exists
				const user = await userRepository.getUserById(questionRequest.user_id);
				if (!user) {
					throw new Error('User not found');
				}

				// Create question record
				const questionRecord = await questionRepository.createQuestion(
					questionRequest.user_id,
					questionRequest.question,
					questionRequest.question_type
				);

				if (!questionRecord) {
					throw new Error('Failed to create question');
				}

				// Process with AI
				await questionRepository.updateQuestionStatus(questionRecord.id, 'processing');

				const aiResponse = await aiService.solveMathProblem(
					questionRequest.question,
					questionRequest.question_type
				);

				const processingTime = Date.now() - questionStartTime;

				// Create answer record
				await answerRepository.createAnswer(
					questionRecord.id,
					aiResponse.steps,
					aiResponse.final_answer,
					aiResponse.explanation,
					processingTime,
					aiResponse.ai_model_used
				);

				await questionRepository.updateQuestionStatus(questionRecord.id, 'completed');

				successful++;
				return {
					question: questionRequest.question,
					success: true,
					question_id: questionRecord.id,
					processing_time_ms: processingTime
				};

			} catch (error) {
				failed++;
				const processingTime = Date.now() - questionStartTime;

				logger.error('Bulk ingest question failed:', {
					question: questionRequest.question,
					error: error instanceof Error ? error.message : 'Unknown error'
				});

				return {
					question: questionRequest.question,
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error',
					processing_time_ms: processingTime
				};
			}
		});

		// Wait for all questions to be processed
		const questionResults = await Promise.all(processPromises);
		results.push(...questionResults);

		const totalProcessingTime = Date.now() - startTime;

		logger.info('Bulk ingest completed:', {
			totalQuestions: bulkRequest.questions.length,
			successful,
			failed,
			totalProcessingTime
		});

		return {
			total_questions: bulkRequest.questions.length,
			successful,
			failed,
			results,
			processing_time_ms: totalProcessingTime
		};
	}
}

export const questionService = new QuestionService();
