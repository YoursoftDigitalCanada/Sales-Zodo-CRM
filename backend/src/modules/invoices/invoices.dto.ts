import { Invoice } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import type {
    CanonicalInvoiceItemDto,
} from '@contracts/invoice';
import type { Currency, InvoiceStatus } from '@contracts/enums';

type InvoiceItemDto = CanonicalInvoiceItemDto;

// ============================================================================
// INVOICES DTOs - Matching Prisma Schema (Invoice, InvoiceItem)
// ============================================================================

export interface InvoiceResponseDto {
    id: string;
    invoiceNumber: string;
    status: InvoiceStatus;
    client: {
        id: string;
        clientName: string;
        companyName?: string | null;
        primaryEmail?: string | null;
        primaryPhone?: string | null;
        streetAddress?: string | null;
        city?: string | null;
        province?: string | null;
        postalCode?: string | null;
        country?: string | null;
    } | null;
    issueDate: Date;
    dueDate: Date;
    paidAt: Date | null;
    sentAt: Date | null;
    viewedAt: Date | null;
    currency: Currency;
    subtotal: number;
    taxRate: number | null;
    taxAmount: number;
    discountAmount: number;
    total: number;
    amountPaid: number;
    amountDue: number;
    notes: string | null;
    terms: string | null;
    items: InvoiceItemDto[];
    payments: Array<{
        id: string;
        amount: number;
        paymentMethod: string;
        paymentDate: Date;
        reference: string | null;
        notes: string | null;
        createdAt: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

type InvoiceWithRelations = Invoice & {
    client?: {
        id: string;
        clientName: string;
        companyName: string | null;
        primaryEmail: string | null;
        primaryPhone: string | null;
        streetAddress: string | null;
        city: string | null;
        province: string | null;
        postalCode: string | null;
        country: string | null;
    } | null;
    items?: { id: string; description: string; quantity: Decimal; unitPrice: Decimal; amount: Decimal; taxRate: Decimal | null; sortOrder: number }[];
    payments?: {
        id: string;
        amount: Decimal;
        paymentMethod: string;
        paymentDate: Date;
        reference: string | null;
        notes: string | null;
        createdAt: Date;
    }[];
};

export function toInvoiceResponseDto(inv: InvoiceWithRelations): InvoiceResponseDto {
    return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        client: inv.client ? {
            id: inv.client.id,
            clientName: inv.client.clientName,
            companyName: inv.client.companyName,
            primaryEmail: inv.client.primaryEmail,
            primaryPhone: inv.client.primaryPhone,
            streetAddress: inv.client.streetAddress,
            city: inv.client.city,
            province: inv.client.province,
            postalCode: inv.client.postalCode,
            country: inv.client.country,
        } : null,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        paidAt: inv.paidAt,
        sentAt: inv.sentAt,
        viewedAt: inv.viewedAt,
        currency: inv.currency,
        subtotal: Number(inv.subtotal),
        taxRate: inv.taxRate ? Number(inv.taxRate) : null,
        taxAmount: Number(inv.taxAmount),
        discountAmount: Number(inv.discountAmount),
        total: Number(inv.total),
        amountPaid: Number(inv.amountPaid),
        amountDue: Number(inv.amountDue),
        notes: inv.notes,
        terms: inv.terms,
        items: (inv.items || []).map((i) => ({
            description: i.description,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            amount: Number(i.amount),
            taxRate: i.taxRate ? Number(i.taxRate) : null,
            sortOrder: i.sortOrder,
        })),
        payments: (inv.payments || []).map((payment) => ({
            id: payment.id,
            amount: Number(payment.amount),
            paymentMethod: payment.paymentMethod,
            paymentDate: payment.paymentDate,
            reference: payment.reference,
            notes: payment.notes,
            createdAt: payment.createdAt,
        })),
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
    };
}
