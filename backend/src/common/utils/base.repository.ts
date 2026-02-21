// src/common/utils/base.repository.ts
// ============================================================================
// TENANT-SCOPED BASE REPOSITORY
//
// Generic base class that all tenant-scoped module repositories can extend.
// Provides standard CRUD operations with automatic tenantId injection.
//
// Usage:
//   class LeadsRepo extends TenantScopedRepository {
//     protected get model() { return prisma.lead; }
//     protected get defaultInclude() { return { leadSource: true }; }
//   }
//
//   const repo = new LeadsRepo();
//   const leads = await repo.findAll('tenant-id', { status: 'NEW' });
//   // ↑ auto-scoped: WHERE status = 'NEW' AND tenantId = 'tenant-id'
// ============================================================================

import { prisma } from '../../config/database';

/**
 * TenantScopedRepository — generic base for all CRM entity repositories.
 *
 * Provides standard CRUD methods that automatically scope queries by tenantId.
 * Extend this class and override `model` and optionally `defaultInclude`.
 *
 * All read/write operations inject `tenantId` — no cross-tenant leaks possible.
 */
export abstract class TenantScopedRepository {
    /**
     * Override: return the Prisma model delegate for this entity.
     * @example return prisma.lead;
     */
    protected abstract get model(): any;

    /**
     * Override: return the default include relations.
     * Return `undefined` to skip includes.
     */
    protected get defaultInclude(): Record<string, any> | undefined {
        return undefined;
    }

    // ---------------------------------------------------------------------------
    // READ — all scoped by tenantId
    // ---------------------------------------------------------------------------

    /**
     * Find all records for a tenant with optional filters, pagination, and sorting.
     */
    async findAll(
        tenantId: string,
        filters: Record<string, any> = {},
        options: {
            page?: number;
            limit?: number;
            sortBy?: string;
            sortOrder?: 'asc' | 'desc';
            include?: Record<string, any>;
        } = {}
    ) {
        const {
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            include,
        } = options;

        const where = { tenantId, ...filters };
        const effectiveInclude = include || this.defaultInclude;

        const [data, total] = await Promise.all([
            this.model.findMany({
                where,
                ...(effectiveInclude && { include: effectiveInclude }),
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.model.count({ where }),
        ]);

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Find a single record by ID within a tenant.
     * Returns null if not found or belongs to a different tenant.
     */
    async findById(id: string, tenantId: string, include?: Record<string, any>) {
        return this.model.findFirst({
            where: { id, tenantId },
            ...(include || this.defaultInclude
                ? { include: include || this.defaultInclude }
                : {}),
        });
    }

    /**
     * Find a single record by arbitrary criteria within a tenant.
     */
    async findOne(tenantId: string, where: Record<string, any>, include?: Record<string, any>) {
        return this.model.findFirst({
            where: { ...where, tenantId },
            ...(include || this.defaultInclude
                ? { include: include || this.defaultInclude }
                : {}),
        });
    }

    /**
     * Count records matching filters within a tenant.
     */
    async count(tenantId: string, filters: Record<string, any> = {}) {
        return this.model.count({
            where: { tenantId, ...filters },
        });
    }

    // ---------------------------------------------------------------------------
    // WRITE — all scoped by tenantId
    // ---------------------------------------------------------------------------

    /**
     * Create a new record within a tenant.
     * tenantId is auto-injected into the data.
     */
    async create(tenantId: string, data: Record<string, any>, include?: Record<string, any>) {
        return this.model.create({
            data: { ...data, tenantId },
            ...(include || this.defaultInclude
                ? { include: include || this.defaultInclude }
                : {}),
        });
    }

    /**
     * Update a record — ONLY if it belongs to the tenant.
     * Uses findFirst + update to guarantee tenant isolation.
     */
    async update(id: string, tenantId: string, data: Record<string, any>, include?: Record<string, any>) {
        // First verify the record belongs to this tenant
        const existing = await this.model.findFirst({
            where: { id, tenantId },
            select: { id: true },
        });

        if (!existing) {
            return null; // Record not found in this tenant
        }

        return this.model.update({
            where: { id },
            data,
            ...(include || this.defaultInclude
                ? { include: include || this.defaultInclude }
                : {}),
        });
    }

    /**
     * Delete a record — ONLY if it belongs to the tenant.
     * Prevents cross-tenant deletes.
     */
    async delete(id: string, tenantId: string) {
        // First verify the record belongs to this tenant
        const existing = await this.model.findFirst({
            where: { id, tenantId },
            select: { id: true },
        });

        if (!existing) {
            return null; // Record not found in this tenant
        }

        return this.model.delete({ where: { id } });
    }

    /**
     * Bulk update records within a tenant.
     */
    async updateMany(
        tenantId: string,
        where: Record<string, any>,
        data: Record<string, any>
    ) {
        return this.model.updateMany({
            where: { ...where, tenantId },
            data,
        });
    }

    /**
     * Bulk delete records within a tenant.
     */
    async deleteMany(tenantId: string, where: Record<string, any> = {}) {
        return this.model.deleteMany({
            where: { ...where, tenantId },
        });
    }

    /**
     * Check if a record exists within a tenant.
     */
    async exists(id: string, tenantId: string): Promise<boolean> {
        const count = await this.model.count({
            where: { id, tenantId },
        });
        return count > 0;
    }
}
