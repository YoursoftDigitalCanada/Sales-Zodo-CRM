import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { crewApi, getCurrentUser } from '../api';
import { Loader2, ArrowLeft, MapPin, Phone, Mail, CheckSquare, Clock, Users, Send, FileText, Camera, MessageCircle } from 'lucide-react';

export default function JobDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const user = getCurrentUser();
    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'info' | 'tasks' | 'notes' | 'photos' | 'chat'>('info');

    // Note form
    const [noteContent, setNoteContent] = useState('');
    const [noteType, setNoteType] = useState('GENERAL');
    const [submittingNote, setSubmittingNote] = useState(false);

    // Status
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Photos
    const [photos, setPhotos] = useState<any[]>([]);
    const [photoLoading, setPhotoLoading] = useState(false);

    // Chat
    const [messages, setMessages] = useState<any[]>([]);
    const [msgContent, setMsgContent] = useState('');
    const [msgLoading, setMsgLoading] = useState(false);
    const chatRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const data = await crewApi.getJobDetail(id!);
                setJob(data);
            } catch { navigate('/jobs'); }
            finally { setLoading(false); }
        })();
    }, [id, navigate]);

    useEffect(() => {
        if (tab === 'photos' && id) { setPhotoLoading(true); crewApi.getJobPhotos(id).then(setPhotos).finally(() => setPhotoLoading(false)); }
        if (tab === 'chat' && id) { setMsgLoading(true); crewApi.getMessages(id).then(m => { setMessages(m); setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 100); }).finally(() => setMsgLoading(false)); }
    }, [tab, id]);

    const handleAddNote = async () => {
        if (!noteContent.trim()) return;
        setSubmittingNote(true);
        try {
            const note = await crewApi.addJobNote(id!, { content: noteContent, noteType });
            setJob({ ...job, jobNotes: [note, ...(job.jobNotes || [])] });
            setNoteContent('');
        } catch { } finally { setSubmittingNote(false); }
    };

    const handleStatusChange = async (status: string) => {
        setUpdatingStatus(true);
        try { await crewApi.updateJobStatus(id!, { status }); setJob({ ...job, status }); } catch { } finally { setUpdatingStatus(false); }
    };

    const handleSendMessage = async () => {
        if (!msgContent.trim()) return;
        try {
            const msg = await crewApi.sendMessage(id!, { content: msgContent });
            setMessages([...messages, msg]);
            setMsgContent('');
            setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 100);
        } catch { }
    };

    if (loading) return <div className="loading"><Loader2 size={28} className="spinner" /></div>;
    if (!job) return null;

    const client = job.client;

    return (
        <div className="page">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <button onClick={() => navigate(-1)} className="btn btn-sm btn-outline" style={{ padding: 6 }}><ArrowLeft size={18} /></button>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: 18, fontWeight: 700 }}>{job.name}</h1>
                    <p style={{ fontSize: 12, color: '#94A3B8' }}>{client?.clientName || '—'}</p>
                </div>
                <span className={`badge badge-${job.status?.toLowerCase().replace('_', '-')}`}>{job.status}</span>
            </div>

            {/* Status Actions */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
                {['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'].map(s => (
                    <button key={s} className={`btn btn-sm ${job.status === s ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => handleStatusChange(s)} disabled={updatingStatus}>{s.replace('_', ' ')}</button>
                ))}
            </div>

            {/* Progress */}
            <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>Progress</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0891B2' }}>{job.progress || 0}%</span>
                </div>
                <div className="progress-bar" style={{ marginTop: 6 }}><div className="progress-fill" style={{ width: `${job.progress || 0}%` }} /></div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid #334155', overflowX: 'auto' }}>
                {([
                    { key: 'info', label: 'Details' },
                    { key: 'tasks', label: `Tasks (${job.tasks?.length || 0})` },
                    { key: 'notes', label: `Notes (${job.jobNotes?.length || 0})` },
                    { key: 'photos', label: `Photos (${job._count?.jobPhotos || 0})` },
                    { key: 'chat', label: `Chat (${job._count?.jobMessages || 0})` },
                ] as const).map(t => (
                    <button key={t.key} onClick={() => setTab(t.key as any)}
                        style={{ flex: 'none', padding: '10px 12px', background: 'none', border: 'none', color: tab === t.key ? '#0891B2' : '#64748B', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderBottom: tab === t.key ? '2px solid #0891B2' : '2px solid transparent', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Info Tab */}
            {tab === 'info' && (
                <>
                    {client && (
                        <div className="detail-section">
                            <h3>Client Information</h3>
                            <div className="detail-row"><span className="detail-label">Name</span><span className="detail-value">{client.clientName}</span></div>
                            {client.primaryPhone && <div className="detail-row"><span className="detail-label">Phone</span><a href={`tel:${client.primaryPhone}`} style={{ color: '#0891B2', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}><Phone size={12} /> {client.primaryPhone}</a></div>}
                            {client.primaryEmail && <div className="detail-row"><span className="detail-label">Email</span><a href={`mailto:${client.primaryEmail}`} style={{ color: '#0891B2', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}><Mail size={12} /> {client.primaryEmail}</a></div>}
                            {client.streetAddress && <div className="detail-row"><span className="detail-label">Address</span><span className="detail-value" style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}><MapPin size={12} style={{ flexShrink: 0, marginTop: 2 }} /> {[client.streetAddress, client.city, client.province, client.postalCode].filter(Boolean).join(', ')}</span></div>}
                        </div>
                    )}
                    <div className="detail-section">
                        <h3>Job Details</h3>
                        {job.description && <div className="detail-row"><span className="detail-label">Description</span><span className="detail-value">{job.description}</span></div>}
                        {job.code && <div className="detail-row"><span className="detail-label">Code</span><span className="detail-value">{job.code}</span></div>}
                        {job.startDate && <div className="detail-row"><span className="detail-label">Start</span><span className="detail-value">{new Date(job.startDate).toLocaleDateString()}</span></div>}
                        {job.endDate && <div className="detail-row"><span className="detail-label">End</span><span className="detail-value">{new Date(job.endDate).toLocaleDateString()}</span></div>}
                    </div>
                    {job.members?.length > 0 && (
                        <div className="detail-section">
                            <h3>Crew</h3>
                            {job.members.map((m: any) => (
                                <div key={m.id} className="detail-row">
                                    <span className="detail-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={12} /> {m.employee?.user?.firstName} {m.employee?.user?.lastName}</span>
                                    <span className="detail-value" style={{ color: '#0891B2' }}>{m.role || 'Crew'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Tasks Tab */}
            {tab === 'tasks' && (
                <div>
                    {(!job.tasks || job.tasks.length === 0) ? (
                        <div className="empty-state"><CheckSquare /><h3>No Tasks</h3><p>No tasks assigned to this job yet</p></div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {job.tasks.map((task: any) => (
                                <div key={task.id} className="card" style={{ padding: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <CheckSquare size={16} color={task.status === 'DONE' ? '#10B981' : '#64748B'} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600, textDecoration: task.status === 'DONE' ? 'line-through' : 'none', color: task.status === 'DONE' ? '#64748B' : '#F8FAFC' }}>{task.title}</div>
                                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                                <span className={`badge badge-${task.priority?.toLowerCase() === 'high' || task.priority?.toLowerCase() === 'urgent' ? 'on-hold' : 'planning'}`}>{task.priority}</span>
                                                {task.dueDate && <span style={{ fontSize: 10, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} /> {new Date(task.dueDate).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Notes Tab */}
            {tab === 'notes' && (
                <div>
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div className="input-group" style={{ marginBottom: 8 }}>
                            <select className="input" value={noteType} onChange={e => setNoteType(e.target.value)} style={{ marginBottom: 8 }}>
                                <option value="GENERAL">General Note</option><option value="UPDATE">Status Update</option><option value="ISSUE">Issue</option><option value="SAFETY">Safety Note</option>
                            </select>
                            <textarea className="textarea" placeholder="Write a note..." value={noteContent} onChange={e => setNoteContent(e.target.value)} rows={3} />
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={submittingNote || !noteContent.trim()}>
                            {submittingNote ? <Loader2 size={14} className="spinner" /> : <Send size={14} />} Post Note
                        </button>
                    </div>
                    {(!job.jobNotes || job.jobNotes.length === 0) ? (
                        <div className="empty-state"><FileText /><h3>No Notes</h3><p>Add the first note</p></div>
                    ) : (
                        job.jobNotes.map((note: any) => (
                            <div key={note.id} className="note-card">
                                <span className={`note-type note-type-${note.noteType?.toLowerCase() || 'general'}`}>{note.noteType}</span>
                                <div className="note-header"><span className="note-author">{note.employee?.user?.firstName} {note.employee?.user?.lastName}</span><span className="note-time">{new Date(note.createdAt).toLocaleString()}</span></div>
                                <div className="note-content">{note.content}</div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Photos Tab */}
            {tab === 'photos' && (
                <div>
                    {photoLoading ? <div className="loading"><Loader2 size={24} className="spinner" /></div> :
                        photos.length === 0 ? (
                            <div className="empty-state"><Camera /><h3>No Photos</h3><p>Upload photos from the job site</p></div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                                    {['ALL', 'BEFORE', 'DURING', 'AFTER', 'DAMAGE', 'SAFETY'].map(c => {
                                        const count = c === 'ALL' ? photos.length : photos.filter(p => p.category === c).length;
                                        return <button key={c} className="btn btn-sm btn-outline" style={{ fontSize: 10 }}>{c} ({count})</button>;
                                    })}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                    {photos.map(p => (
                                        <div key={p.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '1', background: '#334155' }}>
                                            <img src={p.url} alt={p.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <span style={{ position: 'absolute', bottom: 4, left: 4, fontSize: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>{p.category}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )
                    }
                </div>
            )}

            {/* Chat Tab */}
            {tab === 'chat' && (
                <div>
                    {msgLoading ? <div className="loading"><Loader2 size={24} className="spinner" /></div> : (
                        <>
                            <div ref={chatRef} style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, paddingBottom: 12 }}>
                                {messages.length === 0 ? (
                                    <div className="empty-state"><MessageCircle /><h3>No Messages</h3><p>Start the conversation</p></div>
                                ) : messages.map(m => {
                                    const isMe = m.senderId === user?.employeeId;
                                    return (
                                        <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                                            {!isMe && <span style={{ fontSize: 10, color: '#64748B', marginBottom: 2 }}>{m.sender?.user?.firstName}</span>}
                                            <div style={{ background: isMe ? '#0891B2' : '#334155', padding: '8px 12px', borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px', fontSize: 13 }}>
                                                {m.content}
                                            </div>
                                            <span style={{ fontSize: 9, color: '#64748B', marginTop: 2 }}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input className="input" style={{ flex: 1, marginBottom: 0 }} placeholder="Type a message..." value={msgContent} onChange={e => setMsgContent(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} />
                                <button className="btn btn-primary" style={{ padding: '0 14px' }} onClick={handleSendMessage} disabled={!msgContent.trim()}><Send size={16} /></button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
