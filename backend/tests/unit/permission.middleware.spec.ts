jest.mock('../../src/common/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  requireAllPermissions,
  requireAnyPermission,
  requireAnyRole,
  requirePermission,
} from '../../src/common/middleware/permission.middleware';

describe('permission.middleware', () => {
  it('allows owner/admin-only handlers for owners', async () => {
    const middleware = requireAnyRole(['Owner', 'Admin']);
    const next = jest.fn();

    await middleware(
      {
        employee: {
          role: {
            name: 'Owner',
          },
        },
        user: {
          userId: 'user-1',
        },
      } as any,
      {} as any,
      next
    );

    expect(next).toHaveBeenCalledWith();
  });

  it('blocks users outside the allowed role list', async () => {
    const middleware = requireAnyRole(['Owner', 'Admin']);
    const next = jest.fn();

    await middleware(
      {
        employee: {
          role: {
            name: 'Sales',
          },
        },
        user: {
          userId: 'user-2',
        },
      } as any,
      {} as any,
      next
    );

    const error = next.mock.calls[0]?.[0];

    expect(error).toMatchObject({
      statusCode: 403,
      message: expect.stringContaining('Owner, Admin'),
    });
  });

  it('allows owners through permission checks even when legacy role permissions are missing', async () => {
    const middleware = requirePermission('files.create');
    const next = jest.fn();

    await middleware(
      {
        permissions: [],
        employee: { role: { name: 'Owner' } },
        user: { userId: 'user-1' },
      } as any,
      {} as any,
      next
    );

    expect(next).toHaveBeenCalledWith();
  });

  it('allows admins through any/all permission checks even when legacy role permissions are missing', async () => {
    const anyMiddleware = requireAnyPermission(['files.view', 'files.create']);
    const allMiddleware = requireAllPermissions(['files.view', 'files.create']);
    const anyNext = jest.fn();
    const allNext = jest.fn();
    const req = {
      permissions: [],
      employee: { role: { name: 'Admin' } },
      user: { userId: 'user-1' },
    } as any;

    await anyMiddleware(req, {} as any, anyNext);
    await allMiddleware(req, {} as any, allNext);

    expect(anyNext).toHaveBeenCalledWith();
    expect(allNext).toHaveBeenCalledWith();
  });

  it('still blocks non-admin users that do not have the required permission', async () => {
    const middleware = requirePermission('files.create');
    const next = jest.fn();

    await middleware(
      {
        permissions: ['files.view'],
        employee: { role: { name: 'Sales' } },
        user: { userId: 'user-2' },
      } as any,
      {} as any,
      next
    );

    const error = next.mock.calls[0]?.[0];

    expect(error).toMatchObject({
      statusCode: 403,
      message: expect.stringContaining('files.create'),
    });
  });

  it('allows feature permissions through backward-compatible aliases', async () => {
    const middleware = requirePermission('meetings.view');
    const next = jest.fn();

    await middleware(
      {
        permissions: ['calendar.view'],
        employee: { role: { name: 'Sales' } },
        user: { userId: 'user-3' },
      } as any,
      {} as any,
      next
    );

    expect(next).toHaveBeenCalledWith();
  });

  it('uses aliases for any/all permission checks', async () => {
    const anyMiddleware = requireAnyPermission(['payments.view', 'reports.view']);
    const allMiddleware = requireAllPermissions(['payments.view', 'reports.view']);
    const anyNext = jest.fn();
    const allNext = jest.fn();
    const req = {
      permissions: ['invoices.view', 'analytics.view'],
      employee: { role: { name: 'Sales' } },
      user: { userId: 'user-4' },
    } as any;

    await anyMiddleware(req, {} as any, anyNext);
    await allMiddleware(req, {} as any, allNext);

    expect(anyNext).toHaveBeenCalledWith();
    expect(allNext).toHaveBeenCalledWith();
  });
});
