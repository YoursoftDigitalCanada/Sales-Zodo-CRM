jest.mock('../../src/common/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { requireAnyRole } from '../../src/common/middleware/permission.middleware';

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
});
