// src/components/time-tracking/types.ts

export interface Project {
  id: string;
  name: string;
  color: string;
  client?: string;
  budget?: number; // hours
  tracked?: number; // hours tracked
}

export interface Task {
  id: string;
  name: string;
  projectId: string;
}

export interface TimeEntry {
  id: string;
  projectId: string;
  taskId?: string;
  description: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  isBillable: boolean;
  hourlyRate?: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  startTime: Date | null;
  pausedTime: number; // accumulated paused time in seconds
  projectId: string | null;
  taskId: string | null;
  description: string;
  isBillable: boolean;
}

export interface WeeklyData {
  day: string;
  date: string;
  hours: number;
  billable: number;
  nonBillable: number;
}

export interface TimeStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  billableThisWeek: number;
  nonBillableThisWeek: number;
}

export type ViewMode = "list" | "calendar" | "weekly";
export type FilterPeriod = "today" | "yesterday" | "thisWeek" | "lastWeek" | "thisMonth" | "custom";