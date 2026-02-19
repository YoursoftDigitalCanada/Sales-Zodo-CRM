// src/components/chat/ChatHeader.tsx

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Phone,
  Video,
  Info,
  MoreVertical,
  ArrowLeft,
  Pin,
  BellOff,
  Search,
  Archive,
  Trash2,
  Users,
  Circle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Conversation, User } from "./types";
import { StatusBadge } from "./StatusBadge";
import { getInitials, getOtherParticipant, getConversationName, formatLastSeen } from "./utils";

interface ChatHeaderProps {
  conversation: Conversation;
  currentUser: User;
  showInfoPanel: boolean;
  onToggleInfoPanel: () => void;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
  onPinConversation: () => void;
  onMuteConversation: () => void;
  onDeleteConversation: () => void;
  onBack?: () => void;
}

export function ChatHeader({
  conversation,
  currentUser,
  showInfoPanel,
  onToggleInfoPanel,
  onVoiceCall,
  onVideoCall,
  onPinConversation,
  onMuteConversation,
  onDeleteConversation,
  onBack,
}: ChatHeaderProps) {
  const otherParticipant = getOtherParticipant(conversation, currentUser.id);
  const displayName = getConversationName(conversation, currentUser.id);

  return (
    <div className="bg-white border-b border-[rgba(15,23,42,0.06)] px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Mobile back button */}
        {onBack && (
          <button onClick={onBack} className="lg:hidden p-2 hover:bg-white/10 rounded-md">
            <ArrowLeft size={20} />
          </button>
        )}

        {/* Avatar */}
        <div className="relative">
          {conversation.type === "group" ? (
            <div className="w-11 h-11 bg-[#F1F5F9]/70 rounded-md flex items-center justify-center">
              <Users size={20} className="text-[#0F172A]" />
            </div>
          ) : (
            <div className="relative">
              <Avatar className="w-11 h-11 rounded-md">
                <AvatarImage src={otherParticipant.avatar} />
                <AvatarFallback className="bg-[#F1F5F9] text-[#0F172A] rounded-md">
                  {getInitials(otherParticipant.name)}
                </AvatarFallback>
              </Avatar>
              <StatusBadge status={otherParticipant.status} />
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h2 className="font-semibold text-[#0F172A]">{displayName}</h2>
          <p className="text-sm text-[#475569]">
            {conversation.type === "group" ? (
              `${conversation.participants.length} members`
            ) : otherParticipant.status === "online" ? (
              <span className="text-green-500 flex items-center gap-1">
                <Circle size={8} className="fill-current" />
                Online
              </span>
            ) : (
              formatLastSeen(otherParticipant.lastSeen)
            )}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onVoiceCall}
              className="p-2.5 hover:bg-white/10 rounded-md transition-all"
            >
              <Phone size={18} className="text-[#475569]" />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent>Voice Call</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onVideoCall}
              className="p-2.5 hover:bg-white/10 rounded-md transition-all"
            >
              <Video size={18} className="text-[#475569]" />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent>Video Call</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleInfoPanel}
              className={cn(
                "p-2.5 rounded-md transition-all",
                showInfoPanel ? "bg-[#0891B2] text-white" : "hover:bg-white/10 text-[#475569]"
              )}
            >
              <Info size={18} />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent>Contact Info</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2.5 hover:bg-white/10 rounded-md transition-all"
            >
              <MoreVertical size={18} className="text-[#475569]" />
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onPinConversation}>
              <Pin size={16} className="mr-2" />
              {conversation.isPinned ? "Unpin Chat" : "Pin Chat"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMuteConversation}>
              <BellOff size={16} className="mr-2" />
              {conversation.isMuted ? "Unmute" : "Mute Notifications"}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Search size={16} className="mr-2" />
              Search in Chat
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Archive size={16} className="mr-2" />
              Archive Chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDeleteConversation} className="text-red-600">
              <Trash2 size={16} className="mr-2" />
              Delete Chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}