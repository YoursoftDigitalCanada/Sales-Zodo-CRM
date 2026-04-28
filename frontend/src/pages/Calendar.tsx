// src/pages/Calendar.tsx

import React, { useState, useEffect, useMemo } from "react";
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import AddressAutocompleteInput from "@/components/address/AddressAutocompleteInput";
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/features/calendar";
import { getEmployees } from "@/features/users";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Search,
  MoreHorizontal,
  MoreVertical,
  Clock,
  MapPin,
  Users,
  Video,
  Phone,
  Link as LinkIcon,
  Bell,
  BellOff,
  Repeat,
  Tag,
  Eye,
  Pencil,
  Trash2,
  Copy,
  Check,
  X,
  RefreshCw,
  Settings,
  Download,
  Upload,
  ExternalLink,
  Briefcase,
  User,
  Building2,
  Target,
  CheckCircle2,
  Circle,
  AlertCircle,
  Sparkles,
  Zap,
  Coffee,
  Utensils,
  Plane,
  Car,
  Home,
  GraduationCap,
  Heart,
  PartyPopper,
  Calendar,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  LayoutGrid,
  List,
  Columns,
  PanelRight,
  type LucideIcon,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  type: "meeting" | "task" | "reminder" | "event" | "holiday" | "personal";
  category: string;
  color: string;
  location?: string;
  meetingLink?: string;
  attendees?: Attendee[];
  reminders?: Reminder[];
  recurrence?: RecurrenceRule;
  status: "scheduled" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
  createdBy: string;
  isPrivate: boolean;
  attachments?: string[];
  notes?: string;
  leadId?: string;
  clientId?: string;
}

interface Attendee {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: "pending" | "accepted" | "declined" | "tentative";
}

interface Reminder {
  id: string;
  type: "notification" | "email";
  time: number; // minutes before event
}

interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  endDate?: Date;
  daysOfWeek?: number[];
}

interface EventCategory {
  id: string;
  name: string;
  color: string;
  icon: LucideIcon;
}

// ============================================
// CONSTANTS & DATA
// ============================================

const eventCategories: EventCategory[] = [
  { id: "work", name: "Work", color: "#3B82F6", icon: Briefcase },
  { id: "meeting", name: "Meeting", color: "#8B5CF6", icon: Users },
  { id: "personal", name: "Personal", color: "#10B981", icon: User },
  { id: "client", name: "Client", color: "#F59E0B", icon: Building2 },
  { id: "deadline", name: "Deadline", color: "#EF4444", icon: Target },
  { id: "holiday", name: "Holiday", color: "#EC4899", icon: PartyPopper },
  { id: "travel", name: "Travel", color: "#06B6D4", icon: Plane },
  { id: "training", name: "Training", color: "#84CC16", icon: GraduationCap },
];

const eventColors = [
  { id: "blue", color: "#3B82F6", name: "Blue" },
  { id: "purple", color: "#8B5CF6", name: "Purple" },
  { id: "green", color: "#10B981", name: "Green" },
  { id: "yellow", color: "#F59E0B", name: "Yellow" },
  { id: "red", color: "#EF4444", name: "Red" },
  { id: "pink", color: "#EC4899", name: "Pink" },
  { id: "teal", color: "#6637F4", name: "Teal" },
  { id: "orange", color: "#F97316", name: "Orange" },
];

const toBackendEventType = (event: Partial<CalendarEvent>) => {
  if (event.type === "meeting") return "MEETING";
  if (event.type === "task") return "TASK";
  if (event.type === "reminder") return "REMINDER";
  if (event.type === "holiday") return "OUT_OF_OFFICE";
  if (event.type === "personal" && event.category === "travel") return "OUT_OF_OFFICE";
  if (event.category === "holiday" || event.category === "travel") return "OUT_OF_OFFICE";
  return "OTHER";
};

const fromBackendEventType = (eventType?: string | null, category?: string | null): CalendarEvent["type"] => {
  const normalizedType = String(eventType || "").toUpperCase();
  const normalizedCategory = String(category || "").toLowerCase();
  if (normalizedType === "MEETING" || normalizedType === "CALL") return "meeting";
  if (normalizedType === "TASK") return "task";
  if (normalizedType === "REMINDER") return "reminder";
  if (normalizedType === "OUT_OF_OFFICE") {
    return normalizedCategory === "holiday" ? "holiday" : "personal";
  }
  if (normalizedCategory === "holiday") return "holiday";
  if (normalizedCategory === "personal" || normalizedCategory === "travel") return "personal";
  return "event";
};



// ============================================
// UTILITY FUNCTIONS
// ============================================

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const formatShortDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};

const isPastDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

const getEventDuration = (start: Date, end: Date): string => {
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const getCategoryInfo = (categoryId: string): EventCategory => {
  return eventCategories.find((c) => c.id === categoryId) || eventCategories[0];
};

const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

// ============================================
// MINI CALENDAR COMPONENT
// ============================================

const MiniCalendar = ({
  selectedDate,
  onDateSelect,
  events,
}: {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  events: CalendarEvent[];
}) => {
  const [viewDate, setViewDate] = useState(selectedDate);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days = [];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Previous month days
  const prevMonthDays = getDaysInMonth(year, month - 1);
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthDays - i),
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i),
    });
  }

  // Next month days
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i),
    });
  }

  const hasEvents = (date: Date) => {
    return events.some((event) => isSameDay(event.start, date));
  };

  return (
    <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-4" style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.04)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#0F172A]">
          {viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full hover:bg-gray-100 transition-colors duration-150"
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full hover:bg-gray-100 transition-colors duration-150"
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-[#475569] py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(({ day, isCurrentMonth, date }, index) => {
          const isSelected = isSameDay(date, selectedDate);
          const isTodayDate = isToday(date);
          const hasEvent = hasEvents(date);

          return (
            <button
              key={index}
              onClick={() => onDateSelect(date)}
              className={cn(
                "relative h-8 w-8 rounded-full text-sm font-medium transition-all duration-150",
                !isCurrentMonth && "text-[#CBD5E1]",
                isCurrentMonth && !isSelected && !isTodayDate && "text-[#475569] hover:bg-gray-100",
                isTodayDate && !isSelected && "bg-[#6637F4] text-white font-bold",
                isSelected && !isTodayDate && "bg-[#6637F4]/15 text-[#6637F4] font-bold",
                isSelected && isTodayDate && "bg-[#6637F4] text-white font-bold ring-2 ring-[#6637F4]/30 ring-offset-1"
              )}
            >
              {day}
              {hasEvent && !isSelected && !isTodayDate && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#6637F4]" />
              )}
              {hasEvent && isTodayDate && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-[rgba(15,23,42,0.06)]">
        <Button
          variant="ghost"
          className="w-full justify-start text-sm text-[#475569] hover:text-[#6637F4] rounded-md transition-colors duration-150"
          onClick={() => onDateSelect(new Date())}
        >
          <CalendarIcon size={14} className="mr-2" />
          Go to Today
        </Button>
      </div>
    </div>
  );
};

// ============================================
// UPCOMING EVENTS COMPONENT
// ============================================

const UpcomingEvents = ({
  events,
  onEventClick,
}: {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}) => {
  const upcomingEvents = events
    .filter((e) => e.start >= new Date() && e.status !== "cancelled")
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 5);

  return (
    <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-4" style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.04)' }}>
      <h3 className="font-semibold text-[#0F172A] mb-4">Upcoming Events</h3>

      {upcomingEvents.length === 0 ? (
        <div className="text-center py-8 px-4 bg-gradient-to-b from-[#F0EEFF] to-white rounded-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#6637F4]/10 flex items-center justify-center">
            <CalendarIcon size={32} className="text-[#6637F4]" />
          </div>
          <p className="text-sm font-semibold text-[#0F172A] mb-1">No upcoming events</p>
          <p className="text-xs text-[#94A3B8] mb-4">Your schedule is clear!</p>
          <button
            onClick={() => onEventClick({} as CalendarEvent)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6637F4] hover:bg-[#6637F4]/90 text-white text-sm font-medium rounded-lg transition-colors duration-150"
          >
            <Plus size={14} />
            Schedule Event
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {upcomingEvents.map((event) => {
            const categoryInfo = getCategoryInfo(event.category);
            const CategoryIcon = categoryInfo.icon;

            return (
              <motion.div
                key={event.id}
                whileHover={{ x: 4 }}
                onClick={() => onEventClick(event)}
                className="flex items-start gap-3 p-3 rounded-md hover:bg-[#F7F7FB] cursor-pointer transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${event.color}15` }}
                >
                  <CategoryIcon size={18} style={{ color: event.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#0F172A] truncate">{event.title}</p>
                  <div className="flex items-center gap-2 text-xs text-[#94A3B8] mt-1">
                    <Clock size={12} />
                    <span>
                      {isToday(event.start) ? "Today" : formatShortDate(event.start)}
                      {!event.allDay && `, ${formatTime(event.start)}`}
                    </span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-xs text-[#475569] mt-1">
                      <MapPin size={12} />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                </div>
                {event.priority === "high" && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded">
                    High
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================
// CATEGORY FILTER COMPONENT
// ============================================

const CategoryFilter = ({
  selectedCategories,
  onToggleCategory,
}: {
  selectedCategories: Set<string>;
  onToggleCategory: (categoryId: string) => void;
}) => {
  return (
    <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-4" style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.04)' }}>
      <h3 className="font-semibold text-[#0F172A] mb-4">Categories</h3>
      <div className="space-y-2">
        {eventCategories.map((category) => {
          const CategoryIcon = category.icon;
          const isSelected = selectedCategories.has(category.id);

          return (
            <button
              key={category.id}
              onClick={() => onToggleCategory(category.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150",
                isSelected
                  ? "bg-white/5"
                  : "hover:bg-[#F7F7FB] opacity-60 hover:opacity-100"
              )}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <CategoryIcon size={16} style={{ color: category.color }} />
              <span className="text-sm font-medium text-[#0F172A] flex-1 text-left">
                {category.name}
              </span>
              {isSelected && <Check size={14} className="text-[#6637F4]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================
// EVENT CARD COMPONENT
// ============================================

const EventCard = ({
  event,
  onClick,
  compact = false,
}: {
  event: CalendarEvent;
  onClick: () => void;
  compact?: boolean;
}) => {
  const categoryInfo = getCategoryInfo(event.category);
  const CategoryIcon = categoryInfo.icon;

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="px-2 py-1 rounded text-xs font-medium truncate cursor-pointer hover:opacity-80 transition-opacity"
        style={{ backgroundColor: `${event.color}20`, color: event.color }}
      >
        {!event.allDay && (
          <span className="mr-1">{formatTime(event.start)}</span>
        )}
        {event.title}
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="p-3 rounded-md cursor-pointer transition-all hover:shadow-md"
      style={{ backgroundColor: `${event.color}10`, borderLeft: `3px solid ${event.color}` }}
    >
      <div className="flex items-start gap-2">
        <CategoryIcon size={14} style={{ color: event.color }} className="mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[#0F172A] text-sm truncate">{event.title}</p>
          {!event.allDay && (
            <p className="text-xs text-[#94A3B8] mt-0.5">
              {formatTime(event.start)} - {formatTime(event.end)}
            </p>
          )}
          {event.location && (
            <div className="flex items-center gap-1 text-xs text-[#475569] mt-1">
              <MapPin size={10} />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>
      </div>
      {event.attendees && event.attendees.length > 0 && (
        <div className="flex items-center gap-1 mt-2">
          <div className="flex -space-x-2">
            {event.attendees.slice(0, 3).map((attendee) => (
              <Avatar key={attendee.id} className="h-5 w-5 border border-white">
                <AvatarImage src={attendee.avatar} />
                <AvatarFallback className="text-[8px] bg-slate-200">
                  {getInitials(attendee.name)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          {event.attendees.length > 3 && (
            <span className="text-xs text-[#475569]">+{event.attendees.length - 3}</span>
          )}
        </div>
      )}
    </motion.div>
  );
};

// ============================================
// MONTH VIEW COMPONENT
// ============================================

const MonthView = ({
  currentDate,
  events,
  onDateClick,
  onEventClick,
  onAddEvent,
  selectedCategories,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onAddEvent?: (date: Date) => void;
  selectedCategories: Set<string>;
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const days = [];

  // Previous month days
  const prevMonthDays = getDaysInMonth(year, month - 1);
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthDays - i),
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i),
    });
  }

  // Next month days to fill grid
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i),
    });
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(
      (event) =>
        isSameDay(event.start, date) &&
        selectedCategories.has(event.category) &&
        event.status !== "cancelled"
    );
  };

  return (
    <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden">
      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-[rgba(15,23,42,0.06)]">
        {dayNames.map((day, idx) => (
          <div
            key={day}
            className={cn(
              "px-4 py-3 text-sm font-semibold text-[#475569] text-center bg-[#F7F7FB]",
              (idx === 0 || idx === 6) && "bg-gray-100/80"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {days.map(({ day, isCurrentMonth, date }, index) => {
          const dayEvents = getEventsForDate(date);
          const isTodayDate = isToday(date);
          const isPast = isPastDate(date) && !isTodayDate;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          return (
            <div
              key={index}
              onClick={() => onDateClick(date)}
              className={cn(
                "group min-h-[120px] p-2 border-b border-r border-[rgba(15,23,42,0.06)] cursor-pointer transition-all duration-150",
                !isCurrentMonth && "bg-[#F7F7FB]/50",
                isCurrentMonth && "hover:bg-gray-50",
                isWeekend && isCurrentMonth && "bg-gray-50/50",
                isTodayDate && "border-l-2 border-l-[#6637F4]/40 bg-[#6637F4]/[0.03]",
                isPast && "opacity-60"
              )}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium transition-colors duration-150",
                    !isCurrentMonth && "text-[#CBD5E1]",
                    isCurrentMonth && "text-[#0F172A]",
                    isTodayDate && "bg-[#6637F4] text-white"
                  )}
                >
                  {day}
                </span>
                <div className="flex items-center gap-1">
                  {dayEvents.length > 2 && (
                    <span className="text-xs text-[#475569]">
                      +{dayEvents.length - 2} more
                    </span>
                  )}
                  {isCurrentMonth && onAddEvent && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onAddEvent(date); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 w-6 h-6 rounded-md bg-[#6637F4]/10 hover:bg-[#6637F4]/20 flex items-center justify-center text-[#6637F4]"
                      aria-label={`Add event on ${date.toDateString()}`}
                    >
                      <Plus size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Events */}
              <div className="space-y-1">
                {dayEvents.slice(0, 2).map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={() => onEventClick(event)}
                    compact
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================
// WEEK VIEW COMPONENT
// ============================================

const WeekView = ({
  currentDate,
  events,
  onEventClick,
  selectedCategories,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  selectedCategories: Set<string>;
}) => {
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForDateAndHour = (date: Date, hour: number) => {
    return events.filter((event) => {
      if (!isSameDay(event.start, date)) return false;
      if (!selectedCategories.has(event.category)) return false;
      if (event.status === "cancelled") return false;
      if (event.allDay) return false;
      return event.start.getHours() === hour;
    });
  };

  const getAllDayEvents = (date: Date) => {
    return events.filter(
      (event) =>
        isSameDay(event.start, date) &&
        event.allDay &&
        selectedCategories.has(event.category) &&
        event.status !== "cancelled"
    );
  };

  return (
    <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-8 border-b border-[rgba(15,23,42,0.06)]">
        <div className="p-3 bg-[#F7F7FB]" />
        {weekDays.map((date, index) => (
          <div
            key={index}
            className={cn(
              "p-3 text-center border-l border-[rgba(15,23,42,0.06)]",
              isToday(date) && "bg-[#6637F4]/5"
            )}
          >
            <p className="text-xs text-[#94A3B8]">
              {date.toLocaleDateString("en-US", { weekday: "short" })}
            </p>
            <p
              className={cn(
                "text-lg font-semibold",
                isToday(date) ? "text-[#6637F4]" : "text-[#0F172A]"
              )}
            >
              {date.getDate()}
            </p>
          </div>
        ))}
      </div>

      {/* All Day Events Row */}
      <div className="grid grid-cols-8 border-b border-[rgba(15,23,42,0.06)]">
        <div className="p-2 bg-[#F7F7FB] text-xs text-[#94A3B8] text-center">
          All Day
        </div>
        {weekDays.map((date, index) => {
          const allDayEvents = getAllDayEvents(date);
          return (
            <div
              key={index}
              className="p-1 border-l border-[rgba(15,23,42,0.06)] min-h-[40px]"
            >
              {allDayEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="px-2 py-1 rounded text-xs font-medium truncate cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: `${event.color}20`, color: event.color }}
                >
                  {event.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Time Grid */}
      <div className="max-h-[600px] overflow-y-auto">
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-8 border-b border-[rgba(15,23,42,0.06)]">
            <div className="p-2 bg-[#F7F7FB] text-xs text-[#94A3B8] text-right pr-3">
              {hour === 0
                ? "12 AM"
                : hour < 12
                  ? `${hour} AM`
                  : hour === 12
                    ? "12 PM"
                    : `${hour - 12} PM`}
            </div>
            {weekDays.map((date, index) => {
              const hourEvents = getEventsForDateAndHour(date, hour);
              return (
                <div
                  key={index}
                  className={cn(
                    "p-1 border-l border-[rgba(15,23,42,0.06)] min-h-[50px]",
                    isToday(date) && "bg-[#6637F4]/5"
                  )}
                >
                  {hourEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick(event)}
                      compact
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// DAY VIEW COMPONENT
// ============================================

const DayView = ({
  currentDate,
  events,
  onEventClick,
  selectedCategories,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  selectedCategories: Set<string>;
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const dayEvents = events.filter(
    (event) =>
      isSameDay(event.start, currentDate) &&
      selectedCategories.has(event.category) &&
      event.status !== "cancelled"
  );

  const allDayEvents = dayEvents.filter((e) => e.allDay);
  const timedEvents = dayEvents.filter((e) => !e.allDay);

  const getEventsForHour = (hour: number) => {
    return timedEvents.filter((event) => event.start.getHours() === hour);
  };

  return (
    <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[rgba(15,23,42,0.06)] bg-[#F7F7FB]">
        <div className="flex items-center justify-center gap-3">
          <span
            className={cn(
              "w-12 h-12 flex items-center justify-center rounded-md text-xl sm:text-2xl font-bold",
              isToday(currentDate)
                ? "bg-[#6637F4] text-white"
                : "bg-slate-200 text-[#0F172A]"
            )}
          >
            {currentDate.getDate()}
          </span>
          <div>
            <p className="font-semibold text-[#0F172A]">
              {currentDate.toLocaleDateString("en-US", { weekday: "long" })}
            </p>
            <p className="text-sm text-[#94A3B8]">
              {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* All Day Events */}
      {allDayEvents.length > 0 && (
        <div className="p-3 border-b border-[rgba(15,23,42,0.06)] bg-[#F7F7FB]/50">
          <p className="text-xs text-[#94A3B8] mb-2">All Day</p>
          <div className="space-y-2">
            {allDayEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => onEventClick(event)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Time Slots */}
      <div className="max-h-[600px] overflow-y-auto">
        {hours.map((hour) => {
          const hourEvents = getEventsForHour(hour);

          return (
            <div
              key={hour}
              className="flex border-b border-[rgba(15,23,42,0.06)] min-h-[60px]"
            >
              <div className="w-20 p-3 bg-[#F7F7FB] text-sm text-[#94A3B8] text-right flex-shrink-0">
                {hour === 0
                  ? "12 AM"
                  : hour < 12
                    ? `${hour} AM`
                    : hour === 12
                      ? "12 PM"
                      : `${hour - 12} PM`}
              </div>
              <div className="flex-1 p-2 space-y-1">
                {hourEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={() => onEventClick(event)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================
// AGENDA VIEW COMPONENT
// ============================================

const AgendaView = ({
  events,
  onEventClick,
  selectedCategories,
}: {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  selectedCategories: Set<string>;
}) => {
  const filteredEvents = events
    .filter(
      (event) =>
        selectedCategories.has(event.category) && event.status !== "cancelled"
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  // Group events by date
  const groupedEvents = filteredEvents.reduce((groups, event) => {
    const dateKey = event.start.toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(event);
    return groups;
  }, {} as { [key: string]: CalendarEvent[] });

  const dateKeys = Object.keys(groupedEvents).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden">
      <div className="max-h-[700px] overflow-y-auto">
        {dateKeys.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarIcon size={48} className="text-[#475569] mx-auto mb-3" />
            <p className="text-[#94A3B8] font-medium">No events to display</p>
            <p className="text-[#475569] text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          dateKeys.map((dateKey) => {
            const date = new Date(dateKey);
            const dayEvents = groupedEvents[dateKey];

            return (
              <div key={dateKey} className="border-b border-[rgba(15,23,42,0.06)] last:border-0">
                {/* Date Header */}
                <div
                  className={cn(
                    "sticky top-0 px-4 py-3 bg-[#F7F7FB] border-b border-[rgba(15,23,42,0.06)]",
                    isToday(date) && "bg-[#6637F4]/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "w-10 h-10 flex items-center justify-center rounded-md font-bold",
                        isToday(date)
                          ? "bg-[#6637F4] text-white"
                          : "bg-white text-[#0F172A] border border-[rgba(15,23,42,0.06)]"
                      )}
                    >
                      {date.getDate()}
                    </span>
                    <div>
                      <p
                        className={cn(
                          "font-semibold",
                          isToday(date) ? "text-[#6637F4]" : "text-[#0F172A]"
                        )}
                      >
                        {isToday(date)
                          ? "Today"
                          : date.toLocaleDateString("en-US", { weekday: "long" })}
                      </p>
                      <p className="text-sm text-[#94A3B8]">
                        {date.toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <span className="ml-auto text-sm text-[#475569]">
                      {dayEvents.length} event{dayEvents.length !== 1 && "s"}
                    </span>
                  </div>
                </div>

                {/* Events List */}
                <div className="p-4 space-y-3">
                  {dayEvents.map((event) => {
                    const categoryInfo = getCategoryInfo(event.category);
                    const CategoryIcon = categoryInfo.icon;

                    return (
                      <motion.div
                        key={event.id}
                        whileHover={{ x: 4 }}
                        onClick={() => onEventClick(event)}
                        className="flex items-start gap-4 p-4 rounded-md hover:bg-[#F7F7FB] cursor-pointer transition-colors group"
                      >
                        {/* Time */}
                        <div className="w-20 flex-shrink-0 text-right">
                          {event.allDay ? (
                            <span className="text-sm text-[#475569]">All Day</span>
                          ) : (
                            <>
                              <p className="text-sm font-medium text-[#0F172A]">
                                {formatTime(event.start)}
                              </p>
                              <p className="text-xs text-[#475569]">
                                {formatTime(event.end)}
                              </p>
                            </>
                          )}
                        </div>

                        {/* Color Bar */}
                        <div
                          className="w-1 h-full min-h-[60px] rounded-full flex-shrink-0"
                          style={{ backgroundColor: event.color }}
                        />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-[#0F172A] group-hover:text-[#6637F4] transition-colors">
                                {event.title}
                              </h4>
                              {event.description && (
                                <p className="text-sm text-[#94A3B8] mt-1 line-clamp-2">
                                  {event.description}
                                </p>
                              )}
                            </div>
                            {event.priority === "high" && (
                              <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-md">
                                High Priority
                              </span>
                            )}
                          </div>

                          {/* Meta */}
                          <div className="flex items-center flex-wrap gap-3 mt-3">
                            {event.location && (
                              <div className="flex items-center gap-1 text-sm text-[#94A3B8]">
                                <MapPin size={14} />
                                <span>{event.location}</span>
                              </div>
                            )}
                            {event.meetingLink && (
                              <div className="flex items-center gap-1 text-sm text-blue-500">
                                <Video size={14} />
                                <span>Video Call</span>
                              </div>
                            )}
                            {!event.allDay && (
                              <div className="flex items-center gap-1 text-sm text-[#475569]">
                                <Clock size={14} />
                                <span>{getEventDuration(event.start, event.end)}</span>
                              </div>
                            )}
                          </div>

                          {/* Attendees */}
                          {event.attendees && event.attendees.length > 0 && (
                            <div className="flex items-center gap-2 mt-3">
                              <div className="flex -space-x-2">
                                {event.attendees.slice(0, 5).map((attendee) => (
                                  <Avatar
                                    key={attendee.id}
                                    className="h-6 w-6 border-2 border-white"
                                  >
                                    <AvatarImage src={attendee.avatar} />
                                    <AvatarFallback className="text-xs bg-slate-200">
                                      {getInitials(attendee.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                              </div>
                              {event.attendees.length > 5 && (
                                <span className="text-xs text-[#475569]">
                                  +{event.attendees.length - 5} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Category Icon */}
                        <div
                          className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${event.color}15` }}
                        >
                          <CategoryIcon size={18} style={{ color: event.color }} />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ============================================
// EVENT FORM DIALOG
// ============================================

const EventFormDialog = ({
  isOpen,
  onClose,
  event,
  selectedDate,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  selectedDate: Date;
  onSubmit: (data: Partial<CalendarEvent>) => void;
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    startTime: "09:00",
    endDate: "",
    endTime: "10:00",
    allDay: false,
    category: "work",
    color: "#3B82F6",
    location: "",
    meetingLink: "",
    priority: "medium" as CalendarEvent["priority"],
    isPrivate: false,
    notes: "",
  });
  const [selectedAttendees, setSelectedAttendees] = useState<Attendee[]>([]);
  const [teamMembers, setTeamMembers] = useState<Attendee[]>([]);
  const [searchAttendee, setSearchAttendee] = useState("");

  // Fetch employees when dialog opens
  useEffect(() => {
    if (isOpen) {
      getEmployees({ limit: 200 })
        .then((employees: any[]) => {
          setTeamMembers(
            employees.map((emp: any) => ({
              id: emp.id,
              name: `${emp.user?.firstName || ""} ${emp.user?.lastName || ""}`.trim() || emp.email || "Employee",
              email: emp.user?.email || emp.email || "",
              avatar: emp.user?.profileImage || undefined,
              status: "pending" as const,
            }))
          );
        })
        .catch(() => setTeamMembers([]));
    }
  }, [isOpen]);

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || "",
        startDate: event.start.toISOString().split("T")[0],
        startTime: event.start.toTimeString().slice(0, 5),
        endDate: event.end.toISOString().split("T")[0],
        endTime: event.end.toTimeString().slice(0, 5),
        allDay: event.allDay,
        category: event.category,
        color: event.color,
        location: event.location || "",
        meetingLink: event.meetingLink || "",
        priority: event.priority,
        isPrivate: event.isPrivate,
        notes: event.notes || "",
      });
      setSelectedAttendees(event.attendees || []);
    } else {
      const dateStr = selectedDate.toISOString().split("T")[0];
      setFormData({
        title: "",
        description: "",
        startDate: dateStr,
        startTime: "09:00",
        endDate: dateStr,
        endTime: "10:00",
        allDay: false,
        category: "work",
        color: "#3B82F6",
        location: "",
        meetingLink: "",
        priority: "medium",
        isPrivate: false,
        notes: "",
      });
      setSelectedAttendees([]);
    }
  }, [event, selectedDate, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const start = new Date(`${formData.startDate}T${formData.startTime}`);
    const end = new Date(`${formData.endDate}T${formData.endTime}`);

    onSubmit({
      title: formData.title,
      description: formData.description,
      start,
      end,
      allDay: formData.allDay,
      category: formData.category,
      color: formData.color,
      location: formData.location,
      meetingLink: formData.meetingLink,
      priority: formData.priority,
      isPrivate: formData.isPrivate,
      notes: formData.notes,
      attendees: selectedAttendees,
      type: formData.category === "meeting" ? "meeting" : "event",
      status: "scheduled",
    });

    onClose();
  };

  const toggleAttendee = (attendee: Attendee) => {
    setSelectedAttendees((prev) =>
      prev.find((a) => a.id === attendee.id)
        ? prev.filter((a) => a.id !== attendee.id)
        : [...prev, { ...attendee, status: "pending" }]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 rounded-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0EEFF] sticky top-0 bg-white z-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              {event ? "Edit Event" : "Create Event"}
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              {event ? "Update event details" : "Add a new event to your calendar"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">
              Event Title <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter event title"
              required
              className="h-11 rounded-md"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add event description..."
              rows={2}
              className="rounded-md resize-none"
            />
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center justify-between p-3 bg-[#F7F7FB] rounded-md">
            <div className="flex items-center gap-3">
              <CalendarDays size={18} className="text-[#94A3B8]" />
              <span className="font-medium text-[#0F172A]">All Day Event</span>
            </div>
            <Switch
              checked={formData.allDay}
              onCheckedChange={(checked) => setFormData({ ...formData, allDay: checked })}
              className="data-[state=checked]:bg-[#6637F4]"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Start Date</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="h-11 rounded-md"
              />
            </div>
            {!formData.allDay && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">Start Time</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="h-11 rounded-md"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">End Date</Label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="h-11 rounded-md"
              />
            </div>
            {!formData.allDay && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">End Time</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="h-11 rounded-md"
                />
              </div>
            )}
          </div>

          {/* Category & Color */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(val) => {
                  const cat = eventCategories.find((c) => c.id === val);
                  setFormData({
                    ...formData,
                    category: val,
                    color: cat?.color || formData.color,
                  });
                }}
              >
                <SelectTrigger className="h-11 rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  {eventCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="rounded-md">
                      <div className="flex items-center gap-2">
                        <cat.icon size={14} style={{ color: cat.color }} />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Color</Label>
              <div className="flex items-center gap-2 h-11">
                {eventColors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c.color })}
                    className={cn(
                      "w-7 h-7 rounded-md transition-all",
                      formData.color === c.color && "ring-2 ring-offset-2 ring-[#6637F4]"
                    )}
                    style={{ backgroundColor: c.color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Location</Label>
            <AddressAutocompleteInput
              value={formData.location}
              onValueChange={(value) => setFormData({ ...formData, location: value })}
              onSelectAddress={(details) =>
                setFormData((prev) => ({
                  ...prev,
                  location: details.formattedAddress || details.addressLine1 || prev.location,
                }))
              }
              placeholder="Add location"
              className="h-11 rounded-md"
              iconClassName="text-[#475569]"
            />
          </div>

          {/* Meeting Link */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Meeting Link</Label>
            <div className="relative">
              <Video size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
              <Input
                value={formData.meetingLink}
                onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                placeholder="https://meet.google.com/..."
                className="h-11 pl-10 rounded-md"
              />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(val) => setFormData({ ...formData, priority: val as CalendarEvent["priority"] })}
            >
              <SelectTrigger className="h-11 rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-md">
                <SelectItem value="low" className="rounded-md">
                  <div className="flex items-center gap-2">
                    <Circle size={12} className="text-green-500 fill-green-500" />
                    Low
                  </div>
                </SelectItem>
                <SelectItem value="medium" className="rounded-md">
                  <div className="flex items-center gap-2">
                    <Circle size={12} className="text-yellow-500 fill-yellow-500" />
                    Medium
                  </div>
                </SelectItem>
                <SelectItem value="high" className="rounded-md">
                  <div className="flex items-center gap-2">
                    <Circle size={12} className="text-red-500 fill-red-500" />
                    High
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Attendees */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Attendees</Label>
            <div className="border border-[rgba(15,23,42,0.06)] rounded-md p-3">
              {/* Selected Attendees */}
              {selectedAttendees.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedAttendees.map((attendee) => (
                    <div
                      key={attendee.id}
                      className="flex items-center gap-2 px-2 py-1 bg-[#6637F4]/10 rounded-md"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={attendee.avatar} />
                        <AvatarFallback className="text-xs">
                          {getInitials(attendee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-[#0F172A]">{attendee.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleAttendee(attendee)}
                        className="text-[#475569] hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Available Attendees */}
              <div className="mb-2">
                <Input
                  placeholder="Search team members..."
                  value={searchAttendee}
                  onChange={(e) => setSearchAttendee(e.target.value)}
                  className="h-9 rounded-md text-sm"
                />
              </div>
              <div className="space-y-1 max-h-[150px] overflow-y-auto">
                {teamMembers
                  .filter((m) => !selectedAttendees.find((a) => a.id === m.id))
                  .filter((m) => !searchAttendee || m.name.toLowerCase().includes(searchAttendee.toLowerCase()) || m.email.toLowerCase().includes(searchAttendee.toLowerCase()))
                  .map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleAttendee(member)}
                      className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-[#F7F7FB] transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-[#0F172A]">{member.name}</p>
                        <p className="text-xs text-[#94A3B8]">{member.email}</p>
                      </div>
                      <Plus size={16} className="text-[#475569]" />
                    </button>
                  ))}
                {teamMembers.filter((m) => !selectedAttendees.find((a) => a.id === m.id)).length === 0 && (
                  <p className="text-xs text-[#94A3B8] text-center py-3">No more team members to add</p>
                )}
              </div>
            </div>
          </div>

          {/* Private Event */}
          <div className="flex items-center justify-between p-3 bg-[#F7F7FB] rounded-md">
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-[#94A3B8]" />
              <div>
                <span className="font-medium text-[#0F172A]">Private Event</span>
                <p className="text-xs text-[#94A3B8]">Only you can see this event</p>
              </div>
            </div>
            <Switch
              checked={formData.isPrivate}
              onCheckedChange={(checked) => setFormData({ ...formData, isPrivate: checked })}
              className="data-[state=checked]:bg-[#6637F4]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes..."
              rows={2}
              className="rounded-md resize-none"
            />
          </div>

          <DialogFooter className="pt-4 gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-md">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.title}
              className="bg-[#6637F4] hover:bg-[#6637F4]/90 text-white rounded-md"
            >
              {event ? (
                <>
                  <Check size={16} className="mr-2" /> Update Event
                </>
              ) : (
                <>
                  <Plus size={16} className="mr-2" /> Create Event
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// EVENT DETAILS DIALOG
// ============================================

const EventDetailsDialog = ({
  isOpen,
  onClose,
  event,
  onEdit,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  if (!event) return null;

  const categoryInfo = getCategoryInfo(event.category);
  const CategoryIcon = categoryInfo.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 rounded-md overflow-hidden">
        {/* Header with Color */}
        <div
          className="p-6 text-[#0F172A]"
          style={{ backgroundColor: event.color }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-md bg-white/20 flex items-center justify-center">
                <CategoryIcon size={24} className="text-[#0F172A]" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{event.title}</h2>
                <p className="text-[#0F172A]/80 capitalize">{event.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {event.priority === "high" && (
                <span className="px-2 py-1 bg-white/20 rounded-md text-xs font-medium">
                  High Priority
                </span>
              )}
              {event.isPrivate && (
                <span className="px-2 py-1 bg-white/20 rounded-md text-xs font-medium">
                  Private
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Date & Time */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-md bg-white/5 flex items-center justify-center">
              <Clock size={18} className="text-[#94A3B8]" />
            </div>
            <div>
              <p className="font-medium text-[#0F172A]">
                {formatDate(event.start)}
              </p>
              {event.allDay ? (
                <p className="text-sm text-[#94A3B8]">All Day</p>
              ) : (
                <p className="text-sm text-[#94A3B8]">
                  {formatTime(event.start)} - {formatTime(event.end)} ({getEventDuration(event.start, event.end)})
                </p>
              )}
              {event.recurrence && (
                <div className="flex items-center gap-1 text-sm text-[#6637F4] mt-1">
                  <Repeat size={14} />
                  <span className="capitalize">
                    Repeats {event.recurrence.frequency}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-md bg-white/5 flex items-center justify-center">
                <MapPin size={18} className="text-[#94A3B8]" />
              </div>
              <div>
                <p className="font-medium text-[#0F172A]">Location</p>
                <p className="text-sm text-[#94A3B8]">{event.location}</p>
              </div>
            </div>
          )}

          {/* Meeting Link */}
          {event.meetingLink && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-md bg-blue-100 flex items-center justify-center">
                <Video size={18} className="text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[#0F172A]">Meeting Link</p>
                <a
                  href={event.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                >
                  Join Meeting <ExternalLink size={12} />
                </a>
              </div>
              <Button
                size="sm"
                className="bg-[#6637F4] hover:bg-[#6637F4] text-white rounded-md"
              >
                <Video size={14} className="mr-1" />
                Join
              </Button>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-md bg-white/5 flex items-center justify-center">
                <AlertCircle size={18} className="text-[#94A3B8]" />
              </div>
              <div>
                <p className="font-medium text-[#0F172A]">Description</p>
                <p className="text-sm text-[#94A3B8]">{event.description}</p>
              </div>
            </div>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-md bg-white/5 flex items-center justify-center">
                <Users size={18} className="text-[#94A3B8]" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[#0F172A] mb-2">
                  Attendees ({event.attendees.length})
                </p>
                <div className="space-y-2">
                  {event.attendees.map((attendee) => (
                    <div key={attendee.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={attendee.avatar} />
                        <AvatarFallback className="text-xs bg-slate-200">
                          {getInitials(attendee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#0F172A]">
                          {attendee.name}
                        </p>
                        <p className="text-xs text-[#94A3B8]">{attendee.email}</p>
                      </div>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                          attendee.status === "accepted" && "bg-green-100 text-green-600",
                          attendee.status === "pending" && "bg-yellow-100 text-yellow-600",
                          attendee.status === "declined" && "bg-red-100 text-red-600",
                          attendee.status === "tentative" && "bg-blue-100 text-[#6637F4]"
                        )}
                      >
                        {attendee.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div className="p-4 bg-[#F7F7FB] rounded-md">
              <p className="text-xs text-[#475569] mb-1">Notes</p>
              <p className="text-sm text-[#475569]">{event.notes}</p>
            </div>
          )}

          {/* Created By */}
          <div className="pt-4 border-t border-[rgba(15,23,42,0.06)]">
            <p className="text-xs text-[#475569]">
              Created by {event.createdBy}
            </p>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 gap-3 border-t border-[rgba(15,23,42,0.06)]">
          <Button
            variant="outline"
            onClick={onDelete}
            className="rounded-md text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 size={16} className="mr-2" />
            Delete
          </Button>
          <Button
            onClick={onEdit}
            className="bg-[#6637F4] hover:bg-[#6637F4]/90 text-white rounded-md"
          >
            <Pencil size={16} className="mr-2" />
            Edit Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// CALENDAR SKELETON LOADER
// ============================================

const CalendarSkeleton = () => (
  <div className="animate-pulse space-y-5">
    {/* AI Bar Skeleton */}
    <div className="bg-white rounded-lg border border-[rgba(15,23,42,0.06)] p-5">
      <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
      <div className="grid grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-16 bg-gray-100 rounded" />
            <div className="h-6 w-10 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
    {/* Grid Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 bg-white rounded-lg border border-[rgba(15,23,42,0.06)] overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-[rgba(15,23,42,0.06)] bg-[#F7F7FB]">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex justify-center"><div className="h-4 w-16 bg-gray-200 rounded" /></div>
          ))}
        </div>
        {/* Calendar cells */}
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="min-h-[100px] p-3 border-b border-r border-[rgba(15,23,42,0.06)]">
              <div className="h-5 w-5 bg-gray-200 rounded-full mb-2" />
              {i % 4 === 0 && <div className="h-3 w-full bg-gray-100 rounded mb-1" />}
              {i % 7 === 2 && <div className="h-3 w-3/4 bg-gray-100 rounded" />}
            </div>
          ))}
        </div>
      </div>
      {/* Sidebar skeleton */}
      <div className="space-y-5">
        <div className="bg-white rounded-lg border border-[rgba(15,23,42,0.06)] p-4">
          <div className="h-4 w-20 bg-gray-200 rounded mb-3" />
          <div className="grid grid-cols-2 gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                <div className="h-6 w-8 bg-gray-200 rounded mx-auto mb-1" />
                <div className="h-3 w-12 bg-gray-100 rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[rgba(15,23,42,0.06)] p-4">
          <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-8 w-8 bg-gray-50 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ============================================
// MAIN CALENDAR PAGE COMPONENT
// ============================================
const CalendarPage = () => {
  const { toast } = useToast();

  // State
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day" | "agenda">("month");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(eventCategories.map((c) => c.id))
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<CalendarEvent | null>(null);

  // Helper: map API response to frontend CalendarEvent type
  const mapApiEvent = (e: any): CalendarEvent => ({
    id: e.id,
    title: e.title,
    description: e.description || '',
    start: new Date(e.startTime),
    end: new Date(e.endTime),
    allDay: e.isAllDay || false,
    type: fromBackendEventType(e.eventType, e.category),
    category: e.category || 'work',
    color: e.color || '#3B82F6',
    location: e.location || undefined,
    meetingLink: e.meetingLink || undefined,
    attendees: e.attendees?.map((a: any) => ({
      id: a.employeeId || a.id,
      name: a.employee
        ? `${a.employee.user?.firstName || ''} ${a.employee.user?.lastName || ''}`.trim() || 'Unknown'
        : a.name || 'Unknown',
      email: a.employee?.user?.email || a.email || '',
      avatar: a.employee?.user?.avatar || a.avatar || undefined,
      status: a.status || 'pending',
    })) || [],
    status: 'scheduled',
    priority: (e.priority?.toLowerCase() || 'medium') as CalendarEvent['priority'],
    createdBy: e.createdBy ? `${e.createdBy.firstName} ${e.createdBy.lastName}` : 'System',
    isPrivate: e.isPrivate || false,
    notes: e.notes || undefined,
    leadId: e.leadId || undefined,
    clientId: e.clientId || undefined,
  });

  // Fetch events from calendar API
  const fetchCalendarEvents = async () => {
    try {
      setIsLoading(true);
      const data = await getCalendarEvents({ limit: 200 }) as any[];
      const calendarEvents: CalendarEvent[] = data.map(mapApiEvent);
      setEvents(calendarEvents);
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarEvents();
  }, []);

  // Navigation
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") newDate.setMonth(newDate.getMonth() - 1);
    else if (viewMode === "week") newDate.setDate(newDate.getDate() - 7);
    else if (viewMode === "day") newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") newDate.setMonth(newDate.getMonth() + 1);
    else if (viewMode === "week") newDate.setDate(newDate.getDate() + 7);
    else if (viewMode === "day") newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Get current period title
  const getPeriodTitle = () => {
    if (viewMode === "month") {
      return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } else if (viewMode === "week") {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${formatShortDate(startOfWeek)} - ${formatShortDate(endOfWeek)}, ${currentDate.getFullYear()}`;
    } else if (viewMode === "day") {
      return formatDate(currentDate);
    }
    return "Agenda";
  };

  // Category toggle
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) newSet.delete(categoryId);
      else newSet.add(categoryId);
      return newSet;
    });
  };

  // Event handlers
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    if (viewMode === "month") { setCurrentDate(date); setViewMode("day"); }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setCurrentEvent(event);
    setIsDetailsOpen(true);
  };

  const handleAddEvent = async (data: Partial<CalendarEvent>) => {
    try {
      const payload = {
        title: data.title!,
        description: data.description || null,
        startTime: data.start!.toISOString(),
        endTime: data.end!.toISOString(),
        isAllDay: data.allDay || false,
        eventType: toBackendEventType(data),
        category: data.category || 'work',
        color: data.color || '#3B82F6',
        location: data.location || null,
        meetingLink: data.meetingLink || null,
        priority: (data.priority || 'medium').toUpperCase(),
        isPrivate: data.isPrivate || false,
        notes: data.notes || null,
        attendeeIds: data.attendees?.map((a) => a.id) || [],
        leadId: data.leadId || null,
        clientId: data.clientId || null,
      };
      const created = await createCalendarEvent(payload) as any;
      if (created) setEvents((prev) => [...prev, mapApiEvent(created)]);
      toast({ title: "Event Created", description: `${data.title} has been added to your calendar.` });
    } catch (error: any) {
      console.error('Failed to create event:', error);
      toast({ title: "Error", description: error?.response?.data?.message || "Failed to create event.", variant: "destructive" });
    }
  };

  const handleEditEvent = async (data: Partial<CalendarEvent>) => {
    if (!currentEvent) return;
    try {
      const payload: any = {};
      if (data.title !== undefined) payload.title = data.title;
      if (data.description !== undefined) payload.description = data.description || null;
      if (data.start) payload.startTime = data.start.toISOString();
      if (data.end) payload.endTime = data.end.toISOString();
      if (data.allDay !== undefined) payload.isAllDay = data.allDay;
      if (data.category !== undefined) payload.category = data.category;
      if (data.color !== undefined) payload.color = data.color;
      if (data.location !== undefined) payload.location = data.location || null;
      if (data.meetingLink !== undefined) payload.meetingLink = data.meetingLink || null;
      if (data.priority !== undefined) payload.priority = data.priority.toUpperCase();
      if (data.isPrivate !== undefined) payload.isPrivate = data.isPrivate;
      if (data.notes !== undefined) payload.notes = data.notes || null;
      if (data.type || data.category) payload.eventType = toBackendEventType({ ...currentEvent, ...data });
      if (data.attendees) payload.attendeeIds = data.attendees.map((a) => a.id);
      if (data.leadId !== undefined) payload.leadId = data.leadId || null;
      if (data.clientId !== undefined) payload.clientId = data.clientId || null;

      const updated = await updateCalendarEvent(currentEvent.id, payload) as any;
      if (updated) setEvents((prev) => prev.map((e) => (e.id === currentEvent.id ? mapApiEvent(updated) : e)));
      toast({ title: "Event Updated", description: "The event has been updated successfully." });
    } catch (error: any) {
      console.error('Failed to update event:', error);
      toast({ title: "Error", description: error?.response?.data?.message || "Failed to update event.", variant: "destructive" });
    }
  };

  const handleDeleteEvent = async () => {
    if (!currentEvent) return;
    try {
      await deleteCalendarEvent(currentEvent.id);
      setEvents((prev) => prev.filter((e) => e.id !== currentEvent.id));
      setIsDeleteAlertOpen(false);
      setIsDetailsOpen(false);
      setCurrentEvent(null);
      toast({ title: "Event Deleted", description: "The event has been removed from your calendar.", variant: "destructive" });
    } catch (error: any) {
      console.error('Failed to delete event:', error);
      toast({ title: "Error", description: error?.response?.data?.message || "Failed to delete event.", variant: "destructive" });
    }
  };

  // Filter events by search
  const filteredEvents = events.filter((event) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return event.title.toLowerCase().includes(query) || event.description?.toLowerCase().includes(query) || event.location?.toLowerCase().includes(query);
  });

  // Computed stats
  const now = new Date();
  const todayEvents = events.filter((e) => isSameDay(e.start, now) && e.status !== "cancelled");
  const todayCount = todayEvents.length;
  const upcomingEvents = events.filter((e) => e.start > now && e.status !== "cancelled");
  const upcomingCount = upcomingEvents.length;

  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
  const thisWeekEvents = events.filter((e) => e.start >= weekStart && e.start < weekEnd && e.status !== "cancelled");
  const thisWeekCount = thisWeekEvents.length;

  const highPriorityCount = events.filter((e) => e.priority === "high" && e.start >= now && e.status !== "cancelled").length;

  const meetingCount = todayEvents.filter((e) => e.type === "meeting" || e.category === "meeting").length;
  const totalMeetingHours = todayEvents.filter((e) => e.type === "meeting" || e.category === "meeting").reduce((sum, e) => sum + (e.end.getTime() - e.start.getTime()) / 3600000, 0);
  const focusHours = Math.max(0, 8 - totalMeetingHours);

  // Detect back-to-back meetings (within 15 min gap)
  const sortedTodayMeetings = todayEvents.filter((e) => e.type === "meeting" || e.category === "meeting").sort((a, b) => a.start.getTime() - b.start.getTime());
  const backToBackCount = sortedTodayMeetings.reduce((count, meeting, i) => {
    if (i === 0) return 0;
    const gap = meeting.start.getTime() - sortedTodayMeetings[i - 1].end.getTime();
    return gap <= 15 * 60 * 1000 ? count + 1 : count;
  }, 0);

  // Pending RSVPs
  const pendingRsvpCount = events.filter((e) => e.start > now && e.attendees?.some((a) => a.status === "pending")).length;

  // Smart scheduling alerts
  type ScheduleAlert = { id: string; type: "warning" | "danger" | "info"; title: string; message: string; };
  const scheduleAlerts: ScheduleAlert[] = [];
  if (backToBackCount > 0) scheduleAlerts.push({ id: "b2b", type: "warning", title: "Back-to-Back Meetings", message: `${backToBackCount} consecutive meetings today with no break` });
  if (totalMeetingHours > 5) scheduleAlerts.push({ id: "overload", type: "danger", title: "Meeting Overload", message: `${totalMeetingHours.toFixed(1)}h of meetings — consider declining non-essential ones` });
  if (pendingRsvpCount > 0) scheduleAlerts.push({ id: "rsvp", type: "info", title: "Pending RSVPs", message: `${pendingRsvpCount} event${pendingRsvpCount > 1 ? 's' : ''} awaiting attendee responses` });
  if (highPriorityCount > 0) scheduleAlerts.push({ id: "highpri", type: "warning", title: "High Priority", message: `${highPriorityCount} high-priority event${highPriorityCount > 1 ? 's' : ''} coming up` });
  const visibleAlerts = scheduleAlerts.filter((a) => !dismissedAlerts.includes(a.id));

  // Next free slot (simplified: first 1h gap in today's schedule after now)
  const getNextFreeSlot = (): string => {
    const currentHour = now.getHours();
    const sortedToday = todayEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
    for (let h = Math.max(currentHour, 9); h < 17; h++) {
      const slotStart = new Date(now); slotStart.setHours(h, 0, 0, 0);
      const slotEnd = new Date(now); slotEnd.setHours(h + 1, 0, 0, 0);
      const hasConflict = sortedToday.some((e) => e.start < slotEnd && e.end > slotStart);
      if (!hasConflict) return `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
    }
    return "Tomorrow 9:00 AM";
  };

  // AI scheduling suggestions
  const aiSuggestions: { icon: LucideIcon; text: string; action: string }[] = [];
  if (focusHours < 2) aiSuggestions.push({ icon: Target, text: "Low focus time today. Block a deep work slot.", action: "Block Time" });
  if (meetingCount > 4) aiSuggestions.push({ icon: Coffee, text: "Heavy meeting day. Schedule a coffee break.", action: "Add Break" });
  if (pendingRsvpCount > 2) aiSuggestions.push({ icon: Users, text: `${pendingRsvpCount} events need RSVPs. Send reminders.`, action: "Remind" });
  if (thisWeekCount === 0) aiSuggestions.push({ icon: CalendarDays, text: "Empty week ahead. Schedule planning sessions.", action: "Plan" });
  if (aiSuggestions.length === 0) aiSuggestions.push({ icon: CheckCircle2, text: "Schedule looks balanced. No action needed.", action: "" });

  return (
    <div className="min-h-screen bg-[#F7F7FB]">

      <main className="flex-1">
        {/* Header */}
        <header className="crm-module-header sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-[rgba(15,23,42,0.06)]">
          <div className="px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
            <div className="crm-toolbar-row">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="crm-toolbar-actions gap-2">
                  <Button variant="outline" size="icon" className="crm-toolbar-button crm-toolbar-button-secondary crm-toolbar-icon-button" onClick={navigatePrevious}><ChevronLeft size={18} /></Button>
                  <Button variant="outline" size="icon" className="crm-toolbar-button crm-toolbar-button-secondary crm-toolbar-icon-button" onClick={navigateNext}><ChevronRight size={18} /></Button>
                  <Button variant="outline" className="crm-toolbar-button crm-toolbar-button-secondary" onClick={goToToday}>Today</Button>
                </div>
                <h1 className="crm-toolbar-title">{getPeriodTitle()}</h1>
              </div>
              <div className="crm-toolbar-actions">
                <div className="crm-toolbar-segment">
                  {(["month", "week", "day", "agenda"] as const).map((mode) => {
                    const icons = { month: LayoutGrid, week: Columns, day: CalendarIcon, agenda: List };
                    const Icon = icons[mode];
                    return (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        data-active={viewMode === mode}
                        className="crm-toolbar-segment-button"
                      >
                        <Icon size={14} />
                        <span className="capitalize">{mode}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="crm-toolbar-search w-full sm:w-56 lg:w-64">
                  <Search size={16} className="crm-toolbar-search-icon z-10" />
                  <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search events..." className="crm-toolbar-search-input" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="crm-toolbar-button crm-toolbar-button-primary"><Plus size={18} />Add Event<ChevronRight size={14} className="rotate-90 ml-0.5" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-lg w-48">
                    <DropdownMenuItem onClick={() => { setCurrentEvent(null); setIsFormOpen(true); }} className="gap-2 cursor-pointer"><CalendarIcon size={15} className="text-[#3B82F6]" />Add Event</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setCurrentEvent(null); setIsFormOpen(true); }} className="gap-2 cursor-pointer"><CheckCircle2 size={15} className="text-[#10B981]" />Add Task</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setCurrentEvent(null); setIsFormOpen(true); }} className="gap-2 cursor-pointer"><Users size={15} className="text-[#8B5CF6]" />Add Meeting</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setCurrentEvent(null); setIsFormOpen(true); }} className="gap-2 cursor-pointer"><Bell size={15} className="text-[#F59E0B]" />Add Reminder</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-5 page-enter">

          {/* ===== AI SCHEDULING INTELLIGENCE BAR ===== */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg border-l-[3px] border-l-[#6637F4] overflow-hidden" style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 8px 20px rgba(15,23,42,0.05)' }}>
            <div className="flex items-center justify-between px-5 pt-3.5 pb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#6637F4]/8 flex items-center justify-center"><Sparkles size={14} className="text-[#6637F4]" /></div>
                <span className="text-xs font-semibold text-[#0F172A]">AI Schedule Intelligence</span>
                <span className="ai-tag">AI</span>
              </div>
              <span className="text-[10px] text-[#94A3B8]">Updated just now</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 divide-x divide-[rgba(15,23,42,0.06)]">
              <div className="px-4 py-3 border-l-[3px] border-l-[#3B82F6] cursor-pointer hover:bg-[#F7F7FB] transition-all duration-150 rounded-r-md">
                <div className="flex items-center gap-1 mb-1"><CalendarDays size={11} className="text-[#94A3B8]" /><span className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-medium">Today</span></div>
                <span className="text-lg font-bold text-[#0F172A]" style={{ fontVariantNumeric: 'tabular-nums' }}>{todayCount}</span>
                <span className="text-[10px] text-[#94A3B8] ml-1">events</span>
              </div>
              <div className="px-4 py-3 border-l-[3px] border-l-[#8B5CF6] cursor-pointer hover:bg-[#F7F7FB] transition-all duration-150 rounded-r-md">
                <div className="flex items-center gap-1 mb-1"><Users size={11} className="text-[#94A3B8]" /><span className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-medium">Meetings</span></div>
                <span className="text-lg font-bold text-[#8B5CF6]" style={{ fontVariantNumeric: 'tabular-nums' }}>{meetingCount}</span>
                <span className="text-[10px] text-[#94A3B8] ml-1">({totalMeetingHours.toFixed(1)}h)</span>
              </div>
              <div className="px-4 py-3 border-l-[3px] border-l-[#01C44A] cursor-pointer hover:bg-[#F7F7FB] transition-all duration-150 rounded-r-md">
                <div className="flex items-center gap-1 mb-1"><Target size={11} className="text-[#94A3B8]" /><span className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-medium">Focus Time</span></div>
                <span className={cn("text-lg font-bold", focusHours >= 3 ? "text-[#01C44A]" : focusHours >= 1 ? "text-[#D97706]" : "text-[#FF2E2D]")} style={{ fontVariantNumeric: 'tabular-nums' }}>{focusHours.toFixed(1)}h</span>
                <span className="text-[10px] text-[#94A3B8] ml-1">available</span>
                <div className="mt-1.5 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (focusHours / 8) * 100)}%`, backgroundColor: focusHours >= 3 ? '#01C44A' : focusHours >= 1 ? '#D97706' : '#FF2E2D' }} /></div>
              </div>
              <div className="px-4 py-3 border-l-[3px] border-l-[#F97316] cursor-pointer hover:bg-[#F7F7FB] transition-all duration-150 rounded-r-md">
                <div className="flex items-center gap-1 mb-1"><CalendarRange size={11} className="text-[#94A3B8]" /><span className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-medium">This Week</span></div>
                <span className="text-lg font-bold text-[#0F172A]" style={{ fontVariantNumeric: 'tabular-nums' }}>{thisWeekCount}</span>
                <span className="text-[10px] text-[#94A3B8] ml-1">events</span>
              </div>
              <div className="px-4 py-3 border-l-[3px] border-l-[#FF2E2D] cursor-pointer hover:bg-[#F7F7FB] transition-all duration-150 rounded-r-md">
                <div className="flex items-center gap-1 mb-1"><AlertCircle size={11} className="text-[#94A3B8]" /><span className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-medium">High Priority</span></div>
                <span className={cn("text-lg font-bold", highPriorityCount > 0 ? "text-[#FF2E2D]" : "text-[#01C44A]")} style={{ fontVariantNumeric: 'tabular-nums' }}>{highPriorityCount}</span>
                <span className="text-[10px] text-[#94A3B8] ml-1">upcoming</span>
              </div>
              <div className="px-4 py-3 border-l-[3px] border-l-[#6637F4] cursor-pointer hover:bg-[#F7F7FB] transition-all duration-150 rounded-r-md">
                <div className="flex items-center gap-1 mb-1"><Clock size={11} className="text-[#94A3B8]" /><span className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-medium">Next Free</span></div>
                <span className="text-sm font-bold text-[#6637F4]">{getNextFreeSlot()}</span>
              </div>
            </div>
          </motion.div>

          {/* ===== SMART ALERTS ===== */}
          {visibleAlerts.length > 0 && (
            <div className="space-y-2">
              {visibleAlerts.map((alert) => (
                <motion.div key={alert.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={cn("flex items-center gap-3 px-4 py-2 rounded-lg border", alert.type === "danger" ? "bg-[#FF2E2D]/5 border-[#FF2E2D]/15" : alert.type === "warning" ? "bg-[#D97706]/5 border-[#D97706]/15" : "bg-[#6637F4]/5 border-[#6637F4]/15")}>
                  <AlertCircle size={14} className={alert.type === "danger" ? "text-[#FF2E2D]" : alert.type === "warning" ? "text-[#D97706]" : "text-[#6637F4]"} />
                  <span className="text-xs font-semibold text-[#0F172A]">{alert.title}</span>
                  <span className="text-xs text-[#475569] flex-1">{alert.message}</span>
                  <button onClick={() => setDismissedAlerts((p) => [...p, alert.id])} className="text-[#94A3B8] hover:text-[#475569]"><X size={14} /></button>
                </motion.div>
              ))}
            </div>
          )}

          {/* ===== MAIN GRID ===== */}
          {isLoading ? (
            <CalendarSkeleton />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 lg:gap-6">
              {/* Main Calendar View */}
              <div className="col-span-full xl:col-span-3 overflow-x-auto">
                <AnimatePresence mode="wait">
                  {viewMode === "month" && (
                    <motion.div key="month" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                      <MonthView currentDate={currentDate} events={filteredEvents} onDateClick={handleDateClick} onEventClick={handleEventClick} onAddEvent={(date) => { setSelectedDate(date); setCurrentEvent(null); setIsFormOpen(true); }} selectedCategories={selectedCategories} />
                    </motion.div>
                  )}
                  {viewMode === "week" && (
                    <motion.div key="week" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                      <WeekView currentDate={currentDate} events={filteredEvents} onEventClick={handleEventClick} selectedCategories={selectedCategories} />
                    </motion.div>
                  )}
                  {viewMode === "day" && (
                    <motion.div key="day" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                      <DayView currentDate={currentDate} events={filteredEvents} onEventClick={handleEventClick} selectedCategories={selectedCategories} />
                    </motion.div>
                  )}
                  {viewMode === "agenda" && (
                    <motion.div key="agenda" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                      <AgendaView events={filteredEvents} onEventClick={handleEventClick} selectedCategories={selectedCategories} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Sidebar Toggle Button (visible below xl) */}
              <div className="xl:hidden fixed bottom-6 right-6 z-40">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="w-12 h-12 rounded-full bg-[#6637F4] text-white shadow-lg hover:bg-[#6637F4]/90 flex items-center justify-center transition-all duration-200 hover:scale-105"
                  aria-label="Toggle sidebar"
                >
                  <PanelRight size={20} />
                </button>
              </div>

              {/* Sidebar Overlay (below xl) */}
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="xl:hidden fixed inset-0 bg-black/30 z-40"
                    onClick={() => setSidebarOpen(false)}
                  />
                )}
              </AnimatePresence>

              {/* Right Sidebar */}
              <div className={cn(
                "col-span-full xl:col-span-1 space-y-5",
                "max-xl:fixed max-xl:right-0 max-xl:top-0 max-xl:bottom-0 max-xl:w-80 max-xl:z-50 max-xl:bg-[#F7F7FB] max-xl:p-5 max-xl:overflow-y-auto max-xl:shadow-2xl",
                "max-xl:transition-transform max-xl:duration-300 max-xl:ease-in-out",
                sidebarOpen ? "max-xl:translate-x-0" : "max-xl:translate-x-full"
              )}>

                {/* Close button (mobile sidebar) */}
                <div className="xl:hidden flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-[#0F172A]">Sidebar</h3>
                  <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"><X size={18} /></button>
                </div>

                {/* Quick Stats - Enhanced */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg border border-[rgba(15,23,42,0.06)] p-4" style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.04)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-[#0F172A]">Overview</h3>
                    <button onClick={fetchCalendarEvents} className="p-1 rounded hover:bg-[#F1F5F9] text-[#94A3B8] hover:text-[#475569] transition-colors"><RefreshCw size={13} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 bg-[#3B82F6]/8 rounded-lg text-center border-l-4 border-l-[#3B82F6] hover:shadow-md hover:scale-[1.02] transition-all duration-150 cursor-pointer">
                      <p className="text-xl font-bold text-[#3B82F6] cursor-pointer hover:underline" style={{ fontVariantNumeric: 'tabular-nums' }}>{todayCount}</p>
                      <p className="text-[10px] text-[#94A3B8] font-medium">Today</p>
                    </div>
                    <div className="p-3 bg-[#6637F4]/8 rounded-lg text-center border-l-4 border-l-[#6637F4] hover:shadow-md hover:scale-[1.02] transition-all duration-150 cursor-pointer">
                      <p className="text-xl font-bold text-[#6637F4] cursor-pointer hover:underline" style={{ fontVariantNumeric: 'tabular-nums' }}>{thisWeekCount}</p>
                      <p className="text-[10px] text-[#94A3B8] font-medium">This Week</p>
                    </div>
                    <div className="p-3 bg-[#D97706]/8 rounded-lg text-center border-l-4 border-l-[#F97316] hover:shadow-md hover:scale-[1.02] transition-all duration-150 cursor-pointer">
                      <p className="text-xl font-bold text-[#D97706] cursor-pointer hover:underline" style={{ fontVariantNumeric: 'tabular-nums' }}>{upcomingCount}</p>
                      <p className="text-[10px] text-[#94A3B8] font-medium">Upcoming</p>
                    </div>
                    <div className="p-3 bg-[#FF2E2D]/8 rounded-lg text-center border-l-4 border-l-[#FF2E2D] hover:shadow-md hover:scale-[1.02] transition-all duration-150 cursor-pointer">
                      <p className="text-xl font-bold text-[#FF2E2D] cursor-pointer hover:underline" style={{ fontVariantNumeric: 'tabular-nums' }}>{highPriorityCount}</p>
                      <p className="text-[10px] text-[#94A3B8] font-medium">High Priority</p>
                    </div>
                  </div>
                </motion.div>

                {/* AI Scheduling Suggestions */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-lg border border-[rgba(15,23,42,0.06)] overflow-hidden" style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.04)' }}>
                  <div className="px-4 py-3 border-b border-[rgba(15,23,42,0.06)]">
                    <div className="flex items-center gap-2"><Sparkles size={13} className="text-[#6637F4]" /><span className="text-xs font-semibold text-[#0F172A]">AI Suggestions</span><span className="ai-tag">AI</span></div>
                  </div>
                  <div className="divide-y divide-[rgba(15,23,42,0.04)]">
                    {aiSuggestions.slice(0, 3).map((suggestion, i) => (
                      <div key={i} className="px-4 py-2.5 flex items-start gap-2.5 hover:bg-[#F7F7FB] transition-all duration-150 border-l-[3px] border-l-[#6637F4]">
                        <suggestion.icon size={13} className="text-[#6637F4] mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-[#475569] leading-relaxed">{suggestion.text}</p>
                          {suggestion.action && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <button onClick={() => { setCurrentEvent(null); setIsFormOpen(true); toast({ title: "Accepted", description: suggestion.text }); }} className="text-[10px] font-medium text-white bg-[#6637F4] hover:bg-[#6637F4]/90 px-2.5 py-1 rounded-md transition-colors duration-150">Accept</button>
                              <button onClick={() => { toast({ title: "Reschedule", description: "Opening reschedule options..." }); }} className="text-[10px] font-medium text-[#475569] hover:text-[#0F172A] bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-md transition-colors duration-150">Reschedule</button>
                            </div>
                          )}
                        </div>
                        <button className="text-[#94A3B8] hover:text-[#475569] transition-colors duration-150 mt-0.5 flex-shrink-0" aria-label="Dismiss suggestion"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                  {aiSuggestions.length > 3 && (
                    <div className="px-4 py-2.5 border-t border-[rgba(15,23,42,0.06)]">
                      <button className="text-[11px] font-medium text-[#6637F4] hover:underline">See {aiSuggestions.length - 3} more suggestions →</button>
                    </div>
                  )}
                </motion.div>

                {/* Mini Calendar */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <MiniCalendar selectedDate={selectedDate} onDateSelect={(date) => { setSelectedDate(date); setCurrentDate(date); }} events={events} />
                </motion.div>

                {/* Upcoming Events */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <UpcomingEvents events={filteredEvents} onEventClick={handleEventClick} />
                </motion.div>

                {/* Category Filter */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <CategoryFilter selectedCategories={selectedCategories} onToggleCategory={toggleCategory} />
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Dialogs */}
      <EventFormDialog isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setCurrentEvent(null); }} event={currentEvent} selectedDate={selectedDate} onSubmit={currentEvent ? handleEditEvent : handleAddEvent} />
      <EventDetailsDialog isOpen={isDetailsOpen} onClose={() => { setIsDetailsOpen(false); setCurrentEvent(null); }} event={currentEvent} onEdit={() => { setIsDetailsOpen(false); setIsFormOpen(true); }} onDelete={() => { setIsDeleteAlertOpen(true); }} />
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete "{currentEvent?.title}"? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} className="bg-red-500 hover:bg-red-600 rounded-md">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
};

export default CalendarPage;
