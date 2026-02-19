// src/components/ai/AiInsightBadge.tsx
import { cn } from "@/lib/utils";
import {
    Sparkles,
    Flame,
    AlertTriangle,
    PhoneForwarded,
    TrendingUp,
    ShieldAlert,
    UserX,
    Clock,
    Zap,
    Star,
    type LucideIcon,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

export type AiInsightType =
    | "hot_lead"
    | "high_conversion"
    | "follow_up"
    | "risk_detected"
    | "inactive_alert"
    | "overdue"
    | "priority_escalation"
    | "trending_up"
    | "ai_insight"
    | "vip_client";

interface AiInsightConfig {
    label: string;
    icon: LucideIcon;
    variant: "cyan" | "amber" | "red" | "green" | "neutral";
}

// ============================================
// INSIGHT CONFIG MAP
// ============================================

const insightConfigs: Record<AiInsightType, AiInsightConfig> = {
    hot_lead: { label: "Hot Lead", icon: Flame, variant: "red" },
    high_conversion: { label: "High Conversion", icon: TrendingUp, variant: "green" },
    follow_up: { label: "Follow-up Recommended", icon: PhoneForwarded, variant: "amber" },
    risk_detected: { label: "Risk Detected", icon: ShieldAlert, variant: "red" },
    inactive_alert: { label: "Inactive Alert", icon: UserX, variant: "amber" },
    overdue: { label: "Overdue", icon: Clock, variant: "red" },
    priority_escalation: { label: "Priority Escalation", icon: AlertTriangle, variant: "amber" },
    trending_up: { label: "Trending Up", icon: TrendingUp, variant: "green" },
    ai_insight: { label: "AI Insight", icon: Sparkles, variant: "cyan" },
    vip_client: { label: "VIP Client", icon: Star, variant: "cyan" },
};

// ============================================
// COMPONENT
// ============================================

interface AiInsightBadgeProps {
    type: AiInsightType;
    label?: string;
    className?: string;
    showIcon?: boolean;
    size?: "sm" | "md";
}

export function AiInsightBadge({
    type,
    label,
    className,
    showIcon = true,
    size = "sm",
}: AiInsightBadgeProps) {
    const config = insightConfigs[type];
    if (!config) return null;

    const Icon = config.icon;
    const displayLabel = label || config.label;

    return (
        <span
            className={cn(
                "ai-badge ai-insight-enter",
                `ai-badge-${config.variant}`,
                size === "md" && "px-2.5 py-1 text-[11px]",
                className
            )}
        >
            {showIcon && <Icon size={size === "sm" ? 10 : 12} strokeWidth={2} />}
            {displayLabel}
        </span>
    );
}

// ============================================
// UTILITY: Generate insights from CRM data
// ============================================

export function getLeadInsights(lead: {
    score?: number;
    temperature?: string;
    status?: string;
    lastContact?: string;
    value?: number;
    nextFollowUp?: string;
}): AiInsightType[] {
    const insights: AiInsightType[] = [];

    // Hot lead detection
    if (lead.score && lead.score >= 80) {
        insights.push("hot_lead");
    } else if (lead.temperature === "hot" || lead.temperature === "warm") {
        insights.push("hot_lead");
    }

    // High conversion probability
    if (
        lead.status === "qualified" &&
        lead.value &&
        lead.value > 5000
    ) {
        insights.push("high_conversion");
    }

    // Follow-up recommendation
    if (lead.lastContact) {
        const daysSinceContact = Math.floor(
            (Date.now() - new Date(lead.lastContact).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceContact > 3 && daysSinceContact <= 7) {
            insights.push("follow_up");
        }
        if (daysSinceContact > 7) {
            insights.push("risk_detected");
        }
    }

    // Overdue follow-up
    if (lead.nextFollowUp) {
        const followUpDate = new Date(lead.nextFollowUp);
        if (followUpDate < new Date()) {
            insights.push("overdue");
        }
    }

    return insights.slice(0, 2); // Max 2 badges per entity
}

export function getClientInsights(client: {
    totalRevenue?: number;
    lastInteractionDate?: string;
    status?: string;
    outstandingBalance?: number;
}): AiInsightType[] {
    const insights: AiInsightType[] = [];

    // VIP client
    if (client.totalRevenue && client.totalRevenue > 10000) {
        insights.push("vip_client");
    }

    // Inactive alert
    if (client.lastInteractionDate) {
        const daysSince = Math.floor(
            (Date.now() - new Date(client.lastInteractionDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince > 30) {
            insights.push("inactive_alert");
        } else if (daysSince > 14) {
            insights.push("follow_up");
        }
    }

    // At risk
    if (client.status === "Inactive" || client.status === "Churned") {
        insights.push("risk_detected");
    }

    return insights.slice(0, 2);
}

export function getTaskInsights(task: {
    status?: string;
    priority?: string;
    dueDate?: Date | string;
}): AiInsightType[] {
    const insights: AiInsightType[] = [];

    if (task.dueDate) {
        const due = new Date(task.dueDate);
        const now = new Date();
        const diffMs = due.getTime() - now.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffMs < 0 && task.status !== "completed" && task.status !== "cancelled") {
            insights.push("overdue");
        } else if (diffDays <= 1 && diffDays > 0 && task.priority === "urgent") {
            insights.push("priority_escalation");
        }
    }

    return insights.slice(0, 2);
}
