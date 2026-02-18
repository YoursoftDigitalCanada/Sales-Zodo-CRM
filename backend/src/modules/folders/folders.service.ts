import { foldersRepository } from './folders.repository';
import { CreateFolderDto, UpdateFolderDto, FolderQueryDto, toFolderResponseDto } from './folders.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

export class FoldersService {
    async create(tenantId: string, data: CreateFolderDto) {
        const folder = await foldersRepository.create(tenantId, data);
        return toFolderResponseDto(folder);
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

    async update(id: string, tenantId: string, data: UpdateFolderDto) {
        const existing = await foldersRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Folder not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const folder = await foldersRepository.update(id, data);
        return toFolderResponseDto(folder);
    }

    async delete(id: string, tenantId: string) {
        const existing = await foldersRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Folder not found', ErrorCodes.RESOURCE_NOT_FOUND);
        await foldersRepository.delete(id);
    }
}

export const foldersService = new FoldersService();
