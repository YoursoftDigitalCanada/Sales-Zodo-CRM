import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AxiosError } from "axios";
import {
  ChatSidebar,
  ChatWindow,
  UserInfoPanel,
  NewChatDialog,
  Conversation,
  Message,
  Attachment,
  User,
} from "@/components/chat";
import {
  createConversation as createConversationApi,
  deleteConversation as deleteConversationApi,
  deleteMessage as deleteMessageApi,
  getChatDirectory,
  getConversationById,
  getConversations,
  getMessages,
  sendMessage as sendMessageApi,
  updateConversationSettings as updateConversationSettingsApi,
  updateMessage as updateMessageApi,
  type ChatParticipantEntity,
  type ConversationEntity,
  type MessageAttachmentEntity,
  type MessageEntity,
} from "@/features/chat";
import {
  getMyEmployeeProfile,
  type EmployeeProfileEntity,
} from "@/features/users/services/users-service";
import useIsMobile from "@/hooks/useIsMobile";

const CONVERSATION_POLL_INTERVAL_MS = 8000;
const MESSAGE_POLL_INTERVAL_MS = 5000;

function sanitizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const normalized = phone.replace(/[^\d+]/g, "");
  return normalized || null;
}

function formatEmployeeName(
  firstName?: string | null,
  lastName?: string | null,
  fallback?: string | null,
): string {
  const fullName = `${firstName || ""} ${lastName || ""}`.trim();
  return fullName || fallback || "Employee";
}

function resolveStatus(lastSeen?: string | null, isActive = true): User["status"] {
  if (!isActive || !lastSeen) return "offline";

  const lastSeenDate = new Date(lastSeen);
  if (Number.isNaN(lastSeenDate.getTime())) return "offline";

  const elapsedMs = Date.now() - lastSeenDate.getTime();
  if (elapsedMs <= 5 * 60 * 1000) return "online";
  if (elapsedMs <= 60 * 60 * 1000) return "away";
  return "offline";
}

function buildLocation(profile?: EmployeeProfileEntity["address"]): string | undefined {
  if (!profile) return undefined;
  const pieces = [profile.city, profile.state, profile.country].filter(Boolean);
  return pieces.length > 0 ? pieces.join(", ") : undefined;
}

function toChatUserFromEmployee(employee: any): User {
  const lastSeen = employee?.user?.lastLoginAt || null;
  return {
    id: String(employee.id),
    name: formatEmployeeName(
      employee?.user?.firstName,
      employee?.user?.lastName,
      employee?.user?.email || employee?.email,
    ),
    avatar: employee?.user?.avatar || undefined,
    email: employee?.user?.email || employee?.email || "unknown@zodo.ca",
    phone: employee?.phone || employee?.user?.phone || undefined,
    company: employee?.department || undefined,
    role: employee?.position || employee?.role?.name || "Employee",
    location: buildLocation(employee?.address),
    status: resolveStatus(lastSeen, employee?.isActive !== false),
    lastSeen: lastSeen ? new Date(lastSeen) : undefined,
  };
}

function toChatUserFromParticipant(participant: ChatParticipantEntity): User {
  return {
    id: participant.employeeId,
    name: participant.name,
    avatar: participant.avatar || undefined,
    email: participant.email,
    phone: participant.phone || undefined,
    company: participant.department || undefined,
    role: participant.position || participant.role || "Employee",
    status: participant.status,
    lastSeen: participant.lastSeen ? new Date(participant.lastSeen) : undefined,
  };
}

function toAttachment(entity: MessageAttachmentEntity): Attachment {
  const type = entity.type === "image" ? "image" : "file";
  return {
    id: entity.id || `att-${Date.now()}`,
    type,
    name: entity.name || (type === "image" ? "Photo" : "Attachment"),
    url: entity.url,
    preview: type === "image" ? entity.url : undefined,
    size: entity.size,
  };
}

function toMessage(entity: MessageEntity, isStarred: boolean): Message {
  return {
    id: entity.id,
    senderId: entity.senderId || "",
    senderName: entity.senderName || undefined,
    senderAvatar: entity.senderAvatar || undefined,
    content: entity.content || "",
    timestamp: new Date(entity.createdAt),
    status: "delivered",
    attachments: (entity.attachments || []).map(toAttachment),
    isEdited: entity.isEdited,
    isStarred,
  };
}

function toConversation(
  entity: ConversationEntity,
  starredMessageIds: Record<string, string[]>,
): Conversation {
  const conversationId = entity.id;
  return {
    id: entity.id,
    type: entity.isGroup ? "group" : "direct",
    name: entity.name || undefined,
    participants: entity.participants.map(toChatUserFromParticipant),
    lastMessage: entity.lastMessage
      ? toMessage(entity.lastMessage, (starredMessageIds[conversationId] || []).includes(entity.lastMessage.id))
      : undefined,
    unreadCount: entity.unreadCount || 0,
    isPinned: entity.isPinned || false,
    isMuted: entity.isMuted || false,
    isArchived: entity.isArchived || false,
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.lastMessageAt || entity.updatedAt),
  };
}

function readStarredMessages(employeeId: string | null): Record<string, string[]> {
  if (!employeeId) return {};
  try {
    const raw = window.localStorage.getItem(`chat-starred:${employeeId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persistStarredMessages(employeeId: string | null, value: Record<string, string[]>) {
  if (!employeeId) return;
  window.localStorage.setItem(`chat-starred:${employeeId}`, JSON.stringify(value));
}

function downloadAttachment(attachment: Attachment) {
  const link = document.createElement("a");
  link.href = attachment.url;
  link.download = attachment.name || "attachment";
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as
      | { message?: string; errors?: Record<string, string[] | string> }
      | undefined;

    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message;
    }

    if (data?.errors && typeof data.errors === "object") {
      const firstError = Object.values(data.errors)[0];
      if (Array.isArray(firstError) && firstError.length > 0) {
        return String(firstError[0]);
      }
      if (typeof firstError === "string" && firstError.trim()) {
        return firstError;
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function removeConversationParam(
  searchParams: URLSearchParams,
  setSearchParams: ReturnType<typeof useSearchParams>[1],
) {
  const nextParams = new URLSearchParams(searchParams);
  nextParams.delete("conversationId");
  setSearchParams(nextParams);
}

export default function ChatPage() {
  const { isMobile } = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [directoryUsers, setDirectoryUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    searchParams.get("conversationId"),
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [newChatTab, setNewChatTab] = useState<"direct" | "group">("direct");
  const [showArchived, setShowArchived] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [chatSearchTerm, setChatSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [starredMessageIds, setStarredMessageIds] = useState<Record<string, string[]>>({});

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId],
  );

  const visibleConversations = useMemo(() => {
    if (!showStarredOnly) return conversations;
    return conversations.filter((conversation) => (starredMessageIds[conversation.id] || []).length > 0);
  }, [conversations, showStarredOnly, starredMessageIds]);

  const visibleMessages = useMemo(() => {
    let next = messages;
    if (showStarredOnly && selectedConversationId) {
      const starredIds = new Set(starredMessageIds[selectedConversationId] || []);
      next = next.filter((message) => starredIds.has(message.id));
    }
    if (chatSearchTerm.trim()) {
      const term = chatSearchTerm.trim().toLowerCase();
      next = next.filter((message) => {
        const attachmentText = (message.attachments || [])
          .map((attachment) => `${attachment.name || ""} ${attachment.size || ""}`.trim())
          .join(" ");
        return `${message.content} ${attachmentText}`.toLowerCase().includes(term);
      });
    }
    return next;
  }, [chatSearchTerm, messages, selectedConversationId, showStarredOnly, starredMessageIds]);

  const upsertConversation = useCallback((conversation: Conversation) => {
    setConversations((prev) => {
      const next = prev.filter((entry) => entry.id !== conversation.id);
      return [conversation, ...next];
    });
  }, []);

  const loadDirectory = useCallback(async () => {
    const [profile, employees] = await Promise.all([
      getMyEmployeeProfile(),
      getChatDirectory(),
    ]);

    const me = toChatUserFromEmployee(profile);
    setCurrentUser(me);
    setDirectoryUsers(
      (employees as any[])
        .filter((employee) => employee?.isActive !== false)
        .filter((employee) => employee?.user?.email || employee?.email)
        .filter((employee) => String(employee.id) !== me.id)
        .map(toChatUserFromEmployee),
    );
    setStarredMessageIds(readStarredMessages(me.id));
  }, []);

  const fetchConversationsList = useCallback(async () => {
    if (!currentUser) return;

    const data = await getConversations({ archived: showArchived });
    const normalized = data.map((conversation) => toConversation(conversation, starredMessageIds));

    setConversations(normalized);

    if (selectedConversationId && !normalized.some((conversation) => conversation.id === selectedConversationId)) {
      if (!showArchived) {
        setSelectedConversationId(null);
      }
    }
  }, [currentUser, selectedConversationId, showArchived, starredMessageIds]);

  const ensureConversationLoaded = useCallback(async (conversationId: string) => {
    if (!currentUser) return;
    try {
      const conversation = await getConversationById(conversationId);
      const normalized = toConversation(conversation, starredMessageIds);
      if (normalized.isArchived && !showArchived) {
        setShowArchived(true);
      }
      upsertConversation(normalized);
    } catch {
      toast.error("Unable to open that conversation.");
    }
  }, [currentUser, showArchived, starredMessageIds, upsertConversation]);

  const fetchConversationMessages = useCallback(async (conversationId: string) => {
    const data = await getMessages(conversationId, { limit: 200 });
    const starredIds = new Set(starredMessageIds[conversationId] || []);
    setMessages(data.map((message) => toMessage(message, starredIds.has(message.id))));
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
      ),
    );
  }, [starredMessageIds]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadDirectory()
      .catch((error) => {
        toast.error(getApiErrorMessage(error, "Failed to load your employee chat directory."));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [loadDirectory]);

  useEffect(() => {
    if (!currentUser) return;
    fetchConversationsList().catch(() => {
      toast.error("Failed to load conversations.");
    });
    const interval = window.setInterval(() => {
      fetchConversationsList().catch(() => undefined);
    }, CONVERSATION_POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [currentUser, fetchConversationsList]);

  useEffect(() => {
    const requestedConversationId = searchParams.get("conversationId");
    setSelectedConversationId(requestedConversationId);
  }, [searchParams]);

  useEffect(() => {
    if (!selectedConversationId || !currentUser) {
      setMessages([]);
      return;
    }

    if (!conversations.some((conversation) => conversation.id === selectedConversationId)) {
      ensureConversationLoaded(selectedConversationId).catch(() => undefined);
    }

    fetchConversationMessages(selectedConversationId).catch(() => {
      setMessages([]);
      toast.error("Failed to load messages for this conversation.");
    });

    const interval = window.setInterval(() => {
      fetchConversationMessages(selectedConversationId).catch(() => undefined);
    }, MESSAGE_POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [
    conversations,
    currentUser,
    ensureConversationLoaded,
    fetchConversationMessages,
    selectedConversationId,
  ]);

  useEffect(() => {
    persistStarredMessages(currentUser?.id || null, starredMessageIds);
  }, [currentUser?.id, starredMessageIds]);

  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversationId(conversation.id);
    setChatSearchTerm("");
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("conversationId", conversation.id);
    setSearchParams(nextParams);
  }, [searchParams, setSearchParams]);

  const handleCreateDirectChat = useCallback(async (user: User) => {
    try {
      const conversation = await createConversationApi({
        participantIds: [user.id],
        isGroup: false,
      });
      const normalized = toConversation(conversation, starredMessageIds);
      upsertConversation(normalized);
      setShowArchived(false);
      handleSelectConversation(normalized);
      setShowNewChatDialog(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to start a direct chat."));
    }
  }, [handleSelectConversation, starredMessageIds, upsertConversation]);

  const handleCreateGroupChat = useCallback(async (name: string, users: User[]) => {
    try {
      const conversation = await createConversationApi({
        name,
        isGroup: true,
        participantIds: users.map((user) => user.id),
      });
      const normalized = toConversation(conversation, starredMessageIds);
      upsertConversation(normalized);
      setShowArchived(false);
      handleSelectConversation(normalized);
      setShowNewChatDialog(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create the group chat."));
    }
  }, [handleSelectConversation, starredMessageIds, upsertConversation]);

  const handleSendMessage = useCallback(async (content: string, attachments?: Attachment[]) => {
    if (!selectedConversationId || !currentUser) return;
    if (!content.trim() && !(attachments || []).length) return;

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      content: content.trim(),
      timestamp: new Date(),
      status: "sent",
      attachments,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === selectedConversationId
          ? { ...conversation, lastMessage: optimisticMessage, updatedAt: new Date(), unreadCount: 0 }
          : conversation,
      ),
    );

    try {
      const sent = await sendMessageApi(selectedConversationId, {
        content: content.trim(),
        attachments: (attachments || []).map((attachment) => ({
          id: attachment.id,
          type: attachment.type === "image" ? "image" : "file",
          name: attachment.name,
          url: attachment.url,
          size: attachment.size,
        })),
      });

      const isStarred = (starredMessageIds[selectedConversationId] || []).includes(sent.id);
      const savedMessage = toMessage(sent, isStarred);

      setMessages((prev) =>
        prev.map((message) => (message.id === optimisticMessage.id ? savedMessage : message)),
      );
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === selectedConversationId
            ? { ...conversation, lastMessage: savedMessage, updatedAt: savedMessage.timestamp }
            : conversation,
        ),
      );
      fetchConversationsList().catch(() => undefined);
    } catch {
      setMessages((prev) => prev.filter((message) => message.id !== optimisticMessage.id));
      toast.error("Failed to send your message.");
    }
  }, [currentUser, fetchConversationsList, selectedConversationId, starredMessageIds]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!selectedConversationId) return;
    const existingMessages = messages;
    setMessages((prev) => prev.filter((message) => message.id !== messageId));
    try {
      await deleteMessageApi(selectedConversationId, messageId);
      fetchConversationsList().catch(() => undefined);
    } catch {
      setMessages(existingMessages);
      toast.error("Failed to delete that message.");
    }
  }, [fetchConversationsList, messages, selectedConversationId]);

  const handleEditMessage = useCallback(async (messageId: string) => {
    if (!selectedConversationId) return;
    const existing = messages.find((message) => message.id === messageId);
    if (!existing) return;

    const nextContent = window.prompt("Edit your message", existing.content);
    if (nextContent === null) return;
    if (!nextContent.trim()) {
      toast.error("Message content cannot be empty.");
      return;
    }

    try {
      const updated = await updateMessageApi(selectedConversationId, messageId, { content: nextContent.trim() });
      const isStarred = (starredMessageIds[selectedConversationId] || []).includes(updated.id);
      const normalized = toMessage(updated, isStarred);
      setMessages((prev) => prev.map((message) => (message.id === messageId ? normalized : message)));
      fetchConversationsList().catch(() => undefined);
    } catch {
      toast.error("Failed to update that message.");
    }
  }, [messages, fetchConversationsList, selectedConversationId, starredMessageIds]);

  const handleStarMessage = useCallback((message: Message) => {
    if (!selectedConversationId) return;
    setStarredMessageIds((prev) => {
      const current = new Set(prev[selectedConversationId] || []);
      if (current.has(message.id)) {
        current.delete(message.id);
      } else {
        current.add(message.id);
      }
      const next = { ...prev, [selectedConversationId]: Array.from(current) };
      setMessages((existing) =>
        existing.map((entry) =>
          entry.id === message.id ? { ...entry, isStarred: current.has(message.id) } : entry,
        ),
      );
      return next;
    });
  }, [selectedConversationId]);

  const handleReactMessage = useCallback((message: Message) => {
    const emoji = window.prompt("Add a quick reaction emoji", "👍");
    if (!emoji?.trim()) return;
    toast.success(`Reaction ${emoji.trim()} added for ${message.senderName || "this message"}.`);
  }, []);

  const handleForwardMessage = useCallback(async (message: Message) => {
    const target = window.prompt("Forward to which employee? Enter name or email.");
    if (!target?.trim()) return;

    const user = directoryUsers.find((entry) => {
      const value = target.trim().toLowerCase();
      return entry.name.toLowerCase() === value || entry.email.toLowerCase() === value;
    });

    if (!user) {
      toast.error("No matching employee was found in your company directory.");
      return;
    }

    try {
      const conversation = await createConversationApi({
        participantIds: [user.id],
        isGroup: false,
      });

      await sendMessageApi(conversation.id, {
        content: message.content,
        attachments: (message.attachments || []).map((attachment) => ({
          id: attachment.id,
          type: attachment.type === "image" ? "image" : "file",
          name: attachment.name,
          url: attachment.url,
          size: attachment.size,
        })),
      });

      toast.success(`Message forwarded to ${user.name}.`);
      fetchConversationsList().catch(() => undefined);
    } catch {
      toast.error("Failed to forward that message.");
    }
  }, [directoryUsers, fetchConversationsList]);

  const handleDownloadAttachment = useCallback((attachmentId: string) => {
    const attachment = messages
      .flatMap((message) => message.attachments || [])
      .find((entry) => entry.id === attachmentId);

    if (!attachment) {
      toast.error("Attachment not found.");
      return;
    }

    downloadAttachment(attachment);
  }, [messages]);

  const handleToggleConversationSetting = useCallback(async (
    conversationId: string,
    data: { isPinned?: boolean; isMuted?: boolean; isArchived?: boolean },
    successMessage?: string,
  ) => {
    try {
      const updated = await updateConversationSettingsApi(conversationId, data);
      const normalized = toConversation(updated, starredMessageIds);

      if (normalized.isArchived !== showArchived) {
        setConversations((prev) => prev.filter((conversation) => conversation.id !== conversationId));
      } else {
        upsertConversation(normalized);
      }

      if (data.isArchived && selectedConversationId === conversationId && !showArchived) {
        setSelectedConversationId(null);
        setMessages([]);
        removeConversationParam(searchParams, setSearchParams);
      }

      if (successMessage) {
        toast.success(successMessage);
      }
    } catch {
      toast.error("Could not update that chat.");
    }
  }, [searchParams, selectedConversationId, setSearchParams, showArchived, starredMessageIds, upsertConversation]);

  const handlePinConversation = useCallback((conversationId: string) => {
    const conversation = conversations.find((entry) => entry.id === conversationId);
    if (!conversation) return;
    handleToggleConversationSetting(
      conversationId,
      { isPinned: !conversation.isPinned },
      conversation.isPinned ? "Chat unpinned." : "Chat pinned.",
    );
  }, [conversations, handleToggleConversationSetting]);

  const handleMuteConversation = useCallback((conversationId: string) => {
    const conversation = conversations.find((entry) => entry.id === conversationId);
    if (!conversation) return;
    handleToggleConversationSetting(
      conversationId,
      { isMuted: !conversation.isMuted },
      conversation.isMuted ? "Notifications unmuted." : "Notifications muted.",
    );
  }, [conversations, handleToggleConversationSetting]);

  const handleArchiveConversation = useCallback((conversationId: string) => {
    handleToggleConversationSetting(conversationId, { isArchived: true }, "Chat archived.");
  }, [handleToggleConversationSetting]);

  const handleDeleteConversation = useCallback(async (conversationId: string) => {
    try {
      await deleteConversationApi(conversationId);
      setConversations((prev) => prev.filter((conversation) => conversation.id !== conversationId));
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
        setMessages([]);
        removeConversationParam(searchParams, setSearchParams);
      }
      toast.success("Chat removed from your list.");
    } catch {
      toast.error("Could not remove that chat.");
    }
  }, [searchParams, selectedConversationId, setSearchParams]);

  const handleSearchInChat = useCallback(() => {
    const input = window.prompt("Search this chat", chatSearchTerm);
    if (input === null) return;
    setChatSearchTerm(input.trim());
    if (input.trim()) {
      toast.success(`Filtering messages for "${input.trim()}".`);
    }
  }, [chatSearchTerm]);

  const handleToggleArchivedView = useCallback(() => {
    setShowArchived((prev) => !prev);
    setSelectedConversationId(null);
    setMessages([]);
    setShowInfoPanel(false);
    removeConversationParam(searchParams, setSearchParams);
  }, [searchParams, setSearchParams]);

  const handleToggleStarredView = useCallback(() => {
    setShowStarredOnly((prev) => !prev);
  }, []);

  const handleOpenSidebarSettings = useCallback(() => {
    if (!selectedConversation) {
      toast.info("Open a conversation first to view its chat settings.");
      return;
    }
    setShowInfoPanel(true);
  }, [selectedConversation]);

  const handleVoiceCall = useCallback((user: User | undefined | null) => {
    const phone = sanitizePhone(user?.phone);
    if (!phone) {
      toast.info("This employee does not have a phone number on file.");
      return;
    }
    window.location.href = `tel:${phone}`;
  }, []);

  const handleVideoCall = useCallback((user: User | undefined | null) => {
    window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer");
    if (user?.email) {
      toast.success(`Opened a video call room for ${user.name}. Invite them at ${user.email}.`);
    }
  }, []);

  const handleEmailUser = useCallback((user: User | undefined | null) => {
    if (!user?.email) {
      toast.info("This employee does not have an email address on file.");
      return;
    }
    window.location.href = `mailto:${encodeURIComponent(user.email)}`;
  }, []);

  if (loading || !currentUser) {
    return <div className="flex h-screen items-center justify-center bg-[#F8FAFC] text-[#475569]">Loading chat…</div>;
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <div className="flex-1 flex overflow-hidden">
        {(!isMobile || !selectedConversation) ? (
          <ChatSidebar
            conversations={visibleConversations}
            selectedConversation={selectedConversation}
            currentUser={currentUser}
            showArchived={showArchived}
            showStarredOnly={showStarredOnly}
            onSelectConversation={handleSelectConversation}
            onNewChat={() => {
              setNewChatTab("direct");
              setShowNewChatDialog(true);
            }}
            onNewGroup={() => {
              setNewChatTab("group");
              setShowNewChatDialog(true);
            }}
            onToggleArchived={handleToggleArchivedView}
            onToggleStarred={handleToggleStarredView}
            onOpenSettings={handleOpenSidebarSettings}
            onPinConversation={handlePinConversation}
            onMuteConversation={handleMuteConversation}
            onDeleteConversation={handleDeleteConversation}
            className={isMobile ? "w-full border-r-0" : undefined}
          />
        ) : null}

        {(!isMobile || selectedConversation) ? (
          <ChatWindow
            conversation={selectedConversation}
            messages={visibleMessages}
            currentUser={currentUser}
            isTyping={false}
            showInfoPanel={showInfoPanel}
            onToggleInfoPanel={() => setShowInfoPanel((prev) => !prev)}
            onSendMessage={handleSendMessage}
            onReactMessage={handleReactMessage}
            onForwardMessage={handleForwardMessage}
            onStarMessage={handleStarMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onDownloadAttachment={handleDownloadAttachment}
            onVoiceCall={() => handleVoiceCall(selectedConversation?.participants.find((user) => user.id !== currentUser.id))}
            onVideoCall={() => handleVideoCall(selectedConversation?.participants.find((user) => user.id !== currentUser.id))}
            onSearchInChat={handleSearchInChat}
            onArchiveConversation={() => selectedConversation && handleArchiveConversation(selectedConversation.id)}
            onPinConversation={() => selectedConversation && handlePinConversation(selectedConversation.id)}
            onMuteConversation={() => selectedConversation && handleMuteConversation(selectedConversation.id)}
            onDeleteConversation={() => selectedConversation && handleDeleteConversation(selectedConversation.id)}
            onNewChat={() => {
              setNewChatTab("direct");
              setShowNewChatDialog(true);
            }}
            onBack={isMobile ? () => {
              setSelectedConversationId(null);
              setMessages([]);
              setShowInfoPanel(false);
              removeConversationParam(searchParams, setSearchParams);
            } : undefined}
            isMobile={isMobile}
          />
        ) : null}

        <AnimatePresence>
          {showInfoPanel && selectedConversation && (
            <UserInfoPanel
              conversation={selectedConversation}
              messages={messages}
              currentUser={currentUser}
              onClose={() => setShowInfoPanel(false)}
              onCall={() => handleVoiceCall(selectedConversation.participants.find((user) => user.id !== currentUser.id))}
              onVideoCall={() => handleVideoCall(selectedConversation.participants.find((user) => user.id !== currentUser.id))}
              onEmail={() => handleEmailUser(selectedConversation.participants.find((user) => user.id !== currentUser.id))}
              onShowStarred={handleToggleStarredView}
              onMute={() => handleMuteConversation(selectedConversation.id)}
              onArchive={() => handleArchiveConversation(selectedConversation.id)}
              onDelete={() => handleDeleteConversation(selectedConversation.id)}
              onDownloadAttachment={handleDownloadAttachment}
              isMobile={isMobile}
            />
          )}
        </AnimatePresence>
      </div>

      <NewChatDialog
        open={showNewChatDialog}
        onOpenChange={setShowNewChatDialog}
        users={directoryUsers}
        initialTab={newChatTab}
        onCreateDirectChat={handleCreateDirectChat}
        onCreateGroupChat={handleCreateGroupChat}
      />
    </div>
  );
}
