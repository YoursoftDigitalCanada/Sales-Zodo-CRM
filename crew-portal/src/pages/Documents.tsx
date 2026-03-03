import { useEffect, useState } from 'react';
import { crewApi } from '../api';
import { Loader2, FileText } from 'lucide-react';

export default function DocumentsPage() {
    const [docs, setDocs] = useState<any[]>([]);
    const [expiring, setExpiring] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'all' | 'expiring'>('all');

    useEffect(() => {
        (async () => { try { setLoading(true); const [d, e] = await Promise.all([crewApi.getDocuments(), crewApi.getExpiring()]); setDocs(d); setExpiring(e); } catch { } finally { setLoading(false); } })();
    }, []);

    if (loading) return <div className="loading"><Loader2 size={28} className="spinner" /></div>;

    const typeEmoji: Record<string, string> = { CERT: '📜', LICENSE: '🪪', TRAINING: '🎓', POLICY: '📋', PAYSLIP: '💰' };
    const statusColor: Record<string, string> = { VALID: 'badge-active', EXPIRING_SOON: 'badge-on-hold', EXPIRED: 'badge-completed' };
    const items = tab === 'expiring' ? expiring : docs;

    return (
        <div className="page">
            <div className="page-header"><h1>Documents</h1><p>Certificates, licenses & records</p></div>

            <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid #334155' }}>
                <button onClick={() => setTab('all')} style={{ flex: 1, padding: '10px 0', background: 'none', border: 'none', color: tab === 'all' ? '#0891B2' : '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderBottom: tab === 'all' ? '2px solid #0891B2' : '2px solid transparent', fontFamily: 'var(--font)' }}>All ({docs.length})</button>
                <button onClick={() => setTab('expiring')} style={{ flex: 1, padding: '10px 0', background: 'none', border: 'none', color: tab === 'expiring' ? '#F59E0B' : '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderBottom: tab === 'expiring' ? '2px solid #F59E0B' : '2px solid transparent', fontFamily: 'var(--font)' }}>
                    Expiring ({expiring.length}) {expiring.length > 0 && '⚠️'}
                </button>
            </div>

            {items.length === 0 ? (
                <div className="empty-state"><FileText /><h3>{tab === 'expiring' ? 'No Expiring Docs' : 'No Documents'}</h3><p>{tab === 'expiring' ? 'All documents are valid' : 'Upload certificates and licenses'}</p></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {items.map(d => (
                        <div key={d.id} className="card" style={{ padding: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{typeEmoji[d.type] || '📄'} {d.name}</div>
                                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                                        {d.type}{d.expiryDate && ` · Expires: ${new Date(d.expiryDate).toLocaleDateString()}`}
                                    </div>
                                </div>
                                <span className={`badge ${statusColor[d.status] || 'badge-planning'}`}>{d.status?.replace('_', ' ')}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
