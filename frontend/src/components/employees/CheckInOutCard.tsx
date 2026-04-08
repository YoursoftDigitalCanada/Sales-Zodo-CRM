import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  Building2,
  Clock,
  Coffee,
  Crosshair,
  Home,
  LogIn,
  LogOut,
  Play,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type LocationState = {
  status: 'idle' | 'locating' | 'ready' | 'error';
  coordinatesLabel?: string | null;
  accuracyLabel?: string | null;
  accuracyMeters?: number | null;
  capturedAt?: Date | null;
  errorMessage?: string | null;
  isAccurate?: boolean;
  attendanceSyncAt?: Date | null;
  recordedLocationLabel?: string | null;
  recordedAccuracyLabel?: string | null;
};

interface CheckInOutCardProps {
  isCheckedIn: boolean;
  checkInTime?: Date;
  workedHours?: number;
  workedMinutes?: number;
  breakMinutes?: number;
  onCheckIn: (isRemote: boolean) => void;
  onCheckOut: () => void;
  onBreakStart?: () => void;
  onBreakEnd?: () => void;
  onRefreshLocation?: () => void;
  isOnBreak?: boolean;
  isLoading?: boolean;
  locationState?: LocationState;
}

const formatClockDuration = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatMinuteDuration = (milliseconds: number) => {
  const totalMinutes = Math.max(0, Math.round(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
};

const getLocationSummary = (locationState?: LocationState) => {
  if (!locationState) {
    return {
      title: 'Location not loaded yet',
      tone: 'text-[#64748B]',
      badge: null as React.ReactNode,
    };
  }

  if (locationState.status === 'locating') {
    return {
      title: 'Finding your current location',
      tone: 'text-[#475569]',
      badge: <Badge className="border-0 bg-[#E2E8F0] text-[#334155]">Locating</Badge>,
    };
  }

  if (locationState.status === 'error') {
    return {
      title: locationState.errorMessage || 'Location is unavailable',
      tone: 'text-[#B45309]',
      badge: <Badge className="border-0 bg-amber-100 text-amber-700">Needs Attention</Badge>,
    };
  }

  if (locationState.status === 'ready') {
    return {
      title: locationState.isAccurate ? 'Precise location ready' : 'Location found, but accuracy is weak',
      tone: locationState.isAccurate ? 'text-emerald-700' : 'text-[#B45309]',
      badge: locationState.isAccurate
        ? <Badge className="border-0 bg-emerald-100 text-emerald-700">Verified</Badge>
        : <Badge className="border-0 bg-amber-100 text-amber-700">Low Precision</Badge>,
    };
  }

  return {
    title: 'Location not loaded yet',
    tone: 'text-[#64748B]',
    badge: null as React.ReactNode,
  };
};

export const CheckInOutCard: React.FC<CheckInOutCardProps> = ({
  isCheckedIn,
  checkInTime,
  workedHours = 0,
  workedMinutes,
  breakMinutes = 0,
  onCheckIn,
  onCheckOut,
  onBreakStart,
  onBreakEnd,
  onRefreshLocation,
  isOnBreak = false,
  isLoading = false,
  locationState,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRemote, setIsRemote] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [breakDuration, setBreakDuration] = useState('0m');
  const [syncedAt, setSyncedAt] = useState(new Date());

  useEffect(() => {
    setSyncedAt(new Date());
  }, [breakMinutes, isCheckedIn, isOnBreak, workedHours, workedMinutes]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(now);

      const baseWorkedMs = typeof workedMinutes === 'number'
        ? Math.max(0, workedMinutes) * 60 * 1000
        : Math.max(0, workedHours) * 60 * 60 * 1000;
      const baseBreakMs = Math.max(0, breakMinutes) * 60 * 1000;

      if (!isCheckedIn) {
        setElapsedTime(formatClockDuration(baseWorkedMs));
        setBreakDuration(formatMinuteDuration(baseBreakMs));
        return;
      }

      const elapsedSinceSyncMs = Math.max(0, now.getTime() - syncedAt.getTime());
      const liveWorkedMs = isOnBreak ? baseWorkedMs : baseWorkedMs + elapsedSinceSyncMs;
      const liveBreakMs = isOnBreak ? baseBreakMs + elapsedSinceSyncMs : baseBreakMs;

      setElapsedTime(formatClockDuration(liveWorkedMs));
      setBreakDuration(formatMinuteDuration(liveBreakMs));
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [breakMinutes, isCheckedIn, isOnBreak, syncedAt, workedHours, workedMinutes]);

  const locationSummary = getLocationSummary(locationState);
  const canCheckIn = !isLoading && locationState?.status === 'ready' && locationState.isAccurate === true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-md border border-[rgba(15,23,42,0.06)] bg-white shadow-sm transition-colors hover:border-[#22D3EE]/30"
    >
      <div className="border-b border-[rgba(15,23,42,0.06)] bg-[#FCFEFF] px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${
              isCheckedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-[#E0F2FE] text-[#0891B2]'
            }`}>
              {isCheckedIn ? <Clock className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#64748B]">Attendance</p>
              <h3 className="mt-2 text-xl font-semibold text-[#0F172A]">
                {isCheckedIn ? 'Currently Working' : 'Ready to Start'}
              </h3>
              <p className="mt-1 text-sm text-[#475569]">
                {isCheckedIn
                  ? 'Your workday stays visible here with the latest timing and location details.'
                  : 'Use your live device location to start a trusted attendance entry.'}
              </p>
            </div>
          </div>
          <Badge className={`border-0 ${
            isCheckedIn
              ? (isOnBreak ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')
              : 'bg-slate-100 text-slate-700'
          }`}>
            {isCheckedIn ? (isOnBreak ? 'On Break' : 'Live') : 'Offline'}
          </Badge>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)_minmax(0,0.85fr)]">
          <div className="min-w-0 rounded-md border border-[rgba(15,23,42,0.06)] bg-white px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[#94A3B8]">
              {isCheckedIn ? 'Live Timer' : 'Current Time'}
            </p>
            <div className="mt-2 overflow-hidden text-ellipsis font-mono text-2xl font-semibold tracking-tight text-[#0F172A] sm:text-3xl">
              {isCheckedIn ? elapsedTime : format(currentTime, 'HH:mm:ss')}
            </div>
            <p className="mt-2 break-words text-sm text-[#475569]">
              {isCheckedIn ? 'Net worked time for today' : format(currentTime, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="min-w-0 rounded-md border border-[rgba(15,23,42,0.06)] bg-white px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[#94A3B8]">Worked Today</p>
            <p className="mt-2 overflow-hidden text-ellipsis font-mono text-lg font-semibold text-[#0F172A]">{elapsedTime}</p>
            <p className="mt-2 break-words text-sm text-[#475569]">
              {checkInTime ? `Checked in at ${format(checkInTime, 'h:mm a')}` : 'No check-in recorded yet'}
            </p>
          </div>
          <div className="min-w-0 rounded-md border border-[rgba(15,23,42,0.06)] bg-white px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[#94A3B8]">Break Time</p>
            <p className="mt-2 text-lg font-semibold text-[#0F172A]">{breakDuration}</p>
            <p className="mt-2 break-words text-sm leading-6 text-[#475569]">
              {isOnBreak ? 'Break is running right now' : 'Break time is excluded from total work hours'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#FCFEFF] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-[#E0F2FE] p-2 text-[#0369A1]">
                <Crosshair className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Location Capture</p>
                <p className={`mt-1 text-sm ${locationSummary.tone}`}>{locationSummary.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {locationSummary.badge}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRefreshLocation}
                disabled={isLoading}
                className="h-8 rounded-md border-[rgba(15,23,42,0.08)] bg-white px-3 text-[#475569] hover:bg-[#F8FAFC]"
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {locationState?.coordinatesLabel && (
              <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[#64748B]">Current Coordinates</p>
                <p className="mt-1 font-medium text-[#0F172A]">{locationState.coordinatesLabel}</p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[#64748B]">GPS Accuracy</p>
                <p className="mt-1 font-medium text-[#0F172A]">{locationState?.accuracyLabel || 'Waiting for device fix'}</p>
              </div>
              <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[#64748B]">Captured</p>
                <p className="mt-1 font-medium text-[#0F172A]">
                  {locationState?.capturedAt
                    ? `${format(locationState.capturedAt, 'h:mm a')} · ${formatDistanceToNow(locationState.capturedAt, { addSuffix: true })}`
                    : 'No live fix yet'}
                </p>
              </div>
            </div>

            {isCheckedIn && (
              <div className="rounded-md border border-emerald-100 bg-emerald-50 px-4 py-3">
                <div className="flex items-center gap-2 text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                  <p className="text-sm font-medium">
                    {locationState?.attendanceSyncAt
                      ? `Attendance location synced ${formatDistanceToNow(locationState.attendanceSyncAt, { addSuffix: true })}`
                      : 'Attendance location will sync while you are checked in'}
                  </p>
                </div>
                {locationState?.recordedLocationLabel && (
                  <p className="mt-2 text-sm text-emerald-800">
                    Start location: {locationState.recordedLocationLabel}
                    {locationState.recordedAccuracyLabel ? ` · ${locationState.recordedAccuracyLabel}` : ''}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {!isCheckedIn ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsRemote(false)}
                className={`rounded-md border px-4 py-4 text-left transition-all ${
                  !isRemote
                    ? 'border-[#22D3EE] bg-[#0891B2]/5 text-[#0C4A6E] shadow-sm'
                    : 'border-[rgba(15,23,42,0.08)] bg-white text-[#475569] hover:border-[#22D3EE]/30'
                }`}
              >
                <Building2 className="mb-3 h-5 w-5" />
                <p className="font-semibold">Office</p>
                <p className="mt-1 text-sm">Use on-site attendance with your live device location.</p>
              </button>
              <button
                type="button"
                onClick={() => setIsRemote(true)}
                className={`rounded-md border px-4 py-4 text-left transition-all ${
                  isRemote
                    ? 'border-[#22D3EE] bg-[#0891B2]/5 text-[#0C4A6E] shadow-sm'
                    : 'border-[rgba(15,23,42,0.08)] bg-white text-[#475569] hover:border-[#22D3EE]/30'
                }`}
              >
                <Home className="mb-3 h-5 w-5" />
                <p className="font-semibold">Remote</p>
                <p className="mt-1 text-sm">Save a verified remote start point for the day.</p>
              </button>
            </div>

            <Button
              onClick={() => onCheckIn(isRemote)}
              disabled={!canCheckIn}
              className="h-12 w-full rounded-md bg-[#0891B2] text-base text-white hover:bg-[#0891B2]/92"
            >
              <LogIn className="mr-2 h-5 w-5" />
              {isLoading ? 'Saving Attendance...' : `Check In ${isRemote ? 'Remotely' : 'From Office'}`}
            </Button>

            <div className={`rounded-md px-4 py-3 text-sm ${
              canCheckIn ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
            }`}>
              <div className="flex items-start gap-2">
                {canCheckIn ? <ShieldCheck className="mt-0.5 h-4 w-4" /> : <AlertTriangle className="mt-0.5 h-4 w-4" />}
                <p>
                  {canCheckIn
                    ? 'Your current device location is precise enough to create a trusted attendance record.'
                    : locationState?.status === 'error'
                      ? locationState.errorMessage || 'Allow location access, then refresh to continue.'
                      : 'Wait for a more precise device location, then check in.'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#FCFEFF] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[#475569]">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Checked in at</span>
                </div>
                <span className="font-medium text-[#0F172A]">
                  {checkInTime ? format(checkInTime, 'h:mm a') : '—'}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={isOnBreak ? onBreakEnd : onBreakStart}
              disabled={isLoading}
              className={`h-12 w-full rounded-md ${
                isOnBreak ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-50' : 'bg-white'
              }`}
            >
              {isOnBreak ? (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  {isLoading ? 'Saving...' : 'End Break'}
                </>
              ) : (
                <>
                  <Coffee className="mr-2 h-4 w-4" />
                  {isLoading ? 'Saving...' : 'Take a Break'}
                </>
              )}
            </Button>

            <Button
              onClick={onCheckOut}
              variant="destructive"
              disabled={isLoading}
              className="h-12 w-full rounded-md text-base"
            >
              <LogOut className="mr-2 h-5 w-5" />
              {isLoading ? 'Saving Attendance...' : 'Check Out'}
            </Button>

            <p className="text-sm text-[#64748B]">
              Check out will capture your latest device location before saving the final attendance record.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
