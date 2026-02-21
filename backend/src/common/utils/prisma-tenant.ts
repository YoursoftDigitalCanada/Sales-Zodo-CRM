// src/common/utils/prisma-tenant.ts
// ============================================================================
// PRISMA TENANT SCOPING — CORE DATA ISOLATION LAYER
//
// Wraps any Prisma model delegate to auto-inject { tenantId } into ALL queries,
// guaranteeing zero cross-tenant data access without manual filters.
//
// Usage:
//   const scoped = new TenantScopedClient(prisma.lead, tenantId);
//   await scoped.findMany({ where: { status: 'NEW' } });
//   // ↑ automatically becomes: where: { status: 'NEW', tenantId: '...' }
//
//   Or use the factory:
//   const scope = createTenantPrisma(tenantId);
//   await scope.lead.findMany({ where: { status: 'NEW' } });
// ============================================================================

import { prisma } from '../../config/database';

/**
 * Wraps a Prisma model delegate to auto-inject tenantId into all operations.
 *
 * Covered operations:
 *   - Reads:  findMany, findFirst, findUnique, count, aggregate, groupBy
 *   - Writes: create, createMany, update, updateMany, upsert, delete, deleteMany
 */
export class TenantScopedClient<TDelegate extends Record<string, any>> {
    constructor(
        private readonly delegate: TDelegate,
        private readonly tenantId: string
    ) { }

    // ---------------------------------------------------------------------------
    // READ operations — inject tenantId into where clause
    // ---------------------------------------------------------------------------

    async findMany(args: Record<string, any> = {}) {
        return this.delegate.findMany({
            ...args,
            where: { ...args.where, tenantId: this.tenantId },
        });
    }

    async findFirst(args: Record<string, any> = {}) {
        return this.delegate.findFirst({
            ...args,
            where: { ...args.where, tenantId: this.tenantId },
        });
    }

    async findUnique(args: Record<string, any>) {
        // findUnique requires a unique key — we do a findFirst with tenantId instead
        // to prevent cross-tenant access via known IDs
        const { where, ...rest } = args;
        return this.delegate.findFirst({
            ...rest,
            where: { ...where, tenantId: this.tenantId },
        });
    }

    async count(args: Record<string, any> = {}) {
        return this.delegate.count({
            ...args,
            where: { ...args.where, tenantId: this.tenantId },
        });
    }

    async aggregate(args: Record<string, any>) {
        return this.delegate.aggregate({
            ...args,
            where: { ...args.where, tenantId: this.tenantId },
        });
    }

    async groupBy(args: Record<string, any>) {
        return this.delegate.groupBy({
            ...args,
            where: { ...args.where, tenantId: this.tenantId },
        });
    }

    // ---------------------------------------------------------------------------
    // WRITE operations — inject tenantId into data/where
    // ---------------------------------------------------------------------------

    async create(args: Record<string, any>) {
        return this.delegate.create({
            ...args,
            data: { ...args.data, tenantId: this.tenantId },
        });
    }

    async createMany(args: Record<string, any>) {
        const data = Array.isArray(args.data)
            ? args.data.map((d: any) => ({ ...d, tenantId: this.tenantId }))
            : { ...args.data, tenantId: this.tenantId };
        return this.delegate.createMany({ ...args, data });
    }

    async update(args: Record<string, any>) {
        // CRITICAL: Scope the where clause to prevent cross-tenant updates
        return this.delegate.update({
            ...args,
            where: { ...args.where, tenantId: this.tenantId },
        });
    }

    async updateMany(args: Record<string, any>) {
        return this.delegate.updateMany({
            ...args,
            where: { ...args.where, tenantId: this.tenantId },
        });
    }

    async upsert(args: Record<string, any>) {
        return this.delegate.upsert({
            ...args,
            where: { ...args.where, tenantId: this.tenantId },
            create: { ...args.create, tenantId: this.tenantId },
        });
    }

    async delete(args: Record<string, any>) {
        // CRITICAL: Scope the where clause to prevent cross-tenant deletes
        return this.delegate.delete({
            ...args,
            where: { ...args.where, tenantId: this.tenantId },
        });
    }

    async deleteMany(args: Record<string, any> = {}) {
        return this.delegate.deleteMany({
            ...args,
            where: { ...args.where, tenantId: this.tenantId },
        });
    }
}

// =============================================================================
// FACTORY — creates a tenant-scoped Prisma proxy for all CRM models
// =============================================================================

/**
 * Creates a tenant-scoped Prisma proxy.
 *
 * Every model accessed through this proxy will auto-inject tenantId
 * into all queries. Use this in controllers/services instead of raw `prisma`.
 *
 * @example
 *   const db = createTenantPrisma(req.user!.tenantId);
 *   const leads = await db.lead.findMany({ where: { status: 'NEW' } });
 *   // ↑ Prisma query: WHERE status = 'NEW' AND tenantId = '...'
 */
export function createTenantPrisma(tenantId: string) {
    return {
        // CRM core
        lead: new TenantScopedClient(prisma.lead, tenantId),
        client: new TenantScopedClient(prisma.client, tenantId),
        contact: new TenantScopedClient(prisma.contact, tenantId),

        // Operations
        project: new TenantScopedClient(prisma.project, tenantId),
        task: new TenantScopedClient(prisma.task, tenantId),
        calendarEvent: new TenantScopedClient(prisma.calendarEvent, tenantId),

        // Finance
        invoice: new TenantScopedClient(prisma.invoice, tenantId),
        expense: new TenantScopedClient(prisma.expense, tenantId),
        booking: new TenantScopedClient(prisma.booking, tenantId),

        // Files
        file: new TenantScopedClient(prisma.file, tenantId),
        folder: new TenantScopedClient(prisma.folder, tenantId),

        // Communication
        email: new TenantScopedClient(prisma.email, tenantId),

        // Organization
        employee: new TenantScopedClient(prisma.employee, tenantId),
        role: new TenantScopedClient(prisma.role, tenantId),
        group: new TenantScopedClient(prisma.group, tenantId),

        // Leads pipeline
        leadSource: new TenantScopedClient(prisma.leadSource, tenantId),
        tag: new TenantScopedClient(prisma.tag, tenantId),

        // Notifications
        notification: new TenantScopedClient(prisma.notification, tenantId),

        // Applications
        application: new TenantScopedClient(prisma.application, tenantId),

        // Settings
        tenantSettings: new TenantScopedClient(prisma.tenantSettings, tenantId),

        // Audit
        auditLog: new TenantScopedClient(prisma.auditLog, tenantId),

        // Raw prisma for non-tenant-scoped operations (e.g., Permission, User)
        $raw: prisma,
        tenantId,
    };
}

/** Type alias for the tenant-scoped Prisma proxy */
export type TenantPrisma = ReturnType<typeof createTenantPrisma>;
