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
    'full-time': { label: 'Full Time', color: 'bg-[#17C3B2]/10 text-[#17C3B2]' },
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
    holiday: { label: 'Holiday', color: 'bg-blue-100 text-blue-700', icon: '★' },
    weekend: { label: 'Weekend', color: 'bg-gray-100 text-gray-700', icon: '—' },
  };
  return configs[status];
};

export const getLeaveTypeConfig = (type: LeaveType) => {
  const configs = {
    annual: { label: 'Annual Leave', color: 'bg-[#17C3B2]/10 text-[#17C3B2]', icon: '🌴' },
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
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
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