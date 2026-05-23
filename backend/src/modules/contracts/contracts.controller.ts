import { Request, Response, NextFunction } from 'express';
import { contractsService } from './contracts.service';

export class ContractsController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.context.tenantId;
            const createdById = req.user!.employeeId!;
            const dto = await contractsService.create(tenantId, req.body, createdById);
            res.status(201).json(dto);
        } catch (err) { next(err); }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.context.tenantId;
            const dto = await contractsService.getById(req.params.id, tenantId);
            res.json(dto);
        } catch (err) { next(err); }
    }

    async getMany(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.context.tenantId;
            const result = await contractsService.getMany(tenantId, req.query as any);
            res.json(result);
        } catch (err) { next(err); }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.context.tenantId;
            const dto = await contractsService.update(req.params.id, tenantId, req.body);
            res.json(dto);
        } catch (err) { next(err); }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.context.tenantId;
            await contractsService.delete(req.params.id, tenantId);
            res.status(204).send();
        } catch (err) { next(err); }
    }

    async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const contract = await contractsService.updateStatus(req.params.id, tenantId, req.body.status, req.user?.employeeId);
            res.json(contract);
        } catch (e) { next(e); }
    }
}

export const contractsController = new ContractsController();
