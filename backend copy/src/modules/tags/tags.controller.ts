import { Request, Response, NextFunction } from 'express';
import { tagsService } from './tags.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';

export class TagsController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId!;
      const tag = await tagsService.create(tenantId, req.body);
      sendCreated(res, tag, 'Tag created successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId!;
      const result = await tagsService.getMany(tenantId, req.query as any);
      sendSuccess(res, result.data, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId!;
      const tags = await tagsService.getAll(tenantId);
      sendSuccess(res, tags);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId!;
      const tag = await tagsService.getById(req.params.id, tenantId);
      sendSuccess(res, tag);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId!;
      const tag = await tagsService.update(req.params.id, tenantId, req.body);
      sendSuccess(res, tag, 'Tag updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId!;
      await tagsService.delete(req.params.id, tenantId);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const tagsController = new TagsController();