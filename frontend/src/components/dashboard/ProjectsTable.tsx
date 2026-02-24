import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { FolderKanban, MoreHorizontal, ArrowUpRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

// ── Types ──────────────────────────────────────────────────
interface ProjectApi {
  id: string;
  name: string;
  status: string;
  endDate?: string | null;
  members?: Array<{ employee?: { firstName: string; lastName: string } }>;
}

interface ProjectDisplay {
  id: string;
  name: string;
  team: string[];      // initials
  teamSize: number;
  dueDate: string;
  status: string;
  statusColor: string;
}

// ── Helpers ────────────────────────────────────────────────
function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function mapStatus(raw: string): { label: string; color: string } {
  switch (raw) {
    case "COMPLETED": return { label: "Completed", color: "green" };
    case "IN_PROGRESS": return { label: "In Progress", color: "teal" };
    case "ON_HOLD": return { label: "On Hold", color: "gold" };
    case "CANCELLED": return { label: "Cancelled", color: "navy" };
    case "NOT_STARTED":
    default: return { label: "Pending", color: "gold" };
  }
}

function toDisplay(p: ProjectApi): ProjectDisplay {
  const { label, color } = mapStatus(p.status);
  const teamInitials = (p.members || [])
    .filter(m => m.employee)
    .map(m => getInitials(m.employee!.firstName, m.employee!.lastName));

  return {
    id: p.id,
    name: p.name,
    team: teamInitials,
    teamSize: teamInitials.length,
    dueDate: p.endDate ? new Date(p.endDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—",
    status: label,
    statusColor: color,
  };
}

const statusStyles: Record<string, string> = {
  teal: "bg-[#0891B2]/10 text-[#0891B2] border border-[#22D3EE]/20",
  gold: "bg-[#D97706]/10 text-[#D97706] border border-[#FBBF24]/20",
  green: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  navy: "bg-[#1a1a2e]/10 text-[#0F172A] border border-[#1a1a2e]/20",
};

const avatarGradients = [
  "bg-[#F1F5F9]/70",
  "bg-[#F1F5F9]/70",
  "bg-[#F1F5F9]/70",
  "from-purple-500 to-purple-400",
];

export function ProjectsTable() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await api.get("/projects", { params: { limit: 5, sortBy: "createdAt", sortOrder: "desc" } });
        const raw = extractApiArray<ProjectApi>(res.data);
        setProjects(raw.map(toDisplay));
      } catch (err) {
        console.error("Failed to load projects table:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

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
          <button onClick={() => navigate("/projects")} className="flex items-center gap-1 text-sm text-[#0891B2] font-medium hover:underline group">
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
              <th className="text-left py-3 px-6 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Project</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Team</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Due Date</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Status</th>
              <th className="py-3 px-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <Loader2 size={24} className="animate-spin text-[#94A3B8] mx-auto" />
                </td>
              </tr>
            ) : projects.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-[#94A3B8]">No projects yet</td>
              </tr>
            ) : (
              projects.map((project, index) => (
                <motion.tr
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className="hover:bg-white/5/50 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <td className="py-4 px-6">
                    <span className="font-medium text-[#0F172A] group-hover:text-[#0891B2] transition-colors">{project.name}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center">
                      {project.team.slice(0, 3).map((initial, i) => (
                        <Avatar key={i} className={cn("h-8 w-8 border-2 border-white shadow-sm", i !== 0 && "-ml-2")}>
                          <AvatarFallback className={cn("text-[#0F172A] text-xs font-semibold", avatarGradients[i % avatarGradients.length])}>{initial}</AvatarFallback>
                        </Avatar>
                      ))}
                      {project.teamSize > 3 && (
                        <div className="h-8 w-8 -ml-2 rounded-full bg-white/5 border-2 border-white flex items-center justify-center text-xs font-semibold text-[#475569]">
                          +{project.teamSize - 3}
                        </div>
                      )}
                      {project.teamSize === 0 && <span className="text-xs text-[#94A3B8]">—</span>}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-[#94A3B8]">{project.dueDate}</span>
                  </td>
                  <td className="py-4 px-6">
                    <Badge className={cn("font-medium", statusStyles[project.statusColor] || statusStyles.gold)}>{project.status}</Badge>
                  </td>
                  <td className="py-4 px-6">
                    <button className="p-1.5 rounded-md hover:bg-white/5 text-[#475569] hover:text-[#475569] transition-colors opacity-0 group-hover:opacity-100">
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}