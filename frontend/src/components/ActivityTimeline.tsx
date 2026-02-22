import React, { useEffect, useState, useCallback } from 'react';
import { getTimeline, type TimelineEvent, type TimelineMeta } from '@/features/timeline/services/timeline-service';
import {
    PlusCircle, Edit, Trash2, ArrowRightLeft, LogIn, LogOut,
    Download, Upload, Shield, Key, Activity, Loader2, Filter
} from 'lucide-react';



// ── Icon Mapping ────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ReactNode> = {
    'plus-circle': <PlusCircle size={14} />,
    'edit': <Edit size={14} />,
    'trash': <Trash2 size={14} />,
    'arrow-right-left': <ArrowRightLeft size={14} />,
    'log-in': <LogIn size={14} />,
    'log-out': <LogOut size={14} />,
    'download': <Download size={14} />,
    'upload': <Upload size={14} />,
    'shield': <Shield size={14} />,
    'key': <Key size={14} />,
    'activity': <Activity size={14} />,
};

const COLOR_MAP: Record<string, { bg: string; text: string; ring: string; border: string }> = {
    green: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100', border: 'border-emerald-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-100', border: 'border-blue-100' },
    red: { bg: 'bg-red-50', text: 'text-red-600', ring: 'ring-red-100', border: 'border-red-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100', border: 'border-amber-100' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', ring: 'ring-cyan-100', border: 'border-cyan-100' },
    gray: { bg: 'bg-gray-50', text: 'text-gray-500', ring: 'ring-gray-100', border: 'border-gray-100' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', ring: 'ring-violet-100', border: 'border-violet-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', ring: 'ring-orange-100', border: 'border-orange-100' },
};

// ── Helpers ─────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const seconds = Math.floor(diffMs / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Filter pills ────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
    { label: 'All', value: '' },
    { label: 'Created', value: 'CREATE' },
    { label: 'Updated', value: 'UPDATE' },
    { label: 'Status Changes', value: 'STATUS_CHANGE' },
    { label: 'Deleted', value: 'DELETE' },
];

// ── Component ───────────────────────────────────────────────────────────

interface ActivityTimelineProps {
    entityType: string;   // 'Lead', 'Client', 'Project', etc.
    entityId: string;
    includeRelated?: boolean;
}

export function ActivityTimeline({ entityType, entityId, includeRelated = false }: ActivityTimelineProps) {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [meta, setMeta] = useState<TimelineMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [page, setPage] = useState(1);

    const fetchTimeline = useCallback(async (pageNum: number, append: boolean = false) => {
        try {
            if (pageNum === 1) setLoading(true);
            else setLoadingMore(true);

            const result = await getTimeline(entityType, entityId, {
                page: pageNum,
                limit: 20,
                action: filter || undefined,
                includeRelated,
            });

            if (append) {
                setEvents((prev) => [...prev, ...result.data]);
            } else {
                setEvents(result.data);
            }
            setMeta(result.meta);
            setError(null);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to load timeline');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [entityType, entityId, includeRelated, filter]);

    useEffect(() => {
        setPage(1);
        fetchTimeline(1, false);
    }, [fetchTimeline]);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchTimeline(nextPage, true);
    };

    const handleFilterChange = (value: string) => {
        setFilter(value);
        setPage(1);
    };

    // ── Render ──────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-[#0891B2] mr-2" size={20} />
                <span className="text-sm text-[#94A3B8]">Loading timeline…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-sm text-red-500 mb-2">{error}</p>
                <button
                    onClick={() => fetchTimeline(1, false)}
                    className="text-sm text-[#0891B2] hover:underline"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
                <Filter size={14} className="text-[#94A3B8]" />
                {FILTER_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => handleFilterChange(opt.value)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === opt.value
                            ? 'bg-[#0891B2] text-white'
                            : 'bg-gray-100 text-[#64748B] hover:bg-gray-200'
                            }`}
                    >
                        {opt.label}
                    </button>
                ))}
                {meta && (
                    <span className="text-xs text-[#94A3B8] ml-auto">
                        {meta.total} event{meta.total !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* Timeline */}
            {events.length === 0 ? (
                <div className="text-center py-10">
                    <Activity size={32} className="mx-auto text-[#CBD5E1] mb-3" />
                    <p className="text-sm text-[#94A3B8]">No timeline events yet.</p>
                    <p className="text-xs text-[#CBD5E1] mt-1">
                        Events will appear here as actions are taken on this {entityType.toLowerCase()}.
                    </p>
                </div>
            ) : (
                <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-[15px] top-4 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 to-transparent" />

                    <div className="space-y-0">
                        {events.map((event, idx) => {
                            const colors = COLOR_MAP[event.color] || COLOR_MAP.gray;
                            const icon = ICON_MAP[event.icon] || ICON_MAP.activity;
                            const isLast = idx === events.length - 1;

                            return (
                                <div key={event.id} className="flex gap-4 relative">
                                    {/* Icon bubble */}
                                    <div className="flex flex-col items-center z-10">
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white ${colors.bg} ${colors.text}`}
                                        >
                                            {icon}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className={`flex-1 ${isLast ? '' : 'pb-6'}`}>
                                        <div className={`bg-white p-4 rounded-lg border ${colors.border} shadow-sm hover:shadow-md transition-shadow`}>
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-medium text-[#0F172A] text-sm">{event.title}</h4>
                                                <span className="text-xs text-[#94A3B8] whitespace-nowrap ml-3">{timeAgo(event.createdAt)}</span>
                                            </div>

                                            {event.description && (
                                                <p className="text-sm text-[#475569] mb-2">{event.description}</p>
                                            )}

                                            {/* Changes detail */}
                                            {event.metadata?.changes && event.metadata.changes.length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                    {event.metadata.changes.map((change, i) => (
                                                        <div
                                                            key={i}
                                                            className="text-xs bg-gray-50 rounded px-2 py-1 font-mono text-[#64748B]"
                                                        >
                                                            {change}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* User + entity badge */}
                                            <div className="flex items-center gap-2 mt-2">
                                                {event.user && (
                                                    <span className="text-xs text-[#94A3B8]">
                                                        by {event.user.name}
                                                    </span>
                                                )}
                                                {event.entityType !== entityType && (
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} font-medium`}>
                                                        {event.entityType}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Load more */}
                    {meta?.hasNextPage && (
                        <div className="text-center pt-4">
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-[#0891B2] bg-[#0891B2]/5 rounded-lg hover:bg-[#0891B2]/10 transition-colors disabled:opacity-50"
                            >
                                {loadingMore ? (
                                    <>
                                        <Loader2 className="animate-spin" size={14} />
                                        Loading…
                                    </>
                                ) : (
                                    `Load more (${meta.total - events.length} remaining)`
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
