import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { FolderKanban, MoreHorizontal, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const projects = [
  {
    name: "Development",
    team: ["JS", "AM", "KR"],
    teamSize: 3,
    dueDate: "15 Jan 2024",
    status: "In Progress",
    statusColor: "teal",
  },
  {
    name: "Web Landing",
    team: ["TM", "SC"],
    teamSize: 2,
    dueDate: "25 Feb 2024",
    status: "Pending",
    statusColor: "gold",
  },
  {
    name: "Mobile App",
    team: ["DR", "PK", "MJ", "SL"],
    teamSize: 4,
    dueDate: "10 Mar 2024",
    status: "Completed",
    statusColor: "green",
  },
];

const statusStyles = {
  teal: "bg-[#0891B2]/10 text-[#0891B2] border border-[#22D3EE]/20",
  gold: "bg-[#D97706]/10 text-[#D97706] border border-[#FBBF24]/20",
  green: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  navy: "bg-[#1a1a2e]/10 text-[#0F172A] border border-[#1a1a2e]/20",
};

const avatarGradients = [
  "bg-[#F1F5F9]/70",
  "bg-[#F1F5F9]/70",
  "bg-[#F1F5F9]/70",
  "r from-purple-500 to-purple-400",
];

export function ProjectsTable() {
  return (
    <div className="bg-white/5 rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
              <FolderKanban size={18} className="text-[#0891B2]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#0F172A]">Projects Status</h3>
              <p className="text-xs text-[#475569]">Track your ongoing work</p>
            </div>
          </div>
          <button className="flex items-center gap-1 text-sm text-[#0891B2] font-medium hover:underline group">
            View All
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-white/5/50">
              <th className="text-left py-3 px-6 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                Project
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                Team
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                Due Date
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                Status
              </th>
              <th className="py-3 px-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projects.map((project, index) => (
              <motion.tr
                key={project.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
                className="hover:bg-white/5/50 transition-colors group cursor-pointer"
              >
                <td className="py-4 px-6">
                  <span className="font-medium text-[#0F172A] group-hover:text-[#0891B2] transition-colors">
                    {project.name}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center">
                    {project.team.slice(0, 3).map((initial, i) => (
                      <Avatar
                        key={i}
                        className={cn(
                          "h-8 w-8 border-2 border-white shadow-sm",
                          i !== 0 && "-ml-2"
                        )}
                      >
                        <AvatarFallback
                          className={cn(
                            "text-[#0F172A] text-xs font-semibold",
                            avatarGradients[i % avatarGradients.length]
                          )}
                        >
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {project.teamSize > 3 && (
                      <div className="h-8 w-8 -ml-2 rounded-full bg-white/5 border-2 border-white flex items-center justify-center text-xs font-semibold text-[#475569]">
                        +{project.teamSize - 3}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-[#94A3B8]">{project.dueDate}</span>
                </td>
                <td className="py-4 px-6">
                  <Badge
                    className={cn(
                      "font-medium",
                      statusStyles[project.statusColor as keyof typeof statusStyles]
                    )}
                  >
                    {project.status}
                  </Badge>
                </td>
                <td className="py-4 px-6">
                  <button className="p-1.5 rounded-md hover:bg-white/5 text-[#475569] hover:text-[#475569] transition-colors opacity-0 group-hover:opacity-100">
                    <MoreHorizontal size={16} />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}