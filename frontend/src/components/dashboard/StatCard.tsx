import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
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
}

const colorMap = {
  cyan: { icon: "#0891B2", bg: "bg-[#0891B2]/6" },
  green: { icon: "#16A34A", bg: "bg-[#16A34A]/6" },
  orange: { icon: "#EA580C", bg: "bg-[#EA580C]/6" },
  yellow: { icon: "#D97706", bg: "bg-[#D97706]/6" },
  purple: { icon: "#7C3AED", bg: "bg-[#7C3AED]/6" },
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
}: StatCardProps) {
  const isPositive = trend >= 0;
  const cm = colorMap[color];

  return (
    <div className="rounded-md bg-white card-shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={cn("w-7 h-7 rounded flex items-center justify-center", cm.bg)}>
              <Icon size={14} style={{ color: cm.icon }} />
            </div>
          )}
          <span className="text-[11px] text-[#64748B] uppercase tracking-wider font-medium">{title}</span>
        </div>
        <div
          className={cn(
            "flex items-center gap-0.5 text-[11px] font-medium",
            isPositive ? "text-[#16A34A]" : "text-[#DC2626]"
          )}
        >
          {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {Math.abs(trend)}%
        </div>
      </div>

      <p className="text-xl font-semibold text-[#0F172A] mb-0.5">
        {isLoading ? (
          <span className="inline-block w-14 h-5 bg-[#F1F5F9] animate-pulse rounded" />
        ) : (
          value
        )}
      </p>
      <p className="text-[11px] text-[#94A3B8]">{subtitle}</p>

      {progress !== undefined && (
        <div className="mt-2.5">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-[#94A3B8]">Progress</span>
            <span className="text-[10px] font-medium" style={{ color: cm.icon }}>{progress}%</span>
          </div>
          <div className="h-1 bg-[#F1F5F9] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ backgroundColor: cm.icon, width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}