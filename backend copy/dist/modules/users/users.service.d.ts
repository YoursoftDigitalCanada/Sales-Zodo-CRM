import { CreateUserDto, UpdateUserDto, UserQueryDto, UserListResponseDto, UserResponseDto } from './users.dto';
export declare class UsersService {
    create(tenantId: string, data: CreateUserDto): Promise<UserResponseDto>;
    getById(id: string, tenantId: string): Promise<UserResponseDto>;
    getMany(tenantId: string, query: UserQueryDto): Promise<UserListResponseDto>;
    update(id: string, tenantId: string, data: UpdateUserDto): Promise<UserResponseDto>;
    delete(id: string, tenantId: string): Promise<void>;
    updateStatus(id: string, tenantId: string, isActive: boolean): Promise<UserResponseDto>;
}
export declare const usersService: UsersService;
//# sourceMappingURL=users.service.d.ts.map