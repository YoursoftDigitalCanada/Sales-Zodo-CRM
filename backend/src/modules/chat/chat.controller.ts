import { Request, Response, NextFunction } from 'express';
import { chatService } from './chat.service';
import { sendSuccess, sendCreated } from '../../common/utils/responseFormatter';

export class ChatController {
    async createConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const conversation = await chatService.createConversation(req.context.tenantId, req.body, req.user!.employeeId!);
            sendCreated(res, conversation, 'Conversation created');
        } catch (e) { next(e); }
    }

    async getConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await chatService.getConversations(req.context.tenantId, req.user!.employeeId!, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const conversation = await chatService.getConversation(req.params.id, req.context.tenantId);
            sendSuccess(res, conversation);
        } catch (e) { next(e); }
    }

    async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const message = await chatService.sendMessage(req.params.id, req.user!.tenantId!, req.user!.employeeId!, req.body);
            sendCreated(res, message, 'Message sent');
        } catch (e) { next(e); }
    }

    async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await chatService.getMessages(req.params.id, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }
}

export const chatController = new ChatController();
