import { CreateClientDto, UpdateClientDto, ClientQueryDto, ClientResponseDto } from './clients.dto';
export declare class ClientsService {
    /**
     * Create a new client
     */
    create(tenantId: string, data: CreateClientDto): Promise<ClientResponseDto>;
    /**
     * Get client by ID
     */
    getById(id: string, tenantId: string): Promise<ClientResponseDto>;
    /**
     * Get clients with filters and pagination
     */
    getMany(tenantId: string, query: ClientQueryDto): Promise<{
        data: ClientResponseDto[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
    /**
     * Update client
     */
    update(id: string, tenantId: string, data: UpdateClientDto): Promise<ClientResponseDto>;
    /**
     * Delete client
     */
    delete(id: string, tenantId: string): Promise<void>;
}
export declare const clientsService: ClientsService;
//# sourceMappingURL=clients.service.d.ts.map