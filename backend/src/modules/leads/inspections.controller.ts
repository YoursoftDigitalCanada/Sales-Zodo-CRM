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
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const employeeId = req.user?.employeeId;
            const userId = req.user?.userId;
            const data = sanitizeBody<CreateLeadInspectionDto>(req.body);

            const inspection = await inspectionsService.create(
                tenantId,
                data,
                employeeId,
                userId,
                req.dataAccess,
            );

            sendCreated(res, inspection, 'Inspection created successfully');
        } catch (error) {
            next(error);
        }
    }

    async createForLead(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const employeeId = req.user?.employeeId;
            const userId = req.user?.userId;
            const { leadId } = req.params;
            const data = sanitizeBody<CreateLeadInspectionDto>({
                ...req.body,
                leadId,
            });

            const inspection = await inspectionsService.create(
                tenantId,
                data,
                employeeId,
                userId,
                req.dataAccess,
            );

            sendCreated(res, inspection, 'Inspection created successfully');
        } catch (error) {
            next(error);
        }
    }

    async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const leadId = typeof req.query.leadId === 'string' ? req.query.leadId : undefined;
            const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
            const inspections = await inspectionsService.getAll(tenantId, req.dataAccess, { leadId, clientId });
            sendSuccess(res, inspections);
        } catch (error) {
            next(error);
        }
    }

    async getByLeadId(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { leadId } = req.params;

            const inspections = await inspectionsService.getByLeadId(leadId, tenantId, req.dataAccess);

            sendSuccess(res, inspections);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { inspectionId } = req.params;

            const inspection = await inspectionsService.getById(inspectionId, tenantId, req.dataAccess);

            sendSuccess(res, inspection);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { inspectionId } = req.params;
            const data = sanitizeBody<UpdateLeadInspectionDto>(req.body);

            const inspection = await inspectionsService.update(inspectionId, tenantId, data, req.dataAccess);

            sendSuccess(res, inspection, 'Inspection updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { inspectionId } = req.params;

            await inspectionsService.delete(inspectionId, tenantId, req.dataAccess);

            sendNoContent(res);
        } catch (error) {
            next(error);
        }
    }
}

export const inspectionsController = new InspectionsController();
