// src/components/time-tracking/ActiveTimer.tsx

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Square, Plus, DollarSign, Tag, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { TimerState, Project, Task } from "./types";
import { formatDuration, getProjectColor } from "./utils";

interface ActiveTimerProps {
  timerState: TimerState;
  projects: Project[];
  tasks: Task[];
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onUpdateTimer: (updates: Partial<TimerState>) => void;
}

export function ActiveTimer({
  timerState,
  projects,
  tasks,
  onStart,
  onPause,
  onResume,
  onStop,
  onUpdateTimer,
}: ActiveTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
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

  const handleStartStop = () => {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white rounded-md border-2 p-6 transition-all",
        timerState.isRunning
          ? "border-[#22D3EE] "
          : "border-[rgba(15,23,42,0.06)]"
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Description Input */}
        <div className="flex-1">
          <Input
            type="text"
            placeholder="What are you working on?"
            value={timerState.description}
            onChange={(e) => onUpdateTimer({ description: e.target.value })}
            className="text-lg border-0 shadow-none focus-visible:ring-0 px-0 placeholder:text-[#94A3B8]"
          />
        </div>

        {/* Project Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "min-w-[180px] justify-between",
                selectedProject && getProjectColor(selectedProject.color).bg
              )}
            >
              {selectedProject ? (
                <div className="flex items-center gap-2">
                  <div
                    className={cn("w-2 h-2 rounded-full")}
                    style={{ backgroundColor: selectedProject.color === "teal" ? "#22D3EE" : selectedProject.color }}
                  />
                  <span className="truncate">{selectedProject.name}</span>
                </div>
              ) : (
                <span className="text-[#94A3B8]">Select Project</span>
              )}
              <ChevronDown size={16} className="ml-2 text-[#94A3B8]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {projects.map((project) => {
              const colors = getProjectColor(project.color);
              return (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => onUpdateTimer({ projectId: project.id, taskId: null })}
                  className="flex items-center gap-2"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: project.color === "teal" ? "#22D3EE" : project.color }}
                  />
                  <span>{project.name}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Task Selector */}
        {timerState.projectId && projectTasks.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[150px] justify-between">
                {selectedTask ? (
                  <span className="truncate">{selectedTask.name}</span>
                ) : (
                  <span className="text-[#94A3B8]">Select Task</span>
                )}
                <ChevronDown size={16} className="ml-2 text-[#94A3B8]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
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
        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-md">
          <DollarSign
            size={16}
            className={timerState.isBillable ? "text-[#0891B2]" : "text-[#94A3B8]"}
          />
          <Switch
            checked={timerState.isBillable}
            onCheckedChange={(checked) => onUpdateTimer({ isBillable: checked })}
            className="data-[state=checked]:bg-[#0891B2]"
          />
        </div>

        {/* Timer Display */}
        <div className="flex items-center gap-4">
          <motion.div
            animate={timerState.isRunning && !timerState.isPaused ? { scale: [1, 1.02, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
            className={cn(
              "text-3xl font-mono font-bold min-w-[140px] text-center",
              timerState.isRunning ? "text-[#0891B2]" : "text-[#94A3B8]"
            )}
          >
            {formatDuration(elapsedTime)}
          </motion.div>

          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStartStop}
              className={cn(
                "w-12 h-12 rounded-md flex items-center justify-center transition-all",
                timerState.isRunning
                  ? timerState.isPaused
                    ? "bg-[#0891B2] text-white "
                    : "bg-yellow-500 text-[#0F172A] card-shadow shadow-yellow-500/30"
                  : "bg-[#0891B2] text-white "
              )}
            >
              {timerState.isRunning ? (
                timerState.isPaused ? (
                  <Play size={20} className="ml-0.5" />
                ) : (
                  <Pause size={20} />
                )
              ) : (
                <Play size={20} className="ml-0.5" />
              )}
            </motion.button>

            {timerState.isRunning && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onStop}
                className="w-12 h-12 rounded-md bg-red-500 text-[#0F172A] flex items-center justify-center card-shadow shadow-red-500/30"
              >
                <Square size={18} />
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Running Indicator */}
      <AnimatePresence>
        {timerState.isRunning && !timerState.isPaused && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-[rgba(15,23,42,0.06)]"
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-2 h-2 bg-[#0891B2] rounded-full"
              />
              <span className="text-sm text-[#475569]">
                Timer is running
                {selectedProject && ` for ${selectedProject.name}`}
                {selectedTask && ` - ${selectedTask.name}`}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}