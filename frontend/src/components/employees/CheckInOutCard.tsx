import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  MapPin, 
  Coffee, 
  Play, 
  Pause,
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
  onCheckIn: (isRemote: boolean) => void;
  onCheckOut: () => void;
  onBreakStart?: () => void;
  onBreakEnd?: () => void;
  isOnBreak?: boolean;
}

export const CheckInOutCard: React.FC<CheckInOutCardProps> = ({
  isCheckedIn,
  checkInTime,
  onCheckIn,
  onCheckOut,
  onBreakStart,
  onBreakEnd,
  isOnBreak = false,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRemote, setIsRemote] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      
      if (isCheckedIn && checkInTime) {
        const diff = new Date().getTime() - checkInTime.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isCheckedIn, checkInTime]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div 
        className={`p-6 ${
          isCheckedIn 
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' 
            : 'bg-gradient-to-r from-gray-100 to-gray-200'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-semibold ${isCheckedIn ? 'text-white' : 'text-gray-700'}`}>
            {isCheckedIn ? 'Currently Working' : 'Not Checked In'}
          </h3>
          {isCheckedIn && (
            <Badge className="bg-white/20 text-white border-0">
              {isOnBreak ? 'On Break' : 'Active'}
            </Badge>
          )}
        </div>
        
        <div className={`text-4xl font-mono font-bold ${isCheckedIn ? 'text-white' : 'text-gray-400'}`}>
          {isCheckedIn ? elapsedTime : format(currentTime, 'HH:mm:ss')}
        </div>
        
        <p className={`text-sm mt-2 ${isCheckedIn ? 'text-white/80' : 'text-gray-500'}`}>
          {format(currentTime, 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Actions */}
      <div className="p-6 space-y-4">
        {!isCheckedIn ? (
          <>
            {/* Remote Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                {isRemote ? (
                  <Home className="w-5 h-5 text-blue-500" />
                ) : (
                  <Building2 className="w-5 h-5 text-gray-500" />
                )}
                <Label htmlFor="remote-toggle" className="text-sm text-gray-700">
                  {isRemote ? 'Working Remotely' : 'Working from Office'}
                </Label>
              </div>
              <Switch
                id="remote-toggle"
                checked={isRemote}
                onCheckedChange={setIsRemote}
              />
            </div>

            {/* Check In Button */}
            <Button
              onClick={() => onCheckIn(isRemote)}
              className="w-full h-14 text-lg bg-[#17C3B2] hover:bg-[#17C3B2]/90 text-white shadow-lg shadow-[#17C3B2]/20"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Check In
            </Button>
          </>
        ) : (
          <>
            {/* Check In Info */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Checked in at</span>
              </div>
              <span className="font-medium text-gray-900">
                {checkInTime && format(checkInTime, 'h:mm a')}
              </span>
            </div>

            {/* Break Button */}
            <Button
              variant="outline"
              onClick={isOnBreak ? onBreakEnd : onBreakStart}
              className={`w-full ${isOnBreak ? 'border-amber-300 bg-amber-50 text-amber-700' : ''}`}
            >
              {isOnBreak ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  End Break
                </>
              ) : (
                <>
                  <Coffee className="w-4 h-4 mr-2" />
                  Take a Break
                </>
              )}
            </Button>

            {/* Check Out Button */}
            <Button
              onClick={onCheckOut}
              variant="destructive"
              className="w-full h-14 text-lg"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Check Out
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
};