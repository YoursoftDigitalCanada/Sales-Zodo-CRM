import api from "@/lib/axios";

const unwrap = (response: any) => response.data?.data || response.data;

export async function askSalesAI(message: string, context?: Record<string, unknown>) {
  return unwrap(await api.post("/ai/sales-chat", { message, ...context }));
}

export async function queryCRM(query: string) {
  return unwrap(await api.post("/ai/query-crm", { query }));
}

export async function scoreLead(payload: { leadId: string; autoUpdate?: boolean; confirmUpdate?: boolean }) {
  return unwrap(await api.post("/ai/score-lead", payload));
}

export async function generateEmail(payload: Record<string, unknown>) {
  return unwrap(await api.post("/ai/generate-email", payload));
}

export async function getDealInsights(payload: { dealId: string; confirmUpdate?: boolean }) {
  return unwrap(await api.post("/ai/deal-insights", payload));
}

export async function summarizeActivity(payload: Record<string, unknown>) {
  return unwrap(await api.post("/ai/summarize-activity", payload));
}

export async function getFollowUpSuggestions(payload: Record<string, unknown>) {
  return unwrap(await api.post("/ai/follow-up-suggestions", payload));
}
