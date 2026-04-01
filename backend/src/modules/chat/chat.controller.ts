import { NextFunction, Request, Response } from 'express';
import { chatService } from './chat.service';
import { sendCreated, sendNoContent, sendSuccess } from '../../common/utils/responseFormatter';

export class ChatController {
    async createConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const conversation = await chatService.createConversation(
                req.context.tenantId,
                req.user!.employeeId!,
                req.body,
            );
            sendCreated(res, conversation, 'Conversation created');
        } catch (error) {
            next(error);
        }
    }

    async getConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await chatService.getConversations(
                req.context.tenantId,
                req.user!.employeeId!,
                req.query as any,
            );
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (error) {
            next(error);
        }
    }

    async getConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const conversation = await chatService.getConversation(
                req.params.id,
                req.context.tenantId,
                req.user!.employeeId!,
            );
            sendSuccess(res, conversation);
        } catch (error) {
            next(error);
        }
    }

    async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const message = await chatService.sendMessage(
                req.params.id,
                req.context.tenantId,
                req.user!.employeeId!,
                req.body,
            );
            sendCreated(res, message, 'Message sent');
        } catch (error) {
            next(error);
        }
    }

    async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await chatService.getMessages(
                req.params.id,
                req.context.tenantId,
                req.user!.employeeId!,
                req.query as any,
            );
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (error) {
            next(error);
        }
    }

    async updateConversationSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const conversation = await chatService.updateConversationSettings(
                req.params.id,
                req.context.tenantId,
                req.user!.employeeId!,
                req.body,
            );
            sendSuccess(res, conversation, 'Conversation updated');
        } catch (error) {
            next(error);
        }
    }

    async deleteConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await chatService.deleteConversation(
                req.params.id,
                req.context.tenantId,
                req.user!.employeeId!,
            );
            sendNoContent(res);
        } catch (error) {
            next(error);
        }
    }

    async updateMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const message = await chatService.updateMessage(
                req.params.id,
                req.params.messageId,
                req.context.tenantId,
                req.user!.employeeId!,
                req.body,
            );
            sendSuccess(res, message, 'Message updated');
        } catch (error) {
            next(error);
        }
    }

    async deleteMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await chatService.deleteMessage(
                req.params.id,
                req.params.messageId,
                req.context.tenantId,
                req.user!.employeeId!,
            );
            sendNoContent(res);
        } catch (error) {
            next(error);
        }
    }
}

export const chatController = new ChatController();
