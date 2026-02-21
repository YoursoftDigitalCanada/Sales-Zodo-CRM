import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { ForbiddenError, NotFoundError } from '../errors/HttpErrors';
import { ErrorCodes } from '../errors/errorCodes';
import { logger } from '../utils/logger';

/**
 * Tenant context middleware
 * Ensures tenant is loaded and validates tenant status
 */
export async function tenantContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      throw new ForbiddenError(
        'Tenant context required',
        ErrorCodes.TENANT_NOT_FOUND
      );
    }

    // Check if tenant is already loaded
    if (req.tenant) {
      return next();
    }

    // Load tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundError(
        'Tenant not found',
        ErrorCodes.TENANT_NOT_FOUND
      );
    }

    // Check tenant status
    if (tenant.status === 'SUSPENDED') {
      throw new ForbiddenError(
        'Your organization has been suspended',
        ErrorCodes.TENANT_SUSPENDED
      );
    }

    if (tenant.status === 'CANCELLED') {
      throw new ForbiddenError(
        'Your organization account has been cancelled',
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