import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { crewApi, getCurrentUser } from '../api';
import { Loader2, MapPin, Clock, CheckSquare, Briefcase, Play, Square } from 'lucide-react';

function formatTimer(ms: number) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function DashboardPage() {
    const user = getCurrentUser();
    const [dashboard, setDashboard] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [clockLoading, setClockLoading] = useState(false);
    const [elapsed, setElapsed] = useState(0);

    const fetchDashboard = useCallback(async () => {
        try {
            setLoading(true);
            const data = await crewApi.getDashboard();
            setDashboard(data);
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    // Live timer
    useEffect(() => {
        if (!dashboard?.activeClock) return;
        const start = new Date(dashboard.activeClock.startTime).getTime();
        const tick = () => setElapsed(Date.now() - start);
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [dashboard?.activeClock]);

    const handleClockIn = async () => {
        setClockLoading(true);
        try {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        await crewApi.clockIn({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        fetchDashboard();
                        setClockLoading(false);
                    },
                    async () => {
                        await crewApi.clockIn({});
                        fetchDashboard();
                        setClockLoading(false);
                    },
                    { timeout: 5000 }
                );
            } else {
                await crewApi.clockIn({});
                fetchDashboard();
                setClockLoading(false);
            }
        } catch {
            setClockLoading(false);
        }
    };

    const handleClockOut = async () => {
        setClockLoading(true);
        try {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        await crewApi.clockOut({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        fetchDashboard();
                        setClockLoading(false);
                    },
                    async () => {
                        await crewApi.clockOut({});
                        fetchDashboard();
                        setClockLoading(false);
                    },
                    { timeout: 5000 }
                );
            } else {
                await crewApi.clockOut({});
                fetchDashboard();
                setClockLoading(false);
            }
        } catch {
            setClockLoading(false);
        }
    };

    if (loading) return <div className="loading"><Loader2 size={28} className="spinner" /></div>;

    const stats = dashboard?.stats || {};
    const activeClock = dashboard?.activeClock;
    const jobs = dashboard?.todaysJobs || [];

    return (
        <div className="page">
            <div className="page-header">
                <h1>Hey, {user?.name?.split(' ')[0] || 'Crew'} 👋</h1>
                <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>

            {/* Clock In/Out */}
            {activeClock ? (
                <>
                    <div className="timer-display">
                        <div className="timer-time">{formatTimer(elapsed)}</div>
                        <div className="timer-label">Currently clocked in</div>
                        {activeClock.project && <div className="timer-project">{activeClock.project.name}</div>}
                        {activeClock.phase && <div className="timer-label" style={{ marginTop: 4 }}>Phase: {activeClock.phase}</div>}
                    </div>
                    <button className="btn-clock clock-out" onClick={handleClockOut} disabled={clockLoading}>
                        {clockLoading ? <Loader2 size={20} className="spinner" /> : <Square size={20} />}
                        Clock Out
                    </button>
                </>
            ) : (
                <button className="btn-clock clock-in" onClick={handleClockIn} disabled={clockLoading} style={{ marginBottom: 16 }}>
                    {clockLoading ? <Loader2 size={20} className="spinner" /> : <Play size={20} />}
                    Clock In
                </button>
            )}

            {/* Stats */}
            <div className="stats-grid" style={{ margin: '16px 0' }}>
                <div className="stat-card">
                    <div className="stat-value">{stats.weeklyHours || 0}</div>
                    <div className="stat-label">Hours This Week</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.totalActiveJobs || 0}</div>
                    <div className="stat-label">Active Jobs</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.pendingTasks || 0}</div>
                    <div className="stat-label">Pending Tasks</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.weeklyBillableHours || 0}</div>
                    <div className="stat-label">Billable Hrs</div>
                </div>
            </div>

            {/* Today's Jobs */}
            <div style={{ marginTop: 20 }}>
                <div className="card-header">
                    <h3 className="card-title">Today's Jobs</h3>
                    <Link to="/jobs" className="btn btn-outline btn-sm">View All</Link>
                </div>
                {jobs.length === 0 ? (
                    <div className="empty-state">
                        <Briefcase />
                        <h3>No Jobs Today</h3>
                        <p>Check your schedule for upcoming assignments</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {jobs.slice(0, 5).map((job: any) => (
                            <Link to={`/jobs/${job.id}`} key={job.id} className="job-card">
                                <div className="card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div className="card-title">{job.name}</div>
                                            <div className="card-subtitle">{job.client?.clientName || 'No Client'}</div>
                                        </div>
                                        <span className={`badge badge-${job.status?.toLowerCase().replace('_', '-') || 'active'}`}>{job.status}</span>
                                    </div>
                                    {job.client?.streetAddress && (
                                        <div className="job-address">
                                            <MapPin size={14} />
                                            <span>{[job.client.streetAddress, job.client.city, job.client.province].filter(Boolean).join(', ')}</span>
                                        </div>
                                    )}
                                    <div className="job-meta">
                                        <div className="job-meta-item"><CheckSquare size={12} />{job._count?.tasks || 0} tasks</div>
                                        <div className="job-meta-item"><Clock size={12} />{job._count?.timeEntries || 0} logs</div>
                                    </div>
                                    {job.progress > 0 && (
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: `${job.progress}%` }} />
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
