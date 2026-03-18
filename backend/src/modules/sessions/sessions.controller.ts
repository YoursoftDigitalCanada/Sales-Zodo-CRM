import { Request, Response, NextFunction } from 'express';
import { sendNoContent, sendSuccess } from '../../common/utils/responseFormatter';
import { sessionsService } from './sessions.service';

export class SessionsController {
  async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = await sessionsService.getUserSessions(req.user!.userId, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.socket.remoteAddress,
      });

      sendSuccess(res, sessions);
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
