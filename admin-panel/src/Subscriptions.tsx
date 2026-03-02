import { useEffect, useState } from 'react';
import { getSubscriptions } from './api';
import { CreditCard, TrendingDown, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface SubData {
    total: number; active: number; trial: number; cancelled: number; expired: number;
    upcomingRenewals7Days: number; upcomingRenewals30Days: number; failedPayments: number;
    trialToPaidConversionRate: number; churnRate: number;
    planDistribution: { plan: string; count: number }[];
}

export default function SubscriptionsPage() {
    const [data, setData] = useState<SubData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSubscriptions().then(r => setData(r.data.data)).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 size={32} className="animate-spin" style={{ color: '#06b6d4' }} /></div>;
    if (!data) return <p style={{ color: '#ef4444', padding: '2rem' }}>Failed to load data</p>;

    const distData = data.planDistribution.map(p => ({ name: p.plan, value: p.count }));

    return (
        <div>
            <div className="page-header"><div><h1 className="page-title">Subscription Analytics</h1><p className="page-subtitle">Plan distribution, churn, and conversion metrics</p></div></div>

            <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
                {[
                    { label: 'Active', value: data.active, icon: CreditCard, color: '#10b981' },
                    { label: 'Trial', value: data.trial, icon: CreditCard, color: '#f59e0b' },
                    { label: 'Cancelled', value: data.cancelled, icon: TrendingDown, color: '#ef4444' },
                    { label: 'Expired', value: data.expired, icon: AlertTriangle, color: '#94a3b8' },
                    { label: 'Renewals (7d)', value: data.upcomingRenewals7Days, icon: RefreshCw, color: '#06b6d4' },
                    { label: 'Renewals (30d)', value: data.upcomingRenewals30Days, icon: RefreshCw, color: '#8b5cf6' },
                    { label: 'Conversion Rate', value: `${data.trialToPaidConversionRate}%`, icon: TrendingDown, color: '#10b981', raw: true },
                    { label: 'Churn Rate', value: `${data.churnRate}%`, icon: TrendingDown, color: '#ef4444', raw: true },
                ].map((k, i) => (
                    <div key={i} className="kpi-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <div className="kpi-label">{k.label}</div>
                                <div className="kpi-value">{(k as any).raw ? k.value : (k.value as number).toLocaleString()}</div>
                            </div>
                            <div className="kpi-icon" style={{ background: `${k.color}15` }}><k.icon size={20} style={{ color: k.color }} /></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid-2">
                <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Plan Distribution</h3>
                    {distData.length === 0 ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No subscriptions yet</p> : (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie data={distData} cx="50%" cy="50%" outerRadius={100} innerRadius={55} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                                    {distData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Failed Payments</h3>
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        height: '200px', gap: '0.5rem',
                    }}>
                        <div style={{ fontSize: '3rem', fontWeight: 700, color: data.failedPayments > 0 ? '#ef4444' : '#10b981' }}>
                            {data.failedPayments}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                            {data.failedPayments === 0 ? 'All payments successful ✓' : 'Payments need attention'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
