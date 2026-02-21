import { Invoice, InvoiceStatus } from '@prisma/client';
export interface AddressDto {
    address?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
}
export interface TaxRateDto {
    name: string;
    rate: number;
}
export interface InvoiceItemDto {
    itemName: string;
    description?: string | null;
    quantity: number;
    rate: number;
    taxApplied?: boolean;
    lineTotal?: number;
}
export interface CreateInvoiceDto {
    invoiceNumber: string;
    invoiceDate: Date | string;
    paymentTerms?: string | null;
    dueDate: Date | string;
    currency?: string;
    taxProvince?: string | null;
    taxRates?: TaxRateDto[];
    businessName: string;
    businessEmail?: string | null;
    businessPhone?: string | null;
    businessAddress?: AddressDto;
    businessGstHstNumber?: string | null;
    clientId?: string | null;
    clientBusinessName?: string | null;
    clientEmail?: string | null;
    clientPhone?: string | null;
    clientAddress?: AddressDto;
    clientGstHstNumber?: string | null;
    items: InvoiceItemDto[];
    notes?: string | null;
}
export interface UpdateInvoiceDto extends Partial<CreateInvoiceDto> {
    status?: InvoiceStatus;
}
export interface InvoiceQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    status?: InvoiceStatus;
    clientId?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: 'invoiceNumber' | 'invoiceDate' | 'dueDate' | 'total';
    sortOrder?: 'asc' | 'desc';
}
export interface InvoiceResponseDto {
    id: string;
    invoiceNumber: string;
    invoiceDate: Date;
    paymentTerms: string | null;
    dueDate: Date;
    currency: string;
    status: InvoiceStatus;
    taxProvince: string | null;
    taxRates: TaxRateDto[];
    businessName: string;
    businessEmail: string | null;
    businessPhone: string | null;
    businessAddress: AddressDto | null;
    businessGstHstNumber: string | null;
    client: {
        id: string;
        clientName: string;
    } | null;
    clientBusinessName: string | null;
    clientEmail: string | null;
    clientPhone: string | null;
    clientAddress: AddressDto | null;
    clientGstHstNumber: string | null;
    items: InvoiceItemDto[];
    subtotal: number;
    taxAmount: number;
    total: number;
    notes: string | null;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
type InvoiceWithRelations = Invoice & {
    client?: {
        id: string;
        clientName: string;
    } | null;
    items?: {
        id: string;
        itemName: string;
        description: string | null;
        quantity: number;
        rate: number;
        taxApplied: boolean;
        lineTotal: number;
    }[];
};
export declare function toInvoiceResponseDto(inv: InvoiceWithRelations): InvoiceResponseDto;
export {};
//# sourceMappingURL=invoices.dto.d.ts.map