import { employeesRepository } from './employees.repository';
import {
    CreateEmployeeDto,
    UpdateEmployeeDto,
    EmployeeQueryDto,
    CreateDepartmentDto,
    UpdateDepartmentDto,
    DepartmentConfigDto,
    DepartmentResponseDto,
    AttendanceQueryDto,
    AttendanceRecordDto,
    AttendanceSummaryDto,
    AttendanceCurrentStatusDto,
    AttendanceCheckInDto,
    AttendanceCheckOutDto,
    UpdateAttendanceRecordDto,
    toEmployeeResponseDto,
    buildEmployeeProfileData,
} from './employees.dto';
import { NotFoundError, ConflictError, BadRequestError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { eventBus } from '../../common/events/event-bus';
import { prisma } from '../../config/database';
import { hashPassword } from '../../common/utils/password';
import { v4 as uuidv4 } from 'uuid';

type EmployeeDepartmentRow = {
    id: string;
    department: string | null;
    position: string | null;
    hireDate: Date | null;
    createdAt: Date;
    user: {
        firstName: string;
        lastName: string;
        avatar: string | null;
    };
};

type AttendanceTimeEntryRow = {
    id: string;
    startTime: Date;
    endTime: Date | null;
    duration: number | null;
    phase: string | null;
    notes: string | null;
    description: string | null;
    status: string;
    employeeId: string;
    employee: {
        user: {
            firstName: string;
            lastName: string;
            avatar: string | null;
        };
    };
};

type AttendanceMeta = {
    isOnBreak?: boolean;
    breakStartedAt?: string | null;
    breakMinutes?: number;
    text?: string | null;
};

type DailyAttendanceAggregate = {
    employeeId: string;
    dayKey: string;
    checkIn: Date;
    workedMinutes: number;
    totalBreakMinutes: number;
    hasCompletedEntry: boolean;
};

const DEPARTMENTS_SETTINGS_KEY = 'employeeDepartments';
const DEFAULT_DEPARTMENT_COLORS = ['#22D3EE', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981', '#3B82F6', '#EF4444', '#FBBF24'];
const ATTENDANCE_META_PREFIX = '__attendance_meta__:';
const LATE_THRESHOLD_MINUTES = 9 * 60 + 15;
const HALF_DAY_MINUTES = 4 * 60;
const FULL_DAY_MINUTES = 8 * 60;

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function normalizeDepartmentValue(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function buildDepartmentCode(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    const initials = words
        .map((word) => word.replace(/[^a-z0-9]/gi, '').charAt(0))
        .join('')
        .toUpperCase();

    if (initials.length >= 2) {
        return initials.slice(0, 5);
    }

    const compact = name.replace(/[^a-z0-9]/gi, '').toUpperCase();
    return (compact || 'DEPT').slice(0, 5);
}

function buildSyntheticDepartmentId(name: string): string {
    const slug = normalizeDepartmentValue(name).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `derived-${slug || 'department'}`;
}

function pickDepartmentColor(name: string): string {
    const hash = [...normalizeDepartmentValue(name)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return DEFAULT_DEPARTMENT_COLORS[hash % DEFAULT_DEPARTMENT_COLORS.length];
}

function isManagerLike(position?: string | null): boolean {
    return /manager|lead|head|director/i.test(position || '');
}

function coerceBudget(value: unknown): number {
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
}

function coerceDepartmentConfig(value: unknown): DepartmentConfigDto | null {
    const record = asRecord(value);
    const name = typeof record.name === 'string' ? record.name.trim() : '';

    if (!name) {
        return null;
    }

    const code = typeof record.code === 'string' && record.code.trim()
        ? record.code.trim().toUpperCase()
        : buildDepartmentCode(name);
    const description = typeof record.description === 'string' && record.description.trim()
        ? record.description.trim()
        : `${name} department`;
    const createdAt = typeof record.createdAt === 'string' && !Number.isNaN(Date.parse(record.createdAt))
        ? record.createdAt
        : new Date().toISOString();

    return {
        id: typeof record.id === 'string' && record.id.trim() ? record.id.trim() : buildSyntheticDepartmentId(name),
        name,
        code,
        description,
        headId: typeof record.headId === 'string' && record.headId.trim() ? record.headId.trim() : null,
        budget: coerceBudget(record.budget),
        color: typeof record.color === 'string' && record.color.trim() ? record.color.trim() : pickDepartmentColor(name),
        createdAt,
        isActive: typeof record.isActive === 'boolean' ? record.isActive : true,
    };
}

function normalizeDate(value?: Date | string | null): Date | null {
    if (!value) {
        return null;
    }

    const nextValue = value instanceof Date ? value : new Date(value);
    return Number.isNaN(nextValue.getTime()) ? null : nextValue;
}

function getDayKey(value: Date): string {
    return value.toISOString().slice(0, 10);
}

function getMinutesSinceMidnight(value: Date): number {
    return value.getHours() * 60 + value.getMinutes();
}

function roundHours(minutes: number): number {
    return Math.round((Math.max(0, minutes) / 60) * 10) / 10;
}

function isWeekend(value: Date): boolean {
    const day = value.getDay();
    return day === 0 || day === 6;
}

function formatAverageCheckIn(minutes: number): string {
    const hours24 = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    return `${hours12}:${String(mins).padStart(2, '0')} ${period}`;
}

function overlapsRange(
    rangeStart: Date,
    rangeEnd: Date,
    itemStart: Date,
    itemEnd: Date,
): boolean {
    return itemStart <= rangeEnd && itemEnd >= rangeStart;
}

function parseAttendanceMeta(description?: string | null): AttendanceMeta {
    if (!description || !description.startsWith(ATTENDANCE_META_PREFIX)) {
        return {
            breakMinutes: 0,
            text: description || null,
        };
    }

    try {
        const parsed = JSON.parse(description.slice(ATTENDANCE_META_PREFIX.length)) as AttendanceMeta;
        return {
            isOnBreak: parsed.isOnBreak === true,
            breakStartedAt: typeof parsed.breakStartedAt === 'string' ? parsed.breakStartedAt : null,
            breakMinutes: typeof parsed.breakMinutes === 'number' && Number.isFinite(parsed.breakMinutes)
                ? Math.max(0, parsed.breakMinutes)
                : 0,
            text: typeof parsed.text === 'string' ? parsed.text : null,
        };
    } catch {
        return {
            breakMinutes: 0,
            text: description,
        };
    }
}

function serializeAttendanceMeta(meta: AttendanceMeta): string | null {
    const normalized: AttendanceMeta = {
        isOnBreak: meta.isOnBreak === true,
        breakStartedAt: meta.breakStartedAt || null,
        breakMinutes: typeof meta.breakMinutes === 'number' && Number.isFinite(meta.breakMinutes)
            ? Math.max(0, Math.round(meta.breakMinutes))
            : 0,
        text: meta.text?.trim() || null,
    };

    return `${ATTENDANCE_META_PREFIX}${JSON.stringify(normalized)}`;
}

function getBreakMinutes(meta: AttendanceMeta, now: Date = new Date()): number {
    const savedBreakMinutes = typeof meta.breakMinutes === 'number' && Number.isFinite(meta.breakMinutes)
        ? Math.max(0, meta.breakMinutes)
        : 0;

    if (!meta.isOnBreak || !meta.breakStartedAt) {
        return savedBreakMinutes;
    }

    const breakStartedAt = normalizeDate(meta.breakStartedAt);
    if (!breakStartedAt) {
        return savedBreakMinutes;
    }

    const activeBreakMinutes = Math.max(0, Math.round((now.getTime() - breakStartedAt.getTime()) / 60000));
    return savedBreakMinutes + activeBreakMinutes;
}

function getRawDurationMinutes(entry: AttendanceTimeEntryRow, now: Date = new Date()): number {
    if (typeof entry.duration === 'number' && Number.isFinite(entry.duration)) {
        return Math.max(0, entry.duration);
    }

    const endTime = entry.endTime || now;
    return Math.max(0, Math.round((endTime.getTime() - entry.startTime.getTime()) / 60000));
}

function getEffectiveDurationMinutes(entry: AttendanceTimeEntryRow, meta: AttendanceMeta, now: Date = new Date()): number {
    return Math.max(0, getRawDurationMinutes(entry, now) - getBreakMinutes(meta, now));
}

function getAttendanceStatus(
    checkIn: Date,
    workedMinutes: number,
    hasCompletedEntry: boolean,
): AttendanceRecordDto['status'] {
    if (hasCompletedEntry && workedMinutes > 0 && workedMinutes < HALF_DAY_MINUTES) {
        return 'half-day';
    }

    if (getMinutesSinceMidnight(checkIn) > LATE_THRESHOLD_MINUTES) {
        return 'late';
    }

    return 'present';
}

function mapTimeEntryToAttendanceRecord(entry: AttendanceTimeEntryRow): AttendanceRecordDto {
    const meta = parseAttendanceMeta(entry.description);
    const workedMinutes = getEffectiveDurationMinutes(entry, meta);
    const workHours = roundHours(workedMinutes);

    return {
        id: entry.id,
        employeeId: entry.employeeId,
        employeeName: `${entry.employee.user.firstName} ${entry.employee.user.lastName}`.trim(),
        employeeAvatar: entry.employee.user.avatar,
        date: entry.startTime,
        checkIn: entry.startTime,
        checkOut: entry.endTime || undefined,
        status: getAttendanceStatus(entry.startTime, workedMinutes, Boolean(entry.endTime)),
        workHours,
        overtime: roundHours(Math.max(0, workedMinutes - FULL_DAY_MINUTES)),
        notes: entry.notes,
        location: isRemoteAttendance(entry.phase) ? 'Remote' : 'Office',
        isRemote: isRemoteAttendance(entry.phase),
        breakMinutes: getBreakMinutes(meta),
    };
}

function isRemoteAttendance(phase?: string | null): boolean {
    return phase?.trim().toUpperCase() === 'REMOTE';
}

export class EmployeesService {
    async create(tenantId: string, data: CreateEmployeeDto) {
        const emp = await employeesRepository.create(tenantId, data);
        const dto = toEmployeeResponseDto(emp);
        const employeeName = `${emp.user.firstName} ${emp.user.lastName}`.trim();

        activityLogger.log({
            tenantId, entityType: 'Employee', entityId: dto.id,
            action: 'CREATE', module: 'employees',
            description: `Created employee "${employeeName}"`,
            metadata: { position: (emp as any).position, department: (emp as any).department },
        });

        eventBus.emit('employee.created', {
            tenantId,
            employeeId: dto.id,
            employeeName,
            department: (emp as any).department || undefined,
        });

        return dto;
    }

    /**
     * Create portal access for an employee (User + Employee in same tenant).
     * CRM admin calls this to give crew members login credentials.
     */
    async createPortalAccess(tenantId: string, data: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        phone?: string | null;
        position?: string;
        department?: string;
        hireDate?: string | Date | null;
        salary?: number | null;
        employmentStatus?: string | null;
        employmentType?: string | null;
        skills?: string[] | null;
        address?: {
            street?: string | null;
            city?: string | null;
            state?: string | null;
            zipCode?: string | null;
            country?: string | null;
        } | null;
        emergencyContact?: {
            name?: string | null;
            relationship?: string | null;
            phone?: string | null;
        } | null;
    }) {
        // Validate email domain
        if (!data.email.endsWith('@zodo.ca')) {
            throw new BadRequestError('Portal email must end with @zodo.ca');
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email.toLowerCase() },
        });

        if (existingUser) {
            throw new ConflictError(
                'An account with this email already exists',
                ErrorCodes.USER_ALREADY_EXISTS
            );
        }

        // Find Staff role for this tenant (lowest permission level for crew)
        const staffRole = await prisma.role.findFirst({
            where: { tenantId, name: 'Staff' },
        });

        if (!staffRole) {
            throw new BadRequestError('Staff role not found for this tenant. Please contact support.');
        }

        const passwordHash = await hashPassword(data.password);

        // Create User + Employee in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: data.email.toLowerCase(),
                    passwordHash,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    phone: data.phone || null,
                    status: 'ACTIVE',
                    emailVerified: true,
                    tenant: { connect: { id: tenantId } },
                },
            });

            const employee = await tx.employee.create({
                data: {
                    user: { connect: { id: user.id } },
                    tenant: { connect: { id: tenantId } },
                    role: { connect: { id: staffRole.id } },
                    position: data.position || 'Crew Member',
                    department: data.department || null,
                    hireDate: data.hireDate ? new Date(data.hireDate) : null,
                    employmentStatus: data.employmentStatus || 'active',
                    employmentType: data.employmentType || 'full-time',
                    salary: data.salary ?? null,
                    profileData: buildEmployeeProfileData({
                        skills: data.skills,
                        address: data.address,
                        emergencyContact: data.emergencyContact,
                    }),
                    isActive: data.employmentStatus !== 'inactive',
                },
                include: {
                    user: { select: { email: true, firstName: true, lastName: true } },
                    role: { select: { name: true } },
                },
            });

            return { user, employee };
        });

        activityLogger.log({
            tenantId, entityType: 'Employee', entityId: result.employee.id,
            action: 'CREATE', module: 'employees',
            description: `Created crew portal access for ${data.firstName} ${data.lastName} (${data.email})`,
            metadata: { portalEmail: data.email },
        });

        return {
            success: true,
            message: `Portal access created for ${data.email}`,
            employee: {
                id: result.employee.id,
                userId: result.user.id,
                email: result.user.email,
                firstName: result.user.firstName,
                lastName: result.user.lastName,
                role: result.employee.role?.name,
            },
        };
    }

    async getDepartments(tenantId: string): Promise<DepartmentResponseDto[]> {
        const { settings, employees } = await this.getDepartmentContext(tenantId);
        return this.buildDepartmentResponses(settings, employees);
    }

    async createDepartment(tenantId: string, data: CreateDepartmentDto): Promise<DepartmentResponseDto> {
        const { settings, employees } = await this.getDepartmentContext(tenantId);
        const currentDepartments = this.buildDepartmentResponses(settings, employees);

        if (data.headId && !employees.some((employee) => employee.id === data.headId)) {
            throw new BadRequestError('Department head not found', ErrorCodes.EMPLOYEE_NOT_FOUND);
        }

        this.assertDepartmentUniqueness(currentDepartments, data.name, data.code);

        const storedDepartments = this.getStoredDepartmentConfigs(settings);
        const nextDepartment: DepartmentConfigDto = {
            id: `dept-${uuidv4()}`,
            name: data.name.trim(),
            code: data.code.trim().toUpperCase(),
            description: data.description.trim(),
            headId: data.headId || null,
            budget: data.budget,
            color: data.color.trim(),
            createdAt: new Date().toISOString(),
            isActive: data.isActive ?? true,
        };

        await this.saveDepartmentConfigs(tenantId, settings, [...storedDepartments, nextDepartment]);

        activityLogger.log({
            tenantId,
            entityType: 'Department',
            entityId: nextDepartment.id,
            action: 'CREATE',
            module: 'employees',
            description: `Created department "${nextDepartment.name}"`,
        });

        const departments = await this.getDepartments(tenantId);
        const created = departments.find((department) => department.id === nextDepartment.id);
        if (!created) {
            throw new NotFoundError('Department not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        return created;
    }

    async updateDepartment(departmentId: string, tenantId: string, data: UpdateDepartmentDto): Promise<DepartmentResponseDto> {
        const { settings, employees } = await this.getDepartmentContext(tenantId);
        const currentDepartments = this.buildDepartmentResponses(settings, employees);
        const existingDepartment = currentDepartments.find((department) => department.id === departmentId);

        if (!existingDepartment) {
            throw new NotFoundError('Department not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        if (data.headId && !employees.some((employee) => employee.id === data.headId)) {
            throw new BadRequestError('Department head not found', ErrorCodes.EMPLOYEE_NOT_FOUND);
        }

        const nextName = data.name?.trim() || existingDepartment.name;
        const nextCode = data.code?.trim().toUpperCase() || existingDepartment.code;
        this.assertDepartmentUniqueness(currentDepartments, nextName, nextCode, departmentId);

        const storedDepartments = this.getStoredDepartmentConfigs(settings);
        const storedIndex = storedDepartments.findIndex((department) => department.id === departmentId);
        const nextDepartment: DepartmentConfigDto = {
            id: departmentId,
            name: nextName,
            code: nextCode,
            description: data.description?.trim() || existingDepartment.description,
            headId: data.headId !== undefined ? (data.headId || null) : (existingDepartment.headId || null),
            budget: data.budget ?? existingDepartment.budget,
            color: data.color?.trim() || existingDepartment.color,
            createdAt: existingDepartment.createdAt.toISOString(),
            isActive: data.isActive ?? existingDepartment.isActive,
        };
        const renamed = normalizeDepartmentValue(existingDepartment.name) !== normalizeDepartmentValue(nextName);

        await prisma.$transaction(async (tx) => {
            if (renamed) {
                await tx.employee.updateMany({
                    where: {
                        tenantId,
                        department: {
                            equals: existingDepartment.name,
                            mode: 'insensitive',
                        },
                    },
                    data: {
                        department: nextName,
                    },
                });
            }

            const nextStoredDepartments = [...storedDepartments];
            if (storedIndex >= 0) {
                nextStoredDepartments[storedIndex] = nextDepartment;
            } else {
                nextStoredDepartments.push(nextDepartment);
            }

            await tx.tenant.update({
                where: { id: tenantId },
                data: {
                    settings: {
                        ...settings,
                        [DEPARTMENTS_SETTINGS_KEY]: nextStoredDepartments,
                    } as any,
                },
            });
        });

        activityLogger.log({
            tenantId,
            entityType: 'Department',
            entityId: departmentId,
            action: 'UPDATE',
            module: 'employees',
            description: `Updated department "${existingDepartment.name}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        const departments = await this.getDepartments(tenantId);
        const updated = departments.find((department) => department.id === departmentId);
        if (!updated) {
            throw new NotFoundError('Department not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        return updated;
    }

    async deleteDepartment(departmentId: string, tenantId: string): Promise<void> {
        const { settings, employees } = await this.getDepartmentContext(tenantId);
        const currentDepartments = this.buildDepartmentResponses(settings, employees);
        const existingDepartment = currentDepartments.find((department) => department.id === departmentId);

        if (!existingDepartment) {
            throw new NotFoundError('Department not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        if (existingDepartment.employeeCount > 0) {
            throw new BadRequestError(`Cannot delete ${existingDepartment.name}. It still has active employees.`);
        }

        const storedDepartments = this.getStoredDepartmentConfigs(settings);
        const nextStoredDepartments = storedDepartments.filter((department) => department.id !== departmentId);

        await this.saveDepartmentConfigs(tenantId, settings, nextStoredDepartments);

        activityLogger.log({
            tenantId,
            entityType: 'Department',
            entityId: departmentId,
            action: 'DELETE',
            module: 'employees',
            description: `Deleted department "${existingDepartment.name}"`,
        });
    }

    async getById(id: string, tenantId: string) {
        const emp = await employeesRepository.findById(id, tenantId);
        if (!emp) throw new NotFoundError('Employee not found', ErrorCodes.EMPLOYEE_NOT_FOUND);
        return toEmployeeResponseDto(emp);
    }

    async getMany(tenantId: string, query: EmployeeQueryDto) {
        const { data, total } = await employeesRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(toEmployeeResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }

    async update(id: string, tenantId: string, data: UpdateEmployeeDto) {
        const existing = await employeesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Employee not found', ErrorCodes.EMPLOYEE_NOT_FOUND);

        if (data.email && data.email.toLowerCase() !== existing.user.email.toLowerCase()) {
            const matchingUser = await prisma.user.findUnique({
                where: { email: data.email.toLowerCase() },
                select: { id: true },
            });

            if (matchingUser && matchingUser.id !== existing.userId) {
                throw new ConflictError(
                    'An account with this email already exists',
                    ErrorCodes.USER_ALREADY_EXISTS,
                );
            }
        }

        const emp = await employeesRepository.update(id, tenantId, data);
        const dto = toEmployeeResponseDto(emp);
        const employeeName = `${emp.user.firstName} ${emp.user.lastName}`.trim();

        activityLogger.log({
            tenantId, entityType: 'Employee', entityId: dto.id,
            action: 'UPDATE', module: 'employees',
            description: `Updated employee "${employeeName}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        return dto;
    }

    async delete(id: string, tenantId: string) {
        const existing = await employeesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Employee not found', ErrorCodes.EMPLOYEE_NOT_FOUND);
        const employeeName = `${existing.user.firstName} ${existing.user.lastName}`.trim();

        activityLogger.log({
            tenantId, entityType: 'Employee', entityId: id,
            action: 'DELETE', module: 'employees',
            description: `Deleted employee "${employeeName}"`,
        });

        await employeesRepository.delete(id, tenantId);
    }

    /**
     * Get data-level access for an employee.
     * Returns the list of client IDs and project IDs the employee has access to.
     */
    async getAccess(employeeId: string, tenantId: string) {
        const existing = await employeesRepository.findById(employeeId, tenantId);
        if (!existing) throw new NotFoundError('Employee not found', ErrorCodes.EMPLOYEE_NOT_FOUND);

        const accessRows = await prisma.userAccess.findMany({
            where: { employeeId, tenantId },
            include: {
                client: { select: { id: true, clientName: true } },
                project: { select: { id: true, name: true } },
            },
        });

        return {
            employeeId,
            clients: accessRows
                .filter((r) => r.clientId)
                .map((r) => ({ id: r.client!.id, name: r.client!.clientName })),
            projects: accessRows
                .filter((r) => r.projectId)
                .map((r) => ({ id: r.project!.id, name: r.project!.name })),
        };
    }

    /**
     * Set data-level access for an employee.
     * Replaces all UserAccess rows for this employee.
     *
     * Body: { clientIds: string[], projectIds: string[] }
     */
    async setAccess(employeeId: string, tenantId: string, data: { clientIds?: string[]; projectIds?: string[] }) {
        const existing = await employeesRepository.findById(employeeId, tenantId);
        if (!existing) throw new NotFoundError('Employee not found', ErrorCodes.EMPLOYEE_NOT_FOUND);

        const clientIds = data.clientIds || [];
        const projectIds = data.projectIds || [];

        await prisma.$transaction(async (tx) => {
            // Delete all existing access rows
            await tx.userAccess.deleteMany({ where: { employeeId, tenantId } });

            // Insert new client access rows
            if (clientIds.length > 0) {
                await tx.userAccess.createMany({
                    data: clientIds.map((clientId) => ({
                        employeeId,
                        clientId,
                        tenantId,
                    })),
                });
            }

            // Insert new project access rows
            if (projectIds.length > 0) {
                await tx.userAccess.createMany({
                    data: projectIds.map((projectId) => ({
                        employeeId,
                        projectId,
                        tenantId,
                    })),
                });
            }
        });

        activityLogger.log({
            tenantId, entityType: 'Employee', entityId: employeeId,
            action: 'UPDATE', module: 'employees',
            description: `Updated data access for employee: ${clientIds.length} clients, ${projectIds.length} projects`,
            metadata: { clientIds, projectIds },
        });

        return this.getAccess(employeeId, tenantId);
    }

    async getAttendance(tenantId: string, query: AttendanceQueryDto): Promise<AttendanceRecordDto[]> {
        const { dateFrom, dateTo, employeeId } = this.resolveAttendanceRange(query);
        const entries = await prisma.timeEntry.findMany({
            where: {
                tenantId,
                ...(employeeId ? { employeeId } : {}),
                startTime: {
                    gte: dateFrom,
                    lte: dateTo,
                },
            },
            include: {
                employee: {
                    select: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                avatar: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                startTime: 'desc',
            },
        });

        return entries.map(mapTimeEntryToAttendanceRecord);
    }

    async getAttendanceSummary(tenantId: string, query: AttendanceQueryDto): Promise<AttendanceSummaryDto> {
        const { dateFrom, dateTo, employeeId } = this.resolveAttendanceRange(query);
        const [entries, activeEmployees, leaveRequests] = await Promise.all([
            prisma.timeEntry.findMany({
                where: {
                    tenantId,
                    ...(employeeId ? { employeeId } : {}),
                    startTime: {
                        gte: dateFrom,
                        lte: dateTo,
                    },
                },
                include: {
                    employee: {
                        select: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    avatar: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    startTime: 'asc',
                },
            }),
            employeeId
                ? prisma.employee.count({
                    where: {
                        id: employeeId,
                        tenantId,
                        isActive: true,
                    },
                })
                : prisma.employee.count({
                    where: {
                        tenantId,
                        isActive: true,
                    },
                }),
            prisma.leaveRequest.findMany({
                where: {
                    tenantId,
                    ...(employeeId ? { employeeId } : {}),
                    status: 'APPROVED',
                    startDate: { lte: dateTo },
                    endDate: { gte: dateFrom },
                },
                select: {
                    employeeId: true,
                    startDate: true,
                    endDate: true,
                },
            }),
        ]);

        const dailyAttendance = this.buildDailyAttendance(entries, dateFrom, dateTo);
        const leaveDayKeys = this.buildLeaveDayKeys(leaveRequests, dateFrom, dateTo);
        const totalEmployees = employeeId ? Math.min(activeEmployees, 1) : activeEmployees;

        let presentCount = 0;
        let lateCount = 0;
        let halfDayCount = 0;
        let totalWorkedMinutes = 0;
        let totalOvertimeMinutes = 0;
        let totalCheckInMinutes = 0;
        let workedDayCount = 0;

        for (const attendance of dailyAttendance.values()) {
            if (attendance.workedMinutes <= 0) {
                continue;
            }

            workedDayCount += 1;
            totalWorkedMinutes += attendance.workedMinutes;
            totalOvertimeMinutes += Math.max(0, attendance.workedMinutes - FULL_DAY_MINUTES);
            totalCheckInMinutes += getMinutesSinceMidnight(attendance.checkIn);

            const status = getAttendanceStatus(
                attendance.checkIn,
                attendance.workedMinutes,
                attendance.hasCompletedEntry,
            );

            if (status === 'half-day') {
                halfDayCount += 1;
                continue;
            }

            if (status === 'late') {
                lateCount += 1;
                continue;
            }

            presentCount += 1;
        }

        const businessDays = this.countBusinessDays(dateFrom, dateTo);
        const leaveDayCount = leaveDayKeys.size;
        const totalWorkingDays = Math.max(
            0,
            (employeeId ? businessDays : businessDays * totalEmployees) - leaveDayCount,
        );
        const absentCount = Math.max(
            0,
            totalWorkingDays - presentCount - lateCount - halfDayCount,
        );

        return {
            totalEmployees,
            presentCount,
            absentCount,
            lateCount,
            halfDayCount,
            onLeaveCount: leaveDayCount,
            totalWorkingDays,
            averageCheckIn: workedDayCount > 0
                ? formatAverageCheckIn(totalCheckInMinutes / workedDayCount)
                : null,
            averageWorkHours: workedDayCount > 0 ? roundHours(totalWorkedMinutes / workedDayCount) : 0,
            overtimeHours: roundHours(totalOvertimeMinutes),
        };
    }

    async getCurrentAttendanceStatus(employeeId: string, tenantId: string): Promise<AttendanceCurrentStatusDto> {
        const activeEntry = await prisma.timeEntry.findFirst({
            where: {
                employeeId,
                tenantId,
                status: 'CLOCKED_IN',
            },
            include: {
                employee: {
                    select: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                avatar: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                startTime: 'desc',
            },
        });

        if (!activeEntry) {
            return {
                isCheckedIn: false,
                isOnBreak: false,
                breakMinutes: 0,
                activeEntry: null,
            };
        }

        const meta = parseAttendanceMeta(activeEntry.description);
        return {
            isCheckedIn: true,
            isOnBreak: meta.isOnBreak === true,
            breakMinutes: getBreakMinutes(meta),
            activeEntry: mapTimeEntryToAttendanceRecord(activeEntry),
        };
    }

    async checkInAttendance(
        employeeId: string,
        tenantId: string,
        data: AttendanceCheckInDto,
    ): Promise<AttendanceCurrentStatusDto> {
        const existing = await prisma.timeEntry.findFirst({
            where: {
                employeeId,
                tenantId,
                status: 'CLOCKED_IN',
            },
        });

        if (existing) {
            throw new ConflictError('Already checked in. Please check out first.', ErrorCodes.RESOURCE_ALREADY_EXISTS);
        }

        await prisma.timeEntry.create({
            data: {
                employeeId,
                tenantId,
                startTime: new Date(),
                status: 'CLOCKED_IN',
                phase: data.isRemote ? 'REMOTE' : 'OFFICE',
                clockInLat: data.lat ?? null,
                clockInLng: data.lng ?? null,
                description: serializeAttendanceMeta({
                    isOnBreak: false,
                    breakStartedAt: null,
                    breakMinutes: 0,
                    text: null,
                }),
            },
        });

        activityLogger.log({
            tenantId,
            entityType: 'Attendance',
            entityId: employeeId,
            action: 'CREATE',
            module: 'employees',
            description: `Employee ${employeeId} checked in`,
            metadata: { isRemote: data.isRemote === true },
        });

        return this.getCurrentAttendanceStatus(employeeId, tenantId);
    }

    async checkOutAttendance(
        employeeId: string,
        tenantId: string,
        data: AttendanceCheckOutDto,
    ): Promise<AttendanceCurrentStatusDto> {
        const entry = await prisma.timeEntry.findFirst({
            where: {
                employeeId,
                tenantId,
                status: 'CLOCKED_IN',
            },
            orderBy: {
                startTime: 'desc',
            },
        });

        if (!entry) {
            throw new NotFoundError('No active attendance entry found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        const endTime = new Date();
        const meta = parseAttendanceMeta(entry.description);
        const breakMinutes = getBreakMinutes(meta, endTime);

        await prisma.timeEntry.update({
            where: { id: entry.id },
            data: {
                endTime,
                duration: Math.max(0, Math.round((endTime.getTime() - entry.startTime.getTime()) / 60000)),
                status: 'COMPLETED',
                clockOutLat: data.lat ?? null,
                clockOutLng: data.lng ?? null,
                notes: data.notes !== undefined ? data.notes : entry.notes,
                description: serializeAttendanceMeta({
                    ...meta,
                    isOnBreak: false,
                    breakStartedAt: null,
                    breakMinutes,
                }),
            },
        });

        activityLogger.log({
            tenantId,
            entityType: 'Attendance',
            entityId: entry.id,
            action: 'UPDATE',
            module: 'employees',
            description: `Employee ${employeeId} checked out`,
        });

        return this.getCurrentAttendanceStatus(employeeId, tenantId);
    }

    async startAttendanceBreak(employeeId: string, tenantId: string): Promise<AttendanceCurrentStatusDto> {
        const entry = await prisma.timeEntry.findFirst({
            where: {
                employeeId,
                tenantId,
                status: 'CLOCKED_IN',
            },
            orderBy: {
                startTime: 'desc',
            },
        });

        if (!entry) {
            throw new NotFoundError('No active attendance entry found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        const meta = parseAttendanceMeta(entry.description);
        if (meta.isOnBreak) {
            throw new ConflictError('Break is already active', ErrorCodes.RESOURCE_ALREADY_EXISTS);
        }

        await prisma.timeEntry.update({
            where: { id: entry.id },
            data: {
                description: serializeAttendanceMeta({
                    ...meta,
                    isOnBreak: true,
                    breakStartedAt: new Date().toISOString(),
                }),
            },
        });

        return this.getCurrentAttendanceStatus(employeeId, tenantId);
    }

    async endAttendanceBreak(employeeId: string, tenantId: string): Promise<AttendanceCurrentStatusDto> {
        const entry = await prisma.timeEntry.findFirst({
            where: {
                employeeId,
                tenantId,
                status: 'CLOCKED_IN',
            },
            orderBy: {
                startTime: 'desc',
            },
        });

        if (!entry) {
            throw new NotFoundError('No active attendance entry found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        const meta = parseAttendanceMeta(entry.description);
        if (!meta.isOnBreak || !meta.breakStartedAt) {
            throw new BadRequestError('Break is not currently active', ErrorCodes.INVALID_INPUT);
        }

        await prisma.timeEntry.update({
            where: { id: entry.id },
            data: {
                description: serializeAttendanceMeta({
                    ...meta,
                    isOnBreak: false,
                    breakStartedAt: null,
                    breakMinutes: getBreakMinutes(meta),
                }),
            },
        });

        return this.getCurrentAttendanceStatus(employeeId, tenantId);
    }

    async updateAttendanceRecord(
        attendanceId: string,
        tenantId: string,
        data: UpdateAttendanceRecordDto,
    ): Promise<AttendanceRecordDto> {
        const existing = await prisma.timeEntry.findFirst({
            where: {
                id: attendanceId,
                tenantId,
            },
            include: {
                employee: {
                    select: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                avatar: true,
                            },
                        },
                    },
                },
            },
        });

        if (!existing) {
            throw new NotFoundError('Attendance record not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        const startTime = data.startTime ? new Date(data.startTime) : existing.startTime;
        const endTime = data.endTime === undefined
            ? existing.endTime
            : data.endTime
                ? new Date(data.endTime)
                : null;

        if (Number.isNaN(startTime.getTime()) || (endTime && Number.isNaN(endTime.getTime()))) {
            throw new BadRequestError('Invalid attendance date or time');
        }

        if (endTime && endTime.getTime() < startTime.getTime()) {
            throw new BadRequestError('Check-out time must be after check-in time');
        }

        const meta = parseAttendanceMeta(existing.description);
        const updated = await prisma.timeEntry.update({
            where: {
                id: attendanceId,
            },
            data: {
                startTime,
                endTime,
                duration: endTime
                    ? Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 60000))
                    : null,
                status: endTime ? 'COMPLETED' : 'CLOCKED_IN',
                notes: data.notes !== undefined ? data.notes : existing.notes,
                phase: data.isRemote === undefined
                    ? existing.phase
                    : data.isRemote
                        ? 'REMOTE'
                        : 'OFFICE',
                description: serializeAttendanceMeta({
                    ...meta,
                    isOnBreak: endTime ? false : meta.isOnBreak,
                    breakStartedAt: endTime ? null : meta.breakStartedAt,
                }),
            },
            include: {
                employee: {
                    select: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                avatar: true,
                            },
                        },
                    },
                },
            },
        });

        activityLogger.log({
            tenantId,
            entityType: 'Attendance',
            entityId: attendanceId,
            action: 'UPDATE',
            module: 'employees',
            description: `Updated attendance record ${attendanceId}`,
            metadata: { updatedFields: Object.keys(data) },
        });

        return mapTimeEntryToAttendanceRecord(updated);
    }

    async getAttendanceOwnerId(attendanceId: string, tenantId: string): Promise<string | null> {
        const entry = await prisma.timeEntry.findFirst({
            where: {
                id: attendanceId,
                tenantId,
            },
            select: {
                employeeId: true,
            },
        });

        return entry?.employeeId || null;
    }

    private async getDepartmentContext(tenantId: string): Promise<{ settings: Record<string, unknown>; employees: EmployeeDepartmentRow[] }> {
        const [tenant, employees] = await Promise.all([
            prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { settings: true },
            }),
            prisma.employee.findMany({
                where: { tenantId },
                select: {
                    id: true,
                    department: true,
                    position: true,
                    hireDate: true,
                    createdAt: true,
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            avatar: true,
                        },
                    },
                },
            }),
        ]);

        if (!tenant) {
            throw new NotFoundError('Tenant not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        return {
            settings: asRecord(tenant.settings),
            employees,
        };
    }

    private getStoredDepartmentConfigs(settings: Record<string, unknown>): DepartmentConfigDto[] {
        const rawDepartments = settings[DEPARTMENTS_SETTINGS_KEY];
        if (!Array.isArray(rawDepartments)) {
            return [];
        }

        const seenIds = new Set<string>();
        const seenNames = new Set<string>();
        const departments: DepartmentConfigDto[] = [];

        for (const rawDepartment of rawDepartments) {
            const department = coerceDepartmentConfig(rawDepartment);
            if (!department) {
                continue;
            }

            const normalizedName = normalizeDepartmentValue(department.name);
            if (seenIds.has(department.id) || seenNames.has(normalizedName)) {
                continue;
            }

            seenIds.add(department.id);
            seenNames.add(normalizedName);
            departments.push(department);
        }

        return departments;
    }

    private buildDepartmentResponses(
        settings: Record<string, unknown>,
        employees: EmployeeDepartmentRow[],
    ): DepartmentResponseDto[] {
        const storedDepartments = this.getStoredDepartmentConfigs(settings);
        const employeesById = new Map(employees.map((employee) => [employee.id, employee]));
        const employeeGroups = new Map<string, EmployeeDepartmentRow[]>();

        for (const employee of employees) {
            const name = typeof employee.department === 'string' ? employee.department.trim() : '';
            if (!name) {
                continue;
            }

            const normalizedName = normalizeDepartmentValue(name);
            const bucket = employeeGroups.get(normalizedName) || [];
            bucket.push(employee);
            employeeGroups.set(normalizedName, bucket);
        }

        const storedByName = new Map(
            storedDepartments.map((department) => [normalizeDepartmentValue(department.name), department]),
        );
        const allKeys = new Set<string>([...storedByName.keys(), ...employeeGroups.keys()]);

        return [...allKeys]
            .map((key) => {
                const stored = storedByName.get(key);
                const group = employeeGroups.get(key) || [];
                const baseName = stored?.name || group[0]?.department?.trim() || 'Department';
                const inferredHead = group.find((employee) => isManagerLike(employee.position));
                const effectiveHeadId = stored?.headId || inferredHead?.id || null;
                const headEmployee = effectiveHeadId ? employeesById.get(effectiveHeadId) : undefined;
                const earliestGroupDate = group.reduce<Date | null>((earliest, employee) => {
                    const candidate = employee.hireDate || employee.createdAt;
                    if (!earliest || candidate.getTime() < earliest.getTime()) {
                        return candidate;
                    }
                    return earliest;
                }, null);
                const createdAt = stored?.createdAt
                    ? new Date(stored.createdAt)
                    : earliestGroupDate || new Date();

                return {
                    id: stored?.id || buildSyntheticDepartmentId(baseName),
                    name: baseName,
                    code: stored?.code || buildDepartmentCode(baseName),
                    description: stored?.description || `${baseName} department`,
                    headId: effectiveHeadId,
                    headName: headEmployee ? `${headEmployee.user.firstName} ${headEmployee.user.lastName}`.trim() : undefined,
                    headAvatar: headEmployee?.user.avatar || null,
                    employeeCount: group.length,
                    budget: stored?.budget ?? 0,
                    color: stored?.color || pickDepartmentColor(baseName),
                    createdAt,
                    isActive: stored?.isActive ?? true,
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    private assertDepartmentUniqueness(
        departments: DepartmentResponseDto[],
        nextName: string,
        nextCode: string,
        currentDepartmentId?: string,
    ): void {
        const normalizedName = normalizeDepartmentValue(nextName);
        const normalizedCode = nextCode.trim().toUpperCase();

        const duplicate = departments.find((department) => {
            if (department.id === currentDepartmentId) {
                return false;
            }

            return (
                normalizeDepartmentValue(department.name) === normalizedName
                || department.code.trim().toUpperCase() === normalizedCode
            );
        });

        if (!duplicate) {
            return;
        }

        if (normalizeDepartmentValue(duplicate.name) === normalizedName) {
            throw new ConflictError(`Department "${nextName}" already exists`, ErrorCodes.RESOURCE_ALREADY_EXISTS);
        }

        throw new ConflictError(`Department code "${nextCode}" is already in use`, ErrorCodes.RESOURCE_ALREADY_EXISTS);
    }

    private async saveDepartmentConfigs(
        tenantId: string,
        settings: Record<string, unknown>,
        departments: DepartmentConfigDto[],
    ): Promise<void> {
        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                settings: {
                    ...settings,
                    [DEPARTMENTS_SETTINGS_KEY]: departments,
                } as any,
            },
        });
    }

    private resolveAttendanceRange(query: AttendanceQueryDto): { dateFrom: Date; dateTo: Date; employeeId?: string } {
        const now = new Date();
        const dateFrom = normalizeDate(query.dateFrom) || new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const dateTo = normalizeDate(query.dateTo) || new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        if (dateTo.getTime() < dateFrom.getTime()) {
            throw new BadRequestError('dateTo must be after dateFrom');
        }

        return {
            dateFrom,
            dateTo,
            employeeId: query.employeeId || undefined,
        };
    }

    private buildDailyAttendance(
        entries: AttendanceTimeEntryRow[],
        dateFrom: Date,
        dateTo: Date,
    ): Map<string, DailyAttendanceAggregate> {
        const dailyAttendance = new Map<string, DailyAttendanceAggregate>();

        for (const entry of entries) {
            if (!overlapsRange(dateFrom, dateTo, entry.startTime, entry.endTime || entry.startTime)) {
                continue;
            }

            const meta = parseAttendanceMeta(entry.description);
            const key = `${entry.employeeId}:${getDayKey(entry.startTime)}`;
            const existing = dailyAttendance.get(key);
            const workedMinutes = getEffectiveDurationMinutes(entry, meta);
            const breakMinutes = getBreakMinutes(meta);

            if (!existing) {
                dailyAttendance.set(key, {
                    employeeId: entry.employeeId,
                    dayKey: getDayKey(entry.startTime),
                    checkIn: entry.startTime,
                    workedMinutes,
                    totalBreakMinutes: breakMinutes,
                    hasCompletedEntry: Boolean(entry.endTime),
                });
                continue;
            }

            existing.checkIn = entry.startTime.getTime() < existing.checkIn.getTime()
                ? entry.startTime
                : existing.checkIn;
            existing.workedMinutes += workedMinutes;
            existing.totalBreakMinutes += breakMinutes;
            existing.hasCompletedEntry = existing.hasCompletedEntry || Boolean(entry.endTime);
        }

        return dailyAttendance;
    }

    private buildLeaveDayKeys(
        leaveRequests: Array<{ employeeId: string; startDate: Date; endDate: Date }>,
        dateFrom: Date,
        dateTo: Date,
    ): Set<string> {
        const leaveDayKeys = new Set<string>();

        for (const leaveRequest of leaveRequests) {
            const current = new Date(Math.max(leaveRequest.startDate.getTime(), dateFrom.getTime()));
            const end = new Date(Math.min(leaveRequest.endDate.getTime(), dateTo.getTime()));
            current.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);

            while (current.getTime() <= end.getTime()) {
                if (!isWeekend(current)) {
                    leaveDayKeys.add(`${leaveRequest.employeeId}:${getDayKey(current)}`);
                }
                current.setDate(current.getDate() + 1);
            }
        }

        return leaveDayKeys;
    }

    private countBusinessDays(start: Date, end: Date): number {
        const cursor = new Date(start);
        const finish = new Date(end);
        cursor.setHours(0, 0, 0, 0);
        finish.setHours(0, 0, 0, 0);

        let total = 0;
        while (cursor.getTime() <= finish.getTime()) {
            if (!isWeekend(cursor)) {
                total += 1;
            }
            cursor.setDate(cursor.getDate() + 1);
        }

        return total;
    }
}

export const employeesService = new EmployeesService();
