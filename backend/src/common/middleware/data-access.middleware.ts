import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { logger } from '../utils/logger';

/**
 * Data Access context attached to req.dataAccess
 */
export interface DataAccessContext {
    hasFullAccess: boolean;
    allowedClientIds: string[];
    allowedProjectIds: string[];
}

/**
 * Load data-level access rules for the current employee.
 *
 * Must run AFTER `loadEmployee` middleware.
 *
 * Rules:
 *  - Owner / Admin roles → full access (bypass)
 *  - If employee has UserAccess rows with clientId → can see all projects of those clients
 *  - If employee has UserAccess rows with projectId → can see only those specific projects
 *  - If no UserAccess rows → restricted to own data only (empty arrays)
 */
export async function loadDataAccess(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const roleName = req.employee?.role?.name || req.user?.role;
        const employeeId = req.user?.employeeId;
        const tenantId = req.user?.tenantId;

        // Owner and Admin bypass data-level restrictions
        if (roleName === 'Owner' || roleName === 'Admin') {
            (req as any).dataAccess = {
                hasFullAccess: true,
                allowedClientIds: [],
                allowedProjectIds: [],
            } as DataAccessContext;
            return next();
        }

        if (!employeeId || !tenantId) {
            (req as any).dataAccess = {
                hasFullAccess: false,
                allowedClientIds: [],
                allowedProjectIds: [],
            } as DataAccessContext;
            return next();
        }

        // Fetch all UserAccess rows for this employee
        const accessRows = await prisma.userAccess.findMany({
            where: { employeeId, tenantId },
            select: { clientId: true, projectId: true },
        });

        const allowedClientIds = accessRows
            .filter((r) => r.clientId)
            .map((r) => r.clientId!);

        const allowedProjectIds = accessRows
            .filter((r) => r.projectId)
            .map((r) => r.projectId!);

        // If employee has client access, also include all projects belonging to those clients
        if (allowedClientIds.length > 0) {
            const clientProjects = await prisma.project.findMany({
                where: { tenantId, clientId: { in: allowedClientIds }, deletedAt: null },
                select: { id: true },
            });
            for (const p of clientProjects) {
                if (!allowedProjectIds.includes(p.id)) {
                    allowedProjectIds.push(p.id);
                }
            }
        }

        const hasFullAccess = accessRows.length === 0 && roleName !== 'Staff';

        (req as any).dataAccess = {
            hasFullAccess,
            allowedClientIds,
            allowedProjectIds,
        } as DataAccessContext;

        logger.debug('Data access loaded', {
            employeeId,
            hasFullAccess,
            clientCount: allowedClientIds.length,
            projectCount: allowedProjectIds.length,
        });

        next();
    } catch (error) {
        next(error);
    }
}

/**
 * Helper to build a Prisma WHERE clause that applies data-level filtering.
 *
 * Use in services:
 *   const where = applyDataFilter(req.dataAccess, tenantId);
 *   // where = { tenantId, OR: [{clientId: {in: [...]}}, {id: {in: [...]}}] }
 */
export function buildDataFilter(
    dataAccess: DataAccessContext,
    tenantId: string,
    options?: { clientField?: string; idField?: string }
): Record<string, any> {
    const base: Record<string, any> = { tenantId };

    if (dataAccess.hasFullAccess) {
        return base;
    }

    const clientField = options?.clientField || 'clientId';

    const orConditions: any[] = [];

    if (dataAccess.allowedClientIds.length > 0) {
        orConditions.push({ [clientField]: { in: dataAccess.allowedClientIds } });
    }

    if (dataAccess.allowedProjectIds.length > 0) {
        orConditions.push({ id: { in: dataAccess.allowedProjectIds } });
    }

    if (orConditions.length === 0) {
        // No access → return impossible filter
        base.id = '__no_access__';
        return base;
    }

    base.OR = orConditions;
    return base;
}
