import { useEffect, useState } from 'react';
import { crewApi } from '../api';
import { Loader2 } from 'lucide-react';

export default function StatsPage() {
    const [stats, setStats] = useState<any>(null);
    const [weekly, setWeekly] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => { try { setLoading(true); const [s, w] = await Promise.all([crewApi.getStats(), crewApi.getWeeklySummary()]); setStats(s); setWeekly(w); } catch { } finally { setLoading(false); } })();
    }, []);

    if (loading) return <div className="loading"><Loader2 size={28} className="spinner" /></div>;
    if (!stats) return null;

    return (
        <div className="page">
            <div className="page-header"><h1>My Performance</h1><p>Personal stats & insights</p></div>

            <div className="stats-grid" style={{ marginBottom: 16 }}>
                <div className="stat-card"><div className="stat-value">{stats.hoursThisWeek}</div><div className="stat-label">Hrs This Week</div></div>
                <div className="stat-card"><div className="stat-value">{stats.hoursThisMonth}</div><div className="stat-label">Hrs This Month</div></div>
                <div className="stat-card"><div className="stat-value">{stats.jobsCompleted}</div><div className="stat-label">Jobs Done</div></div>
                <div className="stat-card"><div className="stat-value">{stats.taskCompletion}</div><div className="stat-label">Task Rate</div></div>
            </div>

            <div className="stats-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card"><div className="stat-value" style={{ color: stats.overtimeHours > 0 ? '#F59E0B' : '#10B981' }}>{stats.overtimeHours}</div><div className="stat-label">Overtime Hrs</div></div>
                <div className="stat-card"><div className="stat-value">{stats.checklistsCompleted}</div><div className="stat-label">Checklists</div></div>
                <div className="stat-card"><div className="stat-value">{stats.notesSubmitted}</div><div className="stat-label">Notes</div></div>
                <div className="stat-card"><div className="stat-value">{stats.incidentsReported}</div><div className="stat-label">Incidents</div></div>
            </div>

            {/* Weekly Bar Chart */}
            {weekly?.byDay && weekly.byDay.length > 0 && (
                <div className="card">
                    <div className="card-header"><h3 className="card-title">This Week</h3></div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, padding: '0 8px' }}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => {
                            const found = weekly.byDay.find((d: any) => d.day === day);
                            const hours = found?.hours || 0;
                            const maxH = Math.max(...weekly.byDay.map((d: any) => d.hours), 1);
                            const pct = (hours / maxH) * 100;
                            return (
                                <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                    <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>{hours > 0 ? hours : ''}</span>
                                    <div style={{ width: '100%', height: `${Math.max(pct, 4)}%`, background: hours > 0 ? 'linear-gradient(180deg, #0891B2, #06B6D4)' : '#334155', borderRadius: 4, minHeight: 4, transition: 'height 0.5s' }} />
                                    <span style={{ fontSize: 9, color: '#64748B' }}>{day}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
