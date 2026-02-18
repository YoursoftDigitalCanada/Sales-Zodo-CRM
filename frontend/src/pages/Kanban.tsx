// src/pages/KanbanPage.tsx
import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Sidebar } from "@/components/Sidebar";
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
import api from "@/lib/axios";

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
    bg: "bg-[#17C3B2]/10",
    border: "border-[#17C3B2]/20",
    text: "text-[#17C3B2]",
    dot: "bg-[#17C3B2]",
    header: "from-[#17C3B2]/20 to-[#17C3B2]/5",
  },
  gold: {
    bg: "bg-[#C9A14A]/10",
    border: "border-[#C9A14A]/20",
    text: "text-[#C9A14A]",
    dot: "bg-[#C9A14A]",
    header: "from-[#C9A14A]/20 to-[#C9A14A]/5",
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
  low: { bg: "bg-slate-100", text: "text-slate-600", label: "Low" },
  medium: { bg: "bg-blue-100", text: "text-blue-600", label: "Medium" },
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
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "group bg-white rounded-xl border border-slate-200 p-4 cursor-grab active:cursor-grabbing",
        "hover:border-[#17C3B2]/30 hover:shadow-lg hover:shadow-[#17C3B2]/5 transition-all",
        isDragging && "shadow-2xl rotate-2"
      )}
    >
      {/* Drag Handle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GripVertical
            size={14}
            className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
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
            <button className="p-1 rounded-lg hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all">
              <MoreHorizontal size={14} className="text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            <DropdownMenuItem onClick={onEdit} className="rounded-lg">
              <Edit3 size={14} className="mr-2" />
              Edit Task
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onMove("todo")}
              className="rounded-lg"
              disabled={task.status === "todo"}
            >
              <Circle size={14} className="mr-2 text-[#17C3B2]" />
              Move to To Do
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onMove("in-progress")}
              className="rounded-lg"
              disabled={task.status === "in-progress"}
            >
              <Timer size={14} className="mr-2 text-[#C9A14A]" />
              Move to In Progress
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onMove("review")}
              className="rounded-lg"
              disabled={task.status === "review"}
            >
              <AlertCircle size={14} className="mr-2 text-purple-500" />
              Move to Review
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onMove("done")}
              className="rounded-lg"
              disabled={task.status === "done"}
            >
              <CheckCircle2 size={14} className="mr-2 text-emerald-500" />
              Move to Done
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="rounded-lg text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 size={14} className="mr-2" />
              Delete Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Task Title */}
      <h4 className="font-semibold text-[#0D2342] mb-2 line-clamp-2">
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-slate-500 mb-3 line-clamp-2">
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
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        {/* Assignee */}
        {task.assignee ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#17C3B2] to-[#C9A14A] flex items-center justify-center text-white text-[10px] font-bold">
              {task.assignee
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </div>
            <span className="text-xs text-slate-500">{task.assignee}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <User size={12} />
            <span>Unassigned</span>
          </div>
        )}

        {/* Due Date */}
        {task.dueDate && (
          <div className="flex items-center gap-1 text-xs text-slate-400">
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
  const colors = columnColors[column.color];
  const Icon = column.icon;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
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
        "flex flex-col bg-slate-50/50 rounded-2xl border-2 border-dashed transition-all min-h-[600px]",
        isDragOver
          ? `${colors.border} ${colors.bg}`
          : "border-transparent"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div
        className={cn(
          "p-4 rounded-t-2xl bg-gradient-to-b",
          colors.header
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                colors.bg
              )}
            >
              <Icon size={18} className={colors.text} />
            </div>
            <div>
              <h3 className="font-semibold text-[#0D2342]">{column.title}</h3>
              <p className="text-xs text-slate-400">
                {column.tasks.length} {column.tasks.length === 1 ? "task" : "tasks"}
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onAddTask}
            className={cn(
              "p-2 rounded-xl transition-colors",
              colors.bg,
              "hover:opacity-80"
            )}
          >
            <Plus size={16} className={colors.text} />
          </motion.button>
        </div>
      </div>

      {/* Tasks Container */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
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

        {/* Empty State */}
        {column.tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div
              className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-4",
                colors.bg
              )}
            >
              <Icon size={24} className={cn(colors.text, "opacity-50")} />
            </div>
            <p className="text-slate-400 text-sm mb-3">No tasks yet</p>
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
      <DialogContent className="sm:max-w-[500px] rounded-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-[#17C3B2]/10 to-transparent">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0D2342]">
              {task ? "Edit Task" : "Create New Task"}
            </DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">
              Task Title <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Enter task title..."
              required
              className="h-11 rounded-xl border-slate-200 focus:border-[#17C3B2] focus:ring-2 focus:ring-[#17C3B2]/20"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">
              Description
            </Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Add a description..."
              className="min-h-[100px] rounded-xl border-slate-200 focus:border-[#17C3B2] focus:ring-2 focus:ring-[#17C3B2]/20 resize-none"
            />
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) =>
                  setFormData({ ...formData, status: val })
                }
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="todo" className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <Circle size={12} className="text-[#17C3B2]" />
                      To Do
                    </div>
                  </SelectItem>
                  <SelectItem value="in-progress" className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <Timer size={12} className="text-[#C9A14A]" />
                      In Progress
                    </div>
                  </SelectItem>
                  <SelectItem value="review" className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={12} className="text-purple-500" />
                      Review
                    </div>
                  </SelectItem>
                  <SelectItem value="done" className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                      Done
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    priority: val as KanbanTask["priority"],
                  })
                }
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="low" className="rounded-lg">
                    <span className="text-slate-600">Low</span>
                  </SelectItem>
                  <SelectItem value="medium" className="rounded-lg">
                    <span className="text-blue-600">Medium</span>
                  </SelectItem>
                  <SelectItem value="high" className="rounded-lg">
                    <span className="text-orange-600">High</span>
                  </SelectItem>
                  <SelectItem value="urgent" className="rounded-lg">
                    <span className="text-red-600">Urgent</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Assignee</Label>
              <Input
                value={formData.assignee}
                onChange={(e) =>
                  setFormData({ ...formData, assignee: e.target.value })
                }
                placeholder="Enter name..."
                className="h-11 rounded-xl border-slate-200 focus:border-[#17C3B2] focus:ring-2 focus:ring-[#17C3B2]/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Due Date</Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
                className="h-11 rounded-xl border-slate-200 focus:border-[#17C3B2] focus:ring-2 focus:ring-[#17C3B2]/20"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">
              Tags <span className="text-xs text-slate-400">(comma separated)</span>
            </Label>
            <Input
              value={formData.tags}
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
              placeholder="design, frontend, urgent..."
              className="h-11 rounded-xl border-slate-200 focus:border-[#17C3B2] focus:ring-2 focus:ring-[#17C3B2]/20"
            />
          </div>

          {/* Actions */}
          <DialogFooter className="gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.title.trim()}
              className="bg-[#17C3B2] hover:bg-[#17C3B2]/90 text-white rounded-xl shadow-lg shadow-[#17C3B2]/25"
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
      const res = await api.get("/tasks/kanban");
      const data = res.data?.data || [];

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
      const res = await api.post("/tasks", {
        taskTitle: task.title || "",
        description: task.description || "",
        status: columnIdToStatus[task.status || "todo"] || "TODO",
        priority: (task.priority || "medium").toUpperCase(),
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : undefined,
        tags: task.tags || [],
      });

      const createdPayload = res.data?.data || res.data;
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
      const res = await api.put(`/tasks/${task.id}`, {
        taskTitle: task.title,
        description: task.description,
        status: task.status ? columnIdToStatus[task.status] : undefined,
        priority: task.priority ? task.priority.toUpperCase() : undefined,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : undefined,
        tags: task.tags,
      });

      const updatedPayload = res.data?.data || res.data;
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
      await api.delete(`/tasks/${taskId}`);
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
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
        <main
          className={cn(
            "flex-1 transition-all duration-300 flex items-center justify-center",
            sidebarCollapsed ? "ml-20" : "ml-72"
          )}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#17C3B2]/10 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-[#17C3B2] animate-spin" />
            </div>
            <p className="text-slate-500 font-medium">Loading Kanban Board...</p>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      <main
        className={cn(
          "flex-1 transition-all duration-300",
          sidebarCollapsed ? "ml-0" : "ml-30"
        )}
      >
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
          <div className="flex h-20 items-center justify-between px-6">
            {/* Left Section - Search */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 h-11 pl-10 pr-4 rounded-xl bg-slate-100 border-none text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#17C3B2]/20 focus:bg-white transition-all"
                />
              </div>

              {/* Priority Filter */}
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-40 h-11 rounded-xl border-slate-200">
                  <div className="flex items-center gap-2">
                    <Filter size={14} className="text-slate-400" />
                    <SelectValue placeholder="All Priorities" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="rounded-lg">
                    All Priorities
                  </SelectItem>
                  <SelectItem value="urgent" className="rounded-lg">
                    Urgent
                  </SelectItem>
                  <SelectItem value="high" className="rounded-lg">
                    High
                  </SelectItem>
                  <SelectItem value="medium" className="rounded-lg">
                    Medium
                  </SelectItem>
                  <SelectItem value="low" className="rounded-lg">
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
                className="flex items-center gap-2 px-4 py-2.5 bg-[#17C3B2] text-white text-sm font-medium rounded-xl shadow-lg shadow-[#17C3B2]/25 hover:bg-[#17C3B2]/90 transition-colors"
              >
                <Plus size={16} />
                <span>Add Task</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors relative"
              >
                <Bell size={18} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  2
                </span>
              </motion.button>

              {/* User Avatar */}
              <div className="flex items-center gap-3 pl-3 ml-3 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-[#0D2342]">
                    {user ? `${user.firstName} ${user.lastName}` : "Guest User"}
                  </p>
                  <p className="text-xs text-slate-400">Administrator</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#17C3B2] via-[#17C3B2]/80 to-[#C9A14A] flex items-center justify-center text-white font-bold shadow-lg">
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
        <div className="p-6 space-y-6">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0D2342] via-[#0D2342] to-[#17C3B2]/30 p-8"
          >
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#17C3B2]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-[#C9A14A]/10 rounded-full blur-3xl" />

            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2 mb-3"
                >
                  <Sparkles size={20} className="text-[#C9A14A]" />
                  <span className="text-[#C9A14A] text-sm font-medium">
                    Project Management
                  </span>
                </motion.div>
                <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                  Kanban <span className="text-[#17C3B2]">Board</span>
                </h1>
                <p className="text-slate-300 text-lg max-w-xl">
                  Drag and drop tasks to organize your workflow. You have{" "}
                  <span className="text-[#17C3B2] font-semibold">
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
                    className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4 min-w-[120px]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <col.icon size={14} className="text-[#17C3B2]" />
                      <span className="text-xs text-slate-400">{col.title}</span>
                    </div>
                    <span className="text-2xl font-bold text-white">
                      {col.tasks.length}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Kanban Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {getFilteredColumns().map((column, index) => (
              <motion.div
                key={column.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
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
        <footer className="px-6 py-4 border-t border-slate-200 bg-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <span>© {new Date().getFullYear()}</span>
              <span className="font-semibold text-[#0D2342]">Yoursoft</span>
              <span className="text-[#17C3B2] font-semibold">Digital</span>
              <span>• All rights reserved</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-[#17C3B2] transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-[#17C3B2] transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-[#17C3B2] transition-colors">
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
