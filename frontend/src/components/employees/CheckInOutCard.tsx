import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  Coffee, 
  Play, 
  Home,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface CheckInOutCardProps {
  isCheckedIn: boolean;
  checkInTime?: Date;
  workedHours?: number;
  breakMinutes?: number;
  onCheckIn: (isRemote: boolean) => void;
  onCheckOut: () => void;
  onBreakStart?: () => void;
  onBreakEnd?: () => void;
  isOnBreak?: boolean;
  isLoading?: boolean;
}

export const CheckInOutCard: React.FC<CheckInOutCardProps> = ({
  isCheckedIn,
  checkInTime,
  workedHours = 0,
  breakMinutes = 0,
  onCheckIn,
  onCheckOut,
  onBreakStart,
  onBreakEnd,
  isOnBreak = false,
  isLoading = false,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRemote, setIsRemote] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [breakDuration, setBreakDuration] = useState('0m');
  const [syncedAt, setSyncedAt] = useState(new Date());

  useEffect(() => {
    setSyncedAt(new Date());
  }, [breakMinutes, isCheckedIn, isOnBreak, workedHours]);

  useEffect(() => {
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

    const tick = () => {
      const now = new Date();
      setCurrentTime(now);

      const baseWorkedMs = Math.max(0, workedHours) * 60 * 60 * 1000;
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

    const timer = setInterval(() => {
      tick();
    }, 1000);

    return () => clearInterval(timer);
  }, [breakMinutes, checkInTime, isCheckedIn, isOnBreak, syncedAt, workedHours]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div 
        className={`p-6 ${
          isCheckedIn 
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' 
            : 'bg-gradient-to-r from-slate-50 to-slate-100'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-semibold ${isCheckedIn ? 'text-white' : 'text-[#0F172A]'}`}>
            {isCheckedIn ? 'Currently Working' : 'Not Checked In'}
          </h3>
          {isCheckedIn && (
            <Badge className="bg-white/20 text-white border-0">
              {isOnBreak ? 'On Break' : 'Active'}
            </Badge>
          )}
        </div>
        
        <div className={`text-4xl font-mono font-bold ${isCheckedIn ? 'text-white' : 'text-[#0F172A]'}`}>
          {isCheckedIn ? elapsedTime : format(currentTime, 'HH:mm:ss')}
        </div>

        <p className={`text-sm mt-2 ${isCheckedIn ? 'text-white/80' : 'text-[#475569]'}`}>
          {isCheckedIn ? 'Net worked time for today' : format(currentTime, 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Actions */}
      <div className="p-6 space-y-4">
        {(workedHours > 0 || breakMinutes > 0 || isCheckedIn) && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-[#64748B]">Worked Today</p>
              <p className="mt-1 font-semibold text-[#0F172A]">{elapsedTime}</p>
            </div>
            <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-[#64748B]">Break Time</p>
              <p className="mt-1 font-semibold text-[#0F172A]">{breakDuration}</p>
            </div>
          </div>
        )}

        {!isCheckedIn ? (
          <>
            {/* Remote Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
              <div className="flex items-center gap-2">
                {isRemote ? (
                  <Home className="w-5 h-5 text-blue-500" />
                ) : (
                  <Building2 className="w-5 h-5 text-[#475569]" />
                )}
                <Label htmlFor="remote-toggle" className="text-sm text-[#0F172A]">
                  {isRemote ? 'Working Remotely' : 'Working from Office'}
                </Label>
              </div>
              <Switch
                id="remote-toggle"
                checked={isRemote}
                onCheckedChange={setIsRemote}
                disabled={isLoading}
              />
            </div>

            {/* Check In Button */}
            <Button
              onClick={() => onCheckIn(isRemote)}
              disabled={isLoading}
              className="w-full h-14 text-lg bg-[#0891B2] hover:bg-[#0891B2]/90 text-white "
            >
              <LogIn className="w-5 h-5 mr-2" />
              {isLoading ? 'Saving...' : 'Check In'}
            </Button>
          </>
        ) : (
          <>
            {/* Check In Info */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
              <div className="flex items-center gap-2 text-[#475569]">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Checked in at</span>
              </div>
              <span className="font-medium text-[#0F172A]">
                {checkInTime && format(checkInTime, 'h:mm a')}
              </span>
            </div>

            {/* Break Button */}
            <Button
              variant="outline"
              onClick={isOnBreak ? onBreakEnd : onBreakStart}
              disabled={isLoading}
              className={`w-full ${isOnBreak ? 'border-amber-300 bg-amber-50 text-amber-700' : ''}`}
            >
              {isOnBreak ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  {isLoading ? 'Saving...' : 'End Break'}
                </>
              ) : (
                <>
                  <Coffee className="w-4 h-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Take a Break'}
                </>
              )}
            </Button>

            {/* Check Out Button */}
            <Button
              onClick={onCheckOut}
              variant="destructive"
              disabled={isLoading}
              className="w-full h-14 text-lg"
            >
              <LogOut className="w-5 h-5 mr-2" />
              {isLoading ? 'Saving...' : 'Check Out'}
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
};
