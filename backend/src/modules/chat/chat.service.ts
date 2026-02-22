import { chatRepository } from './chat.repository';
import { CreateConversationDto, SendMessageDto, ConversationQueryDto, MessageQueryDto, toConversationResponseDto, toMessageResponseDto } from './chat.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

export class ChatService {
    async createConversation(tenantId: string, data: CreateConversationDto, createdById: string) {
        const conversation = await chatRepository.createConversation(tenantId, data, createdById);
        return toConversationResponseDto(conversation);
    }

    async getConversation(id: string, tenantId: string) {
        const conversation = await chatRepository.findConversationById(id, tenantId);
        if (!conversation) throw new NotFoundError('Conversation not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toConversationResponseDto(conversation);
    }

    async getConversations(tenantId: string, employeeId: string, query: ConversationQueryDto) {
        const { data, total } = await chatRepository.findConversations(tenantId, employeeId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map((c: any) => toConversationResponseDto(c)),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }

    async sendMessage(roomId: string, tenantId: string, senderId: string, data: SendMessageDto) {
        const message = await chatRepository.sendMessage(roomId, tenantId, senderId, data);
        return toMessageResponseDto(message);
    }

    async getMessages(roomId: string, query: MessageQueryDto) {
        const { data, total } = await chatRepository.findMessages(roomId, query);
        const page = query.page || 1, limit = query.limit || 50;
        return {
            data: data.map((m: any) => toMessageResponseDto(m)),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }
}

export const chatService = new ChatService();
