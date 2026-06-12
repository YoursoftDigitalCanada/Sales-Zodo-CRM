import api from "@/lib/axios";

export type BookkeepingRecord = Record<string, any>;

export interface BookkeepingList<T = BookkeepingRecord> {
  data: T[];
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

function unwrap<T>(response: any): T {
  return response.data?.data ?? response.data ?? response;
}

function unwrapList<T = BookkeepingRecord>(response: any): BookkeepingList<T> {
  return { data: response.data?.data || [], meta: response.data?.meta };
}

export async function setupBookkeeping() {
  return unwrap<BookkeepingRecord>((await api.post("/bookkeeping/setup")));
}

export async function syncBookkeeping() {
  return unwrap<BookkeepingRecord>((await api.post("/bookkeeping/sync")));
}

export async function getBookkeepingDashboard(params?: Record<string, unknown>) {
  return unwrap<BookkeepingRecord>((await api.get("/bookkeeping/dashboard", { params })));
}

export async function getAccounts(params?: Record<string, unknown>) {
  return unwrapList((await api.get("/bookkeeping/accounts", { params })));
}

export async function createAccount(data: BookkeepingRecord) {
  return unwrap<BookkeepingRecord>((await api.post("/bookkeeping/accounts", data)));
}

export async function updateAccount(id: string, data: BookkeepingRecord) {
  return unwrap<BookkeepingRecord>((await api.put(`/bookkeeping/accounts/${id}`, data)));
}

export async function deleteAccount(id: string) {
  await api.delete(`/bookkeeping/accounts/${id}`);
}

export async function getCategories(params?: Record<string, unknown>) {
  return unwrapList((await api.get("/bookkeeping/categories", { params })));
}

export async function createCategory(data: BookkeepingRecord) {
  return unwrap<BookkeepingRecord>((await api.post("/bookkeeping/categories", data)));
}

export async function updateCategory(id: string, data: BookkeepingRecord) {
  return unwrap<BookkeepingRecord>((await api.put(`/bookkeeping/categories/${id}`, data)));
}

export async function deleteCategory(id: string) {
  await api.delete(`/bookkeeping/categories/${id}`);
}

export async function getVendors(params?: Record<string, unknown>) {
  return unwrapList((await api.get("/bookkeeping/vendors", { params })));
}

export async function createVendor(data: BookkeepingRecord) {
  return unwrap<BookkeepingRecord>((await api.post("/bookkeeping/vendors", data)));
}

export async function updateVendor(id: string, data: BookkeepingRecord) {
  return unwrap<BookkeepingRecord>((await api.put(`/bookkeeping/vendors/${id}`, data)));
}

export async function deleteVendor(id: string) {
  await api.delete(`/bookkeeping/vendors/${id}`);
}

export async function getTransactions(params?: Record<string, unknown>) {
  return unwrapList((await api.get("/bookkeeping/transactions", { params })));
}

export async function createTransaction(data: BookkeepingRecord) {
  return unwrap<BookkeepingRecord>((await api.post("/bookkeeping/transactions", data)));
}

export async function updateTransaction(id: string, data: BookkeepingRecord) {
  return unwrap<BookkeepingRecord>((await api.put(`/bookkeeping/transactions/${id}`, data)));
}

export async function bulkDeleteTransactions(ids: string[]) {
  const { data } = await api.post(`/api/v1/bookkeeping/transactions/bulk-delete`, { ids });
  return data?.data || data;
}

export async function deleteTransaction(id: string) {
  await api.delete(`/bookkeeping/transactions/${id}`);
}

export async function voidTransaction(id: string) {
  return unwrap<BookkeepingRecord>((await api.post(`/bookkeeping/transactions/${id}/void`)));
}

export async function attachReceipt(id: string, fileId: string) {
  return unwrap<BookkeepingRecord>((await api.post(`/bookkeeping/transactions/${id}/attach-receipt`, { fileId })));
}

export async function reconcileTransaction(id: string) {
  return unwrap<BookkeepingRecord>((await api.post(`/bookkeeping/transactions/${id}/reconcile`)));
}

export async function unreconcileTransaction(id: string) {
  return unwrap<BookkeepingRecord>((await api.post(`/bookkeeping/transactions/${id}/unreconcile`)));
}

export async function getTransfers(params?: Record<string, unknown>) {
  return unwrapList((await api.get("/bookkeeping/transfers", { params })));
}

export async function createTransfer(data: BookkeepingRecord) {
  return unwrap<BookkeepingRecord>((await api.post("/bookkeeping/transfers", data)));
}

export async function getJournalEntries(params?: Record<string, unknown>) {
  return unwrapList((await api.get("/bookkeeping/journal-entries", { params })));
}

export async function createJournalEntry(data: BookkeepingRecord) {
  return unwrap<BookkeepingRecord>((await api.post("/bookkeeping/journal-entries", data)));
}

export async function postJournalEntry(id: string) {
  return unwrap<BookkeepingRecord>((await api.post(`/bookkeeping/journal-entries/${id}/post`)));
}

export async function voidJournalEntry(id: string) {
  return unwrap<BookkeepingRecord>((await api.post(`/bookkeeping/journal-entries/${id}/void`)));
}

export async function getReconciliations(params?: Record<string, unknown>) {
  return unwrapList((await api.get("/bookkeeping/reconciliations", { params })));
}

export async function createReconciliation(data: BookkeepingRecord) {
  return unwrap<BookkeepingRecord>((await api.post("/bookkeeping/reconciliations", data)));
}

export async function completeReconciliation(id: string) {
  return unwrap<BookkeepingRecord>((await api.post(`/bookkeeping/reconciliations/${id}/complete`)));
}

export async function deleteReconciliation(id: string) {
  await api.delete(`/bookkeeping/reconciliations/${id}`);
}

export async function getRecurringRules(params?: Record<string, unknown>) {
  return unwrapList((await api.get("/bookkeeping/recurring-rules", { params })));
}

export async function createRecurringRule(data: BookkeepingRecord) {
  return unwrap<BookkeepingRecord>((await api.post("/bookkeeping/recurring-rules", data)));
}

export async function updateRecurringRule(id: string, data: BookkeepingRecord) {
  return unwrap<BookkeepingRecord>((await api.put(`/bookkeeping/recurring-rules/${id}`, data)));
}

export async function deleteRecurringRule(id: string) {
  await api.delete(`/bookkeeping/recurring-rules/${id}`);
}

export async function runDueRecurringRules() {
  return unwrap<BookkeepingRecord>((await api.post("/bookkeeping/recurring-rules/run-due")));
}

export async function getProfitLoss(params?: Record<string, unknown>) {
  return unwrap<BookkeepingRecord>((await api.get("/bookkeeping/reports/profit-loss", { params })));
}

export async function getCashFlow(params?: Record<string, unknown>) {
  return unwrap<BookkeepingRecord>((await api.get("/bookkeeping/reports/cash-flow", { params })));
}

export async function getTaxSummary(params?: Record<string, unknown>) {
  return unwrap<BookkeepingRecord>((await api.get("/bookkeeping/reports/tax-summary", { params })));
}

export async function getBalanceSheet(params?: Record<string, unknown>) {
  return unwrap<BookkeepingRecord>((await api.get("/bookkeeping/reports/balance-sheet", { params })));
}

export async function getTransactionTimeline(id: string) {
  return unwrapList((await api.get(`/v1/bookkeeping/transactions/${id}/timeline`)));
}

export async function askAiAccountant(query: string) {
  return unwrap<string>((await api.post("/bookkeeping/chat", { query })));
}

export async function createImportSession(name: string) {
  return unwrap<BookkeepingRecord>((await api.post("/bookkeeping/import-sessions", { name })));
}

export async function getImportSessions(params?: Record<string, unknown>) {
  const response = await api.get("/bookkeeping/import-sessions", { params });
  const payload = unwrap<any>(response);
  return payload?.data ? payload as BookkeepingList : { data: payload || [] };
}

export async function getImportSession(id: string) {
  return unwrap<BookkeepingRecord>((await api.get(`/bookkeeping/import-sessions/${id}`)));
}

export async function uploadStatementCsv(sessionId: string, file: File, accountId?: string) {
  const fileContent = await file.text();
  return unwrap<BookkeepingRecord>((await api.post(`/bookkeeping/import-sessions/${sessionId}/upload`, {
    fileContent,
    fileName: file.name,
    ...(accountId ? { accountId } : {}),
  })));
}

export async function processImportSession(sessionId: string) {
  return unwrap<BookkeepingRecord>((await api.post(`/bookkeeping/import-sessions/${sessionId}/process`)));
}

export async function finalizeImportSession(sessionId: string) {
  return unwrap<BookkeepingRecord>((await api.post(`/bookkeeping/import-sessions/${sessionId}/finalize`)));
}

export async function getRawImportTransactions(sessionId: string, params?: Record<string, unknown>) {
  const response = await api.get(`/bookkeeping/import-sessions/${sessionId}/raw-transactions`, { params });
  const payload = unwrap<any>(response);
  return payload?.data ? payload as BookkeepingList : { data: payload || [] };
}

export async function updateRawImportTransaction(sessionId: string, rawTransactionId: string, data: BookkeepingRecord) {
  return unwrap<BookkeepingRecord>((await api.put(
    `/bookkeeping/import-sessions/${sessionId}/raw-transactions/${rawTransactionId}`,
    data,
  )));
}

export function exportUrl(path: "transactions-export" | "profit-loss-export", params?: Record<string, string>) {
  const search = new URLSearchParams(params || {}).toString();
  return `/bookkeeping/reports/${path}${search ? `?${search}` : ""}`;
}

export async function downloadBookkeepingCsv(path: "transactions-export" | "profit-loss-export", params?: Record<string, unknown>) {
  const response = await api.get(`/bookkeeping/reports/${path}`, { params, responseType: "blob" });
  return response.data as Blob;
}
