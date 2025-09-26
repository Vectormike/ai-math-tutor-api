import { Request, Response } from 'express';
import { userService } from '../services/userService';
import { ApiResponse, User } from '../types';
import { logger } from '../utils/logger';

export class UserController {
	async createUser(req: Request, res: Response): Promise<void> {
		const { email, name } = req.body;

		try {
			const user = await userService.createUser(email, name);

			const response: ApiResponse<User> = {
				success: true,
				data: user,
				message: 'User created successfully'
			};

			res.status(201).json(response);
		} catch (error) {
			logger.error('Error in createUser controller:', { email, name, error });

			const response: ApiResponse = {
				success: false,
				error: error instanceof Error && error.message === 'User with this email already exists'
					? 'Email already exists'
					: 'Internal server error',
				message: error instanceof Error && error.message === 'User with this email already exists'
					? 'A user with this email already exists'
					: 'Failed to create user'
			};

			const statusCode = error instanceof Error && error.message === 'User with this email already exists'
				? 409
				: 500;

			res.status(statusCode).json(response);
		}
	}

	async getUserById(req: Request, res: Response): Promise<void> {
		const userId = req.params.id;

		try {
			const user = await userService.getUserById(userId);

			if (!user) {
				const response: ApiResponse = {
					success: false,
					error: 'User not found',
					message: 'The requested user does not exist'
				};
				res.status(404).json(response);
				return;
			}

			const response: ApiResponse<User> = {
				success: true,
				data: user
			};

			res.status(200).json(response);
		} catch (error) {
			logger.error('Error in getUserById controller:', { userId, error });

			const response: ApiResponse = {
				success: false,
				error: 'Internal server error',
				message: 'Failed to fetch user'
			};

			res.status(500).json(response);
		}
	}

	async getUserByEmail(req: Request, res: Response): Promise<void> {
		const { email } = req.query;

		if (!email || typeof email !== 'string') {
			const response: ApiResponse = {
				success: false,
				error: 'Invalid request',
				message: 'Email parameter is required'
			};
			res.status(400).json(response);
			return;
		}

		try {
			const user = await userService.getUserByEmail(email);

			if (!user) {
				const response: ApiResponse = {
					success: false,
					error: 'User not found',
					message: 'No user found with this email'
				};
				res.status(404).json(response);
				return;
			}

			const response: ApiResponse<User> = {
				success: true,
				data: user
			};

			res.status(200).json(response);
		} catch (error) {
			logger.error('Error in getUserByEmail controller:', { email, error });

			const response: ApiResponse = {
				success: false,
				error: 'Internal server error',
				message: 'Failed to fetch user'
			};

			res.status(500).json(response);
		}
	}

	async updateUser(req: Request, res: Response): Promise<void> {
		const userId = req.params.id;
		const updates = req.body;

		try {
			const updatedUser = await userService.updateUser(userId, updates);

			if (!updatedUser) {
				const response: ApiResponse = {
					success: false,
					error: 'User not found',
					message: 'The requested user does not exist'
				};
				res.status(404).json(response);
				return;
			}

			const response: ApiResponse<User> = {
				success: true,
				data: updatedUser,
				message: 'User updated successfully'
			};

			res.status(200).json(response);
		} catch (error) {
			logger.error('Error in updateUser controller:', { userId, updates, error });

			const response: ApiResponse = {
				success: false,
				error: error instanceof Error && error.message === 'User not found'
					? 'User not found'
					: error instanceof Error && error.message === 'Email already exists'
						? 'Email already exists'
						: 'Internal server error',
				message: error instanceof Error && error.message === 'User not found'
					? 'The requested user does not exist'
					: error instanceof Error && error.message === 'Email already exists'
						? 'A user with this email already exists'
						: 'Failed to update user'
			};

			const statusCode = error instanceof Error && error.message === 'User not found'
				? 404
				: error instanceof Error && error.message === 'Email already exists'
					? 409
					: 500;

			res.status(statusCode).json(response);
		}
	}

	async deleteUser(req: Request, res: Response): Promise<void> {
		const userId = req.params.id;

		try {
			const deleted = await userService.deleteUser(userId);

			if (!deleted) {
				const response: ApiResponse = {
					success: false,
					error: 'User not found',
					message: 'The requested user does not exist'
				};
				res.status(404).json(response);
				return;
			}

			const response: ApiResponse = {
				success: true,
				message: 'User deleted successfully'
			};

			res.status(200).json(response);
		} catch (error) {
			logger.error('Error in deleteUser controller:', { userId, error });

			const response: ApiResponse = {
				success: false,
				error: error instanceof Error && error.message === 'User not found'
					? 'User not found'
					: 'Internal server error',
				message: error instanceof Error && error.message === 'User not found'
					? 'The requested user does not exist'
					: 'Failed to delete user'
			};

			const statusCode = error instanceof Error && error.message === 'User not found'
				? 404
				: 500;

			res.status(statusCode).json(response);
		}
	}

	async getUsers(req: Request, res: Response): Promise<void> {
		const { page = 1, limit = 10 } = req.query;

		try {
			const result = await userService.getUsers(
				parseInt(page as string),
				parseInt(limit as string)
			);

			const response: ApiResponse = {
				success: true,
				data: result,
				message: 'Users retrieved successfully'
			};

			res.status(200).json(response);
		} catch (error) {
			logger.error('Error in getUsers controller:', { page, limit, error });

			const response: ApiResponse = {
				success: false,
				error: 'Internal server error',
				message: 'Failed to fetch users'
			};

			res.status(500).json(response);
		}
	}
}

export const userController = new UserController();
