import { 
  Employee, 
  Department, 
  AttendanceRecord, 
  AttendanceStatus,
  LeaveRequest, 
  LeaveBalance 
} from './types';
import { subDays, addDays, setHours, setMinutes } from 'date-fns';

const deterministicRandom = (seed: number): number => {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
};

const getEmployeeAttendanceSeed = (employeeId: string, dayOffset: number): number => (
  employeeId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) + dayOffset * 97
);

export const mockDepartments: Department[] = [
  {
    id: 'dept-1',
    name: 'Engineering',
    code: 'ENG',
    description: 'Software development and technical operations',
    headId: 'emp-1',
    headName: 'John Smith',
    headAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    employeeCount: 24,
    budget: 2500000,
    color: '#23D3EE',
    createdAt: new Date('2020-01-15'),
    isActive: true,
  },
  {
    id: 'dept-2',
    name: 'Design',
    code: 'DSN',
    description: 'UI/UX design and creative services',
    headId: 'emp-5',
    headName: 'Emily Davis',
    headAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    employeeCount: 12,
    budget: 800000,
    color: '#8B5CF6',
    createdAt: new Date('2020-02-01'),
    isActive: true,
  },
  {
    id: 'dept-3',
    name: 'Marketing',
    code: 'MKT',
    description: 'Brand management and digital marketing',
    headId: 'emp-8',
    headName: 'Michael Brown',
    headAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    employeeCount: 15,
    budget: 1200000,
    color: '#F59E0B',
    createdAt: new Date('2020-01-20'),
    isActive: true,
  },
  {
    id: 'dept-4',
    name: 'Human Resources',
    code: 'HR',
    description: 'Talent acquisition and employee relations',
    headId: 'emp-12',
    headName: 'Sarah Wilson',
    headAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    employeeCount: 8,
    budget: 500000,
    color: '#EC4899',
    createdAt: new Date('2020-01-10'),
    isActive: true,
  },
  {
    id: 'dept-5',
    name: 'Finance',
    code: 'FIN',
    description: 'Financial planning and accounting',
    headId: 'emp-15',
    headName: 'Robert Johnson',
    headAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    employeeCount: 10,
    budget: 600000,
    color: '#10B981',
    createdAt: new Date('2020-01-12'),
    isActive: true,
  },
  {
    id: 'dept-6',
    name: 'Sales',
    code: 'SLS',
    description: 'Business development and client relations',
    headId: 'emp-18',
    headName: 'Jennifer Lee',
    headAvatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop',
    employeeCount: 20,
    budget: 1800000,
    color: '#FBBF23',
    createdAt: new Date('2020-02-05'),
    isActive: true,
  },
];

export const mockEmployees: Employee[] = [
  {
    id: 'emp-1',
    employeeId: 'EMP001',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@company.com',
    phone: '+1 (555) 123-4567',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    position: 'Engineering Manager',
    departmentId: 'dept-1',
    departmentName: 'Engineering',
    status: 'active',
    employmentType: 'full-time',
    joinDate: new Date('2019-03-15'),
    salary: 145000,
    skills: ['React', 'TypeScript', 'Node.js', 'AWS', 'Leadership'],
    address: {
      street: '123 Tech Lane',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      country: 'USA',
    },
    emergencyContact: {
      name: 'Jane Smith',
      relationship: 'Spouse',
      phone: '+1 (555) 123-4568',
    },
    documents: [
      { id: 'doc-1', name: 'Resume.pdf', type: 'resume', uploadedAt: new Date('2019-03-10') },
      { id: 'doc-2', name: 'Contract.pdf', type: 'contract', uploadedAt: new Date('2019-03-15') },
    ],
    performance: {
      rating: 4.8,
      lastReviewDate: new Date('2024-01-15'),
      nextReviewDate: new Date('2024-07-15'),
    },
  },
  {
    id: 'emp-2',
    employeeId: 'EMP002',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@company.com',
    phone: '+1 (555) 234-5678',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    position: 'Senior Developer',
    departmentId: 'dept-1',
    departmentName: 'Engineering',
    managerId: 'emp-1',
    managerName: 'John Smith',
    status: 'active',
    employmentType: 'full-time',
    joinDate: new Date('2020-06-01'),
    salary: 120000,
    skills: ['React', 'Vue.js', 'Python', 'PostgreSQL'],
    address: {
      street: '456 Code Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94107',
      country: 'USA',
    },
    emergencyContact: {
      name: 'Mike Johnson',
      relationship: 'Brother',
      phone: '+1 (555) 234-5679',
    },
    documents: [],
    performance: {
      rating: 4.5,
      lastReviewDate: new Date('2024-02-01'),
      nextReviewDate: new Date('2024-08-01'),
    },
  },
  {
    id: 'emp-3',
    employeeId: 'EMP003',
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'michael.chen@company.com',
    phone: '+1 (555) 345-6789',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    position: 'Frontend Developer',
    departmentId: 'dept-1',
    departmentName: 'Engineering',
    managerId: 'emp-1',
    managerName: 'John Smith',
    status: 'on-leave',
    employmentType: 'full-time',
    joinDate: new Date('2021-09-15'),
    salary: 95000,
    skills: ['React', 'TypeScript', 'CSS', 'Figma'],
    address: {
      street: '789 Dev Avenue',
      city: 'Oakland',
      state: 'CA',
      zipCode: '94612',
      country: 'USA',
    },
    emergencyContact: {
      name: 'Lisa Chen',
      relationship: 'Mother',
      phone: '+1 (555) 345-6780',
    },
    documents: [],
    performance: {
      rating: 4.2,
      lastReviewDate: new Date('2024-01-20'),
      nextReviewDate: new Date('2024-07-20'),
    },
  },
  {
    id: 'emp-4',
    employeeId: 'EMP004',
    firstName: 'Emily',
    lastName: 'Davis',
    email: 'emily.davis@company.com',
    phone: '+1 (555) 456-7890',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    position: 'Design Lead',
    departmentId: 'dept-2',
    departmentName: 'Design',
    status: 'active',
    employmentType: 'full-time',
    joinDate: new Date('2019-08-01'),
    salary: 125000,
    skills: ['Figma', 'Sketch', 'Adobe XD', 'UI/UX', 'Leadership'],
    address: {
      street: '321 Creative Blvd',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94108',
      country: 'USA',
    },
    emergencyContact: {
      name: 'Tom Davis',
      relationship: 'Spouse',
      phone: '+1 (555) 456-7891',
    },
    documents: [],
    performance: {
      rating: 4.7,
      lastReviewDate: new Date('2024-02-15'),
      nextReviewDate: new Date('2024-08-15'),
    },
  },
  {
    id: 'emp-5',
    employeeId: 'EMP005',
    firstName: 'David',
    lastName: 'Wilson',
    email: 'david.wilson@company.com',
    phone: '+1 (555) 567-8901',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    position: 'Backend Developer',
    departmentId: 'dept-1',
    departmentName: 'Engineering',
    managerId: 'emp-1',
    managerName: 'John Smith',
    status: 'probation',
    employmentType: 'full-time',
    joinDate: new Date('2024-01-15'),
    salary: 85000,
    skills: ['Node.js', 'Python', 'MongoDB', 'Docker'],
    address: {
      street: '555 Backend Road',
      city: 'Berkeley',
      state: 'CA',
      zipCode: '94704',
      country: 'USA',
    },
    emergencyContact: {
      name: 'Mary Wilson',
      relationship: 'Mother',
      phone: '+1 (555) 567-8902',
    },
    documents: [],
    performance: {
      rating: 0,
      lastReviewDate: new Date('2024-01-15'),
      nextReviewDate: new Date('2024-04-15'),
    },
  },
  {
    id: 'emp-6',
    employeeId: 'EMP006',
    firstName: 'Jessica',
    lastName: 'Taylor',
    email: 'jessica.taylor@company.com',
    phone: '+1 (555) 678-9012',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop',
    position: 'Marketing Manager',
    departmentId: 'dept-3',
    departmentName: 'Marketing',
    status: 'active',
    employmentType: 'full-time',
    joinDate: new Date('2020-02-01'),
    salary: 110000,
    skills: ['Digital Marketing', 'SEO', 'Analytics', 'Content Strategy'],
    address: {
      street: '888 Marketing Ave',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94109',
      country: 'USA',
    },
    emergencyContact: {
      name: 'Robert Taylor',
      relationship: 'Father',
      phone: '+1 (555) 678-9013',
    },
    documents: [],
    performance: {
      rating: 4.4,
      lastReviewDate: new Date('2024-01-10'),
      nextReviewDate: new Date('2024-07-10'),
    },
  },
  {
    id: 'emp-7',
    employeeId: 'EMP007',
    firstName: 'Alex',
    lastName: 'Martinez',
    email: 'alex.martinez@company.com',
    phone: '+1 (555) 789-0123',
    position: 'UI Designer',
    departmentId: 'dept-2',
    departmentName: 'Design',
    managerId: 'emp-4',
    managerName: 'Emily Davis',
    status: 'active',
    employmentType: 'part-time',
    joinDate: new Date('2022-05-15'),
    salary: 55000,
    skills: ['Figma', 'Illustrator', 'Prototyping'],
    address: {
      street: '777 Design Lane',
      city: 'San Jose',
      state: 'CA',
      zipCode: '95110',
      country: 'USA',
    },
    emergencyContact: {
      name: 'Carmen Martinez',
      relationship: 'Sister',
      phone: '+1 (555) 789-0124',
    },
    documents: [],
    performance: {
      rating: 4.0,
      lastReviewDate: new Date('2024-02-20'),
      nextReviewDate: new Date('2024-08-20'),
    },
  },
  {
    id: 'emp-8',
    employeeId: 'EMP008',
    firstName: 'Ryan',
    lastName: 'Lee',
    email: 'ryan.lee@company.com',
    phone: '+1 (555) 890-1234',
    avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=100&h=100&fit=crop',
    position: 'DevOps Engineer',
    departmentId: 'dept-1',
    departmentName: 'Engineering',
    managerId: 'emp-1',
    managerName: 'John Smith',
    status: 'active',
    employmentType: 'contract',
    joinDate: new Date('2023-03-01'),
    salary: 130000,
    skills: ['AWS', 'Kubernetes', 'Terraform', 'CI/CD'],
    address: {
      street: '999 Cloud Street',
      city: 'Palo Alto',
      state: 'CA',
      zipCode: '94301',
      country: 'USA',
    },
    emergencyContact: {
      name: 'Jenny Lee',
      relationship: 'Spouse',
      phone: '+1 (555) 890-1235',
    },
    documents: [],
    performance: {
      rating: 4.6,
      lastReviewDate: new Date('2024-01-25'),
      nextReviewDate: new Date('2024-07-25'),
    },
  },
];

// Generate attendance records for the past 30 days
export const generateAttendanceRecords = (): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  
  mockEmployees.forEach(employee => {
    for (let i = 0; i < 30; i++) {
      const date = subDays(today, i);
      const dayOfWeek = date.getDay();
      const seed = getEmployeeAttendanceSeed(employee.id, i);
      
      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        records.push({
          id: `att-${employee.id}-${i}`,
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          employeeAvatar: employee.avatar,
          date,
          status: 'weekend',
          workHours: 0,
          overtime: 0,
          isRemote: false,
        });
        continue;
      }
      
      // Random attendance status
      const random = deterministicRandom(seed);
      let status: AttendanceStatus;
      let checkIn: Date | undefined;
      let checkOut: Date | undefined;
      let workHours = 0;
      let overtime = 0;
      let notes: string | undefined;
      const remoteRoll = deterministicRandom(seed + 11);
      const startMinuteRoll = deterministicRandom(seed + 17);
      const endMinuteRoll = deterministicRandom(seed + 23);
      const overtimeRoll = deterministicRandom(seed + 29);
      
      if (random < 0.75) {
        status = 'present';
        checkIn = setMinutes(setHours(new Date(date), 9), Math.floor(startMinuteRoll * 15));
        checkOut = setMinutes(setHours(new Date(date), 17 + Math.floor(overtimeRoll * 3)), Math.floor(endMinuteRoll * 60));
        workHours = 8 + overtimeRoll * 2;
        overtime = workHours > 8 ? workHours - 8 : 0;
      } else if (random < 0.85) {
        status = 'late';
        checkIn = setMinutes(setHours(new Date(date), 9), 30 + Math.floor(startMinuteRoll * 90));
        checkOut = setMinutes(setHours(new Date(date), 18), Math.floor(endMinuteRoll * 60));
        workHours = 7.5;
        overtime = 0;
        notes = 'Arrived later than scheduled start time';
      } else if (random < 0.92) {
        status = 'half-day';
        checkIn = setMinutes(setHours(new Date(date), 9), Math.floor(startMinuteRoll * 15));
        checkOut = setMinutes(setHours(new Date(date), 13), Math.floor(endMinuteRoll * 60));
        workHours = 4;
        overtime = 0;
        notes = 'Approved half-day shift';
      } else {
        status = 'absent';
        notes = 'No call, no show';
      }

      const isRemote = remoteRoll > 0.7;
      
      records.push({
        id: `att-${employee.id}-${i}`,
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        employeeAvatar: employee.avatar,
        date,
        checkIn,
        checkOut,
        status,
        workHours,
        overtime,
        isRemote,
        location: isRemote ? 'Remote' : 'Head Office',
        notes,
      });
    }
  });
  
  return records;
};

export const mockAttendanceRecords = generateAttendanceRecords();

export const mockLeaveRequests: LeaveRequest[] = [
  {
    id: 'leave-1',
    employeeId: 'emp-3',
    employeeName: 'Michael Chen',
    employeeAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    employeePosition: 'Frontend Developer',
    departmentName: 'Engineering',
    leaveType: 'annual',
    startDate: subDays(new Date(), 2),
    endDate: addDays(new Date(), 5),
    totalDays: 6,
    reason: 'Family vacation to Hawaii',
    status: 'approved',
    appliedAt: subDays(new Date(), 14),
    approvedBy: 'John Smith',
    approvedAt: subDays(new Date(), 12),
  },
  {
    id: 'leave-2',
    employeeId: 'emp-2',
    employeeName: 'Sarah Johnson',
    employeeAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    employeePosition: 'Senior Developer',
    departmentName: 'Engineering',
    leaveType: 'sick',
    startDate: addDays(new Date(), 1),
    endDate: addDays(new Date(), 2),
    totalDays: 2,
    reason: 'Medical appointment and recovery',
    status: 'pending',
    appliedAt: new Date(),
  },
  {
    id: 'leave-3',
    employeeId: 'emp-6',
    employeeName: 'Jessica Taylor',
    employeeAvatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop',
    employeePosition: 'Marketing Manager',
    departmentName: 'Marketing',
    leaveType: 'personal',
    startDate: addDays(new Date(), 10),
    endDate: addDays(new Date(), 11),
    totalDays: 2,
    reason: 'Personal matters to attend',
    status: 'pending',
    appliedAt: subDays(new Date(), 3),
  },
  {
    id: 'leave-4',
    employeeId: 'emp-4',
    employeeName: 'Emily Davis',
    employeeAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    employeePosition: 'Design Lead',
    departmentName: 'Design',
    leaveType: 'annual',
    startDate: subDays(new Date(), 30),
    endDate: subDays(new Date(), 25),
    totalDays: 4,
    reason: 'Attending design conference',
    status: 'approved',
    appliedAt: subDays(new Date(), 45),
    approvedBy: 'HR Admin',
    approvedAt: subDays(new Date(), 42),
  },
  {
    id: 'leave-5',
    employeeId: 'emp-7',
    employeeName: 'Alex Martinez',
    employeePosition: 'UI Designer',
    departmentName: 'Design',
    leaveType: 'sick',
    startDate: subDays(new Date(), 5),
    endDate: subDays(new Date(), 4),
    totalDays: 2,
    reason: 'Flu symptoms',
    status: 'approved',
    appliedAt: subDays(new Date(), 6),
    approvedBy: 'Emily Davis',
    approvedAt: subDays(new Date(), 6),
  },
  {
    id: 'leave-6',
    employeeId: 'emp-8',
    employeeName: 'Ryan Lee',
    employeeAvatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=100&h=100&fit=crop',
    employeePosition: 'DevOps Engineer',
    departmentName: 'Engineering',
    leaveType: 'annual',
    startDate: addDays(new Date(), 20),
    endDate: addDays(new Date(), 27),
    totalDays: 6,
    reason: 'Visiting family abroad',
    status: 'rejected',
    appliedAt: subDays(new Date(), 10),
    approvedBy: 'John Smith',
    approvedAt: subDays(new Date(), 8),
    rejectionReason: 'Critical project deadline during requested period',
  },
];

export const mockLeaveBalances: LeaveBalance[] = [
  { type: 'annual', total: 20, used: 8, pending: 0, available: 12 },
  { type: 'sick', total: 10, used: 2, pending: 2, available: 6 },
  { type: 'personal', total: 5, used: 1, pending: 0, available: 4 },
  { type: 'maternity', total: 90, used: 0, pending: 0, available: 90 },
  { type: 'paternity', total: 14, used: 0, pending: 0, available: 14 },
  { type: 'unpaid', total: 30, used: 0, pending: 0, available: 30 },
  { type: 'bereavement', total: 5, used: 0, pending: 0, available: 5 },
];
