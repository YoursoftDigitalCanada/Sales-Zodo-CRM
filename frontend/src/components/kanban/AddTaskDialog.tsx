// src/components/kanban/AddTaskDialog.tsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Circle,
  Timer,
  AlertCircle,
  CheckCircle2,
  Tag,
  User,
  Calendar,
  FileText,
  Loader2,
  Sparkles,
  Flag,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface KanbanTask {
  id?: string;
  title: string;
  description?: string;
  status: string;
  priority?: "low" | "medium" | "high" | "urgent";
  tags: string[];
  assignee?: string;
  dueDate?: string;
}

interface AddTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreate: (task: Partial<KanbanTask>) => void;
  editTask?: KanbanTask | null;
  defaultStatus?: string;
}

// ============================================
// CONSTANTS
// ============================================

const statusOptions = [
  {
    value: "todo",
    label: "To Do",
    icon: Circle,
    color: "text-[#17C3B2]",
    bg: "bg-[#17C3B2]/10",
  },
  {
    value: "in-progress",
    label: "In Progress",
    icon: Timer,
    color: "text-[#C9A14A]",
    bg: "bg-[#C9A14A]/10",
  },
  {
    value: "review",
    label: "Review",
    icon: AlertCircle,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    value: "done",
    label: "Done",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
];

const priorityOptions = [
  {
    value: "low",
    label: "Low",
    color: "text-slate-600",
    bg: "bg-slate-100",
    dot: "bg-slate-400",
  },
  {
    value: "medium",
    label: "Medium",
    color: "text-blue-600",
    bg: "bg-blue-100",
    dot: "bg-blue-500",
  },
  {
    value: "high",
    label: "High",
    color: "text-orange-600",
    bg: "bg-orange-100",
    dot: "bg-orange-500",
  },
  {
    value: "urgent",
    label: "Urgent",
    color: "text-red-600",
    bg: "bg-red-100",
    dot: "bg-red-500",
  },
];

// ============================================
// STYLED COMPONENTS
// ============================================

const StyledInput = ({
  label,
  required,
  icon: Icon,
  hint,
  ...props
}: {
  label: string;
  required?: boolean;
  icon?: React.ElementType;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <Label className="text-sm font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </div>
    <div className="relative">
      {Icon && (
        <Icon
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      )}
      <Input
        {...props}
        className={cn(
          "h-11 rounded-xl border-slate-200 focus:border-[#17C3B2] focus:ring-2 focus:ring-[#17C3B2]/20 transition-all",
          Icon && "pl-10",
          props.className
        )}
      />
    </div>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export const AddTaskDialog: React.FC<AddTaskDialogProps> = ({
  isOpen,
  onOpenChange,
  onTaskCreate,
  editTask,
  defaultStatus = "todo",
}) => {
  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: defaultStatus,
    priority: "medium" as KanbanTask["priority"],
    tags: "",
    assignee: "",
    dueDate: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens/closes or when editing different task
  useEffect(() => {
    if (isOpen) {
      if (editTask) {
        setFormData({
          title: editTask.title || "",
          description: editTask.description || "",
          status: editTask.status || defaultStatus,
          priority: editTask.priority || "medium",
          tags: editTask.tags?.join(", ") || "",
          assignee: editTask.assignee || "",
          dueDate: editTask.dueDate || "",
        });
      } else {
        setFormData({
          title: "",
          description: "",
          status: defaultStatus,
          priority: "medium",
          tags: "",
          assignee: "",
          dueDate: "",
        });
      }
      setErrors({});
    }
  }, [isOpen, editTask, defaultStatus]);

  // Handlers
  const handleChange = (
    field: string,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    const taskData: Partial<KanbanTask> = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      status: formData.status,
      priority: formData.priority,
      tags: formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      assignee: formData.assignee.trim() || undefined,
      dueDate: formData.dueDate || undefined,
    };

    if (editTask?.id) {
      taskData.id = editTask.id;
    }

    try {
      await onTaskCreate(taskData);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const isEditMode = Boolean(editTask);
  const selectedStatus = statusOptions.find((s) => s.value === formData.status);
  const selectedPriority = priorityOptions.find((p) => p.value === formData.priority);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] p-0 rounded-2xl overflow-hidden border-slate-200">
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <div className="relative p-6 border-b border-slate-100 bg-gradient-to-r from-[#17C3B2]/10 via-[#17C3B2]/5 to-transparent">
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#17C3B2]/5 rounded-full blur-2xl" />

          <DialogHeader className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#17C3B2]/20 flex items-center justify-center">
                <Sparkles size={18} className="text-[#17C3B2]" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-[#0D2342]">
                  {isEditMode ? "Edit Task" : "Create New Task"}
                </DialogTitle>
                <p className="text-sm text-slate-500">
                  {isEditMode
                    ? "Update the task details below"
                    : "Fill in the details to create a new task"}
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ============================================ */}
        {/* FORM */}
        {/* ============================================ */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-slate-600">
                Task Title <span className="text-red-500">*</span>
              </Label>
              {errors.title && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs text-red-500"
                >
                  {errors.title}
                </motion.span>
              )}
            </div>
            <div className="relative">
              <FileText
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Enter task title..."
                className={cn(
                  "h-11 pl-10 rounded-xl border-slate-200 focus:border-[#17C3B2] focus:ring-2 focus:ring-[#17C3B2]/20 transition-all",
                  errors.title && "border-red-300 focus:border-red-400 focus:ring-red-200"
                )}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">
              Description
            </Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Add a description..."
              className="min-h-[100px] rounded-xl border-slate-200 focus:border-[#17C3B2] focus:ring-2 focus:ring-[#17C3B2]/20 resize-none transition-all"
            />
          </div>

          {/* Status & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => handleChange("status", val)}
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:border-[#17C3B2] focus:ring-2 focus:ring-[#17C3B2]/20">
                  <SelectValue>
                    {selectedStatus && (
                      <div className="flex items-center gap-2">
                        <selectedStatus.icon
                          size={14}
                          className={selectedStatus.color}
                        />
                        <span>{selectedStatus.label}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {statusOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="rounded-lg focus:bg-[#17C3B2]/10"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center",
                            option.bg
                          )}
                        >
                          <option.icon size={12} className={option.color} />
                        </div>
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(val) =>
                  handleChange("priority", val)
                }
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:border-[#17C3B2] focus:ring-2 focus:ring-[#17C3B2]/20">
                  <SelectValue>
                    {selectedPriority && (
                      <div className="flex items-center gap-2">
                        <div
                          className={cn("w-2 h-2 rounded-full", selectedPriority.dot)}
                        />
                        <span>{selectedPriority.label}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {priorityOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="rounded-lg focus:bg-[#17C3B2]/10"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            option.bg,
                            option.color
                          )}
                        >
                          {option.label}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee & Due Date Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Assignee */}
            <StyledInput
              label="Assignee"
              icon={User}
              value={formData.assignee}
              onChange={(e) => handleChange("assignee", e.target.value)}
              placeholder="Enter name..."
            />

            {/* Due Date */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Due Date</Label>
              <div className="relative">
                <Calendar
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleChange("dueDate", e.target.value)}
                  className="h-11 pl-10 rounded-xl border-slate-200 focus:border-[#17C3B2] focus:ring-2 focus:ring-[#17C3B2]/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-slate-600">Tags</Label>
              <span className="text-xs text-slate-400">Comma separated</span>
            </div>
            <div className="relative">
              <Tag
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                value={formData.tags}
                onChange={(e) => handleChange("tags", e.target.value)}
                placeholder="design, frontend, bug..."
                className="h-11 pl-10 rounded-xl border-slate-200 focus:border-[#17C3B2] focus:ring-2 focus:ring-[#17C3B2]/20 transition-all"
              />
            </div>

            {/* Tags Preview */}
            <AnimatePresence>
              {formData.tags && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-wrap gap-1.5 pt-2"
                >
                  {formData.tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .slice(0, 5)
                    .map((tag, index) => (
                      <motion.span
                        key={tag}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="px-2.5 py-1 rounded-lg bg-[#17C3B2]/10 text-[#17C3B2] text-xs font-medium"
                      >
                        #{tag}
                      </motion.span>
                    ))}
                  {formData.tags.split(",").filter((t) => t.trim()).length > 5 && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-xs font-medium">
                      +{formData.tags.split(",").filter((t) => t.trim()).length - 5} more
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ============================================ */}
          {/* FOOTER */}
          {/* ============================================ */}
          <DialogFooter className="gap-3 pt-4 border-t border-slate-100 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="rounded-xl border-slate-200 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                disabled={isLoading || !formData.title.trim()}
                className="bg-[#17C3B2] hover:bg-[#17C3B2]/90 text-white rounded-xl shadow-lg shadow-[#17C3B2]/25 min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    {isEditMode ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    {isEditMode ? (
                      <>
                        <CheckCircle2 size={16} className="mr-2" />
                        Update Task
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} className="mr-2" />
                        Create Task
                      </>
                    )}
                  </>
                )}
              </Button>
            </motion.div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;