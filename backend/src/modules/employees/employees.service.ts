import { employeesRepository } from './employees.repository';
import { CreateEmployeeDto, UpdateEmployeeDto, EmployeeQueryDto, toEmployeeResponseDto } from './employees.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { eventBus } from '../../common/events/event-bus';

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
