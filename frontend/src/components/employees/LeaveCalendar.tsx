import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  isWithinInterval,
  isWeekend,
  startOfDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { AttendanceRecord, LeaveRequest } from './types';
import { getLeaveTypeConfig, getLeaveStatusConfig, getInitials } from './utils';

interface LeaveCalendarProps {
  leaveRequests: LeaveRequest[];
  attendanceRecords?: AttendanceRecord[];
  showAbsences?: boolean;
  month?: Date;
  onMonthChange?: (month: Date) => void;
  onDateClick?: (date: Date, requests: LeaveRequest[]) => void;
  onRequestClick?: (request: LeaveRequest) => void;
}

export const LeaveCalendar: React.FC<LeaveCalendarProps> = ({
  leaveRequests,
  attendanceRecords = [],
  showAbsences = false,
  month,
  onMonthChange,
  onDateClick,
  onRequestClick,
}) => {
  const [internalMonth, setInternalMonth] = useState(new Date());
  const currentMonth = month || internalMonth;

  const setCurrentMonth = (value: Date) => {
    if (!month) {
      setInternalMonth(value);
    }
    onMonthChange?.(value);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = startOfDay(new Date());

  const getRequestsForDate = (date: Date): LeaveRequest[] => {
    return leaveRequests.filter((request) => {
      if (request.status !== 'approved') {
        return false;
      }
      return isWithinInterval(date, {
        start: new Date(request.startDate),
        end: new Date(request.endDate),
      });
    });
  };

  const getAttendanceForDate = (date: Date): AttendanceRecord[] => (
    attendanceRecords.filter((record) => isSameDay(new Date(record.date), date))
  );

  const getColorForLeaveType = (leaveType: string): string => {
    const colors: Record<string, string> = {
      annual: '#22D3EE',
      sick: '#EF4444',
      personal: '#8B5CF6',
      maternity: '#EC4899',
      paternity: '#3B82F6',
      unpaid: '#6B7280',
      bereavement: '#475569',
    };
    return colors[leaveType] || '#22D3EE';
  };

  const getDayState = (date: Date) => {
    const requests = getRequestsForDate(date);
    const dailyAttendance = getAttendanceForDate(date);
    const hasLeave = requests.length > 0 || dailyAttendance.some((record) => record.status === 'on-leave');
    const hasExplicitAbsent = dailyAttendance.some((record) => record.status === 'absent');
    const hasWorked = dailyAttendance.some((record) => ['present', 'late', 'half-day'].includes(record.status));
    const isPastWorkday = !isWeekend(date) && date.getTime() < today.getTime();
    const isAbsent = showAbsences && !hasLeave && (hasExplicitAbsent || (isPastWorkday && !hasWorked));

    if (hasLeave) {
      return {
        status: 'leave' as const,
        requests,
        label: 'Leave',
      };
    }

    if (isAbsent) {
      return {
        status: 'absent' as const,
        requests,
        label: 'Absent',
      };
    }

    return {
      status: null,
      requests,
      label: null,
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[#0F172A]">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-[#475569] py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const dayState = getDayState(day);
          const requests = dayState.requests;
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);
          const hasLeave = dayState.status === 'leave';
          const isAbsent = dayState.status === 'absent';
          const isMarkedDay = hasLeave || isAbsent;

          return (
            <Popover key={index}>
              <PopoverTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onDateClick?.(day, requests)}
                  className={`
                    relative min-h-[80px] p-2 rounded-md text-left transition-colors
                    ${!isCurrentMonth ? 'bg-slate-50 text-gray-300' : 'hover:bg-slate-50'}
                    ${isCurrentDay ? 'ring-2 ring-[#22D3EE] ring-offset-1' : ''}
                    ${isMarkedDay && isCurrentMonth ? 'bg-slate-50' : ''}
                  `}
                >
                  <span
                    className={`
                      text-sm font-medium
                      ${isCurrentDay ? 'text-[#0891B2] font-bold' : ''}
                      ${!isCurrentMonth ? 'text-gray-300' : 'text-[#0F172A]'}
                    `}
                  >
                    {format(day, 'd')}
                  </span>

                  {isMarkedDay && isCurrentMonth && (
                    <div className="mt-1 space-y-1">
                      <div
                        className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${
                          hasLeave
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="truncate">{dayState.label}</span>
                      </div>
                      {hasLeave && requests.length > 1 && (
                        <div className="text-[11px] text-[#64748B] pl-1">
                          +{requests.length - 1} more
                        </div>
                      )}
                    </div>
                  )}
                </motion.button>
              </PopoverTrigger>

              {isMarkedDay && isCurrentMonth && (
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="p-4 border-b border-[rgba(15,23,42,0.06)]">
                    <h4 className="font-semibold text-[#0F172A]">
                      {format(day, 'EEEE, MMMM d, yyyy')}
                    </h4>
                    {hasLeave ? (
                      <p className="text-sm text-[#475569]">
                        {requests.length > 0
                          ? `${requests.length} employee${requests.length !== 1 ? 's' : ''} on leave`
                          : 'Approved leave'}
                      </p>
                    ) : (
                      <p className="text-sm text-[#475569]">
                        No approved leave or attendance was found for this working day, so it is marked absent.
                      </p>
                    )}
                  </div>
                  {hasLeave ? (
                    <div className="max-h-64 overflow-y-auto">
                      {requests.map((request) => {
                        const leaveConfig = getLeaveTypeConfig(request.leaveType);
                        const statusConfig = getLeaveStatusConfig(request.status);
                        const nameParts = request.employeeName.split(' ');

                        return (
                          <div
                            key={request.id}
                            className="p-3 hover:bg-white/5 cursor-pointer border-b border-gray-50 last:border-0"
                            onClick={() => onRequestClick?.(request)}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={request.employeeAvatar} />
                                <AvatarFallback
                                  style={{
                                    backgroundColor: `${getColorForLeaveType(request.leaveType)}20`,
                                    color: getColorForLeaveType(request.leaveType),
                                  }}
                                >
                                  {getInitials(nameParts[0], nameParts[1] || '')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[#0F172A] truncate">
                                  {request.employeeName}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge
                                    className={`${leaveConfig.color} border-0 text-xs`}
                                  >
                                    {leaveConfig.icon} {leaveConfig.label}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`${statusConfig.color} text-xs`}
                                  >
                                    {statusConfig.label}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-[#475569]">
                              {format(new Date(request.startDate), 'MMM d')} -{' '}
                              {format(new Date(request.endDate), 'MMM d')} ({request.totalDays} days)
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4">
                      <Badge className="bg-slate-200 text-slate-700 border-0">Absent</Badge>
                    </div>
                  )}
                </PopoverContent>
              )}
            </Popover>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-[rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-sm text-[#475569]">Leave</span>
        </div>
        {showAbsences && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-500" />
            <span className="text-sm text-[#475569]">Absent</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
