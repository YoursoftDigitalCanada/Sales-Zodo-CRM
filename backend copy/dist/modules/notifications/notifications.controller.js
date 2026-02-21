"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsController = exports.NotificationsController = void 0;
const notifications_service_1 = require("./notifications.service");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class NotificationsController {
    /**
     * GET /notifications
     */
    async getNotifications(req, res, next) {
        try {
            const userId = req.user.userId;
            const tenantId = req.user.tenantId;
            const result = await notifications_service_1.notificationsService.getNotifications(userId, tenantId, {
                page: req.query.page ? parseInt(req.query.page, 10) : undefined,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
                isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
                type: req.query.type,
            });
            (0, responseFormatter_1.sendSuccess)(res, result.data, undefined, 200, result.meta);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /notifications/counts
     */
    async getCounts(req, res, next) {
        try {
            const userId = req.user.userId;
            const tenantId = req.user.tenantId;
            const counts = await notifications_service_1.notificationsService.getCounts(userId, tenantId);
            (0, responseFormatter_1.sendSuccess)(res, counts);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /notifications/:id
     */
    async getNotification(req, res, next) {
        try {
            const userId = req.user.userId;
            const tenantId = req.user.tenantId;
            const { id } = req.params;
            const notification = await notifications_service_1.notificationsService.getNotification(id, userId, tenantId);
            (0, responseFormatter_1.sendSuccess)(res, notification);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /notifications/:id/read
     */
    async markAsRead(req, res, next) {
        try {
            const userId = req.user.userId;
            const tenantId = req.user.tenantId;
            const { id } = req.params;
            await notifications_service_1.notificationsService.markAsRead(id, userId, tenantId);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /notifications/read
     */
    async markManyAsRead(req, res, next) {
        try {
            const userId = req.user.userId;
            const tenantId = req.user.tenantId;
            const { notificationIds } = req.body;
            const count = await notifications_service_1.notificationsService.markManyAsRead(notificationIds, userId, tenantId);
            (0, responseFormatter_1.sendSuccess)(res, { markedCount: count }, 'Notifications marked as read');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /notifications/read-all
     */
    async markAllAsRead(req, res, next) {
        try {
            const userId = req.user.userId;
            const tenantId = req.user.tenantId;
            const count = await notifications_service_1.notificationsService.markAllAsRead(userId, tenantId);
            (0, responseFormatter_1.sendSuccess)(res, { markedCount: count }, 'All notifications marked as read');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * DELETE /notifications/:id
     */
    async deleteNotification(req, res, next) {
        try {
            const userId = req.user.userId;
            const tenantId = req.user.tenantId;
            const { id } = req.params;
            await notifications_service_1.notificationsService.delete(id, userId, tenantId);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.NotificationsController = NotificationsController;
exports.notificationsController = new NotificationsController();
//# sourceMappingURL=notifications.controller.js.map