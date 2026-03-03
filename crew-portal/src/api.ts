const API_BASE = import.meta.env.VITE_API_URL || 'https://api.zodo.ca/api/v1';

function getToken(): string | null {
    return localStorage.getItem('crew_token');
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    if (res.status === 401) {
        localStorage.removeItem('crew_token');
        localStorage.removeItem('crew_user');
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Request failed');
    return json.data !== undefined ? json.data : json;
}

// ── Auth ────────────────────────────────────────────────────────────
export async function login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Login failed');

    const data = json.data || json;
    localStorage.setItem('crew_token', data.tokens.accessToken);
    localStorage.setItem('crew_user', JSON.stringify({
        id: data.user.id,
        name: `${data.user.firstName} ${data.user.lastName}`,
        email: data.user.email,
        avatar: data.user.avatar,
        employeeId: data.employee?.id,
        role: data.employee?.role?.name,
        tenantName: data.tenant?.name,
    }));
    return data;
}

export function logout() {
    localStorage.removeItem('crew_token');
    localStorage.removeItem('crew_user');
    window.location.href = '/login';
}

export function getCurrentUser() {
    const raw = localStorage.getItem('crew_user');
    return raw ? JSON.parse(raw) : null;
}

export function isAuthenticated(): boolean {
    return !!getToken();
}

// ── Crew API ────────────────────────────────────────────────────────
export const crewApi = {
    getDashboard: () => apiFetch<any>('/crew/dashboard'),
    getJobs: (status?: string) => apiFetch<any[]>(`/crew/jobs${status ? `?status=${status}` : ''}`),
    getJobDetail: (id: string) => apiFetch<any>(`/crew/jobs/${id}`),
    updateJobStatus: (id: string, data: any) => apiFetch<any>(`/crew/jobs/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
    addJobNote: (id: string, data: any) => apiFetch<any>(`/crew/jobs/${id}/notes`, { method: 'POST', body: JSON.stringify(data) }),
    clockIn: (data: any) => apiFetch<any>('/crew/time/clock-in', { method: 'POST', body: JSON.stringify(data) }),
    clockOut: (data: any) => apiFetch<any>('/crew/time/clock-out', { method: 'POST', body: JSON.stringify(data) }),
    getTimeEntries: (range: 'week' | 'month' = 'week') => apiFetch<any[]>(`/crew/time/entries?range=${range}`),
    getProfile: () => apiFetch<any>('/crew/profile'),
    getSchedule: () => apiFetch<any>('/crew/schedule'),
};
