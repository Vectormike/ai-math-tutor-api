import { Router, Request, Response } from 'express';
import { databaseService } from '../infrastructure/database';
import { aiService } from '../infrastructure/ai';
import { redisService } from '../infrastructure/redis';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const [dbHealth, redisHealth, aiHealth] = await Promise.allSettled([
      databaseService.healthCheck(),
      redisService.connected,
      aiService.initialized
    ]);

    const dbStatus = dbHealth.status === 'fulfilled' && dbHealth.value;
    const redisStatus = redisHealth.status === 'fulfilled' && redisHealth.value;
    const aiStatus = aiHealth.status === 'fulfilled' && aiHealth.value;

    const allHealthy = dbStatus && redisStatus && aiStatus;
    const responseTime = Date.now() - startTime;

    const health = {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: {
          status: dbStatus ? 'healthy' : 'unhealthy',
          connected: dbStatus
        },
        redis: {
          status: redisStatus ? 'healthy' : 'unhealthy',
          connected: redisStatus
        },
        ai: {
          status: aiStatus ? 'healthy' : 'degraded',
          initialized: aiStatus,
          note: aiStatus ? 'OpenAI connected' : 'Using mock responses'
        }
      },
      memory: {
        used: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        total: process.memoryUsage().heapTotal / 1024 / 1024 // MB
      }
    };

    const statusCode = allHealthy ? 200 : 503;
    const response: ApiResponse = {
      success: allHealthy,
      data: health,
      message: allHealthy ? 'All services healthy' : 'Some services degraded'
    };

    logger.info('Detailed health check completed:', {
      status: health.status,
      responseTime,
      dbStatus,
      redisStatus,
      aiStatus
    });

    return res.status(statusCode).json(response);

  } catch (error) {
    logger.error('Detailed health check failed:', error);

    const response: ApiResponse = {
      success: false,
      error: 'Health check failed',
      message: 'Unable to perform health checks'
    };

    return res.status(503).json(response);
  }
});

export default router;
