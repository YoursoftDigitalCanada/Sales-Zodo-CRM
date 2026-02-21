import { Request, Response, NextFunction } from 'express';
export declare class NotificationsController {
    /**
     * GET /notifications
     */
    getNotifications(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /notifications/counts
     */
    getCounts(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /notifications/:id
     */
    getNotification(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /notifications/:id/read
     */
    markAsRead(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /notifications/read
     */
    markManyAsRead(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /notifications/read-all
     */
    markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * DELETE /notifications/:id
     */
    deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const notificationsController: NotificationsController;
//# sourceMappingURL=notifications.controller.d.ts.map