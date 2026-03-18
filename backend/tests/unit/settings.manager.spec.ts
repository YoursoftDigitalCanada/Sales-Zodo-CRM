jest.mock('../../src/config/database', () => ({
  prisma: {
    tenant: { findUniqueOrThrow: jest.fn() },
    subscription: { findUnique: jest.fn() },
    employee: { count: jest.fn() },
    contact: { count: jest.fn() },
    auditLog: { count: jest.fn() },
  },
}));

jest.mock('../../src/modules/settings/settings.repository', () => ({
  settingsRepository: {
    ensure: jest.fn(),
  },
}));

import { SettingsManager } from '../../src/modules/settings/settings.manager';
import { settingsRepository } from '../../src/modules/settings/settings.repository';

const mockedSettingsRepository = settingsRepository as jest.Mocked<typeof settingsRepository>;

describe('SettingsManager', () => {
  let manager: SettingsManager;

  beforeEach(() => {
    manager = new SettingsManager();
    mockedSettingsRepository.ensure.mockReset();
  });

  it('blocks usage that exceeds the current billing plan limit', async () => {
    jest.spyOn(manager, 'getBillingContext').mockResolvedValue({
      subscription: { planType: 'STARTER' },
      usersCount: 10,
      contactsCount: 100,
      apiCallsCount: 0,
      tenant: {},
    } as any);

    await expect(manager.assertUsageWithinPlan('tenant-1', 'users')).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('Starter plan allows up to 10 users'),
    });
  });

  it('allows unlimited enterprise usage', async () => {
    jest.spyOn(manager, 'getBillingContext').mockResolvedValue({
      subscription: { planType: 'ENTERPRISE' },
      usersCount: 500,
      contactsCount: 100000,
      apiCallsCount: 0,
      tenant: {},
    } as any);

    await expect(manager.assertUsageWithinPlan('tenant-1', 'contacts', 500)).resolves.toBeUndefined();
  });

  it('returns a custom session timeout from workspace security settings', async () => {
    mockedSettingsRepository.ensure.mockResolvedValue({
      integrations: {
        securitySettings: {
          sessionTimeoutMinutes: 45,
        },
      },
    } as any);

    await expect(manager.getSessionTimeoutMinutes('tenant-1')).resolves.toBe(45);
  });

  it('rejects logins from IP addresses outside the workspace whitelist', async () => {
    mockedSettingsRepository.ensure.mockResolvedValue({
      integrations: {
        securitySettings: {
          ipWhitelist: ['203.0.113.10'],
        },
      },
    } as any);

    await expect(manager.assertIpAllowed('tenant-1', '198.51.100.2')).rejects.toMatchObject({
      statusCode: 403,
      message: 'Your IP address is not allowed for this workspace',
    });
  });
});
