import { useEffect, useState } from 'react';
import { getTenants, suspendTenant, activateTenant, deleteTenant } from './api';
import { Search, Loader2, Ban, CheckCircle, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    status: string;
    subscriptionTier: string;
    userCount: number;
    subscription: {
        planType: string;
        billingCycle: string;
        status: string;
        startDate: string;
        nextBillingDate: string | null;
        monthlyRate: number;
        totalPaid: number;
    } | null;
    createdAt: string;
}

export default function TenantsPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchTenants = () => {
        setLoading(true);
        const params: Record<string, any> = { page, limit: 20 };
        if (search) params.search = search;
        if (statusFilter) params.status = statusFilter;
        getTenants(params)
            .then((res) => {
                setTenants(res.data.data.data);
                setTotalPages(res.data.data.totalPages);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchTenants(); }, [page, statusFilter]);

    const handleSearch = () => { setPage(1); fetchTenants(); };

    const handleAction = async (id: string, action: 'suspend' | 'activate' | 'delete') => {
        if (action === 'delete' && !confirm('Are you sure? This will mark the tenant as cancelled.')) return;
        try {
            if (action === 'suspend') await suspendTenant(id);
            if (action === 'activate') await activateTenant(id);
            if (action === 'delete') await deleteTenant(id);
            fetchTenants();
        } catch { }
    };

    const statusBadge = (status: string) => {
        const cls = status === 'ACTIVE' ? 'badge-active' : status === 'TRIAL' ? 'badge-trial'
            : status === 'SUSPENDED' ? 'badge-suspended' : status === 'CANCELLED' ? 'badge-cancelled' : 'badge-expired';
        return <span className={`badge ${cls}`}>{status}</span>;
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Tenant Management</h1>
                    <p className="page-subtitle">Manage all platform tenants</p>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        placeholder="Search tenants..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        style={{ paddingLeft: '36px' }}
                    />
                </div>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ width: '160px' }}>
                    <option value="">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="TRIAL">Trial</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
                <button className="btn btn-primary" onClick={handleSearch}>Search</button>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center' }}>
                        <Loader2 size={24} className="animate-spin" style={{ color: '#06b6d4', margin: '0 auto' }} />
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Company</th>
                                    <th>Status</th>
                                    <th>Plan</th>
                                    <th>Billing</th>
                                    <th>Users</th>
                                    <th>Revenue</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenants.length === 0 ? (
                                    <tr><td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>No tenants found</td></tr>
                                ) : tenants.map((t) => (
                                    <tr key={t.id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{t.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t.slug}</div>
                                        </td>
                                        <td>{statusBadge(t.status)}</td>
                                        <td>
                                            <span style={{ color: '#06b6d4', fontWeight: 500 }}>
                                                {t.subscription?.planType || t.subscriptionTier || 'Free'}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.8rem' }}>{t.subscription?.billingCycle || '—'}</td>
                                        <td>{t.userCount}</td>
                                        <td style={{ fontWeight: 500 }}>${(t.subscription?.totalPaid || 0).toLocaleString()}</td>
                                        <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {t.status === 'ACTIVE' || t.status === 'TRIAL' ? (
                                                    <button className="btn btn-ghost" title="Suspend" onClick={() => handleAction(t.id, 'suspend')} style={{ padding: '4px 8px' }}>
                                                        <Ban size={14} />
                                                    </button>
                                                ) : (
                                                    <button className="btn btn-ghost" title="Activate" onClick={() => handleAction(t.id, 'activate')} style={{ padding: '4px 8px' }}>
                                                        <CheckCircle size={14} style={{ color: '#10b981' }} />
                                                    </button>
                                                )}
                                                <button className="btn btn-ghost" title="Delete" onClick={() => handleAction(t.id, 'delete')} style={{ padding: '4px 8px' }}>
                                                    <Trash2 size={14} style={{ color: '#ef4444' }} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1rem', borderTop: '1px solid #334155' }}>
                        <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ padding: '6px 10px' }}>
                            <ChevronLeft size={16} />
                        </button>
                        <span style={{ padding: '6px 12px', fontSize: '0.875rem', color: '#94a3b8' }}>
                            Page {page} of {totalPages}
                        </span>
                        <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)} style={{ padding: '6px 10px' }}>
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
