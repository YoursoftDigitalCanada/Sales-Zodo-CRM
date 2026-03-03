import { useEffect, useState } from 'react';
import { crewApi } from '../api';
import { Loader2, ListChecks, CheckCircle2, Clock, AlertCircle, ChevronRight, Filter } from 'lucide-react';

type TaskStatus = 'all' | 'pending' | 'in_progress' | 'completed';

interface Task {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    dueDate?: string;
    projectName?: string;
    assignedBy?: string;
}

function getPriorityColor(priority: string) {
    switch (priority?.toLowerCase()) {
        case 'high': case 'urgent': return { bg: 'rgba(239, 68, 68, 0.08)', color: '#DC2626' };
        case 'medium': return { bg: 'rgba(245, 158, 11, 0.08)', color: '#D97706' };
        default: return { bg: 'rgba(16, 185, 129, 0.08)', color: '#059669' };
    }
}

function getStatusIcon(status: string) {
    switch (status?.toLowerCase()) {
        case 'completed': return <CheckCircle2 size={16} style={{ color: '#059669' }} />;
        case 'in_progress': case 'in progress': return <Clock size={16} style={{ color: '#0891B2' }} />;
        default: return <AlertCircle size={16} style={{ color: '#D97706' }} />;
    }
}

function getStatusLabel(status: string) {
    switch (status?.toLowerCase()) {
        case 'completed': return 'Completed';
        case 'in_progress': case 'in progress': return 'In Progress';
        default: return 'Pending';
    }
}

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<TaskStatus>('all');
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                // Try the crew API — if the endpoint doesn't exist yet, use empty array
                const data = await crewApi.getJobs();
                // Extract tasks from jobs if available
                const allTasks: Task[] = [];
                if (Array.isArray(data)) {
                    data.forEach((job: any) => {
                        if (job.tasks && Array.isArray(job.tasks)) {
                            job.tasks.forEach((t: any) => {
                                allTasks.push({
                                    id: t.id,
                                    title: t.title || t.name || 'Untitled Task',
                                    description: t.description,
                                    status: t.status || 'pending',
                                    priority: t.priority || 'medium',
                                    dueDate: t.dueDate,
                                    projectName: job.name,
                                    assignedBy: t.assignedBy?.name,
                                });
                            });
                        }
                    });
                }
                setTasks(allTasks);
            } catch (err: any) {
                console.error('Failed to fetch tasks:', err);
                setError('');
            } finally {
                setLoading(false);
            }
        };
        fetchTasks();
    }, []);

    const filteredTasks = filter === 'all'
        ? tasks
        : tasks.filter(t => t.status?.toLowerCase().replace(' ', '_') === filter);

    const counts = {
        all: tasks.length,
        pending: tasks.filter(t => !['completed', 'in_progress', 'in progress'].includes(t.status?.toLowerCase())).length,
        in_progress: tasks.filter(t => ['in_progress', 'in progress'].includes(t.status?.toLowerCase())).length,
        completed: tasks.filter(t => t.status?.toLowerCase() === 'completed').length,
    };

    if (loading) return <div className="loading"><Loader2 size={28} className="spinner" /></div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1>My Tasks</h1>
                <p>Track and manage your assigned work</p>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
                {([
                    { key: 'all', label: 'All' },
                    { key: 'pending', label: 'Pending' },
                    { key: 'in_progress', label: 'In Progress' },
                    { key: 'completed', label: 'Completed' },
                ] as { key: TaskStatus; label: string }[]).map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={filter === f.key ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
                        style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                        {f.label} ({counts[f.key]})
                    </button>
                ))}
            </div>

            {/* Task list */}
            {filteredTasks.length === 0 ? (
                <div className="empty-state">
                    <ListChecks />
                    <h3>{tasks.length === 0 ? 'No Tasks Yet' : 'No Matching Tasks'}</h3>
                    <p>{tasks.length === 0
                        ? 'Tasks from your assigned jobs will appear here'
                        : 'Try changing the filter to see other tasks'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filteredTasks.map(task => {
                        const priority = getPriorityColor(task.priority);
                        return (
                            <div key={task.id} className="card" style={{ cursor: 'pointer' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            {getStatusIcon(task.status)}
                                            <span className="card-title">{task.title}</span>
                                        </div>
                                        {task.description && (
                                            <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0 24px', lineHeight: 1.4 }}>
                                                {task.description.length > 100 ? task.description.slice(0, 100) + '...' : task.description}
                                            </p>
                                        )}
                                    </div>
                                    <span style={{
                                        background: priority.bg, color: priority.color,
                                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                        whiteSpace: 'nowrap', flexShrink: 0,
                                    }}>
                                        {task.priority}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                                    {task.projectName && (
                                        <span style={{ fontSize: 11, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Filter size={11} /> {task.projectName}
                                        </span>
                                    )}
                                    {task.dueDate && (
                                        <span style={{ fontSize: 11, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Clock size={11} /> Due: {new Date(task.dueDate).toLocaleDateString()}
                                        </span>
                                    )}
                                    <span style={{
                                        fontSize: 11, fontWeight: 500,
                                        color: task.status?.toLowerCase() === 'completed' ? '#059669'
                                            : task.status?.toLowerCase().includes('progress') ? '#0891B2' : '#D97706'
                                    }}>
                                        {getStatusLabel(task.status)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
