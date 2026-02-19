import React from 'react';
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
import { getAttendanceStatusConfig, getInitials, formatWorkHours } from './utils';

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
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50">
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

            return (
              <TableRow key={record.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={record.employeeAvatar} />
                      <AvatarFallback className="bg-[#23D3EE]/10 text-[#23D3EE] text-sm">
                        {getInitials(nameParts[0], nameParts[1] || '')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-gray-900">
                      {record.employeeName}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-gray-600">
                  {format(record.date, 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  {record.checkIn ? (
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <Clock className="w-4 h-4 text-emerald-500" />
                      {format(record.checkIn, 'h:mm a')}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {record.checkOut ? (
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <Clock className="w-4 h-4 text-red-500" />
                      {format(record.checkOut, 'h:mm a')}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {record.workHours > 0 ? (
                    <span className="font-medium text-gray-900">
                      {formatWorkHours(record.workHours)}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {record.overtime > 0 ? (
                    <Badge className="bg-purple-100 text-purple-700 border-0">
                      +{formatWorkHours(record.overtime)}
                    </Badge>
                  ) : (
                    <span className="text-gray-400">—</span>
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
                        {record.isRemote ? (
                          <div className="flex items-center gap-1.5 text-blue-600">
                            <Home className="w-4 h-4" />
                            <span className="text-sm">Remote</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Building2 className="w-4 h-4" />
                            <span className="text-sm">Office</span>
                          </div>
                        )}
                      </TooltipTrigger>
                      <TooltipContent>
                        {record.isRemote ? 'Working from home' : 'Working from office'}
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
                      <DropdownMenuItem onClick={() => onEdit?.(record)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Record
                      </DropdownMenuItem>
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