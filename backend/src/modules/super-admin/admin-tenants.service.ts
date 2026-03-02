import { prisma } from '../../config/database';
import { adminAuthService } from './admin-auth.service';

export class AdminTenantsService {
    /**
     * List all tenants with filters and pagination
     */
    async listTenants(query: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        planType?: string;
        billingCycle?: string;
        sortBy?: string;
        sortOrder?: string;
    }) {
        const {
            page = 1,
            limit = 20,
            search,
            status,
            planType,
            billingCycle,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = query;

        const where: any = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (status) {
            where.status = status;
        }

        if (planType || billingCycle) {
            where.subscription = {};
            if (planType) where.subscription.planType = planType;
            if (billingCycle) where.subscription.billingCycle = billingCycle;
        }

        const [tenants, total] = await Promise.all([
            prisma.tenant.findMany({
                where,
                include: {
                    subscription: true,
                    _count: { select: { users: true } },
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.tenant.count({ where }),
        ]);

        const enriched = tenants.map((t) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            status: t.status,
            subscriptionTier: t.subscriptionTier,
            userCount: t._count.users,
            subscription: t.subscription
                ? {
                    planType: t.subscription.planType,
                    billingCycle: t.subscription.billingCycle,
                    status: t.subscription.status,
                    startDate: t.subscription.startDate,
                    nextBillingDate: t.subscription.nextBillingDate,
                    monthlyRate: Number(t.subscription.monthlyRate),
                    totalPaid: Number(t.subscription.totalPaid),
                }
                : null,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
        }));

        return { data: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    /**
     * Get single tenant details
     */
    async getTenantDetail(tenantId: string) {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            include: {
                subscription: true,
                _count: {
                    select: {
                        users: true,
                        leads: true,
                        clients: true,
                        projects: true,
                        invoices: true,
                    },
                },
            },
        });

        if (!tenant) throw new Error('Tenant not found');

        return {
            ...tenant,
            subscription: tenant.subscription
                ? {
                    ...tenant.subscription,
                    monthlyRate: Number(tenant.subscription.monthlyRate),
                    totalPaid: Number(tenant.subscription.totalPaid),
                }
                : null,
            counts: tenant._count,
        };
    }

    /**
     * Suspend a tenant
     */
    async suspendTenant(tenantId: string, adminId: string) {
        await prisma.tenant.update({
            where: { id: tenantId },
            data: { status: 'SUSPENDED' },
        });

        await adminAuthService.logAction(adminId, 'TENANT_SUSPENDED', 'Tenant', tenantId);
        return { success: true };
    }

    /**
     * Activate a tenant
     */
    async activateTenant(tenantId: string, adminId: string) {
        await prisma.tenant.update({
            where: { id: tenantId },
            data: { status: 'ACTIVE' },
        });

        await adminAuthService.logAction(adminId, 'TENANT_ACTIVATED', 'Tenant', tenantId);
        return { success: true };
    }

    /**
     * Upgrade / change tenant plan
     */
    async upgradePlan(
        tenantId: string,
        planType: string,
        billingCycle: string,
        monthlyRate: number,
        adminId: string
    ) {
        // Upsert subscription
        await prisma.subscription.upsert({
            where: { tenantId },
            update: {
                planType,
                billingCycle,
                monthlyRate,
                status: 'ACTIVE',
            },
            create: {
                tenantId,
                planType,
                billingCycle,
                monthlyRate,
                status: 'ACTIVE',
                startDate: new Date(),
            },
        });

        // Also update the tenant's subscriptionTier
        await prisma.tenant.update({
            where: { id: tenantId },
            data: { subscriptionTier: planType.toLowerCase(), status: 'ACTIVE' },
        });

        await adminAuthService.logAction(adminId, 'PLAN_UPGRADED', 'Tenant', tenantId, {
            planType,
            billingCycle,
            monthlyRate,
        });

        return { success: true };
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(tenantId: string, adminId: string) {
        await prisma.subscription.updateMany({
            where: { tenantId },
            data: { status: 'CANCELLED', cancelledAt: new Date() },
        });

        await prisma.tenant.update({
            where: { id: tenantId },
            data: { status: 'CANCELLED' },
        });

        await adminAuthService.logAction(adminId, 'SUBSCRIPTION_CANCELLED', 'Tenant', tenantId);
        return { success: true };
    }

    /**
     * Delete tenant (dangerous – soft-delete by status change)
     */
    async deleteTenant(tenantId: string, adminId: string) {
        // For safety, just suspend + mark cancelled. Real deletion is destructive.
        await prisma.tenant.update({
            where: { id: tenantId },
            data: { status: 'CANCELLED' },
        });

        await adminAuthService.logAction(adminId, 'TENANT_DELETED', 'Tenant', tenantId);
        return { success: true, note: 'Tenant marked as cancelled (soft delete)' };
    }
}

export const adminTenantsService = new AdminTenantsService();
