import { useEffect, useState } from 'react';
import { getRevenue } from './api';
import { DollarSign, TrendingUp, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
const fmt = (n: number) => n >= 1_000 ? `$${(n / 1_000).toFixed(1)}K` : `$${n.toFixed(0)}`;

interface RevenueData {
    totalRevenue: number;
    revenueThisMonth: number;
    revenueThisYear: number;
    mrr: number;
    arr: number;
    revenueByPlan: Record<string, number>;
    revenueByBillingCycle: Record<string, number>;
    topPayingTenants: { name: string; revenue: number }[];
}

export default function RevenuePage() {
    const [data, setData] = useState<RevenueData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getRevenue().then(r => setData(r.data.data)).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 size={32} className="animate-spin" style={{ color: '#06b6d4' }} /></div>;
    if (!data) return <p style={{ color: '#ef4444', padding: '2rem' }}>Failed to load revenue data</p>;

    const planData = Object.entries(data.revenueByPlan).map(([name, value]) => ({ name, value }));
    const cycleData = Object.entries(data.revenueByBillingCycle).map(([name, value]) => ({ name, value }));

    return (
        <div>
            <div className="page-header"><div><h1 className="page-title">Revenue Intelligence</h1><p className="page-subtitle">Financial analytics & insights</p></div></div>

            <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
                {[
                    { label: 'Total Revenue', value: fmt(data.totalRevenue), color: '#06b6d4', icon: DollarSign },
                    { label: 'This Month', value: fmt(data.revenueThisMonth), color: '#10b981', icon: TrendingUp },
                    { label: 'MRR', value: fmt(data.mrr), color: '#f59e0b', icon: DollarSign },
                    { label: 'ARR', value: fmt(data.arr), color: '#8b5cf6', icon: TrendingUp },
                ].map((k, i) => (
                    <div key={i} className="kpi-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <div className="kpi-label">{k.label}</div>
                                <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
                            </div>
                            <div className="kpi-icon" style={{ background: `${k.color}15` }}><k.icon size={20} style={{ color: k.color }} /></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Revenue by Plan</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={planData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" /><YAxis />
                            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                            <Bar dataKey="value" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Billing Cycle</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={cycleData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" label={({ name, value }) => `${name}: $${value}`}>
                                {cycleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Tenants */}
            <div className="card">
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Top Paying Tenants</h3>
                {data.topPayingTenants.length === 0 ? <p style={{ color: '#94a3b8' }}>No data yet</p> : (
                    <table>
                        <thead><tr><th>#</th><th>Tenant</th><th>Revenue</th></tr></thead>
                        <tbody>
                            {data.topPayingTenants.map((t, i) => (
                                <tr key={i}><td style={{ fontWeight: 600, color: '#06b6d4' }}>{i + 1}</td><td>{t.name}</td><td style={{ fontWeight: 600 }}>${t.revenue.toLocaleString()}</td></tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
