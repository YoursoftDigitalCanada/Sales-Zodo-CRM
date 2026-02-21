import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { ForbiddenError, UnauthorizedError } from '../errors/HttpErrors';
import { ErrorCodes } from '../errors/errorCodes';
import { logger } from '../utils/logger';

// ============================================================================
// TENANT MEMBERSHIP GUARD — Reusable Cross-Tenant Access Control
// ============================================================================
//
// Validates that the authenticated user has an ACTIVE Employee record in the
// requested tenant. Use this middleware for any operation that involves
// accessing or switching to a different tenant than the one in the current JWT.
//
// Designed for Model C multi-tenancy:
//   User (id: 123)
//     ├── Primary Tenant: A
//     └── Memberships (Employee records): [A, B, C]
//
//   Request: switch to Tenant B
//     → tenantMembershipGuard checks Employee table: (userId=123, tenantId=B, isActive=true)
//     → YES → next()
//     → NO  → 403 Forbidden
//
// Usage:
//   router.post('/switch-tenant/:tenantId', authenticate, tenantMembershipGuard('tenantId'), handler)
//   router.get('/cross-tenant/:orgId/data', authenticate, tenantMembershipGuard('orgId'), handler)
// ============================================================================

/**
 * Factory that creates a middleware to validate tenant membership.
 *
 * @param paramName — Route param name containing the target tenantId (default: 'tenantId')
 * @returns Express middleware that blocks with 403 if the user is not a member
 */
export function tenantMembershipGuard(paramName: string = 'tenantId') {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;

            if (!userId) {
                throw new UnauthorizedError(
                    'Authentication required',
                    ErrorCodes.AUTH_TOKEN_INVALID
                );
            }

            const targetTenantId = req.params[paramName];

            if (!targetTenantId) {
                throw new ForbiddenError(
                    `Missing tenant identifier in route param ':${paramName}'`,
                    ErrorCodes.TENANT_NOT_FOUND
                );
            }

            // ── DB ownership check: user must be an active employee of target tenant ──
            const membership = await prisma.employee.findFirst({
                where: {
                    userId,
                    tenantId: targetTenantId,
                    isActive: true,
                },
                select: {
                    id: true,
                    tenantId: true,
                    role: {
                        select: {
                            name: true,
                        },
                    },
                    tenant: {
                        select: {
                            id: true,
                            name: true,
                            status: true,
                        },
                    },
                },
            });

            if (!membership) {
                logger.warn('Tenant membership guard: access denied — user is not a member', {
                    userId,
                    targetTenantId,
                    sourceTenantId: req.context?.tenantId || req.user?.tenantId,
                    path: req.originalUrl,
                    method: req.method,
                    ipAddress: req.ip || req.socket.remoteAddress,
                });

                throw new ForbiddenError(
                    'You do not have access to this organization',
                    ErrorCodes.TENANT_ACCESS_DENIED
                );
            }

            // ── Check tenant status ──
            if (membership.tenant.status === 'SUSPENDED') {
                logger.warn('Tenant membership guard: tenant suspended', {
                    userId,
                    targetTenantId,
                    tenantName: membership.tenant.name,
                });
                throw new ForbiddenError(
                    'This organization has been suspended',
                    ErrorCodes.TENANT_SUSPENDED
                );
            }

            if (membership.tenant.status === 'CANCELLED') {
                logger.warn('Tenant membership guard: tenant cancelled', {
                    userId,
                    targetTenantId,
                    tenantName: membership.tenant.name,
                });
                throw new ForbiddenError(
                    'This organization account has been cancelled',
                    ErrorCodes.TENANT_SUSPENDED
                );
            }

            // ── Attach validated membership to request for downstream use ──
            // Controllers can access req.membershipContext without re-querying
            (req as any).membershipContext = {
                employeeId: membership.id,
                tenantId: membership.tenantId,
                role: membership.role.name,
                tenantName: membership.tenant.name,
            };

            next();
        } catch (error) {
            next(error);
        }
    };
}
