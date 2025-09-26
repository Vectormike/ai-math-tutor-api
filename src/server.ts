import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { logger } from './utils/logger';
import { testConnection, closePool } from './database/connection';
import { redisService } from './infrastructure/redis';
import questionRoutes from './routes/questions';
import userRoutes from './routes/users';
import healthRoutes from './routes/health';
import { ApiResponse } from './types';

config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			styleSrc: ["'self'", "'unsafe-inline'"],
			scriptSrc: ["'self'"],
			imgSrc: ["'self'", "data:", "https:"],
		},
	},
}));

app.use(cors({
	origin: process.env.NODE_ENV === 'production'
		? process.env.ALLOWED_ORIGINS?.split(',') || []
		: true, // Allow all origins in development
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
	const startTime = Date.now();

	const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	req.headers['x-request-id'] = requestId as string;

	logger.info('Incoming request:', {
		method: req.method,
		url: req.url,
		ip: req.ip,
		userAgent: req.get('User-Agent'),
		requestId
	});

	res.on('finish', () => {
		const duration = Date.now() - startTime;
		logger.info('Request completed:', {
			method: req.method,
			url: req.url,
			statusCode: res.statusCode,
			duration: `${duration}ms`,
			requestId
		});
	});

	next();
});

app.use('/health', healthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/question', questionRoutes);

app.get('/', (_req, res) => {
	const response: ApiResponse = {
		success: true,
		message: 'AI Math Tutor API is running',
		data: {
			version: '1.0.0',
			environment: process.env.NODE_ENV || 'development',
			timestamp: new Date().toISOString(),
			endpoints: {
				health: '/health',
				detailed_health: '/health/detailed',
				stats: '/health/stats',
				create_user: 'POST /api/users',
				get_user: 'GET /api/users/:id',
				get_users: 'GET /api/users',
				update_user: 'PUT /api/users/:id',
				delete_user: 'DELETE /api/users/:id',
				user_stats: 'GET /api/users/stats',
				submit_question: 'POST /api/question',
				get_question: 'GET /api/question/:id',
				user_history: 'GET /api/question/user/:userId/history',
				delete_question: 'DELETE /api/question/:id'
			}
		}
	};
	res.json(response);
});

// 404 handler
app.use('*', (req, res) => {
	const response: ApiResponse = {
		success: false,
		error: 'Not Found',
		message: `Route ${req.method} ${req.originalUrl} not found`
	};
	res.status(404).json(response);
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
	logger.error('Unhandled error:', {
		error: error.message,
		stack: error.stack,
		url: req.url,
		method: req.method,
		requestId: req.headers['x-request-id']
	});

	const response: ApiResponse = {
		success: false,
		error: 'Internal Server Error',
		message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
	};

	res.status(500).json(response);
});

async function startServer() {
	try {
		logger.info('🚀 Starting AI Math Tutor API...');

		logger.info('📊 Testing database connection...');
		const dbConnected = await testConnection();
		if (!dbConnected) {
			logger.error('❌ Database connection failed');
			process.exit(1);
		}
		logger.info('✅ Database connected successfully');

		logger.info('📦 Connecting to Redis...');
		await redisService.connect();
		if (redisService.connected) {
			logger.info('✅ Redis connected successfully');
		} else {
			logger.warn('⚠️ Redis connection failed - continuing without caching');
		}

		const server = app.listen(PORT, () => {
			logger.info(`✅ Server started successfully on port ${PORT}`);
			logger.info(`🌐 API URL: http://localhost:${PORT}`);
			logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
		});

		const gracefulShutdown = async (signal: string) => {
			logger.info(`📧 Received ${signal}. Starting graceful shutdown...`);

			server.close(async () => {
				logger.info('🔌 HTTP server closed');

				try {
					await closePool();
					logger.info('🗄️ Database connections closed');

					await redisService.disconnect();
					logger.info('📦 Redis connection closed');

					logger.info('✅ Graceful shutdown completed');
					process.exit(0);
				} catch (error) {
					logger.error('❌ Error during shutdown:', error);
					process.exit(1);
				}
			});

			setTimeout(() => {
				logger.error('⏰ Force shutdown after timeout');
				process.exit(1);
			}, 30000);
		};

		process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
		process.on('SIGINT', () => gracefulShutdown('SIGINT'));

		process.on('uncaughtException', (error) => {
			logger.error('Uncaught Exception:', error);
			gracefulShutdown('uncaughtException');
		});

		process.on('unhandledRejection', (reason, promise) => {
			logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
			gracefulShutdown('unhandledRejection');
		});

	} catch (error) {
		logger.error('❌ Failed to start server:', error);
		process.exit(1);
	}
}

if (require.main === module) {
	startServer();
}

export default app;
