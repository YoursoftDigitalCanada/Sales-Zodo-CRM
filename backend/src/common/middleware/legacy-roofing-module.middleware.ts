import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors/HttpErrors';
import { ErrorCodes } from '../errors/errorCodes';
import { LEGACY_ROOFING_AUTOMATION_MODULE } from '../../modules/automation/legacy-automation.guard';

type TenantSettings = {
  enabledModules?: unknown;
  legacyRoofingAutomationEnabled?: unknown;
};

export function isLegacyRoofingModuleEnabledFromSettings(settings: TenantSettings | null | undefined): boolean {
  if (!settings) return false;
  const enabledModules = Array.isArray(settings.enabledModules) ? settings.enabledModules : [];
  return settings.legacyRoofingAutomationEnabled === true
    || enabledModules.includes(LEGACY_ROOFING_AUTOMATION_MODULE);
}

export function requireLegacyRoofingModule(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const settings = (req.tenant?.settings || {}) as TenantSettings;
  if (isLegacyRoofingModuleEnabledFromSettings(settings)) {
    return next();
  }

  return next(new ForbiddenError(
    'This legacy workflow module is not enabled for this organization.',
    ErrorCodes.MODULE_DISABLED,
  ));
}
