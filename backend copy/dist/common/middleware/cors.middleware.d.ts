import cors, { CorsOptions, CorsOptionsDelegate } from 'cors';
import { Request } from 'express';
/**
 * Default CORS options
 */
export declare const corsOptions: CorsOptions;
/**
 * Strict CORS options for sensitive endpoints
 */
export declare const strictCorsOptions: CorsOptions;
/**
 * Open CORS options for public APIs
 */
export declare const openCorsOptions: CorsOptions;
/**
 * Default CORS middleware
 */
export declare const corsMiddleware: (req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;
/**
 * Strict CORS middleware for sensitive endpoints
 */
export declare const strictCorsMiddleware: (req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;
/**
 * Open CORS middleware for public endpoints
 */
export declare const openCorsMiddleware: (req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;
/**
 * Dynamic CORS middleware factory
 * Creates CORS middleware with custom options
 */
export declare function createCorsMiddleware(options?: Partial<CorsOptions>): (req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;
/**
 * Per-route CORS configuration
 * Allows different CORS settings for different routes
 */
export declare const dynamicCorsMiddleware: CorsOptionsDelegate;
/**
 * Tenant-specific CORS middleware
 * Allows tenant-specific origin configuration
 */
export declare function tenantCorsMiddleware(req: Request, callback: (err: Error | null, options?: CorsOptions) => void): Promise<void>;
/**
 * Check if an origin is allowed
 */
export declare function isOriginAllowed(origin: string): boolean;
/**
 * Get all currently allowed origins
 */
export declare function listAllowedOrigins(): string[];
export declare function addDynamicOrigin(origin: string): void;
export declare function removeDynamicOrigin(origin: string): void;
export declare function getDynamicOrigins(): string[];
/**
 * CORS error handler middleware
 * Provides better error messages for CORS failures
 */
export declare function corsErrorHandler(err: Error, req: Request, res: any, next: any): void;
/**
 * Handle preflight requests explicitly
 * Useful when you need custom preflight logic
 */
export declare function handlePreflight(req: Request, res: any, next: any): void;
//# sourceMappingURL=cors.middleware.d.ts.map