import { useEffect, useState } from 'react';
import { crewApi } from '../api';
import { Loader2, Bell, Check, CheckCheck } from 'lucide-react';

export default function NotificationsPage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { (async () => { try { setLoading(true); setItems(await crewApi.getNotifications()); } catch { } finally { setLoading(false); } })(); }, []);

    const handleMarkRead = async (id: string) => {
        await crewApi.markRead(id);
        setItems(items.map(i => i.id === id ? { ...i, read: true } : i));
    };

    const handleMarkAll = async () => {
        await crewApi.markAllRead();
        setItems(items.map(i => ({ ...i, read: true })));
    };

    if (loading) return <div className="loading"><Loader2 size={28} className="spinner" /></div>;

    const typeIcon: Record<string, string> = { JOB_ASSIGNED: '🔧', SCHEDULE_CHANGE: '📅', APPROVAL: '✅', ALERT: '🔔', MESSAGE: '💬', WEATHER: '🌤️' };

    return (
        <div className="page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><h1>Notifications</h1><p>{items.filter(i => !i.read).length} unread</p></div>
                {items.some(i => !i.read) && <button className="btn btn-sm btn-outline" onClick={handleMarkAll}><CheckCheck size={14} /> Read All</button>}
            </div>

            {items.length === 0 ? (
                <div className="empty-state"><Bell /><h3>All Clear</h3><p>No notifications yet</p></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {items.map(n => (
                        <div key={n.id} className="card" style={{ opacity: n.read ? 0.6 : 1, borderLeft: n.read ? undefined : '3px solid #0891B2', padding: 12 }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <span style={{ fontSize: 20 }}>{typeIcon[n.type] || '🔔'}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{n.title}</div>
                                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{n.body}</div>
                                    <div style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>{new Date(n.createdAt).toLocaleString()}</div>
                                </div>
                                {!n.read && <button className="btn btn-sm btn-outline" style={{ padding: 4 }} onClick={() => handleMarkRead(n.id)}><Check size={14} /></button>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
