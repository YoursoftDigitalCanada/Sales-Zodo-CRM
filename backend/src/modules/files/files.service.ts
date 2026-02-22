import { filesRepository } from './files.repository';
import { UploadFileDto, UpdateFileDto, FileQueryDto, toFileResponseDto } from './files.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { eventBus } from '../../common/events/event-bus';

export class FilesService {
    async create(tenantId: string, data: UploadFileDto) {
        const file = await filesRepository.create(tenantId, data);
        const dto = toFileResponseDto(file);

        activityLogger.log({
            tenantId, entityType: 'File', entityId: dto.id,
            action: 'CREATE', module: 'files',
            description: `Uploaded file "${(file as any).name || (file as any).originalName || dto.id}"`,
            metadata: { fileName: (file as any).name || (file as any).originalName, mimeType: (file as any).mimeType },
        });

        eventBus.emit('file.uploaded', {
            tenantId,
            fileId: dto.id,
            fileName: (file as any).name || (file as any).originalName || '',
            mimeType: (file as any).mimeType || undefined,
        });

        return dto;
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
        const file = await filesRepository.update(id, tenantId, data);
        const dto = toFileResponseDto(file);

        activityLogger.log({
            tenantId, entityType: 'File', entityId: dto.id,
            action: 'UPDATE', module: 'files',
            description: `Updated file "${(file as any).name || dto.id}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        return dto;
    }

    async delete(id: string, tenantId: string) {
        const existing = await filesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('File not found', ErrorCodes.RESOURCE_NOT_FOUND);

        activityLogger.log({
            tenantId, entityType: 'File', entityId: id,
            action: 'DELETE', module: 'files',
            description: `Deleted file "${(existing as any).name || (existing as any).originalName || id}"`,
        });

        // TODO: Also delete from storage
        await filesRepository.delete(id, tenantId);
    }
}

export const filesService = new FilesService();
