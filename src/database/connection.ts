import { Pool, PoolConfig } from 'pg';
import { config } from 'dotenv';
import { logger } from '../utils/logger';

config();

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'math_tutor',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  maxUses: 7500,
};

export const pool = new Pool(poolConfig);

pool.on('error', (err: Error) => {
  logger.error('Unexpected error on idle client:', err);
});

pool.on('connect', () => {
  logger.info('Database pool connected');
});

export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
    return false;
  }
};

export const closePool = async (): Promise<void> => {
  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (error) {
    logger.error('Error closing database pool:', error);
  }
};

export const query = async (text: string, params?: any[]): Promise<any> => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query executed', {
      query: text,
      params: params ? '[REDACTED]' : undefined,
      duration: `${duration}ms`,
      rows: result.rowCount
    });
    return result;
  } catch (error) {
    logger.error('Query error:', {
      query: text,
      params: params ? '[REDACTED]' : undefined,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};
