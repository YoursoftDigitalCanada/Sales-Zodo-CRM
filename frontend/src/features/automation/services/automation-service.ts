import api from "@/lib/axios";

export type AutomationRecord = Record<string, any>;

function extract<T>(res: any): T {
  return res.data?.data ?? res.data ?? res;
}

export async function getAutomationRules(params?: Record<string, unknown>) {
  const res = await api.get("/automation/rules", { params });
  return extract<AutomationRecord[]>(res);
}

export async function createAutomationRule(data: AutomationRecord) {
  const res = await api.post("/automation/rules", data);
  return extract<AutomationRecord>(res);
}

export async function updateAutomationRule(id: string, data: AutomationRecord) {
  const res = await api.put(`/automation/rules/${id}`, data);
  return extract<AutomationRecord>(res);
}

export async function enableAutomationRule(id: string) {
  const res = await api.post(`/automation/rules/${id}/enable`);
  return extract<AutomationRecord>(res);
}

export async function disableAutomationRule(id: string) {
  const res = await api.post(`/automation/rules/${id}/disable`);
  return extract<AutomationRecord>(res);
}

export async function deleteAutomationRule(id: string) {
  await api.delete(`/automation/rules/${id}`);
}

export async function getAutomationRuns(params?: Record<string, unknown>) {
  const res = await api.get("/automation/runs", { params });
  return extract<AutomationRecord[]>(res);
}

export async function getAutomationReminders(params?: Record<string, unknown>) {
  const res = await api.get("/automation/reminders", { params });
  return extract<AutomationRecord[]>(res);
}

export async function cancelAutomationReminder(id: string) {
  const res = await api.post(`/automation/reminders/${id}/cancel`);
  return extract<AutomationRecord>(res);
}

export async function seedAutomationDefaults() {
  const res = await api.post("/automation/seed-defaults");
  return extract<AutomationRecord>(res);
}
