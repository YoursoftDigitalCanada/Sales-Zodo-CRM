"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toInvoiceResponseDto = toInvoiceResponseDto;
function toInvoiceResponseDto(inv) {
    return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        paymentTerms: inv.paymentTerms,
        dueDate: inv.dueDate,
        currency: inv.currency,
        status: inv.status,
        taxProvince: inv.taxProvince,
        taxRates: inv.taxRates || [],
        businessName: inv.businessName,
        businessEmail: inv.businessEmail,
        businessPhone: inv.businessPhone,
        businessAddress: inv.businessAddress,
        businessGstHstNumber: inv.businessGstHstNumber,
        client: inv.client ? { id: inv.client.id, clientName: inv.client.clientName } : null,
        clientBusinessName: inv.clientBusinessName,
        clientEmail: inv.clientEmail,
        clientPhone: inv.clientPhone,
        clientAddress: inv.clientAddress,
        clientGstHstNumber: inv.clientGstHstNumber,
        items: (inv.items || []).map((i) => ({
            itemName: i.itemName,
            description: i.description,
            quantity: Number(i.quantity),
            rate: Number(i.rate),
            taxApplied: i.taxApplied,
            lineTotal: Number(i.lineTotal),
        })),
        subtotal: Number(inv.subtotal),
        taxAmount: Number(inv.taxAmount),
        total: Number(inv.total),
        notes: inv.notes,
        paidAt: inv.paidAt,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
    };
}
//# sourceMappingURL=invoices.dto.js.map