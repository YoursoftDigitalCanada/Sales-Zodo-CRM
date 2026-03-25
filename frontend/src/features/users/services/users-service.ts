import api from "@/lib/axios";
import { extractApiArray, extractApiData } from "@/types/api";

export interface UserEntity {
    id: string | number;
    [key: string]: unknown;
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

export interface AttendanceEntity {
    id: string;
    employeeId: string;
    employeeName: string;
    employeeAvatar?: string | null;
    date: string;
    checkIn?: string;
    checkOut?: string;
    status: "present" | "absent" | "late" | "half-day";
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

export async function getUsers(): Promise<UserEntity[]> {
    const response = await api.get("/users");
    return extractApiArray<UserEntity>(response.data);
}

export async function createUser(data: Record<string, unknown>): Promise<UserEntity> {
    const response = await api.post("/users", data);
    return response.data?.data || response.data;
}

export async function updateUser(id: string | number, data: Record<string, unknown>): Promise<UserEntity> {
    const response = await api.put(`/users/${id}`, data);
    return response.data?.data || response.data;
}

export async function deleteUser(id: string | number): Promise<void> {
    await api.delete(`/users/${id}`);
}

export async function getEmployees(params?: Record<string, unknown>): Promise<UserEntity[]> {
    const response = await api.get("/employees", { params: { limit: 200, ...params } });
    return extractApiArray<UserEntity>(response.data);
}

export async function getDepartments(): Promise<DepartmentEntity[]> {
    const response = await api.get("/employees/departments");
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
}): Promise<AttendanceCurrentEntity> {
    const response = await api.post("/employees/attendance/check-in", data);
    return extractApiData<AttendanceCurrentEntity>(response.data);
}

export async function checkOutAttendance(data?: {
    lat?: number;
    lng?: number;
    notes?: string | null;
}): Promise<AttendanceCurrentEntity> {
    const response = await api.post("/employees/attendance/check-out", data || {});
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
