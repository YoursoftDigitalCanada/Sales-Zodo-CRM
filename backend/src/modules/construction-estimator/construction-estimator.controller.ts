import { Request, Response, NextFunction } from 'express';
import { constructionEstimatorService } from './construction-estimator.service';

class ConstructionEstimatorController {

    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const createdBy = req.user!.employeeId!;
            const result = await constructionEstimatorService.create(tenantId, createdBy, req.body);
            res.status(201).json({ success: true, data: result });
        } catch (err) { next(err); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const result = await constructionEstimatorService.getById(req.params.id, tenantId);
            res.json({ success: true, data: result });
        } catch (err) { next(err); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const result = await constructionEstimatorService.getMany(tenantId, req.query);
            res.json({ success: true, ...result });
        } catch (err) { next(err); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const result = await constructionEstimatorService.update(req.params.id, tenantId, req.body);
            res.json({ success: true, data: result });
        } catch (err) { next(err); }
    }

    async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            await constructionEstimatorService.delete(req.params.id, tenantId);
            res.status(204).send();
        } catch (err) { next(err); }
    }

    async recalculate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const result = await constructionEstimatorService.recalculate(req.params.id, tenantId);
            res.json({ success: true, data: result });
        } catch (err) { next(err); }
    }

    async saveMeasurements(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const result = await constructionEstimatorService.saveMeasurements(req.params.id, tenantId, req.body);
            res.json({ success: true, data: result });
        } catch (err) { next(err); }
    }
}

export const constructionEstimatorController = new ConstructionEstimatorController();
