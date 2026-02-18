import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  trend: number;
  icon?: LucideIcon;
  color?: "teal" | "gold" | "navy" | "purple" | "green";
  progress?: number;
  isLoading?: boolean;
  delay?: number;
}

const colorClasses = {
  teal: {
    bg: "bg-[#17C3B2]",
    text: "text-[#17C3B2]",
    light: "bg-[#17C3B2]/10",
  },
  gold: {
    bg: "bg-[#C9A14A]",
    text: "text-[#C9A14A]",
    light: "bg-[#C9A14A]/10",
  },
  navy: {
    bg: "bg-[#0D2342]",
    text: "text-[#0D2342]",
    light: "bg-[#0D2342]/10",
  },
  purple: {
    bg: "bg-purple-500",
    text: "text-purple-500",
    light: "bg-purple-500/10",
  },
  green: {
    bg: "bg-emerald-500",
    text: "text-emerald-500",
    light: "bg-emerald-500/10",
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  color = "teal",
  progress,
  isLoading = false,
  delay = 0,
}: StatCardProps) {
  const isPositive = trend >= 0;
  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="relative bg-white rounded-2xl p-6 border border-slate-200 hover:border-[#17C3B2]/30 hover:shadow-xl hover:shadow-[#17C3B2]/5 transition-all overflow-hidden group"
    >
      {/* Background Decoration */}
      <div
        className={cn(
          "absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 transition-all group-hover:opacity-20",
          colors.bg
        )}
      />

      <div className="relative">
        {/* Header: Icon & Trend */}
        <div className="flex items-start justify-between mb-4">
          {Icon && (
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                colors.light
              )}
            >
              <Icon size={22} className={colors.text} />
            </div>
          )}
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium",
              isPositive
                ? "bg-green-100 text-green-600"
                : "bg-red-100 text-red-600"
            )}
          >
            {isPositive ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            {Math.abs(trend)}%
          </div>
        </div>

        {/* Content: Title, Value, Subtitle */}
        <div>
          <p className="text-sm text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-[#0D2342]">
            {isLoading ? (
              <span className="inline-block w-20 h-8 bg-slate-200 animate-pulse rounded" />
            ) : (
              value
            )}
          </p>
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>

        {/* Optional Progress Bar */}
        {progress !== undefined && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-400">Progress</span>
              <span className="text-xs font-semibold text-[#17C3B2]">
                {progress}%
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ delay: delay + 0.3, duration: 0.8, ease: "easeOut" }}
                className={cn("h-full rounded-full", colors.bg)}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}