"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatController = exports.ChatController = void 0;
const chat_service_1 = require("./chat.service");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class ChatController {
    async createConversation(req, res, next) {
        try {
            const conversation = await chat_service_1.chatService.createConversation(req.user.tenantId, req.body, req.user.employeeId);
            (0, responseFormatter_1.sendCreated)(res, conversation, 'Conversation created');
        }
        catch (e) {
            next(e);
        }
    }
    async getConversations(req, res, next) {
        try {
            const result = await chat_service_1.chatService.getConversations(req.user.tenantId, req.user.employeeId, req.query);
            (0, responseFormatter_1.sendSuccess)(res, result.data, undefined, 200, result.meta);
        }
        catch (e) {
            next(e);
        }
    }
    async getConversation(req, res, next) {
        try {
            const conversation = await chat_service_1.chatService.getConversation(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendSuccess)(res, conversation);
        }
        catch (e) {
            next(e);
        }
    }
    async sendMessage(req, res, next) {
        try {
            const message = await chat_service_1.chatService.sendMessage(req.params.id, req.user.tenantId, req.user.employeeId, req.body);
            (0, responseFormatter_1.sendCreated)(res, message, 'Message sent');
        }
        catch (e) {
            next(e);
        }
    }
    async getMessages(req, res, next) {
        try {
            const result = await chat_service_1.chatService.getMessages(req.params.id, req.user.tenantId, req.query);
            (0, responseFormatter_1.sendSuccess)(res, result.data, undefined, 200, result.meta);
        }
        catch (e) {
            next(e);
        }
    }
    async markAsRead(req, res, next) {
        try {
            await chat_service_1.chatService.markAsRead(req.params.id, req.user.tenantId, req.user.employeeId);
            (0, responseFormatter_1.sendSuccess)(res, null, 'Marked as read');
        }
        catch (e) {
            next(e);
        }
    }
}
exports.ChatController = ChatController;
exports.chatController = new ChatController();
//# sourceMappingURL=chat.controller.js.map