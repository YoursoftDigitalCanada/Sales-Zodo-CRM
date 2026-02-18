import { ordersRepository } from './orders.repository';
import { CreateOrderDto, UpdateOrderDto, OrderQueryDto, toOrderResponseDto } from './orders.dto';
import { NotFoundError } from '../../../common/errors/HttpErrors';
import { ErrorCodes } from '../../../common/errors/errorCodes';

export class OrdersService {
    async create(tenantId: string, data: CreateOrderDto) {
        const order = await ordersRepository.create(tenantId, data);
        return toOrderResponseDto(order);
    }

    async getById(id: string, tenantId: string) {
        const order = await ordersRepository.findById(id, tenantId);
        if (!order) throw new NotFoundError('Order not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toOrderResponseDto(order);
    }

    async getMany(tenantId: string, query: OrderQueryDto) {
        const { data, total } = await ordersRepository.findMany(tenantId, query);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const totalPages = Math.ceil(total / limit);
        return {
            data: data.map(toOrderResponseDto),
            meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
        };
    }

    async update(id: string, tenantId: string, data: UpdateOrderDto) {
        const existing = await ordersRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Order not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const order = await ordersRepository.update(id, data);
        return toOrderResponseDto(order);
    }

    async delete(id: string, tenantId: string) {
        const existing = await ordersRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Order not found', ErrorCodes.RESOURCE_NOT_FOUND);
        await ordersRepository.delete(id);
    }
}

export const ordersService = new OrdersService();
