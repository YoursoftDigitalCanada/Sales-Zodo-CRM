import { CreateInvoiceDto, UpdateInvoiceDto, InvoiceQueryDto } from './invoices.dto';
export declare class InvoicesService {
    create(tenantId: string, data: CreateInvoiceDto): Promise<import("./invoices.dto").InvoiceResponseDto>;
    getById(id: string, tenantId: string): Promise<import("./invoices.dto").InvoiceResponseDto>;
    getMany(tenantId: string, query: InvoiceQueryDto): Promise<{
        data: import("./invoices.dto").InvoiceResponseDto[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
    update(id: string, tenantId: string, data: UpdateInvoiceDto): Promise<import("./invoices.dto").InvoiceResponseDto>;
    delete(id: string, tenantId: string): Promise<void>;
    markAsPaid(id: string, tenantId: string): Promise<import("./invoices.dto").InvoiceResponseDto>;
}
export declare const invoicesService: InvoicesService;
//# sourceMappingURL=invoices.service.d.ts.map