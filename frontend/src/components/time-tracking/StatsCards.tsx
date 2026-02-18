// src/components/time-tracking/StatsCards.tsx

import { motion } from "framer-motion";
import { Clock, Calendar, CalendarDays, DollarSign, TrendingUp, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatHoursMinutes, formatCurrency } from "./utils";

interface StatsCardsProps {
  todaySeconds: number;
  weekSeconds: number;
  monthSeconds: number;
  billableSeconds: number;
  earnings: number;
  targetHours?: number;
}

export function StatsCards({
  todaySeconds,
  weekSeconds,
  monthSeconds,
  billableSeconds,
  earnings,
  targetHours = 40,
}: StatsCardsProps) {
  const weekHours = weekSeconds / 3600;
  const targetProgress = Math.min((weekHours / targetHours) * 100, 100);

  const stats = [
    {
      title: "Today",
      value: formatHoursMinutes(todaySeconds),
      subtitle: "Hours tracked",
      icon: Clock,
      color: "teal",
      bgColor: "bg-[#17C3B2]/10",
      iconColor: "text-[#17C3B2]",
    },
    {
      title: "This Week",
      value: formatHoursMinutes(weekSeconds),
      subtitle: `${targetProgress.toFixed(0)}% of ${targetHours}h target`,
      icon: Calendar,
      color: "blue",
      bgColor: "bg-blue-500/10",
      iconColor: "text-blue-500",
      progress: targetProgress,
    },
    {
      title: "This Month",
      value: formatHoursMinutes(monthSeconds),
      subtitle: "Total hours",
      icon: CalendarDays,
      color: "purple",
      bgColor: "bg-purple-500/10",
      iconColor: "text-purple-500",
    },
    {
      title: "Billable",
      value: formatHoursMinutes(billableSeconds),
      subtitle: `${((billableSeconds / weekSeconds) * 100 || 0).toFixed(0)}% of week`,
      icon: Target,
      color: "green",
      bgColor: "bg-green-500/10",
      iconColor: "text-green-500",
    },
    {
      title: "Earnings",
      value: formatCurrency(earnings),
      subtitle: "This week",
      icon: DollarSign,
      color: "gold",
      bgColor: "bg-[#C9A14A]/10",
      iconColor: "text-[#C9A14A]",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className={cn("p-2.5 rounded-xl", stat.bgColor)}>
              <stat.icon size={20} className={stat.iconColor} />
            </div>
            {stat.progress !== undefined && (
              <span className="text-xs font-medium text-gray-500">
                {stat.progress.toFixed(0)}%
              </span>
            )}
          </div>
          
          <h3 className="text-2xl font-bold text-gray-800 mb-1">{stat.value}</h3>
          <p className="text-sm text-gray-500">{stat.title}</p>
          
          {stat.progress !== undefined && (
            <div className="mt-3">
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
            </div>
          )}
          
          <p className="text-xs text-gray-400 mt-2">{stat.subtitle}</p>
        </motion.div>
      ))}
    </div>
  );
}