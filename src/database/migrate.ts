import { readFileSync } from 'fs';
import { join } from 'path';
import { query, testConnection } from './connection';
import { logger } from '../utils/logger';

const runMigrations = async (): Promise<void> => {
  try {
    logger.info('Starting database migrations...');
    
    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf-8');

    // Execute schema
    logger.info('Executing schema creation...');
    await query(schemaSql);
    
    logger.info('✅ Database migrations completed successfully');
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migrations if called directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error('Migration error:', error);
      process.exit(1);
    });
}

export { runMigrations };