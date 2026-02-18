import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Download,
  Calendar,
  Filter,
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
import {
  LeaveStats,
  LeaveRequestCard,
  LeaveRequestTable,
  LeaveBalanceCard,
  LeaveCalendar,
  AddLeaveRequestDialog,
  mockLeaveRequests,
  mockLeaveBalances,
  mockEmployees,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
} from '@/components/employees';

const LeaveRequestsPage: React.FC = () => {
  const [leaveRequests, setLeaveRequests] = useState(mockLeaveRequests);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<LeaveType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [activeTab, setActiveTab] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const thisMonthRequests = leaveRequests.filter((r) => {
      const appliedDate = new Date(r.appliedAt);
      return (
        appliedDate.getMonth() === thisMonth &&
        appliedDate.getFullYear() === thisYear
      );
    });

    return {
      pendingRequests: leaveRequests.filter((r) => r.status === 'pending').length,
      approvedThisMonth: thisMonthRequests.filter((r) => r.status === 'approved').length,
      rejectedThisMonth: thisMonthRequests.filter((r) => r.status === 'rejected').length,
      employeesOnLeave: leaveRequests.filter((r) => {
        if (r.status !== 'approved') return false;
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);
        return now >= start && now <= end;
      }).length,
    };
  }, [leaveRequests]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    let result = [...leaveRequests];

    // Tab filter
    switch (activeTab) {
      case 'pending':
        result = result.filter((r) => r.status === 'pending');
        break;
      case 'approved':
        result = result.filter((r) => r.status === 'approved');
        break;
      case 'rejected':
        result = result.filter((r) => r.status === 'rejected');
        break;
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((r) => r.leaveType === typeFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(query) ||
          r.reason.toLowerCase().includes(query)
      );
    }

    // Sort by applied date (most recent first)
    result.sort(
      (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
    );

    return result;
  }, [leaveRequests, activeTab, statusFilter, typeFilter, searchQuery]);

  const handleApprove = (request: LeaveRequest) => {
    setLeaveRequests(
      leaveRequests.map((r) =>
        r.id === request.id
          ? {
              ...r,
              status: 'approved' as LeaveStatus,
              approvedBy: 'Current User',
              approvedAt: new Date(),
            }
          : r
      )
    );
    toast.success(`Leave request for ${request.employeeName} has been approved`);
  };

  const handleReject = (request: LeaveRequest) => {
    setLeaveRequests(
      leaveRequests.map((r) =>
        r.id === request.id
          ? {
              ...r,
              status: 'rejected' as LeaveStatus,
              approvedBy: 'Current User',
              approvedAt: new Date(),
              rejectionReason: 'Request rejected by manager',
            }
          : r
      )
    );
    toast.error(`Leave request for ${request.employeeName} has been rejected`);
  };

  const handleViewDetails = (request: LeaveRequest) => {
    toast.info(`Viewing details for ${request.employeeName}'s request`);
  };

  const handleAddLeaveRequest = (data: any) => {
    const newRequest: LeaveRequest = {
      id: `leave-${Date.now()}`,
      employeeId: 'emp-1', // Current user
      employeeName: 'Current User',
      employeePosition: 'Software Developer',
      departmentName: 'Engineering',
      leaveType: data.leaveType,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      totalDays: Math.ceil(
        (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1,
      reason: data.reason,
      status: 'pending',
      appliedAt: new Date(),
    };

    setLeaveRequests([newRequest, ...leaveRequests]);
    toast.success('Leave request submitted successfully');
  };

  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'pending':
        return leaveRequests.filter((r) => r.status === 'pending').length;
      case 'approved':
        return leaveRequests.filter((r) => r.status === 'approved').length;
      case 'rejected':
        return leaveRequests.filter((r) => r.status === 'rejected').length;
      default:
        return leaveRequests.length;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Leave Requests</h1>
          <p className="text-gray-500 mt-1">
            Manage and approve employee leave requests
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="gap-2 bg-[#17C3B2] hover:bg-[#17C3B2]/90 text-white shadow-lg shadow-[#17C3B2]/20"
          >
            <Plus className="w-4 h-4" />
            Request Leave
          </Button>
        </div>
      </div>

      {/* Stats */}
      <LeaveStats
        pendingRequests={stats.pendingRequests}
        approvedThisMonth={stats.approvedThisMonth}
        rejectedThisMonth={stats.rejectedThisMonth}
        employeesOnLeave={stats.employeesOnLeave}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Leave Requests Section */}
        <div className="lg:col-span-3 space-y-6">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <TabsList className="bg-white border border-gray-200">
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

              {/* View Mode Toggle */}
              <div className="flex rounded-lg border border-gray-200 bg-white p-1">
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="icon"
                  className={`h-8 w-8 ${
                    viewMode === 'cards' ? 'bg-[#17C3B2] hover:bg-[#17C3B2]/90' : ''
                  }`}
                  onClick={() => setViewMode('cards')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="icon"
                  className={`h-8 w-8 ${
                    viewMode === 'table' ? 'bg-[#17C3B2] hover:bg-[#17C3B2]/90' : ''
                  }`}
                  onClick={() => setViewMode('table')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by employee or reason..."
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
                  <SelectItem value="maternity">Maternity Leave</SelectItem>
                  <SelectItem value="paternity">Paternity Leave</SelectItem>
                  <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Content */}
            <TabsContent value="all" className="mt-0">
              {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRequests.map((request, index) => (
                    <LeaveRequestCard
                      key={request.id}
                      request={request}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onViewDetails={handleViewDetails}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <LeaveRequestTable
                  requests={filteredRequests}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onViewDetails={handleViewDetails}
                />
              )}
            </TabsContent>

            <TabsContent value="pending" className="mt-0">
              {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRequests.map((request, index) => (
                    <LeaveRequestCard
                      key={request.id}
                      request={request}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onViewDetails={handleViewDetails}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <LeaveRequestTable
                  requests={filteredRequests}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onViewDetails={handleViewDetails}
                />
              )}
            </TabsContent>

            <TabsContent value="approved" className="mt-0">
              {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRequests.map((request, index) => (
                    <LeaveRequestCard
                      key={request.id}
                      request={request}
                      onViewDetails={handleViewDetails}
                      showActions={false}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <LeaveRequestTable
                  requests={filteredRequests}
                  onViewDetails={handleViewDetails}
                  showActions={false}
                />
              )}
            </TabsContent>

            <TabsContent value="rejected" className="mt-0">
              {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRequests.map((request, index) => (
                    <LeaveRequestCard
                      key={request.id}
                      request={request}
                      onViewDetails={handleViewDetails}
                      showActions={false}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <LeaveRequestTable
                  requests={filteredRequests}
                  onViewDetails={handleViewDetails}
                  showActions={false}
                />
              )}
            </TabsContent>
          </Tabs>

          {/* Empty State */}
          {filteredRequests.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No leave requests found
              </h3>
              <p className="text-gray-500">
                {searchQuery || typeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Leave requests will appear here'}
              </p>
            </div>
          )}

          {/* Leave Calendar */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Leave Calendar
            </h3>
            <LeaveCalendar
              leaveRequests={leaveRequests}
              onRequestClick={handleViewDetails}
            />
          </div>
        </div>

        {/* Sidebar - Leave Balance */}
        <div className="space-y-6">
          <LeaveBalanceCard balances={mockLeaveBalances} />

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
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
              >
                <Calendar className="w-4 h-4" />
                View Calendar
              </Button>
            </div>
          </motion.div>

          {/* Upcoming Leaves */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Upcoming Leaves
            </h3>
            <div className="space-y-3">
              {leaveRequests
                .filter(
                  (r) =>
                    r.status === 'approved' && new Date(r.startDate) > new Date()
                )
                .slice(0, 3)
                .map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {request.employeeName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(request.startDate).toLocaleDateString()} -{' '}
                        {new Date(request.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {request.totalDays}d
                    </Badge>
                  </div>
                ))}
              {leaveRequests.filter(
                (r) =>
                  r.status === 'approved' && new Date(r.startDate) > new Date()
              ).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No upcoming leaves
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Add Leave Request Dialog */}
      <AddLeaveRequestDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddLeaveRequest}
        leaveBalances={mockLeaveBalances}
      />
    </div>
  );
};

export default LeaveRequestsPage;