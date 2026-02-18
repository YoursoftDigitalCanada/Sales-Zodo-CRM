import React from 'react';
import { motion } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  MoreVertical, 
  Check, 
  X, 
  FileText,
  MessageSquare
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LeaveRequest } from './types';
import { getLeaveTypeConfig, getLeaveStatusConfig, getInitials } from './utils';

interface LeaveRequestCardProps {
  request: LeaveRequest;
  onApprove?: (request: LeaveRequest) => void;
  onReject?: (request: LeaveRequest) => void;
  onViewDetails?: (request: LeaveRequest) => void;
  showActions?: boolean;
  index?: number;
}

export const LeaveRequestCard: React.FC<LeaveRequestCardProps> = ({
  request,
  onApprove,
  onReject,
  onViewDetails,
  showActions = true,
  index = 0,
}) => {
  const leaveTypeConfig = getLeaveTypeConfig(request.leaveType);
  const statusConfig = getLeaveStatusConfig(request.status);
  const nameParts = request.employeeName.split(' ');

  const isPending = request.status === 'pending';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={request.employeeAvatar} />
              <AvatarFallback className="bg-[#17C3B2]/10 text-[#17C3B2]">
                {getInitials(nameParts[0], nameParts[1] || '')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-semibold text-gray-900">{request.employeeName}</h4>
              <p className="text-sm text-gray-500">{request.employeePosition}</p>
              <p className="text-xs text-gray-400">{request.departmentName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={`${statusConfig.color} border-0`}>
              {statusConfig.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewDetails?.(request)}>
                  <FileText className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                {isPending && showActions && (
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
        </div>

        {/* Leave Type */}
        <div className="mb-4">
          <Badge className={`${leaveTypeConfig.color} border-0 text-sm`}>
            {leaveTypeConfig.icon} {leaveTypeConfig.label}
          </Badge>
        </div>

        {/* Date Range */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">From</p>
              <p className="font-semibold text-gray-900">
                {format(request.startDate, 'MMM d')}
              </p>
              <p className="text-xs text-gray-400">
                {format(request.startDate, 'yyyy')}
              </p>
            </div>
            <div className="flex-1 px-4">
              <div className="border-t-2 border-dashed border-gray-300 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-50 px-2">
                  <span className="text-sm font-medium text-[#17C3B2]">
                    {request.totalDays} day{request.totalDays !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">To</p>
              <p className="font-semibold text-gray-900">
                {format(request.endDate, 'MMM d')}
              </p>
              <p className="text-xs text-gray-400">
                {format(request.endDate, 'yyyy')}
              </p>
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 line-clamp-2">
            <span className="font-medium text-gray-700">Reason: </span>
            {request.reason}
          </p>
        </div>

        {/* Rejection Reason */}
        {request.status === 'rejected' && request.rejectionReason && (
          <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-100">
            <p className="text-sm text-red-700">
              <span className="font-medium">Rejection reason: </span>
              {request.rejectionReason}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Applied {format(request.appliedAt, 'MMM d, yyyy')}</span>
          </div>
          
          {request.approvedBy && (
            <div className="text-xs text-gray-500">
              {request.status === 'approved' ? 'Approved' : 'Reviewed'} by {request.approvedBy}
            </div>
          )}
        </div>

        {/* Quick Actions for Pending */}
        {isPending && showActions && (
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => onReject?.(request)}
            >
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
            <Button
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={() => onApprove?.(request)}
            >
              <Check className="w-4 h-4 mr-1" />
              Approve
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};