import { Request, Response, NextFunction } from 'express';
import { supportTicketsService } from './support-tickets.service';

export class SupportTicketsController {
    async getTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await supportTicketsService.getTickets(req.context.tenantId, req.query as any);
            res.json({ success: true, data: result.data, meta: result.meta });
        } catch (e) { next(e); }
    }

    async createTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const ticket = await supportTicketsService.createTicket(req.context.tenantId, req.body);
            res.status(201).json({ success: true, data: ticket, message: 'Ticket created' });
        } catch (e) { next(e); }
    }

    async getTicketById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const ticket = await supportTicketsService.getTicketById(req.params.id, req.context.tenantId);
            res.json({ success: true, data: ticket });
        } catch (e) { next(e); }
    }

    async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { status } = req.body;
            const ticket = await supportTicketsService.updateStatus(req.params.id, req.context.tenantId, status);
            res.json({ success: true, data: ticket, message: `Ticket status updated to ${status}` });
        } catch (e) { next(e); }
    }

    async addMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const msg = await supportTicketsService.addMessage(req.params.id, req.context.tenantId, req.body);
            res.status(201).json({ success: true, data: msg, message: 'Reply sent' });
        } catch (e) { next(e); }
    }

    async deleteTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await supportTicketsService.deleteTicket(req.params.id, req.context.tenantId);
            res.status(204).end();
        } catch (e) { next(e); }
    }

    async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const stats = await supportTicketsService.getStats(req.context.tenantId);
            res.json({ success: true, data: stats });
        } catch (e) { next(e); }
    }
}

export const supportTicketsController = new SupportTicketsController();
