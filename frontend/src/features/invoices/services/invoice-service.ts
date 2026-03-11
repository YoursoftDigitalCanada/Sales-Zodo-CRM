import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";
import type { CreateInvoiceDto, UpdateInvoiceDto, InvoiceQueryDto } from "@contracts/invoice";

export interface InvoiceEntity {
  id: string;
  [key: string]: unknown;
}

export async function getInvoices(params?: Partial<InvoiceQueryDto>) {
  const response = await api.get("/invoices", { params });
  return extractApiArray<InvoiceEntity>(response.data);
}

export async function createInvoice(data: CreateInvoiceDto) {
  const response = await api.post("/invoices", data);
  return response.data;
}

export async function updateInvoice(id: number | string, data: UpdateInvoiceDto) {
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

export async function downloadInvoicePdf(id: number | string): Promise<void> {
  const response = await api.get(`/invoices/${id}/pdf`, { responseType: "blob" });
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `invoice-${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
