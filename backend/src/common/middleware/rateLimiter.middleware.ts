import rateLimit, { Options } from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../../config';
import { TooManyRequestsError } from '../errors/HttpErrors';

/**
 * Extract real client IP from request.
 * Handles reverse proxies (Nginx) by reading X-Forwarded-For header.
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // X-Forwarded-For can be comma-separated: "client, proxy1, proxy2"
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return first.trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

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
    // Use user ID if authenticated, otherwise use real client IP
    return req.user?.userId || getClientIp(req);
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
      return req.user?.userId || getClientIp(req);
    },
    ...options,
  });
}

/**
 * Strict rate limiter for sensitive endpoints (login, register, etc.)
 */
export const strictRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per IP
});

/**
 * API rate limiter (more relaxed)
 */
export const apiRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
});

/**
 * Upload rate limiter
 */
export const uploadRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
});