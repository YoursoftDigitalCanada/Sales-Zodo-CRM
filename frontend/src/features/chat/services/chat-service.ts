import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

export interface ConversationEntity {
    id: string;
    name?: string;
    type?: string;
    participants?: Array<{ id: string; name?: string;[key: string]: unknown }>;
    lastMessage?: MessageEntity;
    unreadCount?: number;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface MessageEntity {
    id: string;
    conversationId: string;
    senderId?: string;
    senderName?: string;
    content: string;
    type?: string;
    attachments?: Array<{ name: string; url: string; type: string;[key: string]: unknown }>;
    createdAt: string;
    [key: string]: unknown;
}

export interface CreateConversationPayload {
    name?: string;
    type?: string;
    participantIds: string[];
    [key: string]: unknown;
}

export interface SendMessagePayload {
    content: string;
    type?: string;
    attachments?: Array<{ name: string; url: string; type: string }>;
    [key: string]: unknown;
}

export async function getConversations(params?: Record<string, unknown>): Promise<ConversationEntity[]> {
    const response = await api.get("/chat/conversations", { params });
    return extractApiArray<ConversationEntity>(response.data);
}

export async function getConversationById(id: string): Promise<ConversationEntity> {
    const response = await api.get(`/chat/conversations/${id}`);
    return response.data?.data || response.data;
}

export async function createConversation(data: CreateConversationPayload): Promise<ConversationEntity> {
    const response = await api.post("/chat/conversations", data);
    return response.data?.data || response.data;
}

export async function getMessages(conversationId: string, params?: Record<string, unknown>): Promise<MessageEntity[]> {
    const response = await api.get(`/chat/conversations/${conversationId}/messages`, { params });
    return extractApiArray<MessageEntity>(response.data);
}

export async function sendMessage(conversationId: string, data: SendMessagePayload): Promise<MessageEntity> {
    const response = await api.post(`/chat/conversations/${conversationId}/messages`, data);
    return response.data?.data || response.data;
}

export async function deleteMessage(conversationId: string, messageId: string): Promise<void> {
    await api.delete(`/chat/conversations/${conversationId}/messages/${messageId}`);
}
