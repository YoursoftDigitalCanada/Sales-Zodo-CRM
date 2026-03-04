import { Request, Response, NextFunction } from 'express';
import { leadSourcesService } from './lead-sources.service';

export class LeadSourcesController {
  /** POST / — Create lead source */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId;
      const data = req.body;
      const source = await leadSourcesService.create(tenantId, data);
      res.status(201).json({ success: true, data: source });
    } catch (error) { next(error); }
  }

  /** GET / — List lead sources */
  async getMany(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId;
      const query = req.query;
      const result = await leadSourcesService.getMany(tenantId, query as any);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  /** GET /active — Active sources for dropdowns */
  async getActive(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId;
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
      const tenantId = (req as any).tenantId;
      const summary = await leadSourcesService.getStatsSummary(tenantId);
      res.json({ success: true, data: summary });
    } catch (error) { next(error); }
  }

  /** GET /statistics — Statistics per source */
  async getStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId;
      const statistics = await leadSourcesService.getStatistics(tenantId);
      res.json({ success: true, data: statistics });
    } catch (error) { next(error); }
  }

  /** GET /:id — Get source details */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId;
      const { id } = req.params;
      const source = await leadSourcesService.getById(id, tenantId);
      res.json({ success: true, data: source });
    } catch (error) { next(error); }
  }

  /** PUT /:id — Update source */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId;
      const { id } = req.params;
      const data = req.body;
      const source = await leadSourcesService.update(id, tenantId, data);
      res.json({ success: true, data: source });
    } catch (error) { next(error); }
  }

  /** DELETE /:id — Delete source */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId;
      const { id } = req.params;
      await leadSourcesService.delete(id, tenantId);
      res.json({ success: true, message: 'Lead source deleted' });
    } catch (error) { next(error); }
  }

  /** POST /:id/pause — Pause source */
  async pause(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId;
      const { id } = req.params;
      const source = await leadSourcesService.pause(id, tenantId);
      res.json({ success: true, data: source });
    } catch (error) { next(error); }
  }

  /** POST /:id/resume — Resume source */
  async resume(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId;
      const { id } = req.params;
      const source = await leadSourcesService.resume(id, tenantId);
      res.json({ success: true, data: source });
    } catch (error) { next(error); }
  }

  /** POST /:id/test — Test connection */
  async testConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId;
      const { id } = req.params;
      const result = await leadSourcesService.testConnection(id, tenantId);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  /** POST /:id/webhook/regenerate — Regenerate webhook secret */
  async regenerateWebhookSecret(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId;
      const { id } = req.params;
      const result = await leadSourcesService.regenerateWebhookSecret(id, tenantId);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  /** GET /:id/logs — Get webhook logs */
  async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId;
      const { id } = req.params;
      const query = req.query as any;
      const result = await leadSourcesService.getLogs(id, tenantId, query);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }
}

export const leadSourcesController = new LeadSourcesController();