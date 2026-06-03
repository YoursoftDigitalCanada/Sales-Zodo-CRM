import { chatRepository } from './chat.repository';
import {
    ConversationQueryDto,
    ConversationSettingsDto,
    CreateConversationDto,
    MessageQueryDto,
    SendMessageDto,
    UpdateMessageDto,
    toConversationResponseDto,
    toMessageResponseDto,
} from './chat.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

export class ChatService {
    async getDirectory(tenantId: string, employeeId: string) {
        return chatRepository.listDirectory(tenantId, employeeId);
    }

    async createConversation(tenantId: string, employeeId: string, data: CreateConversationDto) {
        const conversation = await chatRepository.createConversation(tenantId, data, employeeId);
        return toConversationResponseDto(conversation, employeeId);
    }

    async getConversation(id: string, tenantId: string, employeeId: string) {
        const conversation = await chatRepository.findConversationById(id, tenantId, employeeId);
        if (!conversation) {
            throw new NotFoundError('Conversation not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        return toConversationResponseDto(conversation, employeeId);
    }

    async getConversations(tenantId: string, employeeId: string, query: ConversationQueryDto) {
        const { data, total } = await chatRepository.findConversations(tenantId, employeeId, query);
        const page = query.page || 1;
        const limit = query.limit || 20;

        return {
            data: data.map((conversation) => toConversationResponseDto(conversation, employeeId)),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            },
        };
    }

    async sendMessage(roomId: string, tenantId: string, senderId: string, data: SendMessageDto) {
        const message = await chatRepository.sendMessage(roomId, tenantId, senderId, data);
        return toMessageResponseDto(message);
    }

    async getMessages(roomId: string, tenantId: string, employeeId: string, query: MessageQueryDto) {
        const { data, total } = await chatRepository.findMessages(roomId, tenantId, employeeId, query);
        const page = query.page || 1;
        const limit = query.limit || 100;

        return {
            data: data.map((message) => toMessageResponseDto(message)),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            },
        };
    }

    async updateConversationSettings(
        roomId: string,
        tenantId: string,
        employeeId: string,
        data: ConversationSettingsDto,
    ) {
        const conversation = await chatRepository.updateConversationSettings(roomId, tenantId, employeeId, data);
        return toConversationResponseDto(conversation, employeeId);
    }

    async deleteConversation(roomId: string, tenantId: string, employeeId: string) {
        await chatRepository.deleteConversation(roomId, tenantId, employeeId);
    }

    async updateMessage(
        roomId: string,
        messageId: string,
        tenantId: string,
        employeeId: string,
        data: UpdateMessageDto,
    ) {
        const message = await chatRepository.updateMessage(roomId, messageId, tenantId, employeeId, data);
        return toMessageResponseDto(message);
    }

    async deleteMessage(roomId: string, messageId: string, tenantId: string, employeeId: string) {
        await chatRepository.deleteMessage(roomId, messageId, tenantId, employeeId);
    }
}

export const chatService = new ChatService();
