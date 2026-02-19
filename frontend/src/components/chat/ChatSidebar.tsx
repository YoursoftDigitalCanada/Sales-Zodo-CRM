// src/components/chat/ChatSidebar.tsx

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Search,
  Plus,
  MoreVertical,
  Users,
  Archive,
  Star,
  Settings,
  Pin,
  BellOff,
  Trash2,
  Paperclip,
  MessageSquare,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Conversation, User, FilterType } from "./types";
import { StatusBadge } from "./StatusBadge";
import { formatMessageTime, getInitials, getOtherParticipant, getConversationName } from "./utils";

interface ChatSidebarProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  currentUser: User;
  onSelectConversation: (conversation: Conversation) => void;
  onNewChat: () => void;
  onPinConversation: (conversationId: string) => void;
  onMuteConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
}

export function ChatSidebar({
  conversations,
  selectedConversation,
  currentUser,
  onSelectConversation,
  onNewChat,
  onPinConversation,
  onMuteConversation,
  onDeleteConversation,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");

  // Filter conversations
  const filteredConversations = conversations
    .filter((conv) => {
      if (filterType === "unread") return conv.unreadCount > 0;
      if (filterType === "groups") return conv.type === "group";
      return true;
    })
    .filter((conv) => {
      if (!searchQuery) return true;
      const name = getConversationName(conv, currentUser.id);
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">Messages</h1>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onNewChat}
                  className="p-2 bg-[#23D3EE] text-white rounded-lg hover:bg-[#23D3EE]/90 transition-all shadow-lg shadow-[#23D3EE]/20"
                >
                  <Plus size={18} />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent>New Chat</TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <MoreVertical size={18} className="text-gray-500" />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <Users size={16} className="mr-2" />
                  New Group
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Archive size={16} className="mr-2" />
                  Archived Chats
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Star size={16} className="mr-2" />
                  Starred Messages
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings size={16} className="mr-2" />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-50 border-gray-200 focus:border-[#23D3EE] focus:ring-[#23D3EE]/20"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 mt-3">
          {(["all", "unread", "groups"] as FilterType[]).map((filter) => (
            <motion.button
              key={filter}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setFilterType(filter)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize",
                filterType === filter
                  ? "bg-[#23D3EE] text-white shadow-lg shadow-[#23D3EE]/20"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {filter}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <MessageSquare size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No conversations found</p>
              <p className="text-gray-400 text-sm mt-1">Start a new chat to get going</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredConversations.map((conversation, index) => {
                const otherParticipant = getOtherParticipant(conversation, currentUser.id);
                const isSelected = selectedConversation?.id === conversation.id;
                const displayName = getConversationName(conversation, currentUser.id);

                return (
                  <motion.div
                    key={conversation.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <DropdownMenu>
                      <motion.div whileHover={{ x: 4 }} className="relative">
                        <button
                          onClick={() => onSelectConversation(conversation)}
                          className={cn(
                            "w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left group relative",
                            isSelected
                              ? "bg-[#23D3EE]/10 border border-[#23D3EE]/20"
                              : "hover:bg-gray-50"
                          )}
                        >
                          {/* Pin indicator */}
                          {conversation.isPinned && (
                            <div className="absolute top-2 right-2">
                              <Pin size={12} className="text-[#23D3EE]" />
                            </div>
                          )}

                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            {conversation.type === "group" ? (
                              <div className="w-12 h-12 bg-gradient-to-br from-[#23D3EE] to-[#23D3EE]/70 rounded-xl flex items-center justify-center">
                                <Users size={20} className="text-white" />
                              </div>
                            ) : (
                              <div className="relative">
                                <Avatar className="w-12 h-12 rounded-xl">
                                  <AvatarImage src={otherParticipant.avatar} />
                                  <AvatarFallback className="bg-gradient-to-br from-[#23D3EE] to-[#6366F1] text-white rounded-xl">
                                    {getInitials(otherParticipant.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <StatusBadge status={otherParticipant.status} />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className={cn(
                                  "font-semibold truncate",
                                  isSelected ? "text-[#23D3EE]" : "text-gray-800"
                                )}
                              >
                                {displayName}
                              </span>
                              <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                                {conversation.lastMessage &&
                                  formatMessageTime(conversation.lastMessage.timestamp)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <p className="text-sm text-gray-500 truncate pr-2">
                                {conversation.lastMessage?.senderId === currentUser.id && (
                                  <span className="text-gray-400">You: </span>
                                )}
                                {conversation.lastMessage?.attachments?.length ? (
                                  <span className="flex items-center gap-1">
                                    <Paperclip size={12} />
                                    {conversation.lastMessage.attachments[0].name}
                                  </span>
                                ) : (
                                  conversation.lastMessage?.content
                                )}
                              </p>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {conversation.isMuted && <BellOff size={14} className="text-gray-400" />}
                                {conversation.unreadCount > 0 && (
                                  <span className="min-w-[20px] h-5 bg-[#23D3EE] text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5">
                                    {conversation.unreadCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>

                        {/* Context Menu Trigger */}
                        <DropdownMenuTrigger asChild>
                          <button className="absolute top-3 right-3 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-all">
                            <MoreVertical size={14} className="text-gray-500" />
                          </button>
                        </DropdownMenuTrigger>
                      </motion.div>

                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onPinConversation(conversation.id)}>
                          <Pin size={16} className="mr-2" />
                          {conversation.isPinned ? "Unpin" : "Pin Chat"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onMuteConversation(conversation.id)}>
                          <BellOff size={16} className="mr-2" />
                          {conversation.isMuted ? "Unmute" : "Mute"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDeleteConversation(conversation.id)}
                          className="text-red-600"
                        >
                          <Trash2 size={16} className="mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}