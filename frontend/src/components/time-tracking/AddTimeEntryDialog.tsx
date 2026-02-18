// src/components/time-tracking/AddTimeEntryDialog.tsx

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Calendar, DollarSign, Tag, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Project, Task, TimeEntry } from "./types";
import { getProjectColor, formatDuration } from "./utils";

interface AddTimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  tasks: Task[];
  editingEntry?: TimeEntry | null;
  onSave: (entry: Partial<TimeEntry>) => void;
}

export function AddTimeEntryDialog({
  open,
  onOpenChange,
  projects,
  tasks,
  editingEntry,
  onSave,
}: AddTimeEntryDialogProps) {
  const [formData, setFormData] = useState({
    projectId: "",
    taskId: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "17:00",
    isBillable: true,
    hourlyRate: "75",
  });

  // Reset form when dialog opens with editing entry
  useEffect(() => {
    if (editingEntry) {
      setFormData({
        projectId: editingEntry.projectId,
        taskId: editingEntry.taskId || "",
        description: editingEntry.description,
        date: editingEntry.startTime.toISOString().split("T")[0],
        startTime: editingEntry.startTime.toTimeString().slice(0, 5),
        endTime: editingEntry.endTime
          ? editingEntry.endTime.toTimeString().slice(0, 5)
          : "17:00",
        isBillable: editingEntry.isBillable,
        hourlyRate: editingEntry.hourlyRate?.toString() || "75",
      });
    } else {
      setFormData({
        projectId: "",
        taskId: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        startTime: "09:00",
        endTime: "17:00",
        isBillable: true,
        hourlyRate: "75",
      });
    }
  }, [editingEntry, open]);

  const projectTasks = tasks.filter((t) => t.projectId === formData.projectId);

  // Calculate duration
  const calculateDuration = () => {
    const start = new Date(`${formData.date}T${formData.startTime}`);
    const end = new Date(`${formData.date}T${formData.endTime}`);
    const durationMs = end.getTime() - start.getTime();
    return Math.max(0, Math.floor(durationMs / 1000));
  };

  const duration = calculateDuration();
  const earnings = formData.isBillable ? (duration / 3600) * parseFloat(formData.hourlyRate || "0") : 0;

  const handleSubmit = () => {
    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

    onSave({
      id: editingEntry?.id || `entry-${Date.now()}`,
      projectId: formData.projectId,
      taskId: formData.taskId || undefined,
      description: formData.description,
      startTime: startDateTime,
      endTime: endDateTime,
      duration,
      isBillable: formData.isBillable,
      hourlyRate: formData.isBillable ? parseFloat(formData.hourlyRate) : undefined,
      createdAt: editingEntry?.createdAt || new Date(),
      updatedAt: new Date(),
    });

    onOpenChange(false);
  };

  const isValid = formData.projectId && formData.startTime && formData.endTime && duration > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingEntry ? "Edit Time Entry" : "Add Time Entry"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What did you work on?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Project */}
          <div className="space-y-2">
            <Label>Project *</Label>
            <Select
              value={formData.projectId}
              onValueChange={(value) => setFormData({ ...formData, projectId: value, taskId: "" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => {
                  const colors = getProjectColor(project.color);
                  return (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor:
                              project.color === "teal" ? "#17C3B2" : project.color,
                          }}
                        />
                        {project.name}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Task */}
          {formData.projectId && projectTasks.length > 0 && (
            <div className="space-y-2">
              <Label>Task (Optional)</Label>
              <Select
                value={formData.taskId}
                onValueChange={(value) => setFormData({ ...formData, taskId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent>
                  {projectTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <div className="relative">
                <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <div className="relative">
                <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Duration Preview */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Duration</span>
              <span className="font-semibold text-gray-800">
                {duration > 0 ? formatDuration(duration) : "Invalid time range"}
              </span>
            </div>
          </div>

          {/* Billable Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign size={18} className={formData.isBillable ? "text-[#17C3B2]" : "text-gray-400"} />
              <div>
                <p className="text-sm font-medium text-gray-700">Billable</p>
                <p className="text-xs text-gray-500">Track this time as billable</p>
              </div>
            </div>
            <Switch
              checked={formData.isBillable}
              onCheckedChange={(checked) => setFormData({ ...formData, isBillable: checked })}
              className="data-[state=checked]:bg-[#17C3B2]"
            />
          </div>

          {/* Hourly Rate */}
          {formData.isBillable && (
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  id="hourlyRate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  className="pl-10"
                />
              </div>
              {earnings > 0 && (
                <p className="text-sm text-[#17C3B2]">
                  Earnings: ${earnings.toFixed(2)}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid}
            className="bg-[#17C3B2] hover:bg-[#17C3B2]/90"
          >
            {editingEntry ? "Update Entry" : "Add Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}