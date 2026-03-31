import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { endOfDay, format, startOfYear } from 'date-fns';
import {
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarDays,
  Clock3,
  Download,
  Edit,
  HeartHandshake,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Shield,
  UserCircle2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  AddEmployeeDialog,
  Department,
  Employee,
  EmployeeStatus,
  EmploymentType,
  formatCurrency,
  getEmployeeStatusConfig,
  getEmploymentTypeConfig,
  getInitials,
} from '@/components/employees';
import { getStoredEmployee, getStoredEmployeeRoleName } from '@/features/auth/lib/auth-storage';
import {
  AttendanceSummaryEntity,
  DepartmentEntity,
  EmployeeProfileEntity,
  LeaveRequestEntity,
  getMyAttendanceSummary,
  getMyDepartments,
  getMyEmployeeProfile,
  getMyLeaveRequests,
  updateMyEmployeeProfile,
} from '@/features/users';

type EmployeeFormPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  departmentId: string;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  joinDate: string;
  salary: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  emergencyName?: string;
  emergencyRelationship?: string;
  emergencyPhone?: string;
  skills?: string;
};

const EMPTY_SUMMARY: AttendanceSummaryEntity = {
  totalEmployees: 0,
  presentCount: 0,
  absentCount: 0,
  lateCount: 0,
  halfDayCount: 0,
  onLeaveCount: 0,
  totalWorkingDays: 0,
  averageCheckIn: null,
  averageWorkHours: 0,
  overtimeHours: 0,
};

const normalizeDepartmentName = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

const normalizeEmploymentType = (value?: string | null): EmploymentType => {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === 'full-time'
    || normalized === 'part-time'
    || normalized === 'contract'
    || normalized === 'intern'
  ) {
    return normalized;
  }

  return 'full-time';
};

const normalizeEmployeeStatus = (value?: string | null, isActive?: boolean): EmployeeStatus => {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === 'active'
    || normalized === 'inactive'
    || normalized === 'on-leave'
    || normalized === 'probation'
  ) {
    return normalized;
  }

  return isActive === false ? 'inactive' : 'active';
};

const parseSkills = (value?: string) =>
  (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    error
    && typeof error === 'object'
    && 'response' in error
  ) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const buildFallbackDepartment = (name: string): Department => {
  const label = name.trim() || 'Unassigned';
  const compact = label.replace(/[^a-z0-9]/gi, '').toUpperCase();

  return {
    id: `profile-${normalizeDepartmentName(label).replace(/[^a-z0-9]+/g, '-') || 'unassigned'}`,
    name: label,
    code: (compact || 'UNASS').slice(0, 5),
    description: `${label} department`,
    employeeCount: 0,
    budget: 0,
    color: '#22D3EE',
    createdAt: new Date(),
    isActive: true,
  };
};

const mapDepartmentData = (data: DepartmentEntity[]): Department[] =>
  data.map((department) => ({
    id: department.id,
    name: department.name || '',
    code: department.code || '',
    description: department.description || '',
    headId: department.headId || undefined,
    headName: department.headName || undefined,
    headAvatar: department.headAvatar || undefined,
    employeeCount: Number(department.employeeCount || 0),
    budget: Number(department.budget || 0),
    color: department.color || '#22D3EE',
    createdAt: new Date(department.createdAt || Date.now()),
    isActive: department.isActive !== false,
  }));

const ensureDepartmentOption = (departments: Department[], profile: EmployeeProfileEntity | null): Department[] => {
  const nextDepartments = [...departments];
  const profileDepartmentName = profile?.department?.trim() || '';

  if (!nextDepartments.length) {
    nextDepartments.push(buildFallbackDepartment(profileDepartmentName));
    return nextDepartments;
  }

  if (
    profileDepartmentName
    && !nextDepartments.some(
      (department) => normalizeDepartmentName(department.name) === normalizeDepartmentName(profileDepartmentName),
    )
  ) {
    nextDepartments.unshift(buildFallbackDepartment(profileDepartmentName));
  }

  return nextDepartments;
};

const mapProfileToEmployee = (profile: EmployeeProfileEntity, departments: Department[]): Employee => {
  const departmentName = profile.department || '';
  const matchedDepartment = departments.find(
    (department) => normalizeDepartmentName(department.name) === normalizeDepartmentName(departmentName),
  );

  return {
    id: profile.id,
    employeeId: profile.employeeNumber || `EMP${String(profile.id || '').slice(0, 4)}`,
    firstName: profile.user?.firstName || '',
    lastName: profile.user?.lastName || '',
    email: profile.user?.email || '',
    phone: profile.phone || '',
    avatar: profile.user?.avatar || undefined,
    position: profile.position || '',
    departmentId: matchedDepartment?.id || departments[0]?.id || buildFallbackDepartment(departmentName).id,
    departmentName,
    managerId: profile.managerId || undefined,
    managerName: profile.managerName || undefined,
    status: normalizeEmployeeStatus(profile.employmentStatus, profile.isActive),
    employmentType: normalizeEmploymentType(profile.employmentType),
    joinDate: toSafeDate(profile.hireDate || profile.createdAt || null),
    salary: Number(profile.salary || 0),
    skills: profile.skills || [],
    address: {
      street: profile.address?.street || '',
      city: profile.address?.city || '',
      state: profile.address?.state || '',
      zipCode: profile.address?.zipCode || '',
      country: profile.address?.country || '',
    },
    emergencyContact: {
      name: profile.emergencyContact?.name || '',
      relationship: profile.emergencyContact?.relationship || '',
      phone: profile.emergencyContact?.phone || '',
    },
    documents: (profile.documents || []).map((document) => ({
      id: document.id,
      name: document.name || 'Document',
      type: document.type || 'file',
      uploadedAt: new Date(document.uploadedAt || Date.now()),
    })),
    performance: {
      rating: 0,
      lastReviewDate: new Date(),
      nextReviewDate: new Date(),
    },
  };
};

const buildEmployeePayload = (data: EmployeeFormPayload, departmentName?: string) => ({
  firstName: data.firstName.trim(),
  lastName: data.lastName.trim(),
  email: data.email.trim().toLowerCase(),
  phone: data.phone.trim(),
  department: departmentName || null,
  position: data.position.trim(),
  hireDate: data.joinDate ? new Date(`${data.joinDate}T00:00:00.000Z`).toISOString() : null,
  employmentType: data.employmentType,
  employmentStatus: data.status,
  isActive: data.status !== 'inactive',
  salary: data.salary ? Number(data.salary) : null,
  skills: parseSkills(data.skills),
  address: {
    street: data.street?.trim() || '',
    city: data.city?.trim() || '',
    state: data.state?.trim() || '',
    zipCode: data.zipCode?.trim() || '',
    country: data.country?.trim() || '',
  },
  emergencyContact: {
    name: data.emergencyName?.trim() || '',
    relationship: data.emergencyRelationship?.trim() || '',
    phone: data.emergencyPhone?.trim() || '',
  },
});

const persistProfileSession = (profile: EmployeeProfileEntity) => {
  try {
    const storedUser = JSON.parse(window.localStorage.getItem('user') || '{}');
    window.localStorage.setItem('user', JSON.stringify({
      ...storedUser,
      id: profile.user?.id || storedUser.id,
      firstName: profile.user?.firstName || storedUser.firstName,
      lastName: profile.user?.lastName || storedUser.lastName,
      email: profile.user?.email || storedUser.email,
      avatar: profile.user?.avatar || storedUser.avatar,
      phone: profile.phone || storedUser.phone,
    }));

    const storedEmployee = JSON.parse(window.localStorage.getItem('employee') || '{}');
    window.localStorage.setItem('employee', JSON.stringify({
      ...storedEmployee,
      id: profile.id,
      employeeNumber: profile.employeeNumber,
      department: profile.department,
      position: profile.position,
      role: profile.role ? { ...(storedEmployee.role || {}), ...profile.role } : storedEmployee.role,
      roleName: profile.role?.name || storedEmployee.roleName,
    }));
  } catch {
    // Ignore session persistence errors so the saved profile still succeeds.
  }
};

const formatRange = (leave: LeaveRequestEntity): string => {
  const start = new Date(leave.startDate);
  const end = new Date(leave.endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${leave.startDate} - ${leave.endDate}`;
  }

  return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
};

const toSafeDate = (value?: string | null, fallback?: Date): Date => {
  const candidate = value ? new Date(value) : null;
  if (candidate && !Number.isNaN(candidate.getTime())) {
    return candidate;
  }

  return fallback || new Date();
};

const formatMaybeDate = (value?: string | null): string => {
  const candidate = value ? new Date(value) : null;
  if (!candidate || Number.isNaN(candidate.getTime())) {
    return 'Not added yet';
  }

  return format(candidate, 'MMM d, yyyy');
};

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<EmployeeProfileEntity | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummaryEntity>(EMPTY_SUMMARY);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const loadProfile = useCallback(async (showLoader: boolean) => {
    if (showLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const now = new Date();
      const [profileData, leaveData, summaryData, departmentData] = await Promise.all([
        getMyEmployeeProfile(),
        getMyLeaveRequests(),
        getMyAttendanceSummary({
          dateFrom: startOfYear(now).toISOString(),
          dateTo: endOfDay(now).toISOString(),
        }),
        getMyDepartments().catch(() => []),
      ]);

      setProfile(profileData);
      setLeaveRequests(leaveData);
      setAttendanceSummary(summaryData);
      setDepartments(ensureDepartmentOption(mapDepartmentData(departmentData), profileData));
      persistProfileSession(profileData);
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error(getErrorMessage(error, 'Failed to load your profile'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile(true);
  }, [loadProfile]);

  const editableEmployee = useMemo(() => (
    profile ? mapProfileToEmployee(profile, ensureDepartmentOption(departments, profile)) : undefined
  ), [departments, profile]);

  const roleLabel = profile?.role?.name || getStoredEmployeeRoleName(getStoredEmployee()) || 'Team Member';
  const statusConfig = getEmployeeStatusConfig(editableEmployee?.status || 'active');
  const employmentConfig = getEmploymentTypeConfig(editableEmployee?.employmentType || 'full-time');

  const approvedLeaveRequests = useMemo(
    () => leaveRequests.filter((request) => request.status === 'approved'),
    [leaveRequests],
  );
  const pendingLeaveRequests = useMemo(
    () => leaveRequests.filter((request) => request.status === 'pending'),
    [leaveRequests],
  );
  const recentLeaveRequests = useMemo(
    () => [...leaveRequests].sort((a, b) => (
      new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
    )).slice(0, 5),
    [leaveRequests],
  );

  const daysWorked = attendanceSummary.presentCount + attendanceSummary.lateCount + attendanceSummary.halfDayCount;
  const leaveDaysTaken = approvedLeaveRequests.reduce((total, request) => total + Number(request.totalDays || 0), 0);
  const attendanceRate = attendanceSummary.totalWorkingDays > 0
    ? Math.round((daysWorked / attendanceSummary.totalWorkingDays) * 100)
    : 0;

  const handleEditProfile = async (data: EmployeeFormPayload) => {
    const selectedDepartment = ensureDepartmentOption(departments, profile).find(
      (department) => department.id === data.departmentId,
    );

    try {
      const updatedProfile = await updateMyEmployeeProfile(buildEmployeePayload(data, selectedDepartment?.name));
      setProfile(updatedProfile);
      setDepartments((current) => ensureDepartmentOption(current, updatedProfile));
      persistProfileSession(updatedProfile);
      toast.success('Profile updated successfully');
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update your profile'));
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-6">
        <div className="flex min-h-[60vh] items-center justify-center rounded-md border border-[rgba(15,23,42,0.06)] bg-white">
          <div className="flex items-center gap-3 text-[#0F172A]">
            <Loader2 className="h-5 w-5 animate-spin text-[#0891B2]" />
            <span className="text-sm font-medium">Loading profile...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!profile || !editableEmployee) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-6">
        <Card className="mx-auto max-w-3xl rounded-md border border-[rgba(15,23,42,0.06)] shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-[#0F172A]">Profile unavailable</h1>
              <p className="max-w-xl text-sm text-[#64748B]">
                We couldn&apos;t load the employee profile linked to this account. Please contact your administrator if this user is missing an employee record.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => { void loadProfile(true); }}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="overflow-hidden rounded-md border border-[rgba(15,23,42,0.06)] shadow-sm">
          <div className="h-40 bg-[linear-gradient(135deg,#22D3EE_0%,#0F172A_100%)]" />
          <CardContent className="relative -mt-16 px-6 pb-6 pt-0">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <Avatar className="h-28 w-28 border-4 border-white shadow-lg">
                  <AvatarImage src={editableEmployee.avatar} alt={`${editableEmployee.firstName} ${editableEmployee.lastName}`} />
                  <AvatarFallback className="bg-[#0891B2] text-2xl text-white">
                    {getInitials(editableEmployee.firstName, editableEmployee.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <div>
                    <h1 className="text-3xl font-bold text-[#0F172A]">
                      {editableEmployee.firstName} {editableEmployee.lastName}
                    </h1>
                    <p className="mt-1 text-sm text-[#475569]">
                      {editableEmployee.position || 'Team Member'}{editableEmployee.departmentName ? ` • ${editableEmployee.departmentName}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={`${statusConfig.color} border-0`}>
                      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                      {statusConfig.label}
                    </Badge>
                    <Badge className={`${employmentConfig.color} border-0`}>
                      {employmentConfig.label}
                    </Badge>
                    <Badge variant="outline" className="border-[rgba(15,23,42,0.08)] bg-white text-[#0F172A]">
                      {roleLabel}
                    </Badge>
                    <Badge variant="outline" className="border-[rgba(15,23,42,0.08)] bg-white text-[#475569]">
                      {editableEmployee.employeeId}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => { void loadProfile(false); }}
                >
                  {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />}
                  Refresh
                </Button>
                <Button
                  type="button"
                  className="gap-2 bg-[#0891B2] text-white hover:bg-[#0E7490]"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
              <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4">
                <div className="flex items-center gap-2 text-sm text-[#64748B]">
                  <Mail className="h-4 w-4 text-[#0891B2]" />
                  Email
                </div>
                <p className="mt-2 text-sm font-medium text-[#0F172A]">{editableEmployee.email || 'Not added yet'}</p>
              </div>
              <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4">
                <div className="flex items-center gap-2 text-sm text-[#64748B]">
                  <Phone className="h-4 w-4 text-[#0891B2]" />
                  Phone
                </div>
                <p className="mt-2 text-sm font-medium text-[#0F172A]">{editableEmployee.phone || 'Not added yet'}</p>
              </div>
              <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4">
                <div className="flex items-center gap-2 text-sm text-[#64748B]">
                  <CalendarDays className="h-4 w-4 text-[#0891B2]" />
                  Hire Date
                </div>
                <p className="mt-2 text-sm font-medium text-[#0F172A]">
                  {formatMaybeDate(profile.hireDate)}
                </p>
              </div>
              <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4">
                <div className="flex items-center gap-2 text-sm text-[#64748B]">
                  <MapPin className="h-4 w-4 text-[#0891B2]" />
                  Address
                </div>
                <p className="mt-2 text-sm font-medium text-[#0F172A]">
                  {[editableEmployee.address.city, editableEmployee.address.state].filter(Boolean).join(', ') || 'Not added yet'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-md border border-[rgba(15,23,42,0.06)] shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">Days Worked This Year</p>
                  <p className="mt-2 text-3xl font-bold text-[#0F172A]">{daysWorked}</p>
                </div>
                <div className="rounded-full bg-[#0891B2]/10 p-3 text-[#0891B2]">
                  <BadgeCheck className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-xs text-[#64748B]">
                {attendanceSummary.totalWorkingDays} scheduled work days tracked this year
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-md border border-[rgba(15,23,42,0.06)] shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">Approved Leave Requests</p>
                  <p className="mt-2 text-3xl font-bold text-[#0F172A]">{approvedLeaveRequests.length}</p>
                </div>
                <div className="rounded-full bg-amber-100 p-3 text-amber-700">
                  <CalendarDays className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-xs text-[#64748B]">
                Pending requests: {pendingLeaveRequests.length}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-md border border-[rgba(15,23,42,0.06)] shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">Leave Days Taken</p>
                  <p className="mt-2 text-3xl font-bold text-[#0F172A]">{leaveDaysTaken}</p>
                </div>
                <div className="rounded-full bg-red-50 p-3 text-red-600">
                  <HeartHandshake className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-xs text-[#64748B]">
                Based on approved leave requests
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-md border border-[rgba(15,23,42,0.06)] shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">Attendance Rate</p>
                  <p className="mt-2 text-3xl font-bold text-[#0F172A]">{attendanceRate}%</p>
                </div>
                <div className="rounded-full bg-emerald-50 p-3 text-emerald-600">
                  <Clock3 className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-xs text-[#64748B]">
                Avg. work hours: {attendanceSummary.averageWorkHours.toFixed(1)} per day
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
          <div className="space-y-6">
            <Card className="rounded-md border border-[rgba(15,23,42,0.06)] shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg text-[#0F172A]">Work Profile</CardTitle>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Your role, compensation, reporting line, and employment setup.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4">
                  <div className="flex items-center gap-2 text-sm text-[#64748B]">
                    <UserCircle2 className="h-4 w-4 text-[#0891B2]" />
                    Role
                  </div>
                  <p className="mt-2 font-medium text-[#0F172A]">{roleLabel}</p>
                </div>
                <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4">
                  <div className="flex items-center gap-2 text-sm text-[#64748B]">
                    <Briefcase className="h-4 w-4 text-[#0891B2]" />
                    Position
                  </div>
                  <p className="mt-2 font-medium text-[#0F172A]">{editableEmployee.position || 'Not added yet'}</p>
                </div>
                <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4">
                  <div className="flex items-center gap-2 text-sm text-[#64748B]">
                    <Building2 className="h-4 w-4 text-[#0891B2]" />
                    Department
                  </div>
                  <p className="mt-2 font-medium text-[#0F172A]">{editableEmployee.departmentName || 'Not added yet'}</p>
                </div>
                <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4">
                  <div className="flex items-center gap-2 text-sm text-[#64748B]">
                    <Wallet className="h-4 w-4 text-[#0891B2]" />
                    Annual Salary
                  </div>
                  <p className="mt-2 font-medium text-[#0F172A]">
                    {editableEmployee.salary > 0 ? formatCurrency(editableEmployee.salary) : 'Not added yet'}
                  </p>
                </div>
                <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4">
                  <div className="flex items-center gap-2 text-sm text-[#64748B]">
                    <Shield className="h-4 w-4 text-[#0891B2]" />
                    Manager
                  </div>
                  <p className="mt-2 font-medium text-[#0F172A]">{editableEmployee.managerName || 'Not assigned'}</p>
                </div>
                <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4">
                  <div className="flex items-center gap-2 text-sm text-[#64748B]">
                    <Clock3 className="h-4 w-4 text-[#0891B2]" />
                    Average Check-In
                  </div>
                  <p className="mt-2 font-medium text-[#0F172A]">{attendanceSummary.averageCheckIn || 'No attendance yet'}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-md border border-[rgba(15,23,42,0.06)] shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg text-[#0F172A]">Contact And Address</CardTitle>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Primary contact details and the address stored for this employee record.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-[#64748B]">Email Address</p>
                    <p className="mt-2 font-medium text-[#0F172A]">{editableEmployee.email || 'Not added yet'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B]">Phone Number</p>
                    <p className="mt-2 font-medium text-[#0F172A]">{editableEmployee.phone || 'Not added yet'}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-[#64748B]">Street Address</p>
                  <div className="mt-2 space-y-1 text-sm text-[#0F172A]">
                    <p>{editableEmployee.address.street || 'Not added yet'}</p>
                    <p>
                      {[editableEmployee.address.city, editableEmployee.address.state, editableEmployee.address.zipCode].filter(Boolean).join(', ') || 'City, state, and postal code not added yet'}
                    </p>
                    <p>{editableEmployee.address.country || 'Country not added yet'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-md border border-[rgba(15,23,42,0.06)] shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg text-[#0F172A]">Emergency Contact</CardTitle>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Safety information used if someone needs to be reached urgently.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-[#64748B]">Contact Name</p>
                  <p className="mt-2 font-medium text-[#0F172A]">{editableEmployee.emergencyContact.name || 'Not added yet'}</p>
                </div>
                <div>
                  <p className="text-sm text-[#64748B]">Relationship</p>
                  <p className="mt-2 font-medium text-[#0F172A]">{editableEmployee.emergencyContact.relationship || 'Not added yet'}</p>
                </div>
                <div>
                  <p className="text-sm text-[#64748B]">Emergency Phone</p>
                  <p className="mt-2 font-medium text-[#0F172A]">{editableEmployee.emergencyContact.phone || 'Not added yet'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-md border border-[rgba(15,23,42,0.06)] shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-[#0F172A]">Skills</CardTitle>
              </CardHeader>
              <CardContent>
                {editableEmployee.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {editableEmployee.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="bg-[#0891B2]/10 text-[#0891B2] hover:bg-[#0891B2]/15"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#64748B]">No skills have been added to this profile yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-md border border-[rgba(15,23,42,0.06)] shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-[#0F172A]">Leave Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentLeaveRequests.length > 0 ? (
                  recentLeaveRequests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium capitalize text-[#0F172A]">{request.leaveType} leave</p>
                          <p className="mt-1 text-sm text-[#64748B]">{formatRange(request)}</p>
                          <p className="mt-1 text-xs text-[#64748B]">{request.totalDays} day(s)</p>
                        </div>
                        <Badge
                          variant="outline"
                          className="border-[rgba(15,23,42,0.08)] bg-white capitalize text-[#475569]"
                        >
                          {request.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#64748B]">No leave requests have been recorded for this employee yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-md border border-[rgba(15,23,42,0.06)] shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-[#0F172A]">Documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.documents && profile.documents.length > 0 ? (
                  profile.documents.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center justify-between rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4"
                    >
                      <div>
                        <p className="font-medium text-[#0F172A]">{document.name || 'Document'}</p>
                        <p className="mt-1 text-xs text-[#64748B]">
                          {document.uploadedAt ? `Uploaded ${formatMaybeDate(document.uploadedAt)}` : 'Upload date unavailable'}
                        </p>
                      </div>
                      {document.fileUrl ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(document.fileUrl, '_blank', 'noopener,noreferrer')}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Open
                        </Button>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#64748B]">No employee documents have been uploaded yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AddEmployeeDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        departments={ensureDepartmentOption(departments, profile)}
        onSubmit={handleEditProfile}
        editingEmployee={editableEmployee}
      />
    </div>
  );
};

export default ProfilePage;
