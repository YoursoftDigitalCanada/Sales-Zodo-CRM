import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, formatDistanceToNow, endOfDay, endOfMonth, startOfDay, startOfMonth, subDays } from 'date-fns';
import {
  AlertTriangle,
  CheckCircle2,
  Search,
  Download,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldCheck,
  Users,
  BarChart3,
  Table as TableIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { useIsMobile } from '@/hooks/useIsMobile';
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
  syncAttendanceLocation,
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
  workMinutes: Number(record.workMinutes || 0),
  overtime: Number(record.overtime || 0),
  overtimeMinutes: Number(record.overtimeMinutes || 0),
  breakMinutes: Number(record.breakMinutes || 0),
  notes: record.notes || undefined,
  location: record.location,
  isRemote: record.isRemote,
  clockInLat: typeof record.clockInLat === 'number' ? record.clockInLat : null,
  clockInLng: typeof record.clockInLng === 'number' ? record.clockInLng : null,
  clockOutLat: typeof record.clockOutLat === 'number' ? record.clockOutLat : null,
  clockOutLng: typeof record.clockOutLng === 'number' ? record.clockOutLng : null,
  clockInAccuracy: typeof record.clockInAccuracy === 'number' ? record.clockInAccuracy : null,
  clockOutAccuracy: typeof record.clockOutAccuracy === 'number' ? record.clockOutAccuracy : null,
  clockInCapturedAt: record.clockInCapturedAt ? new Date(record.clockInCapturedAt) : null,
  clockOutCapturedAt: record.clockOutCapturedAt ? new Date(record.clockOutCapturedAt) : null,
  lastSeenLat: typeof record.lastSeenLat === 'number' ? record.lastSeenLat : null,
  lastSeenLng: typeof record.lastSeenLng === 'number' ? record.lastSeenLng : null,
  lastSeenAccuracy: typeof record.lastSeenAccuracy === 'number' ? record.lastSeenAccuracy : null,
  lastSeenAt: record.lastSeenAt ? new Date(record.lastSeenAt) : null,
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
  accuracy?: number | null;
  capturedAt: string;
};

type AttendanceLocationState = {
  status: 'idle' | 'locating' | 'ready' | 'error';
  lat?: number;
  lng?: number;
  accuracy?: number | null;
  capturedAt?: Date | null;
  errorMessage?: string | null;
};

const ATTENDANCE_LOCATION_ACCURACY_LIMIT_METERS = 200;
const ATTENDANCE_LOCATION_SYNC_INTERVAL_MS = 60_000;
const ATTENDANCE_LOCATION_SYNC_DISTANCE_METERS = 25;

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
        accuracy: typeof position.coords.accuracy === 'number' ? position.coords.accuracy : null,
        capturedAt: new Date(position.timestamp).toISOString(),
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

const getLocationWatchErrorMessage = (error: GeolocationPositionError): string => {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Location permission is blocked. Allow precise location access to use attendance.';
  }

  if (error.code === error.TIMEOUT) {
    return 'Location request timed out. Move to a better signal area and refresh.';
  }

  return 'Unable to read your current device location.';
};

const formatAccuracyLabel = (accuracy?: number | null): string => {
  if (typeof accuracy !== 'number' || Number.isNaN(accuracy)) {
    return 'Accuracy unavailable';
  }

  if (accuracy <= 25) {
    return `Excellent (${Math.round(accuracy)}m)`;
  }

  if (accuracy <= 75) {
    return `Good (${Math.round(accuracy)}m)`;
  }

  if (accuracy <= ATTENDANCE_LOCATION_ACCURACY_LIMIT_METERS) {
    return `Fair (${Math.round(accuracy)}m)`;
  }

  return `Weak (${Math.round(accuracy)}m)`;
};

const isLocationAccurate = (accuracy?: number | null): boolean => (
  typeof accuracy === 'number' && accuracy <= ATTENDANCE_LOCATION_ACCURACY_LIMIT_METERS
);

const buildLocationState = (coordinates: AttendanceCoordinates): AttendanceLocationState => ({
  status: 'ready',
  lat: coordinates.lat,
  lng: coordinates.lng,
  accuracy: coordinates.accuracy ?? null,
  capturedAt: new Date(coordinates.capturedAt),
  errorMessage: null,
});

const calculateDistanceMeters = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number => {
  const earthRadius = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

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
  const { isMobile } = useIsMobile();
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [activeTab, setActiveTab] = useState(isAdminUser ? 'overview' : 'my-attendance');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isLocationRefreshing, setIsLocationRefreshing] = useState(false);
  const [isLocationSyncing, setIsLocationSyncing] = useState(false);
  const [locationState, setLocationState] = useState<AttendanceLocationState>({ status: 'idle' });
  const [detailsRecord, setDetailsRecord] = useState<AttendanceRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState<EditAttendanceFormState | null>(null);
  const lastLocationSyncRef = useRef<{
    entryId: string;
    syncedAt: number;
    lat: number;
    lng: number;
  } | null>(null);

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

  const refreshCurrentLocation = useCallback(async (required: boolean) => {
    setIsLocationRefreshing(true);
    setLocationState((current) => ({
      ...current,
      status: 'locating',
      errorMessage: null,
    }));

    try {
      const coordinates = await getCurrentCoordinates(required);

      if (!coordinates) {
        setLocationState({
          status: 'idle',
          errorMessage: null,
        });
        return null;
      }

      const nextLocationState = buildLocationState(coordinates);
      setLocationState(nextLocationState);
      return nextLocationState;
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to get your current location.');
      setLocationState({
        status: 'error',
        errorMessage: message,
      });
      throw error;
    } finally {
      setIsLocationRefreshing(false);
    }
  }, []);

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
    const shouldTrackLocation = !isAdminUser || activeTab === 'my-attendance' || currentStatus?.isCheckedIn;

    if (!shouldTrackLocation || typeof navigator === 'undefined' || !navigator.geolocation) {
      return undefined;
    }

    setLocationState((current) => (
      current.status === 'ready' ? current : { status: 'locating', errorMessage: null }
    ));

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocationState({
          status: 'ready',
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: typeof position.coords.accuracy === 'number' ? position.coords.accuracy : null,
          capturedAt: new Date(position.timestamp),
          errorMessage: null,
        });
      },
      (error) => {
        setLocationState((current) => ({
          ...current,
          status: 'error',
          errorMessage: getLocationWatchErrorMessage(error),
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeTab, currentStatus?.isCheckedIn, isAdminUser]);

  useEffect(() => {
    if (
      !currentStatus?.isCheckedIn
      || !currentStatus.activeEntry
      || locationState.status !== 'ready'
      || typeof locationState.lat !== 'number'
      || typeof locationState.lng !== 'number'
    ) {
      return undefined;
    }

    const lastSync = lastLocationSyncRef.current;
    const shouldSyncBecauseEntryChanged = !lastSync || lastSync.entryId !== currentStatus.activeEntry.id;
    const shouldSyncBecauseTimeElapsed = !lastSync || Date.now() - lastSync.syncedAt >= ATTENDANCE_LOCATION_SYNC_INTERVAL_MS;
    const shouldSyncBecauseMoved = !lastSync
      || calculateDistanceMeters(lastSync.lat, lastSync.lng, locationState.lat, locationState.lng) >= ATTENDANCE_LOCATION_SYNC_DISTANCE_METERS;

    if (!shouldSyncBecauseEntryChanged && !shouldSyncBecauseTimeElapsed && !shouldSyncBecauseMoved) {
      return undefined;
    }

    let cancelled = false;
    setIsLocationSyncing(true);

    syncAttendanceLocation({
      lat: locationState.lat,
      lng: locationState.lng,
      accuracy: locationState.accuracy ?? undefined,
      capturedAt: locationState.capturedAt?.toISOString(),
    })
      .then((nextStatus) => {
        if (cancelled) {
          return;
        }

        lastLocationSyncRef.current = {
          entryId: nextStatus.activeEntry?.id || currentStatus.activeEntry!.id,
          syncedAt: Date.now(),
          lat: locationState.lat!,
          lng: locationState.lng!,
        };
        setCurrentStatus(nextStatus);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to sync attendance location:', error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLocationSyncing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    currentStatus?.activeEntry,
    currentStatus?.isCheckedIn,
    locationState.accuracy,
    locationState.capturedAt,
    locationState.lat,
    locationState.lng,
    locationState.status,
  ]);

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

  useEffect(() => {
    if (!currentStatus?.isCheckedIn) {
      lastLocationSyncRef.current = null;
    }
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

    if (statusFilter !== 'all') {
      nextRecords = nextRecords.filter((record) => record.status === statusFilter);
    }

    if (locationFilter === 'remote') {
      nextRecords = nextRecords.filter((record) => record.isRemote);
    } else if (locationFilter === 'office') {
      nextRecords = nextRecords.filter((record) => !record.isRemote && record.status !== 'on-leave');
    } else if (locationFilter === 'verified') {
      nextRecords = nextRecords.filter((record) =>
        typeof record.clockInLat === 'number'
        && typeof record.clockInLng === 'number'
        && isLocationAccurate(record.clockInAccuracy ?? record.lastSeenAccuracy),
      );
    }

    nextRecords.sort((a, b) => b.date.getTime() - a.date.getTime());
    return nextRecords;
  }, [dateRange, displayRecords, locationFilter, searchQuery, selectedEmployee, statusFilter]);

  const todaysRecords = useMemo(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    return displayRecords
      .filter((record) => format(record.date, 'yyyy-MM-dd') === todayKey)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [displayRecords]);

  const currentActiveRecord = useMemo(
    () => (currentStatus?.activeEntry ? toAttendanceRecord(currentStatus.activeEntry) : null),
    [currentStatus?.activeEntry],
  );

  const currentCheckInTime = currentActiveRecord?.checkIn;

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
  const verifiedGpsCount = useMemo(
    () => filteredRecords.filter((record) =>
      typeof record.clockInLat === 'number'
      && typeof record.clockInLng === 'number'
      && isLocationAccurate(record.clockInAccuracy ?? record.lastSeenAccuracy),
    ).length,
    [filteredRecords],
  );
  const liveTrackedCount = useMemo(
    () => filteredRecords.filter((record) => !record.checkOut && Boolean(record.lastSeenAt)).length,
    [filteredRecords],
  );
  const verifiedGpsTodayCount = useMemo(
    () => todaysRecords.filter((record) =>
      typeof record.clockInLat === 'number'
      && typeof record.clockInLng === 'number'
      && isLocationAccurate(record.clockInAccuracy ?? record.lastSeenAccuracy),
    ).length,
    [todaysRecords],
  );

  const currentLocationCoordinates = formatCoordinates(locationState.lat, locationState.lng);
  const locationCardState = useMemo(() => ({
    status: isLocationRefreshing && locationState.status !== 'ready' ? 'locating' as const : locationState.status,
    coordinatesLabel: currentLocationCoordinates,
    accuracyLabel: formatAccuracyLabel(locationState.accuracy),
    accuracyMeters: locationState.accuracy ?? null,
    capturedAt: locationState.capturedAt ?? null,
    errorMessage: locationState.errorMessage ?? null,
    isAccurate: isLocationAccurate(locationState.accuracy),
    attendanceSyncAt: currentActiveRecord?.lastSeenAt || currentActiveRecord?.clockInCapturedAt || null,
    recordedLocationLabel: formatCoordinates(
      currentActiveRecord?.clockInLat,
      currentActiveRecord?.clockInLng,
    ),
    recordedAccuracyLabel: currentActiveRecord?.clockInAccuracy
      ? formatAccuracyLabel(currentActiveRecord.clockInAccuracy)
      : null,
  }), [
    currentLocationCoordinates,
    currentActiveRecord?.clockInAccuracy,
    currentActiveRecord?.clockInCapturedAt,
    currentActiveRecord?.clockInLat,
    currentActiveRecord?.clockInLng,
    currentActiveRecord?.lastSeenAt,
    isLocationRefreshing,
    locationState.accuracy,
    locationState.capturedAt,
    locationState.errorMessage,
    locationState.status,
  ]);

  const exportRecords = () => {
    const headers = ['Employee', 'Date', 'Check In', 'Check Out', 'Session Hours', 'Daily Hours', 'Break Time', 'Overtime', 'Status', 'Location', 'GPS Accuracy', 'Live Location Updated', 'Notes'];
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
      typeof (record.clockInAccuracy ?? record.lastSeenAccuracy) === 'number'
        ? `${Math.round(record.clockInAccuracy ?? record.lastSeenAccuracy ?? 0)}m`
        : '',
      record.lastSeenAt ? format(record.lastSeenAt, 'yyyy-MM-dd HH:mm:ss') : '',
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

  const resolveAttendanceLocation = useCallback(async (required: boolean) => {
    if (
      locationState.status === 'ready'
      && typeof locationState.lat === 'number'
      && typeof locationState.lng === 'number'
      && locationState.capturedAt
    ) {
      const ageMs = Date.now() - locationState.capturedAt.getTime();
      if (ageMs <= 45_000) {
        return {
          lat: locationState.lat,
          lng: locationState.lng,
          accuracy: locationState.accuracy ?? null,
          capturedAt: locationState.capturedAt.toISOString(),
        };
      }
    }

    const refreshed = await refreshCurrentLocation(required);
    if (!refreshed || refreshed.status !== 'ready' || typeof refreshed.lat !== 'number' || typeof refreshed.lng !== 'number') {
      return null;
    }

    return {
      lat: refreshed.lat,
      lng: refreshed.lng,
      accuracy: refreshed.accuracy ?? null,
      capturedAt: refreshed.capturedAt?.toISOString() || new Date().toISOString(),
    };
  }, [locationState.accuracy, locationState.capturedAt, locationState.lat, locationState.lng, locationState.status, refreshCurrentLocation]);

  const handleCheckIn = async (isRemote: boolean) => {
    setIsActionLoading(true);
    try {
      const coordinates = await resolveAttendanceLocation(true);
      if (!coordinates || !isLocationAccurate(coordinates.accuracy)) {
        throw new Error(`Check in needs a more precise location. Please refresh until accuracy is under ${ATTENDANCE_LOCATION_ACCURACY_LIMIT_METERS}m.`);
      }
      const nextStatus = await checkInAttendance({
        isRemote,
        lat: coordinates.lat,
        lng: coordinates.lng,
        accuracy: coordinates.accuracy ?? undefined,
        capturedAt: coordinates.capturedAt,
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
      const coordinates = await resolveAttendanceLocation(false);
      const nextStatus = await checkOutAttendance({
        lat: coordinates?.lat,
        lng: coordinates?.lng,
        accuracy: coordinates?.accuracy ?? undefined,
        capturedAt: coordinates?.capturedAt,
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

  const renderAttendanceCards = (items: AttendanceRecord[]) => (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-6 text-center text-sm text-[#475569]">
          No attendance records found for the current view.
        </div>
      ) : (
        items.map((record) => {
          const statusConfig = getAttendanceStatusConfig(record.status);
          const gpsAccuracy = record.lastSeenAccuracy ?? record.clockInAccuracy ?? null;
          const gpsUpdatedAt = record.lastSeenAt || record.clockInCapturedAt || null;
          const mapLink = buildMapLink(record.lastSeenLat ?? record.clockInLat, record.lastSeenLng ?? record.clockInLng);
          return (
            <div
              key={record.id}
              className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#0F172A]">{record.employeeName}</p>
                  <p className="text-sm text-[#475569]">{format(record.date, 'MMM d, yyyy')}</p>
                </div>
                <Badge className={`${statusConfig.color} border-0`}>
                  {statusConfig.label}
                </Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#F8FAFC] p-3">
                  <p className="text-xs text-[#64748B]">Check In</p>
                  <p className="mt-1 text-sm font-medium text-[#0F172A]">
                    {record.checkIn ? format(record.checkIn, 'h:mm a') : '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F8FAFC] p-3">
                  <p className="text-xs text-[#64748B]">Check Out</p>
                  <p className="mt-1 text-sm font-medium text-[#0F172A]">
                    {record.checkOut ? format(record.checkOut, 'h:mm a') : '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F8FAFC] p-3">
                  <p className="text-xs text-[#64748B]">Work Hours</p>
                  <p className="mt-1 text-sm font-medium text-[#0F172A]">
                    {record.workMinutes > 0 || (record.status !== 'on-leave' && record.checkIn)
                      ? formatMinutesAsDuration(record.workMinutes)
                      : '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F8FAFC] p-3">
                  <p className="text-xs text-[#64748B]">Location</p>
                  <p className="mt-1 text-sm font-medium text-[#0F172A]">
                    {record.status === 'on-leave'
                      ? record.location || 'On Leave'
                      : record.location || (record.isRemote ? 'Remote' : 'Office')}
                  </p>
                  {record.status !== 'on-leave' && (
                    <p className="mt-1 text-xs text-[#64748B]">
                      {typeof gpsAccuracy === 'number' ? `GPS ${Math.round(gpsAccuracy)}m` : 'No verified GPS fix'}
                    </p>
                  )}
                </div>
              </div>

              {record.status !== 'on-leave' && (
                <div className="mt-4 rounded-xl border border-[rgba(15,23,42,0.06)] bg-[#FCFEFF] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[#64748B]">Location Record</p>
                      <p className="mt-1 text-sm font-medium text-[#0F172A]">
                        {formatCoordinates(record.lastSeenLat ?? record.clockInLat, record.lastSeenLng ?? record.clockInLng) || 'No coordinates saved'}
                      </p>
                      <p className="mt-1 text-xs text-[#64748B]">
                        {gpsUpdatedAt ? `Updated ${formatDistanceToNow(gpsUpdatedAt, { addSuffix: true })}` : 'No live sync yet'}
                      </p>
                    </div>
                    {mapLink && (
                      <a
                        href={mapLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-[#E0F2FE] px-3 py-1 text-xs font-medium text-[#0369A1]"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        Map
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setDetailsRecord(record)}>
                  View Details
                </Button>
                {record.status !== 'on-leave' && (
                  <Button variant="outline" className="flex-1" onClick={() => handleEditRecord(record)}>
                    Edit Record
                  </Button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div className="min-h-screen space-y-6 bg-[#F8FAFC] p-4 sm:p-6">
      <div className="overflow-hidden rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-white shadow-[0_18px_60px_-42px_rgba(15,23,42,0.45)]">
        <div className="border-b border-[rgba(15,23,42,0.06)] bg-[linear-gradient(135deg,#f8fafc_0%,#eef6ff_48%,#ecfeff_100%)] px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#0369A1]">Workforce Tracking</p>
              <h1 className="mt-2 text-2xl font-semibold text-[#0F172A] sm:text-3xl">Attendance</h1>
              <p className="mt-2 max-w-2xl text-sm text-[#475569] sm:text-base">
                {isAdminUser
                  ? 'Review live attendance, verified GPS captures, and the latest employee movement from one workspace.'
                  : 'Check in with precise device location, keep your live workday synced, and review every saved attendance record.'}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                className="gap-2 bg-white"
                onClick={() => {
                  void refreshCurrentLocation(false).catch(() => undefined);
                }}
                disabled={isLocationRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isLocationRefreshing ? 'animate-spin' : ''}`} />
                {isLocationRefreshing ? 'Refreshing Location' : 'Refresh Location'}
              </Button>
              <Button
                variant="outline"
                className="gap-2 bg-white"
                onClick={exportRecords}
                disabled={isLoading || filteredRecords.length === 0}
              >
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 px-6 py-4">
          <Badge className="gap-2 border-0 bg-[#E0F2FE] px-3 py-1 text-[#0C4A6E]">
            {locationState.status === 'ready' && locationCardState.isAccurate ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {locationState.status === 'ready'
              ? `Current GPS ${locationCardState.accuracyLabel}`
              : locationState.status === 'locating'
                ? 'Finding current device location'
                : locationState.errorMessage || 'Location not ready'}
          </Badge>
          <Badge className="gap-2 border-0 bg-[#ECFDF5] px-3 py-1 text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            {verifiedGpsCount} verified record{verifiedGpsCount === 1 ? '' : 's'}
          </Badge>
          <Badge className="gap-2 border-0 bg-[#EEF2FF] px-3 py-1 text-indigo-700">
            <Navigation className="h-3.5 w-3.5" />
            {liveTrackedCount} live-tracked record{liveTrackedCount === 1 ? '' : 's'}
          </Badge>
          {currentLocationCoordinates && (
            <Badge className="border-0 bg-white px-3 py-1 text-[#334155] shadow-sm">
              {currentLocationCoordinates}
            </Badge>
          )}
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
          <TabsList className="w-full justify-start overflow-x-auto bg-white sm:w-auto">
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
              onRefreshLocation={() => {
                void refreshCurrentLocation(false).catch(() => undefined);
              }}
              isOnBreak={currentStatus?.isOnBreak === true}
              isLoading={isActionLoading || isLocationRefreshing || isLocationSyncing}
              locationState={locationCardState}
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

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Current Device</p>
              <p className="mt-2 font-semibold text-[#0F172A]">{currentLocationCoordinates || 'Waiting for location'}</p>
              <p className="mt-1 text-sm text-[#475569]">{locationCardState.accuracyLabel}</p>
            </div>
            <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Live Sync</p>
              <p className="mt-2 font-semibold text-[#0F172A]">
                {currentActiveRecord?.lastSeenAt
                  ? formatDistanceToNow(currentActiveRecord.lastSeenAt, { addSuffix: true })
                  : 'No active live sync'}
              </p>
              <p className="mt-1 text-sm text-[#475569]">
                {isLocationSyncing ? 'Syncing latest position to the attendance record.' : 'Active entries keep their latest location updated.'}
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">GPS Coverage</p>
              <p className="mt-2 font-semibold text-[#0F172A]">{verifiedGpsTodayCount} verified today</p>
              <p className="mt-1 text-sm text-[#475569]">
                {todaySummary.totalEmployees > 0
                  ? `${Math.round((verifiedGpsTodayCount / Math.max(todaySummary.totalEmployees, 1)) * 100)}% of today's records are location verified.`
                  : 'No attendance records have been loaded yet.'}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#0F172A] mb-4">
              Today's Attendance
            </h3>
            {isMobile ? renderAttendanceCards(todaysRecords) : (
              <AttendanceTable
                records={todaysRecords}
                onEdit={handleEditRecord}
                onViewDetails={setDetailsRecord}
              />
            )}
          </div>
        </TabsContent>
        )}

        {isAdminUser && (
        <TabsContent value="records" className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px_180px_180px_180px]">
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
              <SelectTrigger className="bg-white">
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

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white">
                <Clock className="w-4 h-4 mr-2 text-[#94A3B8]" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="half-day">Half Day</SelectItem>
                <SelectItem value="on-leave">On Leave</SelectItem>
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="bg-white">
                <MapPin className="w-4 h-4 mr-2 text-[#94A3B8]" />
                <SelectValue placeholder="Location Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="office">Office</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="verified">GPS Verified</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Visible Records</p>
              <p className="mt-2 text-2xl font-semibold text-[#0F172A]">{filteredRecords.length}</p>
              <p className="mt-1 text-sm text-[#475569]">Filtered by employee, date, status, and location quality.</p>
            </div>
            <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Verified GPS</p>
              <p className="mt-2 text-2xl font-semibold text-[#0F172A]">{verifiedGpsCount}</p>
              <p className="mt-1 text-sm text-[#475569]">Records with a precise saved location fix.</p>
            </div>
            <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Live Entries</p>
              <p className="mt-2 text-2xl font-semibold text-[#0F172A]">{liveTrackedCount}</p>
              <p className="mt-1 text-sm text-[#475569]">Checked-in records with recent live location updates.</p>
            </div>
          </div>

          {isMobile ? renderAttendanceCards(filteredRecords) : (
            <AttendanceTable
              records={filteredRecords}
              onEdit={handleEditRecord}
              onViewDetails={setDetailsRecord}
            />
          )}
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
              onRefreshLocation={() => {
                void refreshCurrentLocation(false).catch(() => undefined);
              }}
              isOnBreak={currentStatus?.isOnBreak === true}
              isLoading={isActionLoading || isLocationRefreshing || isLocationSyncing}
              locationState={locationCardState}
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

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Current Device Location</p>
              <p className="mt-2 font-semibold text-[#0F172A]">{currentLocationCoordinates || 'Waiting for location fix'}</p>
              <p className="mt-1 text-sm text-[#475569]">{locationCardState.accuracyLabel}</p>
            </div>
            <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Attendance Sync</p>
              <p className="mt-2 font-semibold text-[#0F172A]">
                {currentActiveRecord?.lastSeenAt
                  ? formatDistanceToNow(currentActiveRecord.lastSeenAt, { addSuffix: true })
                  : 'No live attendance entry'}
              </p>
              <p className="mt-1 text-sm text-[#475569]">
                {isLocationSyncing ? 'Updating your active location now.' : 'Your active session keeps its last live position.'}
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Trust Signal</p>
              <p className="mt-2 font-semibold text-[#0F172A]">
                {locationCardState.isAccurate ? 'Location is precise enough to record attendance' : 'Move for a more precise GPS fix before check in'}
              </p>
              <p className="mt-1 text-sm text-[#475569]">
                Attendance works best when your device can report a location under {ATTENDANCE_LOCATION_ACCURACY_LIMIT_METERS} meters.
              </p>
            </div>
          </div>

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
        <DialogContent className={isMobile ? "left-0 top-auto bottom-0 max-h-[88vh] max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-t-3xl px-4 pb-8 pt-6" : "sm:max-w-[520px]"}>
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
                        <p className="mt-1 text-xs text-[#64748B]">
                          {formatAccuracyLabel(resolvedDetailsRecord.clockInAccuracy)}
                          {resolvedDetailsRecord.clockInCapturedAt
                            ? ` · Captured ${formatDistanceToNow(resolvedDetailsRecord.clockInCapturedAt, { addSuffix: true })}`
                            : ''}
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
                        <p className="mt-1 text-xs text-[#64748B]">
                          {formatAccuracyLabel(resolvedDetailsRecord.clockOutAccuracy)}
                          {resolvedDetailsRecord.clockOutCapturedAt
                            ? ` · Captured ${formatDistanceToNow(resolvedDetailsRecord.clockOutCapturedAt, { addSuffix: true })}`
                            : ''}
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
                  <div className="rounded-md border border-[rgba(15,23,42,0.06)] p-3 sm:col-span-2">
                    <p className="text-xs uppercase tracking-wide text-[#64748B]">Latest Live Location</p>
                    <div className="mt-1 flex items-start gap-2">
                      <Navigation className="mt-0.5 h-4 w-4 text-[#0891B2]" />
                      <div>
                        <p className="font-medium text-[#0F172A]">
                          {formatCoordinates(resolvedDetailsRecord.lastSeenLat, resolvedDetailsRecord.lastSeenLng) || 'No live location updates have been synced'}
                        </p>
                        <p className="mt-1 text-xs text-[#64748B]">
                          {formatAccuracyLabel(resolvedDetailsRecord.lastSeenAccuracy)}
                          {resolvedDetailsRecord.lastSeenAt
                            ? ` · Updated ${formatDistanceToNow(resolvedDetailsRecord.lastSeenAt, { addSuffix: true })}`
                            : ''}
                        </p>
                        {buildMapLink(resolvedDetailsRecord.lastSeenLat, resolvedDetailsRecord.lastSeenLng) && (
                          <a
                            href={buildMapLink(resolvedDetailsRecord.lastSeenLat, resolvedDetailsRecord.lastSeenLng) || '#'}
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
        <DialogContent className={isMobile ? "left-0 top-auto bottom-0 max-h-[92vh] max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-t-3xl px-4 pb-8 pt-6" : "sm:max-w-[560px]"}>
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
