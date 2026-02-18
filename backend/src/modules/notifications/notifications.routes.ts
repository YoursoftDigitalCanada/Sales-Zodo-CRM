import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import {
  notificationQuerySchema,
  markReadSchema,
  notificationIdSchema,
} from './notifications.validators';

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
  validate(notificationIdSchema),
  notificationsController.deleteNotification.bind(notificationsController)
);

export default router;