"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
exports.requestId = requestId;
exports.requestTiming = requestTiming;
const morgan_1 = __importDefault(require("morgan"));
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
const config_1 = require("../../config");
/**
 * Custom morgan tokens
 */
morgan_1.default.token('request-id', (req) => req.requestId);
morgan_1.default.token('user-id', (req) => req.user?.userId || 'anonymous');
morgan_1.default.token('tenant-id', (req) => req.user?.tenantId || '-');
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
exports.requestLogger = (0, morgan_1.default)(config_1.config.app.isProduction ? prodFormat : devFormat, {
    stream: logger_1.morganStream,
    skip: (req) => {
        // Skip logging for health checks
        return req.path === '/health' || req.path === '/api/health';
    },
});
/**
 * Request ID middleware - adds unique ID to each request
 */
function requestId(req, res, next) {
    req.requestId = req.headers['x-request-id'] || (0, uuid_1.v4)();
    res.setHeader('X-Request-ID', req.requestId);
    next();
}
/**
 * Request timing middleware
 */
function requestTiming(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (duration > 1000) {
            logger_1.logger.warn('Slow request detected', {
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
//# sourceMappingURL=upload.middleware.js.map