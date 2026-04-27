import { prisma } from '../../config/database';
import { adminAuthService } from './admin-auth.service';

function asObject(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function getCompanyProfile(settings: unknown, fallbackName: string, fallbackLogo: string | null, fallbackDomain: string | null) {
    const integrations = asObject(asObject(settings).integrations);

    return {
        companyName: String(integrations.companyName ?? fallbackName ?? ''),
        email: String(integrations.companyEmail ?? ''),
        phone: String(integrations.companyPhone ?? ''),
        address: String(integrations.companyAddress ?? ''),
        taxId: String(integrations.taxId ?? ''),
        domain: String(integrations.companyDomain ?? fallbackDomain ?? ''),
        logoUrl: fallbackLogo,
    };
}

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
                    tenantSettings: {
                        select: {
                            integrations: true,
                        },
                    },
                    users: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            status: true,
                            emailVerified: true,
                            lastLoginAt: true,
                        },
                        orderBy: { createdAt: 'asc' },
                        take: 5,
                    },
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
            company: getCompanyProfile(t.tenantSettings, t.name, t.logo ?? null, t.domain ?? null),
            subscriptionTier: t.subscriptionTier,
            userCount: t._count.users,
            users: t.users.map((user) => ({
                id: user.id,
                email: user.email,
                fullName: `${user.firstName} ${user.lastName}`.trim(),
                status: user.status,
                emailVerified: user.emailVerified,
                lastLoginAt: user.lastLoginAt,
            })),
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
                tenantSettings: true,
                users: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        avatar: true,
                        status: true,
                        emailVerified: true,
                        lastLoginAt: true,
                        createdAt: true,
                        employees: {
                            select: {
                                id: true,
                                department: true,
                                position: true,
                                employmentStatus: true,
                                isActive: true,
                                role: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                            take: 1,
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
                wallets: {
                    include: {
                        transactions: {
                            orderBy: { createdAt: 'desc' },
                            take: 10,
                        },
                    },
                    take: 1,
                },
                _count: {
                    select: {
                        users: true,
                        leads: true,
                        clients: true,
                        projects: true,
                        invoices: true,
                        roofEstimates: true,
                        quotes: true,
                        files: true,
                    },
                },
            },
        });

        if (!tenant) throw new Error('Tenant not found');

        const wallet = tenant.wallets[0] ?? null;
        const walletTransactions = wallet?.transactions ?? [];
        const totalRecharged = walletTransactions
            .filter((tx) => tx.type.toLowerCase() === 'credit')
            .reduce((sum, tx) => sum + Number(tx.amount), 0);
        const totalAiSpend = walletTransactions
            .filter((tx) => tx.referenceType === 'estimate' || tx.description.toLowerCase().includes('estimate'))
            .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);
        const aiRoofEstimatorUsageCount = walletTransactions.filter(
            (tx) => tx.referenceType === 'estimate' || tx.description.toLowerCase().includes('estimate')
        ).length;
        const company = getCompanyProfile(tenant.tenantSettings, tenant.name, tenant.logo ?? null, tenant.domain ?? null);

        return {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            domain: tenant.domain,
            logo: tenant.logo,
            status: tenant.status,
            subscriptionTier: tenant.subscriptionTier,
            fileStorageQuota: Number(tenant.fileStorageQuota),
            fileStorageUsed: Number(tenant.fileStorageUsed),
            emailStorageQuota: Number(tenant.emailStorageQuota),
            emailStorageUsed: Number(tenant.emailStorageUsed),
            onboardingCompleted: tenant.onboardingCompleted,
            createdAt: tenant.createdAt,
            updatedAt: tenant.updatedAt,
            company,
            subscription: tenant.subscription
                ? {
                    ...tenant.subscription,
                    monthlyRate: Number(tenant.subscription.monthlyRate),
                    totalPaid: Number(tenant.subscription.totalPaid),
                }
                : null,
            counts: tenant._count,
            wallet: wallet
                ? {
                    id: wallet.id,
                    balance: Number(wallet.balance),
                    currency: wallet.currency,
                    totalRecharged,
                    totalAiSpend,
                    transactionCount: walletTransactions.length,
                    recentTransactions: walletTransactions.map((tx) => ({
                        id: tx.id,
                        type: tx.type,
                        amount: Number(tx.amount),
                        description: tx.description,
                        balanceAfter: Number(tx.balanceAfter),
                        referenceType: tx.referenceType,
                        referenceId: tx.referenceId,
                        createdBy: tx.createdBy,
                        createdAt: tx.createdAt,
                    })),
                }
                : null,
            usage: {
                aiRoofEstimatorRuns: aiRoofEstimatorUsageCount || tenant._count.roofEstimates,
                roofEstimateRecords: tenant._count.roofEstimates,
                fileStorageUsedBytes: Number(tenant.fileStorageUsed),
                fileStorageQuotaBytes: Number(tenant.fileStorageQuota),
                emailStorageUsedBytes: Number(tenant.emailStorageUsed),
                emailStorageQuotaBytes: Number(tenant.emailStorageQuota),
            },
            users: tenant.users.map((user) => ({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: `${user.firstName} ${user.lastName}`.trim(),
                phone: user.phone,
                avatar: user.avatar,
                status: user.status,
                emailVerified: user.emailVerified,
                lastLoginAt: user.lastLoginAt,
                createdAt: user.createdAt,
                employee: user.employees[0]
                    ? {
                        id: user.employees[0].id,
                        department: user.employees[0].department,
                        position: user.employees[0].position,
                        employmentStatus: user.employees[0].employmentStatus,
                        isActive: user.employees[0].isActive,
                        role: user.employees[0].role,
                    }
                    : null,
            })),
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
