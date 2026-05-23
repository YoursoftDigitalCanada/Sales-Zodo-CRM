import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';

export const LEGACY_ROOFING_AUTOMATION_MODULE = 'roofing-automation';

type TenantSettings = {
  enabledModules?: unknown;
  legacyRoofingAutomationEnabled?: unknown;
};

export async function isLegacyRoofingAutomationEnabled(tenantId?: string | null): Promise<boolean> {
  if (!tenantId) return false;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const settings = (tenant?.settings || {}) as TenantSettings;
    const enabledModules = Array.isArray(settings.enabledModules) ? settings.enabledModules : [];

    return settings.legacyRoofingAutomationEnabled === true
      || enabledModules.includes(LEGACY_ROOFING_AUTOMATION_MODULE);
  } catch (error) {
    logger.warn('[Automation] Legacy roofing automation guard failed closed', {
      tenantId,
      error: (error as Error)?.message || String(error),
    });
    return false;
  }
}
