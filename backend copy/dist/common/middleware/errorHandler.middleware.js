"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
exports.asyncHandler = asyncHandler;
const AppError_1 = require("../errors/AppError");
const logger_1 = require("../utils/logger");
const config_1 = require("../../config");
const client_1 = require("@prisma/client");
/**
 * Global error handler middleware
 */
function errorHandler(error, req, res, next) {
    // Log error
    logger_1.logger.error('Error occurred', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        userId: req.user?.userId,
        tenantId: req.user?.tenantId,
    });
    // Handle known AppError
    if (error instanceof AppError_1.AppError) {
        res.status(error.statusCode).json({
            success: false,
            message: error.message,
            code: error.code,
            ...(error.details && { details: error.details }),
            ...(config_1.config.app.isDevelopment && { stack: error.stack }),
        });
        return;
    }
    // Handle Prisma errors
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        const prismaError = handlePrismaError(error);
        res.status(prismaError.statusCode).json({
            success: false,
            message: prismaError.message,
            code: prismaError.code,
            ...(config_1.config.app.isDevelopment && { stack: error.stack }),
        });
        return;
    }
    if (error instanceof client_1.Prisma.PrismaClientValidationError) {
        res.status(400).json({
            success: false,
            message: 'Invalid data provided',
            code: 'VALIDATION_ERROR',
            ...(config_1.config.app.isDevelopment && {
                details: error.message,
                stack: error.stack,
            }),
        });
        return;
    }
    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
        res.status(401).json({
            success: false,
            message: 'Invalid token',
            code: 'AUTH_TOKEN_INVALID',
        });
        return;
    }
    if (error.name === 'TokenExpiredError') {
        res.status(401).json({
            success: false,
            message: 'Token has expired',
            code: 'AUTH_TOKEN_EXPIRED',
        });
        return;
    }
    // Handle syntax errors (malformed JSON)
    if (error instanceof SyntaxError && 'body' in error) {
        res.status(400).json({
            success: false,
            message: 'Invalid JSON in request body',
            code: 'INVALID_JSON',
        });
        return;
    }
    // Handle unknown errors
    res.status(500).json({
        success: false,
        message: config_1.config.app.isProduction
            ? 'An unexpected error occurred'
            : error.message,
        code: 'INTERNAL_SERVER_ERROR',
        ...(config_1.config.app.isDevelopment && { stack: error.stack }),
    });
}
/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(error) {
    switch (error.code) {
        case 'P2002': {
            // Unique constraint violation
            const target = error.meta?.target || ['field'];
            return {
                statusCode: 409,
                message: `A record with this ${target.join(', ')} already exists`,
                code: 'DUPLICATE_ENTRY',
            };
        }
        case 'P2003': {
            // Foreign key constraint violation
            return {
                statusCode: 400,
                message: 'Related record not found',
                code: 'FOREIGN_KEY_VIOLATION',
            };
        }
        case 'P2025': {
            // Record not found
            return {
                statusCode: 404,
                message: 'Record not found',
                code: 'NOT_FOUND',
            };
        }
        case 'P2014': {
            // Required relation violation
            return {
                statusCode: 400,
                message: 'Required relation not satisfied',
                code: 'RELATION_VIOLATION',
            };
        }
        case 'P2021': {
            // Table does not exist
            return {
                statusCode: 500,
                message: 'Database table not found',
                code: 'TABLE_NOT_FOUND',
            };
        }
        case 'P2022': {
            // Column does not exist
            return {
                statusCode: 500,
                message: 'Database column not found',
                code: 'COLUMN_NOT_FOUND',
            };
        }
        default:
            return {
                statusCode: 500,
                message: 'Database error occurred',
                code: 'DATABASE_ERROR',
            };
    }
}
/**
 * Not found handler for undefined routes
 */
function notFoundHandler(req, res, next) {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.path} not found`,
        code: 'ROUTE_NOT_FOUND',
    });
}
/**
 * Async handler wrapper to catch errors in async route handlers
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
//# sourceMappingURL=errorHandler.middleware.js.map