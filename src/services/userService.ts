import { userRepository } from '../repositories/userRepository';
import { User } from '../types';
import { logger } from '../utils/logger';

export class UserService {
	async createUser(email: string, name: string): Promise<User> {
		const existingUser = await userRepository.getUserByEmail(email);
		if (existingUser) {
			throw new Error('User with this email already exists');
		}

		const user = await userRepository.createUser(email, name);
		if (!user) {
			throw new Error('Failed to create user');
		}

		logger.info('User created successfully:', {
			userId: user.id,
			email: user.email
		});

		return user;
	}

	async getUserById(userId: string): Promise<User | null> {
		return await userRepository.getUserById(userId);
	}

	async getUserByEmail(email: string): Promise<User | null> {
		return await userRepository.getUserByEmail(email);
	}

	async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
		const existingUser = await userRepository.getUserById(userId);
		if (!existingUser) {
			throw new Error('User not found');
		}

		if (updates.email && updates.email !== existingUser.email) {
			const emailExists = await userRepository.getUserByEmail(updates.email);
			if (emailExists) {
				throw new Error('Email already exists');
			}
		}

		const updatedUser = await userRepository.updateUser(userId, updates);
		if (!updatedUser) {
			throw new Error('Failed to update user');
		}

		logger.info('User updated successfully:', {
			userId,
			updates: Object.keys(updates)
		});

		return updatedUser;
	}

	async deleteUser(userId: string): Promise<boolean> {
		const existingUser = await userRepository.getUserById(userId);
		if (!existingUser) {
			throw new Error('User not found');
		}

		const deleted = await userRepository.deleteUser(userId);
		if (!deleted) {
			throw new Error('Failed to delete user');
		}

		logger.info('User deleted successfully:', { userId });
		return true;
	}

	async getUsers(page: number = 1, limit: number = 10): Promise<{
		users: User[];
		totalCount: number;
		currentPage: number;
		totalPages: number;
	}> {
		const [users, totalCount] = await Promise.all([
			userRepository.getUsers(page, limit),
			userRepository.getUserCount()
		]);

		const totalPages = Math.ceil(totalCount / limit);

		return {
			users,
			totalCount,
			currentPage: page,
			totalPages
		};
	}
}

export const userService = new UserService();
