// src/pages/Chat.tsx

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
import {
  ChatSidebar,
  ChatWindow,
  UserInfoPanel,
  NewChatDialog,
  currentUser,
  mockUsers,
  Conversation,
  Message,
  Attachment,
  User,
} from "@/components/chat";
import {
  getConversations,
  getMessages,
  sendMessage as sendMessageApi,
  deleteMessage as deleteMessageApi,
  createConversation as createConversationApi,
} from "@/features/chat";

export default function ChatPage() {
    const [searchParams] = useSearchParams();
    const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch conversations from API
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getConversations();
      const normalised: Conversation[] = (data as any[]).map((c: any) => ({
        id: c.id,
        type: c.type || 'direct',
        name: c.name || c.title,
        participants: c.participants || [],
        lastMessage: c.lastMessage,
        unreadCount: c.unreadCount || 0,
        isPinned: c.isPinned || false,
        isMuted: c.isMuted || false,
        createdAt: new Date(c.createdAt || Date.now()),
        updatedAt: new Date(c.updatedAt || Date.now()),
      }));
      setConversations(normalised);
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    const requestedConversationId = searchParams.get("conversationId");
    if (!requestedConversationId || conversations.length === 0) {
      return;
    }

    const requestedConversation = conversations.find((conversation) => conversation.id === requestedConversationId);
    if (requestedConversation && selectedConversation?.id !== requestedConversation.id) {
      setSelectedConversation(requestedConversation);
    }
  }, [conversations, searchParams, selectedConversation?.id]);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      (async () => {
        try {
          const data = await getMessages(selectedConversation.id);
          const msgs: Message[] = (data as any[]).map((m: any) => ({
            id: m.id,
            senderId: m.senderId || m.sender?.id || currentUser.id,
            content: m.content || m.body || '',
            timestamp: new Date(m.createdAt || m.timestamp || Date.now()),
            status: m.status || 'delivered',
            attachments: m.attachments,
          }));
          setMessages(msgs);
        } catch {
          setMessages([]);
        }
      })();
      // Mark conversation as read
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedConversation.id ? { ...c, unreadCount: 0 } : c))
      );
    }
  }, [selectedConversation?.id]);

  // Simulate typing indicator
  useEffect(() => {
    if (selectedConversation) {
      const timer = setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [selectedConversation?.id]);

  // Send message handler
  const handleSendMessage = async (content: string, attachments?: Attachment[]) => {
    if (!content.trim() && !attachments?.length) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      content,
      timestamp: new Date(),
      status: "sent",
      attachments,
    };

    setMessages((prev) => [...prev, newMessage]);

    // Send via API
    if (selectedConversation) {
      try {
        const sent = await sendMessageApi(selectedConversation.id, { content, attachments: attachments as any });
        setMessages((prev) =>
          prev.map((m) => (m.id === newMessage.id ? { ...m, id: (sent as any).id || m.id, status: "delivered" } : m))
        );
      } catch {
        // Optimistic — message stays in UI
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversation.id
            ? { ...c, lastMessage: newMessage, updatedAt: new Date() }
            : c
        )
      );
    }
  };

  // Delete message handler
  const handleDeleteMessage = async (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    if (selectedConversation) {
      try { await deleteMessageApi(selectedConversation.id, messageId); } catch { /* optimistic */ }
    }
  };

  // Pin conversation handler
  const handlePinConversation = (conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, isPinned: !c.isPinned } : c))
    );
  };

  // Mute conversation handler
  const handleMuteConversation = (conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, isMuted: !c.isMuted } : c))
    );
  };

  // Delete conversation handler
  const handleDeleteConversation = (conversationId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(null);
    }
  };

  // Create direct chat
  const handleCreateDirectChat = (user: User) => {
    // Check if conversation already exists
    const existingConv = conversations.find(
      (c) => c.type === "direct" && c.participants.some((p) => p.id === user.id)
    );

    if (existingConv) {
      setSelectedConversation(existingConv);
    } else {
      const newConversation: Conversation = {
        id: `conv-${Date.now()}`,
        type: "direct",
        participants: [currentUser, user],
        unreadCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setConversations((prev) => [newConversation, ...prev]);
      setSelectedConversation(newConversation);
    }
  };

  // Create group chat
  const handleCreateGroupChat = (name: string, users: User[]) => {
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      type: "group",
      name,
      participants: [currentUser, ...users],
      unreadCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setConversations((prev) => [newConversation, ...prev]);
    setSelectedConversation(newConversation);
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Sidebar removed: rendered globally in App.tsx */}

      {/* Main Chat Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Conversations List */}
        <ChatSidebar
          conversations={conversations}
          selectedConversation={selectedConversation}
          currentUser={currentUser}
          onSelectConversation={setSelectedConversation}
          onNewChat={() => setShowNewChatDialog(true)}
          onPinConversation={handlePinConversation}
          onMuteConversation={handleMuteConversation}
          onDeleteConversation={handleDeleteConversation}
        />

        {/* Center: Chat Window */}
        <ChatWindow
          conversation={selectedConversation}
          messages={messages}
          currentUser={currentUser}
          isTyping={isTyping}
          showInfoPanel={showInfoPanel}
          onToggleInfoPanel={() => setShowInfoPanel(!showInfoPanel)}
          onSendMessage={handleSendMessage}
          onDeleteMessage={handleDeleteMessage}
          onPinConversation={() =>
            selectedConversation && handlePinConversation(selectedConversation.id)
          }
          onMuteConversation={() =>
            selectedConversation && handleMuteConversation(selectedConversation.id)
          }
          onDeleteConversation={() =>
            selectedConversation && handleDeleteConversation(selectedConversation.id)
          }
          onNewChat={() => setShowNewChatDialog(true)}
        />

        {/* Right: Info Panel */}
        <AnimatePresence>
          {showInfoPanel && selectedConversation && (
            <UserInfoPanel
              conversation={selectedConversation}
              currentUser={currentUser}
              onClose={() => setShowInfoPanel(false)}
              onMute={() => handleMuteConversation(selectedConversation.id)}
              onArchive={() => { }}
              onDelete={() => handleDeleteConversation(selectedConversation.id)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* New Chat Dialog */}
      <NewChatDialog
        open={showNewChatDialog}
        onOpenChange={setShowNewChatDialog}
        users={mockUsers}
        onCreateDirectChat={handleCreateDirectChat}
        onCreateGroupChat={handleCreateGroupChat}
      />
    </div>
  );
}
