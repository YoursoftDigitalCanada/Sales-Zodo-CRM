// src/components/chat/MessageBubble.tsx

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Check,
  CheckCheck,
  Reply,
  Smile,
  MoreHorizontal,
  Copy,
  Forward,
  Star,
  Edit3,
  Trash2,
  FileText,
  Download,
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
import { Message } from "./types";
import { getInitials, formatFullTime } from "./utils";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  senderName: string;
  senderAvatar?: string;
  onReply?: (message: Message) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onCopy?: (content: string) => void;
}

// Message Status Icon Component
function MessageStatus({ status }: { status: Message["status"] }) {
  if (status === "sent") return <Check size={14} className="text-[#94A3B8]" />;
  if (status === "delivered") return <CheckCheck size={14} className="text-[#94A3B8]" />;
  return <CheckCheck size={14} className="text-[#0891B2]" />;
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar,
  senderName,
  senderAvatar,
  onReply,
  onEdit,
  onDelete,
  onCopy,
}: MessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3", isOwn ? "justify-end" : "justify-start")}
    >
      {/* Avatar (for others) */}
      {!isOwn && (
        <div className="w-8 flex-shrink-0">
          {showAvatar && (
            <Avatar className="w-8 h-8 rounded-md">
              <AvatarImage src={senderAvatar} />
              <AvatarFallback className="bg-[#F1F5F9] text-[#0F172A] text-xs rounded-md">
                {getInitials(senderName)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      {/* Message Bubble */}
      <div className={cn("max-w-[70%] group relative", isOwn ? "order-1" : "order-2")}>
        {/* Message Actions (on hover) */}
        <div
          className={cn(
            "absolute top-0 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 z-10",
            isOwn ? "left-0 -translate-x-full pr-2" : "right-0 translate-x-full pl-2"
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onReply?.(message)}
                className="p-1.5 hover:bg-gray-200 rounded-md bg-white shadow-sm"
              >
                <Reply size={14} className="text-[#475569]" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Reply</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1.5 hover:bg-gray-200 rounded-md bg-white shadow-sm">
                <Smile size={14} className="text-[#475569]" />
              </button>
            </TooltipTrigger>
            <TooltipContent>React</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 hover:bg-gray-200 rounded-md bg-white shadow-sm">
                <MoreHorizontal size={14} className="text-[#475569]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isOwn ? "start" : "end"}>
              <DropdownMenuItem onClick={() => onCopy?.(message.content)}>
                <Copy size={14} className="mr-2" />
                Copy
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Forward size={14} className="mr-2" />
                Forward
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Star size={14} className="mr-2" />
                Star
              </DropdownMenuItem>
              {isOwn && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onEdit?.(message.id)}>
                    <Edit3 size={14} className="mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete?.(message.id)} className="text-red-600">
                    <Trash2 size={14} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Bubble Content */}
        <div
          className={cn(
            "rounded-md px-4 py-2.5 shadow-sm",
            isOwn
              ? "bg-[#0891B2] text-white rounded-br-md"
              : "bg-white text-[#0F172A] rounded-bl-md border border-[rgba(15,23,42,0.06)]"
          )}
        >
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2 space-y-2">
              {message.attachments.map((attachment) => (
                <div key={attachment.id}>
                  {attachment.type === "image" ? (
                    <div className="rounded-md overflow-hidden">
                      <img
                        src={attachment.preview || attachment.url}
                        alt={attachment.name}
                        className="max-w-full h-auto rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                      />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-md",
                        isOwn ? "bg-white/10" : "bg-white/5"
                      )}
                    >
                      <div className={cn("p-2 rounded-md", isOwn ? "bg-white/20" : "bg-[#0891B2]/10")}>
                        <FileText size={20} className={isOwn ? "text-[#0F172A]" : "text-[#0891B2]"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm font-medium truncate",
                            isOwn ? "text-[#0F172A]" : "text-[#0F172A]"
                          )}
                        >
                          {attachment.name}
                        </p>
                        <p className={cn("text-xs", isOwn ? "text-[#0F172A]/70" : "text-[#475569]")}>
                          {attachment.size}
                        </p>
                      </div>
                      <button
                        className={cn(
                          "p-2 rounded-md transition-colors",
                          isOwn ? "hover:bg-white/20" : "hover:bg-gray-200"
                        )}
                      >
                        <Download size={16} className={isOwn ? "text-[#0F172A]" : "text-[#475569]"} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Message Text */}
          {message.content && <p className="text-sm leading-relaxed">{message.content}</p>}

          {/* Timestamp & Status */}
          <div className={cn("flex items-center gap-1 mt-1", isOwn ? "justify-end" : "justify-start")}>
            <span className={cn("text-[10px]", isOwn ? "text-[#0F172A]/70" : "text-[#94A3B8]")}>
              {formatFullTime(message.timestamp)}
            </span>
            {isOwn && <MessageStatus status={message.status} />}
          </div>
        </div>
      </div>
    </motion.div>
  );
}