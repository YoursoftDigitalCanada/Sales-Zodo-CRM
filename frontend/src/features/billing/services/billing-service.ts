import api from "@/lib/axios";
import { extractApiArray, extractApiData } from "@/types/api";

export type BillingRecord = Record<string, any>;

export async function getSubscriptions(params?: Record<string, unknown>) {
  const response = await api.get("/billing/subscriptions", { params });
  return extractApiData<{ data: BillingRecord[]; totals: { count: number; mrr: number; arr: number } }>(response.data);
}

export async function getSubscription(id: string) {
  const response = await api.get(`/billing/subscriptions/${id}`);
  return extractApiData<BillingRecord>(response.data);
}

export async function createSubscription(data: BillingRecord) {
  const response = await api.post("/billing/subscriptions", data);
  return extractApiData<BillingRecord>(response.data);
}

export async function updateSubscription(id: string, data: BillingRecord) {
  const response = await api.put(`/billing/subscriptions/${id}`, data);
  return extractApiData<BillingRecord>(response.data);
}

export async function pauseSubscription(id: string) {
  const response = await api.patch(`/billing/subscriptions/${id}/pause`);
  return extractApiData<BillingRecord>(response.data);
}

export async function cancelSubscription(id: string) {
  const response = await api.patch(`/billing/subscriptions/${id}/cancel`);
  return extractApiData<BillingRecord>(response.data);
}

export async function reactivateSubscription(id: string) {
  const response = await api.patch(`/billing/subscriptions/${id}/reactivate`);
  return extractApiData<BillingRecord>(response.data);
}

export async function getPricingPlans(params?: Record<string, unknown>) {
  const response = await api.get("/billing/pricing-plans", { params });
  return extractApiArray<BillingRecord>(response.data);
}

export async function createPricingPlan(data: BillingRecord) {
  const response = await api.post("/billing/pricing-plans", data);
  return extractApiData<BillingRecord>(response.data);
}

export async function updatePricingPlan(id: string, data: BillingRecord) {
  const response = await api.put(`/billing/pricing-plans/${id}`, data);
  return extractApiData<BillingRecord>(response.data);
}

export async function getBillingInvoices(params?: Record<string, unknown>) {
  const response = await api.get("/billing/invoices", { params });
  return extractApiArray<BillingRecord>(response.data);
}

export async function markBillingInvoiceSent(id: string) {
  const response = await api.patch(`/billing/invoices/${id}/sent`);
  return extractApiData<BillingRecord>(response.data);
}

export async function markBillingInvoicePaid(id: string, data: BillingRecord) {
  const response = await api.patch(`/billing/invoices/${id}/paid`, data);
  return extractApiData<BillingRecord>(response.data);
}

export async function getPayments(params?: Record<string, unknown>) {
  const response = await api.get("/billing/payments", { params });
  return extractApiArray<BillingRecord>(response.data);
}

export async function recordPayment(data: BillingRecord) {
  const response = await api.post("/billing/payments", data);
  return extractApiData<BillingRecord>(response.data);
}

export async function createRenewalReminders(days = 30) {
  const response = await api.post("/billing/renewal-reminders", { days });
  return extractApiData<BillingRecord>(response.data);
}
