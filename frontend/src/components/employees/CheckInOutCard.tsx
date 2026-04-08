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
      className="overflow-hidden rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-white shadow-[0_22px_70px_-40px_rgba(15,23,42,0.45)]"
    >
      <div
        className={`border-b border-white/10 px-6 py-6 ${
          isCheckedIn
            ? 'bg-[linear-gradient(135deg,#0f766e_0%,#10b981_55%,#34d399_100%)]'
            : 'bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_60%,#334155_100%)]'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Attendance</p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              {isCheckedIn ? 'Currently Working' : 'Ready to Start'}
            </h3>
          </div>
          <Badge className={`border-0 ${isCheckedIn ? 'bg-white/18 text-white' : 'bg-white/12 text-white'}`}>
            {isCheckedIn ? (isOnBreak ? 'On Break' : 'Live') : 'Offline'}
          </Badge>
        </div>

        <div className="mt-5 text-4xl font-semibold tracking-tight text-white">
          {isCheckedIn ? elapsedTime : format(currentTime, 'HH:mm:ss')}
        </div>
        <p className="mt-2 text-sm text-white/72">
          {isCheckedIn ? 'Net worked time for today' : format(currentTime, 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      <div className="space-y-5 p-6">
        {(workedHours > 0 || breakMinutes > 0 || isCheckedIn) && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-[#F8FAFC] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#64748B]">Worked Today</p>
              <p className="mt-2 font-mono text-lg font-semibold text-[#0F172A]">{elapsedTime}</p>
            </div>
            <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-[#F8FAFC] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#64748B]">Break Time</p>
              <p className="mt-2 font-semibold text-[#0F172A]">{breakDuration}</p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-[#E0F2FE] p-2 text-[#0369A1]">
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
                variant="ghost"
                size="sm"
                onClick={onRefreshLocation}
                disabled={isLoading}
                className="h-8 rounded-full px-3 text-[#475569]"
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {locationState?.coordinatesLabel && (
              <div className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white/90 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[#64748B]">Current Coordinates</p>
                <p className="mt-1 font-medium text-[#0F172A]">{locationState.coordinatesLabel}</p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white/90 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[#64748B]">GPS Accuracy</p>
                <p className="mt-1 font-medium text-[#0F172A]">{locationState?.accuracyLabel || 'Waiting for device fix'}</p>
              </div>
              <div className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white/90 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[#64748B]">Captured</p>
                <p className="mt-1 font-medium text-[#0F172A]">
                  {locationState?.capturedAt
                    ? `${format(locationState.capturedAt, 'h:mm a')} · ${formatDistanceToNow(locationState.capturedAt, { addSuffix: true })}`
                    : 'No live fix yet'}
                </p>
              </div>
            </div>

            {isCheckedIn && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
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
                className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                  !isRemote
                    ? 'border-[#0891B2] bg-[#E0F2FE] text-[#0C4A6E]'
                    : 'border-[rgba(15,23,42,0.08)] bg-white text-[#475569]'
                }`}
              >
                <Building2 className="mb-3 h-5 w-5" />
                <p className="font-semibold">Office</p>
                <p className="mt-1 text-sm">Use on-site attendance with your live device location.</p>
              </button>
              <button
                type="button"
                onClick={() => setIsRemote(true)}
                className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                  isRemote
                    ? 'border-[#0891B2] bg-[#E0F2FE] text-[#0C4A6E]'
                    : 'border-[rgba(15,23,42,0.08)] bg-white text-[#475569]'
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
              className="h-14 w-full rounded-2xl bg-[#0891B2] text-base text-white hover:bg-[#0891B2]/92"
            >
              <LogIn className="mr-2 h-5 w-5" />
              {isLoading ? 'Saving Attendance...' : `Check In ${isRemote ? 'Remotely' : 'From Office'}`}
            </Button>

            <div className={`rounded-2xl px-4 py-3 text-sm ${
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
            <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-[#F8FAFC] px-4 py-3">
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
              className={`h-12 w-full rounded-2xl ${
                isOnBreak ? 'border-amber-300 bg-amber-50 text-amber-700' : ''
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
              className="h-14 w-full rounded-2xl text-base"
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
