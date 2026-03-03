import { useEffect, useState } from 'react';
import { crewApi } from '../api';
import { Loader2, Clock, Briefcase } from 'lucide-react';

export default function TimeSheetPage() {
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState<'week' | 'month'>('week');

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const data = await crewApi.getTimeEntries(range);
                setEntries(data);
            } catch { } finally { setLoading(false); }
        })();
    }, [range]);

    const totalMinutes = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    const billableMinutes = entries.filter(e => e.billable).reduce((sum, e) => sum + (e.duration || 0), 0);
    const billableHours = (billableMinutes / 60).toFixed(1);

    if (loading) return <div className="loading"><Loader2 size={28} className="spinner" /></div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1>Time Sheet</h1>
                <p>Your logged hours</p>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button className={`btn btn-sm ${range === 'week' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setRange('week')}>This Week</button>
                <button className={`btn btn-sm ${range === 'month' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setRange('month')}>This Month</button>
            </div>

            {/* Summary */}
            <div className="stats-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card">
                    <div className="stat-value">{totalHours}</div>
                    <div className="stat-label">Total Hours</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{billableHours}</div>
                    <div className="stat-label">Billable Hours</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{entries.length}</div>
                    <div className="stat-label">Entries</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{entries.filter(e => e.status === 'APPROVED').length}</div>
                    <div className="stat-label">Approved</div>
                </div>
            </div>

            {/* Entries */}
            {entries.length === 0 ? (
                <div className="empty-state">
                    <Clock />
                    <h3>No Time Entries</h3>
                    <p>Clock in from the dashboard to start logging time</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {entries.map(entry => {
                        const hours = entry.duration ? (entry.duration / 60).toFixed(1) : '—';
                        const start = new Date(entry.startTime);
                        const statusColor = entry.status === 'CLOCKED_IN' ? 'badge-clocked' : entry.status === 'APPROVED' ? 'badge-active' : entry.status === 'REJECTED' ? 'badge-on-hold' : 'badge-planning';
                        return (
                            <div key={entry.id} className="time-entry">
                                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(8,145,178,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {entry.status === 'CLOCKED_IN' ? <Clock size={16} color="#0891B2" /> : <Briefcase size={16} color="#0891B2" />}
                                </div>
                                <div className="time-entry-info">
                                    <div className="time-entry-project">{entry.project?.name || 'General'}</div>
                                    <div className="time-entry-detail">
                                        {start.toLocaleDateString()} · {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {entry.phase && ` · ${entry.phase}`}
                                    </div>
                                    <span className={`badge ${statusColor}`} style={{ marginTop: 4 }}>{entry.status?.replace('_', ' ')}</span>
                                </div>
                                <div className="time-entry-hours">{hours}h</div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
