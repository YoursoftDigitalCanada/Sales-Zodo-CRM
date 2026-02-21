"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notifications_controller_1 = require("./notifications.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_middleware_1 = require("../../common/middleware/validate.middleware");
const notifications_validators_1 = require("./notifications.validators");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
router.use(auth_middleware_1.loadEmployee);
/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', (0, validate_middleware_1.validate)(notifications_validators_1.notificationQuerySchema), notifications_controller_1.notificationsController.getNotifications.bind(notifications_controller_1.notificationsController));
/**
 * @swagger
 * /notifications/counts:
 *   get:
 *     summary: Get notification counts
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.get('/counts', notifications_controller_1.notificationsController.getCounts.bind(notifications_controller_1.notificationsController));
/**
 * @swagger
 * /notifications/read:
 *   post:
 *     summary: Mark multiple notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.post('/read', (0, validate_middleware_1.validate)(notifications_validators_1.markReadSchema), notifications_controller_1.notificationsController.markManyAsRead.bind(notifications_controller_1.notificationsController));
/**
 * @swagger
 * /notifications/read-all:
 *   post:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.post('/read-all', notifications_controller_1.notificationsController.markAllAsRead.bind(notifications_controller_1.notificationsController));
/**
 * @swagger
 * /notifications/{id}:
 *   get:
 *     summary: Get notification by ID
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', (0, validate_middleware_1.validate)(notifications_validators_1.notificationIdSchema), notifications_controller_1.notificationsController.getNotification.bind(notifications_controller_1.notificationsController));
/**
 * @swagger
 * /notifications/{id}/read:
 *   post:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/read', (0, validate_middleware_1.validate)(notifications_validators_1.notificationIdSchema), notifications_controller_1.notificationsController.markAsRead.bind(notifications_controller_1.notificationsController));
/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', (0, validate_middleware_1.validate)(notifications_validators_1.notificationIdSchema), notifications_controller_1.notificationsController.deleteNotification.bind(notifications_controller_1.notificationsController));
exports.default = router;
//# sourceMappingURL=notifications.routes.js.map