import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  Search,
  Download,
  Calendar as CalendarIcon,
  Filter,
  Clock,
  Users,
  BarChart3,
  Table as TableIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  AttendanceStatsCards,
  AttendanceSummaryCard,
  AttendanceTable,
  AttendanceCalendar,
  CheckInOutCard,
  mockAttendanceRecords,
  mockEmployees,
} from '@/components/employees';

const AttendancePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [dateRange, setDateRange] = useState('today');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Check-in state (for demo)
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | undefined>();
  const [isOnBreak, setIsOnBreak] = useState(false);

  const exportRecords = () => {
    const headers = ['Employee', 'Date', 'Check In', 'Check Out', 'Work Hours', 'Overtime', 'Status', 'Location', 'Notes'];
    const rows = filteredRecords.map((record) => [
      record.employeeName,
      format(record.date, 'yyyy-MM-dd'),
      record.checkIn ? format(record.checkIn, 'HH:mm') : '',
      record.checkOut ? format(record.checkOut, 'HH:mm') : '',
      record.workHours.toFixed(1),
      record.overtime.toFixed(1),
      record.status,
      record.location || (record.isRemote ? 'Remote' : 'Office'),
      record.notes || '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredRecords.length} attendance record${filteredRecords.length === 1 ? '' : 's'}`);
  };
  
  // Filter records based on date range
  const filteredRecords = useMemo(() => {
    let records = [...mockAttendanceRecords];
    const today = new Date();

    // Filter by date range
    switch (dateRange) {
      case 'today': {
        records = records.filter(
          (r) => format(r.date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
        );
        break;
      }
      case 'yesterday': {
        records = records.filter(
          (r) => format(r.date, 'yyyy-MM-dd') === format(subDays(today, 1), 'yyyy-MM-dd')
        );
        break;
      }
      case 'week': {
        const weekAgo = subDays(today, 7);
        records = records.filter((r) => r.date >= weekAgo);
        break;
      }
      case 'month': {
        const monthStart = startOfMonth(today);
        records = records.filter((r) => r.date >= monthStart);
        break;
      }
      default:
        break;
    }

    // Filter by employee
    if (selectedEmployee !== 'all') {
      records = records.filter((r) => r.employeeId === selectedEmployee);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      records = records.filter((r) =>
        r.employeeName.toLowerCase().includes(query)
      );
    }

    // Sort by date (most recent first)
    records.sort((a, b) => b.date.getTime() - a.date.getTime());

    return records;
  }, [dateRange, selectedEmployee, searchQuery]);

  // Calculate stats for today
  const todayStats = useMemo(() => {
    const today = new Date();
    const todayRecords = mockAttendanceRecords.filter(
      (r) => format(r.date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
    );

    const checkedInToday = todayRecords.filter((r) => r.checkIn);
    const averageCheckInMinutes = checkedInToday.length > 0
      ? checkedInToday.reduce((sum, record) => (
        sum + (record.checkIn?.getHours() || 0) * 60 + (record.checkIn?.getMinutes() || 0)
      ), 0) / checkedInToday.length
      : null;
    const averageCheckIn = averageCheckInMinutes === null
      ? undefined
      : `${String(Math.floor(averageCheckInMinutes / 60)).padStart(2, '0')}:${String(Math.round(averageCheckInMinutes % 60)).padStart(2, '0')}`;

    return {
      presentToday: todayRecords.filter((r) => r.status === 'present').length,
      absentToday: todayRecords.filter((r) => r.status === 'absent').length,
      lateToday: todayRecords.filter((r) => r.status === 'late').length,
      onLeaveToday: todayRecords.filter((r) => r.status === 'half-day').length,
      totalEmployees: mockEmployees.length,
      averageCheckIn,
      averageWorkHours: todayRecords.length > 0
        ? todayRecords.reduce((sum, record) => sum + record.workHours, 0) / todayRecords.length
        : 0,
      overtimeHours: todayRecords.reduce((sum, record) => sum + record.overtime, 0),
    };
  }, []);

  // Calculate monthly summary
  const monthlySummary = useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthRecords = mockAttendanceRecords.filter(
      (r) => r.date >= monthStart && r.status !== 'weekend' && r.status !== 'holiday'
    );

    const presentDays = monthRecords.filter((r) => r.status === 'present').length;
    const absentDays = monthRecords.filter((r) => r.status === 'absent').length;
    const lateDays = monthRecords.filter((r) => r.status === 'late').length;
    const halfDays = monthRecords.filter((r) => r.status === 'half-day').length;
    const totalWorkHours = monthRecords.reduce((sum, r) => sum + r.workHours, 0);
    const totalOvertime = monthRecords.reduce((sum, r) => sum + r.overtime, 0);

    return {
      totalWorkingDays: presentDays + absentDays + lateDays + halfDays,
      presentDays,
      absentDays,
      lateDays,
      halfDays,
      averageWorkHours: presentDays > 0 ? totalWorkHours / presentDays : 0,
      totalOvertime,
    };
  }, []);

  const handleCheckIn = (isRemote: boolean) => {
    setIsCheckedIn(true);
    setCheckInTime(new Date());
    toast.success(`Checked in successfully ${isRemote ? '(Remote)' : '(Office)'}`);
  };

  const handleCheckOut = () => {
    setIsCheckedIn(false);
    setCheckInTime(undefined);
    setIsOnBreak(false);
    toast.success('Checked out successfully');
  };

  const handleBreakStart = () => {
    setIsOnBreak(true);
    toast.info('Break started');
  };

  const handleBreakEnd = () => {
    setIsOnBreak(false);
    toast.info('Break ended');
  };

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Attendance</h1>
          <p className="text-[#475569] mt-1">
            Track and manage employee attendance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={exportRecords}>
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <AttendanceStatsCards
        presentToday={todayStats.presentToday}
        absentToday={todayStats.absentToday}
        lateToday={todayStats.lateToday}
        onLeaveToday={todayStats.onLeaveToday}
        totalEmployees={todayStats.totalEmployees}
        averageCheckIn={todayStats.averageCheckIn}
        averageWorkHours={todayStats.averageWorkHours}
        overtimeHours={todayStats.overtimeHours}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="records" className="gap-2">
            <TableIcon className="w-4 h-4" />
            Records
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarIcon className="w-4 h-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="my-attendance" className="gap-2">
            <Clock className="w-4 h-4" />
            My Attendance
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Check In/Out Card */}
            <CheckInOutCard
              isCheckedIn={isCheckedIn}
              checkInTime={checkInTime}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onBreakStart={handleBreakStart}
              onBreakEnd={handleBreakEnd}
              isOnBreak={isOnBreak}
            />

            {/* Monthly Summary */}
            <div className="lg:col-span-2">
              <AttendanceSummaryCard
                totalWorkingDays={monthlySummary.totalWorkingDays}
                presentDays={monthlySummary.presentDays}
                absentDays={monthlySummary.absentDays}
                lateDays={monthlySummary.lateDays}
                halfDays={monthlySummary.halfDays}
                averageWorkHours={monthlySummary.averageWorkHours}
                totalOvertime={monthlySummary.totalOvertime}
              />
            </div>
          </div>

          {/* Recent Records */}
          <div>
            <h3 className="text-lg font-semibold text-[#0F172A] mb-4">
              Today's Attendance
            </h3>
            <AttendanceTable
              records={filteredRecords.slice(0, 10)}
            />
          </div>
        </TabsContent>

        {/* Records Tab */}
        <TabsContent value="records" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
              <Input
                placeholder="Search by employee name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>

            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[200px] bg-white">
                <Users className="w-4 h-4 mr-2 text-[#94A3B8]" />
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {mockEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px] bg-white">
                <CalendarIcon className="w-4 h-4 mr-2 text-[#94A3B8]" />
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Attendance Table */}
          <AttendanceTable records={filteredRecords} />
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[250px] bg-white">
                <Users className="w-4 h-4 mr-2 text-[#94A3B8]" />
                <SelectValue placeholder="Select Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {mockEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AttendanceCalendar
            records={mockAttendanceRecords}
            employeeId={selectedEmployee !== 'all' ? selectedEmployee : undefined}
          />
        </TabsContent>

        {/* My Attendance Tab */}
        <TabsContent value="my-attendance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <CheckInOutCard
              isCheckedIn={isCheckedIn}
              checkInTime={checkInTime}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onBreakStart={handleBreakStart}
              onBreakEnd={handleBreakEnd}
              isOnBreak={isOnBreak}
            />

            <div className="lg:col-span-2">
              <AttendanceSummaryCard
                totalWorkingDays={monthlySummary.totalWorkingDays}
                presentDays={monthlySummary.presentDays}
                absentDays={monthlySummary.absentDays}
                lateDays={monthlySummary.lateDays}
                halfDays={monthlySummary.halfDays}
                averageWorkHours={monthlySummary.averageWorkHours}
                totalOvertime={monthlySummary.totalOvertime}
              />
            </div>
          </div>

          <AttendanceCalendar
            records={mockAttendanceRecords}
            employeeId="emp-1" // Current user's ID
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttendancePage;
