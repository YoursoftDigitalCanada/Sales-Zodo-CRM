import { Order, OrderStatus, Currency, PaymentMethod } from '@prisma/client';

export interface CreateOrderDto {
    orderNumber: string;
    clientId?: string | null;
    customerEmail: string;
    customerName: string;
    customerPhone?: string | null;
    billingAddress: Record<string, any>;
    shippingAddress: Record<string, any>;
    currency?: Currency;
    subtotal: number;
    taxAmount?: number;
    shippingAmount?: number;
    discountAmount?: number;
    total: number;
    paymentMethod?: PaymentMethod | null;
    shippingMethod?: string | null;
    notes?: string | null;
    internalNotes?: string | null;
    items: CreateOrderItemDto[];
}

export interface CreateOrderItemDto {
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface UpdateOrderDto {
    status?: OrderStatus;
    paymentMethod?: PaymentMethod | null;
    paymentStatus?: string;
    trackingNumber?: string | null;
    shippingMethod?: string | null;
    notes?: string | null;
    internalNotes?: string | null;
}

export interface OrderQueryDto {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    clientId?: string;
    customerEmail?: string;
    paymentStatus?: string;
    search?: string;
    sortBy?: 'createdAt' | 'total' | 'orderNumber';
    sortOrder?: 'asc' | 'desc';
}

export interface OrderResponseDto {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    clientId: string | null;
    customerEmail: string;
    customerName: string;
    customerPhone: string | null;
    billingAddress: Record<string, any>;
    shippingAddress: Record<string, any>;
    currency: Currency;
    subtotal: string;
    taxAmount: string;
    shippingAmount: string;
    discountAmount: string;
    total: string;
    paymentMethod: PaymentMethod | null;
    paymentStatus: string;
    paidAt: Date | null;
    shippingMethod: string | null;
    trackingNumber: string | null;
    shippedAt: Date | null;
    deliveredAt: Date | null;
    notes: string | null;
    internalNotes: string | null;
    items: OrderItemResponseDto[];
    createdAt: Date;
    updatedAt: Date;
}

export interface OrderItemResponseDto {
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: string;
    total: string;
}

type OrderWithRelations = Order & {
    items?: { id: string; productId: string; productName: string; productSku: string; quantity: number; unitPrice: any; total: any }[];
};

export function toOrderResponseDto(o: OrderWithRelations): OrderResponseDto {
    return {
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        clientId: o.clientId,
        customerEmail: o.customerEmail,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        billingAddress: o.billingAddress as Record<string, any>,
        shippingAddress: o.shippingAddress as Record<string, any>,
        currency: o.currency,
        subtotal: o.subtotal.toString(),
        taxAmount: o.taxAmount.toString(),
        shippingAmount: o.shippingAmount.toString(),
        discountAmount: o.discountAmount.toString(),
        total: o.total.toString(),
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        paidAt: o.paidAt,
        shippingMethod: o.shippingMethod,
        trackingNumber: o.trackingNumber,
        shippedAt: o.shippedAt,
        deliveredAt: o.deliveredAt,
        notes: o.notes,
        internalNotes: o.internalNotes,
        items: (o.items || []).map(item => ({
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            productSku: item.productSku,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toString(),
            total: item.total.toString(),
        })),
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
    };
}
