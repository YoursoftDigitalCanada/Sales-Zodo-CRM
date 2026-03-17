import { foldersRepository } from './folders.repository';
import { CreateFolderDto, UpdateFolderDto, FolderQueryDto, toFolderResponseDto } from './folders.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';

export class FoldersService {
    async create(tenantId: string, data: CreateFolderDto) {
        const folder = await foldersRepository.create(tenantId, data);
        const dto = toFolderResponseDto(folder);

        activityLogger.log({
            tenantId, entityType: 'Folder', entityId: dto.id,
            action: 'CREATE', module: 'folders',
            description: `Created folder "${(folder as any).name || dto.id}"`,
            metadata: { folderName: (folder as any).name },
        });

        return dto;
    }

    async getById(id: string, tenantId: string) {
        const folder = await foldersRepository.findById(id, tenantId);
        if (!folder) throw new NotFoundError('Folder not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toFolderResponseDto(folder);
    }

    async getMany(tenantId: string, query: FolderQueryDto) {
        const { data, total } = await foldersRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 50;
        return {
            data: data.map(toFolderResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }

    async getTree(tenantId: string) {
        const folders = await foldersRepository.getTree(tenantId);
        return folders.map(toFolderResponseDto);
    }

    async update(id: string, tenantId: string, data: UpdateFolderDto) {
        const existing = await foldersRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Folder not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const folder = await foldersRepository.update(id, tenantId, data);
        const dto = toFolderResponseDto(folder);

        activityLogger.log({
            tenantId, entityType: 'Folder', entityId: dto.id,
            action: 'UPDATE', module: 'folders',
            description: `Updated folder "${(folder as any).name || dto.id}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        return dto;
    }

    async toggleStar(id: string, tenantId: string) {
        const folder = await foldersRepository.toggleStar(id, tenantId);
        return toFolderResponseDto(folder);
    }

    async delete(id: string, tenantId: string) {
        const existing = await foldersRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Folder not found', ErrorCodes.RESOURCE_NOT_FOUND);

        activityLogger.log({
            tenantId, entityType: 'Folder', entityId: id,
            action: 'DELETE', module: 'folders',
            description: `Deleted folder "${(existing as any).name || id}"`,
        });

        await foldersRepository.softDelete(id, tenantId);
    }

    async restore(id: string, tenantId: string) {
        const folder = await foldersRepository.restore(id, tenantId);
        return toFolderResponseDto(folder);
    }

    async permanentDelete(id: string, tenantId: string) {
        await foldersRepository.permanentDelete(id, tenantId);
    }
}

export const foldersService = new FoldersService();
