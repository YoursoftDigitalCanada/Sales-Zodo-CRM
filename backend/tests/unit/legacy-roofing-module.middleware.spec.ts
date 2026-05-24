jest.mock('../../src/common/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  isLegacyRoofingModuleEnabledFromSettings,
  requireLegacyRoofingModule,
} from '../../src/common/middleware/legacy-roofing-module.middleware';
import { ROUTE_MODULE_MAP } from '../../src/common/constants/modules.guard';

function runGuard(settings: Record<string, any>) {
  const next = jest.fn();
  requireLegacyRoofingModule(
    {
      originalUrl: '/api/v1/inspections',
      tenant: { id: 'tenant-1', settings },
      user: { userId: 'user-1' },
    } as any,
    {} as any,
    next,
  );
  return next;
}

describe('legacy roofing route guard', () => {
  it('maps the top-level inspections route to the roofing module flag', () => {
    expect(ROUTE_MODULE_MAP.inspections).toEqual(['roofing-automation']);
  });

  it('Sales CRM tenant cannot access /inspections without explicit roofing module', () => {
    const next = runGuard({ enabledModules: ['leads', 'automation', 'finance'], plan: 'enterprise' });
    const error = next.mock.calls[0]?.[0];

    expect(error).toMatchObject({
      statusCode: 403,
      code: 'MODULE_DISABLED',
      message: expect.stringContaining('legacy workflow module'),
    });
  });

  it('Sales CRM tenant cannot use lead inspection routes without explicit roofing module', () => {
    const next = runGuard({ enabledModules: ['leads'], plan: 'enterprise' });
    const error = next.mock.calls[0]?.[0];

    expect(error).toMatchObject({ statusCode: 403, code: 'MODULE_DISABLED' });
  });

  it('Sales CRM tenant cannot use insurance claim routes without explicit roofing module', () => {
    const next = runGuard({ enabledModules: ['leads', 'clients'], plan: 'enterprise' });
    const error = next.mock.calls[0]?.[0];

    expect(error).toMatchObject({ statusCode: 403, code: 'MODULE_DISABLED' });
  });

  it('roofing-enabled tenant can access legacy routes before normal permission checks', () => {
    const next = runGuard({ enabledModules: ['leads', 'roofing-automation'], plan: 'enterprise' });

    expect(next).toHaveBeenCalledWith();
  });

  it('legacy boolean flag also enables routes for explicitly configured tenants', () => {
    expect(isLegacyRoofingModuleEnabledFromSettings({
      enabledModules: ['leads'],
      legacyRoofingAutomationEnabled: true,
    })).toBe(true);
  });

  it('fails closed when enabledModules are missing', () => {
    const next = runGuard({});
    const error = next.mock.calls[0]?.[0];

    expect(error).toMatchObject({ statusCode: 403, code: 'MODULE_DISABLED' });
  });
});
