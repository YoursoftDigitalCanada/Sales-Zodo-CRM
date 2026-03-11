import { Invoice } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import type {
    CreateInvoiceDto,
    UpdateInvoiceDto,
    InvoiceQueryDto,
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
    client: { id: string; clientName: string } | null;
    issueDate: Date;
    dueDate: Date;
    paidAt: Date | null;
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
    createdAt: Date;
    updatedAt: Date;
}

type InvoiceWithRelations = Invoice & {
    client?: { id: string; clientName: string } | null;
    items?: { id: string; description: string; quantity: Decimal; unitPrice: Decimal; amount: Decimal; taxRate: Decimal | null; sortOrder: number }[];
};

export function toInvoiceResponseDto(inv: InvoiceWithRelations): InvoiceResponseDto {
    return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        client: inv.client ? { id: inv.client.id, clientName: inv.client.clientName } : null,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        paidAt: inv.paidAt,
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
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
    };
}
