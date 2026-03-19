import { Request, Response, NextFunction } from 'express';
import { TicketStatus } from '@prisma/client';
import { supportTicketsRealtimeService } from './support-tickets.realtime';
import { supportTicketsService } from './support-tickets.service';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, index)).toFixed(1))} ${sizes[index]}`;
}

function getRequesterIdentity(req: Request) {
  return {
    userId: req.user?.userId,
    email: req.user?.email,
  };
}

function getRequesterDisplayName(req: Request): string {
  const firstName = req.employee?.user?.firstName;
  const lastName = req.employee?.user?.lastName;
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name || req.user?.email || 'Workspace User';
}

export class SupportTicketsController {
  async stream(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const disconnect = supportTicketsRealtimeService.subscribeRequester(res, {
        tenantId: req.context.tenantId,
        userId: req.user?.userId,
        email: req.user?.email,
      });

      req.on('close', disconnect);
    } catch (error) {
      next(error);
    }
  }

  async getTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await supportTicketsService.getRequesterTickets(
        req.context.tenantId,
        getRequesterIdentity(req),
        req.query as any
      );
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  }

  async createTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await supportTicketsService.createTicket(
        req.context.tenantId,
        getRequesterIdentity(req),
        req.body
      );
      res.status(201).json({ success: true, data: ticket, message: 'Ticket created' });
    } catch (error) {
      next(error);
    }
  }

  async createTicketWithAttachments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const files = ((req as any).files as Express.Multer.File[] | undefined) || [];
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const attachments = files.map((file) => ({
        name: file.originalname,
        url: `${baseUrl}/uploads/${req.context.tenantId}/${file.filename}`,
        type: file.mimetype,
        size: formatFileSize(file.size),
        storedName: file.filename,
      }));

      const ticket = await supportTicketsService.createTicket(
        req.context.tenantId,
        getRequesterIdentity(req),
        {
          subject: req.body.subject,
          description: req.body.description,
          priority: req.body.priority,
          category: req.body.category,
          attachments,
        }
      );
      res.status(201).json({ success: true, data: ticket, message: 'Ticket created with attachments' });
    } catch (error) {
      next(error);
    }
  }

  async getTicketById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await supportTicketsService.getRequesterTicketById(
        req.params.id,
        req.context.tenantId,
        getRequesterIdentity(req)
      );
      res.json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await supportTicketsService.updateRequesterStatus(
        req.params.id,
        req.context.tenantId,
        getRequesterIdentity(req),
        req.body.status as TicketStatus,
        getRequesterDisplayName(req)
      );
      res.json({ success: true, data: ticket, message: `Ticket status updated to ${req.body.status}` });
    } catch (error) {
      next(error);
    }
  }

  async addMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await supportTicketsService.addRequesterMessage(
        req.params.id,
        req.context.tenantId,
        getRequesterIdentity(req),
        getRequesterDisplayName(req),
        req.body.message
      );
      res.status(201).json({ success: true, data: ticket, message: 'Reply sent' });
    } catch (error) {
      next(error);
    }
  }

  async deleteTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await supportTicketsService.deleteRequesterTicket(
        req.params.id,
        req.context.tenantId,
        getRequesterIdentity(req)
      );
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await supportTicketsService.getRequesterStats(
        req.context.tenantId,
        getRequesterIdentity(req)
      );
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}

export const supportTicketsController = new SupportTicketsController();
