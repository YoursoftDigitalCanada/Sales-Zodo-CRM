// src/pages/Calendar.tsx

import React, { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/Sidebar";
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
import api from "@/lib/axios";
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
  { id: "teal", color: "#17C3B2", name: "Teal" },
  { id: "orange", color: "#F97316", name: "Orange" },
];



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
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#0D2342]">
          {viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
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
            className="text-center text-xs font-medium text-slate-400 py-1"
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
                "relative h-8 w-8 rounded-lg text-sm font-medium transition-all",
                !isCurrentMonth && "text-slate-300",
                isCurrentMonth && !isSelected && "text-slate-600 hover:bg-slate-100",
                isTodayDate && !isSelected && "bg-[#17C3B2]/10 text-[#17C3B2]",
                isSelected && "bg-[#17C3B2] text-white shadow-lg shadow-[#17C3B2]/30"
              )}
            >
              {day}
              {hasEvent && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#17C3B2]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <Button
          variant="ghost"
          className="w-full justify-start text-sm text-slate-600 hover:text-[#17C3B2] rounded-lg"
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
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <h3 className="font-semibold text-[#0D2342] mb-4">Upcoming Events</h3>

      {upcomingEvents.length === 0 ? (
        <div className="text-center py-8">
          <CalendarIcon size={32} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No upcoming events</p>
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
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${event.color}15` }}
                >
                  <CategoryIcon size={18} style={{ color: event.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#0D2342] truncate">{event.title}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <Clock size={12} />
                    <span>
                      {isToday(event.start) ? "Today" : formatShortDate(event.start)}
                      {!event.allDay && `, ${formatTime(event.start)}`}
                    </span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
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
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <h3 className="font-semibold text-[#0D2342] mb-4">Categories</h3>
      <div className="space-y-2">
        {eventCategories.map((category) => {
          const CategoryIcon = category.icon;
          const isSelected = selectedCategories.has(category.id);

          return (
            <button
              key={category.id}
              onClick={() => onToggleCategory(category.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                isSelected
                  ? "bg-slate-100"
                  : "hover:bg-slate-50 opacity-60 hover:opacity-100"
              )}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <CategoryIcon size={16} style={{ color: category.color }} />
              <span className="text-sm font-medium text-[#0D2342] flex-1 text-left">
                {category.name}
              </span>
              {isSelected && <Check size={14} className="text-[#17C3B2]" />}
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
      className="p-3 rounded-xl cursor-pointer transition-all hover:shadow-md"
      style={{ backgroundColor: `${event.color}10`, borderLeft: `3px solid ${event.color}` }}
    >
      <div className="flex items-start gap-2">
        <CategoryIcon size={14} style={{ color: event.color }} className="mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[#0D2342] text-sm truncate">{event.title}</p>
          {!event.allDay && (
            <p className="text-xs text-slate-500 mt-0.5">
              {formatTime(event.start)} - {formatTime(event.end)}
            </p>
          )}
          {event.location && (
            <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
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
            <span className="text-xs text-slate-400">+{event.attendees.length - 3}</span>
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
  selectedCategories,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
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
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-slate-200">
        {dayNames.map((day) => (
          <div
            key={day}
            className="px-4 py-3 text-sm font-semibold text-slate-600 text-center bg-slate-50"
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

          return (
            <div
              key={index}
              onClick={() => onDateClick(date)}
              className={cn(
                "min-h-[120px] p-2 border-b border-r border-slate-100 cursor-pointer transition-colors",
                !isCurrentMonth && "bg-slate-50/50",
                isCurrentMonth && "hover:bg-slate-50",
                isPast && "opacity-60"
              )}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium",
                    !isCurrentMonth && "text-slate-400",
                    isCurrentMonth && "text-slate-700",
                    isTodayDate && "bg-[#17C3B2] text-white"
                  )}
                >
                  {day}
                </span>
                {dayEvents.length > 2 && (
                  <span className="text-xs text-slate-400">
                    +{dayEvents.length - 2} more
                  </span>
                )}
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
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-8 border-b border-slate-200">
        <div className="p-3 bg-slate-50" />
        {weekDays.map((date, index) => (
          <div
            key={index}
            className={cn(
              "p-3 text-center border-l border-slate-200",
              isToday(date) && "bg-[#17C3B2]/5"
            )}
          >
            <p className="text-xs text-slate-500">
              {date.toLocaleDateString("en-US", { weekday: "short" })}
            </p>
            <p
              className={cn(
                "text-lg font-semibold",
                isToday(date) ? "text-[#17C3B2]" : "text-[#0D2342]"
              )}
            >
              {date.getDate()}
            </p>
          </div>
        ))}
      </div>

      {/* All Day Events Row */}
      <div className="grid grid-cols-8 border-b border-slate-200">
        <div className="p-2 bg-slate-50 text-xs text-slate-500 text-center">
          All Day
        </div>
        {weekDays.map((date, index) => {
          const allDayEvents = getAllDayEvents(date);
          return (
            <div
              key={index}
              className="p-1 border-l border-slate-200 min-h-[40px]"
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
          <div key={hour} className="grid grid-cols-8 border-b border-slate-100">
            <div className="p-2 bg-slate-50 text-xs text-slate-500 text-right pr-3">
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
                    "p-1 border-l border-slate-100 min-h-[50px]",
                    isToday(date) && "bg-[#17C3B2]/5"
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
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-center gap-3">
          <span
            className={cn(
              "w-12 h-12 flex items-center justify-center rounded-xl text-2xl font-bold",
              isToday(currentDate)
                ? "bg-[#17C3B2] text-white"
                : "bg-slate-200 text-[#0D2342]"
            )}
          >
            {currentDate.getDate()}
          </span>
          <div>
            <p className="font-semibold text-[#0D2342]">
              {currentDate.toLocaleDateString("en-US", { weekday: "long" })}
            </p>
            <p className="text-sm text-slate-500">
              {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* All Day Events */}
      {allDayEvents.length > 0 && (
        <div className="p-3 border-b border-slate-200 bg-slate-50/50">
          <p className="text-xs text-slate-500 mb-2">All Day</p>
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
              className="flex border-b border-slate-100 min-h-[60px]"
            >
              <div className="w-20 p-3 bg-slate-50 text-sm text-slate-500 text-right flex-shrink-0">
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
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="max-h-[700px] overflow-y-auto">
        {dateKeys.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarIcon size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No events to display</p>
            <p className="text-slate-400 text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          dateKeys.map((dateKey) => {
            const date = new Date(dateKey);
            const dayEvents = groupedEvents[dateKey];

            return (
              <div key={dateKey} className="border-b border-slate-100 last:border-0">
                {/* Date Header */}
                <div
                  className={cn(
                    "sticky top-0 px-4 py-3 bg-slate-50 border-b border-slate-100",
                    isToday(date) && "bg-[#17C3B2]/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "w-10 h-10 flex items-center justify-center rounded-xl font-bold",
                        isToday(date)
                          ? "bg-[#17C3B2] text-white"
                          : "bg-white text-[#0D2342] border border-slate-200"
                      )}
                    >
                      {date.getDate()}
                    </span>
                    <div>
                      <p
                        className={cn(
                          "font-semibold",
                          isToday(date) ? "text-[#17C3B2]" : "text-[#0D2342]"
                        )}
                      >
                        {isToday(date)
                          ? "Today"
                          : date.toLocaleDateString("en-US", { weekday: "long" })}
                      </p>
                      <p className="text-sm text-slate-500">
                        {date.toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <span className="ml-auto text-sm text-slate-400">
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
                        className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group"
                      >
                        {/* Time */}
                        <div className="w-20 flex-shrink-0 text-right">
                          {event.allDay ? (
                            <span className="text-sm text-slate-400">All Day</span>
                          ) : (
                            <>
                              <p className="text-sm font-medium text-[#0D2342]">
                                {formatTime(event.start)}
                              </p>
                              <p className="text-xs text-slate-400">
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
                              <h4 className="font-semibold text-[#0D2342] group-hover:text-[#17C3B2] transition-colors">
                                {event.title}
                              </h4>
                              {event.description && (
                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                                  {event.description}
                                </p>
                              )}
                            </div>
                            {event.priority === "high" && (
                              <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-lg">
                                High Priority
                              </span>
                            )}
                          </div>

                          {/* Meta */}
                          <div className="flex items-center flex-wrap gap-3 mt-3">
                            {event.location && (
                              <div className="flex items-center gap-1 text-sm text-slate-500">
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
                              <div className="flex items-center gap-1 text-sm text-slate-400">
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
                                <span className="text-xs text-slate-400">
                                  +{event.attendees.length - 5} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Category Icon */}
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
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
      <DialogContent className="sm:max-w-[600px] p-0 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-[#17C3B2]/10 to-transparent sticky top-0 bg-white z-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0D2342]">
              {event ? "Edit Event" : "Create Event"}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {event ? "Update event details" : "Add a new event to your calendar"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">
              Event Title <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter event title"
              required
              className="h-11 rounded-xl"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add event description..."
              rows={2}
              className="rounded-xl resize-none"
            />
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-3">
              <CalendarDays size={18} className="text-slate-500" />
              <span className="font-medium text-[#0D2342]">All Day Event</span>
            </div>
            <Switch
              checked={formData.allDay}
              onCheckedChange={(checked) => setFormData({ ...formData, allDay: checked })}
              className="data-[state=checked]:bg-[#17C3B2]"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Start Date</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
            {!formData.allDay && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-600">Start Time</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="h-11 rounded-xl"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">End Date</Label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
            {!formData.allDay && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-600">End Time</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="h-11 rounded-xl"
                />
              </div>
            )}
          </div>

          {/* Category & Color */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Category</Label>
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
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {eventCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="rounded-lg">
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
              <Label className="text-sm font-medium text-slate-600">Color</Label>
              <div className="flex items-center gap-2 h-11">
                {eventColors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c.color })}
                    className={cn(
                      "w-7 h-7 rounded-lg transition-all",
                      formData.color === c.color && "ring-2 ring-offset-2 ring-[#17C3B2]"
                    )}
                    style={{ backgroundColor: c.color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">Location</Label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Add location"
                className="h-11 pl-10 rounded-xl"
              />
            </div>
          </div>

          {/* Meeting Link */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">Meeting Link</Label>
            <div className="relative">
              <Video size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={formData.meetingLink}
                onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                placeholder="https://meet.google.com/..."
                className="h-11 pl-10 rounded-xl"
              />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(val) => setFormData({ ...formData, priority: val as CalendarEvent["priority"] })}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="low" className="rounded-lg">
                  <div className="flex items-center gap-2">
                    <Circle size={12} className="text-green-500 fill-green-500" />
                    Low
                  </div>
                </SelectItem>
                <SelectItem value="medium" className="rounded-lg">
                  <div className="flex items-center gap-2">
                    <Circle size={12} className="text-yellow-500 fill-yellow-500" />
                    Medium
                  </div>
                </SelectItem>
                <SelectItem value="high" className="rounded-lg">
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
            <Label className="text-sm font-medium text-slate-600">Attendees</Label>
            <div className="border border-slate-200 rounded-xl p-3">
              {/* Selected Attendees */}
              {selectedAttendees.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedAttendees.map((attendee) => (
                    <div
                      key={attendee.id}
                      className="flex items-center gap-2 px-2 py-1 bg-[#17C3B2]/10 rounded-lg"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={attendee.avatar} />
                        <AvatarFallback className="text-xs">
                          {getInitials(attendee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-[#0D2342]">{attendee.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleAttendee(attendee)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Available Attendees */}
              <div className="space-y-1 max-h-[150px] overflow-y-auto">
                {(selectedAttendees)
                  .filter((m) => !selectedAttendees.find((a) => a.id === m.id))
                  .map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleAttendee(member)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-[#0D2342]">{member.name}</p>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </div>
                      <Plus size={16} className="text-slate-400" />
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Private Event */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-slate-500" />
              <div>
                <span className="font-medium text-[#0D2342]">Private Event</span>
                <p className="text-xs text-slate-500">Only you can see this event</p>
              </div>
            </div>
            <Switch
              checked={formData.isPrivate}
              onCheckedChange={(checked) => setFormData({ ...formData, isPrivate: checked })}
              className="data-[state=checked]:bg-[#17C3B2]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes..."
              rows={2}
              className="rounded-xl resize-none"
            />
          </div>

          <DialogFooter className="pt-4 gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.title}
              className="bg-[#17C3B2] hover:bg-[#17C3B2]/90 text-white rounded-xl"
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
      <DialogContent className="sm:max-w-[500px] p-0 rounded-2xl overflow-hidden">
        {/* Header with Color */}
        <div
          className="p-6 text-white"
          style={{ backgroundColor: event.color }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <CategoryIcon size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{event.title}</h2>
                <p className="text-white/80 capitalize">{event.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {event.priority === "high" && (
                <span className="px-2 py-1 bg-white/20 rounded-lg text-xs font-medium">
                  High Priority
                </span>
              )}
              {event.isPrivate && (
                <span className="px-2 py-1 bg-white/20 rounded-lg text-xs font-medium">
                  Private
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Date & Time */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Clock size={18} className="text-slate-500" />
            </div>
            <div>
              <p className="font-medium text-[#0D2342]">
                {formatDate(event.start)}
              </p>
              {event.allDay ? (
                <p className="text-sm text-slate-500">All Day</p>
              ) : (
                <p className="text-sm text-slate-500">
                  {formatTime(event.start)} - {formatTime(event.end)} ({getEventDuration(event.start, event.end)})
                </p>
              )}
              {event.recurrence && (
                <div className="flex items-center gap-1 text-sm text-[#17C3B2] mt-1">
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
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <MapPin size={18} className="text-slate-500" />
              </div>
              <div>
                <p className="font-medium text-[#0D2342]">Location</p>
                <p className="text-sm text-slate-500">{event.location}</p>
              </div>
            </div>
          )}

          {/* Meeting Link */}
          {event.meetingLink && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Video size={18} className="text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[#0D2342]">Meeting Link</p>
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
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
              >
                <Video size={14} className="mr-1" />
                Join
              </Button>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <AlertCircle size={18} className="text-slate-500" />
              </div>
              <div>
                <p className="font-medium text-[#0D2342]">Description</p>
                <p className="text-sm text-slate-500">{event.description}</p>
              </div>
            </div>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Users size={18} className="text-slate-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[#0D2342] mb-2">
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
                        <p className="text-sm font-medium text-[#0D2342]">
                          {attendee.name}
                        </p>
                        <p className="text-xs text-slate-500">{attendee.email}</p>
                      </div>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                          attendee.status === "accepted" && "bg-green-100 text-green-600",
                          attendee.status === "pending" && "bg-yellow-100 text-yellow-600",
                          attendee.status === "declined" && "bg-red-100 text-red-600",
                          attendee.status === "tentative" && "bg-blue-100 text-blue-600"
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
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">Notes</p>
              <p className="text-sm text-slate-600">{event.notes}</p>
            </div>
          )}

          {/* Created By */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Created by {event.createdBy}
            </p>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 gap-3 border-t border-slate-100">
          <Button
            variant="outline"
            onClick={onDelete}
            className="rounded-xl text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 size={16} className="mr-2" />
            Delete
          </Button>
          <Button
            onClick={onEdit}
            className="bg-[#17C3B2] hover:bg-[#17C3B2]/90 text-white rounded-xl"
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
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(eventCategories.map((c) => c.id))
  );
  const [searchQuery, setSearchQuery] = useState("");

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
    type: (e.eventType?.toLowerCase() || 'event') as CalendarEvent['type'],
    category: e.category || 'work',
    color: e.color || '#3B82F6',
    location: e.location || undefined,
    meetingLink: e.meetingLink || undefined,
    attendees: e.attendees?.map((a: any) => ({
      id: a.employeeId || a.id,
      name: a.employee ? `${a.employee.user?.firstName || ''} ${a.employee.user?.lastName || ''}`.trim() : 'Unknown',
      email: '',
      status: a.status || 'pending',
    })) || [],
    status: 'scheduled',
    priority: (e.priority?.toLowerCase() || 'medium') as CalendarEvent['priority'],
    createdBy: e.createdBy ? `${e.createdBy.firstName} ${e.createdBy.lastName}` : 'System',
    isPrivate: e.isPrivate || false,
    notes: e.notes || undefined,
  });

  // Fetch events from calendar API
  const fetchCalendarEvents = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/calendar', { params: { limit: 200 } });
      const data = res.data?.data || [];
      const calendarEvents: CalendarEvent[] = data.map(mapApiEvent);
      setEvents(calendarEvents);
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      // Fallback: show empty calendar
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
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewMode === "day") {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewMode === "day") {
      newDate.setDate(newDate.getDate() + 1);
    }
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
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Event handlers
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    if (viewMode === "month") {
      setCurrentDate(date);
      setViewMode("day");
    }
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
        eventType: (data.type === 'meeting' ? 'MEETING' : data.type === 'task' ? 'TASK' : data.type === 'reminder' ? 'REMINDER' : data.type === 'holiday' ? 'HOLIDAY' : data.type === 'personal' ? 'PERSONAL' : 'EVENT').toUpperCase(),
        category: data.category || 'work',
        color: data.color || '#3B82F6',
        location: data.location || null,
        meetingLink: data.meetingLink || null,
        priority: (data.priority || 'medium').toUpperCase(),
        isPrivate: data.isPrivate || false,
        notes: data.notes || null,
        attendeeIds: data.attendees?.map((a) => a.id) || [],
      };
      const res = await api.post('/calendar', payload);
      const created = res.data?.data;
      if (created) {
        setEvents((prev) => [...prev, mapApiEvent(created)]);
      }
      toast({
        title: "Event Created",
        description: `${data.title} has been added to your calendar.`,
      });
    } catch (error: any) {
      console.error('Failed to create event:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to create event.",
        variant: "destructive",
      });
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
      if (data.type) payload.eventType = (data.type === 'meeting' ? 'MEETING' : data.type === 'task' ? 'TASK' : data.type === 'reminder' ? 'REMINDER' : data.type === 'holiday' ? 'HOLIDAY' : data.type === 'personal' ? 'PERSONAL' : 'EVENT');
      if (data.attendees) payload.attendeeIds = data.attendees.map((a) => a.id);

      const res = await api.put(`/calendar/${currentEvent.id}`, payload);
      const updated = res.data?.data;
      if (updated) {
        setEvents((prev) => prev.map((e) => (e.id === currentEvent.id ? mapApiEvent(updated) : e)));
      }
      toast({
        title: "Event Updated",
        description: "The event has been updated successfully.",
      });
    } catch (error: any) {
      console.error('Failed to update event:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to update event.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEvent = async () => {
    if (!currentEvent) return;
    try {
      await api.delete(`/calendar/${currentEvent.id}`);
      setEvents((prev) => prev.filter((e) => e.id !== currentEvent.id));
      setIsDeleteAlertOpen(false);
      setIsDetailsOpen(false);
      setCurrentEvent(null);
      toast({
        title: "Event Deleted",
        description: "The event has been removed from your calendar.",
        variant: "destructive",
      });
    } catch (error: any) {
      console.error('Failed to delete event:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to delete event.",
        variant: "destructive",
      });
    }
  };

  // Filter events by search
  const filteredEvents = events.filter((event) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      event.title.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query)
    );
  });

  // Stats
  const todayEvents = events.filter(
    (e) => isSameDay(e.start, new Date()) && e.status !== "cancelled"
  ).length;
  const upcomingEvents = events.filter(
    (e) => e.start > new Date() && e.status !== "cancelled"
  ).length;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />

      <main className="flex-1 ml-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-200">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* Navigation */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl"
                    onClick={navigatePrevious}
                  >
                    <ChevronLeft size={18} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl"
                    onClick={navigateNext}
                  >
                    <ChevronRight size={18} />
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={goToToday}
                  >
                    Today
                  </Button>
                </div>

                {/* Period Title */}
                <h1 className="text-2xl font-bold text-[#0D2342]">
                  {getPeriodTitle()}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-slate-100 rounded-xl p-1">
                  <Button
                    variant={viewMode === "month" ? "secondary" : "ghost"}
                    size="sm"
                    className="rounded-lg"
                    onClick={() => setViewMode("month")}
                  >
                    <LayoutGrid size={16} className="mr-1" />
                    Month
                  </Button>
                  <Button
                    variant={viewMode === "week" ? "secondary" : "ghost"}
                    size="sm"
                    className="rounded-lg"
                    onClick={() => setViewMode("week")}
                  >
                    <Columns size={16} className="mr-1" />
                    Week
                  </Button>
                  <Button
                    variant={viewMode === "day" ? "secondary" : "ghost"}
                    size="sm"
                    className="rounded-lg"
                    onClick={() => setViewMode("day")}
                  >
                    <CalendarIcon size={16} className="mr-1" />
                    Day
                  </Button>
                  <Button
                    variant={viewMode === "agenda" ? "secondary" : "ghost"}
                    size="sm"
                    className="rounded-lg"
                    onClick={() => setViewMode("agenda")}
                  >
                    <List size={16} className="mr-1" />
                    Agenda
                  </Button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search events..."
                    className="pl-9 h-10 w-48 rounded-xl border-slate-200"
                  />
                </div>

                {/* Add Event Button */}
                <Button
                  onClick={() => {
                    setCurrentEvent(null);
                    setIsFormOpen(true);
                  }}
                  className="bg-[#17C3B2] hover:bg-[#17C3B2]/90 text-white rounded-xl gap-2"
                >
                  <Plus size={18} />
                  Add Event
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          <div className="grid grid-cols-4 gap-6">
            {/* Main Calendar View */}
            <div className="col-span-3">
              <AnimatePresence mode="wait">
                {viewMode === "month" && (
                  <motion.div
                    key="month"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <MonthView
                      currentDate={currentDate}
                      events={filteredEvents}
                      onDateClick={handleDateClick}
                      onEventClick={handleEventClick}
                      selectedCategories={selectedCategories}
                    />
                  </motion.div>
                )}

                {viewMode === "week" && (
                  <motion.div
                    key="week"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <WeekView
                      currentDate={currentDate}
                      events={filteredEvents}
                      onEventClick={handleEventClick}
                      selectedCategories={selectedCategories}
                    />
                  </motion.div>
                )}

                {viewMode === "day" && (
                  <motion.div
                    key="day"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <DayView
                      currentDate={currentDate}
                      events={filteredEvents}
                      onEventClick={handleEventClick}
                      selectedCategories={selectedCategories}
                    />
                  </motion.div>
                )}

                {viewMode === "agenda" && (
                  <motion.div
                    key="agenda"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <AgendaView
                      events={filteredEvents}
                      onEventClick={handleEventClick}
                      selectedCategories={selectedCategories}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Sidebar */}
            <div className="col-span-1 space-y-6">
              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200 p-4"
              >
                <h3 className="font-semibold text-[#0D2342] mb-4">Overview</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#17C3B2]/10 rounded-xl text-center">
                    <p className="text-2xl font-bold text-[#17C3B2]">{todayEvents}</p>
                    <p className="text-xs text-slate-500">Today</p>
                  </div>
                  <div className="p-3 bg-[#C9A14A]/10 rounded-xl text-center">
                    <p className="text-2xl font-bold text-[#C9A14A]">{upcomingEvents}</p>
                    <p className="text-xs text-slate-500">Upcoming</p>
                  </div>
                </div>
              </motion.div>

              {/* Mini Calendar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <MiniCalendar
                  selectedDate={selectedDate}
                  onDateSelect={(date) => {
                    setSelectedDate(date);
                    setCurrentDate(date);
                  }}
                  events={events}
                />
              </motion.div>

              {/* Upcoming Events */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <UpcomingEvents
                  events={filteredEvents}
                  onEventClick={handleEventClick}
                />
              </motion.div>

              {/* Category Filter */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <CategoryFilter
                  selectedCategories={selectedCategories}
                  onToggleCategory={toggleCategory}
                />
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      {/* Dialogs */}
      <EventFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setCurrentEvent(null);
        }}
        event={currentEvent}
        selectedDate={selectedDate}
        onSubmit={currentEvent ? handleEditEvent : handleAddEvent}
      />

      <EventDetailsDialog
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setCurrentEvent(null);
        }}
        event={currentEvent}
        onEdit={() => {
          setIsDetailsOpen(false);
          setIsFormOpen(true);
        }}
        onDelete={() => {
          setIsDeleteAlertOpen(true);
        }}
      />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{currentEvent?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              className="bg-red-500 hover:bg-red-600 rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CalendarPage;
