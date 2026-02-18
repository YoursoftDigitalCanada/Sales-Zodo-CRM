import { PrismaClient, Prisma } from '@prisma/client';
import { CreateOrderDto, UpdateOrderDto, OrderQueryDto } from './orders.dto';

const prisma = new PrismaClient();
const orderInclude = {
    items: true,
};

export class OrdersRepository {
    async create(tenantId: string, data: CreateOrderDto) {
        return prisma.order.create({
            data: {
                tenantId,
                orderNumber: data.orderNumber,
                clientId: data.clientId,
                customerEmail: data.customerEmail,
                customerName: data.customerName,
                customerPhone: data.customerPhone,
                billingAddress: data.billingAddress,
                shippingAddress: data.shippingAddress,
                currency: data.currency || 'USD',
                subtotal: data.subtotal,
                taxAmount: data.taxAmount || 0,
                shippingAmount: data.shippingAmount || 0,
                discountAmount: data.discountAmount || 0,
                total: data.total,
                paymentMethod: data.paymentMethod,
                shippingMethod: data.shippingMethod,
                notes: data.notes,
                internalNotes: data.internalNotes,
                items: {
                    create: data.items.map(item => ({
                        productId: item.productId,
                        productName: item.productName,
                        productSku: item.productSku,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        total: item.total,
                    })),
                },
            },
            include: orderInclude,
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.order.findFirst({ where: { id, tenantId }, include: orderInclude });
    }

    async findMany(tenantId: string, query: OrderQueryDto) {
        const { page = 1, limit = 20, status, clientId, customerEmail, paymentStatus, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
        const where: Prisma.OrderWhereInput = {
            tenantId,
            ...(status && { status }),
            ...(clientId && { clientId }),
            ...(customerEmail && { customerEmail }),
            ...(paymentStatus && { paymentStatus }),
            ...(search && {
                OR: [
                    { orderNumber: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
                    { customerName: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
                    { customerEmail: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            prisma.order.findMany({ where, include: orderInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.order.count({ where }),
        ]);
        return { data, total };
    }

    async update(id: string, data: UpdateOrderDto) {
        const updateData: any = {};
        if (data.status !== undefined) updateData.status = data.status;
        if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
        if (data.paymentStatus !== undefined) updateData.paymentStatus = data.paymentStatus;
        if (data.trackingNumber !== undefined) updateData.trackingNumber = data.trackingNumber;
        if (data.shippingMethod !== undefined) updateData.shippingMethod = data.shippingMethod;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.internalNotes !== undefined) updateData.internalNotes = data.internalNotes;

        // Auto-set timestamps based on status
        if (data.status === 'SHIPPED') updateData.shippedAt = new Date();
        if (data.status === 'DELIVERED') updateData.deliveredAt = new Date();
        if (data.paymentStatus === 'paid') updateData.paidAt = new Date();

        return prisma.order.update({ where: { id }, data: updateData, include: orderInclude });
    }

    async delete(id: string) {
        return prisma.order.delete({ where: { id } });
    }
}

export const ordersRepository = new OrdersRepository();
