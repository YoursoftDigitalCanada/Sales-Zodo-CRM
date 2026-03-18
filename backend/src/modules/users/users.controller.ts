import { Request, Response, NextFunction } from 'express';
import { AuditAction } from '@prisma/client';
import { sendCreated, sendNoContent, sendSuccess } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';
import { auditService } from '../audit/audit.service';
import { usersService } from './users.service';

export class UsersController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.create(sanitizeBody(req.body), req.context.tenantId);
      await auditService.logWithContext(req, AuditAction.CREATE, 'users', `Created user ${user.email}`);
      sendCreated(res, user, 'User created successfully');
    } catch (error) {
      next(error);
    }
  }

  async invite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.invite(sanitizeBody(req.body), req.context.tenantId);
      await auditService.logWithContext(req, AuditAction.CREATE, 'users', `Invited user ${result.user.email}`);
      sendCreated(res, result, 'User invited successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.getMany(req.query as any, req.context.tenantId);
      sendSuccess(res, result.data, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.getById(req.params.id, req.context.tenantId);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.update(req.params.id, req.context.tenantId, sanitizeBody(req.body));
      await auditService.logWithContext(req, AuditAction.UPDATE, 'users', `Updated user ${user.email}`);
      sendSuccess(res, user, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.updateStatus(req.params.id, req.context.tenantId, req.body.status);
      await auditService.logWithContext(req, AuditAction.UPDATE, 'users', `Updated user status for ${user.email}`);
      sendSuccess(res, user, 'User status updated');
    } catch (error) {
      next(error);
    }
  }

  async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.updateRole(req.params.id, req.context.tenantId, req.body.roleId);
      await auditService.logWithContext(req, AuditAction.PERMISSION_CHANGE, 'users', `Updated role for ${user.email}`);
      sendSuccess(res, user, 'User role updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await usersService.delete(req.params.id, req.context.tenantId);
      await auditService.logWithContext(req, AuditAction.DELETE, 'users', `Removed user ${req.params.id} from workspace`);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();
