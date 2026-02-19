// src/pages/AddProject.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/Sidebar";
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
  UserPlus,
  Settings,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/axios";

// ============================================
// TYPES
// ============================================

interface TeamMember {
  id: number;
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

// ============================================
// CONSTANTS
// ============================================

const statusOptions = [
  { value: "not_started", label: "Not Started", color: "slate", icon: CircleDot },
  { value: "planning", label: "Planning", color: "blue", icon: Target },
  { value: "in_progress", label: "In Progress", color: "teal", icon: Timer },
  { value: "on_hold", label: "On Hold", color: "amber", icon: AlertCircle },
  { value: "completed", label: "Completed", color: "green", icon: CheckCircle2 },
  { value: "cancelled", label: "Cancelled", color: "red", icon: X },
];

const priorityOptions = [
  { value: "low", label: "Low", color: "bg-slate-100 text-slate-600 border-slate-200" },
  { value: "medium", label: "Medium", color: "bg-blue-100 text-blue-600 border-blue-200" },
  { value: "high", label: "High", color: "bg-amber-100 text-amber-600 border-amber-200" },
  { value: "critical", label: "Critical", color: "bg-red-100 text-red-600 border-red-200" },
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

const mockTeamMembers: TeamMember[] = [
  { id: 1, name: "John Smith", role: "Developer" },
  { id: 2, name: "Sarah Johnson", role: "Designer" },
  { id: 3, name: "Mike Wilson", role: "Project Manager" },
  { id: 4, name: "Emily Davis", role: "QA Engineer" },
  { id: 5, name: "Alex Brown", role: "DevOps" },
];

const mockClients = [
  { id: 1, name: "Acme Corporation" },
  { id: 2, name: "TechStart Inc." },
  { id: 3, name: "Global Solutions" },
  { id: 4, name: "Innovation Labs" },
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
    not_started: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
    planning: { bg: "bg-blue-100", text: "text-blue-600", dot: "bg-blue-500" },
    in_progress: { bg: "bg-[#23D3EE]/10", text: "text-[#23D3EE]", dot: "bg-[#23D3EE]" },
    on_hold: { bg: "bg-amber-100", text: "text-amber-600", dot: "bg-amber-500" },
    completed: { bg: "bg-green-100", text: "text-green-600", dot: "bg-green-500" },
    cancelled: { bg: "bg-red-100", text: "text-red-600", dot: "bg-red-500" },
  };
  return colors[status] || colors.not_started;
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
        "bg-white rounded-2xl border border-slate-200 overflow-hidden",
        "hover:border-[#23D3EE]/30 hover:shadow-lg hover:shadow-[#23D3EE]/5 transition-all",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between p-5 border-b border-slate-100",
          collapsible && "cursor-pointer hover:bg-slate-50/50"
        )}
        onClick={() => collapsible && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#23D3EE]/10 to-[#FBBF23]/10 flex items-center justify-center">
            <Icon size={20} className="text-[#23D3EE]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#0F172A]">{title}</h3>
            {badge && (
              <span className="text-xs text-slate-400">{badge}</span>
            )}
          </div>
        </div>
        {collapsible && (
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight size={20} className="text-slate-400" />
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
}: {
  selectedMembers: number[];
  onToggle: (id: number) => void;
}) => {
  return (
    <div className="space-y-3">
      {mockTeamMembers.map((member, index) => (
        <motion.div
          key={member.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onToggle(member.id)}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
            selectedMembers.includes(member.id)
              ? "border-[#23D3EE] bg-[#23D3EE]/5"
              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          )}
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#23D3EE] to-[#6366F1] flex items-center justify-center text-white font-semibold text-sm">
              {getInitials(member.name)}
            </div>
            {selectedMembers.includes(member.id) && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-[#23D3EE] rounded-full flex items-center justify-center"
              >
                <CheckCircle2 size={12} className="text-white" />
              </motion.div>
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium text-[#0F172A] text-sm">{member.name}</p>
            <p className="text-xs text-slate-400">{member.role}</p>
          </div>
          <Checkbox
            checked={selectedMembers.includes(member.id)}
            className="border-slate-300 data-[state=checked]:bg-[#23D3EE] data-[state=checked]:border-[#23D3EE]"
          />
        </motion.div>
      ))}
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
            className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#23D3EE]/10 flex items-center justify-center text-[#23D3EE] font-semibold text-sm">
              {index + 1}
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              <Input
                value={milestone.title}
                onChange={(e) => onUpdate(milestone.id, "title", e.target.value)}
                placeholder="Milestone title"
                className="h-10 rounded-lg border-slate-200 bg-white focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
              />
              <Input
                type="date"
                value={milestone.dueDate}
                onChange={(e) => onUpdate(milestone.id, "dueDate", e.target.value)}
                className="h-10 rounded-lg border-slate-200 bg-white focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onRemove(milestone.id)}
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
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
        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-[#23D3EE] hover:text-[#23D3EE] hover:bg-[#23D3EE]/5 transition-all"
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
        <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type and press Enter to add tags"
          className="h-11 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#23D3EE]/10 text-[#23D3EE] text-sm font-medium"
              >
                <Hash size={12} />
                {tag}
                <button
                  onClick={() => onRemove(tag)}
                  className="ml-1 hover:bg-[#23D3EE]/20 rounded p-0.5 transition-colors"
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
          borderColor: isDragging ? "#23D3EE" : "#e2e8f0",
          backgroundColor: isDragging ? "rgba(23, 195, 178, 0.05)" : "transparent",
        }}
        className="border-2 border-dashed rounded-xl p-8 text-center transition-all"
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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#23D3EE]/10 to-[#FBBF23]/10 flex items-center justify-center">
              <Upload size={24} className="text-[#23D3EE]" />
            </div>
            <div>
              <p className="font-medium text-[#0F172A]">
                Drop files here or <span className="text-[#23D3EE]">browse</span>
              </p>
              <p className="text-sm text-slate-400 mt-1">
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
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#23D3EE]/10 flex items-center justify-center">
                  {file.type.includes("image") ? (
                    <Image size={18} className="text-[#23D3EE]" />
                  ) : file.type.includes("spreadsheet") || file.name.endsWith(".xlsx") ? (
                    <FileSpreadsheet size={18} className="text-green-600" />
                  ) : (
                    <FileText size={18} className="text-[#23D3EE]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-[#0F172A] truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onRemove(index)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
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
    return "from-[#23D3EE] to-emerald-500";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">Project Progress</span>
        <motion.span
          key={value}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className={cn(
            "px-3 py-1 rounded-lg font-bold text-lg",
            value >= 75 ? "bg-[#23D3EE]/10 text-[#23D3EE]" : "bg-slate-100 text-slate-600"
          )}
        >
          {value}%
        </motion.span>
      </div>
      <div className="relative">
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full bg-gradient-to-r", getProgressColor())}
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
      <div className="flex justify-between text-xs text-slate-400">
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
  const { toast } = useToast();

  // Sidebar
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectManager, setProjectManager] = useState("");
  const [status, setStatus] = useState("not_started");
  const [priority, setPriority] = useState("medium");
  const [progress, setProgress] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [budget, setBudget] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<number[]>([]);
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

  // ============================================
  // HANDLERS
  // ============================================

  const handleTeamMemberToggle = (id: number) => {
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
        name,
        description,
        clientId: clientId ? parseInt(clientId) : null,
        projectManager,
        status: isDraft ? "draft" : status,
        priority,
        progress: Number(progress),
        startDate,
        dueDate,
        budget: budget ? parseFloat(budget) : null,
        estimatedHours: estimatedHours ? parseInt(estimatedHours) : null,
        category,
        tags,
        teamMembers: selectedTeamMembers,
        milestones,
        sendNotification,
      };

      await api.post("/projects", projectData);

      toast({
        title: isDraft ? "Draft Saved" : "Project Created",
        description: isDraft
          ? "Your project has been saved as a draft"
          : "Your project has been created successfully",
      });

      navigate("/projects");
    } catch (err: any) {
      console.error("Failed to create project", err);
      toast({
        title: "Error",
        description: "Failed to create project: " + (err?.message || err),
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
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />

      <main
        className={cn(
          "flex-1 transition-all duration-300",
          sidebarCollapsed ? "ml-0" : "ml-30"
        )}
      >
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-slate-200/50">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/projects")}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
              >
                <ArrowLeft size={20} />
              </motion.button>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">Projects</span>
                <ChevronRight size={16} className="text-slate-300" />
                <span className="font-medium text-[#0F172A]">New Project</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
              >
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#23D3EE] rounded-full" />
              </motion.button>

              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#23D3EE] to-[#6366F1] flex items-center justify-center text-white font-semibold text-sm">
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
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#23D3EE] to-[#6366F1] flex items-center justify-center shadow-lg shadow-[#23D3EE]/25">
                <FolderPlus size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#0F172A]">Create New Project</h1>
                <p className="text-slate-500">Fill in the details to start a new project</p>
              </div>
            </div>
          </motion.div>

          <form onSubmit={(e) => handleSubmit(e, false)}>
            <div className="grid grid-cols-3 gap-6">
              {/* ============================================ */}
              {/* LEFT COLUMN - Main Details */}
              {/* ============================================ */}
              <div className="col-span-2 space-y-6">
                {/* Basic Information */}
                <SectionCard title="Basic Information" icon={FileText}>
                  <div className="space-y-5">
                    {/* Project Name */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-600">
                        Project Title <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Briefcase
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter project title"
                          required
                          className="h-12 pl-11 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20 text-base"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-600">Description</Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe the project scope, objectives, and key deliverables..."
                        rows={4}
                        className="rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20 resize-none"
                      />
                    </div>

                    {/* Client & Category */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-600">
                          Client <span className="text-red-500">*</span>
                        </Label>
                        <Select value={clientId} onValueChange={setClientId}>
                          <SelectTrigger className="h-12 rounded-xl border-slate-200">
                            <div className="flex items-center gap-2">
                              <Building2 size={16} className="text-slate-400" />
                              <SelectValue placeholder="Select client" />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {mockClients.map((client) => (
                              <SelectItem
                                key={client.id}
                                value={String(client.id)}
                                className="rounded-lg"
                              >
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-600">Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger className="h-12 rounded-xl border-slate-200">
                            <div className="flex items-center gap-2">
                              <Layers size={16} className="text-slate-400" />
                              <SelectValue placeholder="Select category" />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {categoryOptions.map((cat) => (
                              <SelectItem key={cat} value={cat} className="rounded-lg">
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Project Manager */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-600">Project Manager</Label>
                      <Select value={projectManager} onValueChange={setProjectManager}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200">
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-slate-400" />
                            <SelectValue placeholder="Assign project manager" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {mockTeamMembers.map((member) => (
                            <SelectItem
                              key={member.id}
                              value={String(member.id)}
                              className="rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#23D3EE] to-[#6366F1] flex items-center justify-center text-white text-xs font-semibold">
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
                        <Label className="text-sm font-medium text-slate-600">Start Date</Label>
                        <div className="relative">
                          <CalendarDays
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="h-12 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-600">Due Date</Label>
                        <div className="relative">
                          <CalendarDays
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <Input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="h-12 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
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
                      <Label className="text-sm font-medium text-slate-600">Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200">
                          <div className="flex items-center gap-2">
                            <StatusIcon size={16} className="text-slate-400" />
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {statusOptions.map((opt) => {
                            const Icon = opt.icon;
                            const colors = getStatusColor(opt.value);
                            return (
                              <SelectItem
                                key={opt.value}
                                value={opt.value}
                                className="rounded-lg"
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
                      <Label className="text-sm font-medium text-slate-600">Priority</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {priorityOptions.map((opt) => (
                          <motion.button
                            key={opt.value}
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setPriority(opt.value)}
                            className={cn(
                              "p-3 rounded-xl border text-sm font-medium transition-all",
                              priority === opt.value
                                ? opt.color
                                : "border-slate-200 text-slate-500 hover:border-slate-300"
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
                      <Label className="text-sm font-medium text-slate-600">Budget</Label>
                      <div className="relative">
                        <DollarSign
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <Input
                          type="number"
                          value={budget}
                          onChange={(e) => setBudget(e.target.value)}
                          placeholder="0.00"
                          className="h-12 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-600">
                        Estimated Hours
                      </Label>
                      <div className="relative">
                        <Clock
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <Input
                          type="number"
                          value={estimatedHours}
                          onChange={(e) => setEstimatedHours(e.target.value)}
                          placeholder="0"
                          className="h-12 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
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
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <p className="font-medium text-[#0F172A] text-sm">
                        Notify Team Members
                      </p>
                      <p className="text-xs text-slate-400">
                        Send email notifications when created
                      </p>
                    </div>
                    <Checkbox
                      checked={sendNotification}
                      onCheckedChange={(checked) =>
                        setSendNotification(checked as boolean)
                      }
                      className="border-slate-300 data-[state=checked]:bg-[#23D3EE] data-[state=checked]:border-[#23D3EE]"
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
                    className="w-full h-12 bg-gradient-to-r from-[#23D3EE] to-[#23D3EE]/90 hover:from-[#23D3EE]/90 hover:to-[#23D3EE] text-white rounded-xl shadow-lg shadow-[#23D3EE]/25 text-base font-semibold"
                  >
                    {submitting && !saveAsDraft ? (
                      <>
                        <Loader2 size={18} className="animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} className="mr-2" />
                        Create Project
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting && saveAsDraft}
                    onClick={(e) => handleSubmit(e, true)}
                    className="w-full h-11 rounded-xl border-slate-200 hover:bg-slate-50"
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
                    className="w-full h-11 rounded-xl text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </Button>
                </motion.div>

                {/* Help Card */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="p-4 bg-gradient-to-br from-[#23D3EE]/5 to-[#FBBF23]/5 rounded-2xl border border-[#23D3EE]/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#23D3EE]/10 flex items-center justify-center flex-shrink-0">
                      <HelpCircle size={16} className="text-[#23D3EE]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#0F172A] text-sm mb-1">
                        Need Help?
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Check our project management guide or contact support for
                        assistance.
                      </p>
                      <button className="mt-2 text-xs font-medium text-[#23D3EE] hover:underline">
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
