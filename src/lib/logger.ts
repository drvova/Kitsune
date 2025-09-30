// Production logging configuration
const pino = require('pino');

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  formatters: {
    level: (label) => ({ level: label }),
    log: (object) => ({
      ...object,
      service: 'kitsune',
      version: process.env.npm_package_version || '0.1.0',
      hostname: process.env.HOSTNAME || 'unknown',
      pid: process.pid,
      timestamp: new Date().toISOString(),
    }),
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.query.password',
      'req.body.password',
      'res.headers["set-cookie"]',
    ],
    censor: '[REDACTED]',
  },
  ...(isDevelopment ? {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  } : {}),
});

// Create a request logger middleware for Next.js API routes
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  logger.info({
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    type: 'request_start',
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      type: 'request_end',
    });
  });

  next();
};

// Performance monitoring utility
export const performanceLogger = {
  measure: (name, operation) => {
    const start = performance.now();
    const result = operation();
    const duration = performance.now() - start;

    logger.info({
      metric: 'performance',
      name,
      duration,
      type: 'performance_measurement',
    });

    return result;
  },

  async measureAsync: (name, operation) => {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;

    logger.info({
      metric: 'performance',
      name,
      duration,
      type: 'performance_measurement',
    });

    return result;
  },
};

// Error logging utility
export const errorLogger = (error, context = {}) => {
  logger.error({
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...context,
    },
    type: 'error',
  });
};

// Structured logger for different log levels
export default {
  info: (message, data = {}) => logger.info({ ...data, type: 'info', message }),
  warn: (message, data = {}) => logger.warn({ ...data, type: 'warning', message }),
  error: (message, data = {}) => logger.error({ ...data, type: 'error', message }),
  debug: (message, data = {}) => logger.debug({ ...data, type: 'debug', message }),
  requestLogger,
  performanceLogger,
  errorLogger,
};