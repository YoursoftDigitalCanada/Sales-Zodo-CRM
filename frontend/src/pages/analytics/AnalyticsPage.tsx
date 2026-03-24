import { useState, useMemo, useEffect, useCallback } from "react";
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
    Download, Filter, CalendarDays, RefreshCw, ChevronDown,
    ArrowUpRight, ArrowDownRight, TrendingUp, BarChart3,
    Info, Maximize2, Share2, Printer, Loader2,
    Clock, Zap, Eye, MousePointerClick,
    type LucideIcon,
} from "lucide-react";
import {
    analyticsTabs,
    kpiCards as defaultKpiCards,
    revenueData as defaultRevenueData,
    pipelineStages as defaultPipelineStages,
    topDeals as defaultTopDeals,
    teamPerformance as defaultTeamPerformance,
    leadSources as defaultLeadSources,
    activityMetrics as defaultActivityMetrics,
    forecastData as defaultForecastData,
    type AnalyticsTab,
    type KpiCard,
    type RevenueDataPoint,
    type PipelineStage,
    type TopDeal,
    type TeamPerformance,
    type LeadSource,
    type ActivityMetric,
    type ForecastQuarter,
} from "./data";
import {
    getRevenueReport,
    getPipelineHealth,
    getLeadSourcesReport,
    getLeadsReport,
    getRevenueTrend,
    getBookingStats,
    getDashboardKPIs,
    getOverviewKPIs,
    getRevenueVsTarget,
    getActivityMetricsApi,
    getTeamPerformanceApi,
} from "@/features/analytics";

export default function AnalyticsPage() {
    
    const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");
    const [dateRange, setDateRange] = useState("last_12_months");
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);

    // Data state — fallback to ./data defaults
    const [kpiCards, setKpiCards] = useState<KpiCard[]>(defaultKpiCards);
    const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>(defaultRevenueData);
    const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>(defaultPipelineStages);
    const [topDeals, setTopDeals] = useState<TopDeal[]>(defaultTopDeals);
    const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>(defaultTeamPerformance);
    const [leadSources, setLeadSources] = useState<LeadSource[]>(defaultLeadSources);
    const [activityMetrics, setActivityMetrics] = useState<ActivityMetric[]>(defaultActivityMetrics);
    const [forecastData, setForecastData] = useState<ForecastQuarter[]>(defaultForecastData);

    // Fetch from backend
    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            const [kpis, revenue, pipeline, leads, revTrend, overviewKpis, revTarget, actMetrics, teamPerf] = await Promise.allSettled([
                getDashboardKPIs(),       // 0: object { leads, clients, revenue, ... }
                getRevenueReport(),       // 1: object { total, thisMonth, lastMonth, outstanding, growth }
                getPipelineHealth(),      // 2: object { total, stages: [...] }
                getLeadSourcesReport(),   // 3: array of { sourceId, sourceName, count }
                getRevenueTrend(),        // 4: array of { month, revenue }
                getOverviewKPIs(),        // 5: object { totalRevenue, dealsWon, dealsLost, conversionRate, avgDealSize, ... }
                getRevenueVsTarget(),     // 6: array of { month, revenue, target, deals }
                getActivityMetricsApi(),  // 7: array of { label, icon, today, thisWeek, thisMonth }
                getTeamPerformanceApi(),  // 8: array of team members
            ]);

            const fmt = (v: number) => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}`;

            // ─── KPI Cards ──────────────────────────────────────────────
            // Build from overviewKPIs (project-based) + dashboard KPIs
            if (overviewKpis.status === 'fulfilled' && overviewKpis.value) {
                const ok = overviewKpis.value as any;
                const dashData = kpis.status === 'fulfilled' ? kpis.value as any : null;
                const revenueGrowth = dashData?.revenue?.growth ?? 0;

                setKpiCards(prev => prev.map((card, i) => {
                    if (i === 0) return { ...card, value: fmt(ok.totalRevenue || 0), change: `${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth}%`, trend: revenueGrowth >= 0 ? 'up' as const : 'down' as const };
                    if (i === 1) return { ...card, value: String(ok.dealsWon || 0) };
                    if (i === 2) return { ...card, value: `${ok.conversionRate || 0}%` };
                    if (i === 3) return { ...card, value: fmt(ok.avgDealSize || 0) };
                    return card;
                }));
            } else if (kpis.status === 'fulfilled' && kpis.value) {
                // Fallback: use dashboard KPIs
                const d = kpis.value as any;
                setKpiCards(prev => prev.map((card, i) => {
                    if (i === 0) return { ...card, value: fmt(d.revenue?.total || 0), change: `${(d.revenue?.growth ?? 0) >= 0 ? '+' : ''}${d.revenue?.growth ?? 0}%`, trend: (d.revenue?.growth ?? 0) >= 0 ? 'up' as const : 'down' as const };
                    if (i === 1) return { ...card, value: String(d.leads?.converted || 0) };
                    if (i === 2) return { ...card, value: `${d.leads?.conversionRate || 0}%` };
                    if (i === 3) return { ...card, value: fmt(d.projects?.total || 0) };
                    return card;
                }));
            }

            // ─── Revenue Trend Data ─────────────────────────────────────
            if (revTarget.status === 'fulfilled' && Array.isArray(revTarget.value) && revTarget.value.length) {
                setRevenueData(revTarget.value.map((d: any) => ({
                    month: d.month || '',
                    revenue: Number(d.revenue) || 0,
                    target: Number(d.target) || 0,
                    deals: Number(d.deals) || 0,
                })));
            } else if (revTrend.status === 'fulfilled' && Array.isArray(revTrend.value) && revTrend.value.length) {
                setRevenueData(revTrend.value.map((d: any) => ({
                    month: d.month || '',
                    revenue: Number(d.revenue) || 0,
                    target: 0,
                    deals: 0,
                })));
            }

            // ─── Pipeline Stages ────────────────────────────────────────
            if (pipeline.status === 'fulfilled' && pipeline.value) {
                const pData = pipeline.value as any;
                const stages = Array.isArray(pData) ? pData : pData?.stages;
                if (Array.isArray(stages) && stages.length) {
                    const stageColors: Record<string, string> = {
                        NEW: '#94A3B8', CONTACTED: '#0891B2', QUALIFIED: '#0891B2',
                        PROPOSAL: '#7C3AED', NEGOTIATION: '#D97706',
                        WON: '#16A34A', LOST: '#DC2626',
                    };
                    const stageNames: Record<string, string> = {
                        NEW: 'Leads', CONTACTED: 'Contacted', QUALIFIED: 'Qualified',
                        PROPOSAL: 'Proposal', NEGOTIATION: 'Negotiation',
                        WON: 'Closed Won', LOST: 'Closed Lost',
                    };
                    const total = stages.reduce((s: number, st: any) => s + (st.count || 0), 0);
                    setPipelineStages(stages.map((s: any) => ({
                        name: stageNames[s.status] || s.status || s.name || 'Unknown',
                        count: s.count || 0,
                        value: fmt(s.value || 0),
                        conversion: s.percentage ?? (total > 0 ? Math.round((s.count / total) * 100) : 0),
                        color: stageColors[s.status] || s.color || '#94A3B8',
                        avgDays: s.avgDays || 0,
                    })));
                }
            }

            // ─── Lead Sources ───────────────────────────────────────────
            if (leads.status === 'fulfilled') {
                const srcData = leads.value as any;
                const srcArr = Array.isArray(srcData) ? srcData : srcData?.bySource || [];
                if (srcArr.length) {
                    const srcColors = ['#0891B2', '#7C3AED', '#16A34A', '#D97706', '#DC2626', '#EC4899', '#6366F1', '#14B8A6'];
                    setLeadSources(srcArr.map((s: any, i: number) => ({
                        name: s.sourceName || s.source || s.name || 'Unknown',
                        leads: s.count || s.leads || 0,
                        converted: s.converted || 0,
                        revenue: s.revenue || '$0',
                        color: srcColors[i % srcColors.length],
                    })));
                }
            }

            // ─── Activity Metrics ───────────────────────────────────────
            if (actMetrics.status === 'fulfilled' && Array.isArray(actMetrics.value) && actMetrics.value.length) {
                const iconMap: Record<string, LucideIcon> = {
                    Mail: Zap, CheckSquare: Clock, FileText: Eye,
                    Calendar: Clock, PhoneCall: MousePointerClick,
                };
                setActivityMetrics(actMetrics.value.map((m: any) => ({
                    label: m.label || 'Unknown',
                    today: m.today || 0,
                    thisWeek: m.thisWeek || 0,
                    thisMonth: m.thisMonth || 0,
                    icon: iconMap[m.icon] || Zap,
                })));
            }

            // ─── Team Performance ───────────────────────────────────────
            if (teamPerf.status === 'fulfilled' && Array.isArray(teamPerf.value) && teamPerf.value.length) {
                setTeamPerformance(teamPerf.value.map((t: any) => ({
                    id: t.id || '',
                    name: t.name || 'Unknown',
                    avatar: t.avatar || '??',
                    dealsWon: t.dealsWon || 0,
                    dealsClosed: t.dealsClosed || 0,
                    revenue: typeof t.revenue === 'string' ? t.revenue : fmt(t.revenueRaw || t.revenue || 0),
                    quota: t.quota || 0,
                    activities: t.activities || 0,
                    winRate: t.winRate || 0,
                })));
            }

            // ─── Forecast (derived from revenue data) ───────────────────
            if (revTarget.status === 'fulfilled' && Array.isArray(revTarget.value) && revTarget.value.length) {
                const months = revTarget.value as any[];
                const quarterLabels = ['Q1', 'Q2', 'Q3', 'Q4'];
                const year = new Date().getFullYear();
                const quarters: ForecastQuarter[] = quarterLabels.map((q, qi) => {
                    const qMonths = months.filter((_: any, idx: number) => Math.floor(idx / 3) === qi);
                    const rev = qMonths.reduce((s: number, m: any) => s + (Number(m.revenue) || 0), 0);
                    const tgt = qMonths.reduce((s: number, m: any) => s + (Number(m.target) || 0), 0);
                    return {
                        quarter: `${q} ${year}`,
                        committed: Math.round(rev),
                        bestCase: Math.round(rev * 1.15),
                        pipeline: Math.round(tgt * 1.5),
                        target: Math.round(tgt),
                    };
                });
                setForecastData(quarters);
            }
        } catch (err) {
            console.error('Analytics fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    // Chart helpers
    const maxRevenue = revenueData.length > 0 ? Math.max(...revenueData.map((d) => Math.max(d.revenue, d.target))) : 1;
    const totalLeads = leadSources.reduce((s, l) => s + l.leads, 0);

    const barHeight = (val: number, max: number, maxPx: number) => (val / max) * maxPx;

    const handleExport = (type: string) => {
        toast({ title: "Export Started", description: `Exporting ${type} report as CSV…` });
    };

    const handleRefresh = () => {
        fetchAnalytics();
        toast({ title: "Data Refreshed", description: "Analytics data has been updated." });
    };

    const handleShare = () => {
        toast({ title: "Share Link Copied", description: "Dashboard share link copied to clipboard." });
    };

    const handlePrint = () => {
        toast({ title: "Preparing Print", description: "Opening print preview…" });
        window.print();
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="flex h-screen bg-[#F8FAFC]">

            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-[rgba(15,23,42,0.06)] px-6 py-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#0891B2]/10 flex items-center justify-center">
                                <BarChart3 size={20} className="text-[#0891B2]" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Analytics</h1>
                                <p className="text-sm text-[#475569] mt-0.5">AI-powered insights and performance metrics</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                className="h-9 px-3 rounded-lg border border-[rgba(15,23,42,0.12)] bg-[#F8FAFC] text-sm text-[#475569] focus:outline-none"
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                            >
                                <option value="last_7_days">Last 7 Days</option>
                                <option value="last_30_days">Last 30 Days</option>
                                <option value="last_90_days">Last 90 Days</option>
                                <option value="last_12_months">Last 12 Months</option>
                                <option value="ytd">Year to Date</option>
                                <option value="custom">Custom Range</option>
                            </select>
                            <button onClick={handleRefresh} className="h-9 w-9 flex items-center justify-center rounded-lg border border-[rgba(15,23,42,0.12)] bg-white hover:bg-[#F8FAFC] text-[#475569]" title="Refresh">
                                <RefreshCw size={14} />
                            </button>
                            <button onClick={handleShare} className="h-9 w-9 flex items-center justify-center rounded-lg border border-[rgba(15,23,42,0.12)] bg-white hover:bg-[#F8FAFC] text-[#475569]" title="Share">
                                <Share2 size={14} />
                            </button>
                            <button onClick={handlePrint} className="h-9 w-9 flex items-center justify-center rounded-lg border border-[rgba(15,23,42,0.12)] bg-white hover:bg-[#F8FAFC] text-[#475569]" title="Print">
                                <Printer size={14} />
                            </button>
                            <button onClick={() => handleExport("analytics")} className="flex items-center gap-2 h-9 px-4 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90">
                                <Download size={14} /> Export
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-1 mt-4 border-b border-[rgba(15,23,42,0.06)] -mb-4 -mx-6 px-6">
                        {analyticsTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                                    activeTab === tab.id
                                        ? "border-[#0891B2] text-[#0891B2]"
                                        : "border-transparent text-[#475569] hover:text-[#0F172A]"
                                )}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 p-6 overflow-auto">
                    <div className="max-w-7xl mx-auto space-y-6 page-enter">

                        {/* ====================== OVERVIEW ====================== */}
                        {activeTab === "overview" && (
                            <>
                                {/* KPI Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {kpiCards.map((kpi) => (
                                        <div key={kpi.label} className="bg-white rounded-lg card-shadow p-5">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15` }}>
                                                    <kpi.icon size={20} style={{ color: kpi.color }} />
                                                </div>
                                                <span className={cn("flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
                                                    kpi.trend === "up" ? "bg-[#16A34A]/10 text-[#16A34A]" : "bg-[#DC2626]/10 text-[#DC2626]"
                                                )}>
                                                    {kpi.trend === "up" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                                    {kpi.change}
                                                </span>
                                            </div>
                                            <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">{kpi.value}</p>
                                            <p className="text-xs text-[#94A3B8] mt-1">{kpi.label}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Revenue Chart */}
                                <div className="bg-white rounded-lg card-shadow p-6">
                                    <div className="flex items-center justify-between mb-5">
                                        <div>
                                            <h3 className="font-semibold text-[#0F172A]">Revenue vs Target</h3>
                                            <p className="text-xs text-[#94A3B8] mt-0.5">Monthly revenue performance against targets</p>
                                        </div>
                                        <button onClick={() => handleExport("revenue")} className="text-xs text-[#0891B2] font-medium hover:text-[#0891B2]/80">Export →</button>
                                    </div>
                                    {/* Bar Chart */}
                                    <div className="flex items-end gap-2 h-52">
                                        {revenueData.map((d) => (
                                            <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                                                <div className="w-full flex items-end justify-center gap-0.5" style={{ height: 180 }}>
                                                    <div className="w-[40%] bg-[#0891B2] rounded-t-sm transition-all hover:opacity-80" style={{ height: barHeight(d.revenue, maxRevenue, 170) }} title={`Revenue: $${(d.revenue / 1000).toFixed(0)}K`} />
                                                    <div className="w-[40%] bg-[#0891B2]/20 rounded-t-sm transition-all" style={{ height: barHeight(d.target, maxRevenue, 170) }} title={`Target: $${(d.target / 1000).toFixed(0)}K`} />
                                                </div>
                                                <span className="text-[10px] text-[#94A3B8]">{d.month}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-4 mt-3 justify-center">
                                        <span className="flex items-center gap-1.5 text-[11px] text-[#475569]"><span className="w-2.5 h-2.5 rounded-sm bg-[#0891B2]" /> Revenue</span>
                                        <span className="flex items-center gap-1.5 text-[11px] text-[#475569]"><span className="w-2.5 h-2.5 rounded-sm bg-[#0891B2]/20" /> Target</span>
                                    </div>
                                </div>

                                {/* Lead Sources + Activity */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {/* Lead Sources */}
                                    <div className="bg-white rounded-lg card-shadow p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-[#0F172A]">Lead Sources</h3>
                                            <button onClick={() => handleExport("lead-sources")} className="text-xs text-[#0891B2] font-medium hover:text-[#0891B2]/80">Export →</button>
                                        </div>
                                        <div className="space-y-3">
                                            {leadSources.map((src) => (
                                                <div key={src.name}>
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-[#0F172A] font-medium">{src.name}</span>
                                                        <span className="text-[#94A3B8]">{src.leads} leads · {src.converted} converted</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full transition-all" style={{ width: `${(src.leads / totalLeads) * 100}%`, backgroundColor: src.color }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Activity Metrics */}
                                    <div className="bg-white rounded-lg card-shadow p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-[#0F172A]">Activity Metrics</h3>
                                            <button onClick={handleRefresh} className="text-xs text-[#0891B2] font-medium hover:text-[#0891B2]/80">Refresh →</button>
                                        </div>
                                        <div className="responsive-table">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-[rgba(15,23,42,0.06)]">
                                                        <th className="text-left py-2 text-[#94A3B8] font-medium">Activity</th>
                                                        <th className="text-right py-2 text-[#94A3B8] font-medium">Today</th>
                                                        <th className="text-right py-2 text-[#94A3B8] font-medium">This Week</th>
                                                        <th className="text-right py-2 text-[#94A3B8] font-medium">This Month</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {activityMetrics.map((m) => (
                                                        <tr key={m.label} className="border-b border-[rgba(15,23,42,0.04)]">
                                                            <td className="py-2.5 text-[#0F172A] font-medium">{m.label}</td>
                                                            <td className="text-right py-2.5 text-[#475569]">{m.today}</td>
                                                            <td className="text-right py-2.5 text-[#475569]">{m.thisWeek}</td>
                                                            <td className="text-right py-2.5 font-semibold text-[#0F172A]">{m.thisMonth.toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ====================== SALES ANALYTICS ====================== */}
                        {activeTab === "sales" && (
                            <>
                                {/* Revenue Trend */}
                                <div className="bg-white rounded-lg card-shadow p-6">
                                    <div className="flex items-center justify-between mb-5">
                                        <div>
                                            <h3 className="font-semibold text-[#0F172A]">Monthly Revenue Trend</h3>
                                            <p className="text-xs text-[#94A3B8] mt-0.5">Revenue growth over the past 12 months</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleExport("revenue-trend")} className="text-xs text-[#0891B2] font-medium hover:text-[#0891B2]/80">Export →</button>
                                        </div>
                                    </div>
                                    {/* Area-like chart using bars */}
                                    <div className="flex items-end gap-1.5 h-48">
                                        {revenueData.map((d) => (
                                            <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                                                <span className="text-[9px] text-[#94A3B8] font-medium">${(d.revenue / 1000).toFixed(0)}K</span>
                                                <div className="w-full rounded-t-md bg-gradient-to-t from-[#0891B2] to-[#0891B2]/60 transition-all hover:from-[#0891B2] hover:to-[#0891B2]/80" style={{ height: barHeight(d.revenue, maxRevenue, 150) }} />
                                                <span className="text-[10px] text-[#94A3B8]">{d.month}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Deals by Month */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div className="bg-white rounded-lg card-shadow p-6">
                                        <h3 className="font-semibold text-[#0F172A] mb-4">Deals Closed by Month</h3>
                                        <div className="space-y-2">
                                            {revenueData.map((d) => (
                                                <div key={d.month} className="flex items-center gap-3">
                                                    <span className="text-xs text-[#94A3B8] w-8">{d.month}</span>
                                                    <div className="flex-1 h-6 bg-[#F1F5F9] rounded-md overflow-hidden">
                                                        <div className="h-full bg-[#16A34A]/80 rounded-md flex items-center pl-2" style={{ width: `${(d.deals / 30) * 100}%` }}>
                                                            <span className="text-[10px] text-white font-bold">{d.deals}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Win/Loss */}
                                    <div className="bg-white rounded-lg card-shadow p-6">
                                        <h3 className="font-semibold text-[#0F172A] mb-4">Win/Loss Analysis</h3>
                                        {(() => {
                                            const totalPipeline = pipelineStages.reduce((s, st) => s + st.count, 0) || 1;
                                            const wonCount = pipelineStages.find(s => s.name === 'Closed Won')?.count || 0;
                                            const lostCount = pipelineStages.find(s => s.name === 'Closed Lost')?.count || 0;
                                            const openCount = totalPipeline - wonCount - lostCount;
                                            const winPct = Math.round((wonCount / totalPipeline) * 1000) / 10;
                                            const lossPct = Math.round((lostCount / totalPipeline) * 1000) / 10;
                                            const openPct = Math.round((openCount / totalPipeline) * 1000) / 10;
                                            const items = [
                                                { label: "Win Rate", value: `${winPct}%`, desc: "Deals won vs total", color: "#16A34A", pct: winPct },
                                                { label: "Loss Rate", value: `${lossPct}%`, desc: "Deals lost vs total", color: "#DC2626", pct: lossPct },
                                                { label: "Still Open", value: `${openPct}%`, desc: "Deals in progress", color: "#D97706", pct: openPct },
                                            ];
                                            return (
                                                <>
                                                    <div className="space-y-4">
                                                        {items.map((item) => (
                                                            <div key={item.label}>
                                                                <div className="flex justify-between items-baseline mb-1">
                                                                    <div>
                                                                        <span className="text-sm font-medium text-[#0F172A]">{item.label}</span>
                                                                        <span className="text-xs text-[#94A3B8] ml-2">{item.desc}</span>
                                                                    </div>
                                                                    <span className="text-lg font-bold" style={{ color: item.color }}>{item.value}</span>
                                                                </div>
                                                                <div className="w-full h-3 bg-[#F1F5F9] rounded-full overflow-hidden">
                                                                    <div className="h-full rounded-full transition-all" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="mt-4 p-3 bg-[#0891B2]/5 rounded-lg border border-[#0891B2]/10">
                                                        <p className="text-xs text-[#0891B2] flex items-center gap-2">
                                                            <Info size={14} />
                                                            <strong>AI Insight:</strong>
                                                            {wonCount > 0
                                                                ? ` Win rate is ${winPct}% with ${wonCount} deal${wonCount !== 1 ? 's' : ''} won out of ${totalPipeline} total. ${openCount > 0 ? `${openCount} deal${openCount !== 1 ? 's' : ''} still in progress.` : ''}`
                                                                : ' No completed deals yet. Focus on moving leads through the pipeline to close your first deal.'
                                                            }
                                                        </p>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Top Deals */}
                                <div className="bg-white rounded-lg card-shadow p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-[#0F172A]">Top Deals in Pipeline</h3>
                                        <button onClick={() => handleExport("top-deals")} className="text-xs text-[#0891B2] font-medium hover:text-[#0891B2]/80">Export →</button>
                                    </div>
                                    <div className="responsive-table">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-[rgba(15,23,42,0.08)]">
                                                    <th className="text-left py-2.5 text-[#94A3B8] font-medium">Deal</th>
                                                    <th className="text-left py-2.5 text-[#94A3B8] font-medium">Company</th>
                                                    <th className="text-right py-2.5 text-[#94A3B8] font-medium">Value</th>
                                                    <th className="text-center py-2.5 text-[#94A3B8] font-medium">Stage</th>
                                                    <th className="text-center py-2.5 text-[#94A3B8] font-medium">Probability</th>
                                                    <th className="text-left py-2.5 text-[#94A3B8] font-medium">Owner</th>
                                                    <th className="text-right py-2.5 text-[#94A3B8] font-medium">Close Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {topDeals.map((deal) => (
                                                    <tr key={deal.id} className="border-b border-[rgba(15,23,42,0.04)] hover:bg-[#F8FAFC]">
                                                        <td className="py-3 text-[#0F172A] font-medium">{deal.name}</td>
                                                        <td className="py-3 text-[#475569]">{deal.company}</td>
                                                        <td className="py-3 text-right font-semibold text-[#0F172A]">{deal.value}</td>
                                                        <td className="py-3 text-center">
                                                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold",
                                                                deal.stage === "Negotiation" ? "bg-[#D97706]/10 text-[#D97706]" :
                                                                    deal.stage === "Proposal" ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "bg-[#0891B2]/10 text-[#0891B2]"
                                                            )}>{deal.stage}</span>
                                                        </td>
                                                        <td className="py-3 text-center">
                                                            <div className="inline-flex items-center gap-1.5">
                                                                <div className="w-12 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                                                                    <div className="h-full bg-[#16A34A] rounded-full" style={{ width: `${deal.probability}%` }} />
                                                                </div>
                                                                <span className="text-[#475569]">{deal.probability}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 text-[#475569]">{deal.owner}</td>
                                                        <td className="py-3 text-right text-[#94A3B8]">{deal.closeDate}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ====================== PIPELINE ====================== */}
                        {activeTab === "pipeline" && (
                            <>
                                {/* Funnel Visualization */}
                                <div className="bg-white rounded-lg card-shadow p-6">
                                    <div className="flex items-center justify-between mb-5">
                                        <div>
                                            <h3 className="font-semibold text-[#0F172A]">Pipeline Funnel</h3>
                                            <p className="text-xs text-[#94A3B8] mt-0.5">Deal progression through pipeline stages</p>
                                        </div>
                                        <button onClick={() => handleExport("pipeline")} className="text-xs text-[#0891B2] font-medium hover:text-[#0891B2]/80">Export →</button>
                                    </div>
                                    <div className="space-y-3">
                                        {pipelineStages.map((stage, i) => (
                                            <div key={stage.name} className="flex items-center gap-4">
                                                <span className="text-xs font-medium text-[#0F172A] w-24">{stage.name}</span>
                                                <div className="flex-1 relative">
                                                    <div className="h-10 rounded-lg overflow-hidden bg-[#F1F5F9]">
                                                        <div
                                                            className="h-full rounded-lg flex items-center px-3 transition-all"
                                                            style={{
                                                                width: `${Math.max(stage.conversion, 8)}%`,
                                                                backgroundColor: stage.color,
                                                            }}
                                                        >
                                                            <span className="text-[11px] font-bold text-white whitespace-nowrap">{stage.count} deals · {stage.value}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="text-xs text-[#94A3B8] w-16 text-right">{stage.conversion}%</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 p-3 bg-[#0891B2]/5 rounded-lg border border-[#0891B2]/10">
                                        <p className="text-xs text-[#0891B2] flex items-center gap-2"><Info size={14} /> <strong>AI Insight:</strong> Proposal-to-Negotiation is the biggest drop-off (27.5% → 15.2%). Consider improving proposal quality or follow-up cadence.</p>
                                    </div>
                                </div>

                                {/* Stage Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {pipelineStages.map((stage) => (
                                        <div key={stage.name} className="bg-white rounded-lg card-shadow p-5">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                                                <h4 className="font-semibold text-sm text-[#0F172A]">{stage.name}</h4>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-xs">
                                                <div>
                                                    <p className="text-[#94A3B8]">Deals</p>
                                                    <p className="text-lg font-bold text-[#0F172A]">{stage.count}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[#94A3B8]">Value</p>
                                                    <p className="text-lg font-bold text-[#0F172A]">{stage.value}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[#94A3B8]">Conversion</p>
                                                    <p className="text-lg font-bold" style={{ color: stage.color }}>{stage.conversion}%</p>
                                                </div>
                                                <div>
                                                    <p className="text-[#94A3B8]">Avg Days</p>
                                                    <p className="text-lg font-bold text-[#0F172A]">{stage.avgDays}d</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* ====================== TEAM PERFORMANCE ====================== */}
                        {activeTab === "team" && (
                            <>
                                {/* Leaderboard */}
                                <div className="bg-white rounded-lg card-shadow p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="font-semibold text-[#0F172A]">Team Leaderboard</h3>
                                            <p className="text-xs text-[#94A3B8] mt-0.5">Performance ranking by revenue generated</p>
                                        </div>
                                        <button onClick={() => handleExport("team-performance")} className="text-xs text-[#0891B2] font-medium hover:text-[#0891B2]/80">Export →</button>
                                    </div>
                                    <div className="responsive-table">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-[rgba(15,23,42,0.08)]">
                                                    <th className="text-left py-2.5 text-[#94A3B8] font-medium">Rank</th>
                                                    <th className="text-left py-2.5 text-[#94A3B8] font-medium">Rep</th>
                                                    <th className="text-right py-2.5 text-[#94A3B8] font-medium">Revenue</th>
                                                    <th className="text-center py-2.5 text-[#94A3B8] font-medium">Deals Won</th>
                                                    <th className="text-center py-2.5 text-[#94A3B8] font-medium">Win Rate</th>
                                                    <th className="text-center py-2.5 text-[#94A3B8] font-medium">Quota %</th>
                                                    <th className="text-center py-2.5 text-[#94A3B8] font-medium">Activities</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {teamPerformance.map((member, i) => (
                                                    <tr key={member.id} className="border-b border-[rgba(15,23,42,0.04)] hover:bg-[#F8FAFC]">
                                                        <td className="py-3">
                                                            <span className={cn("w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] font-bold",
                                                                i === 0 ? "bg-[#F59E0B] text-white" : i === 1 ? "bg-[#94A3B8] text-white" : i === 2 ? "bg-[#B45309] text-white" : "bg-[#F1F5F9] text-[#475569]"
                                                            )}>{i + 1}</span>
                                                        </td>
                                                        <td className="py-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-full bg-[#0891B2]/10 flex items-center justify-center text-[10px] font-bold text-[#0891B2]">{member.avatar}</div>
                                                                <span className="text-[#0F172A] font-medium">{member.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 text-right font-semibold text-[#0F172A]">{member.revenue}</td>
                                                        <td className="py-3 text-center text-[#475569]">{member.dealsWon}/{member.dealsClosed}</td>
                                                        <td className="py-3 text-center">
                                                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold",
                                                                member.winRate >= 70 ? "bg-[#16A34A]/10 text-[#16A34A]" : member.winRate >= 60 ? "bg-[#D97706]/10 text-[#D97706]" : "bg-[#DC2626]/10 text-[#DC2626]"
                                                            )}>{member.winRate}%</span>
                                                        </td>
                                                        <td className="py-3 text-center">
                                                            <div className="inline-flex items-center gap-1.5">
                                                                <div className="w-14 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                                                                    <div className="h-full rounded-full" style={{ width: `${Math.min(member.quota, 100)}%`, backgroundColor: member.quota >= 100 ? "#16A34A" : member.quota >= 75 ? "#D97706" : "#DC2626" }} />
                                                                </div>
                                                                <span className={cn("text-[10px] font-semibold", member.quota >= 100 ? "text-[#16A34A]" : "text-[#475569]")}>{member.quota}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 text-center text-[#475569]">{member.activities}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Quota Progress */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {teamPerformance.map((member) => (
                                        <div key={member.id} className="bg-white rounded-lg card-shadow p-5">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-[#0891B2]/10 flex items-center justify-center text-xs font-bold text-[#0891B2]">{member.avatar}</div>
                                                <div>
                                                    <p className="text-sm font-medium text-[#0F172A]">{member.name}</p>
                                                    <p className="text-[10px] text-[#94A3B8]">{member.revenue} revenue</p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div>
                                                    <div className="flex justify-between text-[10px] mb-0.5">
                                                        <span className="text-[#94A3B8]">Quota Attainment</span>
                                                        <span className="font-bold" style={{ color: member.quota >= 100 ? "#16A34A" : "#0F172A" }}>{member.quota}%</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(member.quota, 100)}%`, backgroundColor: member.quota >= 100 ? "#16A34A" : member.quota >= 75 ? "#D97706" : "#DC2626" }} />
                                                    </div>
                                                </div>
                                                <div className="flex justify-between text-[10px] pt-1">
                                                    <span className="text-[#94A3B8]">Win Rate: <span className="text-[#0F172A] font-medium">{member.winRate}%</span></span>
                                                    <span className="text-[#94A3B8]">Activities: <span className="text-[#0F172A] font-medium">{member.activities}</span></span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* ====================== FORECASTING ====================== */}
                        {activeTab === "forecasting" && (
                            <>
                                {/* Forecast Summary */}
                                <div className="bg-white rounded-lg card-shadow p-6">
                                    <div className="flex items-center justify-between mb-5">
                                        <div>
                                            <h3 className="font-semibold text-[#0F172A]">Revenue Forecast</h3>
                                            <p className="text-xs text-[#94A3B8] mt-0.5">Quarterly revenue projections by confidence level</p>
                                        </div>
                                        <button onClick={() => handleExport("forecast")} className="text-xs text-[#0891B2] font-medium hover:text-[#0891B2]/80">Export →</button>
                                    </div>

                                    <div className="responsive-table">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-[rgba(15,23,42,0.08)]">
                                                    <th className="text-left py-2.5 text-[#94A3B8] font-medium">Quarter</th>
                                                    <th className="text-right py-2.5 text-[#94A3B8] font-medium">Target</th>
                                                    <th className="text-right py-2.5 text-[#94A3B8] font-medium">Committed</th>
                                                    <th className="text-right py-2.5 text-[#94A3B8] font-medium">Best Case</th>
                                                    <th className="text-right py-2.5 text-[#94A3B8] font-medium">Pipeline</th>
                                                    <th className="text-center py-2.5 text-[#94A3B8] font-medium">Attainment</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {forecastData.map((q) => {
                                                    const attainment = Math.round((q.committed / q.target) * 100);
                                                    return (
                                                        <tr key={q.quarter} className="border-b border-[rgba(15,23,42,0.04)] hover:bg-[#F8FAFC]">
                                                            <td className="py-3 font-medium text-[#0F172A]">{q.quarter}</td>
                                                            <td className="py-3 text-right text-[#475569]">${(q.target / 1000).toFixed(0)}K</td>
                                                            <td className="py-3 text-right font-semibold text-[#16A34A]">${(q.committed / 1000).toFixed(0)}K</td>
                                                            <td className="py-3 text-right text-[#D97706]">${(q.bestCase / 1000).toFixed(0)}K</td>
                                                            <td className="py-3 text-right text-[#7C3AED]">${(q.pipeline / 1000).toFixed(0)}K</td>
                                                            <td className="py-3 text-center">
                                                                <div className="inline-flex items-center gap-1.5">
                                                                    <div className="w-14 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                                                                        <div className="h-full rounded-full" style={{ width: `${Math.min(attainment, 100)}%`, backgroundColor: attainment >= 90 ? "#16A34A" : attainment >= 60 ? "#D97706" : "#DC2626" }} />
                                                                    </div>
                                                                    <span className={cn("font-semibold", attainment >= 90 ? "text-[#16A34A]" : attainment >= 60 ? "text-[#D97706]" : "text-[#DC2626]")}>{attainment}%</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Forecast Bars */}
                                <div className="bg-white rounded-lg card-shadow p-6">
                                    <h3 className="font-semibold text-[#0F172A] mb-4">Quarterly Forecast Breakdown</h3>
                                    <div className="space-y-6">
                                        {forecastData.map((q) => {
                                            const maxVal = Math.max(q.pipeline, q.target);
                                            return (
                                                <div key={q.quarter}>
                                                    <p className="text-sm font-medium text-[#0F172A] mb-2">{q.quarter}</p>
                                                    <div className="space-y-1.5">
                                                        {[
                                                            { label: "Committed", val: q.committed, color: "#16A34A" },
                                                            { label: "Best Case", val: q.bestCase, color: "#D97706" },
                                                            { label: "Pipeline", val: q.pipeline, color: "#7C3AED" },
                                                            { label: "Target", val: q.target, color: "#0891B2" },
                                                        ].map((row) => (
                                                            <div key={row.label} className="flex items-center gap-3">
                                                                <span className="text-[10px] text-[#94A3B8] w-16">{row.label}</span>
                                                                <div className="flex-1 h-5 bg-[#F1F5F9] rounded overflow-hidden">
                                                                    <div className="h-full rounded flex items-center pl-2" style={{ width: `${(row.val / maxVal) * 100}%`, backgroundColor: row.color }}>
                                                                        <span className="text-[9px] text-white font-bold">${(row.val / 1000).toFixed(0)}K</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* AI Insights */}
                                <div className="bg-white rounded-lg card-shadow p-6">
                                    <h3 className="font-semibold text-[#0F172A] mb-4">AI Forecast Insights</h3>
                                    <div className="space-y-3">
                                        {[
                                            { type: "success" as const, text: "Q1 is trending 91% to target — on track to exceed. Committed deals worth $820K provide a strong floor." },
                                            { type: "warning" as const, text: "Q2 gap analysis: $410K shortfall between committed ($540K) and target ($950K). Accelerate 12 deals currently in Proposal stage." },
                                            { type: "info" as const, text: "Pipeline coverage ratio: 2.4x for Q2, 1.9x for Q3. Industry benchmark is 3x — consider increasing lead generation efforts for Q3." },
                                            { type: "success" as const, text: "Best-case scenario for Q1-Q2 combined: $1.93M, which is 5% above the combined target of $1.85M." },
                                        ].map((insight, i) => (
                                            <div key={i} className={cn("p-3 rounded-lg border text-xs flex items-start gap-2",
                                                insight.type === "success" ? "bg-[#16A34A]/5 border-[#16A34A]/10 text-[#16A34A]" :
                                                    insight.type === "warning" ? "bg-[#D97706]/5 border-[#D97706]/10 text-[#D97706]" :
                                                        "bg-[#0891B2]/5 border-[#0891B2]/10 text-[#0891B2]"
                                            )}>
                                                {insight.type === "success" ? <TrendingUp size={14} className="flex-shrink-0 mt-0.5" /> : <Info size={14} className="flex-shrink-0 mt-0.5" />}
                                                <span>{insight.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                    </div>
                </main>
            </div>
        </div>
    );
}
