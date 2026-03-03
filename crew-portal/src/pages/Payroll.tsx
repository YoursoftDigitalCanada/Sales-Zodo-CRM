import { useEffect, useState } from 'react';
import { crewApi } from '../api';
import { Loader2, DollarSign, TrendingUp, Clock, Calendar, Download, ChevronRight } from 'lucide-react';

export default function PayrollPage() {
    const [stats, setStats] = useState<any>(null);
    const [timeEntries, setTimeEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPayrollData = async () => {
            try {
                const [statsData, entries] = await Promise.allSettled([
                    crewApi.getStats(),
                    crewApi.getTimeEntries('month'),
                ]);
                if (statsData.status === 'fulfilled') setStats(statsData.value);
                if (entries.status === 'fulfilled') setTimeEntries(entries.value || []);
            } catch (err) {
                console.error('Failed to fetch payroll data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPayrollData();
    }, []);

    // Calculate hours from time entries
    const totalHours = timeEntries.reduce((acc, e) => acc + (e.totalHours || e.hours || 0), 0);
    const regularHours = Math.min(totalHours, 80); // Assuming bi-weekly 80h regular
    const overtimeHours = Math.max(0, totalHours - 80);

    if (loading) return <div className="loading"><Loader2 size={28} className="spinner" /></div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1>Payroll</h1>
                <p>View your hours and earnings summary</p>
            </div>

            {/* Hours Summary Cards */}
            <div className="stats-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                        <Clock size={16} style={{ color: '#0891B2' }} />
                    </div>
                    <div className="stat-value">{totalHours.toFixed(1)}</div>
                    <div className="stat-label">Total Hours</div>
                </div>
                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                        <Calendar size={16} style={{ color: '#059669' }} />
                    </div>
                    <div className="stat-value">{regularHours.toFixed(1)}</div>
                    <div className="stat-label">Regular Hours</div>
                </div>
                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                        <TrendingUp size={16} style={{ color: '#D97706' }} />
                    </div>
                    <div className="stat-value">{overtimeHours.toFixed(1)}</div>
                    <div className="stat-label">Overtime</div>
                </div>
                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                        <DollarSign size={16} style={{ color: '#7C3AED' }} />
                    </div>
                    <div className="stat-value">{timeEntries.length}</div>
                    <div className="stat-label">Time Entries</div>
                </div>
            </div>

            {/* Current Period */}
            <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header">
                    <h3 className="card-title">Current Period</h3>
                    <span style={{
                        background: 'rgba(8, 145, 178, 0.08)', color: '#0891B2',
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600
                    }}>
                        This Month
                    </span>
                </div>
                <div className="detail-section" style={{ margin: 0 }}>
                    <div className="detail-row">
                        <span className="detail-label">Regular Hours</span>
                        <span className="detail-value">{regularHours.toFixed(1)} hrs</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Overtime Hours</span>
                        <span className="detail-value" style={{ color: overtimeHours > 0 ? '#D97706' : undefined }}>
                            {overtimeHours.toFixed(1)} hrs
                        </span>
                    </div>
                    <div className="detail-row" style={{ borderTop: '1px solid #E2E8F0', paddingTop: 8, marginTop: 4 }}>
                        <span className="detail-label" style={{ fontWeight: 600, color: '#0F172A' }}>Total Hours</span>
                        <span className="detail-value" style={{ fontWeight: 700, color: '#0891B2' }}>
                            {totalHours.toFixed(1)} hrs
                        </span>
                    </div>
                </div>
            </div>

            {/* Recent Time Entries */}
            <div style={{ marginBottom: 16 }}>
                <div className="card-header">
                    <h3 className="card-title">Recent Time Entries</h3>
                </div>
                {timeEntries.length === 0 ? (
                    <div className="empty-state">
                        <DollarSign />
                        <h3>No Entries This Month</h3>
                        <p>Your time entries will appear here</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {timeEntries.slice(0, 15).map((entry: any, i: number) => (
                            <div key={entry.id || i} className="time-entry">
                                <div style={{
                                    width: 40, height: 40, borderRadius: 10,
                                    background: 'rgba(8, 145, 178, 0.08)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <Clock size={18} style={{ color: '#0891B2' }} />
                                </div>
                                <div className="time-entry-info">
                                    <div className="time-entry-project">
                                        {entry.project?.name || entry.projectName || 'General'}
                                    </div>
                                    <div className="time-entry-detail">
                                        {entry.date
                                            ? new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                            : entry.startTime
                                                ? new Date(entry.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                                : ''}
                                        {entry.phase && ` · ${entry.phase}`}
                                    </div>
                                </div>
                                <div className="time-entry-hours">
                                    {(entry.totalHours || entry.hours || 0).toFixed(1)}h
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Info Notice */}
            <div className="card" style={{ background: 'rgba(8, 145, 178, 0.04)', border: '1px solid rgba(8, 145, 178, 0.15)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <DollarSign size={20} style={{ color: '#0891B2', flexShrink: 0, marginTop: 2 }} />
                    <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>
                            Payroll Information
                        </p>
                        <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
                            For detailed pay stubs, tax documents, and payment history, please contact your manager or HR department.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
