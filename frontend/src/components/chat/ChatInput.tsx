// src/components/chat/ChatInput.tsx

import { useRef, useState } from "react";
import { motion } from "framer-motion";
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
import { useToast } from "@/components/ui/use-toast";
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
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  const handleSend = () => {
    if (!messageInput.trim()) return;
    onSendMessage(messageInput.trim());
    setMessageInput("");
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    try {
      const attachments: Attachment[] = await Promise.all(
        Array.from(files).map(async (file, index) => {
          const isImage = file.type.startsWith("image/");
          const dataUrl = await readFileAsDataUrl(file);
          return {
            id: `att-${Date.now()}-${index}`,
            type: isImage ? "image" : "file",
            name: file.name,
            url: dataUrl,
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            preview: isImage ? dataUrl : undefined,
          };
        }),
      );

      onSendMessage("", attachments);
    } catch (error) {
      toast({
        title: "Attachment failed",
        description: error instanceof Error ? error.message : "Could not attach the selected file.",
        variant: "destructive",
      });
    } finally {
      event.target.value = "";
    }
  };

  const handleInsertLocation = () => {
    const address = window.prompt("Enter the address or site location");
    if (!address?.trim()) return;
    const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(address.trim())}`;
    setMessageInput((prev) => `${prev}${prev ? " " : ""}${address.trim()} ${mapsUrl}`.trim());
  };

  const handleInsertContact = () => {
    const contactName = window.prompt("Enter the contact name");
    if (!contactName?.trim()) return;
    const contactValue = window.prompt("Enter the phone number or email");
    if (!contactValue?.trim()) return;
    setMessageInput((prev) =>
      `${prev}${prev ? "\n" : ""}Contact: ${contactName.trim()} - ${contactValue.trim()}`.trim(),
    );
  };

  const handleVoiceInput = () => {
    const SpeechRecognitionCtor =
      typeof window !== "undefined"
        ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
        : undefined;

    if (!SpeechRecognitionCtor) {
      const dictatedText = window.prompt("Voice input is not available in this browser. Type what you want to add:");
      if (dictatedText?.trim()) {
        setMessageInput((prev) => `${prev}${prev ? " " : ""}${dictatedText.trim()}`.trim());
      }
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsRecording(false);
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
      setIsRecording(false);
      toast({
        title: "Voice input unavailable",
        description: "Your browser could not capture voice input right now.",
        variant: "destructive",
      });
    };
    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript;
      if (transcript?.trim()) {
        setMessageInput((prev) => `${prev}${prev ? " " : ""}${transcript.trim()}`.trim());
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
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
              <DropdownMenuItem onClick={handleInsertLocation}>
                <MapPin size={16} className="mr-2 text-red-500" />
                Location
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleInsertContact}>
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
              onClick={handleVoiceInput}
              disabled={disabled}
              className="p-3 bg-white/5 text-[#475569] rounded-md hover:bg-gray-200 transition-all disabled:opacity-50"
            >
              <Mic size={20} className={isRecording ? "text-[#0891B2]" : undefined} />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
