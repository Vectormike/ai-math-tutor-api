import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

const userCreateSchema = Joi.object({
	email: Joi.string()
		.email()
		.required()
		.messages({
			'string.email': 'Email must be a valid email address',
			'any.required': 'Email is required'
		}),

	name: Joi.string()
		.trim()
		.min(1)
		.max(255)
		.required()
		.messages({
			'string.empty': 'Name cannot be empty',
			'string.max': 'Name cannot exceed 255 characters',
			'any.required': 'Name is required'
		})
});

const userUpdateSchema = Joi.object({
	email: Joi.string()
		.email()
		.optional()
		.messages({
			'string.email': 'Email must be a valid email address'
		}),

	name: Joi.string()
		.trim()
		.min(1)
		.max(255)
		.optional()
		.messages({
			'string.empty': 'Name cannot be empty',
			'string.max': 'Name cannot exceed 255 characters'
		})
}).min(1).messages({
	'object.min': 'At least one field must be provided for update'
});

const userEmailSchema = Joi.object({
	email: Joi.string()
		.email()
		.required()
		.messages({
			'string.email': 'Email must be a valid email address',
			'any.required': 'Email parameter is required'
		})
});

const userIdSchema = Joi.object({
	id: Joi.string()
		.uuid()
		.required()
		.messages({
			'string.guid': 'User ID must be a valid UUID',
			'any.required': 'User ID is required'
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

export const validateUserCreate = validateRequest(userCreateSchema, 'body');
export const validateUserUpdate = validateRequest(userUpdateSchema, 'body');
export const validateUserEmail = validateRequest(userEmailSchema, 'query');
export const validateUserId = validateRequest(userIdSchema, 'params');
export const validatePagination = validateRequest(paginationSchema, 'query');

export {
	userCreateSchema,
	userUpdateSchema,
	userEmailSchema,
	userIdSchema,
	paginationSchema
};
