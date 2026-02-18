// src/pages/Chat.tsx

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/Sidebar";
import {
  ChatSidebar,
  ChatWindow,
  UserInfoPanel,
  NewChatDialog,
  currentUser,
  mockUsers,
  mockConversations,
  generateMockMessages,
  Conversation,
  Message,
  Attachment,
  User,
} from "@/components/chat";

export default function ChatPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      setMessages(generateMockMessages(selectedConversation.id));
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
  const handleSendMessage = (content: string, attachments?: Attachment[]) => {
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

    // Simulate message delivery
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newMessage.id ? { ...m, status: "delivered" } : m))
      );
    }, 1000);

    // Simulate message read
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newMessage.id ? { ...m, status: "read" } : m))
      );
    }, 2000);

    // Update conversation's last message
    if (selectedConversation) {
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
  const handleDeleteMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

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
              onArchive={() => {}}
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