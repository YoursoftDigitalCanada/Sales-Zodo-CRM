import api from "@/lib/axios";
import { extractApiArray, extractApiData } from "@/types/api";

export interface UserEntity {
    id: string | number;
    [key: string]: unknown;
}

export type WorkspaceUserStatus =
    | "ACTIVE"
    | "INACTIVE"
    | "SUSPENDED"
    | "PENDING_VERIFICATION";

export interface WorkspaceUserEntity {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    phone: string | null;
    avatar: string | null;
    status: WorkspaceUserStatus;
    emailVerified: boolean;
    lastLoginAt: string | null;
    employeeId: string | null;
    role: { id: string; name: string } | null;
    department: string | null;
    position: string | null;
    membershipStatus: "active" | "invited" | "suspended";
    createdAt: string;
    updatedAt: string;
}

export interface InviteWorkspaceUserResponse {
    user: WorkspaceUserEntity;
    temporaryPassword?: string;
    inviteEmailSent: boolean;
}

export interface DepartmentEntity {
    id: string;
    name: string;
    code: string;
    description: string;
    headId?: string | null;
    headName?: string;
    headAvatar?: string | null;
    employeeCount: number;
    budget: number;
    color: string;
    createdAt: string;
    isActive: boolean;
}

export interface EmployeeProfileEntity {
    id: string;
    employeeNumber?: string | null;
    department?: string | null;
    position?: string | null;
    hireDate?: string | null;
    isActive?: boolean;
    employmentStatus?: string;
    employmentType?: string;
    salary?: number | null;
    phone?: string | null;
    skills?: string[];
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
    };
    emergencyContact?: {
        name?: string;
        relationship?: string;
        phone?: string;
    };
    managerId?: string | null;
    managerName?: string | null;
    documents?: Array<{
        id: string;
        name?: string;
        type?: string;
        fileUrl?: string;
        uploadedAt?: string;
    }>;
    user?: {
        id?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        avatar?: string | null;
    } | null;
    role?: {
        id?: string;
        name?: string;
    } | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface AttendanceEntity {
    id: string;
    employeeId: string;
    employeeName: string;
    employeeAvatar?: string | null;
    date: string;
    checkIn?: string;
    checkOut?: string;
    status: "present" | "absent" | "late" | "half-day" | "on-leave";
    workHours: number;
    overtime: number;
    notes?: string | null;
    location?: string;
    isRemote: boolean;
    breakMinutes: number;
    clockInLat?: number | null;
    clockInLng?: number | null;
    clockOutLat?: number | null;
    clockOutLng?: number | null;
    clockInAccuracy?: number | null;
    clockOutAccuracy?: number | null;
    clockInCapturedAt?: string | null;
    clockOutCapturedAt?: string | null;
    lastSeenLat?: number | null;
    lastSeenLng?: number | null;
    lastSeenAccuracy?: number | null;
    lastSeenAt?: string | null;
}

export interface AttendanceSummaryEntity {
    totalEmployees: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    halfDayCount: number;
    onLeaveCount: number;
    totalWorkingDays: number;
    averageCheckIn: string | null;
    averageWorkHours: number;
    overtimeHours: number;
}

export interface AttendanceCurrentEntity {
    isCheckedIn: boolean;
    isOnBreak: boolean;
    breakMinutes: number;
    activeEntry: AttendanceEntity | null;
}

export interface AttendanceQueryParams {
    dateFrom?: string;
    dateTo?: string;
    employeeId?: string;
}

export interface LeaveRequestEntity {
    id: string;
    employeeId: string;
    employeeName: string;
    employeeAvatar?: string | null;
    employeePosition: string;
    departmentName: string;
    leaveType: "annual" | "sick" | "personal" | "unpaid";
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    status: "pending" | "approved" | "rejected";
    appliedAt: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectionReason?: string;
}

export async function getUsers(params?: Record<string, unknown>): Promise<WorkspaceUserEntity[]> {
    const response = await api.get("/users", { params });
    return extractApiArray<WorkspaceUserEntity>(response.data);
}

export async function createUser(data: Record<string, unknown>): Promise<WorkspaceUserEntity> {
    const response = await api.post("/users", data);
    return extractApiData<WorkspaceUserEntity>(response.data);
}

export async function updateUser(id: string | number, data: Record<string, unknown>): Promise<WorkspaceUserEntity> {
    const response = await api.put(`/users/${id}`, data);
    return extractApiData<WorkspaceUserEntity>(response.data);
}

export async function inviteUser(data: Record<string, unknown>): Promise<InviteWorkspaceUserResponse> {
    const response = await api.post("/users/invite", data);
    return extractApiData<InviteWorkspaceUserResponse>(response.data);
}

export async function updateUserRole(id: string | number, roleId: string): Promise<WorkspaceUserEntity> {
    const response = await api.put(`/users/${id}/role`, { roleId });
    return extractApiData<WorkspaceUserEntity>(response.data);
}

export async function updateUserStatus(
    id: string | number,
    status: WorkspaceUserStatus,
): Promise<WorkspaceUserEntity> {
    const response = await api.patch(`/users/${id}/status`, { status });
    return extractApiData<WorkspaceUserEntity>(response.data);
}

export async function requestUserPasswordReset(email: string): Promise<void> {
    await api.post("/auth/forgot-password", { email });
}

export async function deleteUser(id: string | number): Promise<void> {
    await api.delete(`/users/${id}`);
}

export async function getEmployees(params?: Record<string, unknown>): Promise<UserEntity[]> {
    const response = await api.get("/employees", { params: { limit: 200, ...params } });
    return extractApiArray<UserEntity>(response.data);
}

export async function getMyEmployeeProfile(): Promise<EmployeeProfileEntity> {
    const response = await api.get("/employees/me");
    return extractApiData<EmployeeProfileEntity>(response.data);
}

export async function updateMyEmployeeProfile(data: Record<string, unknown>): Promise<EmployeeProfileEntity> {
    const response = await api.put("/employees/me", data);
    return extractApiData<EmployeeProfileEntity>(response.data);
}

export async function getDepartments(): Promise<DepartmentEntity[]> {
    const response = await api.get("/employees/departments");
    return extractApiArray<DepartmentEntity>(response.data);
}

export async function getMyDepartments(): Promise<DepartmentEntity[]> {
    const response = await api.get("/employees/departments/my");
    return extractApiArray<DepartmentEntity>(response.data);
}

export async function createDepartment(data: Record<string, unknown>): Promise<DepartmentEntity> {
    const response = await api.post("/employees/departments", data);
    return extractApiData<DepartmentEntity>(response.data);
}

export async function updateDepartment(id: string, data: Record<string, unknown>): Promise<DepartmentEntity> {
    const response = await api.put(`/employees/departments/${id}`, data);
    return extractApiData<DepartmentEntity>(response.data);
}

export async function deleteDepartment(id: string): Promise<void> {
    await api.delete(`/employees/departments/${id}`);
}

export async function getAttendanceRecords(
    params?: AttendanceQueryParams,
): Promise<AttendanceEntity[]> {
    const response = await api.get("/employees/attendance", { params });
    return extractApiArray<AttendanceEntity>(response.data);
}

export async function getMyAttendanceRecords(
    params?: AttendanceQueryParams,
): Promise<AttendanceEntity[]> {
    const response = await api.get("/employees/attendance/my", { params });
    return extractApiArray<AttendanceEntity>(response.data);
}

export async function getAttendanceSummary(
    params?: AttendanceQueryParams,
): Promise<AttendanceSummaryEntity> {
    const response = await api.get("/employees/attendance/summary", { params });
    return extractApiData<AttendanceSummaryEntity>(response.data);
}

export async function getMyAttendanceSummary(
    params?: AttendanceQueryParams,
): Promise<AttendanceSummaryEntity> {
    const response = await api.get("/employees/attendance/summary/my", { params });
    return extractApiData<AttendanceSummaryEntity>(response.data);
}

export async function getCurrentAttendance(): Promise<AttendanceCurrentEntity> {
    const response = await api.get("/employees/attendance/current");
    return extractApiData<AttendanceCurrentEntity>(response.data);
}

export async function checkInAttendance(data: {
    isRemote?: boolean;
    lat?: number;
    lng?: number;
    accuracy?: number;
    capturedAt?: string;
}): Promise<AttendanceCurrentEntity> {
    const response = await api.post("/employees/attendance/check-in", data);
    return extractApiData<AttendanceCurrentEntity>(response.data);
}

export async function checkOutAttendance(data?: {
    lat?: number;
    lng?: number;
    accuracy?: number;
    capturedAt?: string;
    notes?: string | null;
}): Promise<AttendanceCurrentEntity> {
    const response = await api.post("/employees/attendance/check-out", data || {});
    return extractApiData<AttendanceCurrentEntity>(response.data);
}

export async function syncAttendanceLocation(data: {
    lat: number;
    lng: number;
    accuracy?: number;
    capturedAt?: string;
}): Promise<AttendanceCurrentEntity> {
    const response = await api.post("/employees/attendance/location", data);
    return extractApiData<AttendanceCurrentEntity>(response.data);
}

export async function startAttendanceBreak(): Promise<AttendanceCurrentEntity> {
    const response = await api.post("/employees/attendance/break/start");
    return extractApiData<AttendanceCurrentEntity>(response.data);
}

export async function endAttendanceBreak(): Promise<AttendanceCurrentEntity> {
    const response = await api.post("/employees/attendance/break/end");
    return extractApiData<AttendanceCurrentEntity>(response.data);
}

export async function updateAttendanceRecord(
    id: string,
    data: {
        startTime?: string;
        endTime?: string | null;
        notes?: string | null;
        isRemote?: boolean;
    },
): Promise<AttendanceEntity> {
    const response = await api.put(`/employees/attendance/${id}`, data);
    return extractApiData<AttendanceEntity>(response.data);
}

export async function getLeaveRequests(): Promise<LeaveRequestEntity[]> {
    const response = await api.get("/employees/leave-requests");
    return extractApiArray<LeaveRequestEntity>(response.data);
}

export async function getMyLeaveRequests(): Promise<LeaveRequestEntity[]> {
    const response = await api.get("/employees/leave-requests/my");
    return extractApiArray<LeaveRequestEntity>(response.data);
}

export async function createLeaveRequest(data: {
    leaveType: "annual" | "sick" | "personal" | "unpaid";
    startDate: string;
    endDate: string;
    reason: string;
}): Promise<LeaveRequestEntity> {
    const response = await api.post("/employees/leave-requests", data);
    return extractApiData<LeaveRequestEntity>(response.data);
}

export async function reviewLeaveRequest(
    id: string,
    data: {
        status: "approved" | "rejected";
        reviewNote?: string | null;
    },
): Promise<LeaveRequestEntity> {
    const response = await api.put(`/employees/leave-requests/${id}/review`, data);
    return extractApiData<LeaveRequestEntity>(response.data);
}
