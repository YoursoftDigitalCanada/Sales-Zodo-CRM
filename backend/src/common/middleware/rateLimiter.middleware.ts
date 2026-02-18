import rateLimit, { Options } from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../../config';
import { TooManyRequestsError } from '../errors/HttpErrors';

/**
 * Default rate limiter configuration
 */
export const defaultRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      code: 'TOO_MANY_REQUESTS',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
    });
  },
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise use IP
    return req.user?.userId || req.ip || 'anonymous';
  },
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
});

/**
 * Create custom rate limiter
 */
export function rateLimiter(options: Partial<Options> = {}) {
  return rateLimit({
    windowMs: options.windowMs || config.rateLimit.windowMs,
    max: options.max || config.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        code: 'TOO_MANY_REQUESTS',
        retryAfter: Math.ceil((options.windowMs || config.rateLimit.windowMs) / 1000),
      });
    },
    keyGenerator: (req: Request) => {
      return req.user?.userId || req.ip || 'anonymous';
    },
    ...options,
  });
}

/**
 * Strict rate limiter for sensitive endpoints (login, register, etc.)
 */
export const strictRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
});

/**
 * API rate limiter (more relaxed)
 */
export const apiRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
});

/**
 * Upload rate limiter
 */
export const uploadRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
});