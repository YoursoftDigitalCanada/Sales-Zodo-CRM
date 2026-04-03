// src/components/chat/ChatWindow.tsx

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
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
  onReactMessage?: (message: Message) => void;
  onForwardMessage?: (message: Message) => void;
  onStarMessage?: (message: Message) => void;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onDownloadAttachment?: (attachmentId: string) => void;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
  onSearchInChat?: () => void;
  onArchiveConversation?: () => void;
  onPinConversation: () => void;
  onMuteConversation: () => void;
  onDeleteConversation: () => void;
  onNewChat: () => void;
  onBack?: () => void;
  isMobile?: boolean;
}

export function ChatWindow({
  conversation,
  messages,
  currentUser,
  isTyping,
  showInfoPanel,
  onToggleInfoPanel,
  onSendMessage,
  onReactMessage,
  onForwardMessage,
  onStarMessage,
  onEditMessage,
  onDeleteMessage,
  onDownloadAttachment,
  onVoiceCall,
  onVideoCall,
  onSearchInChat,
  onArchiveConversation,
  onPinConversation,
  onMuteConversation,
  onDeleteConversation,
  onNewChat,
  onBack,
  isMobile = false,
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
      <div className="flex-1 flex items-center justify-center bg-white/5">
        <div className="text-center">
          <div className="w-24 h-24 bg-[#0891B2]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageSquare size={40} className="text-[#0891B2]" />
          </div>
          <h3 className="text-xl font-semibold text-[#0F172A] mb-2">Welcome to Messages</h3>
          <p className="text-[#475569] max-w-sm">
            Select a conversation from the left or start a new chat to begin messaging.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNewChat}
            className="mt-6 px-6 py-3 bg-[#0891B2] text-white rounded-md font-medium hover:bg-[#0891B2]/90 transition-all "
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
    <div className="flex-1 flex flex-col bg-white/5">
      {/* Header */}
      <ChatHeader
        conversation={conversation}
        currentUser={currentUser}
        showInfoPanel={showInfoPanel}
        onToggleInfoPanel={onToggleInfoPanel}
        onVoiceCall={onVoiceCall}
        onVideoCall={onVideoCall}
        onSearchInChat={onSearchInChat}
        onArchiveConversation={onArchiveConversation}
        onPinConversation={onPinConversation}
        onMuteConversation={onMuteConversation}
        onDeleteConversation={onDeleteConversation}
        onBack={onBack}
      />

      {/* Messages Area */}
      <ScrollArea className={isMobile ? "flex-1 px-3 py-4" : "flex-1 p-6"}>
        <div className={cn("mx-auto space-y-4", isMobile ? "max-w-full" : "max-w-3xl")}>
          {/* Date Separator */}
          <div className="flex items-center justify-center my-4">
            <div className="bg-white px-4 py-1.5 rounded-full text-xs text-[#475569] shadow-sm border border-[rgba(15,23,42,0.06)]">
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
                senderName={message.senderName || otherParticipant.name}
                senderAvatar={message.senderAvatar || otherParticipant.avatar}
                onReply={(msg) => setReplyingTo(msg)}
                onReact={onReactMessage}
                onForward={onForwardMessage}
                onStar={onStarMessage}
                onEdit={onEditMessage}
                onDelete={onDeleteMessage}
                onCopy={(content) => navigator.clipboard.writeText(content)}
                onDownloadAttachment={onDownloadAttachment}
                enableSwipeReply={isMobile}
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
              <Avatar className="w-8 h-8 rounded-md">
                <AvatarFallback className="bg-[#F1F5F9] text-[#0F172A] text-xs rounded-md">
                  {getInitials(otherParticipant.name)}
                </AvatarFallback>
              </Avatar>
              <div className="bg-white rounded-md rounded-bl-md px-4 py-3 shadow-sm border border-[rgba(15,23,42,0.06)]">
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
