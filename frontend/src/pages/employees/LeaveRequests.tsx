import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { endOfDay, endOfMonth, startOfDay, startOfMonth } from 'date-fns';
import {
  Plus,
  Search,
  Download,
  Calendar,
  LayoutGrid,
  List,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  LeaveStats,
  LeaveRequestCard,
  LeaveRequestTable,
  LeaveBalanceCard,
  LeaveCalendar,
  AddLeaveRequestDialog,
  AttendanceRecord,
  LeaveBalance,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
} from '@/components/employees';
import { getStoredEmployee, isStoredEmployeeAdmin } from '@/features/auth/lib/auth-storage';
import {
  AttendanceEntity,
  LeaveRequestEntity,
  createLeaveRequest,
  getMyAttendanceRecords,
  getLeaveRequests,
  getMyLeaveRequests,
  reviewLeaveRequest,
} from '@/features/users';

const SUPPORTED_LEAVE_TYPES: LeaveType[] = ['annual', 'sick', 'personal', 'unpaid'];

const DEFAULT_LEAVE_TOTALS: Record<LeaveType, number> = {
  annual: 12,
  sick: 10,
  personal: 5,
  maternity: 0,
  paternity: 0,
  unpaid: 0,
  bereavement: 3,
};

type LeaveRequestFormValues = {
  leaveType: 'annual' | 'sick' | 'personal' | 'unpaid';
  startDate: string;
  endDate: string;
  reason: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    error
    && typeof error === 'object'
    && 'response' in error
  ) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const toLeaveRequest = (request: LeaveRequestEntity): LeaveRequest => ({
  id: request.id,
  employeeId: request.employeeId,
  employeeName: request.employeeName,
  employeeAvatar: request.employeeAvatar || undefined,
  employeePosition: request.employeePosition,
  departmentName: request.departmentName,
  leaveType: request.leaveType,
  startDate: new Date(request.startDate),
  endDate: new Date(request.endDate),
  totalDays: Number(request.totalDays || 0),
  reason: request.reason,
  status: request.status,
  appliedAt: new Date(request.appliedAt),
  approvedBy: request.approvedBy,
  approvedAt: request.approvedAt ? new Date(request.approvedAt) : undefined,
  rejectionReason: request.rejectionReason,
});

const toAttendanceRecord = (record: AttendanceEntity): AttendanceRecord => ({
  id: record.id,
  employeeId: record.employeeId,
  employeeName: record.employeeName,
  employeeAvatar: record.employeeAvatar || undefined,
  date: new Date(record.date),
  checkIn: record.checkIn ? new Date(record.checkIn) : undefined,
  checkOut: record.checkOut ? new Date(record.checkOut) : undefined,
  status: record.status,
  workHours: Number(record.workHours || 0),
  overtime: Number(record.overtime || 0),
  notes: record.notes || undefined,
  location: record.location,
  isRemote: record.isRemote,
  clockInLat: typeof record.clockInLat === 'number' ? record.clockInLat : null,
  clockInLng: typeof record.clockInLng === 'number' ? record.clockInLng : null,
  clockOutLat: typeof record.clockOutLat === 'number' ? record.clockOutLat : null,
  clockOutLng: typeof record.clockOutLng === 'number' ? record.clockOutLng : null,
});

const deriveLeaveBalances = (requests: LeaveRequest[]): LeaveBalance[] => (
  SUPPORTED_LEAVE_TYPES.map((type) => {
    const used = requests
      .filter((request) => request.leaveType === type && request.status === 'approved')
      .reduce((sum, request) => sum + request.totalDays, 0);
    const pending = requests
      .filter((request) => request.leaveType === type && request.status === 'pending')
      .reduce((sum, request) => sum + request.totalDays, 0);
    const total = DEFAULT_LEAVE_TOTALS[type];

    return {
      type,
      total,
      used,
      pending,
      available: Math.max(total - used - pending, 0),
    };
  })
);

const LeaveRequestsPage: React.FC = () => {
  const { isMobile } = useIsMobile();
  const storedEmployee = getStoredEmployee();
  const currentEmployeeId = typeof storedEmployee?.id === 'string' ? storedEmployee.id : undefined;
  const isAdminUser = isStoredEmployeeAdmin(storedEmployee);

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<LeaveType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [activeTab, setActiveTab] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarAttendance, setCalendarAttendance] = useState<AttendanceRecord[]>([]);
  const effectiveViewMode = isMobile ? 'cards' : viewMode;

  const refreshData = useCallback(async (showErrorToast = true) => {
    try {
      const data = isAdminUser
        ? await getLeaveRequests()
        : await getMyLeaveRequests();
      setLeaveRequests(data.map(toLeaveRequest));
    } catch (error) {
      console.error('Failed to load leave requests:', error);
      if (showErrorToast) {
        toast.error(getErrorMessage(error, 'Failed to load leave requests'));
      }
    }
  }, [isAdminUser]);

  const refreshCalendarAttendance = useCallback(async (month: Date, showErrorToast = true) => {
    if (isAdminUser || !currentEmployeeId) {
      setCalendarAttendance([]);
      return;
    }

    try {
      const data = await getMyAttendanceRecords({
        dateFrom: startOfDay(startOfMonth(month)).toISOString(),
        dateTo: endOfDay(endOfMonth(month)).toISOString(),
      });
      setCalendarAttendance(data.map(toAttendanceRecord));
    } catch (error) {
      console.error('Failed to load leave calendar attendance:', error);
      if (showErrorToast) {
        toast.error(getErrorMessage(error, 'Failed to load leave calendar attendance'));
      }
    }
  }, [currentEmployeeId, isAdminUser]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await refreshData(false);
      setIsLoading(false);
    };

    load();
  }, [refreshData]);

  useEffect(() => {
    refreshCalendarAttendance(calendarMonth, false);
  }, [calendarMonth, refreshCalendarAttendance]);

  const myLeaveRequests = useMemo(() => {
    if (!currentEmployeeId) {
      return [];
    }

    return leaveRequests.filter((request) => request.employeeId === currentEmployeeId);
  }, [currentEmployeeId, leaveRequests]);

  const leaveBalances = useMemo(
    () => deriveLeaveBalances(myLeaveRequests),
    [myLeaveRequests],
  );

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const thisMonthRequests = leaveRequests.filter((request) => (
      request.appliedAt.getMonth() === thisMonth
      && request.appliedAt.getFullYear() === thisYear
    ));

    return {
      pendingRequests: leaveRequests.filter((request) => request.status === 'pending').length,
      approvedThisMonth: thisMonthRequests.filter((request) => request.status === 'approved').length,
      rejectedThisMonth: thisMonthRequests.filter((request) => request.status === 'rejected').length,
      employeesOnLeave: leaveRequests.filter((request) => {
        if (request.status !== 'approved') {
          return false;
        }

        return now >= request.startDate && now <= request.endDate;
      }).length,
    };
  }, [leaveRequests]);

  const filteredRequests = useMemo(() => {
    let result = [...leaveRequests];

    switch (activeTab) {
      case 'pending':
        result = result.filter((request) => request.status === 'pending');
        break;
      case 'approved':
        result = result.filter((request) => request.status === 'approved');
        break;
      case 'rejected':
        result = result.filter((request) => request.status === 'rejected');
        break;
      default:
        break;
    }

    if (statusFilter !== 'all') {
      result = result.filter((request) => request.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter((request) => request.leaveType === typeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((request) => (
        request.employeeName.toLowerCase().includes(query)
        || request.reason.toLowerCase().includes(query)
        || request.departmentName.toLowerCase().includes(query)
      ));
    }

    result.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
    return result;
  }, [activeTab, leaveRequests, searchQuery, statusFilter, typeFilter]);

  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'pending':
        return leaveRequests.filter((request) => request.status === 'pending').length;
      case 'approved':
        return leaveRequests.filter((request) => request.status === 'approved').length;
      case 'rejected':
        return leaveRequests.filter((request) => request.status === 'rejected').length;
      default:
        return leaveRequests.length;
    }
  };

  const exportRequests = () => {
    const headers = ['Employee', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Total Days', 'Status', 'Reason'];
    const rows = filteredRequests.map((request) => [
      request.employeeName,
      request.departmentName,
      request.leaveType,
      request.startDate.toISOString().slice(0, 10),
      request.endDate.toISOString().slice(0, 10),
      String(request.totalDays),
      request.status,
      request.reason,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leave-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredRequests.length} leave request${filteredRequests.length === 1 ? '' : 's'}`);
  };

  const handleApprove = async (request: LeaveRequest) => {
    setIsActionLoading(true);
    try {
      await reviewLeaveRequest(request.id, { status: 'approved' });
      await refreshData(false);
      toast.success(`Leave request for ${request.employeeName} approved`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to approve leave request'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async (request: LeaveRequest) => {
    setIsActionLoading(true);
    try {
      await reviewLeaveRequest(request.id, {
        status: 'rejected',
        reviewNote: `Rejected by ${isAdminUser ? 'admin' : 'reviewer'}`,
      });
      await refreshData(false);
      toast.success(`Leave request for ${request.employeeName} rejected`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to reject leave request'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleViewDetails = (request: LeaveRequest) => {
    const dateRange = `${request.startDate.toLocaleDateString()} - ${request.endDate.toLocaleDateString()}`;
    toast.info(`${request.employeeName}: ${request.leaveType} leave, ${dateRange}`);
  };

  const handleAddLeaveRequest = async (data: LeaveRequestFormValues) => {
    try {
      await createLeaveRequest(data);
      await refreshData(false);
      toast.success('Leave request submitted successfully');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to submit leave request'));
      throw error;
    }
  };

  const upcomingLeaves = useMemo(() => (
    leaveRequests
      .filter((request) => request.status === 'approved' && request.startDate > new Date())
      .slice(0, 3)
  ), [leaveRequests]);

  return (
    <div className="min-h-screen space-y-6 bg-[#F8FAFC] p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Leave Requests</h1>
          <p className="text-[#475569] mt-1">
            {isAdminUser ? 'Manage and approve employee leave requests' : 'Apply for leave and track your approval status'}
          </p>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <Button variant="outline" className="gap-2" onClick={exportRequests} disabled={isLoading || filteredRequests.length === 0}>
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="gap-2 bg-[#0891B2] hover:bg-[#0891B2]/90 text-white "
          >
            <Plus className="w-4 h-4" />
            Request Leave
          </Button>
        </div>
      </div>

      <LeaveStats
        pendingRequests={stats.pendingRequests}
        approvedThisMonth={stats.approvedThisMonth}
        rejectedThisMonth={stats.rejectedThisMonth}
        employeesOnLeave={stats.employeesOnLeave}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <TabsList className="w-full justify-start overflow-x-auto bg-white sm:w-auto">
                <TabsTrigger value="all" className="gap-2">
                  All
                  <Badge variant="secondary" className="ml-1">
                    {getTabCount('all')}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Pending
                  <Badge className="ml-1 bg-amber-100 text-amber-700">
                    {getTabCount('pending')}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Approved
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-2">
                  <XCircle className="w-4 h-4" />
                  Rejected
                </TabsTrigger>
              </TabsList>

              <div className="hidden rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-1 sm:flex">
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="icon"
                  className={`h-8 w-8 ${
                    viewMode === 'cards' ? 'bg-[#0891B2] hover:bg-[#0891B2]/90' : ''
                  }`}
                  onClick={() => setViewMode('cards')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="icon"
                  className={`h-8 w-8 ${
                    viewMode === 'table' ? 'bg-[#0891B2] hover:bg-[#0891B2]/90' : ''
                  }`}
                  onClick={() => setViewMode('table')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                <Input
                  placeholder={isAdminUser ? 'Search by employee, department, or reason...' : 'Search your leave requests...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>

              <Select
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(value as LeaveType | 'all')}
              >
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder="Leave Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="annual">Annual Leave</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="personal">Personal Leave</SelectItem>
                  <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as LeaveStatus | 'all')}
              >
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0">
                {effectiveViewMode === 'cards' ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {filteredRequests.map((request, index) => (
                      <LeaveRequestCard
                        key={request.id}
                        request={request}
                        onApprove={isAdminUser ? handleApprove : undefined}
                        onReject={isAdminUser ? handleReject : undefined}
                        onViewDetails={handleViewDetails}
                        showActions={isAdminUser && request.status === 'pending' && !isActionLoading}
                        index={index}
                      />
                    ))}
                  </div>
                ) : (
                  <LeaveRequestTable
                    requests={filteredRequests}
                    onApprove={isAdminUser ? handleApprove : undefined}
                    onReject={isAdminUser ? handleReject : undefined}
                    onViewDetails={handleViewDetails}
                    showActions={isAdminUser && !isActionLoading}
                  />
                )}
              </TabsContent>
            ))}
          </Tabs>

          {!isLoading && filteredRequests.length === 0 && (
            <div className="text-center py-12 bg-white rounded-md border border-[rgba(15,23,42,0.06)]">
              <div className="w-16 h-16 bg-[#F8FAFC] rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-[#94A3B8]" />
              </div>
              <h3 className="text-lg font-medium text-[#0F172A] mb-1">
                No leave requests found
              </h3>
              <p className="text-[#475569]">
                {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : isAdminUser
                    ? 'Employee leave requests will appear here'
                    : 'Your leave requests will appear here'}
              </p>
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-[#0F172A] mb-4">
              Leave Calendar
            </h3>
            <LeaveCalendar
              leaveRequests={leaveRequests}
              attendanceRecords={calendarAttendance}
              showAbsences={!isAdminUser}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              onRequestClick={handleViewDetails}
            />
          </div>
        </div>

        <div className="space-y-6">
          <LeaveBalanceCard balances={leaveBalances} />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-6"
          >
            <h3 className="text-lg font-semibold text-[#0F172A] mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Request Time Off
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setActiveTab('pending')}
              >
                <Clock className="w-4 h-4" />
                View Pending ({stats.pendingRequests})
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setActiveTab('approved')}
              >
                <Calendar className="w-4 h-4" />
                View Approved
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-6"
          >
            <h3 className="text-lg font-semibold text-[#0F172A] mb-4">
              Upcoming Leaves
            </h3>
            <div className="space-y-3">
              {upcomingLeaves.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-md"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] truncate">
                      {request.employeeName}
                    </p>
                    <p className="text-xs text-[#475569]">
                      {request.startDate.toLocaleDateString()} - {request.endDate.toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {request.totalDays}d
                  </Badge>
                </div>
              ))}
              {upcomingLeaves.length === 0 && (
                <p className="text-sm text-[#475569] text-center py-4">
                  No upcoming leaves
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <AddLeaveRequestDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddLeaveRequest}
        leaveBalances={leaveBalances}
      />

      {isMobile && (
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          size="icon"
          className="mobile-create-fab fixed bottom-24 right-4 z-30 h-14 w-14 rounded-full bg-[#0891B2] text-white shadow-lg hover:bg-[#0891B2]/90 sm:hidden"
          aria-label="Request Leave"
        >
          <Plus className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};

export default LeaveRequestsPage;
