// src/components/chat/UserInfoPanel.tsx

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  X,
  Phone,
  Video,
  Mail,
  Building2,
  MapPin,
  BellOff,
  Star,
  Archive,
  Trash2,
  FileText,
  Download,
  Phone as PhoneIcon,
  Users,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Conversation, User } from "./types";
import { StatusBadge } from "./StatusBadge";
import { getInitials, getOtherParticipant, formatLastSeen } from "./utils";

interface UserInfoPanelProps {
  conversation: Conversation;
  currentUser: User;
  onClose: () => void;
  onMute: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export function UserInfoPanel({
  conversation,
  currentUser,
  onClose,
  onMute,
  onArchive,
  onDelete,
}: UserInfoPanelProps) {
  const otherParticipant = getOtherParticipant(conversation, currentUser.id);

  // Mock shared files
  const sharedFiles = [
    { name: "Project_Timeline.pdf", size: "1.2 MB", date: "Today" },
    { name: "Budget_2024.xlsx", size: "856 KB", date: "Yesterday" },
    { name: "Contract_v2.docx", size: "245 KB", date: "Dec 15" },
  ];

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 320, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-white border-l border-[rgba(15,23,42,0.06)] overflow-hidden"
    >
      <div className="w-80 h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[rgba(15,23,42,0.06)] flex items-center justify-between">
          <h3 className="font-semibold text-[#0F172A]">Contact Info</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-md transition-all">
            <X size={18} className="text-[#475569]" />
          </button>
        </div>

        <ScrollArea className="flex-1">
          {conversation.type === "direct" ? (
            <>
              {/* Profile Section */}
              <div className="p-6 text-center border-b border-[rgba(15,23,42,0.06)]">
                <div className="relative inline-block mb-4">
                  <Avatar className="w-24 h-24 rounded-md">
                    <AvatarImage src={otherParticipant.avatar} />
                    <AvatarFallback className="bg-[#F1F5F9] text-[#0F172A] text-2xl rounded-md">
                      {getInitials(otherParticipant.name)}
                    </AvatarFallback>
                  </Avatar>
                  <StatusBadge status={otherParticipant.status} size="lg" />
                </div>
                <h4 className="text-lg font-semibold text-[#0F172A]">{otherParticipant.name}</h4>
                <p className="text-sm text-[#475569]">{otherParticipant.role}</p>
                <p className="text-xs text-[#94A3B8] mt-1">
                  {otherParticipant.status === "online"
                    ? "Active now"
                    : formatLastSeen(otherParticipant.lastSeen)}
                </p>

                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-3 mt-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-3 bg-[#0891B2]/10 text-[#0891B2] rounded-md hover:bg-[#0891B2]/20 transition-all"
                      >
                        <Phone size={18} />
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent>Call</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-3 bg-[#0891B2]/10 text-[#0891B2] rounded-md hover:bg-[#0891B2]/20 transition-all"
                      >
                        <Video size={18} />
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent>Video Call</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-3 bg-[#0891B2]/10 text-[#0891B2] rounded-md hover:bg-[#0891B2]/20 transition-all"
                      >
                        <Mail size={18} />
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent>Email</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Contact Details */}
              <div className="p-4 border-b border-[rgba(15,23,42,0.06)]">
                <h5 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">
                  Contact Details
                </h5>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-md">
                      <Mail size={16} className="text-[#475569]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#94A3B8]">Email</p>
                      <p className="text-sm text-[#0F172A]">{otherParticipant.email}</p>
                    </div>
                  </div>
                  {otherParticipant.phone && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/5 rounded-md">
                        <PhoneIcon size={16} className="text-[#475569]" />
                      </div>
                      <div>
                        <p className="text-xs text-[#94A3B8]">Phone</p>
                        <p className="text-sm text-[#0F172A]">{otherParticipant.phone}</p>
                      </div>
                    </div>
                  )}
                  {otherParticipant.company && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/5 rounded-md">
                        <Building2 size={16} className="text-[#475569]" />
                      </div>
                      <div>
                        <p className="text-xs text-[#94A3B8]">Company</p>
                        <p className="text-sm text-[#0F172A]">{otherParticipant.company}</p>
                      </div>
                    </div>
                  )}
                  {otherParticipant.location && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/5 rounded-md">
                        <MapPin size={16} className="text-[#475569]" />
                      </div>
                      <div>
                        <p className="text-xs text-[#94A3B8]">Location</p>
                        <p className="text-sm text-[#0F172A]">{otherParticipant.location}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Group Info */
            <div className="p-6 text-center border-b border-[rgba(15,23,42,0.06)]">
              <div className="w-24 h-24 bg-[#F1F5F9]/70 rounded-md flex items-center justify-center mx-auto mb-4">
                <Users size={40} className="text-[#0F172A]" />
              </div>
              <h4 className="text-lg font-semibold text-[#0F172A]">{conversation.name}</h4>
              <p className="text-sm text-[#475569]">{conversation.participants.length} members</p>

              {/* Group Members */}
              <div className="mt-4 text-left">
                <h5 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">
                  Members
                </h5>
                <div className="space-y-2">
                  {conversation.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5">
                      <div className="relative">
                        <Avatar className="w-10 h-10 rounded-md">
                          <AvatarImage src={participant.avatar} />
                          <AvatarFallback className="bg-[#F1F5F9] text-[#0F172A] text-xs rounded-md">
                            {getInitials(participant.name)}
                          </AvatarFallback>
                        </Avatar>
                        <StatusBadge status={participant.status} size="sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0F172A] truncate">
                          {participant.id === currentUser.id ? "You" : participant.name}
                        </p>
                        <p className="text-xs text-[#475569] truncate">{participant.role || participant.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Shared Media */}
          <div className="p-4 border-b border-[rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                Shared Media
              </h5>
              <button className="text-xs text-[#0891B2] font-medium hover:underline">See All</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className="aspect-square bg-white/5 rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <img
                    src={`https://picsum.photos/100/100?random=${item}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Shared Files */}
          <div className="p-4 border-b border-[rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                Shared Files
              </h5>
              <button className="text-xs text-[#0891B2] font-medium hover:underline">See All</button>
            </div>
            <div className="space-y-2">
              {sharedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <div className="p-2 bg-[#0891B2]/10 rounded-md">
                    <FileText size={16} className="text-[#0891B2]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] truncate">{file.name}</p>
                    <p className="text-xs text-[#94A3B8]">
                      {file.size} • {file.date}
                    </p>
                  </div>
                  <button className="p-1.5 hover:bg-gray-200 rounded-md">
                    <Download size={14} className="text-[#475569]" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Settings */}
          <div className="p-4">
            <h5 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">
              Chat Settings
            </h5>
            <div className="space-y-1">
              <button
                onClick={onMute}
                className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-white/5 transition-colors"
              >
                <BellOff size={18} className="text-[#475569]" />
                <span className="text-sm text-slate-200">
                  {conversation.isMuted ? "Unmute Notifications" : "Mute Notifications"}
                </span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-white/5 transition-colors">
                <Star size={18} className="text-[#475569]" />
                <span className="text-sm text-slate-200">Starred Messages</span>
              </button>
              <button
                onClick={onArchive}
                className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-white/5 transition-colors"
              >
                <Archive size={18} className="text-[#475569]" />
                <span className="text-sm text-slate-200">Archive Chat</span>
              </button>
              <button
                onClick={onDelete}
                className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-red-50 transition-colors text-red-600"
              >
                <Trash2 size={18} />
                <span className="text-sm">Delete Chat</span>
              </button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  );
}