import { format } from 'date-fns';
import { 
  EmployeeStatus, 
  EmploymentType, 
  AttendanceStatus, 
  LeaveType, 
  LeaveStatus,
  Employee,
  AttendanceRecord,
  LeaveBalance
} from './types';

export const getEmployeeStatusConfig = (status: EmployeeStatus) => {
  const configs = {
    active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-500' },
    'on-leave': { label: 'On Leave', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    probation: { label: 'Probation', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  };
  return configs[status];
};

export const getEmploymentTypeConfig = (type: EmploymentType) => {
  const configs = {
    'full-time': { label: 'Full Time', color: 'bg-[#23D3EE]/10 text-[#23D3EE]' },
    'part-time': { label: 'Part Time', color: 'bg-purple-100 text-purple-700' },
    contract: { label: 'Contract', color: 'bg-orange-100 text-orange-700' },
    intern: { label: 'Intern', color: 'bg-pink-100 text-pink-700' },
  };
  return configs[type];
};

export const getAttendanceStatusConfig = (status: AttendanceStatus) => {
  const configs = {
    present: { label: 'Present', color: 'bg-emerald-100 text-emerald-700', icon: '✓' },
    absent: { label: 'Absent', color: 'bg-red-100 text-red-700', icon: '✗' },
    late: { label: 'Late', color: 'bg-amber-100 text-amber-700', icon: '!' },
    'half-day': { label: 'Half Day', color: 'bg-orange-100 text-orange-700', icon: '½' },
    'on-leave': { label: 'On Leave', color: 'bg-blue-100 text-blue-700', icon: '☾' },
    holiday: { label: 'Holiday', color: 'bg-blue-100 text-blue-700', icon: '★' },
    weekend: { label: 'Weekend', color: 'bg-gray-100 text-gray-700', icon: '—' },
  };
  return configs[status];
};

export const getLeaveTypeConfig = (type: LeaveType) => {
  const configs = {
    annual: { label: 'Annual Leave', color: 'bg-[#23D3EE]/10 text-[#23D3EE]', icon: '🌴' },
    sick: { label: 'Sick Leave', color: 'bg-red-100 text-red-700', icon: '🏥' },
    personal: { label: 'Personal Leave', color: 'bg-purple-100 text-purple-700', icon: '👤' },
    maternity: { label: 'Maternity Leave', color: 'bg-pink-100 text-pink-700', icon: '👶' },
    paternity: { label: 'Paternity Leave', color: 'bg-blue-100 text-blue-700', icon: '👨‍👧' },
    unpaid: { label: 'Unpaid Leave', color: 'bg-gray-100 text-gray-700', icon: '📝' },
    bereavement: { label: 'Bereavement', color: 'bg-slate-100 text-slate-700', icon: '🕯️' },
  };
  return configs[type];
};

export const getLeaveStatusConfig = (status: LeaveStatus) => {
  const configs = {
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
    approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
    cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700' },
  };
  return configs[status];
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatWorkHours = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h <= 0 && m > 0) {
    return `${m}m`;
  }
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export const formatMinutesAsDuration = (minutes: number): string => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const h = Math.floor(safeMinutes / 60);
  const m = safeMinutes % 60;

  if (h > 0 && m > 0) {
    return `${h}h ${m}m`;
  }

  if (h > 0) {
    return `${h}h`;
  }

  return `${m}m`;
};

export type AttendanceDailyTotals = {
  workHours: number;
  workMinutes: number;
  breakMinutes: number;
  sessionCount: number;
  firstCheckIn?: Date;
  lastCheckOut?: Date;
};

export const getAttendanceDayKey = (employeeId: string, date: Date): string => (
  `${employeeId}:${format(date, 'yyyy-MM-dd')}`
);

export const buildAttendanceDailyTotals = (records: AttendanceRecord[]): Map<string, AttendanceDailyTotals> => {
  const totals = new Map<string, {
    workMinutes: number;
    breakMinutes: number;
    sessionCount: number;
    firstCheckIn?: Date;
    lastCheckOut?: Date;
  }>();

  records.forEach((record) => {
    if (record.status === 'on-leave') {
      return;
    }

    const key = getAttendanceDayKey(record.employeeId, record.date);
    const existing = totals.get(key) || {
      workMinutes: 0,
      breakMinutes: 0,
      sessionCount: 0,
    };

    existing.workMinutes += Math.max(0, record.workMinutes ?? Math.round(record.workHours * 60));
    existing.breakMinutes += Math.max(0, record.breakMinutes || 0);
    existing.sessionCount += 1;

    if (record.checkIn && (!existing.firstCheckIn || record.checkIn.getTime() < existing.firstCheckIn.getTime())) {
      existing.firstCheckIn = record.checkIn;
    }

    if (record.checkOut && (!existing.lastCheckOut || record.checkOut.getTime() > existing.lastCheckOut.getTime())) {
      existing.lastCheckOut = record.checkOut;
    }

    totals.set(key, existing);
  });

  return new Map(
    [...totals.entries()].map(([key, value]) => [
      key,
      {
        workHours: Math.round((value.workMinutes / 60) * 10) / 10,
        workMinutes: value.workMinutes,
        breakMinutes: value.breakMinutes,
        sessionCount: value.sessionCount,
        firstCheckIn: value.firstCheckIn,
        lastCheckOut: value.lastCheckOut,
      },
    ]),
  );
};

export const calculateLeaveBalance = (
  total: number, 
  used: number, 
  pending: number
): number => {
  return Math.max(0, total - used - pending);
};

export const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

export const calculateAttendancePercentage = (
  presentDays: number, 
  totalWorkingDays: number
): number => {
  if (totalWorkingDays === 0) return 0;
  return Math.round((presentDays / totalWorkingDays) * 100);
};

export const getDaysInMonth = (year: number, month: number): Date[] => {
  const dates: Date[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(new Date(year, month, day));
  }
  
  return dates;
};

export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

export const calculateBusinessDays = (startDate: Date, endDate: Date): number => {
  let count = 0;
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    if (!isWeekend(currentDate)) {
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return count;
};
