import { employeesRepository } from './employees.repository';
import { CreateEmployeeDto, UpdateEmployeeDto, EmployeeQueryDto, toEmployeeResponseDto } from './employees.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

export class EmployeesService {
    async create(tenantId: string, data: CreateEmployeeDto) {
        const emp = await employeesRepository.create(tenantId, data);
        return toEmployeeResponseDto(emp);
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
        const emp = await employeesRepository.update(id, data);
        return toEmployeeResponseDto(emp);
    }

    async delete(id: string, tenantId: string) {
        const existing = await employeesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Employee not found', ErrorCodes.EMPLOYEE_NOT_FOUND);
        await employeesRepository.delete(id);
    }
}

export const employeesService = new EmployeesService();
