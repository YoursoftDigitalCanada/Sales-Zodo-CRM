import { LucideIcon, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  trend: number;
  icon?: LucideIcon;
  color?: "cyan" | "green" | "orange" | "yellow" | "purple";
  progress?: number;
  isLoading?: boolean;
  delay?: number;
  comparison?: string;
  lastUpdated?: string;
  aiInsight?: string;
}

const colorMap = {
  cyan: { icon: "#6637F4", bg: "rgba(102,55,244,0.06)" },
  green: { icon: "#01C44A", bg: "rgba(1,196,74,0.06)" },
  orange: { icon: "#FF7B36", bg: "rgba(255,123,54,0.06)" },
  yellow: { icon: "#D97706", bg: "rgba(217,119,6,0.06)" },
  purple: { icon: "#6637F4", bg: "rgba(102,55,244,0.06)" },
};

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  color = "cyan",
  progress,
  isLoading = false,
  comparison,
  lastUpdated,
  aiInsight,
}: StatCardProps) {
  const isPositive = trend >= 0;
  const cm = colorMap[color];

  return (
    <div className="rounded-2xl bg-white p-4 card-interactive"
      style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 6px 16px rgba(15,23,42,0.06)' }}>
      {/* Header: Title + Trend */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{ backgroundColor: cm.bg }}>
              <Icon size={15} style={{ color: cm.icon }} strokeWidth={1.75} />
            </div>
          )}
          <span className="metric-label">{title}</span>
        </div>
        <div
          className={cn(
            "flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded",
            isPositive
              ? "text-[#16A34A] bg-[#16A34A]/6"
              : "text-[#DC2626] bg-[#DC2626]/6"
          )}
        >
          {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {Math.abs(trend)}%
        </div>
      </div>

      {/* Value */}
      <p className="metric-value mb-0.5">
        {isLoading ? (
          <span className="inline-block w-16 h-6 bg-[#F1F5F9] animate-pulse rounded" />
        ) : (
          value
        )}
      </p>

      {/* Subtitle + Comparison */}
      <div className="flex items-center gap-2">
        <p className="text-[11px] text-[#94A3B8]">{subtitle}</p>
        {comparison && (
          <>
            <span className="text-[#E2E8F0]">·</span>
            <p className={cn(
              "text-[11px] font-medium",
              isPositive ? "text-[#16A34A]" : "text-[#DC2626]"
            )}>
              {comparison}
            </p>
          </>
        )}
      </div>

      {/* Progress bar */}
      {progress !== undefined && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[#94A3B8]">Progress</span>
            <span className="text-[10px] font-semibold" style={{ color: cm.icon }}>{progress}%</span>
          </div>
          <div className="h-1 bg-[#F1F5F9] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ backgroundColor: cm.icon, width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Context label */}
      {lastUpdated && (
        <p className="text-[10px] text-[#CBD5E1] mt-2">{lastUpdated}</p>
      )}

      {/* AI Insight */}
      {aiInsight && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[rgba(15,23,42,0.04)] ai-insight-enter">
          <Sparkles size={10} className="text-[#6637F4] flex-shrink-0" />
          <span className="text-[10px] text-[#6637F4] font-medium">{aiInsight}</span>
        </div>
      )}
    </div>
  );
}