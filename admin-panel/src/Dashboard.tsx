import { useEffect, useState } from 'react';
import { getDashboardMetrics } from './api';
import {
    Building2, Users, CreditCard, TrendingUp, DollarSign,
    UserPlus, Activity, Clock, Loader2, AlertCircle
} from 'lucide-react';
import {
    Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

interface Metrics {
    tenants: { total: number; active: number; trial: number; suspended: number; cancelled: number };
    subscriptions: { activeMonthly: number; activeYearly: number; expired: number; total: number };
    users: { total: number; activeInLast30Days: number };
    newSignupsLast30Days: number;
    revenue: { mrr: number; arr: number; totalRevenue: number };
}

const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const fmt = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
};

export default function Dashboard() {
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        getDashboardMetrics()
            .then((res) => setMetrics(res.data.data))
            .catch(() => setError('Failed to load metrics'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: '#06b6d4' }} />
        </div>
    );

    if (error || !metrics) return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', padding: '2rem' }}>
            <AlertCircle size={20} /> {error || 'No data'}
        </div>
    );

    const kpis = [
        { label: 'Total Tenants', value: metrics.tenants.total, icon: Building2, color: '#06b6d4' },
        { label: 'Active Tenants', value: metrics.tenants.active, icon: Activity, color: '#10b981' },
        { label: 'Trial Accounts', value: metrics.tenants.trial, icon: Clock, color: '#f59e0b' },
        { label: 'Suspended', value: metrics.tenants.suspended, icon: AlertCircle, color: '#ef4444' },
        { label: 'Total Users', value: metrics.users.total, icon: Users, color: '#8b5cf6' },
        { label: 'Active Users (30d)', value: metrics.users.activeInLast30Days, icon: UserPlus, color: '#06b6d4' },
        { label: 'New Signups (30d)', value: metrics.newSignupsLast30Days, icon: TrendingUp, color: '#10b981' },
        { label: 'Monthly Subs', value: metrics.subscriptions.activeMonthly, icon: CreditCard, color: '#f59e0b' },
        { label: 'Yearly Subs', value: metrics.subscriptions.activeYearly, icon: CreditCard, color: '#8b5cf6' },
        { label: 'Expired Subs', value: metrics.subscriptions.expired, icon: AlertCircle, color: '#94a3b8' },
        { label: 'MRR', value: fmt(metrics.revenue.mrr), icon: DollarSign, color: '#10b981', raw: true },
        { label: 'Total Revenue', value: fmt(metrics.revenue.totalRevenue), icon: DollarSign, color: '#06b6d4', raw: true },
    ];

    const pieData = [
        { name: 'Active', value: metrics.tenants.active },
        { name: 'Trial', value: metrics.tenants.trial },
        { name: 'Suspended', value: metrics.tenants.suspended },
        { name: 'Cancelled', value: metrics.tenants.cancelled },
    ].filter((d) => d.value > 0);

    const subData = [
        { name: 'Monthly', value: metrics.subscriptions.activeMonthly },
        { name: 'Yearly', value: metrics.subscriptions.activeYearly },
        { name: 'Expired', value: metrics.subscriptions.expired },
    ].filter((d) => d.value > 0);

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Platform overview — real-time metrics</p>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
                {kpis.map((k, i) => (
                    <div key={i} className="kpi-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div className="kpi-label">{k.label}</div>
                                <div className="kpi-value">{(k as any).raw ? k.value : k.value.toLocaleString()}</div>
                            </div>
                            <div className="kpi-icon" style={{ background: `${k.color}15` }}>
                                <k.icon size={20} style={{ color: k.color }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Tenant Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Subscription Breakdown</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={subData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                                {subData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Revenue Bar */}
            <div className="card">
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Revenue Overview</h3>
                <div className="grid-3">
                    {[
                        { label: 'MRR', value: fmt(metrics.revenue.mrr), color: '#10b981' },
                        { label: 'ARR', value: fmt(metrics.revenue.arr), color: '#8b5cf6' },
                        { label: 'Total Revenue', value: fmt(metrics.revenue.totalRevenue), color: '#06b6d4' },
                    ].map((r, i) => (
                        <div key={i} style={{
                            textAlign: 'center', padding: '1.5rem',
                            background: `${r.color}08`, borderRadius: '10px', border: `1px solid ${r.color}20`,
                        }}>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.25rem' }}>{r.label}</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: r.color }}>{r.value}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
