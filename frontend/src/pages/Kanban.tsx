// src/pages/KanbanPage.tsx
import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  Search,
  Plus,
  MoreHorizontal,
  Calendar,
  Clock,
  Tag,
  User,
  Trash2,
  Edit3,
  ArrowRight,
  CheckCircle2,
  Circle,
  Timer,
  AlertCircle,
  Sparkles,
  Filter,
  SlidersHorizontal,
  LayoutGrid,
  List,
  GripVertical,
  ChevronDown,
  X,
  Loader2,
  FolderKanban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getKanbanTasks, createTask, updateTask, deleteTask } from "@/features/tasks";

// ============================================
// TYPES
// ============================================

interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: "low" | "medium" | "high" | "urgent";
  tags: string[];
  assignee?: string;
  dueDate?: string;
  createdAt?: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  tasks: KanbanTask[];
  color: "teal" | "gold" | "purple" | "green";
  icon: React.ElementType;
}

interface User {
  firstName: string;
  lastName: string;
}

// ============================================
// THEME COLORS
// ============================================

const columnColors = {
  teal: {
    bg: "bg-[#0891B2]/10",
    border: "border-[#22D3EE]/20",
    text: "text-[#0891B2]",
    dot: "bg-[#0891B2]",
    header: "from-[#22D3EE]/20/5",
  },
  gold: {
    bg: "bg-[#D97706]/10",
    border: "border-[#FBBF24]/20",
    text: "text-[#D97706]",
    dot: "bg-[#D97706]",
    header: "from-[#FBBF24]/20/5",
  },
  purple: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    text: "text-purple-500",
    dot: "bg-purple-500",
    header: "from-purple-500/20 to-purple-500/5",
  },
  green: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-500",
    dot: "bg-emerald-500",
    header: "from-emerald-500/20 to-emerald-500/5",
  },
};

const priorityColors = {
  low: { bg: "bg-white/5", text: "text-[#475569]", label: "Low" },
  medium: { bg: "bg-blue-100", text: "text-[#0891B2]", label: "Medium" },
  high: { bg: "bg-orange-100", text: "text-orange-600", label: "High" },
  urgent: { bg: "bg-red-100", text: "text-red-600", label: "Urgent" },
};

const defaultColumns: KanbanColumn[] = [
  { id: "todo", title: "To Do", tasks: [], color: "teal", icon: Circle },
  { id: "in-progress", title: "In Progress", tasks: [], color: "gold", icon: Timer },
  { id: "review", title: "Review", tasks: [], color: "purple", icon: AlertCircle },
  { id: "done", title: "Done", tasks: [], color: "green", icon: CheckCircle2 },
];

const statusToColumnId: Record<string, string> = {
  TODO: "todo",
  IN_PROGRESS: "in-progress",
  REVIEW: "review",
  DONE: "done",
};

const columnIdToStatus: Record<string, string> = {
  "todo": "TODO",
  "in-progress": "IN_PROGRESS",
  "review": "REVIEW",
  "done": "DONE",
};

// ============================================
// TASK CARD COMPONENT
// ============================================

const TaskCard = ({
  task,
  onEdit,
  onDelete,
  onMove,
  columnColor,
}: {
  task: KanbanTask;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (newStatus: string) => void;
  columnColor: keyof typeof columnColors;
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData("taskId", task.id);
    e.dataTransfer.setData("sourceColumn", task.status);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -2 }}
    >
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={cn(
          "group bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-4 cursor-grab active:cursor-grabbing",
          "hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all",
          isDragging && "shadow-lg rotate-2"
        )}
      >
      {/* Drag Handle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GripVertical
            size={14}
            className="text-[#475569] opacity-0 group-hover:opacity-100 transition-opacity"
          />
          {task.priority && (
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase",
                priorityColors[task.priority].bg,
                priorityColors[task.priority].text
              )}
            >
              {priorityColors[task.priority].label}
            </span>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-md hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all">
              <MoreHorizontal size={14} className="text-[#475569]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-md">
            <DropdownMenuItem onClick={onEdit} className="rounded-md">
              <Edit3 size={14} className="mr-2" />
              Edit Task
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onMove("todo")}
              className="rounded-md"
              disabled={task.status === "todo"}
            >
              <Circle size={14} className="mr-2 text-[#0891B2]" />
              Move to To Do
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onMove("in-progress")}
              className="rounded-md"
              disabled={task.status === "in-progress"}
            >
              <Timer size={14} className="mr-2 text-[#D97706]" />
              Move to In Progress
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onMove("review")}
              className="rounded-md"
              disabled={task.status === "review"}
            >
              <AlertCircle size={14} className="mr-2 text-purple-500" />
              Move to Review
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onMove("done")}
              className="rounded-md"
              disabled={task.status === "done"}
            >
              <CheckCircle2 size={14} className="mr-2 text-emerald-500" />
              Move to Done
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="rounded-md text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 size={14} className="mr-2" />
              Delete Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Task Title */}
      <h4 className="font-semibold text-[#0F172A] mb-2 line-clamp-2">
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-[#94A3B8] mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-medium",
                columnColors[columnColor].bg,
                columnColors[columnColor].text
              )}
            >
              #{tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-[#94A3B8]">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[rgba(15,23,42,0.06)]">
        {/* Assignee */}
        {task.assignee ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] text-[10px] font-bold">
              {task.assignee
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </div>
            <span className="text-xs text-[#94A3B8]">{task.assignee}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-[#475569]">
            <User size={12} />
            <span>Unassigned</span>
          </div>
        )}

        {/* Due Date */}
        {task.dueDate && (
          <div className="flex items-center gap-1 text-xs text-[#475569]">
            <Calendar size={12} />
            <span>
              {new Date(task.dueDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        )}
      </div>
      </div>
    </motion.div>
  );
};

// ============================================
// KANBAN COLUMN COMPONENT
// ============================================

const KanbanColumnComponent = ({
  column,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onMoveTask,
  onDrop,
}: {
  column: KanbanColumn;
  onAddTask: () => void;
  onEditTask: (task: KanbanTask) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (taskId: string, newStatus: string) => void;
  onDrop: (taskId: string, targetColumn: string) => void;
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);
  const colors = columnColors[column.color];
  const Icon = column.icon;

  // Auto-scroll when dragging near edges
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);

    const container = scrollContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const edgeThreshold = 60; // px from edge to trigger scroll
    const scrollSpeed = 8;

    if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current);

    if (y < edgeThreshold) {
      // Near top — scroll up
      const doScroll = () => {
        if (container.scrollTop > 0) {
          container.scrollTop -= scrollSpeed;
          autoScrollRef.current = requestAnimationFrame(doScroll);
        }
      };
      autoScrollRef.current = requestAnimationFrame(doScroll);
    } else if (y > rect.height - edgeThreshold) {
      // Near bottom — scroll down
      const doScroll = () => {
        if (container.scrollTop < container.scrollHeight - container.clientHeight) {
          container.scrollTop += scrollSpeed;
          autoScrollRef.current = requestAnimationFrame(doScroll);
        }
      };
      autoScrollRef.current = requestAnimationFrame(doScroll);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
    const taskId = e.dataTransfer.getData("taskId");
    const sourceColumn = e.dataTransfer.getData("sourceColumn");
    if (taskId && sourceColumn !== column.id) {
      onDrop(taskId, column.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col bg-[#F8FAFC]/50 rounded-md border-2 border-dashed transition-all h-full",
        isDragOver
          ? `${colors.border} ${colors.bg} scale-[1.01] shadow-lg`
          : "border-transparent"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header — sticky so it stays visible while scrolling */}
      <div
        className={cn(
          "p-4 rounded-t-2xl sticky top-0 z-10 bg-[#F8FAFC] backdrop-blur-sm",
          colors.header
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-md flex items-center justify-center",
                colors.bg
              )}
            >
              <Icon size={18} className={colors.text} />
            </div>
            <div>
              <h3 className="font-semibold text-[#0F172A]">{column.title}</h3>
              <p className="text-xs text-[#475569]">
                {column.tasks.length} {column.tasks.length === 1 ? "task" : "tasks"}
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onAddTask}
            className={cn(
              "p-2 rounded-md transition-colors",
              colors.bg,
              "hover:opacity-80"
            )}
          >
            <Plus size={16} className={colors.text} />
          </motion.button>
        </div>
      </div>

      {/* Tasks Container — scrollable within fixed column height */}
      <div
        ref={scrollContainerRef}
        className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar"
      >
        <AnimatePresence mode="popLayout">
          {column.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              columnColor={column.color}
              onEdit={() => onEditTask(task)}
              onDelete={() => onDeleteTask(task.id)}
              onMove={(newStatus) => onMoveTask(task.id, newStatus)}
            />
          ))}
        </AnimatePresence>

        {/* Drop zone hint when dragging */}
        {isDragOver && column.tasks.length > 0 && (
          <div className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center text-sm font-medium transition-all",
            colors.border, colors.text
          )}>
            Drop here to move to {column.title}
          </div>
        )}

        {/* Empty State */}
        {column.tasks.length === 0 && !isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div
              className={cn(
                "w-16 h-16 rounded-md flex items-center justify-center mb-4",
                colors.bg
              )}
            >
              <Icon size={24} className={cn(colors.text, "opacity-50")} />
            </div>
            <p className="text-[#475569] text-sm mb-3">No tasks yet</p>
            <button
              onClick={onAddTask}
              className={cn(
                "text-sm font-medium flex items-center gap-1 transition-colors",
                colors.text,
                "hover:opacity-80"
              )}
            >
              <Plus size={14} />
              Add a task
            </button>
          </motion.div>
        )}

        {/* Empty drop zone */}
        {column.tasks.length === 0 && isDragOver && (
          <div className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center text-sm font-medium",
            colors.border, colors.text
          )}>
            Drop here to add to {column.title}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ============================================
// ADD/EDIT TASK DIALOG
// ============================================

const TaskDialog = ({
  isOpen,
  onClose,
  onSubmit,
  task,
  defaultStatus,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Partial<KanbanTask>) => void;
  task?: KanbanTask | null;
  defaultStatus?: string;
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: defaultStatus || "todo",
    priority: "medium" as KanbanTask["priority"],
    tags: "",
    assignee: "",
    dueDate: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        status: task.status || "todo",
        priority: task.priority || "medium",
        tags: task.tags?.join(", ") || "",
        assignee: task.assignee || "",
        dueDate: task.dueDate || "",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        status: defaultStatus || "todo",
        priority: "medium",
        tags: "",
        assignee: "",
        dueDate: "",
      });
    }
  }, [task, defaultStatus, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const taskData: Partial<KanbanTask> = {
      ...formData,
      tags: formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    if (task) {
      taskData.id = task.id;
    }

    await onSubmit(taskData);
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-md p-0 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              {task ? "Edit Task" : "Create New Task"}
            </DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">
              Task Title <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Enter task title..."
              required
              className="h-11 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">
              Description
            </Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Add a description..."
              className="min-h-[100px] rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20 resize-none"
            />
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) =>
                  setFormData({ ...formData, status: val })
                }
              >
                <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="todo" className="rounded-md">
                    <div className="flex items-center gap-2">
                      <Circle size={12} className="text-[#0891B2]" />
                      To Do
                    </div>
                  </SelectItem>
                  <SelectItem value="in-progress" className="rounded-md">
                    <div className="flex items-center gap-2">
                      <Timer size={12} className="text-[#D97706]" />
                      In Progress
                    </div>
                  </SelectItem>
                  <SelectItem value="review" className="rounded-md">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={12} className="text-purple-500" />
                      Review
                    </div>
                  </SelectItem>
                  <SelectItem value="done" className="rounded-md">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                      Done
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    priority: val as KanbanTask["priority"],
                  })
                }
              >
                <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="low" className="rounded-md">
                    <span className="text-[#475569]">Low</span>
                  </SelectItem>
                  <SelectItem value="medium" className="rounded-md">
                    <span className="text-[#0891B2]">Medium</span>
                  </SelectItem>
                  <SelectItem value="high" className="rounded-md">
                    <span className="text-orange-600">High</span>
                  </SelectItem>
                  <SelectItem value="urgent" className="rounded-md">
                    <span className="text-red-600">Urgent</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Assignee</Label>
              <Input
                value={formData.assignee}
                onChange={(e) =>
                  setFormData({ ...formData, assignee: e.target.value })
                }
                placeholder="Enter name..."
                className="h-11 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Due Date</Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
                className="h-11 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">
              Tags <span className="text-xs text-[#475569]">(comma separated)</span>
            </Label>
            <Input
              value={formData.tags}
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
              placeholder="design, frontend, urgent..."
              className="h-11 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
            />
          </div>

          {/* Actions */}
          <DialogFooter className="gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-md"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.title.trim()}
              className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md "
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : null}
              {task ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const KanbanPage: React.FC = () => {
  // State
    const [columns, setColumns] = useState<KanbanColumn[]>(defaultColumns);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [user, setUser] = useState<User | null>(null);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<string>("todo");

  // Load user
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

  // Load kanban data
  const loadKanban = async () => {
    setLoading(true);
    try {
      const data = await getKanbanTasks() as any[];

      const columnsMap = new Map<string, KanbanTask[]>();
      defaultColumns.forEach((col) => columnsMap.set(col.id, []));

      (data || []).forEach((col: any) => {
        const columnId = statusToColumnId[col.status] || "todo";
        const tasks = (col.tasks || []).map((task: any) => ({
          id: task.id,
          title: task.title || task.taskTitle || "",
          description: task.description || "",
          status: columnId,
          priority: (task.priority || "MEDIUM").toLowerCase(),
          tags: task.tags || [],
          assignee: task.assignedTo
            ? `${task.assignedTo.user?.firstName || ""} ${task.assignedTo.user?.lastName || ""}`.trim()
            : "",
          dueDate: task.dueDate,
          createdAt: task.createdAt,
        }));
        columnsMap.set(columnId, tasks);
      });

      const mergedColumns = defaultColumns.map((defaultCol) => ({
        ...defaultCol,
        tasks: columnsMap.get(defaultCol.id) || [],
      }));
      setColumns(mergedColumns);
    } catch (err) {
      console.error("Failed to load kanban", err);
      setColumns(defaultColumns);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKanban();
  }, []);

  // Handlers
  const handleAddTask = async (task: Partial<KanbanTask>) => {
    try {
      const createdPayload = await createTask({
        taskTitle: task.title || "",
        description: task.description || "",
        status: columnIdToStatus[task.status || "todo"] || "TODO",
        priority: (task.priority || "medium").toUpperCase(),
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : undefined,
        tags: task.tags || [],
      }) as any;
      const created: KanbanTask = {
        id: createdPayload.id,
        title: createdPayload.title || createdPayload.taskTitle || task.title || "",
        description: createdPayload.description || task.description || "",
        status: statusToColumnId[createdPayload.status] || task.status || "todo",
        priority: (createdPayload.priority || task.priority || "medium").toLowerCase(),
        tags: createdPayload.tags || task.tags || [],
        assignee: createdPayload.assignee || task.assignee || "",
        dueDate: createdPayload.dueDate || task.dueDate,
        createdAt: createdPayload.createdAt || new Date().toISOString(),
      };
      setColumns((prev) =>
        prev.map((col) =>
          col.id === created.status
            ? { ...col, tasks: [created, ...col.tasks] }
            : col
        )
      );
    } catch (err) {
      console.error("Failed to create task", err);
      // Optimistic update for demo
      const newTask: KanbanTask = {
        id: Date.now().toString(),
        title: task.title || "",
        description: task.description,
        status: task.status || "todo",
        priority: task.priority,
        tags: task.tags || [],
        assignee: task.assignee,
        dueDate: task.dueDate,
        createdAt: new Date().toISOString(),
      };
      setColumns((prev) =>
        prev.map((col) =>
          col.id === newTask.status
            ? { ...col, tasks: [newTask, ...col.tasks] }
            : col
        )
      );
    }
  };

  const handleUpdateTask = async (task: Partial<KanbanTask>) => {
    if (!task.id) return;

    try {
      const updatedPayload = await updateTask(task.id, {
        taskTitle: task.title,
        description: task.description,
        status: task.status ? columnIdToStatus[task.status] : undefined,
        priority: task.priority ? task.priority.toUpperCase() : undefined,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : undefined,
        tags: task.tags,
      }) as any;
      const updated: KanbanTask = {
        id: updatedPayload.id,
        title: updatedPayload.title || updatedPayload.taskTitle || task.title || "",
        description: updatedPayload.description || task.description || "",
        status: statusToColumnId[updatedPayload.status] || task.status || "todo",
        priority: (updatedPayload.priority || task.priority || "medium").toLowerCase(),
        tags: updatedPayload.tags || task.tags || [],
        assignee: updatedPayload.assignee || task.assignee || "",
        dueDate: updatedPayload.dueDate || task.dueDate,
        createdAt: updatedPayload.createdAt || task.createdAt,
      };
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          tasks:
            col.id === updated.status
              ? [updated, ...col.tasks.filter((t) => t.id !== updated.id)]
              : col.tasks.filter((t) => t.id !== updated.id),
        }))
      );
    } catch (err) {
      console.error("Failed to update task", err);
      // Optimistic update
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          tasks:
            col.id === task.status
              ? [
                { ...col.tasks.find((t) => t.id === task.id)!, ...task } as KanbanTask,
                ...col.tasks.filter((t) => t.id !== task.id),
              ]
              : col.tasks.filter((t) => t.id !== task.id),
        }))
      );
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
    } catch (err) {
      console.error("Failed to delete task", err);
    }
    // Always update UI
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => t.id !== taskId),
      }))
    );
  };

  const handleMoveTask = (taskId: string, newStatus: string) => {
    setColumns((prev) => {
      let taskToMove: KanbanTask | undefined;

      const columnsWithoutTask = prev.map((col) => {
        const task = col.tasks.find((t) => t.id === taskId);
        if (task) {
          taskToMove = { ...task, status: newStatus };
        }
        return {
          ...col,
          tasks: col.tasks.filter((t) => t.id !== taskId),
        };
      });

      if (!taskToMove) return prev;

      return columnsWithoutTask.map((col) =>
        col.id === newStatus
          ? { ...col, tasks: [taskToMove!, ...col.tasks] }
          : col
      );
    });

    // Also update on server
    const task = columns
      .flatMap((c) => c.tasks)
      .find((t) => t.id === taskId);
    if (task) {
      handleUpdateTask({ ...task, status: newStatus });
    }
  };

  const openAddDialog = (status: string = "todo") => {
    setEditingTask(null);
    setDefaultStatus(status);
    setIsDialogOpen(true);
  };

  const openEditDialog = (task: KanbanTask) => {
    setEditingTask(task);
    setDefaultStatus(task.status);
    setIsDialogOpen(true);
  };

  // Filter tasks
  const getFilteredColumns = () => {
    return columns.map((col) => ({
      ...col,
      tasks: col.tasks.filter((task) => {
        const matchesSearch =
          !searchQuery ||
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPriority =
          filterPriority === "all" || task.priority === filterPriority;
        return matchesSearch && matchesPriority;
      }),
    }));
  };

  const totalTasks = columns.reduce((acc, col) => acc + col.tasks.length, 0);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <main
          className={cn(
            "flex-1 transition-all duration-300 flex items-center justify-center"
          )}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-16 h-16 rounded-md bg-[#0891B2]/10 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-[#0891B2] animate-spin" />
            </div>
            <p className="text-[#94A3B8] font-medium">Loading Kanban Board...</p>
          </motion.div>
        </main>
      </div>
    );
  }

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
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[rgba(15,23,42,0.06)]/50">
          <div className="flex h-20 items-center justify-between px-6">
            {/* Left Section - Search */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569]" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 h-11 pl-10 pr-4 rounded-md bg-white/5 border-none text-sm placeholder:text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#22D3EE]/20 focus:bg-white transition-all"
                />
              </div>

              {/* Priority Filter */}
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-40 h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                  <div className="flex items-center gap-2">
                    <Filter size={14} className="text-[#475569]" />
                    <SelectValue placeholder="All Priorities" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="all" className="rounded-md">
                    All Priorities
                  </SelectItem>
                  <SelectItem value="urgent" className="rounded-md">
                    Urgent
                  </SelectItem>
                  <SelectItem value="high" className="rounded-md">
                    High
                  </SelectItem>
                  <SelectItem value="medium" className="rounded-md">
                    Medium
                  </SelectItem>
                  <SelectItem value="low" className="rounded-md">
                    Low
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => openAddDialog()}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0891B2] text-white text-sm font-medium rounded-md  hover:bg-[#0891B2]/90 transition-colors"
              >
                <Plus size={16} />
                <span>Add Task</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2.5 rounded-md bg-white/5 text-[#475569] hover:bg-slate-200 transition-colors relative"
              >
                <Bell size={18} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-[#0F172A] text-[10px] font-bold rounded-full flex items-center justify-center">
                  2
                </span>
              </motion.button>

              {/* User Avatar */}
              <div className="flex items-center gap-3 pl-3 ml-3 border-l border-[rgba(15,23,42,0.06)]">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-[#0F172A]">
                    {user ? `${user.firstName} ${user.lastName}` : "Guest User"}
                  </p>
                  <p className="text-xs text-[#475569]">Administrator</p>
                </div>
                <div className="h-11 w-11 rounded-md bg-[#0891B2] flex items-center justify-center text-[#0F172A] font-bold card-shadow">
                  {user
                    ? (user.firstName[0] + user.lastName[0]).toUpperCase()
                    : "GU"}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ============================================ */}
        {/* MAIN CONTENT */}
        {/* ============================================ */}
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-[#F1F5F9] p-8"
          >
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#0891B2]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-[#D97706]/10 rounded-full blur-3xl" />

            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2 mb-3"
                >
                  <Sparkles size={20} className="text-[#D97706]" />
                  <span className="text-[#D97706] text-sm font-medium">
                    Project Management
                  </span>
                </motion.div>
                <h1 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-2">
                  Kanban <span className="text-[#0891B2]">Board</span>
                </h1>
                <p className="text-[#475569] text-lg max-w-xl">
                  Drag and drop tasks to organize your workflow. You have{" "}
                  <span className="text-[#0891B2] font-semibold">
                    {totalTasks} tasks
                  </span>{" "}
                  across all columns.
                </p>
              </div>

              {/* Stats */}
              <div className="flex gap-4">
                {columns.slice(0, 2).map((col) => (
                  <motion.div
                    key={col.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/10 backdrop-blur-sm border border-[rgba(15,23,42,0.06)] rounded-md p-4 min-w-[120px]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <col.icon size={14} className="text-[#0891B2]" />
                      <span className="text-xs text-[#475569]">{col.title}</span>
                    </div>
                    <span className="text-xl sm:text-2xl font-bold text-[#0F172A]">
                      {col.tasks.length}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Kanban Columns — viewport-height constrained so all columns are equal */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}>
            {getFilteredColumns().map((column, index) => (
              <motion.div
                key={column.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="h-full"
              >
                <KanbanColumnComponent
                  column={column}
                  onAddTask={() => openAddDialog(column.id)}
                  onEditTask={openEditDialog}
                  onDeleteTask={handleDeleteTask}
                  onMoveTask={handleMoveTask}
                  onDrop={handleMoveTask}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-[rgba(15,23,42,0.06)] bg-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#475569]">
            <div className="flex items-center gap-2">
              <span>© {new Date().getFullYear()}</span>
              <span className="font-semibold text-[#0F172A]">Yoursoft</span>
              <span className="text-[#0891B2] font-semibold">Digital</span>
              <span>• All rights reserved</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-[#0891B2] transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-[#0891B2] transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-[#0891B2] transition-colors">
                Support
              </a>
            </div>
          </div>
        </footer>
      </main>

      {/* Task Dialog */}
      <TaskDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingTask(null);
        }}
        onSubmit={editingTask ? handleUpdateTask : handleAddTask}
        task={editingTask}
        defaultStatus={defaultStatus}
      />

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(23, 195, 178, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(23, 195, 178, 0.5);
        }
      `}</style>
    </div>
  );
};

export default KanbanPage;
