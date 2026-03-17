import api from "@/lib/axios";

// ============================================================================
// TYPES
// ============================================================================

export interface FileResponse {
    id: string;
    name: string;
    originalName: string;
    mimeType: string;
    size: number;
    path: string;
    extension: string | null;
    folderId: string | null;
    folder: { id: string; name: string } | null;
    isShared: boolean;
    isStarred: boolean;
    shareLink: string | null;
    shareExpiresAt: string | null;
    checksum: string | null;
    tags: { id: string; name: string; color: string | null }[];
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface FolderResponse {
    id: string;
    name: string;
    isShared: boolean;
    isStarred: boolean;
    parentId: string | null;
    parent: { id: string; name: string } | null;
    filesCount: number;
    childrenCount: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface StorageAnalytics {
    totalUsed: number;
    totalLimit: number;
    fileCount: number;
    breakdown: {
        documents: number;
        images: number;
        videos: number;
        audio: number;
        other: number;
    };
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

// ============================================================================
// FILES API
// ============================================================================

function extract<T>(res: any): T {
    return res.data?.data ?? res.data ?? res;
}

export async function getFiles(params?: Record<string, unknown>): Promise<FileResponse[]> {
    const res = await api.get("/files", { params });
    return extract<FileResponse[]>(res);
}

export async function getFilesPaginated(params?: Record<string, unknown>): Promise<PaginatedResponse<FileResponse>> {
    const res = await api.get("/files", { params });
    const raw = res.data;
    return {
        data: raw?.data || [],
        meta: raw?.meta || { page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
    };
}

export async function getFileById(id: string): Promise<FileResponse> {
    const res = await api.get(`/files/${id}`);
    return extract<FileResponse>(res);
}

export async function getRecentFiles(): Promise<FileResponse[]> {
    const res = await api.get("/files/recent");
    return extract<FileResponse[]>(res);
}

export async function getStarredFiles(): Promise<FileResponse[]> {
    const res = await api.get("/files/starred");
    return extract<FileResponse[]>(res);
}

export async function getTrashedFiles(): Promise<FileResponse[]> {
    const res = await api.get("/files/trash");
    return extract<FileResponse[]>(res);
}

export async function getStorageAnalytics(): Promise<StorageAnalytics> {
    const res = await api.get("/files/storage");
    return extract<StorageAnalytics>(res);
}

// Upload with progress callback
export async function uploadFile(
    file: File,
    opts?: { folderId?: string; projectId?: string },
    onProgress?: (pct: number) => void,
): Promise<FileResponse> {
    const formData = new FormData();
    formData.append("file", file);
    if (opts?.folderId) formData.append("folderId", opts.folderId);
    if (opts?.projectId) formData.append("projectId", opts.projectId);

    const res = await api.post("/files", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
            if (onProgress && e.total) {
                onProgress(Math.round((e.loaded * 100) / e.total));
            }
        },
    });
    return extract<FileResponse>(res);
}

// Upload multiple files
export async function uploadFiles(
    files: File[],
    opts?: { folderId?: string },
    onFileProgress?: (fileName: string, pct: number) => void,
): Promise<FileResponse[]> {
    const results: FileResponse[] = [];
    for (const file of files) {
        const result = await uploadFile(file, opts, (pct) => onFileProgress?.(file.name, pct));
        results.push(result);
    }
    return results;
}

export async function renameFile(id: string, name: string): Promise<FileResponse> {
    const res = await api.put(`/files/${id}`, { name });
    return extract<FileResponse>(res);
}

export async function moveFile(id: string, folderId: string | null): Promise<FileResponse> {
    const res = await api.put(`/files/${id}/move`, { folderId });
    return extract<FileResponse>(res);
}

export async function copyFile(id: string, opts?: { folderId?: string | null; name?: string }): Promise<FileResponse> {
    const res = await api.post(`/files/${id}/copy`, opts || {});
    return extract<FileResponse>(res);
}

export async function toggleFileStar(id: string): Promise<FileResponse> {
    const res = await api.put(`/files/${id}/star`);
    return extract<FileResponse>(res);
}

export async function deleteFile(id: string): Promise<void> {
    await api.delete(`/files/${id}`);
}

export async function restoreFile(id: string): Promise<FileResponse> {
    const res = await api.put(`/files/${id}/restore`);
    return extract<FileResponse>(res);
}

export async function permanentDeleteFile(id: string): Promise<void> {
    await api.delete(`/files/${id}/permanent`);
}

export async function createShareLink(id: string, expiresInHours?: number): Promise<FileResponse> {
    const res = await api.post(`/files/${id}/share`, { expiresInHours });
    return extract<FileResponse>(res);
}

export async function revokeShareLink(id: string): Promise<FileResponse> {
    const res = await api.delete(`/files/${id}/share`);
    return extract<FileResponse>(res);
}

export async function bulkDeleteFiles(fileIds: string[]): Promise<{ count: number }> {
    const res = await api.post("/files/bulk-delete", { fileIds });
    return extract<{ count: number }>(res);
}

export async function bulkMoveFiles(fileIds: string[], folderId: string | null): Promise<{ count: number }> {
    const res = await api.post("/files/bulk-move", { fileIds, folderId });
    return extract<{ count: number }>(res);
}

export function getDownloadUrl(id: string): string {
    return `${api.defaults.baseURL}/files/${id}/download`;
}

export async function downloadFile(id: string, fileName: string): Promise<void> {
    const res = await api.get(`/files/${id}/download`, { responseType: "blob" });
    const blob = new Blob([res.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// ============================================================================
// FOLDERS API
// ============================================================================

export async function getFolders(params?: Record<string, unknown>): Promise<FolderResponse[]> {
    const res = await api.get("/folders", { params });
    return extract<FolderResponse[]>(res);
}

export async function getFolderTree(): Promise<FolderResponse[]> {
    const res = await api.get("/folders/tree");
    return extract<FolderResponse[]>(res);
}

export async function getFolderById(id: string): Promise<FolderResponse> {
    const res = await api.get(`/folders/${id}`);
    return extract<FolderResponse>(res);
}

export async function createFolder(name: string, parentId?: string | null): Promise<FolderResponse> {
    const res = await api.post("/folders", { name, parentId: parentId || null });
    return extract<FolderResponse>(res);
}

export async function renameFolder(id: string, name: string): Promise<FolderResponse> {
    const res = await api.put(`/folders/${id}`, { name });
    return extract<FolderResponse>(res);
}

export async function deleteFolder(id: string): Promise<void> {
    await api.delete(`/folders/${id}`);
}

export async function toggleFolderStar(id: string): Promise<FolderResponse> {
    const res = await api.put(`/folders/${id}/star`);
    return extract<FolderResponse>(res);
}

export async function restoreFolder(id: string): Promise<FolderResponse> {
    const res = await api.put(`/folders/${id}/restore`);
    return extract<FolderResponse>(res);
}
