// src/components/ai/AiCopilotPanel.tsx
// ============================================================================
// CONTEXT-AWARE AI COPILOT PANEL
//
// Uses CopilotContextProvider to auto-detect the current page & entity.
// Sends POST /copilot/ask with {message, context} for real AI responses.
// Context badge in header shows what the copilot "sees".
// Quick prompts change dynamically based on the current module.
// ============================================================================

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
    MapPin,
    AlertCircle,
    RefreshCw,
    Zap,
    Briefcase,
    FolderKanban,
    DollarSign,
    CalendarDays,
    LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopilotContext } from "@/contexts/CopilotContext";
import { askCopilot } from "@/features/copilot";

// ============================================
// TYPES
// ============================================

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    suggestedActions?: string[];
    suggestedFollowUps?: string[];
    isError?: boolean;
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
// MODULE-SPECIFIC QUICK PROMPTS
// ============================================

const MODULE_PROMPTS: Record<string, QuickPrompt[]> = {
    dashboard: [
        { label: "Business Overview", icon: LayoutDashboard, prompt: "How is my business doing overall?" },
        { label: "Revenue Trends", icon: TrendingUp, prompt: "Analyze my revenue trends and growth." },
        { label: "Pipeline Summary", icon: Target, prompt: "Summarize my current pipeline health." },
        { label: "What to Focus On", icon: Zap, prompt: "What should I focus on this week?" },
    ],
    leads: [
        { label: "Pipeline Health", icon: Target, prompt: "How is my lead pipeline performing?" },
        { label: "Lead Analysis", icon: Users, prompt: "Tell me about this lead and what I should do next." },
        { label: "Stalled Leads", icon: AlertCircle, prompt: "Which leads are stalled and need follow-up?" },
        { label: "Conversion Tips", icon: TrendingUp, prompt: "How can I improve my conversion rate?" },
    ],
    clients: [
        { label: "Client Intelligence", icon: Briefcase, prompt: "How is this client doing?" },
        { label: "Client Portfolio", icon: Users, prompt: "Give me an overview of my client portfolio." },
        { label: "Retention Risk", icon: AlertCircle, prompt: "Which clients need attention?" },
        { label: "Growth Opportunities", icon: TrendingUp, prompt: "Where are my growth opportunities?" },
    ],
    projects: [
        { label: "Deal Status", icon: FolderKanban, prompt: "What's the status of this deal?" },
        { label: "At-Risk Deals", icon: AlertCircle, prompt: "Are any deals at risk?" },
        { label: "Task Overdue", icon: Clock, prompt: "What tasks are overdue?" },
        { label: "Resource Check", icon: Users, prompt: "How is the team workload?" },
    ],
    tasks: [
        { label: "Task Summary", icon: BarChart3, prompt: "Show me my task intelligence." },
        { label: "Overdue Tasks", icon: AlertCircle, prompt: "What tasks are overdue?" },
        { label: "Prioritize Today", icon: Zap, prompt: "What should I prioritize today?" },
        { label: "Team Workload", icon: Users, prompt: "How is team workload balanced?" },
    ],
    finance: [
        { label: "Financial Overview", icon: DollarSign, prompt: "How are my finances looking?" },
        { label: "Revenue Forecast", icon: TrendingUp, prompt: "What's my revenue forecast?" },
        { label: "Outstanding Balance", icon: AlertCircle, prompt: "How much revenue is outstanding?" },
        { label: "Expense Trends", icon: BarChart3, prompt: "Show me expense trends." },
    ],
    bookings: [
        { label: "Booking Status", icon: CalendarDays, prompt: "How are my bookings looking?" },
        { label: "Pending Bookings", icon: Clock, prompt: "What bookings need confirmation?" },
        { label: "Today's Schedule", icon: Zap, prompt: "What bookings do I have today?" },
    ],
    general: [
        { label: "Business Snapshot", icon: LayoutDashboard, prompt: "Give me a quick business snapshot." },
        { label: "Pipeline Summary", icon: Target, prompt: "Summarize my current pipeline status." },
        { label: "Revenue Analysis", icon: TrendingUp, prompt: "Analyze my revenue trends." },
        { label: "Team Performance", icon: Users, prompt: "Show me team task completion rates." },
        { label: "KPI Report", icon: BarChart3, prompt: "Generate a quick KPI report." },
    ],
};

// Module icon mapping for context badge
const MODULE_ICONS: Record<string, React.ElementType> = {
    dashboard: LayoutDashboard,
    leads: Target,
    clients: Briefcase,
    projects: FolderKanban,
    tasks: BarChart3,
    finance: DollarSign,
    bookings: CalendarDays,
    analytics: BarChart3,
    communication: Mail,
    hr: Users,
    general: Sparkles,
};

// ============================================
// COMPONENT
// ============================================

export function AiCopilotPanel({ isOpen, onClose }: AiCopilotPanelProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // ── Context-awareness ───────────────────────────────────────────
    const copilotCtx = useCopilotContext();
    const quickPrompts = MODULE_PROMPTS[copilotCtx.module] || MODULE_PROMPTS.general;
    const CtxIcon = MODULE_ICONS[copilotCtx.module] || Sparkles;

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ── API Call ─────────────────────────────────────────────────────
    const handleSend = async (text: string) => {
        if (!text.trim() || isTyping) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: text.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        try {
            const result = await askCopilot(text.trim(), {
                module: copilotCtx.module,
                entityId: copilotCtx.entityId,
                page: copilotCtx.page,
            });

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: result.answer || "I analyzed your data but couldn't generate a response. Please try rephrasing your question.",
                timestamp: new Date(),
                suggestedActions: result.suggestedActions || [],
                suggestedFollowUps: result.suggestedFollowUps || [],
            };

            setMessages((prev) => [...prev, aiMsg]);
        } catch (err: any) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: err.response?.status === 403
                    ? "You don't have permission to use the AI Copilot. Contact your administrator."
                    : "Something went wrong while analyzing your data. Please try again.",
                timestamp: new Date(),
                isError: true,
            };

            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleQuickPrompt = (prompt: string) => {
        handleSend(prompt);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSend(input);
    };

    const handleRetry = () => {
        const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
        if (lastUserMsg) {
            // Remove the error message
            setMessages((prev) => prev.filter(m => !m.isError));
            handleSend(lastUserMsg.content);
        }
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
                                        Ask Zodo AI
                                    </h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="ai-live-dot" />
                                        {/* Context Badge */}
                                        <div className="flex items-center gap-1">
                                            <MapPin size={8} className="text-[#0891B2]" />
                                            <span className="text-[10px] text-[#0891B2] font-medium">
                                                {copilotCtx.label}
                                            </span>
                                        </div>
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
                                            <CtxIcon size={22} className="text-[#0891B2]" />
                                        </div>
                                        <h4 className="text-sm font-semibold text-[#0F172A] mb-1">
                                            {copilotCtx.module === "general"
                                                ? "AI Business Intelligence"
                                                : `${copilotCtx.label} Intelligence`}
                                        </h4>
                                        <p className="text-[11px] text-[#94A3B8] max-w-[260px] mx-auto leading-relaxed">
                                            {copilotCtx.entityId
                                                ? `I can see the ${copilotCtx.module} you're viewing. Ask me anything about it.`
                                                : copilotCtx.module === "general"
                                                    ? "Ask me about your pipeline, revenue, deals, or get help with your CRM."
                                                    : `I'm aware you're in the ${copilotCtx.label} section. Ask me anything.`}
                                        </p>
                                    </div>

                                    {/* Quick Prompts */}
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider px-1">
                                            Quick Prompts
                                        </span>
                                        {quickPrompts.map((qp, i) => (
                                            <motion.button
                                                key={`${copilotCtx.module}-${i}`}
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
                                                : msg.isError
                                                    ? "bg-red-50"
                                                    : "bg-[#0891B2]/8"
                                        )}
                                    >
                                        {msg.role === "user" ? (
                                            <User size={13} />
                                        ) : msg.isError ? (
                                            <AlertCircle size={13} className="text-red-500" />
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
                                                    : msg.isError
                                                        ? "bg-red-50 border border-red-100"
                                                        : "bg-[#F8FAFC] border border-[rgba(15,23,42,0.06)]"
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "text-[12px] leading-relaxed whitespace-pre-wrap",
                                                    msg.role === "assistant" && !msg.isError && "text-[#475569]",
                                                    msg.isError && "text-red-600"
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
                                                    if (line.startsWith("⚠️") || line.startsWith("📈") || line.startsWith("✅") || line.startsWith("💡") || line.startsWith("🚨") || line.startsWith("🎉") || line.startsWith("📊") || line.startsWith("📝") || line.startsWith("🏆")) {
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

                                            {/* Error retry button */}
                                            {msg.isError && (
                                                <button
                                                    onClick={handleRetry}
                                                    className="mt-2 flex items-center gap-1.5 text-[10px] text-red-500 hover:text-red-700 transition-colors"
                                                >
                                                    <RefreshCw size={10} />
                                                    Try again
                                                </button>
                                            )}
                                        </div>

                                        {/* Suggested follow-ups */}
                                        {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && !isTyping && (
                                            <div className="mt-2 space-y-1">
                                                {msg.suggestedFollowUps.slice(0, 3).map((fu, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => handleSend(fu)}
                                                        className="block w-full text-left text-[10px] text-[#0891B2] hover:text-[#0891B2]/80 px-2 py-1 rounded hover:bg-[#0891B2]/5 transition-colors"
                                                    >
                                                        → {fu}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Suggested actions */}
                                        {msg.suggestedActions && msg.suggestedActions.length > 0 && !isTyping && (
                                            <div className="mt-1.5 flex flex-wrap gap-1">
                                                {msg.suggestedActions.slice(0, 3).map((action, i) => (
                                                    <span
                                                        key={i}
                                                        className="inline-block text-[9px] bg-[#0891B2]/8 text-[#0891B2] px-2 py-0.5 rounded-full"
                                                    >
                                                        {action}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

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
                                                Analyzing{copilotCtx.entityId ? ` ${copilotCtx.module}` : " CRM"} data...
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
                                    placeholder={copilotCtx.entityId
                                        ? `Ask about this ${copilotCtx.module.slice(0, -1)}...`
                                        : "Ask about your CRM data..."
                                    }
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
