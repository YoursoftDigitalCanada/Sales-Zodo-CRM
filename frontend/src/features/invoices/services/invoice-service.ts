import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

export interface InvoiceEntity {
  id: string;
  [key: string]: unknown;
}

export async function getInvoices() {
  const response = await api.get("/invoices");
  return extractApiArray<InvoiceEntity>(response.data);
}

export async function createInvoice(data: unknown) {
  const response = await api.post("/invoices", data);
  return response.data;
}

export async function updateInvoice(id: number | string, data: unknown) {
  const response = await api.put(`/invoices/${id}`, data);
  return response.data;
}

export async function deleteInvoice(id: number | string): Promise<void> {
  await api.delete(`/invoices/${id}`);
}

export async function markInvoiceAsPaid(id: number | string): Promise<InvoiceEntity> {
  const response = await api.patch(`/invoices/${id}/paid`);
  return response.data?.data || response.data;
}
