import { NextFunction, Request, Response } from 'express';
import { chatService } from './chat.service';
import { sendCreated, sendNoContent, sendSuccess } from '../../common/utils/responseFormatter';
import { UnauthorizedError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

function currentEmployeeId(req: Request): string {
    const employeeId = req.employee?.id || req.user?.employeeId;
    if (!employeeId) {
        throw new UnauthorizedError('Employee chat profile not found', ErrorCodes.EMPLOYEE_NOT_FOUND);
    }
    return employeeId;
}

export class ChatController {
    async getDirectory(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const directory = await chatService.getDirectory(
                req.context.tenantId,
                currentEmployeeId(req),
            );
            sendSuccess(res, directory);
        } catch (error) {
            next(error);
        }
    }

    async createConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const conversation = await chatService.createConversation(
                req.context.tenantId,
                currentEmployeeId(req),
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
                currentEmployeeId(req),
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
                currentEmployeeId(req),
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
                currentEmployeeId(req),
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
                currentEmployeeId(req),
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
                currentEmployeeId(req),
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
                currentEmployeeId(req),
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
                currentEmployeeId(req),
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
                currentEmployeeId(req),
            );
            sendNoContent(res);
        } catch (error) {
            next(error);
        }
    }
}

export const chatController = new ChatController();
