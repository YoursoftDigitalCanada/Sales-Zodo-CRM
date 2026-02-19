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
      className="bg-white border-l border-gray-200 overflow-hidden"
    >
      <div className="w-80 h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Contact Info</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-all">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <ScrollArea className="flex-1">
          {conversation.type === "direct" ? (
            <>
              {/* Profile Section */}
              <div className="p-6 text-center border-b border-gray-100">
                <div className="relative inline-block mb-4">
                  <Avatar className="w-24 h-24 rounded-2xl">
                    <AvatarImage src={otherParticipant.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-[#23D3EE] to-[#6366F1] text-white text-2xl rounded-2xl">
                      {getInitials(otherParticipant.name)}
                    </AvatarFallback>
                  </Avatar>
                  <StatusBadge status={otherParticipant.status} size="lg" />
                </div>
                <h4 className="text-lg font-semibold text-gray-800">{otherParticipant.name}</h4>
                <p className="text-sm text-gray-500">{otherParticipant.role}</p>
                <p className="text-xs text-gray-400 mt-1">
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
                        className="p-3 bg-[#23D3EE]/10 text-[#23D3EE] rounded-xl hover:bg-[#23D3EE]/20 transition-all"
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
                        className="p-3 bg-[#23D3EE]/10 text-[#23D3EE] rounded-xl hover:bg-[#23D3EE]/20 transition-all"
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
                        className="p-3 bg-[#23D3EE]/10 text-[#23D3EE] rounded-xl hover:bg-[#23D3EE]/20 transition-all"
                      >
                        <Mail size={18} />
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent>Email</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Contact Details */}
              <div className="p-4 border-b border-gray-100">
                <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Contact Details
                </h5>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Mail size={16} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="text-sm text-gray-800">{otherParticipant.email}</p>
                    </div>
                  </div>
                  {otherParticipant.phone && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <PhoneIcon size={16} className="text-gray-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Phone</p>
                        <p className="text-sm text-gray-800">{otherParticipant.phone}</p>
                      </div>
                    </div>
                  )}
                  {otherParticipant.company && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Building2 size={16} className="text-gray-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Company</p>
                        <p className="text-sm text-gray-800">{otherParticipant.company}</p>
                      </div>
                    </div>
                  )}
                  {otherParticipant.location && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <MapPin size={16} className="text-gray-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Location</p>
                        <p className="text-sm text-gray-800">{otherParticipant.location}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Group Info */
            <div className="p-6 text-center border-b border-gray-100">
              <div className="w-24 h-24 bg-gradient-to-br from-[#23D3EE] to-[#23D3EE]/70 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users size={40} className="text-white" />
              </div>
              <h4 className="text-lg font-semibold text-gray-800">{conversation.name}</h4>
              <p className="text-sm text-gray-500">{conversation.participants.length} members</p>

              {/* Group Members */}
              <div className="mt-4 text-left">
                <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Members
                </h5>
                <div className="space-y-2">
                  {conversation.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <div className="relative">
                        <Avatar className="w-10 h-10 rounded-xl">
                          <AvatarImage src={participant.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-[#23D3EE] to-[#6366F1] text-white text-xs rounded-xl">
                            {getInitials(participant.name)}
                          </AvatarFallback>
                        </Avatar>
                        <StatusBadge status={participant.status} size="sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {participant.id === currentUser.id ? "You" : participant.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{participant.role || participant.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Shared Media */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Shared Media
              </h5>
              <button className="text-xs text-[#23D3EE] font-medium hover:underline">See All</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
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
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Shared Files
              </h5>
              <button className="text-xs text-[#23D3EE] font-medium hover:underline">See All</button>
            </div>
            <div className="space-y-2">
              {sharedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="p-2 bg-[#23D3EE]/10 rounded-lg">
                    <FileText size={16} className="text-[#23D3EE]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">
                      {file.size} • {file.date}
                    </p>
                  </div>
                  <button className="p-1.5 hover:bg-gray-200 rounded-lg">
                    <Download size={14} className="text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Settings */}
          <div className="p-4">
            <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Chat Settings
            </h5>
            <div className="space-y-1">
              <button
                onClick={onMute}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <BellOff size={18} className="text-gray-500" />
                <span className="text-sm text-gray-700">
                  {conversation.isMuted ? "Unmute Notifications" : "Mute Notifications"}
                </span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <Star size={18} className="text-gray-500" />
                <span className="text-sm text-gray-700">Starred Messages</span>
              </button>
              <button
                onClick={onArchive}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Archive size={18} className="text-gray-500" />
                <span className="text-sm text-gray-700">Archive Chat</span>
              </button>
              <button
                onClick={onDelete}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 transition-colors text-red-600"
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