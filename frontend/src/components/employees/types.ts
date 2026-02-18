export type EmployeeStatus = 'active' | 'inactive' | 'on-leave' | 'probation';
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'intern';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half-day' | 'holiday' | 'weekend';
export type LeaveType = 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'unpaid' | 'bereavement';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar?: string;
  position: string;
  departmentId: string;
  departmentName: string;
  managerId?: string;
  managerName?: string;
  status: EmployeeStatus;
  employmentType: EmploymentType;
  joinDate: Date;
  salary: number;
  skills: string[];
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  documents: {
    id: string;
    name: string;
    type: string;
    uploadedAt: Date;
  }[];
  performance: {
    rating: number;
    lastReviewDate: Date;
    nextReviewDate: Date;
  };
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  headId?: string;
  headName?: string;
  headAvatar?: string;
  parentDepartmentId?: string;
  employeeCount: number;
  budget: number;
  color: string;
  createdAt: Date;
  isActive: boolean;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar?: string;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
  status: AttendanceStatus;
  workHours: number;
  overtime: number;
  notes?: string;
  location?: string;
  isRemote: boolean;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar?: string;
  employeePosition: string;
  departmentName: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  appliedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  attachments?: string[];
}

export interface LeaveBalance {
  type: LeaveType;
  total: number;
  used: number;
  pending: number;
  available: number;
}

export interface AttendanceSummary {
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  averageWorkHours: number;
  totalOvertime: number;
}