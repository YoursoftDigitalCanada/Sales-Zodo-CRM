import { Invoice } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import type { Currency, InvoiceStatus } from '@contracts/enums';

type InvoiceItemDto = {
    itemName?: string | null;
    description: string;
    details?: string | null;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxRate: number | null;
    sortOrder: number;
};

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
    contact: {
        id: string;
        contactName: string;
        email?: string | null;
        officePhone?: string | null;
        mobilePhone?: string | null;
    } | null;
    quote: { id: string; quoteNumber: string } | null;
    project: { id: string; name: string | null; projectNumber: string | null } | null;
    contract: { id: string; contractNumber: string; title: string } | null;
    clientId: string | null;
    contactId: string | null;
    quoteId: string | null;
    projectId: string | null;
    contractId: string | null;
    issueDate: Date;
    dueDate: Date;
    paidAt: Date | null;
    sentAt: Date | null;
    viewedAt: Date | null;
    currency: Currency;
    paymentTerms: string | null;
    taxProvince: string | null;
    taxRates: unknown;
    businessName: string | null;
    businessEmail: string | null;
    businessPhone: string | null;
    businessAddress: unknown;
    businessGstHstNumber: string | null;
    clientBusinessName: string | null;
    clientEmail: string | null;
    clientPhone: string | null;
    clientAddress: unknown;
    clientGstHstNumber: string | null;
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
        status: string;
        refundAmount: number;
        refundedAt: Date | null;
        voidedAt: Date | null;
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
    contact?: { id: string; contactName: string; email: string | null; officePhone: string | null; mobilePhone: string | null } | null;
    quote?: { id: string; quoteNumber: string } | null;
    project?: { id: string; name: string | null; projectNumber: string | null } | null;
    contract?: { id: string; contractNumber: string; title: string } | null;
    items?: {
        id: string;
        itemName?: string | null;
        description: string;
        details?: string | null;
        quantity: Decimal;
        unitPrice: Decimal;
        amount: Decimal;
        taxRate: Decimal | null;
        sortOrder: number;
    }[];
    payments?: {
        id: string;
        amount: Decimal;
        paymentMethod: string;
        paymentDate: Date;
        reference: string | null;
        notes: string | null;
        createdAt: Date;
        status: string;
        refundAmount: Decimal;
        refundedAt: Date | null;
        voidedAt: Date | null;
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
        contact: inv.contact ? {
            id: inv.contact.id,
            contactName: inv.contact.contactName,
            email: inv.contact.email,
            officePhone: inv.contact.officePhone,
            mobilePhone: inv.contact.mobilePhone,
        } : null,
        quote: inv.quote ? { id: inv.quote.id, quoteNumber: inv.quote.quoteNumber } : null,
        project: inv.project ? { id: inv.project.id, name: inv.project.name, projectNumber: inv.project.projectNumber } : null,
        contract: inv.contract ? { id: inv.contract.id, contractNumber: inv.contract.contractNumber, title: inv.contract.title } : null,
        clientId: (inv as any).clientId || null,
        contactId: (inv as any).contactId || null,
        quoteId: (inv as any).quoteId || null,
        projectId: (inv as any).projectId || null,
        contractId: (inv as any).contractId || null,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        paidAt: inv.paidAt,
        sentAt: inv.sentAt,
        viewedAt: inv.viewedAt,
        currency: inv.currency,
        paymentTerms: (inv as any).paymentTerms ?? null,
        taxProvince: (inv as any).taxProvince ?? null,
        taxRates: (inv as any).taxRates ?? null,
        businessName: (inv as any).businessName ?? null,
        businessEmail: (inv as any).businessEmail ?? null,
        businessPhone: (inv as any).businessPhone ?? null,
        businessAddress: (inv as any).businessAddress ?? null,
        businessGstHstNumber: (inv as any).businessGstHstNumber ?? null,
        clientBusinessName: (inv as any).clientBusinessName ?? null,
        clientEmail: (inv as any).clientEmail ?? null,
        clientPhone: (inv as any).clientPhone ?? null,
        clientAddress: (inv as any).clientAddress ?? null,
        clientGstHstNumber: (inv as any).clientGstHstNumber ?? null,
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
            itemName: (i as any).itemName || i.description,
            description: i.description,
            details: (i as any).details || null,
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
            status: payment.status,
            refundAmount: Number(payment.refundAmount || 0),
            refundedAt: payment.refundedAt,
            voidedAt: payment.voidedAt,
        })),
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
    };
}
