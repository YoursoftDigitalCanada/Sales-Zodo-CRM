import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../errors/HttpErrors';

/**
 * Validation middleware factory
 * Validates request against a Zod schema
 */
export function validate(schema: AnyZodObject) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodErrors(error);
        
        next(
          new ValidationError('Validation failed', {
            errors: formattedErrors,
          })
        );
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate only request body
 */
export function validateBody(schema: AnyZodObject) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await schema.parseAsync(req.body);
      req.body = result; // Replace with parsed/transformed data
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodErrors(error);
        
        next(
          new ValidationError('Validation failed', {
            errors: formattedErrors,
          })
        );
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate only query parameters
 */
export function validateQuery(schema: AnyZodObject) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await schema.parseAsync(req.query);
      req.query = result;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodErrors(error);
        
        next(
          new ValidationError('Invalid query parameters', {
            errors: formattedErrors,
          })
        );
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate only URL parameters
 */
export function validateParams(schema: AnyZodObject) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await schema.parseAsync(req.params);
      req.params = result;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodErrors(error);
        
        next(
          new ValidationError('Invalid URL parameters', {
            errors: formattedErrors,
          })
        );
      } else {
        next(error);
      }
    }
  };
}

/**
 * Format Zod errors into a more readable format
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formattedErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    const key = path || 'general';

    if (!formattedErrors[key]) {
      formattedErrors[key] = [];
    }

    formattedErrors[key].push(issue.message);
  }

  return formattedErrors;
}

/**
 * Common validation schemas
 */
import { z } from 'zod';

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, 'Page must be a positive number'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const searchSchema = z.object({
  search: z.string().optional(),
  ...paginationSchema.shape,
});