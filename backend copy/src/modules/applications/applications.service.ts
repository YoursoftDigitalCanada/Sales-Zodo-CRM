import { applicationsRepository } from './applications.repository';
import {
    CreateApplicationDto,
    UpdateApplicationDto,
    ApplicationQueryDto,
    toApplicationResponseDto,
} from './applications.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

export class ApplicationsService {
    async create(tenantId: string, data: CreateApplicationDto) {
        const application = await applicationsRepository.create(tenantId, data);
        return toApplicationResponseDto(application);
    }

    async getById(id: string, tenantId: string) {
        const application = await applicationsRepository.findById(id, tenantId);
        if (!application) {
            throw new NotFoundError('Application not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }
        return toApplicationResponseDto(application);
    }

    async getMany(tenantId: string, query: ApplicationQueryDto) {
        const { data, total } = await applicationsRepository.findMany(tenantId, query);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const totalPages = Math.ceil(total / limit);

        return {
            data: data.map(toApplicationResponseDto),
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }

    async update(id: string, tenantId: string, data: UpdateApplicationDto) {
        const existing = await applicationsRepository.findById(id, tenantId);
        if (!existing) {
            throw new NotFoundError('Application not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }
        const application = await applicationsRepository.update(id, data);
        return toApplicationResponseDto(application);
    }

    async delete(id: string, tenantId: string) {
        const existing = await applicationsRepository.findById(id, tenantId);
        if (!existing) {
            throw new NotFoundError('Application not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }
        await applicationsRepository.delete(id);
    }
}

export const applicationsService = new ApplicationsService();
