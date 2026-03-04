import { Request, Response, NextFunction } from 'express';
import { leadSourcesService } from './lead-sources.service';
import { UnauthorizedError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

export class LeadSourcesController {
  /**
   * Extract tenant ID from trusted request context only.
   * Never read tenant IDs from ad-hoc request fields.
   */
  private getTenantId(req: Request): string {
    const tenantId = req.context?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedError(
        'Tenant context required. Your account is not associated with any organization.',
        ErrorCodes.TENANT_NOT_FOUND
      );
    }
    return tenantId;
  }

  /** POST / — Create lead source */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = this.getTenantId(req);
      const data = req.body;
      const source = await leadSourcesService.create(tenantId, data);
      res.status(201).json({ success: true, data: source });
    } catch (error) { next(error); }
  }

  /** GET / — List lead sources */
  async getMany(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = this.getTenantId(req);
      const query = req.query;
      const result = await leadSourcesService.getMany(tenantId, query as any);
      res.json({ success: true, ...result });
    } catch (error: any) {
      // If Prisma fails due to missing columns, return empty list gracefully
      console.error('[LeadSources] getMany error:', error?.message || error);
      if (error?.code === 'P2022' || error?.message?.includes('column') || error?.message?.includes('Unknown arg')) {
        return res.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
      }
      next(error);
    }
  }

  /** GET /active — Active sources for dropdowns */
  async getActive(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = this.getTenantId(req);
      const sources = await leadSourcesService.getActive(tenantId);
      res.json({ success: true, data: sources });
    } catch (error) { next(error); }
  }

  /** GET /types — Available source types */
  async getTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const types = leadSourcesService.getSourceTypes();
      res.json({ success: true, data: types });
    } catch (error) { next(error); }
  }

  /** GET /stats/summary — Summary stats */
  async getStatsSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = this.getTenantId(req);
      const summary = await leadSourcesService.getStatsSummary(tenantId);
      res.json({ success: true, data: summary });
    } catch (error: any) {
      console.error('[LeadSources] getStatsSummary error:', error?.message || error);
      // Return safe defaults only for schema mismatch; surface all other errors.
      if (error?.code === 'P2022' || error?.message?.includes('column') || error?.message?.includes('Unknown arg')) {
        return res.json({ success: true, data: { totalSources: 0, activeSources: 0, totalLeads: 0, convertedLeads: 0, totalRevenue: 0, avgConversionRate: 0 } });
      }
      next(error);
    }
  }

  /** GET /statistics — Statistics per source */
  async getStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = this.getTenantId(req);
      const statistics = await leadSourcesService.getStatistics(tenantId);
      res.json({ success: true, data: statistics });
    } catch (error: any) {
      console.error('[LeadSources] getStatistics error:', error?.message || error);
      if (error?.code === 'P2022' || error?.message?.includes('column') || error?.message?.includes('Unknown arg')) {
        return res.json({ success: true, data: [] });
      }
      next(error);
    }
  }

  /** GET /:id — Get source details */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = this.getTenantId(req);
      const { id } = req.params;
      const source = await leadSourcesService.getById(id, tenantId);
      res.json({ success: true, data: source });
    } catch (error) { next(error); }
  }

  /** PUT /:id — Update source */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = this.getTenantId(req);
      const { id } = req.params;
      const data = req.body;
      const source = await leadSourcesService.update(id, tenantId, data);
      res.json({ success: true, data: source });
    } catch (error) { next(error); }
  }

  /** DELETE /:id — Delete source */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = this.getTenantId(req);
      const { id } = req.params;
      await leadSourcesService.delete(id, tenantId);
      res.json({ success: true, message: 'Lead source deleted' });
    } catch (error) { next(error); }
  }

  /** POST /:id/pause — Pause source */
  async pause(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = this.getTenantId(req);
      const { id } = req.params;
      const source = await leadSourcesService.pause(id, tenantId);
      res.json({ success: true, data: source });
    } catch (error) { next(error); }
  }

  /** POST /:id/resume — Resume source */
  async resume(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = this.getTenantId(req);
      const { id } = req.params;
      const source = await leadSourcesService.resume(id, tenantId);
      res.json({ success: true, data: source });
    } catch (error) { next(error); }
  }

  /** POST /:id/test — Test connection */
  async testConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = this.getTenantId(req);
      const { id } = req.params;
      const result = await leadSourcesService.testConnection(id, tenantId);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  /** POST /:id/webhook/regenerate — Regenerate webhook secret */
  async regenerateWebhookSecret(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = this.getTenantId(req);
      const { id } = req.params;
      const result = await leadSourcesService.regenerateWebhookSecret(id, tenantId);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  /** GET /:id/logs — Get webhook logs */
  async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = this.getTenantId(req);
      const { id } = req.params;
      const query = req.query as any;
      const result = await leadSourcesService.getLogs(id, tenantId, query);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('[LeadSources] getLogs error:', error?.message || error);
      // Return empty logs only when schema is missing; otherwise surface errors.
      if (error?.code === 'P2021' || error?.code === 'P2022' || error?.message?.includes('table') || error?.message?.includes('column') || error?.message?.includes('Unknown arg')) {
        return res.json({ success: true, data: [], total: 0, page: 1, limit: 20 });
      }
      next(error);
    }
  }
}

export const leadSourcesController = new LeadSourcesController();
