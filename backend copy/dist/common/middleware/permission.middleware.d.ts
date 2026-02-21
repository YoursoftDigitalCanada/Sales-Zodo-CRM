import { Request, Response, NextFunction } from 'express';
/**
 * Permission check middleware factory
 * Checks if user has the required permission
 */
export declare function requirePermission(permissionCode: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Check if user has ANY of the specified permissions
 */
export declare function requireAnyPermission(permissionCodes: string[]): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Check if user has ALL of the specified permissions
 */
export declare function requireAllPermissions(permissionCodes: string[]): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Role-based access check
 */
export declare function requireRole(roleName: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Check if user has any of the specified roles
 */
export declare function requireAnyRole(roleNames: string[]): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Check if user is owner or admin
 */
export declare function requireAdmin(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Check if user is owner
 */
export declare function requireOwner(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Permission check helper function (not middleware)
 */
export declare function hasPermission(permissions: string[], permissionCode: string): boolean;
/**
 * Check if user can access their own resource or has admin permission
 */
export declare function requireOwnershipOrPermission(permissionCode: string, getResourceOwnerId: (req: Request) => Promise<string | null>): (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=permission.middleware.d.ts.map