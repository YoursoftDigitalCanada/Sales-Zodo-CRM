import { useEffect, useMemo, useState } from "react";
import {
  MessageSquareText,
  Paperclip,
  RefreshCw,
  StickyNote,
  UserPlus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { WhatsAppConnection } from "@/features/whatsapp/whatsapp-store";

interface WhatsAppChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  phoneNumber: string;
  connection?: WhatsAppConnection | null;
  allowTeamAssignment?: boolean;
  allowAutomation?: boolean;
}

interface ChatMessage {
  id: string;
  direction: "incoming" | "outgoing";
  text: string;
  timestamp: string;
  status?: "delivered" | "failed";
}

function buildSeedMessages(contactName: string): ChatMessage[] {
  return [
    {
      id: "seed-1",
      direction: "incoming",
      text: `Hi Zodo team, this is ${contactName}. I need help with a new quote.`,
      timestamp: "10:14 AM",
    },
    {
      id: "seed-2",
      direction: "outgoing",
      text: "Absolutely. I can help with that right here in WhatsApp.",
      timestamp: "10:16 AM",
      status: "delivered",
    },
    {
      id: "seed-3",
      direction: "outgoing",
      text: "Could you share the project address so we can attach this conversation to the right record?",
      timestamp: "10:18 AM",
      status: "failed",
    },
  ];
}

export function WhatsAppChatSheet({
  open,
  onOpenChange,
  contactName,
  phoneNumber,
  connection,
  allowTeamAssignment = false,
  allowAutomation = false,
}: WhatsAppChatSheetProps) {
  const { toast } = useToast();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    buildSeedMessages(contactName),
  );

  useEffect(() => {
    if (open) {
      setDraft("");
      setMessages(buildSeedMessages(contactName));
    }
  }, [contactName, open, phoneNumber]);

  const statusLabel = useMemo(
    () => (contactName.toLowerCase().includes("test") ? "Online" : "Last seen 4m ago"),
    [contactName],
  );

  const sendMessage = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    const now = new Date();
    setMessages((current) => [
      ...current,
      {
        id: `out-${Date.now()}`,
        direction: "outgoing",
        text: trimmed,
        timestamp: now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        status: "delivered",
      },
    ]);
    setDraft("");
  };

  const retryMessage = (messageId: string) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? { ...message, status: "delivered" }
          : message,
      ),
    );

    toast({
      title: "Message retried",
      description: "The failed WhatsApp message is back in the send queue.",
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-l border-[rgba(15,23,42,0.08)] bg-white p-0 sm:max-w-2xl"
      >
        <div className="flex h-full flex-col bg-[#F8FAFC]">
          <div className="border-b border-[rgba(15,23,42,0.08)] bg-white px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4 pr-10">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-[#0F172A]">{contactName}</h2>
                  {connection ? (
                    <Badge
                      variant="outline"
                      className="border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]"
                    >
                      {connection.providerLabel}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-[#475569]">{phoneNumber}</p>
                <p className="mt-1 text-xs font-medium text-[#0F766E]">{statusLabel}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-[#CBD5E1] px-4"
                  onClick={() =>
                    toast({
                      title: allowTeamAssignment
                        ? "Assignment panel opened"
                        : "Premium feature",
                      description: allowTeamAssignment
                        ? "Choose a teammate to own this WhatsApp conversation."
                        : "Team assignment becomes available on the Premium plan.",
                    })
                  }
                >
                  <UserPlus />
                  Assign to team member
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-[#CBD5E1] px-4"
                  onClick={() =>
                    toast({
                      title: "Internal note added",
                      description: "A timeline note has been attached to this WhatsApp thread.",
                    })
                  }
                >
                  <StickyNote />
                  Add internal note
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                "Known numbers attach to existing leads or clients automatically.",
                "Unknown numbers can create a new lead record without leaving chat.",
                "Every message syncs into the CRM timeline for shared visibility.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] px-4 py-3 text-xs font-medium leading-5 text-[#475569]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1 px-4 py-5 sm:px-6">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.direction === "outgoing" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-[24px] px-4 py-3 shadow-[0_8px_30px_rgba(15,23,42,0.06)]",
                      message.direction === "outgoing"
                        ? "bg-[#0F766E] text-white"
                        : "border border-[rgba(15,23,42,0.06)] bg-white text-[#0F172A]",
                    )}
                  >
                    <p className="text-sm leading-6">{message.text}</p>
                    <div
                      className={cn(
                        "mt-2 flex items-center gap-2 text-[11px]",
                        message.direction === "outgoing"
                          ? "text-white/80"
                          : "text-[#64748B]",
                      )}
                    >
                      <span>{message.timestamp}</span>
                      {message.status === "failed" ? (
                        <>
                          <span className="rounded-full bg-[#7F1D1D]/20 px-2 py-0.5 text-[#FECACA]">
                            Failed
                          </span>
                          <button
                            type="button"
                            onClick={() => retryMessage(message.id)}
                            className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 font-medium hover:bg-white/25"
                          >
                            <RefreshCw size={12} />
                            Retry
                          </button>
                        </>
                      ) : message.direction === "outgoing" ? (
                        <span>Delivered</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="border-t border-[rgba(15,23,42,0.08)] bg-white px-6 py-5">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
              <Badge variant="outline" className="border-[#D1FAE5] bg-[#F0FDFA] text-[#0F766E]">
                Manual messaging
              </Badge>
              {allowAutomation ? (
                <Badge variant="outline" className="border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]">
                  Automation ready
                </Badge>
              ) : null}
              <span>Provider: {connection?.providerLabel ?? "WhatsApp"}</span>
            </div>

            <Separator className="mb-4" />

            <div className="flex items-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-2xl border-[#CBD5E1] text-[#64748B]"
                onClick={() =>
                  toast({
                    title: "Attachments coming soon",
                    description: "File sharing is reserved for a later WhatsApp enhancement.",
                  })
                }
              >
                <Paperclip />
              </Button>
              <div className="flex-1">
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type a WhatsApp message..."
                  className="h-12 rounded-2xl border-[rgba(15,23,42,0.08)] bg-[#F8FAFC] px-4"
                />
              </div>
              <Button
                type="button"
                onClick={sendMessage}
                className="h-12 rounded-2xl bg-[#0F766E] px-5 text-white hover:bg-[#115E59]"
              >
                <MessageSquareText />
                Send
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
