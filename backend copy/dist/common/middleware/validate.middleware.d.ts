import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';
/**
 * Validation middleware factory
 * Validates request against a Zod schema
 */
export declare function validate(schema: AnyZodObject): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Validate only request body
 */
export declare function validateBody(schema: AnyZodObject): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Validate only query parameters
 */
export declare function validateQuery(schema: AnyZodObject): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Validate only URL parameters
 */
export declare function validateParams(schema: AnyZodObject): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Common validation schemas
 */
import { z } from 'zod';
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, number, string | undefined>;
    limit: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, number, string | undefined>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortOrder: "asc" | "desc";
    sortBy?: string | undefined;
}, {
    page?: string | undefined;
    limit?: string | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const idParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const searchSchema: z.ZodObject<{
    page: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, number, string | undefined>;
    limit: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, number, string | undefined>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortOrder: "asc" | "desc";
    search?: string | undefined;
    sortBy?: string | undefined;
}, {
    search?: string | undefined;
    page?: string | undefined;
    limit?: string | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
//# sourceMappingURL=validate.middleware.d.ts.map