import { useEffect, useState } from 'react';
import { crewApi } from '../api';
import { Loader2, Wrench, Package } from 'lucide-react';

export default function EquipmentPage() {
    const [equipment, setEquipment] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'equipment' | 'materials'>('equipment');

    useEffect(() => {
        (async () => { try { setLoading(true); const [e, r] = await Promise.all([crewApi.getEquipment(), crewApi.getMyMaterialRequests()]); setEquipment(e); setRequests(r); } catch { } finally { setLoading(false); } })();
    }, []);

    if (loading) return <div className="loading"><Loader2 size={28} className="spinner" /></div>;

    const statusColor: Record<string, string> = { AVAILABLE: 'badge-active', IN_USE: 'badge-planning', MAINTENANCE: 'badge-on-hold', RETIRED: 'badge-completed' };
    const reqColor: Record<string, string> = { PENDING: 'badge-on-hold', APPROVED: 'badge-active', DELIVERED: 'badge-completed' };

    return (
        <div className="page">
            <div className="page-header"><h1>Equipment & Materials</h1></div>

            <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid #334155' }}>
                {(['equipment', 'materials'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px 0', background: 'none', border: 'none', color: tab === t ? '#0891B2' : '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderBottom: tab === t ? '2px solid #0891B2' : '2px solid transparent', fontFamily: 'var(--font)' }}>
                        {t === 'equipment' ? `Equipment (${equipment.length})` : `Requests (${requests.length})`}
                    </button>
                ))}
            </div>

            {tab === 'equipment' && (
                equipment.length === 0 ? (
                    <div className="empty-state"><Wrench /><h3>No Equipment</h3><p>No equipment assigned to you</p></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {equipment.map(e => (
                            <div key={e.id} className="card" style={{ padding: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{e.name}</div>
                                        <div style={{ fontSize: 11, color: '#94A3B8' }}>{e.category}{e.serialNumber && ` · SN: ${e.serialNumber}`}</div>
                                    </div>
                                    <span className={`badge ${statusColor[e.status] || 'badge-planning'}`}>{e.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {tab === 'materials' && (
                requests.length === 0 ? (
                    <div className="empty-state"><Package /><h3>No Requests</h3><p>Request materials from a job detail page</p></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {requests.map(r => (
                            <div key={r.id} className="card" style={{ padding: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{r.project?.name || '—'}</div>
                                        <div style={{ fontSize: 11, color: '#94A3B8' }}>{Array.isArray(r.items) ? r.items.map((i: any) => `${i.name} x${i.quantity}`).join(', ') : '—'}</div>
                                        <div style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                                    </div>
                                    <span className={`badge ${reqColor[r.status] || 'badge-planning'}`}>{r.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}
