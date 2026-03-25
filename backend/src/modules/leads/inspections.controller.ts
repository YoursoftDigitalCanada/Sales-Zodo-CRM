import { Request, Response, NextFunction } from 'express';
import { inspectionsService } from './inspections.service';
import {
    sendSuccess,
    sendCreated,
    sendNoContent,
} from '../../common/utils/responseFormatter';
import { CreateLeadInspectionDto, UpdateLeadInspectionDto } from './inspections.dto';
import { sanitizeBody } from '../../common/utils/sanitize-body';

export class InspectionsController {
    /**
     * POST /leads/:leadId/inspections
     */
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const employeeId = req.user?.employeeId;
            const { leadId } = req.params;
            const data = sanitizeBody<CreateLeadInspectionDto>(req.body);

            const inspection = await inspectionsService.create(leadId, tenantId, data, employeeId);

            sendCreated(res, inspection, 'Inspection created successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /leads/inspections/all
     */
    async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const inspections = await inspectionsService.getAll(tenantId, req.dataAccess);
            sendSuccess(res, inspections);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /leads/:leadId/inspections
     */
    async getByLeadId(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { leadId } = req.params;

            const inspections = await inspectionsService.getByLeadId(leadId, tenantId);

            sendSuccess(res, inspections);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /leads/:leadId/inspections/:inspectionId
     */
    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { inspectionId } = req.params;

            const inspection = await inspectionsService.getById(inspectionId, tenantId);

            sendSuccess(res, inspection);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /leads/:leadId/inspections/:inspectionId
     */
    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { inspectionId } = req.params;
            const data = sanitizeBody<UpdateLeadInspectionDto>(req.body);

            const inspection = await inspectionsService.update(inspectionId, tenantId, data);

            sendSuccess(res, inspection, 'Inspection updated successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /leads/:leadId/inspections/:inspectionId
     */
    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { inspectionId } = req.params;

            await inspectionsService.delete(inspectionId, tenantId);

            sendNoContent(res);
        } catch (error) {
            next(error);
        }
    }
}

export const inspectionsController = new InspectionsController();
