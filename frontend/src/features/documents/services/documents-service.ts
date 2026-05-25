import api from "@/lib/axios";

export interface DocumentCategory {
  id: string;
  name: string;
  color?: string | null;
  isSystem: boolean;
}

export interface BusinessDocument {
  id: string;
  fileId: string;
  name: string;
  originalName: string;
  mimeType: string;
  type: string;
  size: number;
  extension?: string | null;
  folderId?: string | null;
  folder?: { id: string; name: string } | null;
  category?: DocumentCategory | null;
  categoryId?: string | null;
  description?: string | null;
  version: number;
  linkedEntityType?: string | null;
  linkedEntityId?: string | null;
  visibleToClient: boolean;
  requiresSignature: boolean;
  expiresAt?: string | null;
  tags: Array<{ id: string; name: string; color?: string | null }>;
  isStarred: boolean;
  isShared: boolean;
  shareLink?: string | null;
  shareExpiresAt?: string | null;
  uploadedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentsResponse {
  data: BusinessDocument[];
  meta: { page: number; limit: number; total: number; totalPages: number; hasNextPage?: boolean; hasPrevPage?: boolean };
}

function extract<T>(res: any): T {
  return res.data?.data ?? res.data ?? res;
}

export async function getDocuments(params?: Record<string, unknown>): Promise<DocumentsResponse> {
  const res = await api.get("/documents", { params });
  return { data: res.data?.data || [], meta: res.data?.meta || { page: 1, limit: 50, total: 0, totalPages: 0 } };
}

export async function getDocument(id: string): Promise<BusinessDocument> {
  const res = await api.get(`/documents/${id}`);
  return extract<BusinessDocument>(res);
}

export async function uploadDocument(file: File, data: Record<string, unknown> = {}, onProgress?: (pct: number) => void): Promise<BusinessDocument> {
  const formData = new FormData();
  formData.append("file", file);
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") formData.append(key, String(value));
  });
  const res = await api.post("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress(Math.round((event.loaded * 100) / event.total));
    },
  });
  return extract<BusinessDocument>(res);
}

export async function updateDocument(id: string, data: Record<string, unknown>): Promise<BusinessDocument> {
  const res = await api.put(`/documents/${id}`, data);
  return extract<BusinessDocument>(res);
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/documents/${id}`);
}

export async function shareDocument(id: string, expiresInHours?: number): Promise<BusinessDocument> {
  const res = await api.post(`/documents/${id}/share`, { expiresInHours });
  return extract<BusinessDocument>(res);
}

export async function revokeDocumentShare(id: string): Promise<BusinessDocument> {
  const res = await api.delete(`/documents/${id}/share`);
  return extract<BusinessDocument>(res);
}

export async function linkDocument(id: string, linkedEntityType: string, linkedEntityId: string): Promise<BusinessDocument> {
  const res = await api.post(`/documents/${id}/link`, { linkedEntityType, linkedEntityId });
  return extract<BusinessDocument>(res);
}

export async function unlinkDocument(id: string): Promise<BusinessDocument> {
  const res = await api.delete(`/documents/${id}/link`);
  return extract<BusinessDocument>(res);
}

export async function getDocumentCategories(): Promise<DocumentCategory[]> {
  const res = await api.get("/documents/categories");
  return extract<DocumentCategory[]>(res);
}

export async function createDocumentCategory(data: { name: string; color?: string }): Promise<DocumentCategory> {
  const res = await api.post("/documents/categories", data);
  return extract<DocumentCategory>(res);
}

export async function createDocumentFolder(data: { name: string; parentId?: string | null }) {
  const res = await api.post("/documents/folders", data);
  return extract<{ id: string; name: string; parentId?: string | null }>(res);
}

export async function getDocumentFolders(params?: Record<string, unknown>) {
  const res = await api.get("/documents/folders", { params });
  const payload = extract<any>(res);
  return Array.isArray(payload) ? payload : payload?.data || [];
}

export function getDocumentPreviewUrl(id: string): string {
  return `${api.defaults.baseURL}/documents/${id}/preview`;
}

export function getDocumentDownloadUrl(id: string): string {
  return `${api.defaults.baseURL}/documents/${id}/download`;
}

export function getDocumentShareUrl(shareLink: string): string {
  return `${api.defaults.baseURL}/public/files/${shareLink}/download`;
}
