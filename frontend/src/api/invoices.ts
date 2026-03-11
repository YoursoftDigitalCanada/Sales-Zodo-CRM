import api from "@/lib/axios";
import type { CreateInvoiceDto, UpdateInvoiceDto, InvoiceQueryDto } from "@contracts/invoice";

export async function getInvoices(params?: Partial<InvoiceQueryDto>) {
  return api.get("/invoices", { params });
}

export async function createInvoice(payload: CreateInvoiceDto) {
  return api.post("/invoices", payload);
}

export async function updateInvoice(id: string, payload: UpdateInvoiceDto) {
  return api.put(`/invoices/${id}`, payload);
}

export async function markInvoiceAsPaid(id: string) {
  return api.patch(`/invoices/${id}/paid`);
}

export async function downloadInvoicePdf(id: string) {
  return api.get(`/invoices/${id}/pdf`, { responseType: "blob" });
}

