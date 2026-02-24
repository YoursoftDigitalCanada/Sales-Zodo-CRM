import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, User, ChevronLeft, ChevronRight, Plus,
  Video, Phone, MapPin, MoreHorizontal, CalendarDays,
  ArrowRight, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

// ── Types ──────────────────────────────────────────────────
interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  eventType: string;
  location?: string;
  meetingLink?: string;
  attendees?: Array<{
    employee?: { firstName: string; lastName: string };
  }>;
}

interface MeetingDisplay {
  id: string;
  title: string;
  time: string;
  endTime: string;
  lead: string;
  type: "video" | "phone" | "in-person";
  color: "teal" | "gold" | "navy";
  avatar: string;
}

// ── Helpers ────────────────────────────────────────────────
const COLORS: Array<"teal" | "gold" | "navy"> = ["teal", "gold", "navy"];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function inferType(ev: CalendarEvent): "video" | "phone" | "in-person" {
  if (ev.meetingLink) return "video";
  if (ev.eventType === "CALL") return "phone";
  if (ev.location) return "in-person";
  return "video";
}

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function toMeeting(ev: CalendarEvent, idx: number): MeetingDisplay {
  const firstAttendee = ev.attendees?.[0]?.employee;
  const leadName = firstAttendee ? `${firstAttendee.firstName} ${firstAttendee.lastName}` : "—";
  return {
    id: ev.id,
    title: ev.title,
    time: formatTime(ev.startTime),
    endTime: formatTime(ev.endTime),
    lead: leadName,
    type: inferType(ev),
    color: COLORS[idx % COLORS.length],
    avatar: firstAttendee ? getInitials(`${firstAttendee.firstName} ${firstAttendee.lastName}`) : "—",
  };
}

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarWidget() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [hoveredMeeting, setHoveredMeeting] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<MeetingDisplay[]>([]);
  const [eventDays, setEventDays] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // ── Fetch events for the current month ────────────────────
  useEffect(() => {
    const loadEvents = async () => {
      setIsLoading(true);
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const startDate = new Date(year, month, 1).toISOString();
        const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

        const res = await api.get("/calendar", {
          params: { startDate, endDate, limit: 100 },
        });
        const events = extractApiArray<CalendarEvent>(res.data);

        // Which days have events?
        const daysWithEvents = new Set<number>();
        events.forEach(ev => {
          const d = new Date(ev.startTime);
          if (d.getMonth() === month) daysWithEvents.add(d.getDate());
        });
        setEventDays(daysWithEvents);

        // Today's meetings
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);
        const todayEvents = events
          .filter(ev => ev.startTime.slice(0, 10) === todayStr)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        setMeetings(todayEvents.map(toMeeting));
      } catch (err) {
        console.error("Failed to load calendar events:", err);
        setMeetings([]);
        setEventDays(new Set());
      } finally {
        setIsLoading(false);
      }
    };
    loadEvents();
  }, [currentDate]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentDate);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const getMeetingIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'phone': return Phone;
      case 'in-person': return MapPin;
      default: return CalendarDays;
    }
  };

  const getColorClasses = (color: string, variant: 'bg' | 'text' | 'border' | 'gradient') => {
    const colors: Record<string, Record<string, string>> = {
      teal: { bg: 'bg-[#0891B2]', text: 'text-[#0891B2]', border: 'border-[#22D3EE]', gradient: 'from-[#22D3EE]/70' },
      gold: { bg: 'bg-[#D97706]', text: 'text-[#D97706]', border: 'border-[#FBBF24]', gradient: 'from-[#FBBF24]/70' },
      navy: { bg: 'bg-[#1a1a2e]', text: 'text-[#0F172A]', border: 'border-[#1a1a2e]', gradient: 'from-[#1a1a2e]/70' }
    };
    return colors[color]?.[variant] || colors.teal[variant];
  };

  return (
    <Card className="overflow-hidden border-none card-shadow bg-white/5">
      {/* Header */}
      <div className="bg-[#F1F5F9]/90 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#0891B2]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#D97706]/10 rounded-full blur-2xl" />

        <div className="relative flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div whileHover={{ rotate: 10 }} className="h-10 w-10 rounded-md bg-[#0891B2]/20 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-[#0891B2]" />
            </motion.div>
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">Calendar</h3>
              <p className="text-xs text-[#475569]">Manage your schedule</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/bookings/new")}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#0891B2] text-white text-xs font-medium rounded-md hover:bg-[#0891B2]/90 transition-colors"
          >
            <Plus size={14} />
            Add Event
          </motion.button>
        </div>

        {/* Month Navigation */}
        <div className="relative flex items-center justify-between">
          <motion.button whileHover={{ scale: 1.1, x: -2 }} whileTap={{ scale: 0.9 }} onClick={prevMonth} className="p-2 rounded-md bg-white/5/10 hover:bg-white/5/20 text-[#0F172A] transition-colors">
            <ChevronLeft size={18} />
          </motion.button>
          <motion.div key={currentDate.getMonth()} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <span className="text-xl font-bold text-[#0F172A]">{monthNames[currentDate.getMonth()]}</span>
            <span className="text-xl font-light text-[#0891B2] ml-2">{currentDate.getFullYear()}</span>
          </motion.div>
          <motion.button whileHover={{ scale: 1.1, x: 2 }} whileTap={{ scale: 0.9 }} onClick={nextMonth} className="p-2 rounded-md bg-white/5/10 hover:bg-white/5/20 text-[#0F172A] transition-colors">
            <ChevronRight size={18} />
          </motion.button>
        </div>
      </div>

      <div className="p-6">
        {/* Calendar Grid */}
        <div className="mb-6">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {days.map((day) => (
              <div key={day} className="text-center">
                <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">{day}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, index) => (
              <div key={`empty-${index}`} className="h-10" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const date = index + 1;
              const isToday = date === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
              const isSelected = date === selectedDate;
              const hasMeeting = eventDays.has(date);

              return (
                <motion.button key={date} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => setSelectedDate(date)} className={cn("h-10 w-full flex flex-col items-center justify-center rounded-md text-sm font-medium transition-all relative", isSelected ? "bg-[#0891B2] text-white" : isToday ? "bg-[#1a1a2e] text-[#0F172A]" : "text-[#475569] hover:bg-white/5")}>
                  {date}
                  {hasMeeting && !isSelected && (
                    <div className="absolute bottom-1.5 flex gap-0.5">
                      <div className="w-1 h-1 rounded-full bg-[#0891B2]" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 from-transparent via-slate-200 to-transparent" />
          <span className="text-xs font-medium text-[#475569]">Today's Schedule</span>
          <div className="h-px flex-1 from-transparent via-slate-200 to-transparent" />
        </div>

        {/* Upcoming Meetings */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-[#94A3B8]" />
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-[#94A3B8]">No meetings scheduled for today</p>
            </div>
          ) : (
            <AnimatePresence>
              {meetings.map((meeting, index) => {
                const MeetingIcon = getMeetingIcon(meeting.type);
                return (
                  <motion.div
                    key={meeting.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onHoverStart={() => setHoveredMeeting(meeting.id)}
                    onHoverEnd={() => setHoveredMeeting(null)}
                    className={cn("relative flex items-start gap-4 p-4 rounded-md transition-all cursor-pointer group", "bg-white/5 hover:bg-white/5 hover:shadow-lg hover:shadow-slate-200/50", "border border-transparent hover:border-[rgba(15,23,42,0.06)]")}
                  >
                    <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full transition-all", getColorClasses(meeting.color, 'bg'), hoveredMeeting === meeting.id ? "h-12" : "h-8")} />
                    <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className={cn("h-12 w-12 rounded-md flex items-center justify-center text-[#0F172A] text-sm font-bold card-shadow flex-shrink-0 r", getColorClasses(meeting.color, 'gradient'))}>
                      {meeting.avatar}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-[#0F172A] group-hover:text-[#0891B2] transition-colors">{meeting.title}</h4>
                        <motion.button whileHover={{ scale: 1.1 }} className="p-1 rounded-md hover:bg-white/5 text-[#475569] opacity-0 group-hover:opacity-100 transition-all">
                          <MoreHorizontal size={16} />
                        </motion.button>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5 text-[#94A3B8]">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="font-medium">{meeting.time}</span>
                          <span className="text-[#475569]">-</span>
                          <span className="font-medium">{meeting.endTime}</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                        <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full", meeting.type === 'video' && "bg-[#0891B2]/10 text-[#0891B2]", meeting.type === 'phone' && "bg-[#D97706]/10 text-[#D97706]", meeting.type === 'in-person' && "bg-[#1a1a2e]/10 text-[#0F172A]")}>
                          <MeetingIcon size={12} />
                          <span className="font-medium capitalize">{meeting.type.replace('-', ' ')}</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                        <div className="flex items-center gap-1.5 text-[#94A3B8]">
                          <User className="h-3.5 w-3.5" />
                          <span>with</span>
                          <span className={cn("font-semibold", getColorClasses(meeting.color, 'text'))}>{meeting.lead}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* View All Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/bookings")}
          className="w-full mt-4 py-3 rounded-md border-2 border-dashed border-[rgba(15,23,42,0.06)] text-[#94A3B8] text-sm font-medium hover:border-[#22D3EE] hover:text-[#0891B2] hover:bg-[#0891B2]/5 transition-all flex items-center justify-center gap-2"
        >
          View All Meetings
          <ArrowRight size={14} />
        </motion.button>
      </div>
    </Card>
  );
}