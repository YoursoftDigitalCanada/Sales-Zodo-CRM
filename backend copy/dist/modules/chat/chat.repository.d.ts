import { CreateConversationDto, SendMessageDto, ConversationQueryDto, MessageQueryDto } from './chat.dto';
export declare class ChatRepository {
    createConversation(tenantId: string, data: CreateConversationDto, createdById: string): Promise<any>;
    findConversationById(id: string, tenantId: string): Promise<any>;
    findConversations(tenantId: string, employeeId: string, query: ConversationQueryDto): Promise<{
        data: any;
        total: any;
    }>;
    sendMessage(conversationId: string, senderId: string, data: SendMessageDto): Promise<any>;
    findMessages(conversationId: string, query: MessageQueryDto): Promise<{
        data: any;
        total: any;
    }>;
    markAsRead(conversationId: string, employeeId: string): Promise<void>;
}
export declare const chatRepository: ChatRepository;
//# sourceMappingURL=chat.repository.d.ts.map