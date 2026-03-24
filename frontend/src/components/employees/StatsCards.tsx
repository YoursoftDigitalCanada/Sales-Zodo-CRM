import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  Building2, 
  TrendingUp,
  Calendar,
  AlertCircle
} from 'lucide-react';

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
      className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-6 shadow-sm"
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
              <span>{trend.value}% from last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-md ${color}`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
};

interface EmployeeStatsProps {
  totalEmployees: number;
  activeEmployees: number;
  onLeave: number;
  newHires: number;
}

export const EmployeeStats: React.FC<EmployeeStatsProps> = ({
  totalEmployees,
  activeEmployees,
  onLeave,
  newHires,
}) => {
  const activePercentage = totalEmployees > 0
    ? Math.round((activeEmployees / totalEmployees) * 100)
    : 0;

  const stats = [
    {
      title: 'Total Employees',
      value: totalEmployees,
      icon: <Users className="w-6 h-6 text-[#0891B2]" />,
      color: 'bg-[#0891B2]/10',
      trend: { value: 12, isPositive: true },
    },
    {
      title: 'Active Employees',
      value: activeEmployees,
      subtitle: `${activePercentage}% of total`,
      icon: <UserCheck className="w-6 h-6 text-emerald-600" />,
      color: 'bg-emerald-100',
    },
    {
      title: 'On Leave',
      value: onLeave,
      icon: <Calendar className="w-6 h-6 text-amber-600" />,
      color: 'bg-amber-100',
    },
    {
      title: 'New Hires (This Month)',
      value: newHires,
      icon: <TrendingUp className="w-6 h-6 text-blue-600" />,
      color: 'bg-blue-100',
      trend: { value: 25, isPositive: true },
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

interface DepartmentStatsProps {
  totalDepartments: number;
  totalEmployees: number;
  totalBudget: number;
  activeManagers: number;
}

export const DepartmentStats: React.FC<DepartmentStatsProps> = ({
  totalDepartments,
  totalEmployees,
  totalBudget,
  activeManagers,
}) => {
  const stats = [
    {
      title: 'Total Departments',
      value: totalDepartments,
      icon: <Building2 className="w-6 h-6 text-[#0891B2]" />,
      color: 'bg-[#0891B2]/10',
    },
    {
      title: 'Total Employees',
      value: totalEmployees,
      icon: <Users className="w-6 h-6 text-blue-600" />,
      color: 'bg-blue-100',
    },
    {
      title: 'Total Budget',
      value: `$${(totalBudget / 1000000).toFixed(1)}M`,
      icon: <TrendingUp className="w-6 h-6 text-emerald-600" />,
      color: 'bg-emerald-100',
    },
    {
      title: 'Department Heads',
      value: activeManagers,
      icon: <UserCheck className="w-6 h-6 text-purple-600" />,
      color: 'bg-purple-100',
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

interface AttendanceStatsProps {
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  averageCheckIn: string;
  attendanceRate: number;
}

export const AttendanceStats: React.FC<AttendanceStatsProps> = ({
  presentToday,
  absentToday,
  lateToday,
  onLeaveToday,
  averageCheckIn,
  attendanceRate,
}) => {
  const stats = [
    {
      title: 'Present Today',
      value: presentToday,
      subtitle: `${attendanceRate}% attendance rate`,
      icon: <UserCheck className="w-6 h-6 text-emerald-600" />,
      color: 'bg-emerald-100',
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
      icon: <Clock className="w-6 h-6 text-amber-600" />,
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

interface LeaveStatsProps {
  pendingRequests: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  employeesOnLeave: number;
}

export const LeaveStats: React.FC<LeaveStatsProps> = ({
  pendingRequests,
  approvedThisMonth,
  rejectedThisMonth,
  employeesOnLeave,
}) => {
  const stats = [
    {
      title: 'Pending Requests',
      value: pendingRequests,
      icon: <AlertCircle className="w-6 h-6 text-amber-600" />,
      color: 'bg-amber-100',
    },
    {
      title: 'Approved This Month',
      value: approvedThisMonth,
      icon: <UserCheck className="w-6 h-6 text-emerald-600" />,
      color: 'bg-emerald-100',
    },
    {
      title: 'Rejected This Month',
      value: rejectedThisMonth,
      icon: <UserX className="w-6 h-6 text-red-600" />,
      color: 'bg-red-100',
    },
    {
      title: 'Currently On Leave',
      value: employeesOnLeave,
      icon: <Calendar className="w-6 h-6 text-[#0891B2]" />,
      color: 'bg-[#0891B2]/10',
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
