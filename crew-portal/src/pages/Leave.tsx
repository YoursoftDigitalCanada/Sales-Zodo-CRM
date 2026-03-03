import { useEffect, useState } from 'react';
import { crewApi } from '../api';
import { Loader2, Calendar, Send, X } from 'lucide-react';

export default function LeavePage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ type: 'VACATION', startDate: '', endDate: '', reason: '' });

    useEffect(() => { (async () => { try { setLoading(true); setRequests(await crewApi.getLeaveRequests()); } catch { } finally { setLoading(false); } })(); }, []);

    const handleSubmit = async () => {
        if (!form.startDate || !form.endDate) return;
        setSubmitting(true);
        try { const r = await crewApi.submitLeave(form); setRequests([r, ...requests]); setShowForm(false); setForm({ type: 'VACATION', startDate: '', endDate: '', reason: '' }); } catch { } finally { setSubmitting(false); }
    };

    const handleCancel = async (id: string) => {
        try { await crewApi.cancelLeave(id); setRequests(requests.filter(r => r.id !== id)); } catch { }
    };

    if (loading) return <div className="loading"><Loader2 size={28} className="spinner" /></div>;

    const statusColor: Record<string, string> = { PENDING: 'badge-on-hold', APPROVED: 'badge-active', REJECTED: 'badge-completed' };
    const typeEmoji: Record<string, string> = { VACATION: '🏖️', SICK: '🤒', PERSONAL: '👤', UNPAID: '📝' };

    return (
        <div className="page">
            <div className="page-header"><h1>Leave & Time Off</h1></div>

            <button className="btn btn-primary btn-sm" style={{ marginBottom: 16 }} onClick={() => setShowForm(!showForm)}>
                {showForm ? 'Cancel' : '+ Request Leave'}
            </button>

            {showForm && (
                <div className="card" style={{ marginBottom: 16 }}>
                    <div className="input-group"><label>Type</label><select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="VACATION">Vacation</option><option value="SICK">Sick</option><option value="PERSONAL">Personal</option><option value="UNPAID">Unpaid</option></select></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div className="input-group" style={{ flex: 1 }}><label>Start Date</label><input className="input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
                        <div className="input-group" style={{ flex: 1 }}><label>End Date</label><input className="input" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
                    </div>
                    <div className="input-group"><label>Reason</label><textarea className="textarea" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Optional reason" rows={2} /></div>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? <Loader2 size={14} className="spinner" /> : <Send size={14} />} Submit</button>
                </div>
            )}

            {requests.length === 0 ? (
                <div className="empty-state"><Calendar /><h3>No Leave Requests</h3><p>Your leave history will appear here</p></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {requests.map(r => (
                        <div key={r.id} className="card" style={{ padding: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{typeEmoji[r.type] || '📝'} {r.type}</div>
                                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{new Date(r.startDate).toLocaleDateString()} — {new Date(r.endDate).toLocaleDateString()}</div>
                                    {r.reason && <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{r.reason}</div>}
                                    {r.reviewNote && <div style={{ fontSize: 11, color: '#0891B2', marginTop: 4 }}>Review: {r.reviewNote}</div>}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                    <span className={`badge ${statusColor[r.status]}`}>{r.status}</span>
                                    {r.status === 'PENDING' && <button className="btn btn-sm btn-outline" style={{ padding: '2px 8px' }} onClick={() => handleCancel(r.id)}><X size={12} /> Cancel</button>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
