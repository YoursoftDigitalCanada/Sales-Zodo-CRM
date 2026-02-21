import { Request, Response, NextFunction } from 'express';
export declare class ChatController {
    createConversation(req: Request, res: Response, next: NextFunction): Promise<void>;
    getConversations(req: Request, res: Response, next: NextFunction): Promise<void>;
    getConversation(req: Request, res: Response, next: NextFunction): Promise<void>;
    sendMessage(req: Request, res: Response, next: NextFunction): Promise<void>;
    getMessages(req: Request, res: Response, next: NextFunction): Promise<void>;
    markAsRead(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const chatController: ChatController;
//# sourceMappingURL=chat.controller.d.ts.map