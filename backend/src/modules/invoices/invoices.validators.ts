import { z } from "zod";
import {
  CreateInvoiceSchema,
  UpdateInvoiceSchema,
  InvoiceQuerySchema,
  InvoiceIdParamsSchema,
  RecordInvoicePaymentSchema,
} from "@contracts/invoice";

export const createInvoiceSchema = z.object({
  body: CreateInvoiceSchema,
});

export const updateInvoiceSchema = z.object({
  body: UpdateInvoiceSchema,
});

export const invoiceQuerySchema = z.object({
  query: InvoiceQuerySchema,
});

export const invoiceIdSchema = z.object({
  params: InvoiceIdParamsSchema,
});

export const recordInvoicePaymentSchema = z.object({
  body: RecordInvoicePaymentSchema,
});
