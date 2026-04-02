import { AsyncLocalStorage } from 'async_hooks';
import type { Request, Response, NextFunction } from 'express';
import type { AuditContext } from '../../modules/audit/audit.dto';

const contextStore = new AsyncLocalStorage<AuditContext>();

export const requestContextStore = {
  run(req: Request, next: NextFunction): void {
    const context: AuditContext = {
      userId: req.context?.userId || req.user?.userId,
      tenantId: req.context?.tenantId || req.user?.tenantId || '',
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      requestMethod: req.method,
      requestPath: req.originalUrl || req.path,
    };

    contextStore.run(context, () => next());
  },
  get(): AuditContext | undefined {
    return contextStore.getStore();
  },
};
