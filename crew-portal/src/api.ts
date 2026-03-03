const API_BASE = import.meta.env.VITE_API_URL || 'https://api.zodo.ca/api/v1';

function getToken(): string | null { return localStorage.getItem('crew_token'); }

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    });
    if (res.status === 401) { localStorage.removeItem('crew_token'); localStorage.removeItem('crew_user'); window.location.href = '/login'; throw new Error('Unauthorized'); }
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Request failed');
    return json.data !== undefined ? json.data : json;
}

// ── Auth ────────────────────────────────────────────────────────────
export async function login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Login failed');
    const data = json.data || json;
    localStorage.setItem('crew_token', data.tokens.accessToken);
    localStorage.setItem('crew_user', JSON.stringify({
        id: data.user.id, name: `${data.user.firstName} ${data.user.lastName}`, email: data.user.email,
        avatar: data.user.avatar, employeeId: data.employee?.id, role: data.employee?.role?.name, tenantName: data.tenant?.name,
    }));
    return data;
}

export function logout() { localStorage.removeItem('crew_token'); localStorage.removeItem('crew_user'); window.location.href = '/login'; }
export function getCurrentUser() { const raw = localStorage.getItem('crew_user'); return raw ? JSON.parse(raw) : null; }
export function isAuthenticated(): boolean { return !!getToken(); }

// ── Crew API ────────────────────────────────────────────────────────
export const crewApi = {
    // Dashboard
    getDashboard: () => apiFetch<any>('/crew/dashboard'),

    // Jobs
    getJobs: (status?: string) => apiFetch<any[]>(`/crew/jobs${status ? `?status=${status}` : ''}`),
    getJobDetail: (id: string) => apiFetch<any>(`/crew/jobs/${id}`),
    updateJobStatus: (id: string, data: any) => apiFetch<any>(`/crew/jobs/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
    addJobNote: (id: string, data: any) => apiFetch<any>(`/crew/jobs/${id}/notes`, { method: 'POST', body: JSON.stringify(data) }),

    // Time
    clockIn: (data: any) => apiFetch<any>('/crew/time/clock-in', { method: 'POST', body: JSON.stringify(data) }),
    clockOut: (data: any) => apiFetch<any>('/crew/time/clock-out', { method: 'POST', body: JSON.stringify(data) }),
    getTimeEntries: (range: 'week' | 'month' = 'week') => apiFetch<any[]>(`/crew/time/entries?range=${range}`),
    sendLocationPing: (data: any) => apiFetch<any>('/crew/time/location-ping', { method: 'POST', body: JSON.stringify(data) }),

    // Notifications
    getNotifications: () => apiFetch<any[]>('/crew/notifications'),
    markRead: (id: string) => apiFetch<any>(`/crew/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: () => apiFetch<any>('/crew/notifications/read-all', { method: 'PUT' }),

    // Photos
    getJobPhotos: (id: string) => apiFetch<any[]>(`/crew/jobs/${id}/photos`),
    addJobPhoto: (id: string, data: any) => apiFetch<any>(`/crew/jobs/${id}/photos`, { method: 'POST', body: JSON.stringify(data) }),
    getBeforeAfter: (id: string) => apiFetch<any>(`/crew/jobs/${id}/photos/before-after`),
    deletePhoto: (id: string) => apiFetch<any>(`/crew/photos/${id}`, { method: 'DELETE' }),

    // Checklists
    getChecklists: () => apiFetch<any[]>('/crew/checklists'),
    getChecklist: (id: string) => apiFetch<any>(`/crew/checklists/${id}`),
    submitChecklist: (id: string, data: any) => apiFetch<any>(`/crew/checklists/${id}/submit`, { method: 'POST', body: JSON.stringify(data) }),
    getJobChecklists: (id: string) => apiFetch<any[]>(`/crew/jobs/${id}/checklists`),

    // Chat
    getMessages: (id: string) => apiFetch<any[]>(`/crew/jobs/${id}/messages`),
    sendMessage: (id: string, data: any) => apiFetch<any>(`/crew/jobs/${id}/messages`, { method: 'POST', body: JSON.stringify(data) }),
    markMessagesRead: (id: string) => apiFetch<any>(`/crew/jobs/${id}/messages/read`, { method: 'PUT' }),

    // Equipment
    getEquipment: () => apiFetch<any[]>('/crew/equipment'),
    reportIssue: (id: string, data: any) => apiFetch<any>(`/crew/equipment/${id}/report-issue`, { method: 'POST', body: JSON.stringify(data) }),

    // Materials
    getJobMaterials: (id: string) => apiFetch<any[]>(`/crew/jobs/${id}/materials`),
    requestMaterials: (id: string, data: any) => apiFetch<any>(`/crew/jobs/${id}/materials/request`, { method: 'POST', body: JSON.stringify(data) }),
    getMyMaterialRequests: () => apiFetch<any[]>('/crew/materials/requests'),

    // Safety
    reportIncident: (data: any) => apiFetch<any>('/crew/safety/incident', { method: 'POST', body: JSON.stringify(data) }),
    getIncidents: () => apiFetch<any[]>('/crew/safety/incidents'),
    sendEmergency: (data: any) => apiFetch<any>('/crew/safety/emergency', { method: 'POST', body: JSON.stringify(data) }),

    // Stats
    getStats: () => apiFetch<any>('/crew/stats/personal'),
    getWeeklySummary: () => apiFetch<any>('/crew/stats/weekly-summary'),

    // Leave
    getLeaveRequests: () => apiFetch<any[]>('/crew/leave/requests'),
    submitLeave: (data: any) => apiFetch<any>('/crew/leave/request', { method: 'POST', body: JSON.stringify(data) }),
    cancelLeave: (id: string) => apiFetch<any>(`/crew/leave/${id}/cancel`, { method: 'PUT' }),
    getAvailability: () => apiFetch<any[]>('/crew/availability'),
    updateAvailability: (data: any) => apiFetch<any>('/crew/availability', { method: 'PUT', body: JSON.stringify(data) }),

    // Documents
    getDocuments: () => apiFetch<any[]>('/crew/documents'),
    getExpiring: () => apiFetch<any[]>('/crew/documents/expiring'),
    uploadDocument: (data: any) => apiFetch<any>('/crew/documents/upload', { method: 'POST', body: JSON.stringify(data) }),

    // Job Completion
    completeJob: (id: string, data: any) => apiFetch<any>(`/crew/jobs/${id}/complete`, { method: 'POST', body: JSON.stringify(data) }),
    getCompletion: (id: string) => apiFetch<any>(`/crew/jobs/${id}/completion`),

    // Profile / Schedule
    getProfile: () => apiFetch<any>('/crew/profile'),
    getSchedule: () => apiFetch<any>('/crew/schedule'),
};
