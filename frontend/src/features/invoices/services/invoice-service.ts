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
