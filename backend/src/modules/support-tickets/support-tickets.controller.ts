import { Request, Response, NextFunction } from 'express';
import { supportTicketsService } from './support-tickets.service';

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

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

    async createTicketWithAttachments(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const files = (req as any).files as Express.Multer.File[] || [];
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            
            // Build attachment metadata from uploaded files
            const attachments = files.map(f => ({
                name: f.originalname,
                url: `${baseUrl}/uploads/${req.context.tenantId}/${f.filename}`,
                type: f.mimetype,
                size: formatFileSize(f.size),
                storedName: f.filename,
            }));

            // Parse form fields (they come as strings in multipart)
            const data = {
                subject: req.body.subject,
                description: req.body.description,
                priority: req.body.priority || undefined,
                category: req.body.category || undefined,
                requesterName: req.body.requesterName,
                requesterEmail: req.body.requesterEmail,
                attachments,
            };

            const ticket = await supportTicketsService.createTicket(req.context.tenantId, data);
            res.status(201).json({ success: true, data: ticket, message: 'Ticket created with attachments' });
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
