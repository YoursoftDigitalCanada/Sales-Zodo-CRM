import api from "@/lib/axios";
import { extractApiArray, extractApiData } from "@/types/api";

export type EngagementRecord = Record<string, any>;

export async function getEmailTemplates(params?: Record<string, unknown>) {
  const response = await api.get("/engagement/email-templates", { params });
  return extractApiArray<EngagementRecord>(response.data);
}

export async function createEmailTemplate(data: EngagementRecord) {
  const response = await api.post("/engagement/email-templates", data);
  return extractApiData<EngagementRecord>(response.data);
}

export async function updateEmailTemplate(id: string, data: EngagementRecord) {
  const response = await api.put(`/engagement/email-templates/${id}`, data);
  return extractApiData<EngagementRecord>(response.data);
}

export async function getSequences() {
  const response = await api.get("/engagement/sequences");
  return extractApiArray<EngagementRecord>(response.data);
}

export async function createSequence(data: EngagementRecord) {
  const response = await api.post("/engagement/sequences", data);
  return extractApiData<EngagementRecord>(response.data);
}

export async function updateSequence(id: string, data: EngagementRecord) {
  const response = await api.put(`/engagement/sequences/${id}`, data);
  return extractApiData<EngagementRecord>(response.data);
}

export async function startSequence(id: string, data: EngagementRecord) {
  const response = await api.post(`/engagement/sequences/${id}/start`, data);
  return extractApiData<EngagementRecord>(response.data);
}

export async function stopSequence(id: string, data: EngagementRecord = {}) {
  const response = await api.post(`/engagement/sequences/${id}/stop`, data);
  return extractApiData<EngagementRecord>(response.data);
}

export async function getCalls(params?: Record<string, unknown>) {
  const response = await api.get("/engagement/calls", { params });
  return extractApiArray<EngagementRecord>(response.data);
}

export async function logCall(data: EngagementRecord) {
  const response = await api.post("/engagement/calls", data);
  return extractApiData<EngagementRecord>(response.data);
}

export async function updateCall(id: string, data: EngagementRecord) {
  const response = await api.put(`/engagement/calls/${id}`, data);
  return extractApiData<EngagementRecord>(response.data);
}

export async function scheduleEngagementMeeting(data: EngagementRecord) {
  const response = await api.post("/engagement/meetings", data);
  return extractApiData<EngagementRecord>(response.data);
}

export async function completeEngagementMeeting(id: string, data: EngagementRecord) {
  const response = await api.patch(`/engagement/meetings/${id}/complete`, data);
  return extractApiData<EngagementRecord>(response.data);
}

export async function logEngagementNote(data: EngagementRecord) {
  const response = await api.post("/engagement/notes", data);
  return extractApiData<EngagementRecord>(response.data);
}
