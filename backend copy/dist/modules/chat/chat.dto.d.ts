import { Conversation, Message } from '@prisma/client';
export interface CreateConversationDto {
    participantIds: string[];
    name?: string | null;
    isGroup?: boolean;
}
export interface SendMessageDto {
    content: string;
    attachments?: {
        type: string;
        url: string;
        name?: string;
    }[];
}
export interface ConversationQueryDto {
    page?: number;
    limit?: number;
}
export interface MessageQueryDto {
    page?: number;
    limit?: number;
    before?: string;
}
export interface ConversationResponseDto {
    id: string;
    name: string | null;
    isGroup: boolean;
    participants: {
        id: string;
        firstName: string;
        lastName: string;
    }[];
    lastMessage: {
        content: string;
        sentAt: Date;
    } | null;
    unreadCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface MessageResponseDto {
    id: string;
    content: string;
    attachments: unknown[];
    sender: {
        id: string;
        firstName: string;
        lastName: string;
    };
    isRead: boolean;
    sentAt: Date;
}
type ConversationWithRelations = Conversation & {
    participants?: {
        employee: {
            id: string;
            user: {
                firstName: string;
                lastName: string;
            };
        };
    }[];
    messages?: Message[];
    _count?: {
        messages: number;
    };
};
type MessageWithSender = Message & {
    sender?: {
        id: string;
        user: {
            firstName: string;
            lastName: string;
        };
    };
};
export declare function toConversationResponseDto(c: ConversationWithRelations, unreadCount?: number): ConversationResponseDto;
export declare function toMessageResponseDto(m: MessageWithSender): MessageResponseDto;
export {};
//# sourceMappingURL=chat.dto.d.ts.map