import { useEffect, useState } from 'react';
import { crewApi } from '../api';
import { Loader2, Shield, Send, Phone } from 'lucide-react';

export default function SafetyPage() {
    const [incidents, setIncidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [jobs, setJobs] = useState<any[]>([]);
    const [form, setForm] = useState({ projectId: '', type: 'HAZARD', severity: 'MEDIUM', description: '', location: '', actionTaken: '' });

    useEffect(() => {
        (async () => {
            try { setLoading(true); const [i, j] = await Promise.all([crewApi.getIncidents(), crewApi.getJobs()]); setIncidents(i); setJobs(j); } catch { } finally { setLoading(false); }
        })();
    }, []);

    const handleSOS = async () => {
        if (!confirm('Send SOS Emergency Alert? This will notify all managers immediately.')) return;
        try {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(async (pos) => { await crewApi.sendEmergency({ lat: pos.coords.latitude, lng: pos.coords.longitude, message: 'SOS Emergency' }); alert('Emergency alert sent!'); }, async () => { await crewApi.sendEmergency({ message: 'SOS Emergency' }); alert('Emergency alert sent!'); });
            } else { await crewApi.sendEmergency({ message: 'SOS Emergency' }); alert('Emergency alert sent!'); }
        } catch { }
    };

    const handleSubmit = async () => {
        if (!form.projectId || !form.description) return;
        setSubmitting(true);
        try {
            const inc = await crewApi.reportIncident(form);
            setIncidents([inc, ...incidents]); setShowForm(false); setForm({ projectId: '', type: 'HAZARD', severity: 'MEDIUM', description: '', location: '', actionTaken: '' });
        } catch { } finally { setSubmitting(false); }
    };

    if (loading) return <div className="loading"><Loader2 size={28} className="spinner" /></div>;

    const sevColor: Record<string, string> = { LOW: 'badge-planning', MEDIUM: 'badge-on-hold', HIGH: 'badge-active', CRITICAL: 'badge-clocked' };
    const typeEmoji: Record<string, string> = { INJURY: '🤕', NEAR_MISS: '⚠️', PROPERTY_DAMAGE: '🏚️', HAZARD: '⛔' };

    return (
        <div className="page">
            <div className="page-header"><h1>Safety</h1><p>Incidents & emergency</p></div>

            {/* SOS Button */}
            <button onClick={handleSOS} style={{ width: '100%', padding: 16, borderRadius: 16, background: 'linear-gradient(135deg, #DC2626, #991B1B)', color: 'white', fontSize: 18, fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16, fontFamily: 'var(--font)' }}>
                <Phone size={22} /> SOS EMERGENCY
            </button>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button className={`btn btn-sm ${showForm ? 'btn-outline' : 'btn-primary'}`} onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : '+ Report Incident'}
                </button>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: 16 }}>
                    <div className="input-group"><label>Job</label><select className="input" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}><option value="">Select job</option>{jobs.map((j: any) => <option key={j.id} value={j.id}>{j.name}</option>)}</select></div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <div className="input-group" style={{ flex: 1, marginBottom: 0 }}><label>Type</label><select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="HAZARD">Hazard</option><option value="NEAR_MISS">Near Miss</option><option value="INJURY">Injury</option><option value="PROPERTY_DAMAGE">Property Damage</option></select></div>
                        <div className="input-group" style={{ flex: 1, marginBottom: 0 }}><label>Severity</label><select className="input" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></div>
                    </div>
                    <div className="input-group"><label>Description</label><textarea className="textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the incident..." rows={3} /></div>
                    <div className="input-group"><label>Location</label><input className="input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Where did it happen?" /></div>
                    <div className="input-group"><label>Action Taken</label><textarea className="textarea" value={form.actionTaken} onChange={e => setForm({ ...form, actionTaken: e.target.value })} placeholder="What was done?" rows={2} /></div>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? <Loader2 size={14} className="spinner" /> : <Send size={14} />} Submit Report</button>
                </div>
            )}

            {incidents.length === 0 ? (
                <div className="empty-state"><Shield /><h3>No Incidents</h3><p>Stay safe out there!</p></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {incidents.map(inc => (
                        <div key={inc.id} className="card" style={{ padding: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span style={{ fontSize: 18 }}>{typeEmoji[inc.type] || '⚠️'}</span>
                                    <div><div style={{ fontSize: 13, fontWeight: 600 }}>{inc.type?.replace('_', ' ')}</div><div style={{ fontSize: 11, color: '#94A3B8' }}>{inc.project?.name || '—'}</div></div>
                                </div>
                                <span className={`badge ${sevColor[inc.severity] || 'badge-planning'}`}>{inc.severity}</span>
                            </div>
                            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 8, lineHeight: 1.4 }}>{inc.description}</p>
                            <div style={{ fontSize: 10, color: '#64748B', marginTop: 6 }}>{new Date(inc.reportedAt).toLocaleString()}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
