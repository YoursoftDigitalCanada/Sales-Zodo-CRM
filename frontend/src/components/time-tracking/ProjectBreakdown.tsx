    // src/components/time-tracking/ProjectBreakdown.tsx

import { motion } from "framer-motion";
import { MoreHorizontal, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Project } from "./types";
import { formatHoursMinutes, getProjectColor } from "./utils";

interface ProjectBreakdownProps {
  projects: Project[];
  onViewProject?: (projectId: string) => void;
}

export function ProjectBreakdown({ projects, onViewProject }: ProjectBreakdownProps) {
  const totalTracked = projects.reduce((acc, p) => acc + (p.tracked || 0), 0);

  // Sort by tracked time
  const sortedProjects = [...projects].sort((a, b) => (b.tracked || 0) - (a.tracked || 0));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[#0F172A]">Project Breakdown</h3>
          <p className="text-sm text-[#475569]">{formatHoursMinutes(totalTracked * 3600)} total</p>
        </div>
        <button className="text-sm text-[#0891B2] font-medium hover:underline">
          View All
        </button>
      </div>

      <div className="space-y-4">
        {sortedProjects.slice(0, 5).map((project, index) => {
          const colors = getProjectColor(project.color);
          const progress = project.budget
            ? Math.min(((project.tracked || 0) / project.budget) * 100, 100)
            : 0;
          const percentage = totalTracked > 0 ? ((project.tracked || 0) / totalTracked) * 100 : 0;

          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={cn("w-3 h-3 rounded-full")}
                    style={{
                      backgroundColor:
                        project.color === "teal"
                          ? "#22D3EE"
                          : project.color === "gold"
                          ? "#FBBF24"
                          : project.color,
                    }}
                  />
                  <div>
                    <p className="font-medium text-[#0F172A] group-hover:text-[#0891B2] transition-colors">
                      {project.name}
                    </p>
                    <p className="text-xs text-[#475569]">{project.client}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-[#0F172A]">
                      {formatHoursMinutes((project.tracked || 0) * 3600)}
                    </p>
                    {project.budget && (
                      <p className="text-xs text-[#475569]">of {project.budget}h budget</p>
                    )}
                  </div>
                  <span className="text-sm font-medium text-[#475569] w-12 text-right">
                    {percentage.toFixed(0)}%
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded transition-all">
                        <MoreHorizontal size={16} className="text-[#475569]" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewProject?.(project.id)}>
                        <Clock size={14} className="mr-2" />
                        View Time Entries
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <TrendingUp size={14} className="mr-2" />
                        View Report
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="ml-6">
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={cn(
                      "h-full rounded-full",
                      progress >= 90
                        ? "bg-red-500"
                        : progress >= 70
                        ? "bg-yellow-500"
                        : "bg-[#0891B2]"
                    )}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}