import { tenantsRepository } from './tenants.repository';
import { CreateTenantDto, UpdateTenantDto, TenantQueryDto, toTenantResponseDto } from './tenants.dto';
import { NotFoundError, BadRequestError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

export class TenantsService {
    async create(data: CreateTenantDto) {
        const existing = await tenantsRepository.findBySlug(data.slug);
        if (existing) throw new BadRequestError('Tenant slug already exists', ErrorCodes.RESOURCE_ALREADY_EXISTS);
        const tenant = await tenantsRepository.create(data);
        return toTenantResponseDto(tenant);
    }

    async getById(id: string) {
        const tenant = await tenantsRepository.findById(id);
        if (!tenant) throw new NotFoundError('Tenant not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toTenantResponseDto(tenant);
    }

    async getMany(query: TenantQueryDto) {
        const { data, total } = await tenantsRepository.findMany(query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(toTenantResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }

    async update(id: string, data: UpdateTenantDto) {
        const existing = await tenantsRepository.findById(id);
        if (!existing) throw new NotFoundError('Tenant not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const tenant = await tenantsRepository.update(id, data);
        return toTenantResponseDto(tenant);
    }

    async delete(id: string) {
        const existing = await tenantsRepository.findById(id);
        if (!existing) throw new NotFoundError('Tenant not found', ErrorCodes.RESOURCE_NOT_FOUND);
        await tenantsRepository.delete(id);
    }
}

export const tenantsService = new TenantsService();
