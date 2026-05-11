jest.mock('../../src/common/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { moduleGuard } from '../../src/common/middleware/module.middleware';

function runModuleGuard(path: string, enabledModules: string[]) {
  const next = jest.fn();

  moduleGuard(
    {
      originalUrl: `/api/v1${path}`,
      tenant: {
        id: 'tenant-1',
        slug: 'zodo',
        settings: { enabledModules, plan: 'enterprise' },
      },
      user: { userId: 'user-1' },
    } as any,
    {} as any,
    next,
  );

  return next;
}

describe('module.middleware', () => {
  it('allows invoice routes when the tenant enables the invoices child module', () => {
    const next = runModuleGuard('/invoices?limit=5', ['dashboard', 'invoices', 'payments']);

    expect(next).toHaveBeenCalledWith();
  });

  it('allows proposal routes when the tenant enables the quotes child module', () => {
    const next = runModuleGuard('/proposals?limit=5', ['dashboard', 'quotes', 'invoices']);

    expect(next).toHaveBeenCalledWith();
  });

  it('still blocks finance routes when neither finance nor a child module is enabled', () => {
    const next = runModuleGuard('/invoices?limit=5', ['dashboard', 'leads']);
    const error = next.mock.calls[0]?.[0];

    expect(error).toMatchObject({
      statusCode: 403,
      message: expect.stringContaining('finance'),
    });
  });
});
