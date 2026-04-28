import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';
import { config } from '../../config';
import { Prisma } from '@prisma/client';
import multer from 'multer';

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.userId,
    tenantId: req.user?.tenantId,
  });

  // Handle known AppError
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
      ...(error.details && { details: error.details }),
      ...(config.app.isDevelopment && { stack: error.stack }),
    });
    return;
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = handlePrismaError(error);
    res.status(prismaError.statusCode).json({
      success: false,
      message: prismaError.message,
      code: prismaError.code,
      ...(config.app.isDevelopment && { stack: error.stack }),
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      message: 'Invalid data provided',
      code: 'VALIDATION_ERROR',
      ...(config.app.isDevelopment && { 
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

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        message: 'Please upload a logo image smaller than 2MB.',
        code: 'FILE_TOO_LARGE',
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: error.message || 'File upload failed',
      code: 'UPLOAD_ERROR',
    });
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    success: false,
    message: config.app.isProduction
      ? 'An unexpected error occurred'
      : error.message,
    code: 'INTERNAL_SERVER_ERROR',
    ...(config.app.isDevelopment && { stack: error.stack }),
  });
}

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): {
  statusCode: number;
  message: string;
  code: string;
} {
  switch (error.code) {
    case 'P2002': {
      // Unique constraint violation
      const target = (error.meta?.target as string[]) || ['field'];
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
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND',
  });
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
