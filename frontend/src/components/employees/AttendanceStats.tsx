import React from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  TrendingUp,
  Timer,
  AlertTriangle,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color,
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ y: -2 }}
      className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-6 shadow-sm transition-colors hover:border-[#22D3EE]/30 hover:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[#475569]">{title}</p>
          <p className="text-3xl font-bold text-[#0F172A]">{value}</p>
          {subtitle && (
            <p className="text-sm text-[#475569]">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 text-sm ${
              trend.isPositive ? 'text-emerald-600' : 'text-red-600'
            }`}>
              <TrendingUp className={`w-4 h-4 ${!trend.isPositive && 'rotate-180'}`} />
              <span>{trend.value}% from last week</span>
            </div>
          )}
        </div>
        <div className={`rounded-md p-3 ${color}`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
};

interface AttendanceStatsCardsProps {
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  totalEmployees: number;
  averageCheckIn?: string;
  averageWorkHours?: number;
  overtimeHours?: number;
}

export const AttendanceStatsCards: React.FC<AttendanceStatsCardsProps> = ({
  presentToday,
  absentToday,
  lateToday,
  onLeaveToday,
  totalEmployees,
  averageCheckIn = '9:05 AM',
  averageWorkHours = 8.2,
  overtimeHours = 12.5,
}) => {
  const attendanceRate = totalEmployees > 0 
    ? Math.round((presentToday / totalEmployees) * 100) 
    : 0;

  const stats = [
    {
      title: 'Present Today',
      value: presentToday,
      subtitle: `${attendanceRate}% attendance rate`,
      icon: <UserCheck className="w-6 h-6 text-emerald-600" />,
      color: 'bg-emerald-100',
      trend: { value: 5, isPositive: true },
    },
    {
      title: 'Absent Today',
      value: absentToday,
      icon: <UserX className="w-6 h-6 text-red-600" />,
      color: 'bg-red-100',
    },
    {
      title: 'Late Arrivals',
      value: lateToday,
      subtitle: averageCheckIn ? `Avg check-in: ${averageCheckIn}` : undefined,
      icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
      color: 'bg-amber-100',
    },
    {
      title: 'On Leave',
      value: onLeaveToday,
      icon: <Calendar className="w-6 h-6 text-blue-600" />,
      color: 'bg-blue-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <StatCard key={stat.title} {...stat} delay={index * 0.1} />
      ))}
    </div>
  );
};

interface AttendanceSummaryCardProps {
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  averageWorkHours: number;
  totalOvertime: number;
}

export const AttendanceSummaryCard: React.FC<AttendanceSummaryCardProps> = ({
  totalWorkingDays,
  presentDays,
  absentDays,
  lateDays,
  halfDays,
  averageWorkHours,
  totalOvertime,
}) => {
  const attendanceRate = totalWorkingDays > 0 
    ? Math.round((presentDays / totalWorkingDays) * 100) 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-6 shadow-sm transition-colors hover:border-[#22D3EE]/30"
    >
      <h3 className="text-lg font-semibold text-[#0F172A] mb-6">Monthly Summary</h3>

      {/* Attendance Rate */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[#475569]">Attendance Rate</span>
          <span className="text-2xl font-bold text-[#0891B2]">{attendanceRate}%</span>
        </div>
        <Progress value={attendanceRate} className="h-3" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-md border border-emerald-100 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-[#475569]">Present</span>
          </div>
          <p className="text-xl font-bold text-[#0F172A]">{presentDays} days</p>
        </div>

        <div className="rounded-md border border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <UserX className="w-4 h-4 text-red-600" />
            <span className="text-xs text-[#475569]">Absent</span>
          </div>
          <p className="text-xl font-bold text-[#0F172A]">{absentDays} days</p>
        </div>

        <div className="rounded-md border border-amber-100 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-[#475569]">Late</span>
          </div>
          <p className="text-xl font-bold text-[#0F172A]">{lateDays} days</p>
        </div>

        <div className="rounded-md border border-orange-100 bg-orange-50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="w-4 h-4 text-orange-600" />
            <span className="text-xs text-[#475569]">Half Days</span>
          </div>
          <p className="text-xl font-bold text-[#0F172A]">{halfDays} days</p>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="mt-6 pt-6 border-t border-[rgba(15,23,42,0.06)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#475569]">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Average Work Hours</span>
          </div>
          <span className="font-semibold text-[#0F172A]">{averageWorkHours.toFixed(1)}h / day</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#475569]">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Total Overtime</span>
          </div>
          <span className="font-semibold text-[#0891B2]">+{totalOvertime.toFixed(1)}h</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#475569]">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Working Days</span>
          </div>
          <span className="font-semibold text-[#0F172A]">{totalWorkingDays} days</span>
        </div>
      </div>
    </motion.div>
  );
};

// Re-export for backwards compatibility with the combined stats component
export const AttendanceStats: React.FC<{
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  averageCheckIn: string;
  attendanceRate: number;
}> = ({
  presentToday,
  absentToday,
  lateToday,
  onLeaveToday,
  averageCheckIn,
  attendanceRate,
}) => {
  return (
    <AttendanceStatsCards
      presentToday={presentToday}
      absentToday={absentToday}
      lateToday={lateToday}
      onLeaveToday={onLeaveToday}
      totalEmployees={presentToday + absentToday + lateToday + onLeaveToday}
      averageCheckIn={averageCheckIn}
    />
  );
};
