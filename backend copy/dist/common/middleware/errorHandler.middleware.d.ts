import { Request, Response, NextFunction } from 'express';
/**
 * Global error handler middleware
 */
export declare function errorHandler(error: Error, req: Request, res: Response, next: NextFunction): void;
/**
 * Not found handler for undefined routes
 */
export declare function notFoundHandler(req: Request, res: Response, next: NextFunction): void;
/**
 * Async handler wrapper to catch errors in async route handlers
 */
export declare function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandler.middleware.d.ts.map