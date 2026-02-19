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
  teal: "bg-[#23D3EE]/10 text-[#23D3EE] border border-[#23D3EE]/20",
  gold: "bg-[#FBBF23]/10 text-[#FBBF23] border border-[#FBBF23]/20",
  green: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  navy: "bg-[#0F172A]/10 text-[#0F172A] border border-[#0F172A]/20",
};

const avatarGradients = [
  "bg-gradient-to-br from-[#23D3EE] to-[#23D3EE]/70",
  "bg-gradient-to-br from-[#FBBF23] to-[#FBBF23]/70",
  "bg-gradient-to-br from-[#0F172A] to-[#0F172A]/70",
  "bg-gradient-to-br from-purple-500 to-purple-400",
];

export function ProjectsTable() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#23D3EE]/10 flex items-center justify-center">
              <FolderKanban size={18} className="text-[#23D3EE]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#0F172A]">Projects Status</h3>
              <p className="text-xs text-slate-400">Track your ongoing work</p>
            </div>
          </div>
          <button className="flex items-center gap-1 text-sm text-[#23D3EE] font-medium hover:underline group">
            View All
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Project
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Team
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
                className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
              >
                <td className="py-4 px-6">
                  <span className="font-medium text-[#0F172A] group-hover:text-[#23D3EE] transition-colors">
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
                            "text-white text-xs font-semibold",
                            avatarGradients[i % avatarGradients.length]
                          )}
                        >
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {project.teamSize > 3 && (
                      <div className="h-8 w-8 -ml-2 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-semibold text-slate-600">
                        +{project.teamSize - 3}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-slate-500">{project.dueDate}</span>
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
                  <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100">
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