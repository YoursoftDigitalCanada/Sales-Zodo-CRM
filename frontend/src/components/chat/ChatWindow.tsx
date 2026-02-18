// src/components/chat/ChatWindow.tsx

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Conversation, Message, User, Attachment } from "./types";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { getInitials, getOtherParticipant } from "./utils";

interface ChatWindowProps {
  conversation: Conversation | null;
  messages: Message[];
  currentUser: User;
  isTyping: boolean;
  showInfoPanel: boolean;
  onToggleInfoPanel: () => void;
  onSendMessage: (content: string, attachments?: Attachment[]) => void;
  onDeleteMessage: (messageId: string) => void;
  onPinConversation: () => void;
  onMuteConversation: () => void;
  onDeleteConversation: () => void;
  onNewChat: () => void;
}

export function ChatWindow({
  conversation,
  messages,
  currentUser,
  isTyping,
  showInfoPanel,
  onToggleInfoPanel,
  onSendMessage,
  onDeleteMessage,
  onPinConversation,
  onMuteConversation,
  onDeleteConversation,
  onNewChat,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // No conversation selected state
  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-24 h-24 bg-[#17C3B2]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageSquare size={40} className="text-[#17C3B2]" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Welcome to Messages</h3>
          <p className="text-gray-500 max-w-sm">
            Select a conversation from the left or start a new chat to begin messaging.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNewChat}
            className="mt-6 px-6 py-3 bg-[#17C3B2] text-white rounded-xl font-medium hover:bg-[#17C3B2]/90 transition-all shadow-lg shadow-[#17C3B2]/20"
          >
            <Plus size={18} className="inline mr-2" />
            Start New Chat
          </motion.button>
        </div>
      </div>
    );
  }

  const otherParticipant = getOtherParticipant(conversation, currentUser.id);

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header */}
      <ChatHeader
        conversation={conversation}
        currentUser={currentUser}
        showInfoPanel={showInfoPanel}
        onToggleInfoPanel={onToggleInfoPanel}
        onPinConversation={onPinConversation}
        onMuteConversation={onMuteConversation}
        onDeleteConversation={onDeleteConversation}
      />

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Date Separator */}
          <div className="flex items-center justify-center my-4">
            <div className="bg-white px-4 py-1.5 rounded-full text-xs text-gray-500 shadow-sm border border-gray-100">
              Today
            </div>
          </div>

          {/* Messages */}
          {messages.map((message, index) => {
            const isOwn = message.senderId === currentUser.id;
            const showAvatar =
              !isOwn && (index === 0 || messages[index - 1].senderId !== message.senderId);

            return (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={isOwn}
                showAvatar={showAvatar}
                senderName={otherParticipant.name}
                senderAvatar={otherParticipant.avatar}
                onReply={(msg) => setReplyingTo(msg)}
                onDelete={onDeleteMessage}
                onCopy={(content) => navigator.clipboard.writeText(content)}
              />
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <Avatar className="w-8 h-8 rounded-lg">
                <AvatarFallback className="bg-gradient-to-br from-[#17C3B2] to-[#C9A14A] text-white text-xs rounded-lg">
                  {getInitials(otherParticipant.name)}
                </AvatarFallback>
              </Avatar>
              <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
                <TypingIndicator />
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <ChatInput
        onSendMessage={onSendMessage}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </div>
  );
}