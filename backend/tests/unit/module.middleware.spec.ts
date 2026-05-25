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
  beforeEach(() => {
    delete process.env.PRODUCT_VARIANT;
    delete process.env.PUBLIC_PRODUCT_VARIANT;
    delete process.env.VITE_PUBLIC_PRODUCT_VARIANT;
    delete process.env.ENABLE_LEGACY_ROOFING_WORKFLOWS;
  });

  it('allows invoice routes when the tenant enables the invoices child module', () => {
    const next = runModuleGuard('/invoices?limit=5', ['dashboard', 'invoices', 'payments']);

    expect(next).toHaveBeenCalledWith();
  });

  it('allows proposal routes when the tenant enables the quotes child module', () => {
    const next = runModuleGuard('/proposals?limit=5', ['dashboard', 'quotes', 'invoices']);

    expect(next).toHaveBeenCalledWith();
  });

  it('allows document routes when the tenant enables the legacy documents module slug', () => {
    const next = runModuleGuard('/documents?limit=100', ['dashboard', 'documents']);

    expect(next).toHaveBeenCalledWith();
  });

  it('allows document folder routes when the tenant enables the legacy documents module slug', () => {
    const next = runModuleGuard('/documents/folders?limit=100', ['dashboard', 'documents']);

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

  it('blocks stale roof-estimator access in Sales CRM deployments even if the tenant setting still exists', () => {
    const next = runModuleGuard('/roof-estimator', ['dashboard', 'roof-estimator']);
    const error = next.mock.calls[0]?.[0];

    expect(error).toMatchObject({
      statusCode: 403,
      code: 'MODULE_DISABLED',
      message: expect.stringContaining('deployment'),
    });
  });

  it('allows roof-estimator only for explicit roofing deployments with the tenant module enabled', () => {
    process.env.PRODUCT_VARIANT = 'roofing';
    const next = runModuleGuard('/roof-estimator', ['dashboard', 'roof-estimator']);

    expect(next).toHaveBeenCalledWith();
  });
});
