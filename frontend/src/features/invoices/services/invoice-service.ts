import api from "@/lib/axios";
import { extractApiArray, extractApiData } from "@/types/api";
import type { CreateInvoiceDto, UpdateInvoiceDto, InvoiceQueryDto } from "@contracts/invoice";

export interface InvoiceEntity {
  id: string;
  [key: string]: unknown;
}

export interface RecordInvoicePaymentPayload {
  amount: number;
  paymentMethod: "CASH" | "CREDIT_CARD" | "DEBIT_CARD" | "BANK_TRANSFER" | "E_TRANSFER" | "CHECK" | "PAYPAL" | "STRIPE" | "OTHER";
  paymentDate?: string;
  reference?: string | null;
  notes?: string | null;
}

async function fetchInvoicePdfBlob(id: number | string): Promise<Blob> {
  const response = await api.get(`/invoices/${id}/pdf`, { responseType: "blob" });
  return new Blob([response.data], { type: "application/pdf" });
}

function downloadPdfBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function getInvoices(params?: Partial<InvoiceQueryDto>) {
  const response = await api.get("/invoices", { params });
  return extractApiArray<InvoiceEntity>(response.data);
}

export async function getInvoiceById(id: string) {
  const response = await api.get(`/invoices/${id}`);
  return extractApiData<InvoiceEntity>(response.data);
}

export async function createInvoice(data: CreateInvoiceDto) {
  const response = await api.post("/invoices", data);
  return extractApiData<InvoiceEntity>(response.data);
}

export async function updateInvoice(id: number | string, data: UpdateInvoiceDto) {
  const response = await api.put(`/invoices/${id}`, data);
  return extractApiData<InvoiceEntity>(response.data);
}

export async function sendInvoice(id: number | string, recipientEmail?: string) {
  const response = await api.post(`/invoices/${id}/send`, { recipientEmail });
  return extractApiData<InvoiceEntity>(response.data);
}

export async function recordInvoicePayment(id: number | string, payload: RecordInvoicePaymentPayload) {
  const response = await api.post(`/invoices/${id}/payments`, payload);
  return extractApiData<InvoiceEntity>(response.data);
}

export async function deleteInvoice(id: number | string): Promise<void> {
  await api.delete(`/invoices/${id}`);
}

export async function markInvoiceAsPaid(id: number | string): Promise<InvoiceEntity> {
  const response = await api.patch(`/invoices/${id}/paid`);
  return extractApiData<InvoiceEntity>(response.data);
}

export async function downloadInvoicePdf(id: number | string, fileName?: string): Promise<void> {
  const blob = await fetchInvoicePdfBlob(id);
  downloadPdfBlob(blob, fileName || `invoice-${id}.pdf`);
}

export async function saveInvoicePdfToDocuments(id: number | string): Promise<InvoiceEntity> {
  const response = await api.post(`/invoices/${id}/save-document`);
  return extractApiData<InvoiceEntity>(response.data);
}

export async function printInvoicePdf(id: number | string, fileName?: string): Promise<void> {
  const blob = await fetchInvoicePdfBlob(id);
  const url = window.URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank", "noopener,noreferrer");

  if (!printWindow) {
    downloadPdfBlob(blob, fileName || `invoice-${id}.pdf`);
    return;
  }

  window.setTimeout(() => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch {
      downloadPdfBlob(blob, fileName || `invoice-${id}.pdf`);
    }
  }, 500);

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 60_000);
}
