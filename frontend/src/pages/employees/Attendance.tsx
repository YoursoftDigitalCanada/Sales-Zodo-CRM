import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format, endOfDay, endOfMonth, startOfDay, startOfMonth, subDays } from 'date-fns';
import {
  Search,
  Download,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  BarChart3,
  Table as TableIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  AttendanceRecord,
  buildAttendanceDailyTotals,
  formatMinutesAsDuration,
  formatWorkHours,
  getAttendanceDayKey,
  getAttendanceStatusConfig,
} from '@/components/employees';
import { getStoredEmployee, isStoredEmployeeAdmin } from '@/features/auth/lib/auth-storage';
import {
  AttendanceCurrentEntity,
  AttendanceEntity,
  AttendanceSummaryEntity,
  checkInAttendance,
  checkOutAttendance,
  endAttendanceBreak,
  getAttendanceRecords,
  getMyAttendanceRecords,
  getMyAttendanceSummary,
  getAttendanceSummary,
  getCurrentAttendance,
  getEmployees,
  startAttendanceBreak,
  updateAttendanceRecord,
} from '@/features/users';

type EmployeeOption = {
  id: string;
  name: string;
  avatar?: string | null;
};

type ApiEmployee = {
  id: string;
  user?: {
    firstName?: string;
    lastName?: string;
    avatar?: string | null;
  };
};

type EditAttendanceFormState = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  notes: string;
  location: 'office' | 'remote';
};

const EMPTY_SUMMARY: AttendanceSummaryEntity = {
  totalEmployees: 0,
  presentCount: 0,
  absentCount: 0,
  lateCount: 0,
  halfDayCount: 0,
  onLeaveCount: 0,
  totalWorkingDays: 0,
  averageCheckIn: null,
  averageWorkHours: 0,
  overtimeHours: 0,
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
  breakMinutes: Number(record.breakMinutes || 0),
  notes: record.notes || undefined,
  location: record.location,
  isRemote: record.isRemote,
  clockInLat: typeof record.clockInLat === 'number' ? record.clockInLat : null,
  clockInLng: typeof record.clockInLng === 'number' ? record.clockInLng : null,
  clockOutLat: typeof record.clockOutLat === 'number' ? record.clockOutLat : null,
  clockOutLng: typeof record.clockOutLng === 'number' ? record.clockOutLng : null,
});

const toEmployeeOption = (employee: ApiEmployee): EmployeeOption => ({
  id: employee.id,
  name: `${employee.user?.firstName || ''} ${employee.user?.lastName || ''}`.trim() || 'Unnamed Employee',
  avatar: employee.user?.avatar || null,
});

const toDateInputValue = (value?: Date): string => (value ? format(value, 'yyyy-MM-dd') : '');
const toTimeInputValue = (value?: Date): string => (value ? format(value, 'HH:mm') : '');

const buildEditFormState = (record: AttendanceRecord): EditAttendanceFormState => ({
  startDate: toDateInputValue(record.checkIn || record.date),
  startTime: toTimeInputValue(record.checkIn || record.date),
  endDate: toDateInputValue(record.checkOut || record.checkIn || record.date),
  endTime: record.checkOut ? toTimeInputValue(record.checkOut) : '',
  notes: record.notes || '',
  location: record.isRemote ? 'remote' : 'office',
});

const buildIsoDateTime = (dateValue: string, timeValue: string): string => {
  const normalizedTime = timeValue || '00:00';
  return new Date(`${dateValue}T${normalizedTime}:00`).toISOString();
};

type AttendanceCoordinates = {
  lat: number;
  lng: number;
};

const getCurrentCoordinates = (required: boolean): Promise<AttendanceCoordinates | null> => new Promise((resolve, reject) => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    if (required) {
      reject(new Error('Location access is required to check in from attendance.'));
      return;
    }

    resolve(null);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    },
    (error) => {
      if (!required) {
        resolve(null);
        return;
      }

      const message = error.code === error.PERMISSION_DENIED
        ? 'Location access is required to check in. Please allow location and try again.'
        : error.code === error.TIMEOUT
          ? 'Location request timed out. Please try again in a place with better GPS signal.'
          : 'Unable to get your current location. Please try again.';
      reject(new Error(message));
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    },
  );
});

const formatCoordinates = (lat?: number | null, lng?: number | null): string | null => {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
};

const buildMapLink = (lat?: number | null, lng?: number | null): string | null => {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  return `https://www.google.com/maps?q=${lat},${lng}`;
};

const isLeaveAttendanceRecord = (record: AttendanceRecord | null | undefined): record is AttendanceRecord => (
  Boolean(record && record.status === 'on-leave')
);

const mergeActiveAttendanceRecord = (
  sourceRecords: AttendanceRecord[],
  activeEntry: AttendanceEntity | null | undefined,
): AttendanceRecord[] => {
  if (!activeEntry) {
    return sourceRecords;
  }

  const liveRecord = toAttendanceRecord(activeEntry);
  const nextRecords = sourceRecords.filter((record) => record.id !== liveRecord.id);
  return [liveRecord, ...nextRecords];
};

const AttendancePage: React.FC = () => {
  const storedEmployee = getStoredEmployee();
  const currentEmployeeId = typeof storedEmployee?.id === 'string' ? storedEmployee.id : undefined;
  const isAdminUser = isStoredEmployeeAdmin(storedEmployee);

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [calendarRecords, setCalendarRecords] = useState<AttendanceRecord[]>([]);
  const [todaySummary, setTodaySummary] = useState<AttendanceSummaryEntity>(EMPTY_SUMMARY);
  const [teamMonthlySummary, setTeamMonthlySummary] = useState<AttendanceSummaryEntity>(EMPTY_SUMMARY);
  const [myMonthlySummary, setMyMonthlySummary] = useState<AttendanceSummaryEntity>(EMPTY_SUMMARY);
  const [currentStatus, setCurrentStatus] = useState<AttendanceCurrentEntity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [dateRange, setDateRange] = useState('today');
  const [activeTab, setActiveTab] = useState(isAdminUser ? 'overview' : 'my-attendance');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [detailsRecord, setDetailsRecord] = useState<AttendanceRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState<EditAttendanceFormState | null>(null);

  const refreshCalendarData = useCallback(async (month: Date, showErrorToast = true) => {
    try {
      const params = {
        dateFrom: startOfDay(startOfMonth(month)).toISOString(),
        dateTo: endOfDay(endOfMonth(month)).toISOString(),
      };
      const data = isAdminUser
        ? await getAttendanceRecords(params)
        : currentEmployeeId
          ? await getMyAttendanceRecords(params)
          : [];
      setCalendarRecords(data.map(toAttendanceRecord));
    } catch (error) {
      console.error('Failed to load attendance calendar:', error);
      if (showErrorToast) {
        toast.error(getErrorMessage(error, 'Failed to load attendance calendar'));
      }
    }
  }, [currentEmployeeId, isAdminUser]);

  const refreshData = useCallback(async (showErrorToast = true) => {
    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);

      if (!isAdminUser) {
        const [myAttendanceData, currentAttendanceData, myMonthSummaryData] = await Promise.all([
          currentEmployeeId
            ? getMyAttendanceRecords({
              dateFrom: startOfDay(subDays(now, 90)).toISOString(),
              dateTo: todayEnd.toISOString(),
            })
            : Promise.resolve([]),
          getCurrentAttendance(),
          currentEmployeeId
            ? getMyAttendanceSummary({
              dateFrom: monthStart.toISOString(),
              dateTo: todayEnd.toISOString(),
            })
            : Promise.resolve(EMPTY_SUMMARY),
        ]);

        setEmployees([]);
        setRecords(myAttendanceData.map(toAttendanceRecord));
        setTodaySummary(EMPTY_SUMMARY);
        setTeamMonthlySummary(EMPTY_SUMMARY);
        setMyMonthlySummary(myMonthSummaryData);
        setCurrentStatus(currentAttendanceData);
        return;
      }

      const [
        employeeData,
        attendanceData,
        todaySummaryData,
        teamMonthSummaryData,
        currentAttendanceData,
        myMonthSummaryData,
      ] = await Promise.all([
        getEmployees(),
        getAttendanceRecords({
          dateFrom: startOfDay(subDays(now, 90)).toISOString(),
          dateTo: todayEnd.toISOString(),
        }),
        getAttendanceSummary({
          dateFrom: todayStart.toISOString(),
          dateTo: todayEnd.toISOString(),
        }),
        getAttendanceSummary({
          dateFrom: monthStart.toISOString(),
          dateTo: todayEnd.toISOString(),
        }),
        getCurrentAttendance(),
        currentEmployeeId
          ? getAttendanceSummary({
            dateFrom: monthStart.toISOString(),
            dateTo: todayEnd.toISOString(),
            employeeId: currentEmployeeId,
          })
          : Promise.resolve(EMPTY_SUMMARY),
      ]);

      setEmployees((employeeData as ApiEmployee[]).map(toEmployeeOption));
      setRecords(attendanceData.map(toAttendanceRecord));
      setTodaySummary(todaySummaryData);
      setTeamMonthlySummary(teamMonthSummaryData);
      setMyMonthlySummary(myMonthSummaryData);
      setCurrentStatus(currentAttendanceData);
    } catch (error) {
      console.error('Failed to load attendance data:', error);
      if (showErrorToast) {
        toast.error(getErrorMessage(error, 'Failed to load attendance data'));
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
    refreshCalendarData(calendarMonth, false);
  }, [calendarMonth, refreshCalendarData]);

  useEffect(() => {
    if (!isAdminUser && activeTab !== 'my-attendance') {
      setActiveTab('my-attendance');
    }
  }, [activeTab, isAdminUser]);

  useEffect(() => {
    if (!currentStatus?.isCheckedIn) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      getCurrentAttendance()
        .then((nextStatus) => {
          setCurrentStatus(nextStatus);
        })
        .catch((error) => {
          console.error('Failed to refresh current attendance:', error);
        });
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [currentStatus?.isCheckedIn]);

  const displayRecords = useMemo(
    () => mergeActiveAttendanceRecord(records, currentStatus?.activeEntry),
    [currentStatus?.activeEntry, records],
  );

  const displayCalendarRecords = useMemo(
    () => mergeActiveAttendanceRecord(calendarRecords, currentStatus?.activeEntry),
    [calendarRecords, currentStatus?.activeEntry],
  );

  const dailyTotals = useMemo(() => buildAttendanceDailyTotals(displayRecords), [displayRecords]);

  const filteredRecords = useMemo(() => {
    let nextRecords = [...displayRecords];
    const today = new Date();

    switch (dateRange) {
      case 'today':
        nextRecords = nextRecords.filter((record) =>
          format(record.date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'));
        break;
      case 'yesterday':
        nextRecords = nextRecords.filter((record) =>
          format(record.date, 'yyyy-MM-dd') === format(subDays(today, 1), 'yyyy-MM-dd'));
        break;
      case 'week': {
        const weekAgo = subDays(today, 7);
        nextRecords = nextRecords.filter((record) => record.date >= weekAgo);
        break;
      }
      case 'month': {
        const monthStart = startOfMonth(today);
        nextRecords = nextRecords.filter((record) => record.date >= monthStart);
        break;
      }
      default:
        break;
    }

    if (selectedEmployee !== 'all') {
      nextRecords = nextRecords.filter((record) => record.employeeId === selectedEmployee);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      nextRecords = nextRecords.filter((record) => record.employeeName.toLowerCase().includes(query));
    }

    nextRecords.sort((a, b) => b.date.getTime() - a.date.getTime());
    return nextRecords;
  }, [dateRange, displayRecords, searchQuery, selectedEmployee]);

  const todaysRecords = useMemo(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    return displayRecords
      .filter((record) => format(record.date, 'yyyy-MM-dd') === todayKey)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [displayRecords]);

  const currentCheckInTime = currentStatus?.activeEntry?.checkIn
    ? new Date(currentStatus.activeEntry.checkIn)
    : undefined;

  const currentDayTotals = useMemo(() => {
    if (!currentEmployeeId) {
      return undefined;
    }

    return dailyTotals.get(getAttendanceDayKey(currentEmployeeId, new Date()));
  }, [currentEmployeeId, dailyTotals]);

  const resolvedDetailsRecord = useMemo(() => {
    if (!detailsRecord) {
      return null;
    }

    return displayRecords.find((record) => record.id === detailsRecord.id)
      || displayCalendarRecords.find((record) => record.id === detailsRecord.id)
      || detailsRecord;
  }, [detailsRecord, displayCalendarRecords, displayRecords]);

  const detailsDayTotals = useMemo(() => {
    if (!resolvedDetailsRecord) {
      return undefined;
    }

    return dailyTotals.get(getAttendanceDayKey(resolvedDetailsRecord.employeeId, resolvedDetailsRecord.date));
  }, [dailyTotals, resolvedDetailsRecord]);

  const displayedMonthlySummary = !isAdminUser || currentEmployeeId ? myMonthlySummary : teamMonthlySummary;

  const exportRecords = () => {
    const headers = ['Employee', 'Date', 'Check In', 'Check Out', 'Session Hours', 'Daily Hours', 'Break Time', 'Overtime', 'Status', 'Location', 'Notes'];
    const rows = filteredRecords.map((record) => {
      const dayTotals = dailyTotals.get(getAttendanceDayKey(record.employeeId, record.date));

      return [
      record.employeeName,
      format(record.date, 'yyyy-MM-dd'),
      record.checkIn ? format(record.checkIn, 'HH:mm') : '',
      record.checkOut ? format(record.checkOut, 'HH:mm') : '',
      record.workHours.toFixed(1),
      (dayTotals?.workHours || record.workHours).toFixed(1),
      formatMinutesAsDuration(record.breakMinutes || 0),
      record.overtime.toFixed(1),
      record.status,
      record.location || (record.isRemote ? 'Remote' : 'Office'),
      record.notes || '',
      ];
    });

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

  const refreshAfterMutation = useCallback(async () => {
    await Promise.all([
      refreshData(false),
      refreshCalendarData(calendarMonth, false),
    ]);
  }, [calendarMonth, refreshCalendarData, refreshData]);

  const handleCheckIn = async (isRemote: boolean) => {
    setIsActionLoading(true);
    try {
      const coordinates = await getCurrentCoordinates(true);
      const nextStatus = await checkInAttendance({
        isRemote,
        lat: coordinates?.lat,
        lng: coordinates?.lng,
      });
      setCurrentStatus(nextStatus);
      await refreshAfterMutation();
      toast.success(`Checked in successfully ${isRemote ? '(Remote)' : '(Office)'}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to check in'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setIsActionLoading(true);
    try {
      const coordinates = await getCurrentCoordinates(false);
      const nextStatus = await checkOutAttendance({
        lat: coordinates?.lat,
        lng: coordinates?.lng,
      });
      setCurrentStatus(nextStatus);
      await refreshAfterMutation();
      toast.success('Checked out successfully');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to check out'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBreakStart = async () => {
    setIsActionLoading(true);
    try {
      const nextStatus = await startAttendanceBreak();
      setCurrentStatus(nextStatus);
      await refreshAfterMutation();
      toast.success('Break started');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to start break'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBreakEnd = async () => {
    setIsActionLoading(true);
    try {
      const nextStatus = await endAttendanceBreak();
      setCurrentStatus(nextStatus);
      await refreshAfterMutation();
      toast.success('Break ended');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to end break'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEditRecord = (record: AttendanceRecord) => {
    if (isLeaveAttendanceRecord(record)) {
      toast.info('Approved leave days are generated from leave requests and cannot be edited here.');
      return;
    }

    setEditingRecord(record);
    setEditForm(buildEditFormState(record));
  };

  const handleSaveRecord = async () => {
    if (!editingRecord || !editForm) {
      return;
    }

    if (!editForm.startDate || !editForm.startTime) {
      toast.error('Check-in date and time are required');
      return;
    }

    setIsActionLoading(true);
    try {
      await updateAttendanceRecord(editingRecord.id, {
        startTime: buildIsoDateTime(editForm.startDate, editForm.startTime),
        endTime: editForm.endTime
          ? buildIsoDateTime(editForm.endDate || editForm.startDate, editForm.endTime)
          : null,
        notes: editForm.notes.trim() || null,
        isRemote: editForm.location === 'remote',
      });
      await refreshAfterMutation();
      setEditingRecord(null);
      setEditForm(null);
      toast.success('Attendance record updated');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update attendance record'));
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Attendance</h1>
          <p className="text-[#475569] mt-1">
            {isAdminUser ? 'Track and manage employee attendance' : 'Check in with your live location and track your own attendance'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={exportRecords}
            disabled={isLoading || filteredRecords.length === 0}
          >
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {isAdminUser && (
        <AttendanceStatsCards
          presentToday={todaySummary.presentCount + todaySummary.halfDayCount}
          absentToday={todaySummary.absentCount}
          lateToday={todaySummary.lateCount}
          onLeaveToday={todaySummary.onLeaveCount}
          totalEmployees={todaySummary.totalEmployees}
          averageCheckIn={todaySummary.averageCheckIn || undefined}
          averageWorkHours={todaySummary.averageWorkHours}
          overtimeHours={todaySummary.overtimeHours}
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {isAdminUser && (
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
        )}

        {isAdminUser && (
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <CheckInOutCard
              isCheckedIn={currentStatus?.isCheckedIn === true}
              checkInTime={currentCheckInTime}
              workedHours={currentDayTotals?.workHours || 0}
              breakMinutes={currentDayTotals?.breakMinutes || 0}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onBreakStart={handleBreakStart}
              onBreakEnd={handleBreakEnd}
              isOnBreak={currentStatus?.isOnBreak === true}
              isLoading={isActionLoading}
            />

            <div className="lg:col-span-2">
              <AttendanceSummaryCard
                totalWorkingDays={teamMonthlySummary.totalWorkingDays}
                presentDays={teamMonthlySummary.presentCount}
                absentDays={teamMonthlySummary.absentCount}
                lateDays={teamMonthlySummary.lateCount}
                halfDays={teamMonthlySummary.halfDayCount}
                averageWorkHours={teamMonthlySummary.averageWorkHours}
                totalOvertime={teamMonthlySummary.overtimeHours}
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#0F172A] mb-4">
              Today's Attendance
            </h3>
            <AttendanceTable
              records={todaysRecords}
              onEdit={handleEditRecord}
              onViewDetails={setDetailsRecord}
            />
          </div>
        </TabsContent>
        )}

        {isAdminUser && (
        <TabsContent value="records" className="space-y-6">
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
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
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

          <AttendanceTable
            records={filteredRecords}
            onEdit={handleEditRecord}
            onViewDetails={setDetailsRecord}
          />
        </TabsContent>
        )}

        {isAdminUser && (
        <TabsContent value="calendar" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[250px] bg-white">
                <Users className="w-4 h-4 mr-2 text-[#94A3B8]" />
                <SelectValue placeholder="Select Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AttendanceCalendar
            records={displayCalendarRecords}
            employeeId={selectedEmployee !== 'all' ? selectedEmployee : undefined}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            onDateClick={(date) => {
              const clickedRecords = displayCalendarRecords.filter((record) =>
                format(record.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                && (selectedEmployee === 'all' || record.employeeId === selectedEmployee),
              );
              if (clickedRecords[0]) {
                setDetailsRecord(clickedRecords[0]);
              }
            }}
          />
        </TabsContent>
        )}

        <TabsContent value="my-attendance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <CheckInOutCard
              isCheckedIn={currentStatus?.isCheckedIn === true}
              checkInTime={currentCheckInTime}
              workedHours={currentDayTotals?.workHours || 0}
              breakMinutes={currentDayTotals?.breakMinutes || 0}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onBreakStart={handleBreakStart}
              onBreakEnd={handleBreakEnd}
              isOnBreak={currentStatus?.isOnBreak === true}
              isLoading={isActionLoading}
            />

            <div className="lg:col-span-2">
              <AttendanceSummaryCard
                totalWorkingDays={displayedMonthlySummary.totalWorkingDays}
                presentDays={displayedMonthlySummary.presentCount}
                absentDays={displayedMonthlySummary.absentCount}
                lateDays={displayedMonthlySummary.lateCount}
                halfDays={displayedMonthlySummary.halfDayCount}
                averageWorkHours={displayedMonthlySummary.averageWorkHours}
                totalOvertime={displayedMonthlySummary.overtimeHours}
              />
            </div>
          </div>

          {!isAdminUser && (
            <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4 text-sm text-[#475569]">
              Your check-in requires live browser location so admins can review where your work started.
            </div>
          )}

          <AttendanceCalendar
            records={displayCalendarRecords}
            employeeId={currentEmployeeId}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            onDateClick={(date) => {
              const clickedRecord = displayCalendarRecords.find((record) =>
                record.employeeId === currentEmployeeId
                && format(record.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'),
              );
              if (clickedRecord) {
                setDetailsRecord(clickedRecord);
              }
            }}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(detailsRecord)} onOpenChange={(open) => {
        if (!open) {
          setDetailsRecord(null);
        }
      }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Attendance Details</DialogTitle>
            <DialogDescription>
              Review the saved attendance record from the database.
            </DialogDescription>
          </DialogHeader>

          {resolvedDetailsRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-md border border-[rgba(15,23,42,0.06)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[#64748B]">Employee</p>
                  <p className="mt-1 font-medium text-[#0F172A]">{resolvedDetailsRecord.employeeName}</p>
                </div>
                <div className="rounded-md border border-[rgba(15,23,42,0.06)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[#64748B]">Status</p>
                  <p className="mt-1 font-medium text-[#0F172A]">
                    {getAttendanceStatusConfig(resolvedDetailsRecord.status).label}
                  </p>
                </div>
                <div className="rounded-md border border-[rgba(15,23,42,0.06)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[#64748B]">Check In</p>
                  <p className="mt-1 font-medium text-[#0F172A]">
                    {resolvedDetailsRecord.checkIn ? format(resolvedDetailsRecord.checkIn, 'MMM d, yyyy h:mm a') : '—'}
                  </p>
                </div>
                <div className="rounded-md border border-[rgba(15,23,42,0.06)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[#64748B]">Check Out</p>
                  <p className="mt-1 font-medium text-[#0F172A]">
                    {resolvedDetailsRecord.checkOut ? format(resolvedDetailsRecord.checkOut, 'MMM d, yyyy h:mm a') : '—'}
                  </p>
                </div>
                <div className="rounded-md border border-[rgba(15,23,42,0.06)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[#64748B]">Session Hours</p>
                  <p className="mt-1 font-medium text-[#0F172A]">{formatWorkHours(resolvedDetailsRecord.workHours)}</p>
                </div>
                <div className="rounded-md border border-[rgba(15,23,42,0.06)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[#64748B]">Daily Hours</p>
                  <p className="mt-1 font-medium text-[#0F172A]">
                    {detailsDayTotals ? formatWorkHours(detailsDayTotals.workHours) : '—'}
                  </p>
                </div>
                <div className="rounded-md border border-[rgba(15,23,42,0.06)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[#64748B]">Break Time</p>
                  <p className="mt-1 font-medium text-[#0F172A]">
                    {formatMinutesAsDuration(resolvedDetailsRecord.breakMinutes || 0)}
                  </p>
                </div>
                <div className="rounded-md border border-[rgba(15,23,42,0.06)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[#64748B]">Location</p>
                  <p className="mt-1 font-medium text-[#0F172A]">
                    {isLeaveAttendanceRecord(resolvedDetailsRecord)
                      ? resolvedDetailsRecord.location || 'On Leave'
                      : resolvedDetailsRecord.location || (resolvedDetailsRecord.isRemote ? 'Remote' : 'Office')}
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-[rgba(15,23,42,0.06)] p-3">
                <p className="text-xs uppercase tracking-wide text-[#64748B]">Notes</p>
                <p className="mt-1 text-sm text-[#475569] whitespace-pre-wrap">
                  {resolvedDetailsRecord.notes || 'No notes saved for this record.'}
                </p>
              </div>

              {isLeaveAttendanceRecord(resolvedDetailsRecord) ? (
                <div className="rounded-md border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm font-medium text-[#0F172A]">Approved leave day</p>
                  <p className="mt-1 text-sm text-[#475569]">
                    This calendar entry was created automatically from an approved leave request, so there is no check-in or work location for this day.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-md border border-[rgba(15,23,42,0.06)] p-3">
                    <p className="text-xs uppercase tracking-wide text-[#64748B]">Work Started From</p>
                    <div className="mt-1 flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 text-[#0891B2]" />
                      <div>
                        <p className="font-medium text-[#0F172A]">
                          {formatCoordinates(resolvedDetailsRecord.clockInLat, resolvedDetailsRecord.clockInLng) || 'No start location saved'}
                        </p>
                        {buildMapLink(resolvedDetailsRecord.clockInLat, resolvedDetailsRecord.clockInLng) && (
                          <a
                            href={buildMapLink(resolvedDetailsRecord.clockInLat, resolvedDetailsRecord.clockInLng) || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-[#0891B2] hover:underline"
                          >
                            Open on map
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-md border border-[rgba(15,23,42,0.06)] p-3">
                    <p className="text-xs uppercase tracking-wide text-[#64748B]">Check Out Location</p>
                    <div className="mt-1 flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 text-[#0891B2]" />
                      <div>
                        <p className="font-medium text-[#0F172A]">
                          {formatCoordinates(resolvedDetailsRecord.clockOutLat, resolvedDetailsRecord.clockOutLng) || 'No check-out location saved'}
                        </p>
                        {buildMapLink(resolvedDetailsRecord.clockOutLat, resolvedDetailsRecord.clockOutLng) && (
                          <a
                            href={buildMapLink(resolvedDetailsRecord.clockOutLat, resolvedDetailsRecord.clockOutLng) || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-[#0891B2] hover:underline"
                          >
                            Open on map
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsRecord(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingRecord)} onOpenChange={(open) => {
        if (!open) {
          setEditingRecord(null);
          setEditForm(null);
        }
      }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Edit Attendance Record</DialogTitle>
            <DialogDescription>
              Update the existing record and save it directly to the database.
            </DialogDescription>
          </DialogHeader>

          {editingRecord && editForm && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="attendance-start-date">Check In Date</Label>
                  <Input
                    id="attendance-start-date"
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm((current) => current ? { ...current, startDate: e.target.value } : current)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attendance-start-time">Check In Time</Label>
                  <Input
                    id="attendance-start-time"
                    type="time"
                    value={editForm.startTime}
                    onChange={(e) => setEditForm((current) => current ? { ...current, startTime: e.target.value } : current)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attendance-end-date">Check Out Date</Label>
                  <Input
                    id="attendance-end-date"
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm((current) => current ? { ...current, endDate: e.target.value } : current)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attendance-end-time">Check Out Time</Label>
                  <Input
                    id="attendance-end-time"
                    type="time"
                    value={editForm.endTime}
                    onChange={(e) => setEditForm((current) => current ? { ...current, endTime: e.target.value } : current)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Select
                  value={editForm.location}
                  onValueChange={(value: 'office' | 'remote') =>
                    setEditForm((current) => current ? { ...current, location: value } : current)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attendance-notes">Notes</Label>
                <Textarea
                  id="attendance-notes"
                  rows={4}
                  value={editForm.notes}
                  onChange={(e) => setEditForm((current) => current ? { ...current, notes: e.target.value } : current)}
                  placeholder="Add notes for this attendance record"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingRecord(null);
                setEditForm(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveRecord} disabled={isActionLoading}>
              {isActionLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendancePage;
