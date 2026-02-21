import { Request, Response, NextFunction } from 'express';
/**
 * Tenant context middleware
 * Ensures tenant is loaded and validates tenant status
 */
export declare function tenantContext(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Extract tenant from slug in URL
 * Used for public routes that identify tenant by slug
 */
export declare function tenantFromSlug(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Validate that user has access to the tenant in the URL
 */
export declare function validateTenantAccess(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Tenant isolation helper - adds tenantId filter to queries
 * This is a utility function, not middleware
 */
export declare function withTenantScope<T extends Record<string, any>>(query: T, tenantId: string): T & {
    tenantId: string;
};
/**
 * Create a tenant-scoped prisma query wrapper
 */
export declare function createTenantScope(tenantId: string): {
    /**
     * Add tenant filter to where clause
     */
    where: <T extends Record<string, any>>(where?: T) => T & {
        tenantId: string;
    };
    /**
     * Add tenant to create data
     */
    create: <T extends Record<string, any>>(data: T) => T & {
        tenantId: string;
    };
    /**
     * Validate that a record belongs to the tenant
     */
    validate: (model: any, recordId: string, errorMessage?: string) => Promise<any>;
};
//# sourceMappingURL=tenant.middleware.d.ts.map