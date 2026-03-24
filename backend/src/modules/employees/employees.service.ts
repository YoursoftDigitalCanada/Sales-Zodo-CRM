import { employeesRepository } from './employees.repository';
import {
    CreateEmployeeDto,
    UpdateEmployeeDto,
    EmployeeQueryDto,
    CreateDepartmentDto,
    UpdateDepartmentDto,
    DepartmentConfigDto,
    DepartmentResponseDto,
    toEmployeeResponseDto,
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

const DEPARTMENTS_SETTINGS_KEY = 'employeeDepartments';
const DEFAULT_DEPARTMENT_COLORS = ['#22D3EE', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981', '#3B82F6', '#EF4444', '#FBBF24'];

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

export class EmployeesService {
    async create(tenantId: string, data: CreateEmployeeDto) {
        const emp = await employeesRepository.create(tenantId, data);
        const dto = toEmployeeResponseDto(emp);

        activityLogger.log({
            tenantId, entityType: 'Employee', entityId: dto.id,
            action: 'CREATE', module: 'employees',
            description: `Created employee "${(emp as any).firstName || ''} ${(emp as any).lastName || ''}"`.trim(),
            metadata: { position: (emp as any).position, department: (emp as any).department },
        });

        eventBus.emit('employee.created', {
            tenantId,
            employeeId: dto.id,
            employeeName: `${(emp as any).firstName || ''} ${(emp as any).lastName || ''}`.trim(),
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
        position?: string;
        department?: string;
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
                    isActive: true,
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
        const emp = await employeesRepository.update(id, tenantId, data);
        const dto = toEmployeeResponseDto(emp);

        activityLogger.log({
            tenantId, entityType: 'Employee', entityId: dto.id,
            action: 'UPDATE', module: 'employees',
            description: `Updated employee "${(emp as any).firstName || ''} ${(emp as any).lastName || ''}"`.trim(),
            metadata: { updatedFields: Object.keys(data) },
        });

        return dto;
    }

    async delete(id: string, tenantId: string) {
        const existing = await employeesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Employee not found', ErrorCodes.EMPLOYEE_NOT_FOUND);

        activityLogger.log({
            tenantId, entityType: 'Employee', entityId: id,
            action: 'DELETE', module: 'employees',
            description: `Deleted employee "${(existing as any).firstName || ''} ${(existing as any).lastName || ''}"`.trim(),
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
}

export const employeesService = new EmployeesService();
