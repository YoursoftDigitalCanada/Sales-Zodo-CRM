// src/components/ai/AiSummaryCard.tsx
import { Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuggestedAction {
    label: string;
    onClick?: () => void;
}

interface AiSummaryCardProps {
    title?: string;
    summary: string;
    insights?: string[];
    suggestedActions?: SuggestedAction[];
    className?: string;
}

export function AiSummaryCard({
    title = "AI Insights",
    summary,
    insights,
    suggestedActions,
    className,
}: AiSummaryCardProps) {
    return (
        <div
            className={cn(
                "rounded-lg bg-white border-l-[3px] border-l-[#0891B2] p-4 ai-insight-enter",
                className
            )}
            style={{
                boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.04)",
            }}
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-[#0891B2]/8 flex items-center justify-center">
                    <Sparkles size={13} className="text-[#0891B2]" />
                </div>
                <span className="text-xs font-semibold text-[#0F172A] tracking-tight">
                    {title}
                </span>
                <span className="ai-tag ml-auto">AI</span>
            </div>

            {/* Summary */}
            <p className="text-[12px] text-[#475569] leading-relaxed mb-3">
                {summary}
            </p>

            {/* Insight bullets */}
            {insights && insights.length > 0 && (
                <div className="space-y-1.5 mb-3">
                    {insights.map((insight, i) => (
                        <div key={i} className="flex items-start gap-2">
                            <div className="w-1 h-1 rounded-full bg-[#0891B2] mt-1.5 flex-shrink-0" />
                            <span className="text-[11px] text-[#475569] leading-relaxed">
                                {insight}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Suggested Actions */}
            {suggestedActions && suggestedActions.length > 0 && (
                <div className="pt-2 border-t border-[rgba(15,23,42,0.06)] space-y-1">
                    <span className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider">
                        Suggested Actions
                    </span>
                    {suggestedActions.map((action, i) => (
                        <button
                            key={i}
                            onClick={action.onClick}
                            className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md hover:bg-[#F1F5F9] transition-colors group"
                        >
                            <ArrowRight
                                size={10}
                                className="text-[#0891B2] group-hover:translate-x-0.5 transition-transform"
                            />
                            <span className="text-[11px] text-[#0891B2] font-medium">
                                {action.label}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
