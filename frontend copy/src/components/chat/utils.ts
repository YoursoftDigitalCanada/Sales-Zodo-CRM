// src/components/chat/utils.ts

import { User, Conversation } from "./types";

export const formatMessageTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const formatLastSeen = (date?: Date): string => {
  if (!date) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Active now";
  if (diffMins < 60) return `Active ${diffMins}m ago`;
  if (diffHours < 24) return `Active ${diffHours}h ago`;

  return `Last seen ${date.toLocaleDateString()}`;
};

export const formatFullTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const getStatusColor = (status: User["status"]): string => {
  const colors = {
    online: "bg-green-500",
    away: "bg-yellow-500",
    busy: "bg-red-500",
    offline: "bg-gray-400",
  };
  return colors[status];
};

export const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const getOtherParticipant = (conversation: Conversation, currentUserId: string): User => {
  return conversation.participants.find((p) => p.id !== currentUserId) || conversation.participants[0];
};

export const getConversationName = (conversation: Conversation, currentUserId: string): string => {
  if (conversation.type === "group") {
    return conversation.name || "Unnamed Group";
  }
  return getOtherParticipant(conversation, currentUserId).name;
};