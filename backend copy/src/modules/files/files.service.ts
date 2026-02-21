import { filesRepository } from './files.repository';
import { UploadFileDto, UpdateFileDto, FileQueryDto, toFileResponseDto } from './files.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

export class FilesService {
    async create(tenantId: string, data: UploadFileDto) {
        const file = await filesRepository.create(tenantId, data);
        return toFileResponseDto(file);
    }

    async getById(id: string, tenantId: string) {
        const file = await filesRepository.findById(id, tenantId);
        if (!file) throw new NotFoundError('File not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toFileResponseDto(file);
    }

    async getMany(tenantId: string, query: FileQueryDto) {
        const { data, total } = await filesRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(toFileResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }

    async update(id: string, tenantId: string, data: UpdateFileDto) {
        const existing = await filesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('File not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const file = await filesRepository.update(id, data);
        return toFileResponseDto(file);
    }

    async delete(id: string, tenantId: string) {
        const existing = await filesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('File not found', ErrorCodes.RESOURCE_NOT_FOUND);
        // TODO: Also delete from storage
        await filesRepository.delete(id);
    }
}

export const filesService = new FilesService();
