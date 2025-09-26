import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

const questionRequestSchema = Joi.object({
	question: Joi.string()
		.trim()
		.min(3)
		.max(1000)
		.required()
		.messages({
			'string.empty': 'Question cannot be empty',
			'string.min': 'Question must be at least 3 characters long',
			'string.max': 'Question cannot exceed 1000 characters',
			'any.required': 'Question is required'
		}),

	user_id: Joi.string()
		.uuid()
		.required()
		.messages({
			'string.guid': 'User ID must be a valid UUID',
			'any.required': 'User ID is required'
		}),

	question_type: Joi.string()
		.valid('algebra', 'calculus', 'geometry', 'arithmetic', 'other')
		.optional()
		.default('other')
		.messages({
			'any.only': 'Question type must be one of: algebra, calculus, geometry, arithmetic, other'
		})
});

const questionIdSchema = Joi.object({
	id: Joi.string()
		.uuid()
		.required()
		.messages({
			'string.guid': 'Question ID must be a valid UUID',
			'any.required': 'Question ID is required'
		})
});

const userIdSchema = Joi.object({
	userId: Joi.string()
		.uuid()
		.required()
		.messages({
			'string.guid': 'User ID must be a valid UUID',
			'any.required': 'User ID is required'
		})
});

const questionStatusSchema = Joi.object({
	status: Joi.string()
		.valid('pending', 'processing', 'completed', 'failed')
		.required()
		.messages({
			'any.only': 'Status must be one of: pending, processing, completed, failed',
			'any.required': 'Status is required'
		})
});

const paginationSchema = Joi.object({
	page: Joi.number()
		.integer()
		.min(1)
		.optional()
		.default(1),

	limit: Joi.number()
		.integer()
		.min(1)
		.max(100)
		.optional()
		.default(10)
});

const validateRequest = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
	return (req: Request, res: Response, next: NextFunction): void => {
		const { error, value } = schema.validate(req[property], {
			abortEarly: false,
			stripUnknown: true,
			convert: true
		});

		if (error) {
			logger.warn('Request validation failed:', {
				property,
				errors: error.details.map(detail => ({
					field: detail.path.join('.'),
					message: detail.message,
					value: detail.context?.value
				})),
				requestId: req.headers['x-request-id'] || 'unknown'
			});

			const response: ApiResponse = {
				success: false,
				error: 'Validation failed',
				message: error.details.map(detail => detail.message).join(', ')
			};

			res.status(400).json(response);
			return;
		}

		req[property] = value;
		next();
	};
};

export const validateQuestionRequest = validateRequest(questionRequestSchema, 'body');
export const validateQuestionId = validateRequest(questionIdSchema, 'params');
export const validateUserId = validateRequest(userIdSchema, 'params');
export const validateQuestionStatus = validateRequest(questionStatusSchema, 'params');
export const validatePagination = validateRequest(paginationSchema, 'query');

// Bulk Ingest Validation
const bulkQuestionSchema = Joi.object({
	question: Joi.string().min(1).max(1000).required(),
	user_id: Joi.string().uuid().required(),
	question_type: Joi.string().valid('algebra', 'calculus', 'geometry', 'arithmetic', 'other').required()
});

const bulkIngestSchema = Joi.object({
	questions: Joi.array().items(bulkQuestionSchema).min(1).max(50).required()
});

export const validateBulkIngest = validateRequest(bulkIngestSchema);

export {
	questionRequestSchema,
	questionIdSchema,
	userIdSchema,
	questionStatusSchema,
	paginationSchema
};
