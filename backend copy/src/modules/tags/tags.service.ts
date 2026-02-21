import { tagsRepository } from './tags.repository';
import {
  CreateTagDto,
  UpdateTagDto,
  TagQueryDto,
  TagResponseDto,
  TagListResponseDto,
  toTagResponseDto,
} from './tags.dto';
import { NotFoundError, ConflictError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

export class TagsService {
  async create(tenantId: string, data: CreateTagDto): Promise<TagResponseDto> {
    const existing = await tagsRepository.findByName(data.name, tenantId);
    if (existing) {
      throw new ConflictError('A tag with this name already exists');
    }

    const tag = await tagsRepository.create(tenantId, data);
    return toTagResponseDto(tag);
  }

  async getById(id: string, tenantId: string): Promise<TagResponseDto> {
    const tag = await tagsRepository.findById(id, tenantId);

    if (!tag) {
      throw new NotFoundError('Tag not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    return toTagResponseDto(tag);
  }

  async getMany(tenantId: string, query: TagQueryDto): Promise<TagListResponseDto> {
    const { data, total } = await tagsRepository.findMany(tenantId, query);
    const page = query.page || 1;
    const limit = query.limit || 50;

    const totalPages = Math.ceil(total / limit);
    return {
      data: data.map(toTagResponseDto),
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

  async getAll(tenantId: string): Promise<TagResponseDto[]> {
    const tags = await tagsRepository.findAll(tenantId);
    return tags.map(toTagResponseDto);
  }

  async update(id: string, tenantId: string, data: UpdateTagDto): Promise<TagResponseDto> {
    const existing = await tagsRepository.findById(id, tenantId);

    if (!existing) {
      throw new NotFoundError('Tag not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    if (data.name && data.name !== existing.name) {
      const duplicate = await tagsRepository.findByName(data.name, tenantId, id);
      if (duplicate) {
        throw new ConflictError('A tag with this name already exists');
      }
    }

    const tag = await tagsRepository.update(id, tenantId, data);
    return toTagResponseDto(tag);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const existing = await tagsRepository.findById(id, tenantId);

    if (!existing) {
      throw new NotFoundError('Tag not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    await tagsRepository.delete(id, tenantId);
  }
}

export const tagsService = new TagsService();