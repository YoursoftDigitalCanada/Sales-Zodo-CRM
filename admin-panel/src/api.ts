import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.zodo.ca/api/v1/admin';

const api = axios.create({
    baseURL: API_BASE,
    timeout: 15000,
});

// Attach token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('admin_token');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

export default api;

// ── Auth ───────────────────────────────────────────────────────────────
export const adminLogin = (email: string, password: string) =>
    api.post('/auth/login', { email, password });

export const getAdminProfile = () => api.get('/auth/profile');

// ── Dashboard ──────────────────────────────────────────────────────────
export const getDashboardMetrics = () => api.get('/dashboard-metrics');

// ── Tenants ────────────────────────────────────────────────────────────
export const getTenants = (params?: Record<string, any>) =>
    api.get('/tenants', { params });

export const getTenantDetail = (id: string) => api.get(`/tenants/${id}`);

export const suspendTenant = (id: string) => api.put(`/tenants/${id}/suspend`);

export const activateTenant = (id: string) => api.put(`/tenants/${id}/activate`);

export const upgradeTenant = (id: string, data: { planType: string; billingCycle: string; monthlyRate: number }) =>
    api.put(`/tenants/${id}/upgrade`, data);

export const cancelTenant = (id: string) => api.put(`/tenants/${id}/cancel`);

export const deleteTenant = (id: string) => api.delete(`/tenants/${id}`);

// ── Revenue ────────────────────────────────────────────────────────────
export const getRevenue = () => api.get('/revenue');

// ── Subscriptions ──────────────────────────────────────────────────────
export const getSubscriptions = () => api.get('/subscriptions');

// ── System Health ──────────────────────────────────────────────────────
export const getSystemHealth = () => api.get('/system-health');

// ── Audit Logs ─────────────────────────────────────────────────────────
export const getAuditLogs = (params?: Record<string, any>) =>
    api.get('/audit-logs', { params });
