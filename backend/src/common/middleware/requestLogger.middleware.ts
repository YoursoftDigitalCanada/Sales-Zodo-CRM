import morgan from 'morgan';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger, morganStream } from '../utils/logger';
import { config } from '../../config';

/**
 * Custom morgan tokens
 */
morgan.token('request-id', (req: Request) => req.requestId);
morgan.token('user-id', (req: Request) => req.user?.userId || 'anonymous');
morgan.token('tenant-id', (req: Request) => req.user?.tenantId || '-');

/**
 * Morgan format for development
 */
const devFormat = ':method :url :status :response-time ms - :res[content-length]';

/**
 * Morgan format for production (JSON-like)
 */
const prodFormat = JSON.stringify({
  requestId: ':request-id',
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time',
  contentLength: ':res[content-length]',
  userId: ':user-id',
  tenantId: ':tenant-id',
  userAgent: ':user-agent',
  ip: ':remote-addr',
});

/**
 * Request logger middleware using Morgan
 */
export const requestLogger = morgan(
  config.app.isProduction ? prodFormat : devFormat,
  {
    stream: morganStream,
    skip: (req: Request) => {
      // Skip logging for health checks
      return req.path === '/health' || req.path === '/api/health';
    },
  }
);

/**
 * Request ID middleware - adds unique ID to each request
 */
export function requestId(req: Request, res: Response, next: Function): void {
  req.requestId = req.headers['x-request-id'] as string || uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
}

/**
 * Request timing middleware
 */
export function requestTiming(req: Request, res: Response, next: Function): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        userId: req.user?.userId,
      });
    }
  });

  next();
}