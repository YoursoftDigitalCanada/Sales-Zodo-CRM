import { useEffect, useState } from 'react';
import { getSystemHealth } from './api';
import { Server, Database, Cpu, HardDrive, Clock, Activity, Loader2 } from 'lucide-react';

interface Health {
    server: { uptime: string; platform: string; hostname: string; nodeVersion: string; cpuCores: number; loadAverage: Record<string, number> };
    memory: { total: string; used: string; free: string; usagePercent: number };
    database: { latencyMs: number; sizeMB: number; status: string };
    apiPerformance: { responseTimeMs: number; status: string };
    records: { totalTenants: number; totalUsers: number; totalLeads: number; totalClients: number; totalInvoices: number; auditLogs: number };
    errors: { last24Hours: number };
}

export default function SystemHealthPage() {
    const [data, setData] = useState<Health | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSystemHealth().then(r => setData(r.data.data)).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 size={32} className="animate-spin" style={{ color: '#06b6d4' }} /></div>;
    if (!data) return <p style={{ color: '#ef4444', padding: '2rem' }}>Failed to load</p>;

    const statusColor = (s: string) => s === 'healthy' || s === 'excellent' ? '#10b981' : s === 'good' ? '#f59e0b' : '#ef4444';

    return (
        <div>
            <div className="page-header"><div><h1 className="page-title">System Health</h1><p className="page-subtitle">Platform infrastructure monitoring</p></div></div>

            {/* Status bar */}
            <div className="card" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor(data.database.status) }} />
                    <span style={{ fontSize: '0.875rem' }}>Database: <strong style={{ color: statusColor(data.database.status) }}>{data.database.status}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor(data.apiPerformance.status) }} />
                    <span style={{ fontSize: '0.875rem' }}>API: <strong style={{ color: statusColor(data.apiPerformance.status) }}>{data.apiPerformance.status}</strong></span>
                </div>
                <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Uptime: <strong style={{ color: '#f1f5f9' }}>{data.server.uptime}</strong></span>
            </div>

            <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
                <div className="kpi-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <div className="kpi-label">Server Uptime</div>
                            <div className="kpi-value" style={{ fontSize: '1.25rem' }}>{data.server.uptime}</div>
                        </div>
                        <div className="kpi-icon" style={{ background: '#06b6d415' }}><Clock size={20} style={{ color: '#06b6d4' }} /></div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <div className="kpi-label">DB Response Time</div>
                            <div className="kpi-value">{data.database.latencyMs}ms</div>
                        </div>
                        <div className="kpi-icon" style={{ background: '#10b98115' }}><Database size={20} style={{ color: '#10b981' }} /></div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <div className="kpi-label">Database Size</div>
                            <div className="kpi-value">{data.database.sizeMB} MB</div>
                        </div>
                        <div className="kpi-icon" style={{ background: '#f59e0b15' }}><HardDrive size={20} style={{ color: '#f59e0b' }} /></div>
                    </div>
                </div>
            </div>

            <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                {/* Server Info */}
                <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Server size={18} style={{ color: '#06b6d4' }} /> Server Info
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {[
                            ['Platform', data.server.platform],
                            ['Hostname', data.server.hostname],
                            ['Node.js', data.server.nodeVersion],
                            ['CPU Cores', data.server.cpuCores],
                            ['Load (1m)', data.server.loadAverage['1min']],
                            ['Load (5m)', data.server.loadAverage['5min']],
                        ].map(([k, v], i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #33415540', paddingBottom: '0.5rem' }}>
                                <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{k}</span>
                                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{String(v)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Memory */}
                <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Cpu size={18} style={{ color: '#8b5cf6' }} /> Memory Usage
                    </h3>
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{data.memory.used} / {data.memory.total}</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: data.memory.usagePercent > 80 ? '#ef4444' : '#10b981' }}>{data.memory.usagePercent}%</span>
                        </div>
                        <div style={{ height: 8, background: '#0f172a', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', borderRadius: 4,
                                width: `${data.memory.usagePercent}%`,
                                background: data.memory.usagePercent > 80 ? '#ef4444' : data.memory.usagePercent > 60 ? '#f59e0b' : '#10b981',
                                transition: 'width 1s ease',
                            }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                        {[
                            ['Total', data.memory.total],
                            ['Used', data.memory.used],
                            ['Free', data.memory.free],
                        ].map(([k, v], i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{k}</span>
                                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{v}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Record Counts */}
            <div className="card">
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={18} style={{ color: '#10b981' }} /> Platform Records
                </h3>
                <div className="grid-3">
                    {[
                        { label: 'Tenants', value: data.records.totalTenants, color: '#06b6d4' },
                        { label: 'Users', value: data.records.totalUsers, color: '#8b5cf6' },
                        { label: 'Leads', value: data.records.totalLeads, color: '#10b981' },
                        { label: 'Clients', value: data.records.totalClients, color: '#f59e0b' },
                        { label: 'Invoices', value: data.records.totalInvoices, color: '#ec4899' },
                        { label: 'Audit Logs', value: data.records.auditLogs, color: '#94a3b8' },
                    ].map((r, i) => (
                        <div key={i} style={{
                            textAlign: 'center', padding: '1rem',
                            background: `${r.color}08`, borderRadius: '8px', border: `1px solid ${r.color}15`,
                        }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: r.color }}>{r.value.toLocaleString()}</div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>{r.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
