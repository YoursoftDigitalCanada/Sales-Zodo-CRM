// src/components/time-tracking/WeeklyOverview.tsx

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { WeeklyData } from "./types";

interface WeeklyOverviewProps {
  data: WeeklyData[];
  targetHours?: number;
}

export function WeeklyOverview({ data, targetHours = 8 }: WeeklyOverviewProps) {
  const maxHours = Math.max(...data.map((d) => d.hours), targetHours);
  const totalHours = data.reduce((acc, d) => acc + d.hours, 0);
  const totalBillable = data.reduce((acc, d) => acc + d.billable, 0);

  const today = new Date().getDay();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Weekly Overview</h3>
          <p className="text-sm text-gray-500">
            {totalHours.toFixed(1)}h total • {totalBillable.toFixed(1)}h billable
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#17C3B2]" />
            <span className="text-gray-600">Billable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-300" />
            <span className="text-gray-600">Non-billable</span>
          </div>
        </div>
      </div>

      <div className="flex items-end gap-4 h-48">
        {data.map((day, index) => {
          const billableHeight = (day.billable / maxHours) * 100;
          const nonBillableHeight = (day.nonBillable / maxHours) * 100;
          const isToday = index === today;

          return (
            <div key={day.day} className="flex-1 flex flex-col items-center">
              {/* Bar Container */}
              <div className="w-full h-40 flex flex-col justify-end relative">
                {/* Target Line */}
                {isToday && (
                  <div
                    className="absolute w-full border-t-2 border-dashed border-[#C9A14A]/50"
                    style={{ bottom: `${(targetHours / maxHours) * 100}%` }}
                  />
                )}

                {/* Stacked Bars */}
                <div className="w-full flex flex-col-reverse gap-0.5">
                  {day.billable > 0 && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${billableHeight}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className={cn(
                        "w-full rounded-t-lg transition-all cursor-pointer hover:opacity-80",
                        isToday ? "bg-[#17C3B2]" : "bg-[#17C3B2]/70"
                      )}
                      title={`${day.billable}h billable`}
                    />
                  )}
                  {day.nonBillable > 0 && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${nonBillableHeight}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 + 0.1 }}
                      className={cn(
                        "w-full transition-all cursor-pointer hover:opacity-80",
                        isToday ? "bg-gray-400" : "bg-gray-300",
                        day.billable === 0 && "rounded-t-lg"
                      )}
                      title={`${day.nonBillable}h non-billable`}
                    />
                  )}
                </div>

                {/* Hours Label */}
                {day.hours > 0 && (
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-600">
                    {day.hours.toFixed(1)}h
                  </span>
                )}
              </div>

              {/* Day Label */}
              <div className="mt-3 text-center">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isToday ? "text-[#17C3B2]" : "text-gray-700"
                  )}
                >
                  {day.day}
                </p>
                <p className="text-xs text-gray-400">{day.date}</p>
              </div>

              {/* Today Indicator */}
              {isToday && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 bg-[#17C3B2] rounded-full mt-1"
                />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}