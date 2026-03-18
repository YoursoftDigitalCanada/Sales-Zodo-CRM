import { prisma } from '../../config/database';
import { BadRequestError, ForbiddenError } from '../../common/errors/HttpErrors';
import { BILLING_PLANS, DEFAULT_SECURITY_SETTINGS, normalizePlanKey } from './settings.constants';
import { settingsRepository } from './settings.repository';

type UsageMetricKey = 'users' | 'contacts';

export class SettingsManager {
  async getBillingContext(tenantId: string) {
    const [tenant, subscription, usersCount, contactsCount, apiCallsCount] = await Promise.all([
      prisma.tenant.findUniqueOrThrow({
        where: { id: tenantId },
        select: {
          id: true,
          fileStorageQuota: true,
          fileStorageUsed: true,
        },
      }),
      prisma.subscription.findUnique({
        where: { tenantId },
      }),
      prisma.employee.count({
        where: {
          tenantId,
          isActive: true,
        },
      }),
      prisma.contact.count({
        where: {
          tenantId,
        },
      }),
      prisma.auditLog.count({
        where: {
          tenantId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    return {
      tenant,
      subscription,
      usersCount,
      contactsCount,
      apiCallsCount,
    };
  }

  async assertUsageWithinPlan(tenantId: string, metric: UsageMetricKey, increment: number = 1): Promise<void> {
    const billingContext = await this.getBillingContext(tenantId);
    const plan = BILLING_PLANS[normalizePlanKey(billingContext.subscription?.planType)];
    const limit = plan.limits[metric];

    if (limit === null) {
      return;
    }

    const currentValue = metric === 'users' ? billingContext.usersCount : billingContext.contactsCount;

    if (currentValue + increment > limit) {
      throw new BadRequestError(
        `Your ${plan.name} plan allows up to ${limit} ${metric}. Please upgrade to continue.`
      );
    }
  }

  async getSessionTimeoutMinutes(tenantId: string): Promise<number> {
    const settings = await settingsRepository.ensure(tenantId);
    const integrations = typeof settings.integrations === 'object' && settings.integrations
      ? (settings.integrations as Record<string, unknown>)
      : {};
    const securitySettings = typeof integrations.securitySettings === 'object' && integrations.securitySettings
      ? (integrations.securitySettings as Record<string, unknown>)
      : {};

    return Number(securitySettings.sessionTimeoutMinutes ?? DEFAULT_SECURITY_SETTINGS.sessionTimeoutMinutes);
  }

  async assertIpAllowed(tenantId: string, ipAddress?: string): Promise<void> {
    if (!ipAddress) return;

    const settings = await settingsRepository.ensure(tenantId);
    const integrations = typeof settings.integrations === 'object' && settings.integrations
      ? (settings.integrations as Record<string, unknown>)
      : {};
    const securitySettings = typeof integrations.securitySettings === 'object' && integrations.securitySettings
      ? (integrations.securitySettings as Record<string, unknown>)
      : {};
    const whitelist = Array.isArray(securitySettings.ipWhitelist)
      ? securitySettings.ipWhitelist.map((entry) => String(entry).trim()).filter(Boolean)
      : [];

    if (whitelist.length === 0) {
      return;
    }

    if (!whitelist.includes(ipAddress)) {
      throw new ForbiddenError('Your IP address is not allowed for this workspace');
    }
  }
}

export const settingsManager = new SettingsManager();
