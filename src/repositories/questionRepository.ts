import { pool } from '../database/connection';
import { Question, UserHistory } from '../types';
import { logger } from '../utils/logger';

export class QuestionRepository {
	async createQuestion(
		userId: string,
		questionText: string,
		questionType: string = 'other'
	): Promise<Question | null> {
		try {
			const query = `
        INSERT INTO questions (user_id, question_text, question_type, status)
        VALUES ($1, $2, $3, 'pending')
        RETURNING *
      `;

			const result = await pool.query(query, [userId, questionText, questionType]);

			if (result.rows.length === 0) {
				return null;
			}

			const row = result.rows[0];
			return {
				id: row.id,
				user_id: row.user_id,
				question_text: row.question_text,
				question_type: row.question_type,
				status: row.status,
				created_at: row.created_at,
				updated_at: row.updated_at
			};
		} catch (error) {
			logger.error('Error creating question:', { userId, questionText, error });
			throw error;
		}
	}

	async getQuestionById(questionId: string): Promise<Question | null> {
		try {
			const query = 'SELECT * FROM questions WHERE id = $1';
			const result = await pool.query(query, [questionId]);

			if (result.rows.length === 0) {
				return null;
			}

			const row = result.rows[0];
			return {
				id: row.id,
				user_id: row.user_id,
				question_text: row.question_text,
				question_type: row.question_type,
				status: row.status,
				created_at: row.created_at,
				updated_at: row.updated_at
			};
		} catch (error) {
			logger.error('Error getting question by ID:', { questionId, error });
			throw error;
		}
	}

	async getQuestionWithAnswer(questionId: string): Promise<any | null> {
		try {
			const query = `
        SELECT
          q.*,
          a.id as answer_id,
          a.steps,
          a.final_answer,
          a.explanation,
          a.processing_time_ms,
          a.ai_model_used,
          a.created_at as answer_created_at
        FROM questions q
        LEFT JOIN answers a ON q.id = a.question_id
        WHERE q.id = $1
      `;

			const result = await pool.query(query, [questionId]);

			if (result.rows.length === 0) {
				return null;
			}

			const row = result.rows[0];
			return {
				id: row.id,
				user_id: row.user_id,
				question_text: row.question_text,
				question_type: row.question_type,
				status: row.status,
				created_at: row.created_at,
				updated_at: row.updated_at,
				answer: row.answer_id ? {
					id: row.answer_id,
					steps: row.steps,
					final_answer: row.final_answer,
					explanation: row.explanation,
					processing_time_ms: row.processing_time_ms,
					ai_model_used: row.ai_model_used,
					created_at: row.answer_created_at
				} : null
			};
		} catch (error) {
			logger.error('Error getting question with answer:', { questionId, error });
			throw error;
		}
	}

	async updateQuestionStatus(questionId: string, status: string): Promise<boolean> {
		try {
			const query = 'UPDATE questions SET status = $1 WHERE id = $2';
			const result = await pool.query(query, [status, questionId]);
			return (result.rowCount ?? 0) > 0;
		} catch (error) {
			logger.error('Error updating question status:', { questionId, status, error });
			throw error;
		}
	}

	async deleteQuestion(questionId: string): Promise<boolean> {
		try {
			const query = 'DELETE FROM questions WHERE id = $1';
			const result = await pool.query(query, [questionId]);
			return (result.rowCount ?? 0) > 0;
		} catch (error) {
			logger.error('Error deleting question:', { questionId, error });
			throw error;
		}
	}

	async getUserHistory(
		userId: string,
		page: number = 1,
		limit: number = 10
	): Promise<UserHistory | null> {
		try {
			const offset = (page - 1) * limit;

			const countQuery = 'SELECT COUNT(*) FROM questions WHERE user_id = $1';
			const countResult = await pool.query(countQuery, [userId]);
			const totalCount = parseInt(countResult.rows[0].count);

			const query = `
        SELECT
          q.id,
          q.question_text,
          q.question_type,
          q.status,
          q.created_at,
          a.steps,
          a.final_answer,
          a.explanation
        FROM questions q
        LEFT JOIN answers a ON q.id = a.question_id
        WHERE q.user_id = $1
        ORDER BY q.created_at DESC
        LIMIT $2 OFFSET $3
      `;

			const result = await pool.query(query, [userId, limit, offset]);

			const questions = result.rows.map(row => ({
				id: row.id,
				question_text: row.question_text,
				question_type: row.question_type,
				status: row.status,
				created_at: row.created_at.toISOString(),
				answer: row.steps ? {
					steps: row.steps,
					final_answer: row.final_answer,
					explanation: row.explanation
				} : undefined
			}));

			return {
				user_id: userId,
				questions,
				total_count: totalCount
			};
		} catch (error) {
			logger.error('Error getting user history:', { userId, page, limit, error });
			throw error;
		}
	}

	async getQuestionsByStatus(status: string, limit: number = 100): Promise<Question[]> {
		try {
			const query = `
        SELECT * FROM questions
        WHERE status = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

			const result = await pool.query(query, [status, limit]);

			return result.rows.map(row => ({
				id: row.id,
				user_id: row.user_id,
				question_text: row.question_text,
				question_type: row.question_type,
				status: row.status,
				created_at: row.created_at,
				updated_at: row.updated_at
			}));
		} catch (error) {
			logger.error('Error getting questions by status:', { status, limit, error });
			throw error;
		}
	}

	async getQuestionStats(): Promise<any> {
		try {
			const query = 'SELECT * FROM get_question_stats()';
			const result = await pool.query(query);

			if (result.rows.length === 0) {
				return null;
			}

			return result.rows[0];
		} catch (error) {
			logger.error('Error getting question stats:', { error });
			throw error;
		}
	}
}

export const questionRepository = new QuestionRepository();
