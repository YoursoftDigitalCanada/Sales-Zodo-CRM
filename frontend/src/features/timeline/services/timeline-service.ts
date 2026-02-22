import api from "@/lib/axios";

// ── Types ────────────────────────────────────────────────────────────────

export interface TimelineEvent {
    id: string;
    action: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    entityType: string;
    entityId: string;
    module: string;
    user: { id: string; name: string; email: string } | null;
    metadata: {
        oldValues?: Record<string, any>;
        newValues?: Record<string, any>;
        changes?: string[];
    } | null;
    createdAt: string;
}

export interface TimelineMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
}

export interface TimelineResponse {
    data: TimelineEvent[];
    meta: TimelineMeta;
}

// ── Service Functions ────────────────────────────────────────────────────

export async function getTimeline(
    entityType: string,
    entityId: string,
    options: {
        page?: number;
        limit?: number;
        action?: string;
        includeRelated?: boolean;
    } = {}
): Promise<TimelineResponse> {
    const { page = 1, limit = 20, action, includeRelated = false } = options;
    const suffix = includeRelated ? "/related" : "";
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(action && { action }),
    });

    const res = await api.get(`/timeline/${entityType}/${entityId}${suffix}?${params}`);
    return {
        data: res.data?.data || [],
        meta: res.data?.meta || { page, limit, total: 0, totalPages: 0, hasNextPage: false },
    };
}
