import { employeesRepository } from './employees.repository';
import { CreateEmployeeDto, UpdateEmployeeDto, EmployeeQueryDto, toEmployeeResponseDto } from './employees.dto';
import { NotFoundError, ConflictError, BadRequestError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { eventBus } from '../../common/events/event-bus';
import { prisma } from '../../config/database';
import { hashPassword } from '../../common/utils/password';

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
}

export const employeesService = new EmployeesService();

