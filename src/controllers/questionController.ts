import { Request, Response } from 'express';
import { questionService } from '../services/questionService';
import { ApiResponse, QuestionResponse, AnswerResponse, BulkIngestRequest, BulkIngestResponse } from '../types';
import { logger } from '../utils/logger';

export class QuestionController {
	async submitQuestion(req: Request, res: Response): Promise<void> {
		const { question, user_id, question_type } = req.body;

		try {
			logger.info('New question submitted:', {
				userId: user_id,
				questionType: question_type,
				questionLength: question.length
			});

			const result = await questionService.submitQuestion(question, user_id, question_type);

			if ('steps' in result) {
				// It's an AnswerResponse (completed)
				const response: ApiResponse<AnswerResponse> = {
					success: true,
					data: result as AnswerResponse,
					message: 'Question processed successfully'
				};
				res.status(201).json(response);
			} else {
				// It's a QuestionResponse (processing)
				const response: ApiResponse<QuestionResponse> = {
					success: true,
					data: result as QuestionResponse,
					message: 'Question submitted for processing'
				};
				res.status(202).json(response);
			}

		} catch (error) {
			logger.error('Error in submitQuestion controller:', {
				userId: user_id,
				error: error instanceof Error ? error.message : 'Unknown error'
			});

			const response: ApiResponse = {
				success: false,
				error: error instanceof Error && error.message === 'User not found'
					? 'User not found'
					: 'Internal server error',
				message: error instanceof Error && error.message === 'User not found'
					? 'Please create a user account first'
					: 'Failed to process question'
			};

			const statusCode = error instanceof Error && error.message === 'User not found'
				? 404
				: 500;

			res.status(statusCode).json(response);
		}
	}

	async getQuestionById(req: Request, res: Response): Promise<void> {
		const questionId = req.params.id;

		try {
			const questionWithAnswer = await questionService.getQuestionWithAnswer(questionId);

			if (!questionWithAnswer) {
				const response: ApiResponse = {
					success: false,
					error: 'Question not found',
					message: 'The requested question does not exist'
				};
				res.status(404).json(response);
				return;
			}

			const response: ApiResponse<AnswerResponse> = {
				success: true,
				data: questionWithAnswer
			};

			res.status(200).json(response);

		} catch (error) {
			logger.error('Error in getQuestionById controller:', { questionId, error });

			const response: ApiResponse = {
				success: false,
				error: 'Internal server error',
				message: 'Failed to fetch question'
			};
			res.status(500).json(response);
		}
	}

	async deleteQuestion(req: Request, res: Response): Promise<void> {
		const questionId = req.params.id;

		try {
			const deleted = await questionService.deleteQuestion(questionId);

			if (!deleted) {
				const response: ApiResponse = {
					success: false,
					error: 'Question not found',
					message: 'The requested question does not exist or could not be deleted'
				};
				res.status(404).json(response);
				return;
			}

			const response: ApiResponse = {
				success: true,
				message: 'Question deleted successfully'
			};

			res.status(200).json(response);

		} catch (error) {
			logger.error('Error in deleteQuestion controller:', { questionId, error });

			const response: ApiResponse = {
				success: false,
				error: 'Internal server error',
				message: 'Failed to delete question'
			};
			res.status(500).json(response);
		}
	}

	async getUserHistory(req: Request, res: Response): Promise<void> {
		const userId = req.params.userId;
		const page = parseInt(req.query.page as string) || 1;
		const limit = parseInt(req.query.limit as string) || 10;

		try {
			const history = await questionService.getUserHistory(userId, page, limit);

			if (!history) {
				const response: ApiResponse = {
					success: false,
					error: 'Failed to fetch history',
					message: 'Unable to retrieve user history'
				};
				res.status(500).json(response);
				return;
			}

			const response: ApiResponse = {
				success: true,
				data: history
			};

			res.status(200).json(response);

		} catch (error) {
			logger.error('Error in getUserHistory controller:', { userId, page, limit, error });

			const response: ApiResponse = {
				success: false,
				error: error instanceof Error && error.message === 'User not found'
					? 'User not found'
					: 'Internal server error',
				message: error instanceof Error && error.message === 'User not found'
					? 'The specified user does not exist'
					: 'Failed to fetch user history'
			};

			const statusCode = error instanceof Error && error.message === 'User not found'
				? 404
				: 500;

			res.status(statusCode).json(response);
		}
	}

	async getQuestionsByStatus(req: Request, res: Response): Promise<void> {
		const status = req.query.status as string;
		const limit = parseInt(req.query.limit as string) || 100;

		try {
			const questions = await questionService.getQuestionsByStatus(
				status || 'pending',
				limit || 100
			);

			const response: ApiResponse = {
				success: true,
				data: questions
			};

			res.status(200).json(response);

		} catch (error) {
			logger.error('Error in getQuestionsByStatus controller:', { status, limit, error });

			const response: ApiResponse = {
				success: false,
				error: 'Internal server error',
				message: 'Failed to fetch questions'
			};
			res.status(500).json(response);
		}
	}

	async bulkIngestQuestions(req: Request, res: Response): Promise<void> {
		const bulkRequest: BulkIngestRequest = req.body;

		try {
			logger.info('Bulk ingest request received:', {
				totalQuestions: bulkRequest.questions.length
			});

			const result = await questionService.bulkIngestQuestions(bulkRequest);

			const response: ApiResponse<BulkIngestResponse> = {
				success: true,
				data: result,
				message: `Bulk ingest completed: ${result.successful}/${result.total_questions} questions processed successfully`
			};

			res.status(201).json(response);

		} catch (error) {
			logger.error('Error in bulkIngestQuestions controller:', {
				totalQuestions: bulkRequest.questions.length,
				error: error instanceof Error ? error.message : 'Unknown error'
			});

			const response: ApiResponse = {
				success: false,
				error: 'Internal server error',
				message: 'Failed to process bulk ingest request'
			};

			res.status(500).json(response);
		}
	}
}

export const questionController = new QuestionController();
