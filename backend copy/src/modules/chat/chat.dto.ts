import { ChatRoom, ChatMessage } from '@prisma/client';

// ============================================================================
// CHAT DTOs - Matching Prisma Schema (ChatRoom, ChatMessage, ChatParticipant)
// ============================================================================

export interface CreateConversationDto {
    participantIds: string[];
    name?: string | null;
    isGroup?: boolean;
}

export interface SendMessageDto {
    content: string;
    attachments?: Record<string, unknown>[];
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
    lastMessageAt: Date | null;
    participants: { id: string; employeeId: string; role: string }[];
    createdAt: Date;
    updatedAt: Date;
}

export interface MessageResponseDto {
    id: string;
    roomId: string;
    senderId: string | null;
    content: string;
    messageType: string;
    attachments: unknown;
    isEdited: boolean;
    editedAt: Date | null;
    createdAt: Date;
}

type ChatRoomWithRelations = ChatRoom & {
    participants?: { id: string; employeeId: string; role: string; employee: { id: string; user: { firstName: string; lastName: string } } }[];
    messages?: ChatMessage[];
};

export function toConversationResponseDto(room: ChatRoomWithRelations): ConversationResponseDto {
    return {
        id: room.id,
        name: room.name,
        isGroup: room.isGroup,
        lastMessageAt: room.lastMessageAt,
        participants: (room.participants || []).map((p: { id: string; employeeId: string; role: string }) => ({
            id: p.id,
            employeeId: p.employeeId,
            role: p.role,
        })),
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
    };
}

export function toMessageResponseDto(msg: ChatMessage): MessageResponseDto {
    return {
        id: msg.id,
        roomId: msg.roomId,
        senderId: msg.senderId,
        content: msg.content,
        messageType: msg.messageType,
        attachments: msg.attachments,
        isEdited: msg.isEdited,
        editedAt: msg.editedAt,
        createdAt: msg.createdAt,
    };
}
