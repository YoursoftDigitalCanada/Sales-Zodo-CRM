import { CreateTagDto, UpdateTagDto, TagQueryDto, TagResponseDto, TagListResponseDto } from './tags.dto';
export declare class TagsService {
    create(tenantId: string, data: CreateTagDto): Promise<TagResponseDto>;
    getById(id: string, tenantId: string): Promise<TagResponseDto>;
    getMany(tenantId: string, query: TagQueryDto): Promise<TagListResponseDto>;
    getAll(tenantId: string): Promise<TagResponseDto[]>;
    update(id: string, tenantId: string, data: UpdateTagDto): Promise<TagResponseDto>;
    delete(id: string, tenantId: string): Promise<void>;
}
export declare const tagsService: TagsService;
//# sourceMappingURL=tags.service.d.ts.map