import api from "@/lib/axios";
import { extractApiArray, extractApiData } from "@/types/api";

export interface ChatParticipantEntity {
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
    status: "online" | "offline" | "away" | "busy";
    lastSeen: string | null;
}

export interface MessageAttachmentEntity {
    id?: string;
    type: "image" | "file";
    name?: string;
    url: string;
    size?: string;
}

export interface MessageEntity {
    id: string;
    roomId: string;
    senderId: string | null;
    senderName: string | null;
    senderAvatar: string | null;
    content: string;
    messageType: string;
    attachments: MessageAttachmentEntity[];
    isEdited: boolean;
    editedAt: string | null;
    createdAt: string;
}

export interface ConversationEntity {
    id: string;
    name: string | null;
    isGroup: boolean;
    lastMessageAt: string | null;
    lastMessagePreview: string | null;
    lastMessage: MessageEntity | null;
    unreadCount: number;
    isPinned: boolean;
    isMuted: boolean;
    isArchived: boolean;
    participants: ChatParticipantEntity[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateConversationPayload {
    participantIds: string[];
    name?: string | null;
    isGroup?: boolean;
}

export interface SendMessagePayload {
    content?: string;
    attachments?: MessageAttachmentEntity[];
}

export interface UpdateMessagePayload {
    content: string;
}

export interface UpdateConversationSettingsPayload {
    isPinned?: boolean;
    isMuted?: boolean;
    isArchived?: boolean;
}

export async function getChatDirectory(): Promise<any[]> {
    const response = await api.get("/chat/directory");
    return extractApiArray<any>(response.data);
}

export async function getConversations(params?: Record<string, unknown>): Promise<ConversationEntity[]> {
    const response = await api.get("/chat/conversations", { params });
    return extractApiArray<ConversationEntity>(response.data);
}

export async function getConversationById(id: string): Promise<ConversationEntity> {
    const response = await api.get(`/chat/conversations/${id}`);
    return extractApiData<ConversationEntity>(response.data);
}

export async function createConversation(data: CreateConversationPayload): Promise<ConversationEntity> {
    const response = await api.post("/chat/conversations", data);
    return extractApiData<ConversationEntity>(response.data);
}

export async function updateConversationSettings(
    id: string,
    data: UpdateConversationSettingsPayload,
): Promise<ConversationEntity> {
    const response = await api.patch(`/chat/conversations/${id}/settings`, data);
    return extractApiData<ConversationEntity>(response.data);
}

export async function deleteConversation(id: string): Promise<void> {
    await api.delete(`/chat/conversations/${id}`);
}

export async function getMessages(conversationId: string, params?: Record<string, unknown>): Promise<MessageEntity[]> {
    const response = await api.get(`/chat/conversations/${conversationId}/messages`, { params });
    return extractApiArray<MessageEntity>(response.data);
}

export async function sendMessage(conversationId: string, data: SendMessagePayload): Promise<MessageEntity> {
    const response = await api.post(`/chat/conversations/${conversationId}/messages`, data);
    return extractApiData<MessageEntity>(response.data);
}

export async function updateMessage(
    conversationId: string,
    messageId: string,
    data: UpdateMessagePayload,
): Promise<MessageEntity> {
    const response = await api.patch(`/chat/conversations/${conversationId}/messages/${messageId}`, data);
    return extractApiData<MessageEntity>(response.data);
}

export async function deleteMessage(conversationId: string, messageId: string): Promise<void> {
    await api.delete(`/chat/conversations/${conversationId}/messages/${messageId}`);
}
