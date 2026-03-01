import { ContractStatus } from '@prisma/client';
import { contractsRepository } from './contracts.repository';
import { CreateContractDto, UpdateContractDto, ContractQueryDto, toContractResponseDto } from './contracts.dto';

export class ContractsService {
    async create(tenantId: string, data: CreateContractDto, createdById?: string) {
        const contract = await contractsRepository.create(tenantId, data, createdById);
        return toContractResponseDto(contract);
    }

    async getById(id: string, tenantId: string) {
        const contract = await contractsRepository.findById(id, tenantId);
        if (!contract) throw new Error('Contract not found');
        return toContractResponseDto(contract);
    }

    async getMany(tenantId: string, query: ContractQueryDto) {
        const { data, total } = await contractsRepository.findMany(tenantId, query);
        const page = query.page || 1;
        const limit = query.limit || 20;
        return {
            data: data.map(toContractResponseDto),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async update(id: string, tenantId: string, data: UpdateContractDto) {
        const contract = await contractsRepository.update(id, tenantId, data);
        return toContractResponseDto(contract);
    }

    async updateStatus(id: string, tenantId: string, status: ContractStatus) {
        const contract = await contractsRepository.updateStatus(id, tenantId, status);
        return toContractResponseDto(contract);
    }

    async delete(id: string, tenantId: string) {
        await contractsRepository.delete(id, tenantId);
    }
}

export const contractsService = new ContractsService();
