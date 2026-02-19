// src/components/ai/AiCopilotPanel.tsx
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles,
    X,
    Send,
    BarChart3,
    Mail,
    TrendingUp,
    Users,
    Target,
    Loader2,
    Bot,
    User,
    Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

interface QuickPrompt {
    label: string;
    icon: React.ElementType;
    prompt: string;
}

interface AiCopilotPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

// ============================================
// QUICK PROMPTS
// ============================================

const quickPrompts: QuickPrompt[] = [
    {
        label: "Pipeline Summary",
        icon: Target,
        prompt: "Summarize my current pipeline status and highlight any leads that need attention.",
    },
    {
        label: "Revenue Analysis",
        icon: TrendingUp,
        prompt: "Analyze my revenue trends and provide a forecast for the next quarter.",
    },
    {
        label: "Client Email Draft",
        icon: Mail,
        prompt: "Draft a professional follow-up email to a client who hasn't responded in 7 days.",
    },
    {
        label: "Team Performance",
        icon: Users,
        prompt: "Give me a summary of team task completion rates and any bottlenecks.",
    },
    {
        label: "KPI Report",
        icon: BarChart3,
        prompt: "Generate a quick KPI report with highlights on revenue, leads, and tasks.",
    },
];

// ============================================
// SIMULATED AI RESPONSES
// ============================================

const simulatedResponses: Record<string, string> = {
    pipeline:
        "**Pipeline Health: Medium Risk**\n\nYour pipeline currently has 24 active leads across 4 stages:\n\n• **New** — 8 leads (3 high-value)\n• **Contacted** — 6 leads (2 need follow-up)\n• **Qualified** — 7 leads ($42K total value)\n• **Proposal Sent** — 3 leads ($18K pending)\n\n⚠️ **Action Required:** 3 leads have been stalled for 5+ days in the Contacted stage. Consider prioritizing follow-ups with TechStart Inc. and GreenLeaf Co.",
    revenue:
        "**Revenue Trend: +12% QoQ**\n\nYour revenue has been steadily increasing over the past 3 months:\n\n• **This Month:** $14,200 (+8% vs last month)\n• **Quarterly Run Rate:** $42,600\n• **Projected Q1:** $48,000\n\n📈 **Insight:** The growth is primarily driven by 3 new enterprise clients onboarded in the last 6 weeks. Consider expanding your enterprise outreach to maintain momentum.",
    email:
        "**Draft: Follow-up Email**\n\n---\n\nSubject: Checking In — Next Steps\n\nHi [Client Name],\n\nI hope you're doing well. I wanted to follow up on our recent conversation about [project/service]. I understand things can get busy, and I wanted to ensure we're aligned on the next steps.\n\nWould you have 15 minutes this week for a quick call? I have a few ideas that I think could add significant value to your team.\n\nLooking forward to hearing from you.\n\nBest regards,\n[Your Name]",
    team:
        "**Team Performance Summary**\n\n• **Task Completion Rate:** 78% (up from 72% last week)\n• **Average Task Duration:** 2.3 days\n• **Overdue Tasks:** 5 (down from 8)\n\n✅ **Top Performer:** Sarah completed 12 tasks this week\n⚠️ **Bottleneck:** Design review stage has 4 tasks pending for 3+ days",
    kpi:
        "**Quick KPI Report**\n\n| Metric | Value | Trend |\n|--------|-------|-------|\n| Revenue MTD | $14,200 | +8% ↑ |\n| Active Leads | 24 | +3 new |\n| Conversion Rate | 18% | +2% ↑ |\n| Tasks Completed | 34 | +12% ↑ |\n| Client Satisfaction | 4.6/5 | Stable |\n\n💡 **Key Insight:** Focus on converting the 7 qualified leads to proposals — they represent $42K in potential revenue.",
};

function getSimulatedResponse(input: string): string {
    const lower = input.toLowerCase();
    if (lower.includes("pipeline") || lower.includes("lead")) return simulatedResponses.pipeline;
    if (lower.includes("revenue") || lower.includes("forecast") || lower.includes("trend")) return simulatedResponses.revenue;
    if (lower.includes("email") || lower.includes("draft") || lower.includes("follow")) return simulatedResponses.email;
    if (lower.includes("team") || lower.includes("performance") || lower.includes("task completion")) return simulatedResponses.team;
    if (lower.includes("kpi") || lower.includes("report") || lower.includes("summary")) return simulatedResponses.kpi;

    return "**AI Analysis**\n\nBased on your CRM data, here's a quick overview:\n\n• **24 active leads** in your pipeline\n• **$14.2K revenue** this month (+8%)\n• **5 tasks** need attention today\n• **3 clients** haven't been contacted in 7+ days\n\nWould you like me to dive deeper into any of these areas? Try asking about pipeline status, revenue trends, or team performance.";
}

// ============================================
// COMPONENT
// ============================================

export function AiCopilotPanel({ isOpen, onClose }: AiCopilotPanelProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async (text: string) => {
        if (!text.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: text.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        // Simulate AI response delay
        await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));

        const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: getSimulatedResponse(text),
            timestamp: new Date(),
        };

        setIsTyping(false);
        setMessages((prev) => [...prev, aiMsg]);
    };

    const handleQuickPrompt = (prompt: string) => {
        handleSend(prompt);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSend(input);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="ai-copilot-overlay"
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: 400, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 400, opacity: 0 }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="ai-copilot-panel"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(15,23,42,0.06)]">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#0891B2]/8 flex items-center justify-center">
                                    <Sparkles size={16} className="text-[#0891B2]" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-[#0F172A]">
                                        Ask Experts
                                    </h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="ai-live-dot" />
                                        <span className="text-[10px] text-[#94A3B8]">
                                            AI Copilot
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-md hover:bg-[#F1F5F9] text-[#94A3B8] hover:text-[#475569] transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin">
                            {messages.length === 0 && (
                                <div className="ai-insight-enter">
                                    {/* Welcome */}
                                    <div className="text-center py-8">
                                        <div className="w-12 h-12 rounded-xl bg-[#0891B2]/8 flex items-center justify-center mx-auto mb-3">
                                            <Sparkles size={22} className="text-[#0891B2]" />
                                        </div>
                                        <h4 className="text-sm font-semibold text-[#0F172A] mb-1">
                                            AI Business Intelligence
                                        </h4>
                                        <p className="text-[11px] text-[#94A3B8] max-w-[260px] mx-auto leading-relaxed">
                                            Ask me about your pipeline, revenue trends, client
                                            insights, or get help drafting emails.
                                        </p>
                                    </div>

                                    {/* Quick Prompts */}
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider px-1">
                                            Quick Prompts
                                        </span>
                                        {quickPrompts.map((qp, i) => (
                                            <motion.button
                                                key={i}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                onClick={() => handleQuickPrompt(qp.prompt)}
                                                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md hover:bg-[#F1F5F9] transition-colors group text-left"
                                            >
                                                <div className="w-7 h-7 rounded-md bg-[#F1F5F9] flex items-center justify-center flex-shrink-0 group-hover:bg-[#0891B2]/8 transition-colors">
                                                    <qp.icon
                                                        size={13}
                                                        className="text-[#94A3B8] group-hover:text-[#0891B2] transition-colors"
                                                    />
                                                </div>
                                                <span className="text-xs text-[#475569] group-hover:text-[#0F172A] transition-colors">
                                                    {qp.label}
                                                </span>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Message List */}
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        "flex gap-2.5",
                                        msg.role === "user" ? "flex-row-reverse" : ""
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5",
                                            msg.role === "user"
                                                ? "bg-[#0891B2] text-white"
                                                : "bg-[#0891B2]/8"
                                        )}
                                    >
                                        {msg.role === "user" ? (
                                            <User size={13} />
                                        ) : (
                                            <Bot size={13} className="text-[#0891B2]" />
                                        )}
                                    </div>
                                    <div
                                        className={cn(
                                            "flex-1 max-w-[300px]",
                                            msg.role === "user" ? "text-right" : ""
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "inline-block text-left rounded-lg px-3 py-2.5",
                                                msg.role === "user"
                                                    ? "bg-[#0891B2] text-white"
                                                    : "bg-[#F8FAFC] border border-[rgba(15,23,42,0.06)]"
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "text-[12px] leading-relaxed whitespace-pre-wrap",
                                                    msg.role === "assistant" && "text-[#475569]"
                                                )}
                                            >
                                                {msg.content.split("\n").map((line, i) => {
                                                    // Simple markdown-like rendering
                                                    if (line.startsWith("**") && line.endsWith("**")) {
                                                        return (
                                                            <p
                                                                key={i}
                                                                className={cn(
                                                                    "font-semibold mb-1",
                                                                    msg.role === "assistant" && "text-[#0F172A]"
                                                                )}
                                                            >
                                                                {line.replace(/\*\*/g, "")}
                                                            </p>
                                                        );
                                                    }
                                                    if (line.startsWith("• ") || line.startsWith("- ")) {
                                                        return (
                                                            <p key={i} className="ml-2 mb-0.5">
                                                                {line}
                                                            </p>
                                                        );
                                                    }
                                                    if (line.startsWith("⚠️") || line.startsWith("📈") || line.startsWith("✅") || line.startsWith("💡")) {
                                                        return (
                                                            <p key={i} className="mt-2 mb-0.5">
                                                                {line}
                                                            </p>
                                                        );
                                                    }
                                                    if (line === "---") {
                                                        return (
                                                            <hr
                                                                key={i}
                                                                className="my-2 border-[rgba(15,23,42,0.08)]"
                                                            />
                                                        );
                                                    }
                                                    if (line.startsWith("|")) {
                                                        return (
                                                            <p
                                                                key={i}
                                                                className="font-mono text-[10px] leading-relaxed"
                                                            >
                                                                {line}
                                                            </p>
                                                        );
                                                    }
                                                    return line ? <p key={i}>{line}</p> : <br key={i} />;
                                                })}
                                            </div>
                                        </div>
                                        <p className="text-[9px] text-[#CBD5E1] mt-1 flex items-center gap-1">
                                            <Clock size={8} />
                                            {formatTime(msg.timestamp)}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}

                            {/* Typing indicator */}
                            {isTyping && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center gap-2.5"
                                >
                                    <div className="w-7 h-7 rounded-md bg-[#0891B2]/8 flex items-center justify-center">
                                        <Bot size={13} className="text-[#0891B2]" />
                                    </div>
                                    <div className="bg-[#F8FAFC] border border-[rgba(15,23,42,0.06)] rounded-lg px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                            <Loader2
                                                size={12}
                                                className="text-[#0891B2] animate-spin"
                                            />
                                            <span className="text-[11px] text-[#94A3B8]">
                                                Analyzing CRM data...
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="px-4 py-3 border-t border-[rgba(15,23,42,0.06)]">
                            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask about your CRM data..."
                                    disabled={isTyping}
                                    className="flex-1 h-9 px-3 rounded-md bg-[#F8FAFC] border border-[rgba(15,23,42,0.06)] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#0891B2]/30 transition-colors disabled:opacity-50"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isTyping}
                                    className="h-9 w-9 rounded-md bg-[#0891B2] text-white flex items-center justify-center hover:bg-[#0891B2]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Send size={14} />
                                </button>
                            </form>
                            <p className="text-[9px] text-[#CBD5E1] mt-2 text-center">
                                AI insights based on your CRM data · Powered by ZODO
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
