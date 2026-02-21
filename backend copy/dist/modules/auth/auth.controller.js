"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const auth_service_1 = require("./auth.service");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class AuthController {
    /**
     * POST /auth/login
     */
    async login(req, res, next) {
        try {
            const input = req.body;
            const metadata = {
                userAgent: req.headers['user-agent'],
                ipAddress: req.ip || req.socket.remoteAddress,
            };
            const result = await auth_service_1.authService.login(input, metadata);
            (0, responseFormatter_1.sendSuccess)(res, result, 'Login successful');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /auth/register
     */
    async register(req, res, next) {
        try {
            const input = req.body;
            const result = await auth_service_1.authService.register(input);
            (0, responseFormatter_1.sendCreated)(res, result, 'Registration successful');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /auth/refresh
     */
    async refresh(req, res, next) {
        try {
            const { refreshToken } = req.body;
            const metadata = {
                userAgent: req.headers['user-agent'],
                ipAddress: req.ip || req.socket.remoteAddress,
            };
            const result = await auth_service_1.authService.refreshToken(refreshToken, metadata);
            (0, responseFormatter_1.sendSuccess)(res, result, 'Token refreshed successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /auth/logout
     */
    async logout(req, res, next) {
        try {
            const { refreshToken } = req.body;
            await auth_service_1.authService.logout(refreshToken);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /auth/logout-all
     */
    async logoutAll(req, res, next) {
        try {
            const userId = req.user.userId;
            await auth_service_1.authService.logoutAll(userId);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /auth/change-password
     */
    async changePassword(req, res, next) {
        try {
            const userId = req.user.userId;
            const input = req.body;
            await auth_service_1.authService.changePassword(userId, input);
            (0, responseFormatter_1.sendSuccess)(res, null, 'Password changed successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /auth/profile
     */
    async getProfile(req, res, next) {
        try {
            const { userId, tenantId } = req.user;
            const result = await auth_service_1.authService.getProfile(userId, tenantId);
            (0, responseFormatter_1.sendSuccess)(res, result);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /auth/tenants
     */
    async getTenants(req, res, next) {
        try {
            const userId = req.user.userId;
            const result = await auth_service_1.authService.getUserTenants(userId);
            (0, responseFormatter_1.sendSuccess)(res, result);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /auth/switch-tenant
     */
    async switchTenant(req, res, next) {
        try {
            const userId = req.user.userId;
            const { tenantId } = req.body;
            const metadata = {
                userAgent: req.headers['user-agent'],
                ipAddress: req.ip || req.socket.remoteAddress,
            };
            const result = await auth_service_1.authService.switchTenant(userId, tenantId, metadata);
            (0, responseFormatter_1.sendSuccess)(res, result, 'Tenant switched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /auth/forgot-password
     */
    async forgotPassword(req, res, next) {
        try {
            const { email } = req.body;
            await auth_service_1.authService.forgotPassword(email);
            // Always return success to prevent email enumeration
            (0, responseFormatter_1.sendSuccess)(res, null, 'If an account exists, a password reset email has been sent');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /auth/reset-password
     */
    async resetPassword(req, res, next) {
        try {
            const { token, password } = req.body;
            await auth_service_1.authService.resetPassword(token, password);
            (0, responseFormatter_1.sendSuccess)(res, null, 'Password reset successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /auth/verify-email
     */
    async verifyEmail(req, res, next) {
        try {
            const { token } = req.body;
            await auth_service_1.authService.verifyEmail(token);
            (0, responseFormatter_1.sendSuccess)(res, null, 'Email verified successfully');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
//# sourceMappingURL=auth.controller.js.map