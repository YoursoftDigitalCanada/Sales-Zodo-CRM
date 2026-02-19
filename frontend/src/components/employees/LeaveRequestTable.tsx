import React from 'react';
import { format } from 'date-fns';
import {
  MoreHorizontal,
  Eye,
  Check,
  X,
  Clock,
  Calendar,
  FileText,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LeaveRequest } from './types';
import { getLeaveTypeConfig, getLeaveStatusConfig, getInitials } from './utils';

interface LeaveRequestTableProps {
  requests: LeaveRequest[];
  selectedIds?: string[];
  onSelectAll?: (selected: boolean) => void;
  onSelectOne?: (id: string, selected: boolean) => void;
  onApprove?: (request: LeaveRequest) => void;
  onReject?: (request: LeaveRequest) => void;
  onViewDetails?: (request: LeaveRequest) => void;
  showSelection?: boolean;
  showActions?: boolean;
}

export const LeaveRequestTable: React.FC<LeaveRequestTableProps> = ({
  requests,
  selectedIds = [],
  onSelectAll,
  onSelectOne,
  onApprove,
  onReject,
  onViewDetails,
  showSelection = false,
  showActions = true,
}) => {
  const allSelected = requests.length > 0 && selectedIds.length === requests.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < requests.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50">
            {showSelection && (
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
            )}
            <TableHead>Employee</TableHead>
            <TableHead>Leave Type</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Applied On</TableHead>
            <TableHead>Status</TableHead>
            {showActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => {
            const leaveConfig = getLeaveTypeConfig(request.leaveType);
            const statusConfig = getLeaveStatusConfig(request.status);
            const nameParts = request.employeeName.split(' ');
            const isSelected = selectedIds.includes(request.id);
            const isPending = request.status === 'pending';

            return (
              <TableRow
                key={request.id}
                className={isSelected ? 'bg-[#23D3EE]/5' : ''}
              >
                {showSelection && (
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        onSelectOne?.(request.id, checked as boolean)
                      }
                      aria-label={`Select ${request.employeeName}`}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={request.employeeAvatar} />
                      <AvatarFallback className="bg-[#23D3EE]/10 text-[#23D3EE]">
                        {getInitials(nameParts[0], nameParts[1] || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">
                        {request.employeeName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {request.employeePosition}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={`${leaveConfig.color} border-0`}>
                    {leaveConfig.icon} {leaveConfig.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>
                      {format(new Date(request.startDate), 'MMM d')} -{' '}
                      {format(new Date(request.endDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-semibold text-gray-900">
                    {request.totalDays} day{request.totalDays !== 1 ? 's' : ''}
                  </span>
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-sm text-gray-600 truncate max-w-[200px] cursor-help">
                          {request.reason}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>{request.reason}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{format(new Date(request.appliedAt), 'MMM d, yyyy')}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={`${statusConfig.color} border-0`}>
                    {statusConfig.label}
                  </Badge>
                  {request.approvedBy && (
                    <p className="text-xs text-gray-400 mt-1">
                      by {request.approvedBy}
                    </p>
                  )}
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isPending && (
                        <>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => onApprove?.(request)}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Approve</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => onReject?.(request)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Reject</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewDetails?.(request)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {request.attachments && request.attachments.length > 0 && (
                            <DropdownMenuItem>
                              <FileText className="mr-2 h-4 w-4" />
                              View Attachments
                            </DropdownMenuItem>
                          )}
                          {isPending && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onApprove?.(request)}
                                className="text-emerald-600"
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onReject?.(request)}
                                className="text-red-600"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}

          {requests.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={showSelection ? 9 : 8}
                className="text-center py-12"
              >
                <div className="flex flex-col items-center">
                  <Calendar className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">No leave requests found</p>
                  <p className="text-gray-400 text-sm">
                    Leave requests will appear here
                  </p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};