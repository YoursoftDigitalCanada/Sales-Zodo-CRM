import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';
import { LoginInput, RegisterInput, ChangePasswordInput } from './auth.types';

export class AuthController {
  /**
   * POST /auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: LoginInput = req.body;
      const metadata = {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.socket.remoteAddress,
      };

      const result = await authService.login(input, metadata);

      sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/register
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: RegisterInput = req.body;

      const result = await authService.register(input);

      sendCreated(res, result, 'Registration successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/refresh
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const metadata = {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.socket.remoteAddress,
      };

      const result = await authService.refreshToken(refreshToken, metadata);

      sendSuccess(res, result, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/logout
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      await authService.logout(refreshToken);

      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/logout-all
   */
  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      await authService.logoutAll(userId);

      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/change-password
   */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const input: ChangePasswordInput = req.body;

      await authService.changePassword(userId, input);

      sendSuccess(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /auth/profile
   */
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, tenantId } = req.user!;

      const result = await authService.getProfile(userId, tenantId!);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /auth/tenants
   */
  async getTenants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const result = await authService.getUserTenants(userId);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/switch-tenant/:tenantId
   *
   * Reads the target tenant from the route param (never from body/query).
   * Verifies the user is an active employee of the target tenant via DB lookup.
   * Issues a new JWT scoped to the validated target tenant on success.
   * Returns 403 if the user has no active membership in the target tenant.
   */
  async switchTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const sourceTenantId = req.user!.tenantId || undefined;
      const targetTenantId = req.params.tenantId;

      const metadata = {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.socket.remoteAddress,
        sourceTenantId,
      };

      const result = await authService.switchTenant(userId, targetTenantId, metadata);

      sendSuccess(res, result, 'Tenant switched successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      await authService.forgotPassword(email);

      // Always return success to prevent email enumeration
      sendSuccess(res, null, 'If an account exists, a password reset email has been sent');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/reset-password
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body;

      await authService.resetPassword(token, password);

      sendSuccess(res, null, 'Password reset successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/verify-email
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;

      await authService.verifyEmail(token);

      sendSuccess(res, null, 'Email verified successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();