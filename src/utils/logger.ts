import winston from 'winston';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    })
  ),
  defaultMeta: {
    service: 'ai-math-tutor-api'
  },
  transports: []
});

// Development logging (console with colors)
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      simple(),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
          log += ` ${JSON.stringify(meta)}`;
        }
        return log;
      })
    )
  }));
} else {
  // Production logging (JSON format for log aggregation)
  logger.add(new winston.transports.Console({
    format: json()
  }));

  // Optional: Add file transport for production
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: json()
  }));

  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    format: json()
  }));
}

export default logger;