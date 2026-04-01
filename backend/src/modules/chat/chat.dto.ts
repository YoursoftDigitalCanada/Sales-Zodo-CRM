import { ChatMessage, ChatParticipant, ChatRoom, Employee, User } from '@prisma/client';

export interface ChatAttachmentDto {
    id?: string;
    name?: string;
    type: 'image' | 'file';
    url: string;
    size?: string;
    [key: string]: unknown;
}

export interface CreateConversationDto {
    participantIds: string[];
    name?: string | null;
    isGroup?: boolean;
}

export interface SendMessageDto {
    content?: string;
    attachments?: ChatAttachmentDto[];
}

export interface UpdateMessageDto {
    content: string;
}

export interface ConversationSettingsDto {
    isPinned?: boolean;
    isMuted?: boolean;
    isArchived?: boolean;
}

export interface ConversationQueryDto {
    page?: number;
    limit?: number;
    archived?: boolean;
}

export interface MessageQueryDto {
    page?: number;
    limit?: number;
    before?: string;
}

export interface ParticipantResponseDto {
    id: string;
    employeeId: string;
    userId: string;
    name: string;
    email: string;
    avatar: string | null;
    phone: string | null;
    position: string | null;
    department: string | null;
    role: string | null;
    status: 'online' | 'offline' | 'away' | 'busy';
    lastSeen: Date | null;
}

export interface MessageResponseDto {
    id: string;
    roomId: string;
    senderId: string | null;
    senderName: string | null;
    senderAvatar: string | null;
    content: string;
    messageType: string;
    attachments: ChatAttachmentDto[];
    isEdited: boolean;
    editedAt: Date | null;
    createdAt: Date;
}

export type MessageWithSender = ChatMessage & {
    senderParticipant?: ParticipantWithEmployee | null;
};

export interface ConversationResponseDto {
    id: string;
    name: string | null;
    isGroup: boolean;
    lastMessageAt: Date | null;
    lastMessagePreview: string | null;
    lastMessage: MessageResponseDto | null;
    unreadCount: number;
    isPinned: boolean;
    isMuted: boolean;
    isArchived: boolean;
    participants: ParticipantResponseDto[];
    createdAt: Date;
    updatedAt: Date;
}

export type ParticipantWithEmployee = ChatParticipant & {
    employee: Employee & {
        user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'avatar' | 'phone' | 'lastLoginAt'>;
        role?: { name: string } | null;
    };
};

export type ChatRoomWithRelations = ChatRoom & {
    participants: ParticipantWithEmployee[];
    messages?: ChatMessage[];
};

const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const AWAY_WINDOW_MS = 60 * 60 * 1000;

function resolveParticipantStatus(
    participant: ParticipantWithEmployee,
): 'online' | 'offline' | 'away' | 'busy' {
    if (!participant.employee.isActive) {
        return 'offline';
    }

    const lastSeen = participant.employee.user.lastLoginAt;
    if (!lastSeen) {
        return 'offline';
    }

    const delta = Date.now() - new Date(lastSeen).getTime();
    if (delta <= ONLINE_WINDOW_MS) {
        return 'online';
    }
    if (delta <= AWAY_WINDOW_MS) {
        return 'away';
    }
    return 'offline';
}

export function toParticipantResponseDto(participant: ParticipantWithEmployee): ParticipantResponseDto {
    const firstName = participant.employee.user.firstName || '';
    const lastName = participant.employee.user.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim() || participant.employee.user.email;

    return {
        id: participant.id,
        employeeId: participant.employeeId,
        userId: participant.employee.user.id,
        name: fullName,
        email: participant.employee.user.email,
        avatar: participant.employee.user.avatar || null,
        phone: participant.employee.user.phone || null,
        position: participant.employee.position || null,
        department: participant.employee.department || null,
        role: participant.employee.role?.name || null,
        status: resolveParticipantStatus(participant),
        lastSeen: participant.employee.user.lastLoginAt || null,
    };
}

export function toMessageResponseDto(
    message: MessageWithSender,
    sender?: ParticipantWithEmployee | null,
): MessageResponseDto {
    const resolvedSender = sender ?? message.senderParticipant ?? null;
    const senderName = sender
        ? `${sender.employee.user.firstName || ''} ${sender.employee.user.lastName || ''}`.trim() || sender.employee.user.email
        : null;

    return {
        id: message.id,
        roomId: message.roomId,
        senderId: message.senderId,
        senderName: senderName || (resolvedSender
            ? `${resolvedSender.employee.user.firstName || ''} ${resolvedSender.employee.user.lastName || ''}`.trim() || resolvedSender.employee.user.email
            : null),
        senderAvatar: resolvedSender?.employee.user.avatar || null,
        content: message.content,
        messageType: message.messageType,
        attachments: Array.isArray(message.attachments) ? message.attachments as ChatAttachmentDto[] : [],
        isEdited: message.isEdited,
        editedAt: message.editedAt,
        createdAt: message.createdAt,
    };
}

export function toConversationResponseDto(
    room: ChatRoomWithRelations,
    currentEmployeeId: string,
): ConversationResponseDto {
    const currentParticipant = room.participants.find((participant) => participant.employeeId === currentEmployeeId);
    const lastMessage = room.messages?.[0];
    const lastMessageSender = lastMessage
        ? room.participants.find((participant) => participant.employeeId === lastMessage.senderId) || null
        : null;

    return {
        id: room.id,
        name: room.name,
        isGroup: room.isGroup,
        lastMessageAt: room.lastMessageAt,
        lastMessagePreview: room.lastMessagePreview || null,
        lastMessage: lastMessage ? toMessageResponseDto(lastMessage, lastMessageSender) : null,
        unreadCount: currentParticipant?.unreadCount || 0,
        isPinned: currentParticipant?.isPinned || false,
        isMuted: currentParticipant?.isMuted || false,
        isArchived: currentParticipant?.isArchived || false,
        participants: room.participants.map(toParticipantResponseDto),
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
    };
}
