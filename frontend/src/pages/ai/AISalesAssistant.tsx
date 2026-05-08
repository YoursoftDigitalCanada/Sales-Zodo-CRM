import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bot, ExternalLink, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { askSalesAI } from "@/features/sales-ai";

const PROMPTS = [
  "Show hot leads",
  "Which deals are closing this week?",
  "Which reps have overdue tasks?",
  "Show high-value deals without next task",
  "Which subscriptions renew this month?",
];

export default function AISalesAssistantPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string; records?: any[]; aiAvailable?: boolean }>>([
    { role: "assistant", text: "Ask me about leads, accounts, contacts, deals, proposals, invoices, payments, subscriptions, sales reps, or lead sources." },
  ]);
  const askMutation = useMutation({
    mutationFn: (message: string) => askSalesAI(message),
    onSuccess: (data, message) => {
      setMessages((items) => [...items, { role: "assistant", text: data.answer, records: data.records || [], aiAvailable: data.aiAvailable }]);
      setInput("");
    },
  });
  const send = (message = input) => {
    if (!message.trim()) return;
    setMessages((items) => [...items, { role: "user", text: message }]);
    askMutation.mutate(message);
  };
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-[#E2E8F0] bg-white px-6 py-5">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-3"><div className="rounded-lg bg-[#0891B2]/10 p-2 text-[#0891B2]"><Sparkles size={22} /></div><div><h1 className="text-2xl font-semibold text-[#0F172A]">AI Sales Assistant</h1><p className="text-sm text-[#64748B]">Natural-language CRM search and sales guidance for selling Roofer CRM.</p></div></div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        <div className="flex flex-wrap gap-2">{PROMPTS.map((prompt) => <Button key={prompt} variant="outline" size="sm" onClick={() => send(prompt)}>{prompt}</Button>)}</div>
        <section className="min-h-[520px] rounded-lg border border-[#E2E8F0] bg-white p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index} className={message.role === "user" ? "ml-auto max-w-2xl rounded-lg bg-[#0891B2] px-4 py-3 text-white" : "max-w-3xl rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-[#334155]"}>
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase opacity-80">{message.role === "assistant" ? <Bot size={14} /> : null}{message.role === "assistant" ? "Sales AI" : "You"}{message.aiAvailable === false ? <Badge variant="outline">Deterministic mode</Badge> : null}</div>
                <p className="whitespace-pre-wrap text-sm">{message.text}</p>
                {message.records?.length ? <div className="mt-3 grid gap-2">{message.records.map((record) => <a key={`${record.type}-${record.id}`} href={record.href} className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm text-[#0F172A] hover:bg-[#ECFEFF]"><span><strong>{record.type}</strong> · {record.label}<span className="ml-2 text-[#64748B]">{record.meta}</span></span><ExternalLink size={14} /></a>)}</div> : null}
              </div>
            ))}
            {askMutation.isPending ? <div className="max-w-xl rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#64748B]">Thinking through your sales data...</div> : null}
          </div>
        </section>
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask: Why is this deal stuck?" />
          <Button type="submit" className="gap-2 bg-[#0891B2] hover:bg-[#0E7490]"><Send size={16} />Ask AI</Button>
        </form>
      </main>
    </div>
  );
}
