// src/common/middleware/module.middleware.ts
// ============================================================================
// MODULE GUARD MIDDLEWARE — Tenant-Aware Module Enforcement
//
// Checks if the requested module is enabled for the tenant before allowing
// route access. Returns 403 if the module is disabled.
//
// Prerequisites:
//   - tenantContext middleware must run BEFORE moduleGuard
//   - req.tenant must be populated with the tenant object (including settings)
//
// Usage in routes:
//   protectedRouter.use(moduleGuard);  // applies globally to all routes
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors/HttpErrors';
import { ErrorCodes } from '../errors/errorCodes';
import { ROUTE_MODULE_MAP, CORE_MODULES } from '../constants/modules.guard';
import { logger } from '../utils/logger';

/**
 * Tenant settings shape for module configuration.
 */
interface TenantModuleSettings {
    enabledModules?: string[];
    [key: string]: any;
}

/**
 * Extracts the route prefix from the request path.
 * Handles paths like /api/v1/leads/123 → "leads"
 */
function extractRoutePrefix(req: Request): string | null {
    // req.baseUrl + req.path gives the full path relative to the app
    // but inside the protectedRouter, req.path starts at the module level
    // We need the first segment of the path within the protected router
    const fullPath = req.originalUrl;

    // Match: /api/v1/<prefix>/...
    const match = fullPath.match(/\/api\/v\d+\/([^/?]+)/);
    return match ? match[1] : null;
}

/**
 * Module Guard Middleware
 *
 * Checks if the route's module is enabled for the current tenant.
 * Core modules (dashboard, auth, settings, etc.) always pass through.
 * Optional modules are checked against tenant.settings.enabledModules.
 */
export function moduleGuard(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    try {
        const routePrefix = extractRoutePrefix(req);

        // If we can't determine the route prefix, let it through
        // (could be a root-level endpoint or health check)
        if (!routePrefix) {
            return next();
        }

        // Core modules are always enabled — skip the check
        if ((CORE_MODULES as readonly string[]).includes(routePrefix)) {
            return next();
        }

        // Find the module slug for this route
        const moduleSlug = ROUTE_MODULE_MAP[routePrefix];

        // If the route isn't mapped to any module, let it through
        // (defensive — shouldn't happen in production)
        if (!moduleSlug) {
            return next();
        }

        // Tenant must be loaded by tenantContext middleware
        if (!req.tenant) {
            logger.warn('moduleGuard: req.tenant not available', {
                path: req.originalUrl,
                userId: req.user?.userId,
            });
            return next();
        }

        // Parse enabled modules from tenant settings
        const settings = (req.tenant.settings || {}) as TenantModuleSettings;
        const enabledModules = settings.enabledModules;

        // If enabledModules is not defined, assume all modules are enabled
        // (backward compatibility for tenants created before this feature)
        if (!enabledModules || !Array.isArray(enabledModules)) {
            return next();
        }

        // Check if the module is enabled
        if (!enabledModules.includes(moduleSlug)) {
            logger.info('Module access blocked — not enabled for tenant', {
                tenantId: req.tenant.id,
                tenantSlug: req.tenant.slug,
                module: moduleSlug,
                routePrefix,
                path: req.originalUrl,
                userId: req.user?.userId,
            });

            throw new ForbiddenError(
                `The "${moduleSlug}" module is not enabled for your organization. Contact your administrator to enable it.`,
                ErrorCodes.MODULE_DISABLED
            );
        }

        next();
    } catch (error) {
        next(error);
    }
}
