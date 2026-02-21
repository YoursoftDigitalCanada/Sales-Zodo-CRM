"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const validate_middleware_1 = require("../../common/middleware/validate.middleware");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const rateLimiter_middleware_1 = require("../../common/middleware/rateLimiter.middleware");
const auth_validators_1 = require("./auth.validators");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', (0, rateLimiter_middleware_1.rateLimiter)({ windowMs: 15 * 60 * 1000, max: 5 }), // 5 attempts per 15 minutes
(0, validate_middleware_1.validate)(auth_validators_1.loginSchema), auth_controller_1.authController.login.bind(auth_controller_1.authController));
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register new user and tenant
 *     tags: [Auth]
 */
router.post('/register', (0, rateLimiter_middleware_1.rateLimiter)({ windowMs: 60 * 60 * 1000, max: 3 }), // 3 registrations per hour
(0, validate_middleware_1.validate)(auth_validators_1.registerSchema), auth_controller_1.authController.register.bind(auth_controller_1.authController));
/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 */
router.post('/refresh', (0, rateLimiter_middleware_1.rateLimiter)({ windowMs: 15 * 60 * 1000, max: 30 }), (0, validate_middleware_1.validate)(auth_validators_1.refreshTokenSchema), auth_controller_1.authController.refresh.bind(auth_controller_1.authController));
/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 */
router.post('/logout', (0, validate_middleware_1.validate)(auth_validators_1.refreshTokenSchema), auth_controller_1.authController.logout.bind(auth_controller_1.authController));
/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.post('/logout-all', auth_middleware_1.authenticate, auth_controller_1.authController.logoutAll.bind(auth_controller_1.authController));
/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.post('/change-password', auth_middleware_1.authenticate, (0, validate_middleware_1.validate)(auth_validators_1.changePasswordSchema), auth_controller_1.authController.changePassword.bind(auth_controller_1.authController));
/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.get('/profile', auth_middleware_1.authenticate, auth_controller_1.authController.getProfile.bind(auth_controller_1.authController));
/**
 * @swagger
 * /auth/tenants:
 *   get:
 *     summary: Get user's tenants
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.get('/tenants', auth_middleware_1.authenticate, auth_controller_1.authController.getTenants.bind(auth_controller_1.authController));
/**
 * @swagger
 * /auth/switch-tenant:
 *   post:
 *     summary: Switch to different tenant
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.post('/switch-tenant', auth_middleware_1.authenticate, auth_controller_1.authController.switchTenant.bind(auth_controller_1.authController));
/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 */
router.post('/forgot-password', (0, rateLimiter_middleware_1.rateLimiter)({ windowMs: 60 * 60 * 1000, max: 3 }), (0, validate_middleware_1.validate)(auth_validators_1.forgotPasswordSchema), auth_controller_1.authController.forgotPassword.bind(auth_controller_1.authController));
/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Auth]
 */
router.post('/reset-password', (0, rateLimiter_middleware_1.rateLimiter)({ windowMs: 60 * 60 * 1000, max: 3 }), (0, validate_middleware_1.validate)(auth_validators_1.resetPasswordSchema), auth_controller_1.authController.resetPassword.bind(auth_controller_1.authController));
/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     summary: Verify email address
 *     tags: [Auth]
 */
router.post('/verify-email', auth_controller_1.authController.verifyEmail.bind(auth_controller_1.authController));
exports.default = router;
//# sourceMappingURL=auth.routes.js.map