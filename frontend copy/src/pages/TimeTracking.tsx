// src/pages/TimeTracking.tsx

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/Sidebar";
import {
  Plus,
  Download,
  Settings,
  RefreshCw,
  BarChart3,
  List,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  StatsCards,
  ActiveTimer,
  WeeklyOverview,
  ProjectBreakdown,
  TimeEntriesTable,
  AddTimeEntryDialog,
  mockProjects,
  mockTasks,
  mockTimeEntries,
  mockWeeklyData,
  defaultTimerState,
  TimerState,
  TimeEntry,
  ViewMode,
} from "@/components/time-tracking";

export default function TimeTrackingPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [timerState, setTimerState] = useState<TimerState>(defaultTimerState);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(mockTimeEntries);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Calculate stats
  const todayEntries = timeEntries.filter((e) => {
    const today = new Date();
    return (
      e.startTime.getDate() === today.getDate() &&
      e.startTime.getMonth() === today.getMonth() &&
      e.startTime.getFullYear() === today.getFullYear()
    );
  });

  const todaySeconds = todayEntries.reduce((acc, e) => acc + e.duration, 0);
  const weekSeconds = mockWeeklyData.reduce((acc, d) => acc + d.hours * 3600, 0);
  const monthSeconds = weekSeconds * 4; // Simplified
  const billableSeconds = mockWeeklyData.reduce((acc, d) => acc + d.billable * 3600, 0);
  const earnings = timeEntries
    .filter((e) => e.isBillable && e.hourlyRate)
    .reduce((acc, e) => acc + (e.duration / 3600) * (e.hourlyRate || 0), 0);

  // Timer handlers
  const handleStartTimer = () => {
    setTimerState({
      ...timerState,
      isRunning: true,
      isPaused: false,
      startTime: new Date(),
      pausedTime: 0,
    });
  };

  const handlePauseTimer = () => {
    setTimerState({
      ...timerState,
      isPaused: true,
    });
  };

  const handleResumeTimer = () => {
    setTimerState({
      ...timerState,
      isPaused: false,
    });
  };

  const handleStopTimer = () => {
    if (timerState.startTime) {
      const endTime = new Date();
      const duration = Math.floor(
        (endTime.getTime() - timerState.startTime.getTime()) / 1000 - timerState.pausedTime
      );

      const newEntry: TimeEntry = {
        id: `entry-${Date.now()}`,
        projectId: timerState.projectId || mockProjects[0].id,
        taskId: timerState.taskId || undefined,
        description: timerState.description || "Time tracked",
        startTime: timerState.startTime,
        endTime,
        duration,
        isBillable: timerState.isBillable,
        hourlyRate: timerState.isBillable ? 75 : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setTimeEntries((prev) => [newEntry, ...prev]);
    }

    setTimerState(defaultTimerState);
  };

  const handleUpdateTimer = (updates: Partial<TimerState>) => {
    setTimerState((prev) => ({ ...prev, ...updates }));
  };

  // Entry handlers
  const handleSaveEntry = (entry: Partial<TimeEntry>) => {
    if (editingEntry) {
      setTimeEntries((prev) =>
        prev.map((e) => (e.id === editingEntry.id ? { ...e, ...entry } as TimeEntry : e))
      );
    } else {
      setTimeEntries((prev) => [entry as TimeEntry, ...prev]);
    }
    setEditingEntry(null);
  };

  const handleEditEntry = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setShowAddDialog(true);
  };

  const handleDeleteEntry = (entryId: string) => {
    setTimeEntries((prev) => prev.filter((e) => e.id !== entryId));
  };

  const handleDuplicateEntry = (entry: TimeEntry) => {
    const duplicated: TimeEntry = {
      ...entry,
      id: `entry-${Date.now()}`,
      startTime: new Date(),
      endTime: new Date(Date.now() + entry.duration * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTimeEntries((prev) => [duplicated, ...prev]);
  };

  const handleContinueEntry = (entry: TimeEntry) => {
    setTimerState({
      isRunning: true,
      isPaused: false,
      startTime: new Date(),
      pausedTime: 0,
      projectId: entry.projectId,
      taskId: entry.taskId || null,
      description: entry.description,
      isBillable: entry.isBillable,
    });
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-[rgba(15,23,42,0.06)] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#0F172A]">Time Tracking</h1>
              <p className="text-sm text-[#475569] mt-1">Track and manage your work hours</p>
            </div>

            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <TabsList className="bg-[#F8FAFC]">
                  <TabsTrigger value="list" className="gap-2">
                    <List size={16} />
                    List
                  </TabsTrigger>
                  <TabsTrigger value="weekly" className="gap-2">
                    <BarChart3 size={16} />
                    Weekly
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="gap-2">
                    <CalendarIcon size={16} />
                    Calendar
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Export Button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download size={16} />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Export as CSV</DropdownMenuItem>
                  <DropdownMenuItem>Export as PDF</DropdownMenuItem>
                  <DropdownMenuItem>Export as Excel</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Generate Report</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Add Manual Entry */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setEditingEntry(null);
                  setShowAddDialog(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#0891B2] text-white rounded-md font-medium hover:bg-[#0891B2]/90 transition-all "
              >
                <Plus size={18} />
                Add Entry
              </motion.button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Stats Cards */}
            <StatsCards
              todaySeconds={todaySeconds}
              weekSeconds={weekSeconds}
              monthSeconds={monthSeconds}
              billableSeconds={billableSeconds}
              earnings={earnings}
            />

            {/* Active Timer */}
            <ActiveTimer
              timerState={timerState}
              projects={mockProjects}
              tasks={mockTasks}
              onStart={handleStartTimer}
              onPause={handlePauseTimer}
              onResume={handleResumeTimer}
              onStop={handleStopTimer}
              onUpdateTimer={handleUpdateTimer}
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Weekly Overview & Project Breakdown */}
              <div className="lg:col-span-1 space-y-6">
                <WeeklyOverview data={mockWeeklyData} />
                <ProjectBreakdown projects={mockProjects} />
              </div>

              {/* Right: Time Entries Table */}
              <div className="lg:col-span-2">
                <TimeEntriesTable
                  entries={timeEntries}
                  projects={mockProjects}
                  tasks={mockTasks}
                  onEdit={handleEditEntry}
                  onDelete={handleDeleteEntry}
                  onDuplicate={handleDuplicateEntry}
                  onContinue={handleContinueEntry}
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add/Edit Dialog */}
      <AddTimeEntryDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        projects={mockProjects}
        tasks={mockTasks}
        editingEntry={editingEntry}
        onSave={handleSaveEntry}
      />
    </div>
  );
}