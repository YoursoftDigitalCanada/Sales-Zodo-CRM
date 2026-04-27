import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, CalendarDays, CreditCard, Loader2, Mail, MapPin, Phone, Users, Wallet, WandSparkles } from 'lucide-react';
import { getTenantDetail } from './api';

interface TenantDetailData {
    id: string;
    name: string;
    slug: string;
    domain: string | null;
    logo: string | null;
    status: string;
    subscriptionTier: string;
    fileStorageQuota: number;
    fileStorageUsed: number;
    emailStorageQuota: number;
    emailStorageUsed: number;
    onboardingCompleted: boolean;
    createdAt: string;
    updatedAt: string;
    company: {
        companyName: string;
        email: string;
        phone: string;
        address: string;
        taxId: string;
        domain: string;
        logoUrl: string | null;
    };
    subscription: {
        id: string;
        planType: string;
        billingCycle: string;
        status: string;
        startDate: string;
        nextBillingDate: string | null;
        cancelledAt: string | null;
        monthlyRate: number;
        totalPaid: number;
        failedPayments: number;
    } | null;
    counts: {
        users: number;
        leads: number;
        clients: number;
        projects: number;
        invoices: number;
        roofEstimates: number;
        quotes: number;
        files: number;
    };
    wallet: {
        id: string;
        balance: number;
        currency: string;
        totalRecharged: number;
        totalAiSpend: number;
        transactionCount: number;
        recentTransactions: Array<{
            id: string;
            type: string;
            amount: number;
            description: string;
            balanceAfter: number;
            referenceType: string | null;
            referenceId: string | null;
            createdBy: string | null;
            createdAt: string;
        }>;
    } | null;
    usage: {
        aiRoofEstimatorRuns: number;
        roofEstimateRecords: number;
        fileStorageUsedBytes: number;
        fileStorageQuotaBytes: number;
        emailStorageUsedBytes: number;
        emailStorageQuotaBytes: number;
    };
    users: Array<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        fullName: string;
        phone: string | null;
        avatar: string | null;
        status: string;
        emailVerified: boolean;
        lastLoginAt: string | null;
        createdAt: string;
        employee: {
            id: string;
            department: string | null;
            position: string | null;
            employmentStatus: string;
            isActive: boolean;
            role: {
                id: string;
                name: string;
            };
        } | null;
    }>;
}

function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / (1024 ** index);
    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatCurrency(value: number, currency = 'CAD') {
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(value || 0);
}

function formatDate(value: string | null | undefined) {
    if (!value) return '—';
    return new Date(value).toLocaleString();
}

function getAssetUrl(path: string | null | undefined) {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    const apiBase = import.meta.env.VITE_API_URL || 'https://api.zodo.ca/api/v1/admin';
    const origin = apiBase.replace(/\/api\/v1\/admin\/?$/, '');
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

function StatCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
    return (
        <div className="kpi-card">
            <div className="kpi-label">{label}</div>
            <div className="kpi-value" style={{ fontSize: '1.35rem' }}>{value}</div>
            {helper ? <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{helper}</div> : null}
        </div>
    );
}

export default function TenantDetailPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [tenant, setTenant] = useState<TenantDetailData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        getTenantDetail(id)
            .then((res) => setTenant(res.data.data))
            .catch(() => setTenant(null))
            .finally(() => setLoading(false));
    }, [id]);

    const logoUrl = useMemo(() => getAssetUrl(tenant?.company.logoUrl || tenant?.logo), [tenant]);

    if (loading) {
        return (
            <div className="card" style={{ minHeight: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={24} className="animate-spin" style={{ color: '#06b6d4' }} />
            </div>
        );
    }

    if (!tenant) {
        return (
            <div className="card">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Tenant not found</div>
                    <button className="btn btn-ghost" onClick={() => navigate('/tenants')} style={{ width: 'fit-content' }}>
                        <ArrowLeft size={16} />
                        Back to tenants
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="page-header" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost" onClick={() => navigate('/tenants')}>
                        <ArrowLeft size={16} />
                        Back
                    </button>
                    <div>
                        <h1 className="page-title">{tenant.name}</h1>
                        <p className="page-subtitle">{tenant.slug} • {tenant.status} • {tenant.subscription?.planType || tenant.subscriptionTier}</p>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', minHeight: '220px' }}>
                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt={tenant.name}
                            style={{ width: 92, height: 92, borderRadius: 16, objectFit: 'cover', border: '1px solid var(--border)', background: '#0f172a' }}
                        />
                    ) : (
                        <div style={{ width: 92, height: 92, borderRadius: 16, border: '1px solid var(--border)', background: 'rgba(6,182,212,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Building2 size={32} color="#06b6d4" />
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                            <div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{tenant.company.companyName || tenant.name}</div>
                                <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{tenant.domain || tenant.company.domain || 'No domain configured'}</div>
                            </div>
                            <span className={`badge ${
                                tenant.status === 'ACTIVE' ? 'badge-active'
                                    : tenant.status === 'TRIAL' ? 'badge-trial'
                                        : tenant.status === 'SUSPENDED' ? 'badge-suspended'
                                            : 'badge-cancelled'
                            }`}>
                                {tenant.status}
                            </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', color: '#cbd5e1' }}>
                                <Mail size={15} style={{ marginTop: 2, color: '#06b6d4' }} />
                                <span>{tenant.company.email || 'No company email'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', color: '#cbd5e1' }}>
                                <Phone size={15} style={{ marginTop: 2, color: '#06b6d4' }} />
                                <span>{tenant.company.phone || 'No phone'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', color: '#cbd5e1', gridColumn: '1 / -1' }}>
                                <MapPin size={15} style={{ marginTop: 2, color: '#06b6d4' }} />
                                <span>{tenant.company.address || 'No address configured'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', color: '#cbd5e1' }}>
                                <CalendarDays size={15} style={{ marginTop: 2, color: '#06b6d4' }} />
                                <span>Created {formatDate(tenant.createdAt)}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', color: '#cbd5e1' }}>
                                <CreditCard size={15} style={{ marginTop: 2, color: '#06b6d4' }} />
                                <span>{tenant.subscription?.billingCycle || 'No billing cycle'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ display: 'grid', gap: '0.9rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>Subscription & Wallet</div>
                    <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                        <StatCard label="Plan" value={tenant.subscription?.planType || tenant.subscriptionTier || 'FREE'} helper={tenant.subscription?.status || 'No active subscription'} />
                        <StatCard label="Users" value={String(tenant.counts.users)} helper={`${tenant.users.filter((user) => user.emailVerified).length} verified`} />
                        <StatCard label="Total Paid" value={formatCurrency(tenant.subscription?.totalPaid || 0)} helper={`Rate ${formatCurrency(tenant.subscription?.monthlyRate || 0)}`} />
                        <StatCard label="Wallet" value={formatCurrency(tenant.wallet?.balance || 0, tenant.wallet?.currency || 'CAD')} helper={`${tenant.wallet?.currency || 'CAD'} balance`} />
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
                <StatCard label="AI Roof Estimator Uses" value={String(tenant.usage.aiRoofEstimatorRuns)} helper={`${tenant.usage.roofEstimateRecords} roof estimate records`} />
                <StatCard label="Storage Used" value={formatBytes(tenant.usage.fileStorageUsedBytes)} helper={`of ${formatBytes(tenant.usage.fileStorageQuotaBytes)}`} />
                <StatCard label="Email Storage" value={formatBytes(tenant.usage.emailStorageUsedBytes)} helper={`of ${formatBytes(tenant.usage.emailStorageQuotaBytes)}`} />
                <StatCard label="Total Recharge" value={formatCurrency(tenant.wallet?.totalRecharged || 0, tenant.wallet?.currency || 'CAD')} helper={`AI spend ${formatCurrency(tenant.wallet?.totalAiSpend || 0, tenant.wallet?.currency || 'CAD')}`} />
            </div>

            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                        <Users size={18} color="#06b6d4" />
                        <div style={{ fontWeight: 700 }}>Users & Emails</div>
                    </div>
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {tenant.users.map((user) => (
                            <div key={user.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '0.9rem', background: 'rgba(15,23,42,0.35)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{user.fullName || user.email}</div>
                                        <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{user.email}</div>
                                    </div>
                                    <span className={`badge ${user.status === 'ACTIVE' ? 'badge-active' : 'badge-expired'}`}>
                                        {user.status}
                                    </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem', marginTop: '0.8rem', fontSize: '0.82rem', color: '#cbd5e1' }}>
                                    <div>Verified: {user.emailVerified ? 'Yes' : 'No'}</div>
                                    <div>Last login: {formatDate(user.lastLoginAt)}</div>
                                    <div>Role: {user.employee?.role.name || 'No role'}</div>
                                    <div>Position: {user.employee?.position || 'No position'}</div>
                                    <div>Department: {user.employee?.department || 'No department'}</div>
                                    <div>Phone: {user.phone || 'No phone'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                            <WandSparkles size={18} color="#06b6d4" />
                            <div style={{ fontWeight: 700 }}>Usage Snapshot</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.9rem' }}>
                            <StatCard label="Leads" value={String(tenant.counts.leads)} />
                            <StatCard label="Clients" value={String(tenant.counts.clients)} />
                            <StatCard label="Projects" value={String(tenant.counts.projects)} />
                            <StatCard label="Invoices" value={String(tenant.counts.invoices)} />
                            <StatCard label="Quotes" value={String(tenant.counts.quotes)} />
                            <StatCard label="Files" value={String(tenant.counts.files)} />
                        </div>
                    </div>

                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                            <Wallet size={18} color="#06b6d4" />
                            <div style={{ fontWeight: 700 }}>Recent Recharges & Charges</div>
                        </div>
                        <div style={{ display: 'grid', gap: '0.65rem' }}>
                            {tenant.wallet?.recentTransactions?.length ? tenant.wallet.recentTransactions.map((tx) => (
                                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid rgba(51,65,85,0.45)', paddingBottom: '0.65rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{tx.description}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formatDate(tx.createdAt)}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: tx.type === 'credit' ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                                            {tx.type === 'credit' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount), tenant.wallet?.currency || 'CAD')}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                            Balance {formatCurrency(tx.balanceAfter, tenant.wallet?.currency || 'CAD')}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No wallet transactions yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                Tenant ID: <Link to={`/tenants/${tenant.id}`} style={{ color: '#67e8f9' }}>{tenant.id}</Link>
            </div>
        </div>
    );
}
