import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { crewApi } from '../api';
import { Loader2, MapPin, CheckSquare, Clock, FileText, Briefcase } from 'lucide-react';

export default function MyJobsPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const data = await crewApi.getJobs(filter || undefined);
                setJobs(data);
            } catch { } finally { setLoading(false); }
        })();
    }, [filter]);

    if (loading) return <div className="loading"><Loader2 size={28} className="spinner" /></div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1>My Jobs</h1>
                <p>{jobs.length} job{jobs.length !== 1 ? 's' : ''} assigned to you</p>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
                {['', 'ACTIVE', 'PLANNING', 'ON_HOLD', 'COMPLETED'].map(s => (
                    <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setFilter(s)}>{s || 'All'}</button>
                ))}
            </div>

            {jobs.length === 0 ? (
                <div className="empty-state">
                    <Briefcase />
                    <h3>No Jobs Found</h3>
                    <p>No jobs match the current filter</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {jobs.map(job => (
                        <Link to={`/jobs/${job.id}`} key={job.id} className="job-card">
                            <div className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <div className="card-title">{job.name}</div>
                                        <div className="card-subtitle">{job.client?.clientName || '—'}</div>
                                    </div>
                                    <span className={`badge badge-${job.status?.toLowerCase().replace('_', '-') || 'active'}`}>{job.status?.replace('_', ' ')}</span>
                                </div>
                                {job.client?.streetAddress && (
                                    <div className="job-address">
                                        <MapPin size={14} />
                                        <span>{[job.client.streetAddress, job.client.city, job.client.province].filter(Boolean).join(', ')}</span>
                                    </div>
                                )}
                                <div className="job-meta">
                                    <div className="job-meta-item"><CheckSquare size={12} /> {job._count?.tasks || 0} tasks</div>
                                    <div className="job-meta-item"><Clock size={12} /> {job._count?.timeEntries || 0} entries</div>
                                    <div className="job-meta-item"><FileText size={12} /> {job._count?.jobNotes || 0} notes</div>
                                </div>
                                {job.progress > 0 && (
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${job.progress}%` }} />
                                    </div>
                                )}
                                {/* Crew members */}
                                {job.members?.length > 0 && (
                                    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {job.members.slice(0, 4).map((m: any) => (
                                            <span key={m.id} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: 'rgba(8,145,178,0.1)', color: '#0891B2' }}>
                                                {m.employee?.user?.firstName} {m.employee?.user?.lastName?.[0]}.
                                            </span>
                                        ))}
                                        {job.members.length > 4 && <span style={{ fontSize: 10, color: '#64748B' }}>+{job.members.length - 4}</span>}
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
