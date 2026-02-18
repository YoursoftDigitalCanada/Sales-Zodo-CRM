import { Request, Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service';
import { sendSuccess, sendNoContent } from '../../common/utils/responseFormatter';

export class NotificationsController {
  /**
   * GET /notifications
   */
  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.user!.tenantId!;

      const result = await notificationsService.getNotifications(userId, tenantId, {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
        type: req.query.type as any,
      });

      sendSuccess(res, result.data, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /notifications/counts
   */
  async getCounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.user!.tenantId!;

      const counts = await notificationsService.getCounts(userId, tenantId);

      sendSuccess(res, counts);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /notifications/:id
   */
  async getNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.user!.tenantId!;
      const { id } = req.params;

      const notification = await notificationsService.getNotification(id, userId, tenantId);

      sendSuccess(res, notification);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /notifications/:id/read
   */
  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.user!.tenantId!;
      const { id } = req.params;

      await notificationsService.markAsRead(id, userId, tenantId);

      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /notifications/read
   */
  async markManyAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.user!.tenantId!;
      const { notificationIds } = req.body;

      const count = await notificationsService.markManyAsRead(notificationIds, userId, tenantId);

      sendSuccess(res, { markedCount: count }, 'Notifications marked as read');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /notifications/read-all
   */
  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.user!.tenantId!;

      const count = await notificationsService.markAllAsRead(userId, tenantId);

      sendSuccess(res, { markedCount: count }, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /notifications/:id
   */
  async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.user!.tenantId!;
      const { id } = req.params;

      await notificationsService.delete(id, userId, tenantId);

      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const notificationsController = new NotificationsController();