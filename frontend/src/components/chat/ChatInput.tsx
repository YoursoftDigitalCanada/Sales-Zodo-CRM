// src/components/chat/ChatInput.tsx

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Paperclip,
  Smile,
  Send,
  Mic,
  Image as ImageIcon,
  FileText,
  MapPin,
  Contact,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Message, Attachment } from "./types";

interface ChatInputProps {
  onSendMessage: (content: string, attachments?: Attachment[]) => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, replyingTo, onCancelReply, disabled }: ChatInputProps) {
  const [messageInput, setMessageInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!messageInput.trim()) return;
    onSendMessage(messageInput.trim());
    setMessageInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const attachment: Attachment = {
        id: `att-${Date.now()}`,
        type: isImage ? "image" : "file",
        name: file.name,
        url: URL.createObjectURL(file),
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        preview: isImage ? URL.createObjectURL(file) : undefined,
      };
      onSendMessage("", [attachment]);
    });

    event.target.value = "";
  };

  // Common emoji list
  const quickEmojis = ["👍", "❤️", "😊", "😂", "🎉", "🔥", "👏", "💯"];

  return (
    <div className="bg-white border-t border-[rgba(15,23,42,0.06)] p-4">
      <div className="max-w-3xl mx-auto">
        {/* Reply Preview */}
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 p-3 bg-white/5 rounded-md border-l-4 border-[#22D3EE] flex items-center justify-between"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#0891B2] font-medium mb-1">Replying to message</p>
              <p className="text-sm text-[#475569] truncate">{replyingTo.content}</p>
            </div>
            <button onClick={onCancelReply} className="p-1 hover:bg-gray-200 rounded-md ml-2">
              <X size={16} className="text-[#475569]" />
            </button>
          </motion.div>
        )}

        <div className="flex items-end gap-3">
          {/* Attachment Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={disabled}
                className="p-2.5 hover:bg-white/10 rounded-md transition-all disabled:opacity-50"
              >
                <Paperclip size={20} className="text-[#475569]" />
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <ImageIcon size={16} className="mr-2 text-[#0891B2]" />
                Photo & Video
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <FileText size={16} className="mr-2 text-[#D97706]" />
                Document
              </DropdownMenuItem>
              <DropdownMenuItem>
                <MapPin size={16} className="mr-2 text-red-500" />
                Location
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Contact size={16} className="mr-2 text-blue-500" />
                Contact
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
          />

          {/* Message Input */}
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Type a message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              className="pr-12 py-3 bg-white/5 border-[rgba(15,23,42,0.06)] rounded-md focus:border-[#22D3EE] focus:ring-[#22D3EE]/20"
            />

            {/* Emoji Button */}
            <DropdownMenu open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <DropdownMenuTrigger asChild>
                <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-200 rounded-md transition-all">
                  <Smile size={18} className="text-[#94A3B8]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="p-2">
                <div className="flex gap-1">
                  {quickEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setMessageInput((prev) => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="p-2 hover:bg-white/10 rounded-md text-xl transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Voice / Send Button */}
          {messageInput.trim() ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={disabled}
              className="p-3 bg-[#0891B2] text-white rounded-md hover:bg-[#0891B2]/90 transition-all  disabled:opacity-50"
            >
              <Send size={20} />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={disabled}
              className="p-3 bg-white/5 text-[#475569] rounded-md hover:bg-gray-200 transition-all disabled:opacity-50"
            >
              <Mic size={20} />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}