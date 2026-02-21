"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatService = exports.ChatService = void 0;
const chat_repository_1 = require("./chat.repository");
const chat_dto_1 = require("./chat.dto");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
class ChatService {
    async createConversation(tenantId, data, createdById) {
        const conversation = await chat_repository_1.chatRepository.createConversation(tenantId, data, createdById);
        return (0, chat_dto_1.toConversationResponseDto)(conversation);
    }
    async getConversations(tenantId, employeeId, query) {
        const { data, total } = await chat_repository_1.chatRepository.findConversations(tenantId, employeeId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map((c) => (0, chat_dto_1.toConversationResponseDto)(c)),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }
    async getConversation(id, tenantId) {
        const conversation = await chat_repository_1.chatRepository.findConversationById(id, tenantId);
        if (!conversation)
            throw new HttpErrors_1.NotFoundError('Conversation not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        return (0, chat_dto_1.toConversationResponseDto)(conversation);
    }
    async sendMessage(conversationId, tenantId, senderId, data) {
        const conversation = await chat_repository_1.chatRepository.findConversationById(conversationId, tenantId);
        if (!conversation)
            throw new HttpErrors_1.NotFoundError('Conversation not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        const message = await chat_repository_1.chatRepository.sendMessage(conversationId, senderId, data);
        return (0, chat_dto_1.toMessageResponseDto)(message);
    }
    async getMessages(conversationId, tenantId, query) {
        const conversation = await chat_repository_1.chatRepository.findConversationById(conversationId, tenantId);
        if (!conversation)
            throw new HttpErrors_1.NotFoundError('Conversation not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        const { data, total } = await chat_repository_1.chatRepository.findMessages(conversationId, query);
        const page = query.page || 1, limit = query.limit || 50;
        return {
            data: data.map(chat_dto_1.toMessageResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }
    async markAsRead(conversationId, tenantId, employeeId) {
        const conversation = await chat_repository_1.chatRepository.findConversationById(conversationId, tenantId);
        if (!conversation)
            throw new HttpErrors_1.NotFoundError('Conversation not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        await chat_repository_1.chatRepository.markAsRead(conversationId, employeeId);
    }
}
exports.ChatService = ChatService;
exports.chatService = new ChatService();
//# sourceMappingURL=chat.service.js.map