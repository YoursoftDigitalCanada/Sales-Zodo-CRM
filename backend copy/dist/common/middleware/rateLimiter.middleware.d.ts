import { Options } from 'express-rate-limit';
/**
 * Default rate limiter configuration
 */
export declare const defaultRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Create custom rate limiter
 */
export declare function rateLimiter(options?: Partial<Options>): import("express-rate-limit").RateLimitRequestHandler;
/**
 * Strict rate limiter for sensitive endpoints (login, register, etc.)
 */
export declare const strictRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * API rate limiter (more relaxed)
 */
export declare const apiRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Upload rate limiter
 */
export declare const uploadRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=rateLimiter.middleware.d.ts.map