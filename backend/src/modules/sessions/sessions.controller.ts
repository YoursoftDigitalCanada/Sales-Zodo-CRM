import { Request, Response, NextFunction } from 'express';
import { sendNoContent, sendSuccess } from '../../common/utils/responseFormatter';
import { sessionsService } from './sessions.service';
import { getRequestIp } from '../../common/utils/request-ip';

export class SessionsController {
  async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = await sessionsService.getUserSessions(req.user!.userId, {
        userAgent: req.headers['user-agent'],
        ipAddress: getRequestIp(req),
        sessionId: req.user?.sessionId,
      });

      sendSuccess(res, sessions);
    } catch (error) {
      next(error);
    }
  }

  async getCurrentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await sessionsService.getCurrentSessionStatus(req.user!.userId, req.user?.sessionId);
      sendSuccess(res, status);
    } catch (error) {
      next(error);
    }
  }

  async revoke(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await sessionsService.revokeSession(req.user!.userId, req.params.id);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const sessionsController = new SessionsController();
