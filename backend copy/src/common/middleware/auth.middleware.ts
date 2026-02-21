import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, DecodedToken } from '../utils/jwt';
import { UnauthorizedError } from '../errors/HttpErrors';
import { ErrorCodes } from '../errors/errorCodes';
import { prisma } from '../../config/database';
import { logger } from '../utils/logger';

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

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      tenantId: decoded.tenantId,
      employeeId: decoded.employeeId,
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
          tenantId: decoded.tenantId,
          employeeId: decoded.employeeId,
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