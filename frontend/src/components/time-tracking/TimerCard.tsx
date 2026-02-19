// src/components/time-tracking/TimerCard.tsx

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Square,
  Clock,
  DollarSign,
  ChevronDown,
  Briefcase,
  MoreVertical,
  History,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { TimerState, Project, Task } from "./types";
import { formatDuration, getProjectColor } from "./utils";

interface TimerCardProps {
  timerState: TimerState;
  projects: Project[];
  tasks: Task[];
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onUpdateTimer: (updates: Partial<TimerState>) => void;
  onViewHistory?: () => void;
  onOpenSettings?: () => void;
  variant?: "default" | "compact" | "minimal";
  className?: string;
}

export function TimerCard({
  timerState,
  projects,
  tasks,
  onStart,
  onPause,
  onResume,
  onStop,
  onUpdateTimer,
  onViewHistory,
  onOpenSettings,
  variant = "default",
  className,
}: TimerCardProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate elapsed time
  useEffect(() => {
    if (timerState.isRunning && !timerState.isPaused && timerState.startTime) {
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor(
          (now.getTime() - timerState.startTime!.getTime()) / 1000 - timerState.pausedTime
        );
        setElapsedTime(elapsed);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState.isRunning, timerState.isPaused, timerState.startTime, timerState.pausedTime]);

  // Reset elapsed time when timer stops
  useEffect(() => {
    if (!timerState.isRunning) {
      setElapsedTime(0);
    }
  }, [timerState.isRunning]);

  const selectedProject = projects.find((p) => p.id === timerState.projectId);
  const projectTasks = tasks.filter((t) => t.projectId === timerState.projectId);
  const selectedTask = tasks.find((t) => t.id === timerState.taskId);

  const handlePlayPause = () => {
    if (timerState.isRunning) {
      if (timerState.isPaused) {
        onResume();
      } else {
        onPause();
      }
    } else {
      onStart();
    }
  };

  // Minimal variant - just timer and controls
  if (variant === "minimal") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "inline-flex items-center gap-3 px-4 py-2 bg-white rounded-md border border-[rgba(15,23,42,0.06)] shadow-sm",
          timerState.isRunning && "border-[#22D3EE] shadow-[#22D3EE]/10",
          className
        )}
      >
        {/* Timer Display */}
        <motion.span
          animate={timerState.isRunning && !timerState.isPaused ? { opacity: [1, 0.7, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className={cn(
            "font-mono font-bold text-lg",
            timerState.isRunning ? "text-[#0891B2]" : "text-[#94A3B8]"
          )}
        >
          {formatDuration(elapsedTime)}
        </motion.span>

        {/* Play/Pause Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handlePlayPause}
          className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center transition-all",
            timerState.isRunning
              ? timerState.isPaused
                ? "bg-[#0891B2] text-white"
                : "bg-yellow-500 text-[#0F172A]"
              : "bg-[#0891B2] text-white"
          )}
        >
          {timerState.isRunning && !timerState.isPaused ? (
            <Pause size={14} />
          ) : (
            <Play size={14} className="ml-0.5" />
          )}
        </motion.button>

        {/* Stop Button */}
        {timerState.isRunning && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onStop}
            className="w-8 h-8 rounded-md bg-red-500 text-[#0F172A] flex items-center justify-center"
          >
            <Square size={12} />
          </motion.button>
        )}
      </motion.div>
    );
  }

  // Compact variant - timer with basic project info
  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "bg-white rounded-md border-2 p-4 transition-all",
          timerState.isRunning
            ? "border-[#22D3EE] "
            : "border-[rgba(15,23,42,0.06)]",
          className
        )}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Left: Project & Description */}
          <div className="flex-1 min-w-0">
            <Input
              type="text"
              placeholder="What are you working on?"
              value={timerState.description}
              onChange={(e) => onUpdateTimer({ description: e.target.value })}
              className="border-0 shadow-none focus-visible:ring-0 px-0 text-sm placeholder:text-[#94A3B8]"
            />
            <div className="flex items-center gap-2 mt-1">
              {selectedProject ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
                    getProjectColor(selectedProject.color).bg,
                    getProjectColor(selectedProject.color).text
                  )}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor:
                        selectedProject.color === "teal" ? "#22D3EE" : selectedProject.color,
                    }}
                  />
                  {selectedProject.name}
                </span>
              ) : (
                <button
                  onClick={() => setShowProjectDropdown(true)}
                  className="text-xs text-[#94A3B8] hover:text-[#0891B2]"
                >
                  + Add project
                </button>
              )}
            </div>
          </div>

          {/* Right: Timer & Controls */}
          <div className="flex items-center gap-3">
            {/* Billable Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onUpdateTimer({ isBillable: !timerState.isBillable })}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    timerState.isBillable
                      ? "text-[#0891B2] bg-[#0891B2]/10"
                      : "text-[#94A3B8] hover:bg-white/10"
                  )}
                >
                  <DollarSign size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {timerState.isBillable ? "Billable" : "Non-billable"}
              </TooltipContent>
            </Tooltip>

            {/* Timer Display */}
            <motion.div
              animate={timerState.isRunning && !timerState.isPaused ? { scale: [1, 1.02, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1 }}
              className={cn(
                "font-mono font-bold text-xl min-w-[80px] text-center",
                timerState.isRunning ? "text-[#0891B2]" : "text-[#94A3B8]"
              )}
            >
              {formatDuration(elapsedTime)}
            </motion.div>

            {/* Controls */}
            <div className="flex items-center gap-1">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePlayPause}
                className={cn(
                  "w-10 h-10 rounded-md flex items-center justify-center transition-all",
                  timerState.isRunning
                    ? timerState.isPaused
                      ? "bg-[#0891B2] text-white "
                      : "bg-yellow-500 text-[#0F172A] card-shadow shadow-yellow-500/30"
                    : "bg-[#0891B2] text-white "
                )}
              >
                {timerState.isRunning && !timerState.isPaused ? (
                  <Pause size={18} />
                ) : (
                  <Play size={18} className="ml-0.5" />
                )}
              </motion.button>

              {timerState.isRunning && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onStop}
                  className="w-10 h-10 rounded-md bg-red-500 text-[#0F172A] flex items-center justify-center card-shadow shadow-red-500/30"
                >
                  <Square size={16} />
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Default variant - full featured timer card
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white rounded-md border-2 overflow-hidden transition-all",
        timerState.isRunning
          ? "border-[#22D3EE] card-shadow shadow-[#22D3EE]/10"
          : "border-[rgba(15,23,42,0.06)] shadow-sm",
        className
      )}
    >
      {/* Running Indicator Bar */}
      <AnimatePresence>
        {timerState.isRunning && !timerState.isPaused && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0 }}
            className="h-1 /70 origin-left"
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-4 border-b border-[rgba(15,23,42,0.06)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "p-2 rounded-md",
              timerState.isRunning ? "bg-[#0891B2]/10" : "bg-white/5"
            )}
          >
            <Clock
              size={18}
              className={timerState.isRunning ? "text-[#0891B2]" : "text-[#475569]"}
            />
          </div>
          <div>
            <h3 className="font-semibold text-[#0F172A]">Time Tracker</h3>
            <p className="text-xs text-[#475569]">
              {timerState.isRunning
                ? timerState.isPaused
                  ? "Paused"
                  : "Recording..."
                : "Ready to start"}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 hover:bg-white/10 rounded-md transition-colors">
              <MoreVertical size={18} className="text-[#475569]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onViewHistory}>
              <History size={16} className="mr-2" />
              View History
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSettings}>
              <Settings size={16} className="mr-2" />
              Timer Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Description Input */}
        <Input
          type="text"
          placeholder="What are you working on?"
          value={timerState.description}
          onChange={(e) => onUpdateTimer({ description: e.target.value })}
          className="text-lg border-0 shadow-none focus-visible:ring-0 px-0 mb-4 placeholder:text-[#94A3B8]"
        />

        {/* Project & Task Selection */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {/* Project Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "gap-2",
                  selectedProject && getProjectColor(selectedProject.color).bg
                )}
              >
                <Briefcase size={14} />
                {selectedProject ? selectedProject.name : "Select Project"}
                <ChevronDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => onUpdateTimer({ projectId: project.id, taskId: null })}
                >
                  <div
                    className="w-2 h-2 rounded-full mr-2"
                    style={{
                      backgroundColor:
                        project.color === "teal" ? "#22D3EE" : project.color,
                    }}
                  />
                  {project.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Task Dropdown */}
          {timerState.projectId && projectTasks.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  {selectedTask ? selectedTask.name : "Select Task"}
                  <ChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {projectTasks.map((task) => (
                  <DropdownMenuItem
                    key={task.id}
                    onClick={() => onUpdateTimer({ taskId: task.id })}
                  >
                    {task.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Billable Toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-md">
            <DollarSign
              size={14}
              className={timerState.isBillable ? "text-[#0891B2]" : "text-[#94A3B8]"}
            />
            <span className="text-sm text-[#475569]">Billable</span>
            <Switch
              checked={timerState.isBillable}
              onCheckedChange={(checked) => onUpdateTimer({ isBillable: checked })}
              className="data-[state=checked]:bg-[#0891B2] scale-90"
            />
          </div>
        </div>

        {/* Timer Display & Controls */}
        <div className="flex items-center justify-between">
          {/* Timer Display */}
          <motion.div
            animate={timerState.isRunning && !timerState.isPaused ? { scale: [1, 1.01, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
            className="flex items-baseline gap-1"
          >
            <span
              className={cn(
                "text-5xl font-mono font-bold tracking-tight",
                timerState.isRunning ? "text-[#0891B2]" : "text-gray-300"
              )}
            >
              {formatDuration(elapsedTime)}
            </span>
          </motion.div>

          {/* Control Buttons */}
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePlayPause}
              className={cn(
                "w-14 h-14 rounded-md flex items-center justify-center transition-all",
                timerState.isRunning
                  ? timerState.isPaused
                    ? "bg-[#0891B2] text-white card-shadow shadow-[#22D3EE]/30"
                    : "bg-yellow-500 text-[#0F172A] card-shadow shadow-yellow-500/30"
                  : "bg-[#0891B2] text-white card-shadow shadow-[#22D3EE]/30"
              )}
            >
              {timerState.isRunning && !timerState.isPaused ? (
                <Pause size={24} />
              ) : (
                <Play size={24} className="ml-1" />
              )}
            </motion.button>

            {/* Stop Button */}
            <AnimatePresence>
              {timerState.isRunning && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -10 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onStop}
                  className="w-14 h-14 rounded-md bg-red-500 text-[#0F172A] flex items-center justify-center card-shadow shadow-red-500/30"
                >
                  <Square size={20} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Footer - Running Info */}
      <AnimatePresence>
        {timerState.isRunning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6 py-3 bg-[#0891B2]/5 border-t border-[#22D3EE]/10"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-2 h-2 bg-[#0891B2] rounded-full"
                />
                <span className="text-sm text-[#475569]">
                  {timerState.isPaused ? "Timer paused" : "Recording time"}
                  {selectedProject && ` for ${selectedProject.name}`}
                </span>
              </div>
              {timerState.isBillable && (
                <span className="text-sm text-[#0891B2] font-medium">
                  $75/hr
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}