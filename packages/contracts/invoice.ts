import { z } from "zod";
import { CurrencySchema, InvoiceStatusSchema, SortOrderSchema } from "./enums";

const dateTimeString = z.string().datetime();

export const InvoiceAddressSchema = z.object({
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
});

export const InvoiceItemSchema = z.object({
  itemName: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  quantity: z.number().min(0).default(1).optional(),
  rate: z.number().min(0).optional(),
  taxApplied: z.boolean().default(false),
  lineTotal: z.number().min(0).optional(),
  unitPrice: z.number().min(0).optional(),
  amount: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

export const CanonicalInvoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  amount: z.number().min(0),
  taxRate: z.number().min(0).max(100).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

export const CreateInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1).max(50),
  invoiceDate: dateTimeString.optional(),
  issueDate: dateTimeString.optional(),
  paymentTerms: z.string().max(50).optional().nullable(),
  dueDate: dateTimeString,
  currency: CurrencySchema.default("CAD"),
  taxProvince: z.string().max(50).optional().nullable(),
  taxRate: z.number().min(0).max(100).optional().nullable(),
  taxRates: z
    .array(
      z.object({
        name: z.string(),
        rate: z.number().min(0).max(100),
      }),
    )
    .default([]),
  businessName: z.string().max(255).optional().nullable(),
  businessEmail: z.string().max(255).optional().nullable(),
  businessPhone: z.string().max(30).optional().nullable(),
  businessAddress: InvoiceAddressSchema.optional(),
  businessGstHstNumber: z.string().max(50).optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  clientBusinessName: z.string().max(255).optional().nullable(),
  clientEmail: z.string().max(255).optional().nullable(),
  clientPhone: z.string().max(30).optional().nullable(),
  clientAddress: InvoiceAddressSchema.optional(),
  clientGstHstNumber: z.string().max(50).optional().nullable(),
  discountAmount: z.number().min(0).optional().nullable(),
  items: z.array(InvoiceItemSchema).min(1),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
});

export const UpdateInvoiceSchema = CreateInvoiceSchema.partial().extend({
  status: InvoiceStatusSchema.optional(),
});

export const InvoiceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: InvoiceStatusSchema.optional(),
  clientId: z.string().uuid().optional(),
  startDate: dateTimeString.optional(),
  endDate: dateTimeString.optional(),
  sortBy: z.enum(["invoiceNumber", "issueDate", "dueDate", "total"]).default("issueDate"),
  sortOrder: SortOrderSchema.default("desc"),
});

export const InvoiceIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const InvoicePdfParamsSchema = z.object({
  id: z.string().uuid(),
});

export type InvoiceItemDto = z.input<typeof InvoiceItemSchema>;
export type CanonicalInvoiceItemDto = z.input<typeof CanonicalInvoiceItemSchema>;
export type CreateInvoiceDto = z.input<typeof CreateInvoiceSchema> & {
  issueDate?: Date | string;
  taxRate?: number | null;
  terms?: string | null;
  items: Array<InvoiceItemDto | CanonicalInvoiceItemDto>;
};
export type UpdateInvoiceDto = z.input<typeof UpdateInvoiceSchema> & {
  issueDate?: Date | string;
  taxRate?: number | null;
  terms?: string | null;
  items?: Array<InvoiceItemDto | CanonicalInvoiceItemDto>;
};
export type InvoiceQueryDto = z.input<typeof InvoiceQuerySchema>;
