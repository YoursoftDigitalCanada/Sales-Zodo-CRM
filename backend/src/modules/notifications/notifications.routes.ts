import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import {
  notificationQuerySchema,
  markReadSchema,
  notificationIdSchema,
} from './notifications.validators';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(loadEmployee);

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/',
  requirePermission(PERMISSIONS.NOTIFICATIONS_VIEW),
  validate(notificationQuerySchema),
  notificationsController.getNotifications.bind(notificationsController)
);

/**
 * @swagger
 * /notifications/counts:
 *   get:
 *     summary: Get notification counts
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/counts',
  requirePermission(PERMISSIONS.NOTIFICATIONS_VIEW),
  notificationsController.getCounts.bind(notificationsController)
);

/**
 * @swagger
 * /notifications/read:
 *   post:
 *     summary: Mark multiple notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/read',
  requirePermission(PERMISSIONS.NOTIFICATIONS_VIEW),
  validate(markReadSchema),
  notificationsController.markManyAsRead.bind(notificationsController)
);

/**
 * @swagger
 * /notifications/read-all:
 *   post:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/read-all',
  requirePermission(PERMISSIONS.NOTIFICATIONS_VIEW),
  notificationsController.markAllAsRead.bind(notificationsController)
);

/**
 * @swagger
 * /notifications/{id}:
 *   get:
 *     summary: Get notification by ID
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/:id',
  requirePermission(PERMISSIONS.NOTIFICATIONS_VIEW),
  validate(notificationIdSchema),
  notificationsController.getNotification.bind(notificationsController)
);

/**
 * @swagger
 * /notifications/{id}/read:
 *   post:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/:id/read',
  requirePermission(PERMISSIONS.NOTIFICATIONS_VIEW),
  validate(notificationIdSchema),
  notificationsController.markAsRead.bind(notificationsController)
);

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.NOTIFICATIONS_VIEW),
  validate(notificationIdSchema),
  notificationsController.deleteNotification.bind(notificationsController)
);

export default router;
