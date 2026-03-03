import { useEffect, useState } from 'react';
import { crewApi } from '../api';
import { Loader2, ClipboardCheck, CheckCircle, Send } from 'lucide-react';

export default function ChecklistsPage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [responses, setResponses] = useState<Record<string, any>>({});
    const [projectId, setProjectId] = useState('');
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState('');

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const [t, j] = await Promise.all([crewApi.getChecklists(), crewApi.getJobs('ACTIVE')]);
                setTemplates(t); setJobs(j);
            } catch { } finally { setLoading(false); }
        })();
    }, []);

    const handleSelect = async (t: any) => {
        const detail = await crewApi.getChecklist(t.id);
        setSelected(detail); setResponses({}); setSuccess('');
    };

    const handleSubmit = async () => {
        if (!projectId) return;
        setSubmitting(true);
        try {
            await crewApi.submitChecklist(selected.id, { projectId, responses });
            setSuccess('Checklist submitted!'); setSelected(null); setResponses({});
        } catch { } finally { setSubmitting(false); }
    };

    if (loading) return <div className="loading"><Loader2 size={28} className="spinner" /></div>;

    if (selected) {
        return (
            <div className="page">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <button className="btn btn-sm btn-outline" onClick={() => setSelected(null)}>← Back</button>
                    <div><h1 style={{ fontSize: 18 }}>{selected.name}</h1><p style={{ fontSize: 12, color: '#94A3B8' }}>{selected.category}</p></div>
                </div>

                <div className="input-group">
                    <label>Select Job</label>
                    <select className="input" value={projectId} onChange={e => setProjectId(e.target.value)}>
                        <option value="">Choose a job...</option>
                        {jobs.map((j: any) => <option key={j.id} value={j.id}>{j.name}</option>)}
                    </select>
                </div>

                {selected.items?.map((item: any, i: number) => (
                    <div key={item.id} className="card" style={{ marginBottom: 10, padding: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{i + 1}. {item.question} {item.required && <span style={{ color: '#EF4444' }}>*</span>}</div>
                        {item.inputType === 'YES_NO' ? (
                            <div style={{ display: 'flex', gap: 8 }}>
                                {['Yes', 'No', 'N/A'].map(v => (
                                    <button key={v} className={`btn btn-sm ${responses[item.id] === v ? 'btn-primary' : 'btn-outline'}`}
                                        onClick={() => setResponses({ ...responses, [item.id]: v })}>{v}</button>
                                ))}
                            </div>
                        ) : item.inputType === 'NUMBER' ? (
                            <input className="input" type="number" placeholder="Enter value" value={responses[item.id] || ''} onChange={e => setResponses({ ...responses, [item.id]: e.target.value })} />
                        ) : (
                            <textarea className="textarea" placeholder="Enter details..." value={responses[item.id] || ''} onChange={e => setResponses({ ...responses, [item.id]: e.target.value })} rows={2} />
                        )}
                    </div>
                ))}

                <button className="btn btn-primary btn-lg" style={{ marginTop: 16 }} onClick={handleSubmit} disabled={submitting || !projectId}>
                    {submitting ? <Loader2 size={16} className="spinner" /> : <Send size={16} />} Submit Checklist
                </button>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header"><h1>Checklists</h1><p>Inspection & safety forms</p></div>
            {success && <div style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{success}</div>}
            {templates.length === 0 ? (
                <div className="empty-state"><ClipboardCheck /><h3>No Checklists</h3><p>Your admin hasn't created any checklist templates yet</p></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {templates.map(t => (
                        <button key={t.id} className="card" onClick={() => handleSelect(t)} style={{ textAlign: 'left', cursor: 'pointer', border: '1px solid #334155', background: '#1E293B', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <CheckCircle size={20} color="#0891B2" />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
                                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{t.category} · {t.items?.length || 0} items · {t._count?.submissions || 0} submissions</div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
