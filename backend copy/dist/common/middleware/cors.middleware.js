"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamicCorsMiddleware = exports.openCorsMiddleware = exports.strictCorsMiddleware = exports.corsMiddleware = exports.openCorsOptions = exports.strictCorsOptions = exports.corsOptions = void 0;
exports.createCorsMiddleware = createCorsMiddleware;
exports.tenantCorsMiddleware = tenantCorsMiddleware;
exports.isOriginAllowed = isOriginAllowed;
exports.listAllowedOrigins = listAllowedOrigins;
exports.addDynamicOrigin = addDynamicOrigin;
exports.removeDynamicOrigin = removeDynamicOrigin;
exports.getDynamicOrigins = getDynamicOrigins;
exports.corsErrorHandler = corsErrorHandler;
exports.handlePreflight = handlePreflight;
const cors_1 = __importDefault(require("cors"));
const config_1 = require("../../config");
const logger_1 = require("../utils/logger");
// ============================================================================
// ALLOWED ORIGINS CONFIGURATION
// ============================================================================
/**
 * List of allowed origins
 * In production, this should be strictly controlled
 */
const getAllowedOrigins = () => {
    const origins = [];
    // Add frontend URL from config
    if (config_1.config.frontend.url) {
        origins.push(config_1.config.frontend.url);
    }
    // Add additional origins based on environment
    if (config_1.config.app.isDevelopment) {
        origins.push('http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', // Vite default
        'http://localhost:5174', 'http://localhost:8080', // Vite alternate port
        'http://localhost:4200', // Angular default
        'http://127.0.0.1:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:8080');
    }
    // Parse additional origins from environment variable if provided
    const additionalOrigins = process.env.ADDITIONAL_CORS_ORIGINS;
    if (additionalOrigins) {
        const parsed = additionalOrigins.split(',').map((o) => o.trim()).filter(Boolean);
        origins.push(...parsed);
    }
    return origins;
};
// ============================================================================
// CORS OPTIONS
// ============================================================================
/**
 * Dynamic origin validation function
 */
const originValidator = (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) {
        // In production, you might want to be more strict
        if (config_1.config.app.isProduction) {
            logger_1.logger.debug('CORS: Request with no origin in production');
        }
        return callback(null, true);
    }
    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
        return callback(null, true);
    }
    // Check for wildcard subdomains (e.g., *.example.com)
    const isSubdomainAllowed = allowedOrigins.some((allowed) => {
        if (allowed.startsWith('*.')) {
            const domain = allowed.slice(2);
            return origin.endsWith(domain) || origin.endsWith(`.${domain}`);
        }
        return false;
    });
    if (isSubdomainAllowed) {
        return callback(null, true);
    }
    // In development, log blocked origins for debugging
    if (config_1.config.app.isDevelopment) {
        logger_1.logger.warn(`CORS: Blocked origin - ${origin}`);
        logger_1.logger.debug(`CORS: Allowed origins - ${allowedOrigins.join(', ')}`);
    }
    // Reject the request
    callback(new Error(`Origin ${origin} not allowed by CORS policy`));
};
/**
 * Default CORS options
 */
exports.corsOptions = {
    origin: originValidator,
    // Allowed HTTP methods
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    // Allowed headers
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'X-Request-ID',
        'X-Tenant-ID',
        'X-API-Key',
        'Cache-Control',
        'Pragma',
    ],
    // Headers exposed to the client
    exposedHeaders: [
        'X-Request-ID',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'Content-Disposition',
        'Content-Length',
    ],
    // Allow credentials (cookies, authorization headers)
    credentials: true,
    // Preflight cache duration (in seconds)
    maxAge: 86400, // 24 hours
    // Pass preflight response to next handler
    preflightContinue: false,
    // Return 204 for OPTIONS requests
    optionsSuccessStatus: 204,
};
/**
 * Strict CORS options for sensitive endpoints
 */
exports.strictCorsOptions = {
    ...exports.corsOptions,
    origin: (origin, callback) => {
        const allowedOrigins = getAllowedOrigins();
        // Don't allow requests without origin in strict mode
        if (!origin) {
            return callback(new Error('Origin header required'));
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error(`Origin ${origin} not allowed`));
    },
    credentials: true,
};
/**
 * Open CORS options for public APIs
 */
exports.openCorsOptions = {
    origin: '*',
    methods: ['GET', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    exposedHeaders: ['Content-Length'],
    credentials: false,
    maxAge: 86400,
};
// ============================================================================
// CORS MIDDLEWARE EXPORTS
// ============================================================================
/**
 * Default CORS middleware
 */
exports.corsMiddleware = (0, cors_1.default)(exports.corsOptions);
/**
 * Strict CORS middleware for sensitive endpoints
 */
exports.strictCorsMiddleware = (0, cors_1.default)(exports.strictCorsOptions);
/**
 * Open CORS middleware for public endpoints
 */
exports.openCorsMiddleware = (0, cors_1.default)(exports.openCorsOptions);
/**
 * Dynamic CORS middleware factory
 * Creates CORS middleware with custom options
 */
function createCorsMiddleware(options = {}) {
    return (0, cors_1.default)({
        ...exports.corsOptions,
        ...options,
    });
}
/**
 * Per-route CORS configuration
 * Allows different CORS settings for different routes
 */
const dynamicCorsMiddleware = (req, callback) => {
    let options;
    // Determine CORS options based on route or other factors
    const path = req.path.toLowerCase();
    if (path.startsWith('/api/public') || path.startsWith('/api/webhook')) {
        // Public endpoints - more permissive
        options = exports.openCorsOptions;
    }
    else if (path.startsWith('/api/auth') || path.startsWith('/api/admin')) {
        // Sensitive endpoints - more strict
        options = exports.strictCorsOptions;
    }
    else {
        // Default options
        options = exports.corsOptions;
    }
    callback(null, options);
};
exports.dynamicCorsMiddleware = dynamicCorsMiddleware;
/**
 * Tenant-specific CORS middleware
 * Allows tenant-specific origin configuration
 */
async function tenantCorsMiddleware(req, callback) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            // No tenant context, use default options
            return callback(null, exports.corsOptions);
        }
        // In a real implementation, you might fetch tenant-specific CORS settings
        // from the database or cache
        // const tenantSettings = await getTenantCorsSettings(tenantId);
        // For now, use default options
        callback(null, exports.corsOptions);
    }
    catch (error) {
        logger_1.logger.error('Error in tenant CORS middleware', { error });
        callback(null, exports.corsOptions);
    }
}
// ============================================================================
// CORS UTILITIES
// ============================================================================
/**
 * Check if an origin is allowed
 */
function isOriginAllowed(origin) {
    const allowedOrigins = getAllowedOrigins();
    if (allowedOrigins.includes(origin)) {
        return true;
    }
    // Check wildcard subdomains
    return allowedOrigins.some((allowed) => {
        if (allowed.startsWith('*.')) {
            const domain = allowed.slice(2);
            return origin.endsWith(domain) || origin.endsWith(`.${domain}`);
        }
        return false;
    });
}
/**
 * Get all currently allowed origins
 */
function listAllowedOrigins() {
    return getAllowedOrigins();
}
/**
 * Add a dynamic origin at runtime
 * Useful for adding tenant-specific domains
 */
const dynamicOrigins = new Set();
function addDynamicOrigin(origin) {
    dynamicOrigins.add(origin);
    logger_1.logger.info(`CORS: Added dynamic origin - ${origin}`);
}
function removeDynamicOrigin(origin) {
    dynamicOrigins.delete(origin);
    logger_1.logger.info(`CORS: Removed dynamic origin - ${origin}`);
}
function getDynamicOrigins() {
    return Array.from(dynamicOrigins);
}
// ============================================================================
// CORS ERROR HANDLER
// ============================================================================
/**
 * CORS error handler middleware
 * Provides better error messages for CORS failures
 */
function corsErrorHandler(err, req, res, next) {
    if (err.message.includes('CORS') || err.message.includes('Origin')) {
        logger_1.logger.warn('CORS error', {
            origin: req.headers.origin,
            method: req.method,
            path: req.path,
            error: err.message,
        });
        res.status(403).json({
            success: false,
            message: 'Cross-Origin Request Blocked',
            code: 'CORS_ERROR',
            details: config_1.config.app.isDevelopment ? err.message : undefined,
        });
        return;
    }
    next(err);
}
// ============================================================================
// PREFLIGHT HANDLER
// ============================================================================
/**
 * Handle preflight requests explicitly
 * Useful when you need custom preflight logic
 */
function handlePreflight(req, res, next) {
    if (req.method === 'OPTIONS') {
        const origin = req.headers.origin;
        if (origin && isOriginAllowed(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Methods', exports.corsOptions.methods?.join(', '));
            res.header('Access-Control-Allow-Headers', exports.corsOptions.allowedHeaders?.join(', '));
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Max-Age', String(exports.corsOptions.maxAge));
            res.status(204).end();
            return;
        }
        res.status(403).json({
            success: false,
            message: 'CORS preflight check failed',
            code: 'CORS_PREFLIGHT_FAILED',
        });
        return;
    }
    next();
}
//# sourceMappingURL=cors.middleware.js.map