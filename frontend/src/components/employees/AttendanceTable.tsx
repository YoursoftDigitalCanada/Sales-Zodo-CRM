import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { 
  Clock, 
  MapPin, 
  Home, 
  Building2, 
  MoreHorizontal,
  Edit,
  FileText
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AttendanceRecord } from './types';
import {
  buildAttendanceDailyTotals,
  formatMinutesAsDuration,
  formatWorkHours,
  getAttendanceDayKey,
  getAttendanceStatusConfig,
  getInitials,
} from './utils';

interface AttendanceTableProps {
  records: AttendanceRecord[];
  onEdit?: (record: AttendanceRecord) => void;
  onViewDetails?: (record: AttendanceRecord) => void;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  records,
  onEdit,
  onViewDetails,
}) => {
  const dailyTotals = useMemo(() => buildAttendanceDailyTotals(records), [records]);

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-10 text-center">
        <h3 className="text-base font-semibold text-[#0F172A]">No attendance records found</h3>
        <p className="mt-2 text-sm text-[#475569]">
          Try a different employee or date filter to see attendance data from the database.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Employee</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Check In</TableHead>
            <TableHead>Check Out</TableHead>
            <TableHead>Work Hours</TableHead>
            <TableHead>Overtime</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => {
            const statusConfig = getAttendanceStatusConfig(record.status);
            const nameParts = record.employeeName.split(' ');
            const isLeaveRecord = record.status === 'on-leave';
            const locationLabel = isLeaveRecord
              ? record.location || 'On Leave'
              : record.location || (record.isRemote ? 'Remote' : 'Office');
            const dayTotals = dailyTotals.get(getAttendanceDayKey(record.employeeId, record.date));

            return (
              <TableRow key={record.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={record.employeeAvatar} />
                      <AvatarFallback className="bg-[#0891B2]/10 text-[#0891B2] text-sm">
                        {getInitials(nameParts[0], nameParts[1] || '')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-[#0F172A]">
                      {record.employeeName}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-[#475569]">
                  {format(record.date, 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  {record.checkIn ? (
                    <div className="flex items-center gap-1.5 text-[#0F172A]">
                      <Clock className="w-4 h-4 text-emerald-500" />
                      {format(record.checkIn, 'h:mm a')}
                    </div>
                  ) : (
                    <span className="text-[#94A3B8]">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {record.checkOut ? (
                    <div className="flex items-center gap-1.5 text-[#0F172A]">
                      <Clock className="w-4 h-4 text-red-500" />
                      {format(record.checkOut, 'h:mm a')}
                    </div>
                  ) : (
                    <span className="text-[#94A3B8]">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {record.workHours > 0 ? (
                    <div className="space-y-1">
                      <p className="font-medium text-[#0F172A]">
                        Session: {formatWorkHours(record.workHours)}
                      </p>
                      {dayTotals && (
                        <p className="text-xs text-[#64748B]">
                          Day total: {formatWorkHours(dayTotals.workHours)}
                        </p>
                      )}
                      <p className="text-xs text-[#64748B]">
                        Break: {formatMinutesAsDuration(record.breakMinutes || 0)}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-[#94A3B8]">—</span>
                      {!isLeaveRecord && (
                        <p className="text-xs text-[#64748B]">
                          Break: {formatMinutesAsDuration(record.breakMinutes || 0)}
                        </p>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {record.overtime > 0 ? (
                    <Badge className="bg-purple-100 text-purple-700 border-0">
                      +{formatWorkHours(record.overtime)}
                    </Badge>
                  ) : (
                    <span className="text-[#94A3B8]">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={`${statusConfig.color} border-0`}>
                    {statusConfig.icon} {statusConfig.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        {isLeaveRecord ? (
                          <div className="flex items-center gap-1.5 text-blue-600">
                            <FileText className="w-4 h-4" />
                            <span className="text-sm">{locationLabel}</span>
                          </div>
                        ) : record.isRemote ? (
                          <div className="flex items-center gap-1.5 text-blue-600">
                            <Home className="w-4 h-4" />
                            <span className="text-sm">Remote</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[#475569]">
                            <Building2 className="w-4 h-4" />
                            <span className="text-sm">Office</span>
                          </div>
                        )}
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <p>
                            {isLeaveRecord
                              ? 'Approved leave day'
                              : record.isRemote
                                ? 'Working from home'
                                : 'Working from office'}
                          </p>
                          {!isLeaveRecord && typeof record.clockInLat === 'number' && typeof record.clockInLng === 'number' && (
                            <div className="flex items-center gap-1 text-xs">
                              <MapPin className="h-3 w-3" />
                              <span>{record.clockInLat.toFixed(6)}, {record.clockInLng.toFixed(6)}</span>
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetails?.(record)}>
                        <FileText className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      {!isLeaveRecord && (
                        <DropdownMenuItem onClick={() => onEdit?.(record)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Record
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
