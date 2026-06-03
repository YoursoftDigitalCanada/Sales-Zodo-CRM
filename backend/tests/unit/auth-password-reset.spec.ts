const mockFindUserById = jest.fn();
const mockUserUpdate = jest.fn();
const mockEmployeeUpdateMany = jest.fn();
const mockRefreshTokenUpdateMany = jest.fn();
const mockTransaction = jest.fn();
const mockVerifyPasswordResetToken = jest.fn();
const mockHashPassword = jest.fn();

jest.mock('../../src/modules/auth/auth.repository', () => ({
  authRepository: {
    findUserById: mockFindUserById,
  },
}));

jest.mock('../../src/config/database', () => ({
  prisma: {
    user: { update: mockUserUpdate },
    employee: { updateMany: mockEmployeeUpdateMany },
    refreshToken: { updateMany: mockRefreshTokenUpdateMany },
    $transaction: mockTransaction,
  },
}));

jest.mock('../../src/common/utils/jwt', () => ({
  generateAccessToken: jest.fn(),
  generatePasswordResetToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  verifyPasswordResetToken: mockVerifyPasswordResetToken,
  verifyRefreshToken: jest.fn(),
  getTokenExpiry: jest.fn(),
}));

jest.mock('../../src/common/utils/password', () => ({
  hashPassword: mockHashPassword,
  comparePassword: jest.fn(),
}));

jest.mock('../../src/common/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../src/modules/settings/settings.manager', () => ({
  settingsManager: {
    assertIpAllowed: jest.fn(),
  },
}));

jest.mock('../../src/common/services/tenant-mailer.service', () => ({
  tenantMailerService: {
    sendSignupEmail: jest.fn(),
  },
}));

import { AuthService } from '../../src/modules/auth/auth.service';

describe('AuthService password reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.mockResolvedValue(undefined);
    mockUserUpdate.mockReturnValue(Promise.resolve({}));
    mockEmployeeUpdateMany.mockReturnValue(Promise.resolve({ count: 1 }));
    mockRefreshTokenUpdateMany.mockReturnValue(Promise.resolve({ count: 0 }));
    mockHashPassword.mockResolvedValue('hashed-new-password');
  });

  it('activates the user and employee membership after invite password setup', async () => {
    const service = new AuthService();
    const passwordChangedAt = null;

    mockVerifyPasswordResetToken.mockReturnValue({
      userId: 'user-1',
      email: 'new.user@example.com',
      passwordChangedAt,
      type: 'password-reset',
    });
    mockFindUserById.mockResolvedValue({
      id: 'user-1',
      email: 'new.user@example.com',
      passwordChangedAt,
      emailVerifiedAt: null,
    });

    const result = await service.resetPassword('valid-token', 'StrongPass1!');

    expect(result).toEqual({ email: 'new.user@example.com' });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        passwordHash: 'hashed-new-password',
        emailVerified: true,
        status: 'ACTIVE',
      }),
    });
    expect(mockEmployeeUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: {
        isActive: true,
        employmentStatus: 'active',
      },
    });
    expect(mockRefreshTokenUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date), revokedReason: 'PASSWORD_RESET' },
    });
  });
});
