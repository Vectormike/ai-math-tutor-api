import { pool } from '../database/connection';
import { Answer, AIStep } from '../types';
import { logger } from '../utils/logger';

export class AnswerRepository {
    /**
     * Create a new answer in the database
     */
    async createAnswer(
        questionId: string,
        steps: AIStep[],
        finalAnswer: string,
        explanation: string,
        processingTimeMs: number,
        aiModelUsed: string = 'gpt-4'
    ): Promise<Answer | null> {
        try {
            const query = `
        INSERT INTO answers (
          question_id,
          steps,
          final_answer,
          explanation,
          processing_time_ms,
          ai_model_used
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

            const result = await pool.query(query, [
                questionId,
                JSON.stringify(steps),
                finalAnswer,
                explanation,
                processingTimeMs,
                aiModelUsed
            ]);

            if (result.rows.length === 0) {
                return null;
            }

            const row = result.rows[0];
            return {
                id: row.id,
                question_id: row.question_id,
                steps: row.steps,
                final_answer: row.final_answer,
                explanation: row.explanation,
                processing_time_ms: row.processing_time_ms,
                ai_model_used: row.ai_model_used,
                created_at: row.created_at
            };
        } catch (error) {
            logger.error('Error creating answer:', {
                questionId,
                processingTimeMs,
                error
            });
            throw error;
        }
    }

    /**
     * Get an answer by question ID
     */
    async getAnswerByQuestionId(questionId: string): Promise<Answer | null> {
        try {
            const query = 'SELECT * FROM answers WHERE question_id = $1';
            const result = await pool.query(query, [questionId]);

            if (result.rows.length === 0) {
                return null;
            }

            const row = result.rows[0];
            return {
                id: row.id,
                question_id: row.question_id,
                steps: row.steps,
                final_answer: row.final_answer,
                explanation: row.explanation,
                processing_time_ms: row.processing_time_ms,
                ai_model_used: row.ai_model_used,
                created_at: row.created_at
            };
        } catch (error) {
            logger.error('Error getting answer by question ID:', { questionId, error });
            throw error;
        }
    }

    /**
     * Get an answer by ID
     */
    async getAnswerById(answerId: string): Promise<Answer | null> {
        try {
            const query = 'SELECT * FROM answers WHERE id = $1';
            const result = await pool.query(query, [answerId]);

            if (result.rows.length === 0) {
                return null;
            }

            const row = result.rows[0];
            return {
                id: row.id,
                question_id: row.question_id,
                steps: row.steps,
                final_answer: row.final_answer,
                explanation: row.explanation,
                processing_time_ms: row.processing_time_ms,
                ai_model_used: row.ai_model_used,
                created_at: row.created_at
            };
        } catch (error) {
            logger.error('Error getting answer by ID:', { answerId, error });
            throw error;
        }
    }

    /**
     * Update an answer
     */
    async updateAnswer(
        answerId: string,
        steps: AIStep[],
        finalAnswer: string,
        explanation: string,
        processingTimeMs: number
    ): Promise<boolean> {
        try {
            const query = `
        UPDATE answers
        SET steps = $1, final_answer = $2, explanation = $3, processing_time_ms = $4
        WHERE id = $5
      `;

            const result = await pool.query(query, [
                JSON.stringify(steps),
                finalAnswer,
                explanation,
                processingTimeMs,
                answerId
            ]);

            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.error('Error updating answer:', { answerId, error });
            throw error;
        }
    }

    /**
     * Delete an answer
     */
    async deleteAnswer(answerId: string): Promise<boolean> {
        try {
            const query = 'DELETE FROM answers WHERE id = $1';
            const result = await pool.query(query, [answerId]);
            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.error('Error deleting answer:', { answerId, error });
            throw error;
        }
    }

    /**
     * Get answers by processing time range
     */
    async getAnswersByProcessingTime(
        minTime: number,
        maxTime: number,
        limit: number = 100
    ): Promise<Answer[]> {
        try {
            const query = `
        SELECT * FROM answers
        WHERE processing_time_ms BETWEEN $1 AND $2
        ORDER BY processing_time_ms DESC
        LIMIT $3
      `;

            const result = await pool.query(query, [minTime, maxTime, limit]);

            return result.rows.map(row => ({
                id: row.id,
                question_id: row.question_id,
                steps: row.steps,
                final_answer: row.final_answer,
                explanation: row.explanation,
                processing_time_ms: row.processing_time_ms,
                ai_model_used: row.ai_model_used,
                created_at: row.created_at
            }));
        } catch (error) {
            logger.error('Error getting answers by processing time:', {
                minTime,
                maxTime,
                limit,
                error
            });
            throw error;
        }
    }

    /**
     * Get average processing time
     */
    async getAverageProcessingTime(): Promise<number> {
        try {
            const query = 'SELECT AVG(processing_time_ms) as avg_time FROM answers';
            const result = await pool.query(query);

            if (result.rows.length === 0 || !result.rows[0].avg_time) {
                return 0;
            }

            return parseFloat(result.rows[0].avg_time);
        } catch (error) {
            logger.error('Error getting average processing time:', { error });
            throw error;
        }
    }
}

export const answerRepository = new AnswerRepository();
