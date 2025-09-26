import { pool } from '../database/connection';
import { User } from '../types';

export class UserRepository {
	async createUser(email: string, name: string): Promise<User | null> {
		const query = `
      INSERT INTO users (email, name)
      VALUES ($1, $2)
      RETURNING *
    `;

		const result = await pool.query(query, [email, name]);

		if (result.rows.length === 0) {
			return null;
		}

		const row = result.rows[0];
		return {
			id: row.id,
			email: row.email,
			name: row.name,
			created_at: row.created_at,
			updated_at: row.updated_at
		};
	}

	async getUserById(userId: string): Promise<User | null> {
		const query = 'SELECT * FROM users WHERE id = $1';
		const result = await pool.query(query, [userId]);

		if (result.rows.length === 0) {
			return null;
		}

		const row = result.rows[0];
		return {
			id: row.id,
			email: row.email,
			name: row.name,
			created_at: row.created_at,
			updated_at: row.updated_at
		};
	}

	async getUserByEmail(email: string): Promise<User | null> {
		const query = 'SELECT * FROM users WHERE email = $1';
		const result = await pool.query(query, [email]);

		if (result.rows.length === 0) {
			return null;
		}

		const row = result.rows[0];
		return {
			id: row.id,
			email: row.email,
			name: row.name,
			created_at: row.created_at,
			updated_at: row.updated_at
		};
	}

	async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
		const fields = [];
		const values = [];
		let paramCount = 1;

		if (updates.email) {
			fields.push(`email = $${paramCount++}`);
			values.push(updates.email);
		}

		if (updates.name) {
			fields.push(`name = $${paramCount++}`);
			values.push(updates.name);
		}

		if (fields.length === 0) {
			return await this.getUserById(userId);
		}

		values.push(userId);
		const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

		const result = await pool.query(query, values);

		if (result.rows.length === 0) {
			return null;
		}

		const row = result.rows[0];
		return {
			id: row.id,
			email: row.email,
			name: row.name,
			created_at: row.created_at,
			updated_at: row.updated_at
		};
	}

	async deleteUser(userId: string): Promise<boolean> {
		const query = 'DELETE FROM users WHERE id = $1';
		const result = await pool.query(query, [userId]);
		return (result.rowCount ?? 0) > 0;
	}

	async getUsers(page: number = 1, limit: number = 10): Promise<User[]> {
		const offset = (page - 1) * limit;
		const query = `
      SELECT * FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

		const result = await pool.query(query, [limit, offset]);

		return result.rows.map(row => ({
			id: row.id,
			email: row.email,
			name: row.name,
			created_at: row.created_at,
			updated_at: row.updated_at
		}));
	}

	async getUserCount(): Promise<number> {
		const query = 'SELECT COUNT(*) FROM users';
		const result = await pool.query(query);
		return parseInt(result.rows[0].count);
	}
}

export const userRepository = new UserRepository();
