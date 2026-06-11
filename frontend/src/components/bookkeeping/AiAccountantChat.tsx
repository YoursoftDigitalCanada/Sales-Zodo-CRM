import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { askAiAccountant } from "@/features/bookkeeping/services/bookkeeping-service";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const PREDEFINED_PROMPTS = [
  "What were my total expenses last month?",
  "Explain how my net profit is calculated.",
  "Identify any unusual transactions.",
  "What is my current cash flow situation?",
];

export function AiAccountantChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your AI Accountant. I have real-time access to your ledger, accounts, and dashboard. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await askAiAccountant(text);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: response },
      ]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I'm sorry, I encountered an error while trying to process your request. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl border border-[rgba(15,23,42,0.06)] shadow-sm overflow-hidden">
      <div className="p-4 border-b border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0891B2]/10 text-[#0891B2]">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold text-[#0F172A]">AI Accounting Brain</h2>
          <p className="text-xs text-[#64748B]">Real-time intelligence from your ledger</p>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-6 pb-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0891B2]/10 text-[#0891B2]">
                  <Sparkles className="h-4 w-4" />
                </div>
              )}
              
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-[#0891B2] text-white"
                    : "bg-[#F8FAFC] text-[#0F172A] border border-[rgba(15,23,42,0.06)] prose prose-sm max-w-none"
                }`}
              >
                {msg.role === "assistant" ? (
                  <ReactMarkdown
                    components={{
                      table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table className="min-w-full divide-y divide-slate-200" {...props} /></div>,
                      thead: ({node, ...props}) => <thead className="bg-slate-50" {...props} />,
                      th: ({node, ...props}) => <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider" {...props} />,
                      td: ({node, ...props}) => <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-700 border-b border-slate-100" {...props} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>

              {msg.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0891B2]/10 text-[#0891B2]">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-[#F8FAFC] border border-[rgba(15,23,42,0.06)]">
                <Loader2 className="h-4 w-4 animate-spin text-[#0891B2]" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 bg-white border-t border-[rgba(15,23,42,0.06)]">
        {messages.length === 1 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {PREDEFINED_PROMPTS.map((prompt, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="rounded-full text-xs bg-[#F8FAFC] text-[#64748B] hover:text-[#0891B2] hover:border-[#0891B2]/30"
                onClick={() => sendMessage(prompt)}
                disabled={isLoading}
              >
                {prompt}
              </Button>
            ))}
          </div>
        )}
        
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your AI Accountant anything..."
            className="rounded-xl h-12 border-[rgba(15,23,42,0.06)] focus-visible:ring-[#0891B2]/20"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="h-12 w-12 rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
