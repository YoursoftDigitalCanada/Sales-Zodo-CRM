import { Request, Response, NextFunction } from 'express';
import { leadSourcesService } from './lead-sources.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';

export class LeadSourcesController {
  /**
   * POST /lead-sources
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId!;
      const data = sanitizeBody(req.body);

      const source = await leadSourcesService.create(tenantId, data);

      sendCreated(res, source, 'Lead source created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /lead-sources
   */
  async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId!;
      const query = req.query as any;

      const result = await leadSourcesService.getMany(tenantId, query);

      sendSuccess(res, result.data, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /lead-sources/active
   */
  async getActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId!;

      const sources = await leadSourcesService.getActive(tenantId);

      sendSuccess(res, sources);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /lead-sources/statistics
   */
  async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId!;

      const statistics = await leadSourcesService.getStatistics(tenantId);

      sendSuccess(res, statistics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /lead-sources/:id
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId!;
      const { id } = req.params;

      const source = await leadSourcesService.getById(id, tenantId);

      sendSuccess(res, source);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /lead-sources/:id
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId!;
      const { id } = req.params;
      const data = sanitizeBody(req.body);

      const source = await leadSourcesService.update(id, tenantId, data);

      sendSuccess(res, source, 'Lead source updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /lead-sources/:id
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId!;
      const { id } = req.params;

      await leadSourcesService.delete(id, tenantId);

      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const leadSourcesController = new LeadSourcesController();