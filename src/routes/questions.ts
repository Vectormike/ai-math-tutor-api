import { Router } from 'express';
import {
  validateQuestionRequest,
  validateQuestionId,
  validateUserId,
  validatePagination,
  validateBulkIngest
} from '../validators/questionValidators';
import { questionController } from '../controllers/questionController';

const router = Router();

// POST /api/question - Submit a new math question
router.post('/', validateQuestionRequest, questionController.submitQuestion.bind(questionController));

// GET /api/question/:id - Get question and answer by ID
router.get('/:id', validateQuestionId, questionController.getQuestionById.bind(questionController));

// DELETE /api/question/:id - Delete a question
router.delete('/:id', validateQuestionId, questionController.deleteQuestion.bind(questionController));

// GET /api/user/:userId/history - Get user's question history
router.get('/user/:userId/history',
  validateUserId,
  validatePagination,
  questionController.getUserHistory.bind(questionController)
);

// POST /api/question/ingest - Bulk ingest multiple questions
router.post('/ingest', validateBulkIngest, questionController.bulkIngestQuestions.bind(questionController));

export default router;
