import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  BarChart3, Target, Clock, Download, Filter,
  ChevronDown, Users, DollarSign,
  Loader2, RefreshCw, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import {
  getSalesSummary, getSalesRepPerformance, getRevenueOverTime,
  getSalesReps, exportReportCsv,
  type SalesSummary, type SalesRepPerformance, type RevenueDataPoint, type SalesRep,
} from "@/features/reports/services/reports-service";

// ─── Date preset helpers ────────────────────────────────────────────────────────

type DatePreset = "7d" | "30d" | "90d" | "1y" | "all" | "custom";

const presets: { id: DatePreset; label: string }[] = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "1y", label: "Last year" },
  { id: "all", label: "All time" },
];

function getDateRange(preset: DatePreset): { dateFrom?: string; dateTo?: string } {
  if (preset === "all") return {};
  const now = new Date();
  const from = new Date();
  if (preset === "7d") from.setDate(now.getDate() - 7);
  else if (preset === "30d") from.setDate(now.getDate() - 30);
  else if (preset === "90d") from.setDate(now.getDate() - 90);
  else if (preset === "1y") from.setFullYear(now.getFullYear() - 1);
  return { dateFrom: from.toISOString().split("T")[0], dateTo: now.toISOString().split("T")[0] };
}

// ─── Formatters ─────────────────────────────────────────────────────────────────

function formatCurrency(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toLocaleString()}`;
}

function formatNumber(v: number): string {
  return v.toLocaleString();
}

// ─── Chart colors ───────────────────────────────────────────────────────────────

const BAR_COLORS = ["#0891B2", "#0E7490", "#14B8A6", "#06B6D4", "#22D3EE", "#67E8F9", "#0D9488", "#2DD4BF"];

// ─── Component ──────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const location = useLocation();
  const isRevenueReport = location.pathname.includes("/reports/revenue");

  // State
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedRep, setSelectedRep] = useState("");
  const [granularity, setGranularity] = useState<"week" | "month">("month");
  const [sortField, setSortField] = useState<keyof SalesRepPerformance>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Data
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [repPerf, setRepPerf] = useState<SalesRepPerformance[]>([]);
  const [revOverTime, setRevOverTime] = useState<RevenueDataPoint[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [exporting, setExporting] = useState(false);

  // Filters
  const filters = useMemo(() => {
    const range = datePreset === "custom" ? { dateFrom: customFrom || undefined, dateTo: customTo || undefined } : getDateRange(datePreset);
    return { ...range, salesRepId: selectedRep || undefined, granularity };
  }, [datePreset, customFrom, customTo, selectedRep, granularity]);

  // Fetch data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r, rot, reps] = await Promise.all([
        getSalesSummary(filters),
        getSalesRepPerformance(filters),
        getRevenueOverTime(filters),
        getSalesReps(),
      ]);
      setSummary(s);
      setRepPerf(r);
      setRevOverTime(rot);
      setSalesReps(reps);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  // Sorted rep performance
  const sortedReps = useMemo(() => {
    return [...repPerf].sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      if (typeof aVal === "string" && typeof bVal === "string") return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [repPerf, sortField, sortDir]);

  const handleSort = (field: keyof SalesRepPerformance) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportReportCsv(filters, isRevenueReport ? "revenue" : "sales");
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  // Stat cards config
  const totalRevenueFromSeries = useMemo(
    () => revOverTime.reduce((sum, point) => sum + point.revenue, 0),
    [revOverTime],
  );
  const totalCompletedFromSeries = useMemo(
    () => revOverTime.reduce((sum, point) => sum + point.count, 0),
    [revOverTime],
  );
  const topRevenueRep = useMemo(
    () => [...repPerf].sort((left, right) => right.revenue - left.revenue)[0] || null,
    [repPerf],
  );

  const statCards = summary
    ? (
        isRevenueReport
          ? [
              { label: "Total Revenue", value: formatCurrency(totalRevenueFromSeries), icon: DollarSign, color: "text-[#16A34A]", bg: "bg-[#16A34A]/10", change: `${revOverTime.length} period${revOverTime.length === 1 ? "" : "s"}` },
              { label: "Closed Jobs", value: formatNumber(totalCompletedFromSeries), icon: Target, color: "text-[#0891B2]", bg: "bg-[#0891B2]/10", change: `${repPerf.filter((rep) => rep.revenue > 0).length} active reps` },
              { label: "Avg Deal Size", value: formatCurrency(totalCompletedFromSeries > 0 ? totalRevenueFromSeries / totalCompletedFromSeries : 0), icon: BarChart3, color: "text-[#D97706]", bg: "bg-[#D97706]/10", change: `${summary.openProjects} open jobs` },
              { label: "Top Revenue Rep", value: topRevenueRep ? formatCurrency(topRevenueRep.revenue) : "$0", icon: Users, color: "text-[#7C3AED]", bg: "bg-[#7C3AED]/10", change: topRevenueRep?.name || "No revenue yet" },
            ]
          : [
              { label: "Total Projects", value: formatNumber(summary.totalProjects), icon: BarChart3, color: "text-[#0891B2]", bg: "bg-[#0891B2]/10", change: `${summary.openProjects} open` },
              { label: "Revenue Generated", value: formatCurrency(summary.totalRevenue), icon: DollarSign, color: "text-[#16A34A]", bg: "bg-[#16A34A]/10", change: `${summary.completedProjects} won` },
              { label: "Win Rate", value: `${summary.winRate}%`, icon: Target, color: "text-[#D97706]", bg: "bg-[#D97706]/10", change: `${summary.cancelledProjects} lost` },
              { label: "Avg Deal Cycle", value: `${summary.avgDealCycle} days`, icon: Clock, color: "text-[#7C3AED]", bg: "bg-[#7C3AED]/10", change: `$${formatNumber(summary.avgDealSize)} avg size` },
            ]
      )
    : [];

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#0891B2]/10">
              <BarChart3 size={22} className="text-[#0891B2]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0F172A] sm:text-2xl">{isRevenueReport ? "Revenue Report" : "Sales Performance"}</h1>
              <p className="text-sm text-[#64748B]">
                {isRevenueReport ? "Revenue trends across completed jobs and top-producing reps" : "Real-time insights across your pipeline"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-[rgba(15,23,42,0.06)] bg-white px-3 py-2 text-sm font-medium text-[#0F172A] shadow-sm transition hover:shadow-md disabled:opacity-50">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button onClick={handleExport} disabled={exporting} className="inline-flex items-center gap-2 rounded-md bg-[#0891B2] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0E7490] disabled:opacity-50">
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-[#475569]">
            <Filter size={14} /> Filters
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                  datePreset === p.id ? "bg-[#0891B2] text-white" : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]",
                )}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setDatePreset("custom")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                datePreset === "custom" ? "bg-[#0891B2] text-white" : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]",
              )}
            >
              Custom
            </button>
          </div>
          {datePreset === "custom" && (
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] px-3 py-1.5 text-xs text-[#0F172A]" />
              <span className="text-xs text-[#94A3B8]">to</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] px-3 py-1.5 text-xs text-[#0F172A]" />
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <select
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
              className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] px-3 py-1.5 text-xs text-[#0F172A]"
            >
              <option value="">All Sales Reps</option>
              {salesReps.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[#0891B2]" />
          </div>
        )}

        {!loading && summary && (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((card, idx) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-5 shadow-sm transition-all hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-md", card.bg)}>
                      <card.icon size={20} className={card.color} />
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-medium text-[#64748B]">
                      {card.change}
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-bold text-[#0F172A]">{card.value}</p>
                  <p className="mt-1 text-xs text-[#94A3B8]">{card.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* Revenue Over Time */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-6 shadow-sm transition-all hover:shadow-lg"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[#0F172A]">Revenue Over Time</h3>
                    <p className="mt-0.5 text-xs text-[#94A3B8]">
                      {isRevenueReport ? "Recognized revenue from completed jobs by period" : "Completed project revenue by period"}
                    </p>
                  </div>
                  <div className="flex gap-1 rounded-md border border-[rgba(15,23,42,0.06)] p-0.5">
                    <button onClick={() => setGranularity("week")} className={cn("rounded px-2 py-1 text-[10px] font-medium transition", granularity === "week" ? "bg-[#0891B2] text-white" : "text-[#64748B] hover:bg-[#F1F5F9]")}>Week</button>
                    <button onClick={() => setGranularity("month")} className={cn("rounded px-2 py-1 text-[10px] font-medium transition", granularity === "month" ? "bg-[#0891B2] text-white" : "text-[#64748B] hover:bg-[#F1F5F9]")}>Month</button>
                  </div>
                </div>
                {revOverTime.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={revOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
                      <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ background: "#fff", border: "1px solid rgba(15,23,42,0.06)", borderRadius: 6, fontSize: 12 }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="#0891B2" strokeWidth={2.5} dot={{ r: 4, fill: "#0891B2" }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-sm text-[#94A3B8]">No revenue data for this period</div>
                )}
              </motion.div>

              {/* Win Rate by Rep */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-6 shadow-sm transition-all hover:shadow-lg"
              >
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-[#0F172A]">
                    {isRevenueReport ? "Revenue by Sales Rep" : "Win Rate by Sales Rep"}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#94A3B8]">
                    {isRevenueReport ? "Top-producing reps ranked by closed revenue" : "Percentage of closed deals won per rep"}
                  </p>
                </div>
                {repPerf.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={repPerf.slice(0, 8)} layout="vertical" margin={{ left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" horizontal={false} />
                      <XAxis
                        type="number"
                        domain={isRevenueReport ? [0, "auto"] : [0, 100]}
                        tick={{ fontSize: 11, fill: "#94A3B8" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => (isRevenueReport ? formatCurrency(v) : `${v}%`)}
                      />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} tickLine={false} axisLine={false} width={100} />
                      <Tooltip
                        contentStyle={{ background: "#fff", border: "1px solid rgba(15,23,42,0.06)", borderRadius: 6, fontSize: 12 }}
                        formatter={(value: number) => [isRevenueReport ? `$${value.toLocaleString()}` : `${value}%`, isRevenueReport ? "Revenue" : "Win Rate"]}
                      />
                      <Bar dataKey={isRevenueReport ? "revenue" : "winRate"} radius={[0, 4, 4, 0]} barSize={20}>
                        {repPerf.slice(0, 8).map((_, i) => (
                          <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-sm text-[#94A3B8]">No rep data available</div>
                )}
              </motion.div>
            </div>

            {/* Sales Rep Performance Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white shadow-sm transition-all hover:shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-[rgba(15,23,42,0.06)] px-6 py-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F172A]">
                    {isRevenueReport ? "Revenue by Sales Rep" : "Sales Rep Performance"}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#94A3B8]">
                    {repPerf.length} reps · Sorted by {sortField}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#94A3B8]">
                  <Users size={12} /> Click headers to sort
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(15,23,42,0.06)] bg-[#F8FAFC]">
                      {(
                        [
                          { key: "name", label: "Rep Name" },
                          { key: "totalProjects", label: "Total" },
                          { key: "wonProjects", label: "Won" },
                          { key: "lostProjects", label: "Lost" },
                          { key: "openProjects", label: "Open" },
                          { key: "winRate", label: "Win Rate" },
                          { key: "revenue", label: "Revenue" },
                          { key: "avgDealSize", label: "Avg Size" },
                          { key: "pipeline", label: "Pipeline" },
                        ] as { key: keyof SalesRepPerformance; label: string }[]
                      ).map((col) => (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className="cursor-pointer whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#64748B] transition hover:text-[#0891B2]"
                        >
                          <span className="inline-flex items-center gap-1">
                            {col.label}
                            {sortField === col.key && (
                              <ChevronDown size={12} className={cn("transition", sortDir === "asc" && "rotate-180")} />
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedReps.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-sm text-[#94A3B8]">
                          No sales rep data found for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      sortedReps.map((rep) => (
                        <tr key={rep.salesRepId} className="border-b border-[rgba(15,23,42,0.06)] transition hover:bg-[#F8FAFC]">
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0891B2]/10 text-xs font-semibold text-[#0891B2]">
                                {rep.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                              </div>
                              <span className="font-medium text-[#0F172A]">{rep.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[#475569]">{rep.totalProjects}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-[#16A34A]">
                              <ArrowUpRight size={12} /> {rep.wonProjects}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-[#DC2626]">
                              <ArrowDownRight size={12} /> {rep.lostProjects}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#475569]">{rep.openProjects}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#F1F5F9]">
                                <div className="h-full rounded-full bg-[#0891B2] transition-all" style={{ width: `${Math.min(rep.winRate, 100)}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-[#0F172A]">{rep.winRate}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#0F172A]">{formatCurrency(rep.revenue)}</td>
                          <td className="px-4 py-3 text-[#475569]">{formatCurrency(rep.avgDealSize)}</td>
                          <td className="px-4 py-3 text-[#475569]">{formatCurrency(rep.pipeline)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
