// src/pages/AddProject.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { NotificationBell } from "@/components/NotificationBell";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  ArrowLeft,
  Loader2,
  FolderPlus,
  FileText,
  User,
  Users,
  Calendar,
  Clock,
  Target,
  Briefcase,
  Building2,
  DollarSign,
  Tag,
  Flag,
  Paperclip,
  Plus,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  Info,
  Sparkles,
  ChevronRight,
  Save,
  Send,
  Eye,
  Layers,
  BarChart3,
  Milestone,
  ListTodo,
  Upload,
  Image,
  FileSpreadsheet,
  Link2,
  AtSign,
  Hash,
  Zap,
  TrendingUp,
  CircleDot,
  Timer,
  CalendarDays,
  Shield,
  UserPlus,
  Settings,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createProject, updateProject, getProjectById } from "@/features/projects";
import type { ProjectEntity } from "@/features/projects";
import { getClients } from "@/features/clients/services/clients-service";
import { getEmployees } from "@/features/users/services/users-service";

// ============================================
// TYPES
// ============================================

interface TeamMember {
  id: string | number;
  name: string;
  role: string;
  avatar?: string;
}

interface Milestone {
  id: number;
  title: string;
  dueDate: string;
  completed: boolean;
}

interface User {
  firstName: string;
  lastName: string;
}

const toIdString = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidate = record.id ?? record.value ?? record.uuid;
    if (typeof candidate === "string" || typeof candidate === "number") {
      return String(candidate);
    }
  }
  return "";
};

const toDisplayString = (value: unknown, fallback = ""): string => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim() || fallback;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const direct =
      (typeof record.name === "string" && record.name)
      || (typeof record.clientName === "string" && record.clientName)
      || (typeof record.companyName === "string" && record.companyName)
      || (typeof record.label === "string" && record.label);
    if (direct && direct.trim()) return direct.trim();

    const firstName = typeof record.firstName === "string" ? record.firstName : "";
    const lastName = typeof record.lastName === "string" ? record.lastName : "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (fullName) return fullName;
  }
  return fallback;
};

// ============================================
// CONSTANTS
// ============================================

const statusOptions = [
  { value: "DRAFT", label: "Draft", color: "slate", icon: CircleDot },
  { value: "PENDING", label: "Pending", color: "blue", icon: Target },
  { value: "APPROVED", label: "Approved", color: "teal", icon: CheckCircle2 },
  { value: "SCHEDULED", label: "Scheduled", color: "blue", icon: CalendarDays },
  { value: "IN_PROGRESS", label: "In Progress", color: "teal", icon: Timer },
  { value: "ON_HOLD", label: "On Hold", color: "amber", icon: AlertCircle },
  { value: "COMPLETED", label: "Completed", color: "green", icon: CheckCircle2 },
  { value: "CANCELLED", label: "Cancelled", color: "red", icon: X },
  { value: "WARRANTY_WORK", label: "Warranty Work", color: "blue", icon: Shield },
];

const priorityOptions = [
  { value: "LOW", label: "Low", color: "bg-white/5 text-[#475569] border-[rgba(15,23,42,0.06)]" },
  { value: "NORMAL", label: "Normal", color: "bg-blue-100 text-[#0891B2] border-blue-200" },
  { value: "HIGH", label: "High", color: "bg-amber-100 text-amber-600 border-amber-200" },
  { value: "URGENT", label: "Urgent", color: "bg-red-100 text-red-600 border-red-200" },
  { value: "EMERGENCY", label: "Emergency", color: "bg-red-200 text-red-700 border-red-300" },
];

const categoryOptions = [
  "Web Development",
  "Mobile App",
  "UI/UX Design",
  "Marketing",
  "Consulting",
  "Integration",
  "Maintenance",
  "Other",
];



// ============================================
// UTILITY FUNCTIONS
// ============================================

const getInitials = (name: string) => {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getStatusColor = (status: string) => {
  const colors: Record<string, { bg: string; text: string; dot: string }> = {
    DRAFT: { bg: "bg-white/5", text: "text-[#475569]", dot: "bg-slate-400" },
    PENDING: { bg: "bg-blue-100", text: "text-[#0891B2]", dot: "bg-[#0891B2]" },
    APPROVED: { bg: "bg-[#0891B2]/10", text: "text-[#0891B2]", dot: "bg-[#0891B2]" },
    SCHEDULED: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
    IN_PROGRESS: { bg: "bg-[#0891B2]/10", text: "text-[#0891B2]", dot: "bg-[#0891B2]" },
    ON_HOLD: { bg: "bg-amber-100", text: "text-amber-600", dot: "bg-amber-500" },
    COMPLETED: { bg: "bg-green-100", text: "text-green-600", dot: "bg-green-500" },
    CANCELLED: { bg: "bg-red-100", text: "text-red-600", dot: "bg-red-500" },
    WARRANTY_WORK: { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500" },
  };
  return colors[status] || colors.PENDING;
};

// ============================================
// SECTION CARD COMPONENT
// ============================================

const SectionCard = ({
  title,
  icon: Icon,
  children,
  className,
  collapsible = false,
  defaultOpen = true,
  badge,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  badge?: string;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden",
        "hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between p-5 border-b border-[rgba(15,23,42,0.06)]",
          collapsible && "cursor-pointer hover:bg-[#F8FAFC]/50"
        )}
        onClick={() => collapsible && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-[#F1F5F9] flex items-center justify-center">
            <Icon size={20} className="text-[#0891B2]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#0F172A]">{title}</h3>
            {badge && (
              <span className="text-xs text-[#475569]">{badge}</span>
            )}
          </div>
        </div>
        {collapsible && (
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight size={20} className="text-[#475569]" />
          </motion.div>
        )}
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================
// TEAM MEMBER SELECTOR COMPONENT
// ============================================

const TeamMemberSelector = ({
  selectedMembers,
  onToggle,
  members,
}: {
  selectedMembers: (string | number)[];
  onToggle: (id: string | number) => void;
  members: TeamMember[];
}) => {
  return (
    <div className="space-y-3">
      {members.map((member, index) => {
        const isSelected = selectedMembers.includes(member.id);
        return (
          <motion.div
            key={String(member.id)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            role="button"
            tabIndex={0}
            onClick={() => onToggle(member.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(member.id); }}
            className={cn(
              "flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-all select-none",
              isSelected
                ? "border-[#22D3EE] bg-[#0891B2]/5"
                : "border-[rgba(15,23,42,0.06)] hover:border-slate-300 hover:bg-[#F8FAFC]"
            )}
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] font-semibold text-sm">
                {getInitials(member.name)}
              </div>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-[#0891B2] rounded-full flex items-center justify-center"
                >
                  <CheckCircle2 size={12} className="text-white" />
                </motion.div>
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-[#0F172A] text-sm">{member.name}</p>
              <p className="text-xs text-[#475569]">{member.role}</p>
            </div>
            {/* Simple visual checkbox — no Radix component to swallow click events */}
            <div
              className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                isSelected
                  ? "bg-[#0891B2] border-[#0891B2]"
                  : "border-slate-300 bg-white"
              )}
            >
              {isSelected && <Check size={14} className="text-white" />}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// ============================================
// MILESTONE EDITOR COMPONENT
// ============================================

const MilestoneEditor = ({
  milestones,
  onAdd,
  onRemove,
  onUpdate,
}: {
  milestones: Milestone[];
  onAdd: () => void;
  onRemove: (id: number) => void;
  onUpdate: (id: number, field: string, value: any) => void;
}) => {
  return (
    <div className="space-y-4">
      <AnimatePresence>
        {milestones.map((milestone, index) => (
          <motion.div
            key={milestone.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex items-center gap-3 p-4 bg-[#F8FAFC] rounded-md group"
          >
            <div className="w-8 h-8 rounded-md bg-[#0891B2]/10 flex items-center justify-center text-[#0891B2] font-semibold text-sm">
              {index + 1}
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              <Input
                value={milestone.title}
                onChange={(e) => onUpdate(milestone.id, "title", e.target.value)}
                placeholder="Milestone title"
                className="h-10 rounded-md border-[rgba(15,23,42,0.06)] bg-white focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
              />
              <Input
                type="date"
                value={milestone.dueDate}
                onChange={(e) => onUpdate(milestone.id, "dueDate", e.target.value)}
                className="h-10 rounded-md border-[rgba(15,23,42,0.06)] bg-white focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onRemove(milestone.id)}
              className="p-2 rounded-md text-[#475569] hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
            >
              <X size={16} />
            </motion.button>
          </motion.div>
        ))}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-md border-2 border-dashed border-[rgba(15,23,42,0.06)] text-[#94A3B8] hover:border-[#22D3EE] hover:text-[#0891B2] hover:bg-[#0891B2]/5 transition-all"
      >
        <Plus size={18} />
        <span className="font-medium">Add Milestone</span>
      </motion.button>
    </div>
  );
};

// ============================================
// TAG INPUT COMPONENT
// ============================================

const TagInput = ({
  tags,
  onAdd,
  onRemove,
}: {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
}) => {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      if (!tags.includes(input.trim())) {
        onAdd(input.trim());
      }
      setInput("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type and press Enter to add tags"
          className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
        />
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {tags.map((tag) => (
              <motion.span
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0891B2]/10 text-[#0891B2] text-sm font-medium"
              >
                <Hash size={12} />
                {tag}
                <button
                  onClick={() => onRemove(tag)}
                  className="ml-1 hover:bg-[#0891B2]/20 rounded p-0.5 transition-colors"
                >
                  <X size={12} />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

// ============================================
// FILE UPLOAD COMPONENT
// ============================================

const FileUploadZone = ({
  files,
  onAdd,
  onRemove,
}: {
  files: File[];
  onAdd: (files: FileList) => void;
  onRemove: (index: number) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) {
      onAdd(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-4">
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        animate={{
          borderColor: isDragging ? "#22D3EE" : "#e2e8f0",
          backgroundColor: isDragging ? "rgba(23, 195, 178, 0.05)" : "transparent",
        }}
        className="border-2 border-dashed rounded-md p-8 text-center transition-all"
      >
        <input
          type="file"
          multiple
          onChange={(e) => e.target.files && onAdd(e.target.files)}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <motion.div
            animate={{ scale: isDragging ? 1.05 : 1 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-14 h-14 rounded-md bg-[#F1F5F9] flex items-center justify-center">
              <Upload size={24} className="text-[#0891B2]" />
            </div>
            <div>
              <p className="font-medium text-[#0F172A]">
                Drop files here or <span className="text-[#0891B2]">browse</span>
              </p>
              <p className="text-sm text-[#475569] mt-1">
                Support for PDF, DOC, images, and more
              </p>
            </div>
          </motion.div>
        </label>
      </motion.div>

      {files.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence>
            {files.map((file, index) => (
              <motion.div
                key={`${file.name}-${index}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-md group"
              >
                <div className="w-10 h-10 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
                  {file.type.includes("image") ? (
                    <Image size={18} className="text-[#0891B2]" />
                  ) : file.type.includes("spreadsheet") || file.name.endsWith(".xlsx") ? (
                    <FileSpreadsheet size={18} className="text-green-600" />
                  ) : (
                    <FileText size={18} className="text-[#0891B2]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-[#0F172A] truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-[#475569]">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onRemove(index)}
                  className="p-2 rounded-md text-[#475569] hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X size={16} />
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

// ============================================
// PROGRESS INDICATOR COMPONENT
// ============================================

const ProgressIndicator = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) => {
  const getProgressColor = () => {
    if (value < 25) return "from-slate-400 to-slate-500";
    if (value < 50) return "from-amber-400 to-amber-500";
    if (value < 75) return "from-blue-400 to-blue-500";
    return "from-[#22D3EE] to-emerald-500";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#94A3B8]">Project Progress</span>
        <motion.span
          key={value}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className={cn(
            "px-3 py-1 rounded-md font-bold text-lg",
            value >= 75 ? "bg-[#0891B2]/10 text-[#0891B2]" : "bg-white/5 text-[#475569]"
          )}
        >
          {value}%
        </motion.span>
      </div>
      <div className="relative">
        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full ", getProgressColor())}
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <Slider
          value={[value]}
          onValueChange={(v) => onChange(v[0])}
          max={100}
          step={5}
          className="absolute inset-0 opacity-0"
        />
      </div>
      <div className="flex justify-between text-xs text-[#475569]">
        <span>Not Started</span>
        <span>In Progress</span>
        <span>Completed</span>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const AddProjectPage = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEditMode = Boolean(editId);
  const { toast } = useToast();

  // Edit loading
  const [editLoading, setEditLoading] = useState(false);

  // Sidebar
    const [user, setUser] = useState<User | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectManager, setProjectManager] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [priority, setPriority] = useState("NORMAL");
  const [progress, setProgress] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [budget, setBudget] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<(string | number)[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [sendNotification, setSendNotification] = useState(true);

  // UI State
  const [submitting, setSubmitting] = useState(false);
  const [saveAsDraft, setSaveAsDraft] = useState(false);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user data");
      }
    }
  }, []);

  // Data from API
  const [apiClients, setApiClients] = useState<{ id: string; name: string }[]>([]);
  const [apiTeamMembers, setApiTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const clientsData = await getClients();
        setApiClients(
          (clientsData || [])
            .map((c: any) => ({
              id: toIdString(c?.id ?? c?.Id),
              name: toDisplayString(c?.clientName ?? c?.companyName ?? c?.name ?? c?.Name, "Unnamed Client"),
            }))
            .filter((c) => c.id.length > 0)
        );
      } catch {
        console.error("Failed to load clients");
      }
      try {
        const employeesData = await getEmployees();
        setApiTeamMembers(
          (employeesData || [])
            .map((emp: any) => {
              const firstName = toDisplayString(emp?.user?.firstName ?? emp?.firstName);
              const lastName = toDisplayString(emp?.user?.lastName ?? emp?.lastName);
              const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

              return {
                id: toIdString(emp?.id ?? emp?.Id),
                name: fullName || toDisplayString(emp?.email, "Employee"),
                role: toDisplayString(emp?.position ?? emp?.jobTitle ?? emp?.role, "Team Member"),
              };
            })
            .filter((member) => member.id.length > 0)
        );
      } catch {
        console.error("Failed to load team members");
      }
    };
    fetchDropdownData();
  }, []);

  // ============================================
  // EDIT: FETCH EXISTING PROJECT DATA
  // ============================================

  useEffect(() => {
    if (!editId) return;
    const fetchProject = async () => {
      setEditLoading(true);
      try {
        const p = await getProjectById(editId);
        if (p) {
          setName(p.name || "");
          setDescription(p.description || "");
          setClientId(p.client?.id || "");
          setStatus((p.status as string) || "PENDING");
          setPriority((p.priority as string) || "NORMAL");
          setProgress(p.completionPercentage || p.progress || 0);
          if (p.estimatedStartDate || p.startDate || p.actualStartDate) {
            const d = p.estimatedStartDate || p.startDate || p.actualStartDate;
            setStartDate(d ? d.split("T")[0] : "");
          }
          if (p.estimatedEndDate || p.dueDate || p.endDate) {
            const d = p.estimatedEndDate || p.dueDate || p.endDate;
            setDueDate(d ? d.split("T")[0] : "");
          }
          if (p.budget) setBudget(String(p.budget));
          if (p.projectType) setCategory(p.projectType);
        }
      } catch (err) {
        console.error("Failed to load project for editing", err);
        toast({ title: "Error", description: "Could not load project data", variant: "destructive" });
      } finally {
        setEditLoading(false);
      }
    };
    fetchProject();
  }, [editId, toast]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleTeamMemberToggle = (id: string | number) => {
    setSelectedTeamMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleAddMilestone = () => {
    setMilestones((prev) => [
      ...prev,
      { id: Date.now(), title: "", dueDate: "", completed: false },
    ]);
  };

  const handleRemoveMilestone = (id: number) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdateMilestone = (id: number, field: string, value: any) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleAddTag = (tag: string) => {
    setTags((prev) => [...prev, tag]);
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleAddFiles = (fileList: FileList) => {
    setFiles((prev) => [...prev, ...Array.from(fileList)]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a project title",
        variant: "destructive",
      });
      return false;
    }
    if (!clientId) {
      toast({
        title: "Validation Error",
        description: "Please select a client",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();

    if (!isDraft && !validateForm()) return;

    setSubmitting(true);
    setSaveAsDraft(isDraft);

    try {
      const projectData = {
        projectTitle: name,
        description: description || null,
        clientId: clientId || null,
        projectManagerId: projectManager || null,
        status: isDraft ? "DRAFT" : status,
        priority,
        progressPercentage: Number(progress),
        startDate: startDate ? new Date(startDate).toISOString() : null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        budget: budget ? parseFloat(budget) : null,
        estimatedHours: estimatedHours ? parseInt(estimatedHours) : null,
        category: category || null,
        tags,
        teamMembers: selectedTeamMembers.map(String),
        milestones: milestones
          .filter(m => m.title && m.title.trim().length > 0)
          .map(m => ({
            title: m.title.trim(),
            dueDate: m.dueDate ? new Date(m.dueDate).toISOString() : null,
            isCompleted: m.completed || false,
          })),
        notifyTeamMembers: sendNotification,
      };

      if (isEditMode && editId) {
        await updateProject(editId, projectData as Record<string, unknown>);
      } else {
        await createProject(projectData as Record<string, unknown>);
      }

      toast({
        title: isEditMode ? "Project Updated" : isDraft ? "Draft Saved" : "Project Created",
        description: isEditMode
          ? "Your project has been updated successfully"
          : isDraft
            ? "Your project has been saved as a draft"
            : "Your project has been created successfully",
      });

      navigate("/projects");
    } catch (err: any) {
      console.error("Failed to save project", err);
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? "update" : "create"} project: ` + (err?.message || err),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setSaveAsDraft(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  const selectedStatusOption = statusOptions.find((s) => s.value === status);
  const StatusIcon = selectedStatusOption?.icon || CircleDot;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
<main
        className={cn(
          "flex-1 transition-all duration-300"
        )}
      >
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <header className="crm-module-header sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-[rgba(15,23,42,0.06)]/50">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/projects")}
                className="p-2 rounded-md hover:bg-white/10 text-[#475569] transition-colors"
              >
                <ArrowLeft size={20} />
              </motion.button>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#475569]">Projects</span>
                <ChevronRight size={16} className="text-[#475569]" />
                <span className="font-medium text-[#0F172A]">{isEditMode ? "Edit Project" : "New Project"}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell
                buttonClassName="border-0 bg-transparent p-2 text-[#475569] hover:bg-white/10"
                iconClassName="text-[#475569]"
                iconSize={20}
              />

              <div className="flex items-center gap-3 pl-3 border-l border-[rgba(15,23,42,0.06)]">
                <div className="w-9 h-9 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] font-semibold text-sm">
                  {user ? getInitials(`${user.firstName} ${user.lastName}`) : "?"}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ============================================ */}
        {/* CONTENT */}
        {/* ============================================ */}
        <div className="p-6 max-w-6xl mx-auto">
          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-md bg-[#F1F5F9] flex items-center justify-center ">
                <FolderPlus size={24} className="text-[#0F172A]" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">{isEditMode ? "Edit Project" : "Create New Project"}</h1>
                <p className="text-[#94A3B8]">Fill in the details to start a new project</p>
              </div>
            </div>
          </motion.div>

          <form onSubmit={(e) => handleSubmit(e, false)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {/* ============================================ */}
              {/* LEFT COLUMN - Main Details */}
              {/* ============================================ */}
              <div className="col-span-2 space-y-6">
                {/* Basic Information */}
                <SectionCard title="Basic Information" icon={FileText}>
                  <div className="space-y-5">
                    {/* Project Name */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#475569]">
                        Project Title <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Briefcase
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"
                        />
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter project title"
                          required
                          className="h-12 pl-11 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20 text-base"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#475569]">Description</Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe the project scope, objectives, and key deliverables..."
                        rows={4}
                        className="rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20 resize-none"
                      />
                    </div>

                    {/* Client & Category */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#475569]">
                          Client <span className="text-red-500">*</span>
                        </Label>
                        <Select value={clientId} onValueChange={setClientId}>
                          <SelectTrigger className="h-12 rounded-md border-[rgba(15,23,42,0.06)]">
                            <div className="flex items-center gap-2">
                              <Building2 size={16} className="text-[#475569]" />
                              <SelectValue placeholder="Select client" />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="rounded-md">
                            {apiClients.map((client) => (
                              <SelectItem
                                key={client.id}
                                value={String(client.id)}
                                className="rounded-md"
                              >
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#475569]">Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger className="h-12 rounded-md border-[rgba(15,23,42,0.06)]">
                            <div className="flex items-center gap-2">
                              <Layers size={16} className="text-[#475569]" />
                              <SelectValue placeholder="Select category" />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="rounded-md">
                            {categoryOptions.map((cat) => (
                              <SelectItem key={cat} value={cat} className="rounded-md">
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Project Manager */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#475569]">Project Manager</Label>
                      <Select value={projectManager} onValueChange={setProjectManager}>
                        <SelectTrigger className="h-12 rounded-md border-[rgba(15,23,42,0.06)]">
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-[#475569]" />
                            <SelectValue placeholder="Assign project manager" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-md">
                          {apiTeamMembers.map((member) => (
                            <SelectItem
                              key={member.id}
                              value={String(member.id)}
                              className="rounded-md"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] text-xs font-semibold">
                                  {getInitials(member.name)}
                                </div>
                                {member.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </SectionCard>

                {/* Timeline & Progress */}
                <SectionCard title="Timeline & Progress" icon={Calendar}>
                  <div className="space-y-6">
                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#475569]">Start Date</Label>
                        <div className="relative">
                          <CalendarDays
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"
                          />
                          <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="h-12 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#475569]">Due Date</Label>
                        <div className="relative">
                          <CalendarDays
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"
                          />
                          <Input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="h-12 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Progress */}
                    <ProgressIndicator value={progress} onChange={setProgress} />
                  </div>
                </SectionCard>

                {/* Milestones */}
                <SectionCard
                  title="Milestones"
                  icon={Milestone}
                  collapsible
                  badge={`${milestones.length} milestones`}
                >
                  <MilestoneEditor
                    milestones={milestones}
                    onAdd={handleAddMilestone}
                    onRemove={handleRemoveMilestone}
                    onUpdate={handleUpdateMilestone}
                  />
                </SectionCard>

                {/* Team Members */}
                <SectionCard
                  title="Team Members"
                  icon={Users}
                  collapsible
                  badge={`${selectedTeamMembers.length} selected`}
                >
                  <TeamMemberSelector
                    selectedMembers={selectedTeamMembers}
                    onToggle={handleTeamMemberToggle}
                    members={apiTeamMembers}
                  />
                </SectionCard>

                {/* Attachments */}
                <SectionCard
                  title="Attachments"
                  icon={Paperclip}
                  collapsible
                  defaultOpen={false}
                  badge={files.length > 0 ? `${files.length} files` : undefined}
                >
                  <FileUploadZone
                    files={files}
                    onAdd={handleAddFiles}
                    onRemove={handleRemoveFile}
                  />
                </SectionCard>
              </div>

              {/* ============================================ */}
              {/* RIGHT COLUMN - Settings & Actions */}
              {/* ============================================ */}
              <div className="space-y-6">
                {/* Status & Priority */}
                <SectionCard title="Status & Priority" icon={Flag}>
                  <div className="space-y-5">
                    {/* Status */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#475569]">Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="h-12 rounded-md border-[rgba(15,23,42,0.06)]">
                          <div className="flex items-center gap-2">
                            <StatusIcon size={16} className="text-[#475569]" />
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-md">
                          {statusOptions.map((opt) => {
                            const Icon = opt.icon;
                            const colors = getStatusColor(opt.value);
                            return (
                              <SelectItem
                                key={opt.value}
                                value={opt.value}
                                className="rounded-md"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "w-2 h-2 rounded-full",
                                      colors.dot
                                    )}
                                  />
                                  {opt.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#475569]">Priority</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {priorityOptions.map((opt) => (
                          <motion.button
                            key={opt.value}
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setPriority(opt.value)}
                            className={cn(
                              "p-3 rounded-md border text-sm font-medium transition-all",
                              priority === opt.value
                                ? opt.color
                                : "border-[rgba(15,23,42,0.06)] text-[#94A3B8] hover:border-slate-300"
                            )}
                          >
                            {opt.label}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {/* Budget & Hours */}
                <SectionCard title="Budget & Time" icon={DollarSign}>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#475569]">Budget</Label>
                      <div className="relative">
                        <DollarSign
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"
                        />
                        <Input
                          type="number"
                          value={budget}
                          onChange={(e) => setBudget(e.target.value)}
                          placeholder="0.00"
                          className="h-12 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#475569]">
                        Estimated Hours
                      </Label>
                      <div className="relative">
                        <Clock
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"
                        />
                        <Input
                          type="number"
                          value={estimatedHours}
                          onChange={(e) => setEstimatedHours(e.target.value)}
                          placeholder="0"
                          className="h-12 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                        />
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {/* Tags */}
                <SectionCard title="Tags" icon={Tag}>
                  <TagInput tags={tags} onAdd={handleAddTag} onRemove={handleRemoveTag} />
                </SectionCard>

                {/* Notifications */}
                <SectionCard title="Notifications" icon={Bell}>
                  <div className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-md">
                    <div>
                      <p className="font-medium text-[#0F172A] text-sm">
                        Notify Team Members
                      </p>
                      <p className="text-xs text-[#475569]">
                        {isEditMode ? "Send email notifications when updated" : "Send email notifications when created"}
                      </p>
                    </div>
                    <Checkbox
                      checked={sendNotification}
                      onCheckedChange={(checked) =>
                        setSendNotification(checked as boolean)
                      }
                      className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
                    />
                  </div>
                </SectionCard>

                {/* Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="sticky top-24 space-y-3"
                >
                  <Button
                    type="submit"
                    disabled={submitting && !saveAsDraft}
                    className="w-full h-12 bg-[#F1F5F9]/90 hover:from-[#22D3EE]/90 hover:to-[#22D3EE] text-[#0F172A] rounded-md  text-base font-semibold"
                  >
                    {submitting && !saveAsDraft ? (
                      <>
                        <Loader2 size={18} className="animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} className="mr-2" />
                        {submitting ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Project" : "Create Project")}
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting && saveAsDraft}
                    onClick={(e) => handleSubmit(e, true)}
                    className="w-full h-11 rounded-md border-[rgba(15,23,42,0.06)] hover:bg-[#F8FAFC]"
                  >
                    {submitting && saveAsDraft ? (
                      <>
                        <Loader2 size={16} className="animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} className="mr-2" />
                        Save as Draft
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => navigate("/projects")}
                    className="w-full h-11 rounded-md text-[#94A3B8] hover:text-slate-200"
                  >
                    Cancel
                  </Button>
                </motion.div>

                {/* Help Card */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="p-4 bg-[#F1F5F9] rounded-md border border-[#22D3EE]/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-md bg-[#0891B2]/10 flex items-center justify-center flex-shrink-0">
                      <HelpCircle size={16} className="text-[#0891B2]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#0F172A] text-sm mb-1">
                        Need Help?
                      </p>
                      <p className="text-xs text-[#94A3B8] leading-relaxed">
                        Check our project management guide or contact support for
                        assistance.
                      </p>
                      <button className="mt-2 text-xs font-medium text-[#0891B2] hover:underline">
                        View Documentation →
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AddProjectPage;
