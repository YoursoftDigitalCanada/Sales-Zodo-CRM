import { clientsRepository } from './clients.repository';
import {
    CreateClientDto,
    UpdateClientDto,
    ClientQueryDto,
    ClientResponseDto,
    toClientResponseDto,
} from './clients.dto';
import {
    NotFoundError,
} from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

export class ClientsService {
    /**
     * Create a new client
     */
    async create(tenantId: string, data: CreateClientDto): Promise<ClientResponseDto> {
        const client = await clientsRepository.create(tenantId, data);
        return toClientResponseDto(client);
    }

    /**
     * Get client by ID
     */
    async getById(id: string, tenantId: string): Promise<ClientResponseDto> {
        const client = await clientsRepository.findById(id, tenantId);

        if (!client) {
            throw new NotFoundError('Client not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        return toClientResponseDto(client);
    }

    /**
     * Get clients with filters and pagination
     */
    async getMany(tenantId: string, query: ClientQueryDto) {
        const { data, total } = await clientsRepository.findMany(tenantId, query);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const totalPages = Math.ceil(total / limit);

        return {
            data: data.map(toClientResponseDto),
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

    /**
     * Update client
     */
    async update(id: string, tenantId: string, data: UpdateClientDto): Promise<ClientResponseDto> {
        // Check if client exists
        const existing = await clientsRepository.findById(id, tenantId);
        if (!existing) {
            throw new NotFoundError('Client not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        const client = await clientsRepository.update(id, data);
        return toClientResponseDto(client);
    }

    /**
     * Delete client
     */
    async delete(id: string, tenantId: string): Promise<void> {
        const existing = await clientsRepository.findById(id, tenantId);
        if (!existing) {
            throw new NotFoundError('Client not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        await clientsRepository.delete(id);
    }
}

export const clientsService = new ClientsService();
