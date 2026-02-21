// src/components/time-tracking/data.ts

import { Project, Task, TimeEntry, WeeklyData } from "./types";

export const mockProjects: Project[] = [
  {
    id: "proj1",
    name: "Website Redesign",
    color: "teal",
    client: "Tech Solutions Inc.",
    budget: 120,
    tracked: 87.5,
  },
  {
    id: "proj2",
    name: "Mobile App Development",
    color: "purple",
    client: "StartupXYZ",
    budget: 200,
    tracked: 145,
  },
  {
    id: "proj3",
    name: "CRM Integration",
    color: "blue",
    client: "Enterprise Corp",
    budget: 80,
    tracked: 32,
  },
  {
    id: "proj4",
    name: "Marketing Campaign",
    color: "gold",
    client: "Marketing Pro",
    budget: 40,
    tracked: 28,
  },
  {
    id: "proj5",
    name: "Internal Tools",
    color: "green",
    client: "Internal",
    budget: 60,
    tracked: 15,
  },
  {
    id: "proj6",
    name: "API Development",
    color: "orange",
    client: "Tech Solutions Inc.",
    budget: 100,
    tracked: 67,
  },
];

export const mockTasks: Task[] = [
  { id: "task1", name: "Design Homepage", projectId: "proj1" },
  { id: "task2", name: "Implement Navigation", projectId: "proj1" },
  { id: "task3", name: "Create Components", projectId: "proj1" },
  { id: "task4", name: "User Authentication", projectId: "proj2" },
  { id: "task5", name: "Push Notifications", projectId: "proj2" },
  { id: "task6", name: "Database Setup", projectId: "proj3" },
  { id: "task7", name: "API Integration", projectId: "proj3" },
  { id: "task8", name: "Content Creation", projectId: "proj4" },
  { id: "task9", name: "Social Media Setup", projectId: "proj4" },
  { id: "task10", name: "Dashboard Development", projectId: "proj5" },
];

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

export const mockTimeEntries: TimeEntry[] = [
  {
    id: "entry1",
    projectId: "proj1",
    taskId: "task1",
    description: "Working on homepage hero section design",
    startTime: new Date(today.setHours(9, 0, 0)),
    endTime: new Date(today.setHours(11, 30, 0)),
    duration: 9000, // 2.5 hours
    isBillable: true,
    hourlyRate: 75,
    tags: ["design", "ui"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "entry2",
    projectId: "proj2",
    taskId: "task4",
    description: "Implementing user login and registration",
    startTime: new Date(today.setHours(12, 0, 0)),
    endTime: new Date(today.setHours(14, 15, 0)),
    duration: 8100, // 2.25 hours
    isBillable: true,
    hourlyRate: 85,
    tags: ["development", "auth"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "entry3",
    projectId: "proj3",
    taskId: "task6",
    description: "Setting up PostgreSQL database",
    startTime: new Date(today.setHours(14, 30, 0)),
    endTime: new Date(today.setHours(16, 0, 0)),
    duration: 5400, // 1.5 hours
    isBillable: true,
    hourlyRate: 80,
    tags: ["database", "setup"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "entry4",
    projectId: "proj1",
    taskId: "task2",
    description: "Building responsive navigation component",
    startTime: new Date(yesterday.setHours(10, 0, 0)),
    endTime: new Date(yesterday.setHours(13, 0, 0)),
    duration: 10800, // 3 hours
    isBillable: true,
    hourlyRate: 75,
    tags: ["development", "ui"],
    createdAt: yesterday,
    updatedAt: yesterday,
  },
  {
    id: "entry5",
    projectId: "proj4",
    taskId: "task8",
    description: "Writing blog posts for campaign",
    startTime: new Date(yesterday.setHours(14, 0, 0)),
    endTime: new Date(yesterday.setHours(16, 30, 0)),
    duration: 9000, // 2.5 hours
    isBillable: false,
    tags: ["content", "marketing"],
    createdAt: yesterday,
    updatedAt: yesterday,
  },
  {
    id: "entry6",
    projectId: "proj5",
    taskId: "task10",
    description: "Internal meeting and planning",
    startTime: new Date(yesterday.setHours(9, 0, 0)),
    endTime: new Date(yesterday.setHours(10, 0, 0)),
    duration: 3600, // 1 hour
    isBillable: false,
    tags: ["meeting"],
    createdAt: yesterday,
    updatedAt: yesterday,
  },
];

export const mockWeeklyData: WeeklyData[] = [
  { day: "Sun", date: "Jan 12", hours: 0, billable: 0, nonBillable: 0 },
  { day: "Mon", date: "Jan 13", hours: 7.5, billable: 6.5, nonBillable: 1 },
  { day: "Tue", date: "Jan 14", hours: 8.25, billable: 7.25, nonBillable: 1 },
  { day: "Wed", date: "Jan 15", hours: 6.5, billable: 5.5, nonBillable: 1 },
  { day: "Thu", date: "Jan 16", hours: 8, billable: 7, nonBillable: 1 },
  { day: "Fri", date: "Jan 17", hours: 6.25, billable: 5.25, nonBillable: 1 },
  { day: "Sat", date: "Jan 18", hours: 2, billable: 2, nonBillable: 0 },
];

export const defaultTimerState = {
  isRunning: false,
  isPaused: false,
  startTime: null,
  pausedTime: 0,
  projectId: null,
  taskId: null,
  description: "",
  isBillable: true,
};