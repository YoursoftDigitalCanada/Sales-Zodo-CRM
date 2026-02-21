import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../errors/HttpErrors';
import { ErrorCodes } from '../errors/errorCodes';
import { logger } from '../utils/logger';

/**
 * Global Tenant Context Middleware — THE MULTI-TENANT ISOLATION GATE
 *
 * Flow: Request → Auth (JWT) → TenantContext → Module Controllers
 *
 * 1. Extracts tenantId from verified JWT (req.user.tenantId)
 * 2. Blocks access if tenantId is missing
 * 3. Loads and validates tenant status from DB
 * 4. Attaches tenant to req.tenant
 * 5. Logs tenantId for observability (every request)
 */
export async function tenantContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      logger.warn('Tenant context missing — blocked request', {
        path: req.originalUrl,
        method: req.method,
        userId: req.user?.userId,
        requestId: req.requestId,
      });
      throw new UnauthorizedError(
        'Tenant context required. Your account is not associated with any organization.',
        ErrorCodes.TENANT_NOT_FOUND
      );
    }

    // ── Attach req.context — THE single trusted source of tenantId ──
    // Populated exclusively from the verified JWT payload.
    // Controllers must use req.context.tenantId instead of req.user!.tenantId!
    req.context = {
      tenantId,
      userId: req.user!.userId,
      employeeId: req.user?.employeeId,
    };

    // Short-circuit: if loadEmployee already attached tenant, just log and proceed
    if (req.tenant) {
      logger.debug('Tenant context resolved', {
        tenantId,
        tenantSlug: req.tenant.slug,
        userId: req.user?.userId,
        path: req.originalUrl,
        requestId: req.requestId,
      });
      return next();
    }

    // Load tenant from DB
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      logger.error('Tenant not found in DB despite valid JWT', {
        tenantId,
        userId: req.user?.userId,
        requestId: req.requestId,
      });
      throw new NotFoundError(
        'Tenant not found',
        ErrorCodes.TENANT_NOT_FOUND
      );
    }

    // Validate tenant status
    if (tenant.status === 'SUSPENDED') {
      logger.warn('Suspended tenant attempted access', { tenantId, slug: tenant.slug });
      throw new ForbiddenError(
        'Your organization has been suspended',
        ErrorCodes.TENANT_SUSPENDED
      );
    }

    if (tenant.status === 'CANCELLED') {
      logger.warn('Cancelled tenant attempted access', { tenantId, slug: tenant.slug });
      throw new ForbiddenError(
        'Your organization account has been cancelled',
        ErrorCodes.TENANT_SUSPENDED
      );
    }

    // Attach to request
    req.tenant = tenant;

    // Observability log (every request gets tenantId context)
    logger.debug('Tenant context resolved', {
      tenantId,
      tenantSlug: tenant.slug,
      userId: req.user?.userId,
      role: req.user?.role,
      path: req.originalUrl,
      method: req.method,
      requestId: req.requestId,
    });

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Extract tenant from slug in URL
 * Used for public routes that identify tenant by slug
 */
export async function tenantFromSlug(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { tenantSlug } = req.params;

    if (!tenantSlug) {
      throw new NotFoundError(
        'Tenant slug required',
        ErrorCodes.TENANT_NOT_FOUND
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      throw new NotFoundError(
        'Organization not found',
        ErrorCodes.TENANT_NOT_FOUND
      );
    }

    if (tenant.status !== 'ACTIVE' && tenant.status !== 'TRIAL') {
      throw new ForbiddenError(
        'This organization is not accessible',
        ErrorCodes.TENANT_SUSPENDED
      );
    }

    req.tenant = tenant;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validate that user has access to the tenant in the URL
 */
export async function validateTenantAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const urlTenantId = req.params.tenantId;
    const userTenantId = req.user?.tenantId;

    if (!urlTenantId) {
      return next();
    }

    if (urlTenantId !== userTenantId) {
      throw new ForbiddenError(
        'You do not have access to this organization',
        ErrorCodes.TENANT_ACCESS_DENIED
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Tenant isolation helper - adds tenantId filter to queries
 * This is a utility function, not middleware
 */
export function withTenantScope<T extends Record<string, any>>(
  query: T,
  tenantId: string
): T & { tenantId: string } {
  return {
    ...query,
    tenantId,
  };
}

/**
 * Create a tenant-scoped prisma query wrapper
 */
export function createTenantScope(tenantId: string) {
  return {
    /**
     * Add tenant filter to where clause
     */
    where: <T extends Record<string, any>>(where: T = {} as T) => ({
      ...where,
      tenantId,
    }),

    /**
     * Add tenant to create data
     */
    create: <T extends Record<string, any>>(data: T) => ({
      ...data,
      tenantId,
    }),

    /**
     * Validate that a record belongs to the tenant
     */
    validate: async (
      model: any,
      recordId: string,
      errorMessage: string = 'Record not found'
    ) => {
      const record = await model.findFirst({
        where: {
          id: recordId,
          tenantId,
        },
      });

      if (!record) {
        throw new NotFoundError(errorMessage, ErrorCodes.RESOURCE_NOT_FOUND);
      }

      return record;
    },
  };
}