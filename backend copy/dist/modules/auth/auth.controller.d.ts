import { Request, Response, NextFunction } from 'express';
export declare class AuthController {
    /**
     * POST /auth/login
     */
    login(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /auth/register
     */
    register(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /auth/refresh
     */
    refresh(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /auth/logout
     */
    logout(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /auth/logout-all
     */
    logoutAll(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /auth/change-password
     */
    changePassword(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /auth/profile
     */
    getProfile(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /auth/tenants
     */
    getTenants(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /auth/switch-tenant
     */
    switchTenant(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /auth/forgot-password
     */
    forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /auth/reset-password
     */
    resetPassword(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /auth/verify-email
     */
    verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const authController: AuthController;
//# sourceMappingURL=auth.controller.d.ts.map