import { query } from '../database/connection';
import { logger } from '../utils/logger';
import { Question, Answer, User, UserHistory, AIStep } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class DatabaseService {
  // User operations
  async createUser(email: string, name: string): Promise<User | null> {
    try {
      const result = await query(
        'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
        [email, name]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error creating user:', { email, error });
      return null;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const result = await query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching user:', { userId, error });
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching user by email:', { email, error });
      return null;
    }
  }

  // Question operations
  async createQuestion(userId: string, questionText: string, questionType: string = 'other'): Promise<Question | null> {
    try {
      const result = await query(
        'INSERT INTO questions (user_id, question_text, question_type, status) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, questionText, questionType, 'pending']
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error creating question:', { userId, questionText, error });
      return null;
    }
  }

  async getQuestionById(questionId: string): Promise<Question | null> {
    try {
      const result = await query(
        'SELECT * FROM questions WHERE id = $1',
        [questionId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching question:', { questionId, error });
      return null;
    }
  }

  async updateQuestionStatus(questionId: string, status: string): Promise<boolean> {
    try {
      const result = await query(
        'UPDATE questions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [status, questionId]
      );
      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error updating question status:', { questionId, status, error });
      return false;
    }
  }

  async deleteQuestion(questionId: string): Promise<boolean> {
    try {
      // First check if question exists and get user for logging
      const question = await this.getQuestionById(questionId);
      if (!question) {
        logger.warn('Attempted to delete non-existent question:', { questionId });
        return false;
      }

      const result = await query(
        'DELETE FROM questions WHERE id = $1',
        [questionId]
      );
      
      logger.info('Question deleted:', { 
        questionId, 
        userId: question.user_id,
        deleted: result.rowCount > 0 
      });
      
      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error deleting question:', { questionId, error });
      return false;
    }
  }

  // Answer operations
  async createAnswer(
    questionId: string,
    steps: AIStep[],
    finalAnswer: string,
    explanation: string,
    processingTimeMs: number,
    aiModelUsed: string = 'gpt-4'
  ): Promise<Answer | null> {
    try {
      const result = await query(
        'INSERT INTO answers (question_id, steps, final_answer, explanation, processing_time_ms, ai_model_used) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [questionId, JSON.stringify(steps), finalAnswer, explanation, processingTimeMs, aiModelUsed]
      );
      
      // Also update question status to completed
      await this.updateQuestionStatus(questionId, 'completed');
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error creating answer:', { questionId, error });
      // Update question status to failed
      await this.updateQuestionStatus(questionId, 'failed');
      return null;
    }
  }

  async getAnswerByQuestionId(questionId: string): Promise<Answer | null> {
    try {
      const result = await query(
        'SELECT * FROM answers WHERE question_id = $1',
        [questionId]
      );
      
      if (result.rows[0]) {
        // Parse the JSON steps
        result.rows[0].steps = JSON.parse(result.rows[0].steps);
      }
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching answer:', { questionId, error });
      return null;
    }
  }

  // Combined operations for better performance
  async getQuestionWithAnswer(questionId: string): Promise<(Question & { answer?: Answer }) | null> {
    try {
      const result = await query(`
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
      `, [questionId]);
      
      if (!result.rows[0]) {
        return null;
      }

      const row = result.rows[0];
      const question: Question & { answer?: Answer } = {
        id: row.id,
        user_id: row.user_id,
        question_text: row.question_text,
        question_type: row.question_type,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at
      };

      // Add answer if it exists
      if (row.answer_id) {
        question.answer = {
          id: row.answer_id,
          question_id: row.id,
          steps: JSON.parse(row.steps),
          final_answer: row.final_answer,
          explanation: row.explanation,
          processing_time_ms: row.processing_time_ms,
          ai_model_used: row.ai_model_used,
          created_at: row.answer_created_at
        };
      }

      return question;
    } catch (error) {
      logger.error('Error fetching question with answer:', { questionId, error });
      return null;
    }
  }

  async getUserHistory(userId: string, page: number = 1, limit: number = 20): Promise<UserHistory | null> {
    try {
      const offset = (page - 1) * limit;
      
      // Get total count
      const countResult = await query(
        'SELECT COUNT(*) FROM questions WHERE user_id = $1',
        [userId]
      );
      const totalCount = parseInt(countResult.rows[0].count);

      // Get paginated questions with answers
      const result = await query(`
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
      `, [userId, limit, offset]);

      const questions = result.rows.map(row => ({
        id: row.id,
        question_text: row.question_text,
        question_type: row.question_type,
        status: row.status,
        created_at: row.created_at.toISOString(),
        ...(row.steps && {
          answer: {
            steps: JSON.parse(row.steps),
            final_answer: row.final_answer,
            explanation: row.explanation
          }
        })
      }));

      return {
        user_id: userId,
        questions,
        total_count: totalCount
      };
    } catch (error) {
      logger.error('Error fetching user history:', { userId, page, limit, error });
      return null;
    }
  }

  // Statistics and monitoring
  async getQuestionStats(): Promise<any> {
    try {
      const result = await query('SELECT * FROM get_question_stats()');
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching question stats:', error);
      return null;
    }
  }

  // Search questions by text (using full-text search index)
  async searchQuestions(searchTerm: string, limit: number = 10): Promise<Question[]> {
    try {
      const result = await query(`
        SELECT * FROM questions 
        WHERE to_tsvector('english', question_text) @@ plainto_tsquery('english', $1)
        ORDER BY ts_rank(to_tsvector('english', question_text), plainto_tsquery('english', $1)) DESC
        LIMIT $2
      `, [searchTerm, limit]);

      return result.rows;
    } catch (error) {
      logger.error('Error searching questions:', { searchTerm, error });
      return [];
    }
  }

  // Get questions by type for analytics
  async getQuestionsByType(questionType: string, limit: number = 50): Promise<Question[]> {
    try {
      const result = await query(`
        SELECT * FROM questions 
        WHERE question_type = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `, [questionType, limit]);

      return result.rows;
    } catch (error) {
      logger.error('Error fetching questions by type:', { questionType, error });
      return [];
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const result = await query('SELECT 1');
      return result.rows[0]['?column?'] === 1;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();