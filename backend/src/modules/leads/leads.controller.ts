import { Request, Response, NextFunction } from 'express';
import { leadsService } from './leads.service';
import { leadsManager } from './leads.manager';
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendPaginated,
} from '../../common/utils/responseFormatter';
import { CreateLeadDto, UpdateLeadDto } from './leads.dto';
import { sanitizeBody } from '../../common/utils/sanitize-body';

export class LeadsController {
  /**
   * POST /leads
   * Create a new lead
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.context.tenantId;
      const employeeId = req.user!.employeeId!;
      const data = sanitizeBody<CreateLeadDto>(req.body);

      const lead = await leadsManager.createLead(req, tenantId, data as CreateLeadDto, employeeId);

      sendCreated(res, lead, 'Lead created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /leads
   * Get leads with filters and pagination
   */
  async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.context.tenantId;
      const query = req.query as any;

      const result = await leadsService.getMany(tenantId, query);

      sendSuccess(res, result.data, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /leads/pipeline
   * Get leads grouped by status (pipeline view)
   */
  async getPipeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.context.tenantId;
      const { assignedToId, leadSourceId, temperature } = req.query as any;

      const pipeline = await leadsService.getPipeline(tenantId, {
        assignedToId,
        leadSourceId,
        temperature,
      });

      sendSuccess(res, pipeline);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /leads/statistics
   * Get lead statistics
   */
  async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.context.tenantId;
      const { startDate, endDate } = req.query as any;

      const statistics = await leadsService.getStatistics(
        tenantId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );

      sendSuccess(res, statistics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /leads/:id
   * Get lead by ID
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.context.tenantId;
      const { id } = req.params;

      const lead = await leadsService.getById(id, tenantId);

      sendSuccess(res, lead);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /leads/:id/activities
   * Get lead activities
   */
  async getActivities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.context.tenantId;
      const { id } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const activities = await leadsManager.getActivities(tenantId, id, limit);

      sendSuccess(res, activities);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /leads/:id
   * Update lead
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.context.tenantId;
      const employeeId = req.user!.employeeId!;
      const { id } = req.params;
      const data = sanitizeBody<UpdateLeadDto>(req.body);

      const lead = await leadsManager.updateLead(req, id, tenantId, data as UpdateLeadDto, employeeId);

      sendSuccess(res, lead, 'Lead updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /leads/:id/status
   * Update lead status
   */
  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.context.tenantId;
      const { id } = req.params;
      const { status } = req.body;

      const lead = await leadsManager.updateLeadStatus(req, id, tenantId, status);

      sendSuccess(res, lead, 'Lead status updated');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /leads/:id/estimation-method
   * Set estimation method for a qualified lead
   */
  async setEstimationMethod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.context.tenantId;
      const { id } = req.params;
      const { estimationMethod } = req.body;

      const lead = await leadsService.setEstimationMethod(id, tenantId, estimationMethod);

      sendSuccess(res, lead, 'Estimation method set successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /leads/:id/assign
   * Assign lead to employee
   */
  async assign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.context.tenantId;
      const employeeId = req.user!.employeeId!;
      const { id } = req.params;
      const { assignedToId } = req.body;

      const lead = await leadsManager.assignLead(
        req,
        id,
        tenantId,
        assignedToId,
        employeeId
      );

      sendSuccess(res, lead, 'Lead assigned successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /leads/:id/convert
   * Convert lead to client
   */
  async convert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.context.tenantId;
      const { id } = req.params;
      const options = req.body;

      const result = await leadsManager.convertLeadToClient(req, id, tenantId, options);

      sendSuccess(res, result, 'Lead converted to client successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /leads/:id
   * Delete lead
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.context.tenantId;
      const { id } = req.params;

      await leadsManager.deleteLead(req, id, tenantId);

      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /leads/bulk/assign
   * Bulk assign leads
   */
  async bulkAssign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.context.tenantId;
      const employeeId = req.user!.employeeId!;
      const { leadIds, assignedToId } = req.body;

      const count = await leadsManager.bulkAssignLeads(
        req,
        leadIds,
        tenantId,
        assignedToId,
        employeeId
      );

      sendSuccess(res, { updatedCount: count }, `${count} leads assigned`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /leads/bulk/status
   * Bulk update lead status
   */
  async bulkUpdateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.context.tenantId;
      const { leadIds, status } = req.body;

      const count = await leadsManager.bulkUpdateLeadStatus(req, leadIds, tenantId, status);

      sendSuccess(res, { updatedCount: count }, `${count} leads updated`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /leads/import
   * Import leads
   */
  async import(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.context.tenantId;
      const employeeId = req.user!.employeeId!;
      const { leads } = req.body;

      const result = await leadsManager.importLeads(req, tenantId, leads, employeeId);

      sendSuccess(res, result, `Imported ${result.imported} leads`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /leads/export
   * Export leads
   */
  async export(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.context.tenantId;
      const query = req.body;

      const data = await leadsManager.exportLeads(req, tenantId, query);

      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }
}

export const leadsController = new LeadsController();