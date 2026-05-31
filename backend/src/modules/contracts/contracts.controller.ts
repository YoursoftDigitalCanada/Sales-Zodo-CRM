import { Request, Response, NextFunction } from 'express';
import { contractsService } from './contracts.service';
import { sanitizeBody } from '../../common/utils/sanitize-body';

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
            const contract = await contractsService.updateStatus(req.params.id, tenantId, req.body.status, req.user?.userId);
            res.json(contract);
        } catch (e) { next(e); }
    }

    async send(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const contract = await contractsService.send(req.params.id, tenantId, req.user?.userId, sanitizeBody(req.body)?.recipientEmail);
            res.json(contract);
        } catch (e) { next(e); }
    }

    async sign(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const contract = await contractsService.sign(req.params.id, tenantId, req.user?.userId);
            res.json(contract);
        } catch (e) { next(e); }
    }

    async decline(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const contract = await contractsService.decline(req.params.id, tenantId, req.user?.userId, req.body?.reason);
            res.json(contract);
        } catch (e) { next(e); }
    }

    async downloadPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { buffer, fileName } = await contractsService.generatePdf(req.params.id, tenantId);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.send(buffer);
        } catch (e) { next(e); }
    }

    async saveDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const document = await contractsService.saveContractPdfToDocuments(tenantId, req.params.id, req.user?.userId, req.body?.variant === 'signed' ? 'signed' : 'sent');
            res.json(document);
        } catch (e) { next(e); }
    }

    async createInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const invoice = await contractsService.createInvoiceFromContract(req.params.id, tenantId);
            res.status(201).json(invoice);
        } catch (e) { next(e); }
    }
}

export const contractsController = new ContractsController();
