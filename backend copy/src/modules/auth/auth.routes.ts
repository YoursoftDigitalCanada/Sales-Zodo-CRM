import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../common/middleware/validate.middleware';
import { authenticate } from '../../common/middleware/auth.middleware';
import { rateLimiter } from '../../common/middleware/rateLimiter.middleware';
import { tenantMembershipGuard } from '../../common/middleware/tenant-membership.guard';
import { config } from '../../config';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validators';

const router = Router();

const loginRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: config.app.isDevelopment ? 50 : 5,
});

const registerRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000,
  max: config.app.isDevelopment ? 20 : 3,
});

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
router.post(
  '/login',
  loginRateLimiter,
  validate(loginSchema),
  authController.login.bind(authController)
);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register new user and tenant
 *     tags: [Auth]
 */
router.post(
  '/register',
  registerRateLimiter,
  validate(registerSchema),
  authController.register.bind(authController)
);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 */
router.post(
  '/refresh',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }),
  validate(refreshTokenSchema),
  authController.refresh.bind(authController)
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 */
router.post(
  '/logout',
  validate(refreshTokenSchema),
  authController.logout.bind(authController)
);

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/logout-all',
  authenticate,
  authController.logoutAll.bind(authController)
);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword.bind(authController)
);

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/profile',
  authenticate,
  authController.getProfile.bind(authController)
);

/**
 * @swagger
 * /auth/tenants:
 *   get:
 *     summary: Get user's tenants
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/tenants',
  authenticate,
  authController.getTenants.bind(authController)
);

/**
 * @swagger
 * /auth/switch-tenant/{tenantId}:
 *   post:
 *     summary: Switch to different tenant
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Target tenant UUID to switch to
 *     responses:
 *       200:
 *         description: Tenant switched, new JWT issued
 *       403:
 *         description: User is not a member of the target tenant
 */
router.post(
  '/switch-tenant/:tenantId',
  authenticate,
  tenantMembershipGuard('tenantId'),
  authController.switchTenant.bind(authController)
);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 */
router.post(
  '/forgot-password',
  rateLimiter({ windowMs: 60 * 60 * 1000, max: 3 }),
  validate(forgotPasswordSchema),
  authController.forgotPassword.bind(authController)
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Auth]
 */
router.post(
  '/reset-password',
  rateLimiter({ windowMs: 60 * 60 * 1000, max: 3 }),
  validate(resetPasswordSchema),
  authController.resetPassword.bind(authController)
);

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     summary: Verify email address
 *     tags: [Auth]
 */
router.post(
  '/verify-email',
  authController.verifyEmail.bind(authController)
);

export default router;
