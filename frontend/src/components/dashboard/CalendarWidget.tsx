import { useState } from "react";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, User, ChevronLeft, ChevronRight, Plus, 
  Video, Phone, MapPin, MoreHorizontal, CalendarDays,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const meetings = [
  { 
    id: 1,
    title: "Meeting with Client", 
    time: "09:00",
    endTime: "10:00",
    lead: "Jaskren Rao",
    type: "video",
    color: "teal",
    avatar: "JR"
  },
  { 
    id: 2,
    title: "Deal with New Client", 
    time: "11:30",
    endTime: "12:30",
    lead: "Ashkista Jain",
    type: "phone",
    color: "gold",
    avatar: "AJ"
  },
  { 
    id: 3,
    title: "Project Review", 
    time: "14:00",
    endTime: "15:00",
    lead: "Michael Chen",
    type: "in-person",
    color: "navy",
    avatar: "MC"
  },
];

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [hoveredMeeting, setHoveredMeeting] = useState<number | null>(null);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentDate);
  
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getMeetingIcon = (type: string) => {
    switch(type) {
      case 'video': return Video;
      case 'phone': return Phone;
      case 'in-person': return MapPin;
      default: return CalendarDays;
    }
  };

  const getColorClasses = (color: string, variant: 'bg' | 'text' | 'border' | 'gradient') => {
    const colors: Record<string, Record<string, string>> = {
      teal: {
        bg: 'bg-[#23D3EE]',
        text: 'text-[#23D3EE]',
        border: 'border-[#23D3EE]',
        gradient: 'from-[#23D3EE] to-[#23D3EE]/70'
      },
      gold: {
        bg: 'bg-[#FBBF23]',
        text: 'text-[#FBBF23]',
        border: 'border-[#FBBF23]',
        gradient: 'from-[#FBBF23] to-[#FBBF23]/70'
      },
      navy: {
        bg: 'bg-[#0F172A]',
        text: 'text-[#0F172A]',
        border: 'border-[#0F172A]',
        gradient: 'from-[#0F172A] to-[#0F172A]/70'
      }
    };
    return colors[color]?.[variant] || colors.teal[variant];
  };

  return (
    <Card className="overflow-hidden border-none shadow-xl bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0F172A] to-[#0F172A]/90 p-6 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#23D3EE]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#FBBF23]/10 rounded-full blur-2xl" />
        
        <div className="relative flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ rotate: 10 }}
              className="h-10 w-10 rounded-xl bg-[#23D3EE]/20 flex items-center justify-center"
            >
              <CalendarDays className="h-5 w-5 text-[#23D3EE]" />
            </motion.div>
            <div>
              <h3 className="text-lg font-bold text-white">Calendar</h3>
              <p className="text-xs text-slate-400">Manage your schedule</p>
            </div>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#23D3EE] text-white text-xs font-medium rounded-lg shadow-lg shadow-[#23D3EE]/25 hover:bg-[#23D3EE]/90 transition-colors"
          >
            <Plus size={14} />
            Add Event
          </motion.button>
        </div>

        {/* Month Navigation */}
        <div className="relative flex items-center justify-between">
          <motion.button 
            whileHover={{ scale: 1.1, x: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={prevMonth}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft size={18} />
          </motion.button>
          <motion.div 
            key={currentDate.getMonth()}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <span className="text-xl font-bold text-white">
              {monthNames[currentDate.getMonth()]}
            </span>
            <span className="text-xl font-light text-[#23D3EE] ml-2">
              {currentDate.getFullYear()}
            </span>
          </motion.div>
          <motion.button 
            whileHover={{ scale: 1.1, x: 2 }}
            whileTap={{ scale: 0.9 }}
            onClick={nextMonth}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRight size={18} />
          </motion.button>
        </div>
      </div>

      <div className="p-6">
        {/* Calendar Grid */}
        <div className="mb-6">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {days.map((day) => (
              <div key={day} className="text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {day}
                </span>
              </div>
            ))}
          </div>

          {/* Date Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDay }).map((_, index) => (
              <div key={`empty-${index}`} className="h-10" />
            ))}
            
            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const date = index + 1;
              const isToday = date === new Date().getDate() && 
                currentDate.getMonth() === new Date().getMonth() &&
                currentDate.getFullYear() === new Date().getFullYear();
              const isSelected = date === selectedDate;
              const hasMeeting = [15, 18, 22, 25].includes(date);
              
              return (
                <motion.button
                  key={date}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "h-10 w-full flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all relative",
                    isSelected 
                      ? "bg-[#23D3EE] text-white shadow-lg shadow-[#23D3EE]/30" 
                      : isToday
                        ? "bg-[#0F172A] text-white"
                        : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {date}
                  {hasMeeting && !isSelected && (
                    <div className="absolute bottom-1.5 flex gap-0.5">
                      <div className="w-1 h-1 rounded-full bg-[#23D3EE]" />
                      <div className="w-1 h-1 rounded-full bg-[#FBBF23]" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          <span className="text-xs font-medium text-slate-400">Today's Schedule</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        {/* Upcoming Meetings */}
        <div className="space-y-3">
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
                  className={cn(
                    "relative flex items-start gap-4 p-4 rounded-2xl transition-all cursor-pointer group",
                    "bg-slate-50 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50",
                    "border border-transparent hover:border-slate-200"
                  )}
                >
                  {/* Color Indicator */}
                  <div className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full transition-all",
                    getColorClasses(meeting.color, 'bg'),
                    hoveredMeeting === meeting.id ? "h-12" : "h-8"
                  )} />

                  {/* Avatar */}
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg flex-shrink-0 bg-gradient-to-br",
                      getColorClasses(meeting.color, 'gradient')
                    )}
                  >
                    {meeting.avatar}
                  </motion.div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-[#0F172A] group-hover:text-[#23D3EE] transition-colors">
                        {meeting.title}
                      </h4>
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <MoreHorizontal size={16} />
                      </motion.button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {/* Time */}
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="font-medium">{meeting.time}</span>
                        <span className="text-slate-300">-</span>
                        <span className="font-medium">{meeting.endTime}</span>
                      </div>

                      {/* Divider */}
                      <div className="w-1 h-1 rounded-full bg-slate-300" />

                      {/* Meeting Type */}
                      <div className={cn(
                        "flex items-center gap-1.5 px-2 py-0.5 rounded-full",
                        meeting.type === 'video' && "bg-[#23D3EE]/10 text-[#23D3EE]",
                        meeting.type === 'phone' && "bg-[#FBBF23]/10 text-[#FBBF23]",
                        meeting.type === 'in-person' && "bg-[#0F172A]/10 text-[#0F172A]"
                      )}>
                        <MeetingIcon size={12} />
                        <span className="font-medium capitalize">{meeting.type.replace('-', ' ')}</span>
                      </div>

                      {/* Divider */}
                      <div className="w-1 h-1 rounded-full bg-slate-300" />

                      {/* Lead */}
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <User className="h-3.5 w-3.5" />
                        <span>with</span>
                        <span className={cn("font-semibold", getColorClasses(meeting.color, 'text'))}>
                          {meeting.lead}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Join Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all flex-shrink-0",
                      "bg-[#23D3EE]/10 text-[#23D3EE] hover:bg-[#23D3EE] hover:text-white",
                      "opacity-0 group-hover:opacity-100"
                    )}
                  >
                    Join
                    <ArrowRight size={12} />
                  </motion.button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* View All Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 text-sm font-medium hover:border-[#23D3EE] hover:text-[#23D3EE] hover:bg-[#23D3EE]/5 transition-all flex items-center justify-center gap-2"
        >
          View All Meetings
          <ArrowRight size={14} />
        </motion.button>
      </div>
    </Card>
  );
}