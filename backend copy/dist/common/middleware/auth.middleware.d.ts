import { Request, Response, NextFunction } from 'express';
/**
 * Authentication middleware
 * Verifies JWT access token and attaches user info to request
 */
export declare function authenticate(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Optional authentication middleware
 * Does not fail if no token provided, but validates if present
 */
export declare function optionalAuthenticate(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Load full employee data with permissions
 * Must be used after authenticate middleware
 */
export declare function loadEmployee(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Combined middleware: authenticate + loadEmployee
 */
export declare function authenticateWithEmployee(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=auth.middleware.d.ts.map