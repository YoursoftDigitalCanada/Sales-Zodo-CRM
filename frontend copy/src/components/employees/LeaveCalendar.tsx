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
} from 'date-fns';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { LeaveRequest } from './types';
import { getLeaveTypeConfig, getLeaveStatusConfig, getInitials } from './utils';

interface LeaveCalendarProps {
  leaveRequests: LeaveRequest[];
  onDateClick?: (date: Date, requests: LeaveRequest[]) => void;
  onRequestClick?: (request: LeaveRequest) => void;
}

export const LeaveCalendar: React.FC<LeaveCalendarProps> = ({
  leaveRequests,
  onDateClick,
  onRequestClick,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getRequestsForDate = (date: Date): LeaveRequest[] => {
    return leaveRequests.filter((request) => {
      if (request.status === 'rejected' || request.status === 'cancelled') {
        return false;
      }
      return isWithinInterval(date, {
        start: new Date(request.startDate),
        end: new Date(request.endDate),
      });
    });
  };

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
          const requests = getRequestsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);
          const hasRequests = requests.length > 0;

          return (
            <Popover key={index}>
              <PopoverTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onDateClick?.(day, requests)}
                  className={`
                    relative min-h-[80px] p-2 rounded-md text-left transition-colors
                    ${!isCurrentMonth ? 'bg-white/5 text-gray-300' : 'hover:bg-white/5'}
                    ${isCurrentDay ? 'ring-2 ring-[#22D3EE] ring-offset-1' : ''}
                    ${hasRequests && isCurrentMonth ? 'bg-white/5' : ''}
                  `}
                >
                  <span
                    className={`
                      text-sm font-medium
                      ${isCurrentDay ? 'text-[#0891B2] font-bold' : ''}
                      ${!isCurrentMonth ? 'text-gray-300' : 'text-slate-200'}
                    `}
                  >
                    {format(day, 'd')}
                  </span>

                  {/* Leave indicators */}
                  {hasRequests && isCurrentMonth && (
                    <div className="mt-1 space-y-1">
                      {requests.slice(0, 2).map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center gap-1 text-xs truncate"
                          style={{
                            backgroundColor: `${getColorForLeaveType(request.leaveType)}20`,
                            color: getColorForLeaveType(request.leaveType),
                            padding: '2px 4px',
                            borderRadius: '4px',
                            borderLeft: `2px solid ${getColorForLeaveType(request.leaveType)}`,
                          }}
                        >
                          <span className="truncate">
                            {request.employeeName.split(' ')[0]}
                          </span>
                        </div>
                      ))}
                      {requests.length > 2 && (
                        <div className="text-xs text-[#475569] pl-1">
                          +{requests.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </motion.button>
              </PopoverTrigger>

              {hasRequests && isCurrentMonth && (
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="p-4 border-b border-[rgba(15,23,42,0.06)]">
                    <h4 className="font-semibold text-[#0F172A]">
                      {format(day, 'EEEE, MMMM d, yyyy')}
                    </h4>
                    <p className="text-sm text-[#475569]">
                      {requests.length} employee{requests.length !== 1 ? 's' : ''} on leave
                    </p>
                  </div>
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
                </PopoverContent>
              )}
            </Popover>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-[rgba(15,23,42,0.06)]">
        {['annual', 'sick', 'personal', 'maternity', 'paternity'].map((type) => {
          const config = getLeaveTypeConfig(type as any);
          return (
            <div key={type} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getColorForLeaveType(type) }}
              />
              <span className="text-sm text-[#475569]">{config.label}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};