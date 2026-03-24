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
  isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AttendanceRecord, AttendanceStatus } from './types';
import { getAttendanceStatusConfig } from './utils';

interface AttendanceCalendarProps {
  records: AttendanceRecord[];
  employeeId?: string;
  onDateClick?: (date: Date, record?: AttendanceRecord) => void;
  month?: Date;
  onMonthChange?: (month: Date) => void;
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  records,
  employeeId,
  onDateClick,
  month,
  onMonthChange,
}) => {
  const [internalMonth, setInternalMonth] = useState(new Date());
  const currentMonth = month || internalMonth;

  const filteredRecords = employeeId 
    ? records.filter(r => r.employeeId === employeeId)
    : records;

  const setCurrentMonth = (value: Date) => {
    if (!month) {
      setInternalMonth(value);
    }
    onMonthChange?.(value);
  };

  const getRecordsForDate = (date: Date): AttendanceRecord[] => {
    return filteredRecords.filter(r => isSameDay(new Date(r.date), date));
  };

  const getRecordForDate = (date: Date): AttendanceRecord | undefined => {
    const dayRecords = getRecordsForDate(date);
    if (dayRecords.length === 0) {
      return undefined;
    }

    if (employeeId || dayRecords.length === 1) {
      return dayRecords[0];
    }

    const priority: AttendanceStatus[] = ['late', 'half-day', 'present', 'absent', 'holiday', 'weekend'];
    return [...dayRecords].sort(
      (a, b) => priority.indexOf(a.status) - priority.indexOf(b.status),
    )[0];
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getStatusColor = (status: AttendanceStatus): string => {
    const colors = {
      present: 'bg-emerald-500',
      absent: 'bg-red-500',
      late: 'bg-amber-500',
      'half-day': 'bg-orange-500',
      holiday: 'bg-blue-500',
      weekend: 'bg-gray-300',
    };
    return colors[status];
  };

  return (
    <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-6">
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
          const record = getRecordForDate(day);
          const dayRecords = getRecordsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);

          return (
            <TooltipProvider key={index}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onDateClick?.(day, record)}
                    className={`
                      relative aspect-square p-1 rounded-md text-sm
                      ${!isCurrentMonth ? 'text-gray-300' : 'text-[#0F172A]'}
                      ${isCurrentDay ? 'ring-2 ring-[#22D3EE] ring-offset-2' : ''}
                      hover:bg-slate-50 transition-colors
                    `}
                  >
                    <span className={`${isCurrentDay ? 'font-bold text-[#0891B2]' : ''}`}>
                      {format(day, 'd')}
                    </span>
                    
                    {record && isCurrentMonth && (
                      <span
                        className={`
                          absolute bottom-1 left-1/2 -translate-x-1/2
                          w-2 h-2 rounded-full ${getStatusColor(record.status)}
                        `}
                      />
                    )}
                  </motion.button>
                </TooltipTrigger>
                {record && isCurrentMonth && (
                  <TooltipContent>
                    <div className="text-sm">
                      {employeeId || dayRecords.length === 1 ? (
                        <>
                          <p className="font-medium">{getAttendanceStatusConfig(record.status).label}</p>
                          {record.checkIn && (
                            <p className="text-[#94A3B8]">
                              In: {format(record.checkIn, 'h:mm a')}
                            </p>
                          )}
                          {record.checkOut && (
                            <p className="text-[#94A3B8]">
                              Out: {format(record.checkOut, 'h:mm a')}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="font-medium">{dayRecords.length} attendance records</p>
                          <p className="text-[#94A3B8]">
                            Present: {dayRecords.filter((item) => item.status === 'present').length}
                          </p>
                          <p className="text-[#94A3B8]">
                            Late: {dayRecords.filter((item) => item.status === 'late').length}
                          </p>
                          <p className="text-[#94A3B8]">
                            Half Day: {dayRecords.filter((item) => item.status === 'half-day').length}
                          </p>
                        </>
                      )}
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-[rgba(15,23,42,0.06)]">
        {(['present', 'absent', 'late', 'half-day', 'holiday'] as AttendanceStatus[]).map((status) => {
          const config = getAttendanceStatusConfig(status);
          return (
            <div key={status} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
              <span className="text-sm text-[#475569]">{config.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
