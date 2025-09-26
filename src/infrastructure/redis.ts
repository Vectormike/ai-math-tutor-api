import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';
import { CacheEntry } from '../types';

class RedisService {
  private client: RedisClientType | null = null;
  private isConnected = false;

  async connect(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 500)
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        logger.info('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
      // Don't throw error - app can work without Redis
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.disconnect();
        logger.info('Redis client disconnected gracefully');
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }

  // Get cached data with TTL support
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.client || !this.isConnected) {
        return null;
      }

      const cached = await this.client.get(key);
      if (!cached) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);
      
      // Check if expired
      if (Date.now() > entry.expires_at) {
        await this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      logger.error('Redis GET error:', { key, error: error instanceof Error ? error.message : error });
      return null;
    }
  }

  // Set data with TTL (time to live in seconds)
  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }

      const entry: CacheEntry<T> = {
        data: value,
        expires_at: Date.now() + (ttlSeconds * 1000)
      };

      await this.client.set(key, JSON.stringify(entry), {
        EX: ttlSeconds
      });

      return true;
    } catch (error) {
      logger.error('Redis SET error:', { key, error: error instanceof Error ? error.message : error });
      return false;
    }
  }

  // Delete a key
  async delete(key: string): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }

      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DELETE error:', { key, error: error instanceof Error ? error.message : error });
      return false;
    }
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }

      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', { key, error: error instanceof Error ? error.message : error });
      return false;
    }
  }

  // Get multiple keys
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (!this.client || !this.isConnected || keys.length === 0) {
        return keys.map(() => null);
      }

      const results = await this.client.mGet(keys);
      return results.map((cached, index) => {
        try {
          if (!cached) return null;
          
          const entry: CacheEntry<T> = JSON.parse(cached);
          
          // Check if expired
          if (Date.now() > entry.expires_at) {
            this.delete(keys[index]); // Fire and forget cleanup
            return null;
          }
          
          return entry.data;
        } catch {
          return null;
        }
      });
    } catch (error) {
      logger.error('Redis MGET error:', { keys, error: error instanceof Error ? error.message : error });
      return keys.map(() => null);
    }
  }

  // Set multiple key-value pairs
  async mset<T>(keyValuePairs: Array<{key: string, value: T, ttlSeconds?: number}>): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected || keyValuePairs.length === 0) {
        return false;
      }

      // Use pipeline for better performance
      const pipeline = this.client.multi();
      
      keyValuePairs.forEach(({ key, value, ttlSeconds = 300 }) => {
        const entry: CacheEntry<T> = {
          data: value,
          expires_at: Date.now() + (ttlSeconds * 1000)
        };
        
        pipeline.set(key, JSON.stringify(entry), { EX: ttlSeconds });
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Redis MSET error:', { error: error instanceof Error ? error.message : error });
      return false;
    }
  }

  // Clear all cache (use with caution)
  async flushAll(): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }

      await this.client.flushAll();
      logger.info('Redis cache cleared');
      return true;
    } catch (error) {
      logger.error('Redis FLUSHALL error:', error);
      return false;
    }
  }

  // Generate cache key for questions
  generateQuestionCacheKey(questionText: string): string {
    // Create a simple hash of the question for consistent caching
    const hash = Buffer.from(questionText.toLowerCase().trim()).toString('base64');
    return `question:${hash}`;
  }

  // Generate cache key for user history
  generateUserHistoryCacheKey(userId: string, page: number = 1): string {
    return `user:${userId}:history:${page}`;
  }

  get connected(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const redisService = new RedisService();