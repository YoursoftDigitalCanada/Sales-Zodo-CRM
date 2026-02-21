"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRateLimiter = exports.apiRateLimiter = exports.strictRateLimiter = exports.defaultRateLimiter = void 0;
exports.rateLimiter = rateLimiter;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("../../config");
/**
 * Default rate limiter configuration
 */
exports.defaultRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.rateLimit.windowMs,
    max: config_1.config.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many requests. Please try again later.',
            code: 'TOO_MANY_REQUESTS',
            retryAfter: Math.ceil(config_1.config.rateLimit.windowMs / 1000),
        });
    },
    keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise use IP
        return req.user?.userId || req.ip || 'anonymous';
    },
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/api/health';
    },
});
/**
 * Create custom rate limiter
 */
function rateLimiter(options = {}) {
    return (0, express_rate_limit_1.default)({
        windowMs: options.windowMs || config_1.config.rateLimit.windowMs,
        max: options.max || config_1.config.rateLimit.maxRequests,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                message: 'Too many requests. Please try again later.',
                code: 'TOO_MANY_REQUESTS',
                retryAfter: Math.ceil((options.windowMs || config_1.config.rateLimit.windowMs) / 1000),
            });
        },
        keyGenerator: (req) => {
            return req.user?.userId || req.ip || 'anonymous';
        },
        ...options,
    });
}
/**
 * Strict rate limiter for sensitive endpoints (login, register, etc.)
 */
exports.strictRateLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
});
/**
 * API rate limiter (more relaxed)
 */
exports.apiRateLimiter = rateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
});
/**
 * Upload rate limiter
 */
exports.uploadRateLimiter = rateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 uploads per hour
});
//# sourceMappingURL=rateLimiter.middleware.js.map