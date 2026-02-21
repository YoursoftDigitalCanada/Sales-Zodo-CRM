import { CreateConversationDto, SendMessageDto, ConversationQueryDto, MessageQueryDto } from './chat.dto';
export declare class ChatService {
    createConversation(tenantId: string, data: CreateConversationDto, createdById: string): Promise<import("./chat.dto").ConversationResponseDto>;
    getConversations(tenantId: string, employeeId: string, query: ConversationQueryDto): Promise<{
        data: any;
        meta: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
    getConversation(id: string, tenantId: string): Promise<import("./chat.dto").ConversationResponseDto>;
    sendMessage(conversationId: string, tenantId: string, senderId: string, data: SendMessageDto): Promise<import("./chat.dto").MessageResponseDto>;
    getMessages(conversationId: string, tenantId: string, query: MessageQueryDto): Promise<{
        data: any;
        meta: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
    markAsRead(conversationId: string, tenantId: string, employeeId: string): Promise<void>;
}
export declare const chatService: ChatService;
//# sourceMappingURL=chat.service.d.ts.map