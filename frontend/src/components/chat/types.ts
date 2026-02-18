// src/components/chat/types.ts

export interface User {
  id: string;
  name: string;
  avatar?: string;
  email: string;
  phone?: string;
  company?: string;
  role?: string;
  location?: string;
  status: "online" | "offline" | "away" | "busy";
  lastSeen?: Date;
}

export interface Attachment {
  id: string;
  type: "image" | "file" | "link";
  name: string;
  url: string;
  size?: string;
  preview?: string;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  status: "sent" | "delivered" | "read";
  attachments?: Attachment[];
  replyTo?: Message;
  isEdited?: boolean;
  reactions?: { emoji: string; userId: string }[];
}

export interface Conversation {
  id: string;
  type: "direct" | "group";
  name?: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type FilterType = "all" | "unread" | "groups";