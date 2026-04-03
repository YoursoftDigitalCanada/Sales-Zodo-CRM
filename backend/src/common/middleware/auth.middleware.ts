import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, DecodedToken } from '../utils/jwt';
import { UnauthorizedError } from '../errors/HttpErrors';
import { ErrorCodes } from '../errors/errorCodes';
import { prisma } from '../../config/database';
import { logger } from '../utils/logger';
import { authManager } from '../../modules/auth/auth.manager';
import { settingsManager } from '../../modules/settings/settings.manager';

/**
 * Authentication middleware
 * Verifies JWT access token and attaches user info to request
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError(
        'No authorization header provided',
        ErrorCodes.AUTH_TOKEN_INVALID
      );
    }

    // Check Bearer format
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError(
        'Invalid authorization header format. Use: Bearer <token>',
        ErrorCodes.AUTH_TOKEN_INVALID
      );
    }

    const token = parts[1];

    // Verify token
    let decoded: DecodedToken;

    try {
      decoded = verifyAccessToken(token);
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError(
          'Access token has expired',
          ErrorCodes.AUTH_TOKEN_EXPIRED
        );
      }

      throw new UnauthorizedError(
        'Invalid access token',
        ErrorCodes.AUTH_TOKEN_INVALID
      );
    }

    // Verify token type
    if (decoded.type !== 'access') {
      throw new UnauthorizedError(
        'Invalid token type',
        ErrorCodes.AUTH_TOKEN_INVALID
      );
    }

    if (decoded.sessionId) {
      const session = await authManager.getSessionById(decoded.sessionId);

      if (!session || session.userId !== decoded.userId) {
        throw new UnauthorizedError(
          'Session not found. Please log in again.',
          ErrorCodes.AUTH_TOKEN_INVALID
        );
      }

      if (session.revokedAt) {
        throw new UnauthorizedError(
          'Your session has been revoked. Please log in again.',
          ErrorCodes.AUTH_TOKEN_INVALID
        );
      }

      if (session.expiresAt <= new Date()) {
        await authRepositorySafeRevoke(decoded.sessionId, 'SESSION_TIMEOUT');
        throw new UnauthorizedError(
          'Your session has expired. Please log in again.',
          ErrorCodes.AUTH_TOKEN_EXPIRED
        );
      }

      if (session.forceLogoutAt && session.forceLogoutAt <= new Date()) {
        await authRepositorySafeRevoke(decoded.sessionId, session.revokedReason || 'REPLACED_BY_NEW_LOGIN');
        throw new UnauthorizedError(
          'This device was signed out because your account was used on another device.',
          ErrorCodes.AUTH_TOKEN_INVALID
        );
      }

      if (decoded.tenantId) {
        const timeoutMinutes = await settingsManager.getSessionTimeoutMinutes(decoded.tenantId);
        const shouldTouch = !session.lastSeenAt || Date.now() - session.lastSeenAt.getTime() > 60 * 1000;

        if (shouldTouch) {
          const nextExpiry = new Date(Date.now() + timeoutMinutes * 60 * 1000);
          await authManager.touchSession(decoded.sessionId, nextExpiry);
        }
      }
    }

    // Attach user context to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      tenantId: decoded.tenantId ?? '',
      employeeId: decoded.employeeId,
      sessionId: decoded.sessionId,
      role: decoded.role,
      requestId: req.requestId || '',
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication middleware
 * Does not fail if no token provided, but validates if present
 */
export async function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next();
    }

    const token = parts[1];

    try {
      const decoded = verifyAccessToken(token);

      if (decoded.type === 'access') {
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          tenantId: decoded.tenantId ?? '',
          employeeId: decoded.employeeId,
          sessionId: decoded.sessionId,
          role: decoded.role,
          requestId: req.requestId || '',
        };
      }
    } catch (error) {
      // Token invalid but optional, continue without user
      logger.debug('Optional auth token invalid', { error });
    }

    next();
  } catch (error) {
    next(error);
  }
}

async function authRepositorySafeRevoke(sessionId: string, reason: string): Promise<void> {
  try {
    const session = await authManager.getSessionById(sessionId);
    if (session && !session.revokedAt) {
      await prisma.refreshToken.update({
        where: { id: sessionId },
        data: {
          revokedAt: new Date(),
          revokedReason: reason,
        },
      });
    }
  } catch (error) {
    logger.warn('Failed to revoke expired session during auth check', {
      sessionId,
      reason,
      error,
    });
  }
}

/**
 * Load full employee data with permissions
 * Must be used after authenticate middleware
 */
export async function loadEmployee(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user?.employeeId || !req.user?.tenantId) {
      throw new UnauthorizedError(
        'Employee context not found',
        ErrorCodes.EMPLOYEE_NOT_FOUND
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: req.user.employeeId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        tenant: true,
        user: true,
      },
    });

    if (!employee) {
      throw new UnauthorizedError(
        'Employee not found',
        ErrorCodes.EMPLOYEE_NOT_FOUND
      );
    }

    if (!employee.isActive) {
      throw new UnauthorizedError(
        'Employee account is inactive',
        ErrorCodes.AUTH_USER_INACTIVE
      );
    }

    // Attach employee and permissions to request
    req.employee = employee as any;
    req.tenant = employee.tenant;
    req.permissions = employee.role.permissions.map((rp) => rp.permission.code);

    // Enrich user context with role name + requestId
    if (req.user) {
      req.user.role = employee.role.name;
      if (!req.user.requestId && req.requestId) {
        req.user.requestId = req.requestId;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Combined middleware: authenticate + loadEmployee
 */
export async function authenticateWithEmployee(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  await authenticate(req, res, async (err) => {
    if (err) return next(err);
    await loadEmployee(req, res, next);
  });
}
