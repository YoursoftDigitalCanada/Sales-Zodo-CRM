import { ordersRepository } from './orders.repository';
import { CreateOrderDto, UpdateOrderDto, OrderQueryDto, toOrderResponseDto } from './orders.dto';
import { NotFoundError } from '../../../common/errors/HttpErrors';
import { ErrorCodes } from '../../../common/errors/errorCodes';
import { activityLogger } from '../../../common/services/activity-logger.service';
import { eventBus } from '../../../common/events/event-bus';

export class OrdersService {
    async create(tenantId: string, data: CreateOrderDto) {
        const order = await ordersRepository.create(tenantId, data);
        const dto = toOrderResponseDto(order);

        activityLogger.log({
            tenantId, entityType: 'Order', entityId: dto.id,
            action: 'CREATE', module: 'ecommerce',
            description: `Created order #${(order as any).orderNumber || dto.id}`,
            metadata: { orderNumber: (order as any).orderNumber, totalAmount: (order as any).totalAmount },
        });

        return dto;
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
        const order = await ordersRepository.update(id, tenantId, data);
        const dto = toOrderResponseDto(order);

        const oldStatus = (existing as any).status;
        const newStatus = (order as any).status;
        const isStatusChange = oldStatus && newStatus && oldStatus !== newStatus;

        activityLogger.log({
            tenantId, entityType: 'Order', entityId: dto.id,
            action: isStatusChange ? 'STATUS_CHANGE' : 'UPDATE',
            module: 'ecommerce',
            description: isStatusChange
                ? `Order #${(order as any).orderNumber || dto.id} status changed from ${oldStatus} to ${newStatus}`
                : `Updated order #${(order as any).orderNumber || dto.id}`,
            metadata: isStatusChange
                ? { oldStatus, newStatus }
                : { updatedFields: Object.keys(data) },
        });

        if (isStatusChange) {
            eventBus.emit('order.statusChanged', {
                tenantId,
                orderId: dto.id,
                orderNumber: (order as any).orderNumber || dto.id,
                oldStatus,
                newStatus,
            });
        }

        return dto;
    }

    async delete(id: string, tenantId: string) {
        const existing = await ordersRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Order not found', ErrorCodes.RESOURCE_NOT_FOUND);

        activityLogger.log({
            tenantId, entityType: 'Order', entityId: id,
            action: 'DELETE', module: 'ecommerce',
            description: `Deleted order #${(existing as any).orderNumber || id}`,
        });

        await ordersRepository.delete(id, tenantId);
    }
}

export const ordersService = new OrdersService();
