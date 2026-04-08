import { Employee, Prisma } from '@prisma/client';

export interface EmployeeAddressDto {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}

export interface EmployeeEmergencyContactDto {
    name: string;
    relationship: string;
    phone: string;
}

export type EmployeeAddressInputDto = {
    [K in keyof EmployeeAddressDto]?: string | null;
};

export type EmployeeEmergencyContactInputDto = {
    [K in keyof EmployeeEmergencyContactDto]?: string | null;
};

export interface EmployeeDocumentDto {
    id: string;
    name: string;
    type: string;
    fileUrl: string;
    uploadedAt: Date;
}

export interface EmployeeProfileDto {
    skills: string[];
    address: EmployeeAddressDto;
    emergencyContact: EmployeeEmergencyContactDto;
    managerId: string | null;
    managerName: string | null;
}

type JsonRecord = Record<string, unknown>;

const EMPTY_ADDRESS: EmployeeAddressDto = {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
};

const EMPTY_EMERGENCY_CONTACT: EmployeeEmergencyContactDto = {
    name: '',
    relationship: '',
    phone: '',
};

function asRecord(value: unknown): JsonRecord {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as JsonRecord
        : {};
}

function asString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function asNullableString(value: unknown): string | null {
    const normalized = asString(value);
    return normalized || null;
}

function asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => asString(entry))
        .filter(Boolean);
}

export function normalizeEmployeeProfileData(value: unknown): EmployeeProfileDto {
    const record = asRecord(value);
    const addressRecord = asRecord(record.address);
    const emergencyRecord = asRecord(record.emergencyContact);

    return {
        skills: asStringArray(record.skills),
        address: {
            street: asString(addressRecord.street),
            city: asString(addressRecord.city),
            state: asString(addressRecord.state),
            zipCode: asString(addressRecord.zipCode),
            country: asString(addressRecord.country),
        },
        emergencyContact: {
            name: asString(emergencyRecord.name),
            relationship: asString(emergencyRecord.relationship),
            phone: asString(emergencyRecord.phone),
        },
        managerId: asNullableString(record.managerId),
        managerName: asNullableString(record.managerName),
    };
}

export function buildEmployeeProfileData(input: {
    skills?: string[] | null;
    address?: EmployeeAddressInputDto | null;
    emergencyContact?: EmployeeEmergencyContactInputDto | null;
    managerId?: string | null;
    managerName?: string | null;
}): Prisma.InputJsonValue {
    return {
        skills: asStringArray(input.skills),
        address: {
            street: asString(input.address?.street),
            city: asString(input.address?.city),
            state: asString(input.address?.state),
            zipCode: asString(input.address?.zipCode),
            country: asString(input.address?.country),
        },
        emergencyContact: {
            name: asString(input.emergencyContact?.name),
            relationship: asString(input.emergencyContact?.relationship),
            phone: asString(input.emergencyContact?.phone),
        },
        managerId: asNullableString(input.managerId),
        managerName: asNullableString(input.managerName),
    } satisfies JsonRecord;
}

export interface CreateEmployeeDto {
    userId: string;
    roleId: string;
    employeeNumber?: string;
    department?: string | null;
    position?: string | null;
    hireDate?: Date | string | null;
    phone?: string | null;
    salary?: number | null;
    employmentStatus?: string | null;
    employmentType?: string | null;
    skills?: string[] | null;
    address?: EmployeeAddressInputDto | null;
    emergencyContact?: EmployeeEmergencyContactInputDto | null;
    isActive?: boolean;
}

export interface UpdateEmployeeDto extends Partial<Omit<CreateEmployeeDto, 'userId'>> {
    firstName?: string;
    lastName?: string;
    email?: string;
}

export interface EmployeeQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    department?: string;
    sortBy?: 'createdAt' | 'hireDate' | 'department';
    sortOrder?: 'asc' | 'desc';
}

export interface EmployeeResponseDto {
    id: string;
    employeeNumber: string | null;
    department: string | null;
    position: string | null;
    hireDate: Date | null;
    isActive: boolean;
    employmentStatus: string;
    employmentType: string;
    salary: number | null;
    phone: string | null;
    skills: string[];
    address: EmployeeAddressDto;
    emergencyContact: EmployeeEmergencyContactDto;
    managerId: string | null;
    managerName: string | null;
    documents: EmployeeDocumentDto[];
    user: { id: string; firstName: string; lastName: string; email: string; avatar: string | null } | null;
    role: { id: string; name: string } | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface DepartmentConfigDto {
    id: string;
    name: string;
    code: string;
    description: string;
    headId?: string | null;
    budget: number;
    color: string;
    createdAt: string;
    isActive: boolean;
}

export interface CreateDepartmentDto {
    name: string;
    code: string;
    description: string;
    headId?: string | null;
    budget: number;
    color: string;
    isActive?: boolean;
}

export interface UpdateDepartmentDto extends Partial<CreateDepartmentDto> { }

export interface DepartmentResponseDto {
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
    createdAt: Date;
    isActive: boolean;
}

export interface AttendanceQueryDto {
    dateFrom?: Date | string;
    dateTo?: Date | string;
    employeeId?: string;
}

export interface AttendanceSummaryDto {
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

export interface AttendanceRecordDto {
    id: string;
    employeeId: string;
    employeeName: string;
    employeeAvatar?: string | null;
    date: Date;
    checkIn?: Date;
    checkOut?: Date;
    status: 'present' | 'absent' | 'late' | 'half-day' | 'on-leave';
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
    clockInCapturedAt?: Date | null;
    clockOutCapturedAt?: Date | null;
    lastSeenLat?: number | null;
    lastSeenLng?: number | null;
    lastSeenAccuracy?: number | null;
    lastSeenAt?: Date | null;
}

export interface AttendanceCurrentStatusDto {
    isCheckedIn: boolean;
    isOnBreak: boolean;
    breakMinutes: number;
    activeEntry: AttendanceRecordDto | null;
}

export interface LeaveRequestDto {
    id: string;
    employeeId: string;
    employeeName: string;
    employeeAvatar?: string | null;
    employeePosition: string;
    departmentName: string;
    leaveType: 'annual' | 'sick' | 'personal' | 'unpaid';
    startDate: Date;
    endDate: Date;
    totalDays: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    appliedAt: Date;
    approvedBy?: string;
    approvedAt?: Date;
    rejectionReason?: string;
}

export interface CreateLeaveRequestDto {
    leaveType: 'annual' | 'sick' | 'personal' | 'unpaid';
    startDate: string;
    endDate: string;
    reason: string;
}

export interface ReviewLeaveRequestDto {
    status: 'approved' | 'rejected';
    reviewNote?: string | null;
}

export interface AttendanceCheckInDto {
    isRemote?: boolean;
    lat?: number;
    lng?: number;
    accuracy?: number;
    capturedAt?: Date | string;
}

export interface AttendanceCheckOutDto {
    lat?: number;
    lng?: number;
    accuracy?: number;
    capturedAt?: Date | string;
    notes?: string | null;
}

export interface AttendanceLocationSyncDto {
    lat: number;
    lng: number;
    accuracy?: number;
    capturedAt?: Date | string;
}

export interface UpdateAttendanceRecordDto {
    startTime?: Date | string;
    endTime?: Date | string | null;
    notes?: string | null;
    isRemote?: boolean;
}

type EmployeeWithUser = Employee & {
    user: { id: string; firstName: string; lastName: string; email: string; avatar: string | null; phone: string | null };
    role?: { id: string; name: string } | null;
    employeeDocuments?: Array<{
        id: string;
        name: string;
        type: string;
        fileUrl: string;
        createdAt: Date;
    }>;
};

export function toEmployeeResponseDto(emp: EmployeeWithUser): EmployeeResponseDto {
    const profile = normalizeEmployeeProfileData(emp.profileData);

    return {
        id: emp.id,
        employeeNumber: emp.employeeNumber,
        department: emp.department,
        position: emp.position,
        hireDate: emp.hireDate,
        isActive: emp.isActive,
        employmentStatus: emp.employmentStatus || (emp.isActive ? 'active' : 'inactive'),
        employmentType: emp.employmentType || 'full-time',
        salary: typeof emp.salary === 'number' ? emp.salary : null,
        phone: emp.user.phone,
        skills: profile.skills,
        address: profile.address || EMPTY_ADDRESS,
        emergencyContact: profile.emergencyContact || EMPTY_EMERGENCY_CONTACT,
        managerId: profile.managerId,
        managerName: profile.managerName,
        documents: (emp.employeeDocuments || []).map((document) => ({
            id: document.id,
            name: document.name,
            type: document.type,
            fileUrl: document.fileUrl,
            uploadedAt: document.createdAt,
        })),
        user: {
            id: emp.user.id,
            firstName: emp.user.firstName,
            lastName: emp.user.lastName,
            email: emp.user.email,
            avatar: emp.user.avatar,
        },
        role: emp.role ? { id: emp.role.id, name: emp.role.name } : null,
        createdAt: emp.createdAt,
        updatedAt: emp.updatedAt,
    };
}
