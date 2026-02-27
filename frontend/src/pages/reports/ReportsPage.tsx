import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
    Download, RefreshCw, Share2, Printer, Filter, Plus,
    ArrowUpRight, ArrowDownRight, CheckCircle2, Clock,
    XCircle, Play, Trash2, Copy, Calendar, Search,
    BarChart3, Info, Eye, Pencil,
} from "lucide-react";
import {
    reportTabs, salesReps, salesKpis, revenueData, revenueKpis,
    expenseRows, expenseCategories, expenseKpis,
    customReportTemplates,
    type ReportTab, type ExpenseRow,
} from "./data";

export default function ReportsPage() {
    
    const [activeTab, setActiveTab] = useState<ReportTab>("sales");
    const { toast } = useToast();
    const location = useLocation();

    // Sync tab from URL
    useEffect(() => {
        const tabMap: Record<string, ReportTab> = {
            "/reports/sales": "sales",
            "/reports/revenue": "revenue",
            "/reports/expenses": "expenses",
            "/reports/custom": "custom",
        };
        if (tabMap[location.pathname]) setActiveTab(tabMap[location.pathname]);
    }, [location.pathname]);

    // Expense state
    const [localExpenses, setLocalExpenses] = useState(expenseRows);
    const [expenseFilter, setExpenseFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");
    const [searchTerm, setSearchTerm] = useState("");

    const filteredExpenses = localExpenses.filter((e) => {
        if (expenseFilter !== "all" && e.status !== expenseFilter) return false;
        if (searchTerm && !e.description.toLowerCase().includes(searchTerm.toLowerCase()) && !e.category.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    // Revenue helpers
    const maxRevTotal = Math.max(...revenueData.map((r) => r.total));
    const totalExpenseBudget = expenseCategories.reduce((s, c) => s + c.budget, 0);
    const totalExpenseSpent = expenseCategories.reduce((s, c) => s + c.amount, 0);

    // Handlers
    const handleExport = (type: string) => {
        toast({ title: "Export Started", description: `Exporting ${type} report as CSV…` });
    };

    const handleRefresh = () => {
        toast({ title: "Data Refreshed", description: "Report data has been updated." });
    };

    const handleShare = () => {
        toast({ title: "Share Link Copied", description: "Report share link copied to clipboard." });
    };

    const handlePrint = () => {
        toast({ title: "Preparing Print", description: "Opening print preview…" });
        window.print();
    };

    const handleApproveExpense = (id: string) => {
        setLocalExpenses((prev) => prev.map((e) => e.id === id ? { ...e, status: "approved" as const } : e));
        toast({ title: "Expense Approved", description: "The expense has been approved." });
    };

    const handleRejectExpense = (id: string) => {
        setLocalExpenses((prev) => prev.map((e) => e.id === id ? { ...e, status: "rejected" as const } : e));
        toast({ title: "Expense Rejected", description: "The expense has been rejected." });
    };

    const handleRunReport = (name: string) => {
        toast({ title: "Report Running", description: `Generating "${name}"… This may take a moment.` });
    };

    const handleScheduleReport = (name: string) => {
        toast({ title: "Schedule Updated", description: `Schedule for "${name}" has been updated.` });
    };

    const handleDuplicateReport = (name: string) => {
        toast({ title: "Report Duplicated", description: `A copy of "${name}" has been created.` });
    };

    const handleCreateReport = () => {
        toast({ title: "Report Builder", description: "Custom report builder opened." });
    };

    // Stat card component
    const StatCard = ({ label, value, change, trend }: { label: string; value: string; change: string; trend: "up" | "down" }) => (
        <div className="bg-white rounded-lg card-shadow p-5">
            <p className="text-xs text-[#94A3B8] mb-1">{label}</p>
            <div className="flex items-end justify-between">
                <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">{value}</p>
                <span className={cn("flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
                    trend === "up" ? "bg-[#16A34A]/10 text-[#16A34A]" : "bg-[#DC2626]/10 text-[#DC2626]"
                )}>
                    {trend === "up" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {change}
                </span>
            </div>
        </div>
    );

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
                                <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Reports</h1>
                                <p className="text-sm text-[#475569] mt-0.5">Comprehensive business intelligence and reporting</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleRefresh} className="h-9 w-9 flex items-center justify-center rounded-lg border border-[rgba(15,23,42,0.12)] bg-white hover:bg-[#F8FAFC] text-[#475569]" title="Refresh">
                                <RefreshCw size={14} />
                            </button>
                            <button onClick={handleShare} className="h-9 w-9 flex items-center justify-center rounded-lg border border-[rgba(15,23,42,0.12)] bg-white hover:bg-[#F8FAFC] text-[#475569]" title="Share">
                                <Share2 size={14} />
                            </button>
                            <button onClick={handlePrint} className="h-9 w-9 flex items-center justify-center rounded-lg border border-[rgba(15,23,42,0.12)] bg-white hover:bg-[#F8FAFC] text-[#475569]" title="Print">
                                <Printer size={14} />
                            </button>
                            <button onClick={() => handleExport(activeTab)} className="flex items-center gap-2 h-9 px-4 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90">
                                <Download size={14} /> Export
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-1 mt-4 border-b border-[rgba(15,23,42,0.06)] -mb-4 -mx-6 px-6">
                        {reportTabs.map((tab) => (
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

                        {/* ====================== SALES REPORT ====================== */}
                        {activeTab === "sales" && (
                            <>
                                {/* KPI Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {salesKpis.map((kpi) => <StatCard key={kpi.label} {...kpi} />)}
                                </div>

                                {/* Sales Rep Table */}
                                <div className="bg-white rounded-lg card-shadow p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="font-semibold text-[#0F172A]">Sales Rep Performance</h3>
                                            <p className="text-xs text-[#94A3B8] mt-0.5">Individual performance breakdown for the current period</p>
                                        </div>
                                        <button onClick={() => handleExport("sales-reps")} className="text-xs text-[#0891B2] font-medium hover:text-[#0891B2]/80">Export →</button>
                                    </div>
                                    <div className="responsive-table">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-[rgba(15,23,42,0.08)]">
                                                    <th className="text-left py-2.5 text-[#94A3B8] font-medium">Rep</th>
                                                    <th className="text-center py-2.5 text-[#94A3B8] font-medium">Deals</th>
                                                    <th className="text-center py-2.5 text-[#94A3B8] font-medium">Won</th>
                                                    <th className="text-center py-2.5 text-[#94A3B8] font-medium">Lost</th>
                                                    <th className="text-center py-2.5 text-[#94A3B8] font-medium">Win Rate</th>
                                                    <th className="text-right py-2.5 text-[#94A3B8] font-medium">Revenue</th>
                                                    <th className="text-right py-2.5 text-[#94A3B8] font-medium">Avg Deal</th>
                                                    <th className="text-right py-2.5 text-[#94A3B8] font-medium">Pipeline</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {salesReps.map((rep) => (
                                                    <tr key={rep.id} className="border-b border-[rgba(15,23,42,0.04)] hover:bg-[#F8FAFC]">
                                                        <td className="py-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-full bg-[#0891B2]/10 flex items-center justify-center text-[10px] font-bold text-[#0891B2]">{rep.avatar}</div>
                                                                <span className="font-medium text-[#0F172A]">{rep.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 text-center text-[#475569]">{rep.deals}</td>
                                                        <td className="py-3 text-center text-[#16A34A] font-semibold">{rep.won}</td>
                                                        <td className="py-3 text-center text-[#DC2626]">{rep.lost}</td>
                                                        <td className="py-3 text-center">
                                                            <div className="inline-flex items-center gap-1.5">
                                                                <div className="w-12 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                                                                    <div className="h-full bg-[#16A34A] rounded-full" style={{ width: `${rep.winRate}%` }} />
                                                                </div>
                                                                <span className={cn("font-semibold", rep.winRate >= 65 ? "text-[#16A34A]" : rep.winRate >= 55 ? "text-[#D97706]" : "text-[#DC2626]")}>{rep.winRate}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 text-right font-semibold text-[#0F172A]">{rep.revenue}</td>
                                                        <td className="py-3 text-right text-[#475569]">{rep.avgDealSize}</td>
                                                        <td className="py-3 text-right text-[#0891B2] font-medium">{rep.pipeline}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="border-t-2 border-[rgba(15,23,42,0.08)]">
                                                    <td className="py-3 font-bold text-[#0F172A]">Total / Average</td>
                                                    <td className="py-3 text-center font-bold text-[#0F172A]">{salesReps.reduce((s, r) => s + r.deals, 0)}</td>
                                                    <td className="py-3 text-center font-bold text-[#16A34A]">{salesReps.reduce((s, r) => s + r.won, 0)}</td>
                                                    <td className="py-3 text-center font-bold text-[#DC2626]">{salesReps.reduce((s, r) => s + r.lost, 0)}</td>
                                                    <td className="py-3 text-center font-bold text-[#0F172A]">{Math.round(salesReps.reduce((s, r) => s + r.winRate, 0) / salesReps.length)}%</td>
                                                    <td className="py-3 text-right font-bold text-[#0F172A]">$2.36M</td>
                                                    <td className="py-3 text-right font-bold text-[#0F172A]">$14,870</td>
                                                    <td className="py-3 text-right font-bold text-[#0891B2]">$1.375M</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>

                                {/* Win Rate Distribution */}
                                <div className="bg-white rounded-lg card-shadow p-6">
                                    <h3 className="font-semibold text-[#0F172A] mb-4">Win Rate by Rep</h3>
                                    <div className="space-y-3">
                                        {salesReps.map((rep) => (
                                            <div key={rep.id} className="flex items-center gap-3">
                                                <span className="text-xs text-[#0F172A] font-medium w-28 truncate">{rep.name}</span>
                                                <div className="flex-1 h-7 bg-[#F1F5F9] rounded-md overflow-hidden">
                                                    <div className="h-full rounded-md flex items-center px-2 transition-all" style={{ width: `${rep.winRate}%`, backgroundColor: rep.winRate >= 65 ? "#16A34A" : rep.winRate >= 55 ? "#D97706" : "#DC2626" }}>
                                                        <span className="text-[10px] text-white font-bold">{rep.winRate}%</span>
                                                    </div>
                                                </div>
                                                <span className="text-xs text-[#94A3B8] w-20 text-right">{rep.revenue}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ====================== REVENUE REPORT ====================== */}
                        {activeTab === "revenue" && (
                            <>
                                {/* KPIs */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {revenueKpis.map((kpi) => <StatCard key={kpi.label} {...kpi} />)}
                                </div>

                                {/* Revenue Bar Chart */}
                                <div className="bg-white rounded-lg card-shadow p-6">
                                    <div className="flex items-center justify-between mb-5">
                                        <div>
                                            <h3 className="font-semibold text-[#0F172A]">Monthly Revenue Breakdown</h3>
                                            <p className="text-xs text-[#94A3B8] mt-0.5">Revenue split by new business, renewals, and upsells</p>
                                        </div>
                                        <button onClick={() => handleExport("revenue-breakdown")} className="text-xs text-[#0891B2] font-medium hover:text-[#0891B2]/80">Export →</button>
                                    </div>
                                    <div className="flex items-end gap-2 h-52">
                                        {revenueData.map((d) => (
                                            <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                                                <div className="w-full flex flex-col items-center justify-end" style={{ height: 190 }}>
                                                    <div className="w-[70%] flex flex-col-reverse rounded-t-sm overflow-hidden" style={{ height: (d.total / maxRevTotal) * 175 }}>
                                                        <div className="bg-[#0891B2]" style={{ height: `${(d.newBusiness / d.total) * 100}%` }} title={`New: $${(d.newBusiness / 1000).toFixed(0)}K`} />
                                                        <div className="bg-[#7C3AED]" style={{ height: `${(d.renewals / d.total) * 100}%` }} title={`Renewals: $${(d.renewals / 1000).toFixed(0)}K`} />
                                                        <div className="bg-[#16A34A]" style={{ height: `${(d.upsells / d.total) * 100}%` }} title={`Upsells: $${(d.upsells / 1000).toFixed(0)}K`} />
                                                    </div>
                                                </div>
                                                <span className="text-[9px] text-[#94A3B8]">{d.month.split(" ")[0]}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-5 mt-3 justify-center">
                                        <span className="flex items-center gap-1.5 text-[11px] text-[#475569]"><span className="w-2.5 h-2.5 rounded-sm bg-[#0891B2]" /> New Business</span>
                                        <span className="flex items-center gap-1.5 text-[11px] text-[#475569]"><span className="w-2.5 h-2.5 rounded-sm bg-[#7C3AED]" /> Renewals</span>
                                        <span className="flex items-center gap-1.5 text-[11px] text-[#475569]"><span className="w-2.5 h-2.5 rounded-sm bg-[#16A34A]" /> Upsells</span>
                                    </div>
                                </div>

                                {/* Revenue Table */}
                                <div className="bg-white rounded-lg card-shadow p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-[#0F172A]">Revenue Detail</h3>
                                        <button onClick={() => handleExport("revenue-detail")} className="text-xs text-[#0891B2] font-medium hover:text-[#0891B2]/80">Export →</button>
                                    </div>
                                    <div className="responsive-table">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-[rgba(15,23,42,0.08)]">
                                                    <th className="text-left py-2.5 text-[#94A3B8] font-medium">Month</th>
                                                    <th className="text-right py-2.5 text-[#94A3B8] font-medium">New Business</th>
                                                    <th className="text-right py-2.5 text-[#94A3B8] font-medium">Renewals</th>
                                                    <th className="text-right py-2.5 text-[#94A3B8] font-medium">Upsells</th>
                                                    <th className="text-right py-2.5 text-[#94A3B8] font-medium">Total</th>
                                                    <th className="text-center py-2.5 text-[#94A3B8] font-medium">Growth</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {revenueData.map((row) => (
                                                    <tr key={row.month} className="border-b border-[rgba(15,23,42,0.04)] hover:bg-[#F8FAFC]">
                                                        <td className="py-3 font-medium text-[#0F172A]">{row.month}</td>
                                                        <td className="py-3 text-right text-[#475569]">${(row.newBusiness / 1000).toFixed(0)}K</td>
                                                        <td className="py-3 text-right text-[#475569]">${(row.renewals / 1000).toFixed(0)}K</td>
                                                        <td className="py-3 text-right text-[#475569]">${(row.upsells / 1000).toFixed(0)}K</td>
                                                        <td className="py-3 text-right font-semibold text-[#0F172A]">${(row.total / 1000).toFixed(0)}K</td>
                                                        <td className="py-3 text-center">
                                                            <span className={cn("inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                                                                row.growth >= 0 ? "bg-[#16A34A]/10 text-[#16A34A]" : "bg-[#DC2626]/10 text-[#DC2626]"
                                                            )}>
                                                                {row.growth >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                                                {row.growth >= 0 ? "+" : ""}{row.growth}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="border-t-2 border-[rgba(15,23,42,0.08)]">
                                                    <td className="py-3 font-bold text-[#0F172A]">Total</td>
                                                    <td className="py-3 text-right font-bold text-[#0F172A]">${(revenueData.reduce((s, r) => s + r.newBusiness, 0) / 1000).toFixed(0)}K</td>
                                                    <td className="py-3 text-right font-bold text-[#0F172A]">${(revenueData.reduce((s, r) => s + r.renewals, 0) / 1000).toFixed(0)}K</td>
                                                    <td className="py-3 text-right font-bold text-[#0F172A]">${(revenueData.reduce((s, r) => s + r.upsells, 0) / 1000).toFixed(0)}K</td>
                                                    <td className="py-3 text-right font-bold text-[#0891B2]">${(revenueData.reduce((s, r) => s + r.total, 0) / 1000).toFixed(0)}K</td>
                                                    <td />
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ====================== EXPENSE REPORT ====================== */}
                        {activeTab === "expenses" && (
                            <>
                                {/* KPIs */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {expenseKpis.map((kpi) => <StatCard key={kpi.label} {...kpi} />)}
                                </div>

                                {/* Budget vs Actual */}
                                <div className="bg-white rounded-lg card-shadow p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="font-semibold text-[#0F172A]">Budget vs Actual by Category</h3>
                                            <p className="text-xs text-[#94A3B8] mt-0.5">Overall budget utilization: <span className="font-semibold text-[#0F172A]">{Math.round((totalExpenseSpent / totalExpenseBudget) * 100)}%</span></p>
                                        </div>
                                        <button onClick={() => handleExport("budget")} className="text-xs text-[#0891B2] font-medium hover:text-[#0891B2]/80">Export →</button>
                                    </div>
                                    <div className="space-y-3">
                                        {expenseCategories.map((cat) => {
                                            const pct = Math.round((cat.amount / cat.budget) * 100);
                                            return (
                                                <div key={cat.name}>
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-[#0F172A] font-medium">{cat.name}</span>
                                                        <span className="text-[#94A3B8]">${(cat.amount / 1000).toFixed(1)}K / ${(cat.budget / 1000).toFixed(0)}K ({pct}%)</span>
                                                    </div>
                                                    <div className="w-full h-3 bg-[#F1F5F9] rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct > 90 ? "#DC2626" : pct > 70 ? "#D97706" : cat.color }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Expense Table */}
                                <div className="bg-white rounded-lg card-shadow p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-[#0F172A]">Expense Transactions</h3>
                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                                                <input className="h-8 pl-9 pr-3 rounded-lg border border-[rgba(15,23,42,0.12)] bg-[#F8FAFC] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 w-48" placeholder="Search expenses…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                            </div>
                                            <select className="h-8 px-3 rounded-lg border border-[rgba(15,23,42,0.12)] bg-[#F8FAFC] text-xs text-[#475569] focus:outline-none" value={expenseFilter} onChange={(e) => setExpenseFilter(e.target.value as any)}>
                                                <option value="all">All Status</option>
                                                <option value="approved">Approved</option>
                                                <option value="pending">Pending</option>
                                                <option value="rejected">Rejected</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="responsive-table">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-[rgba(15,23,42,0.08)]">
                                                    <th className="text-left py-2.5 text-[#94A3B8] font-medium">Description</th>
                                                    <th className="text-left py-2.5 text-[#94A3B8] font-medium">Category</th>
                                                    <th className="text-right py-2.5 text-[#94A3B8] font-medium">Amount</th>
                                                    <th className="text-left py-2.5 text-[#94A3B8] font-medium">Date</th>
                                                    <th className="text-left py-2.5 text-[#94A3B8] font-medium">Submitted By</th>
                                                    <th className="text-center py-2.5 text-[#94A3B8] font-medium">Status</th>
                                                    <th className="text-center py-2.5 text-[#94A3B8] font-medium">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredExpenses.map((exp) => (
                                                    <tr key={exp.id} className="border-b border-[rgba(15,23,42,0.04)] hover:bg-[#F8FAFC]">
                                                        <td className="py-3 font-medium text-[#0F172A] max-w-[200px] truncate">{exp.description}</td>
                                                        <td className="py-3 text-[#475569]">{exp.category}</td>
                                                        <td className="py-3 text-right font-semibold text-[#0F172A]">${exp.amount.toLocaleString()}</td>
                                                        <td className="py-3 text-[#94A3B8]">{exp.date}</td>
                                                        <td className="py-3 text-[#475569]">{exp.submittedBy}</td>
                                                        <td className="py-3 text-center">
                                                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                                                                exp.status === "approved" ? "bg-[#16A34A]/10 text-[#16A34A]" :
                                                                    exp.status === "pending" ? "bg-[#D97706]/10 text-[#D97706]" : "bg-[#DC2626]/10 text-[#DC2626]"
                                                            )}>
                                                                {exp.status === "approved" ? <CheckCircle2 size={10} /> : exp.status === "pending" ? <Clock size={10} /> : <XCircle size={10} />}
                                                                {exp.status.charAt(0).toUpperCase() + exp.status.slice(1)}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 text-center">
                                                            {exp.status === "pending" && (
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <button onClick={() => handleApproveExpense(exp.id)} className="p-1 text-[#16A34A] hover:bg-[#16A34A]/10 rounded" title="Approve">
                                                                        <CheckCircle2 size={14} />
                                                                    </button>
                                                                    <button onClick={() => handleRejectExpense(exp.id)} className="p-1 text-[#DC2626] hover:bg-[#DC2626]/10 rounded" title="Reject">
                                                                        <XCircle size={14} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {filteredExpenses.length === 0 && (
                                        <p className="text-center text-sm text-[#94A3B8] py-8">No expenses match your filters.</p>
                                    )}
                                </div>
                            </>
                        )}

                        {/* ====================== CUSTOM REPORTS ====================== */}
                        {activeTab === "custom" && (
                            <>
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-[#0F172A]">Custom Report Templates</h3>
                                        <p className="text-xs text-[#94A3B8] mt-0.5">Create, run, and schedule custom reports tailored to your business</p>
                                    </div>
                                    <button onClick={handleCreateReport} className="flex items-center gap-2 px-4 py-2 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90">
                                        <Plus size={14} /> New Report
                                    </button>
                                </div>

                                {/* Report Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {customReportTemplates.map((report) => (
                                        <div key={report.id} className="bg-white rounded-lg card-shadow p-5">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-[#0891B2]/10 flex items-center justify-center flex-shrink-0">
                                                    <report.icon size={20} className="text-[#0891B2]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-sm text-[#0F172A]">{report.name}</h4>
                                                    <p className="text-xs text-[#94A3B8] mt-0.5 line-clamp-2">{report.description}</p>
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <span className="px-2 py-0.5 rounded bg-[#0891B2]/10 text-[#0891B2] text-[10px] font-semibold">{report.type}</span>
                                                        <span className="text-[10px] text-[#94A3B8]">Last run: {report.lastRun}</span>
                                                        <span className="text-[10px] text-[#94A3B8]">Schedule: {report.schedule}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[rgba(15,23,42,0.06)]">
                                                <button onClick={() => handleRunReport(report.name)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0891B2] text-white rounded-lg text-[11px] font-medium hover:bg-[#0891B2]/90">
                                                    <Play size={12} /> Run Now
                                                </button>
                                                <button onClick={() => handleScheduleReport(report.name)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[rgba(15,23,42,0.12)] text-[#475569] rounded-lg text-[11px] font-medium hover:bg-[#F8FAFC]">
                                                    <Calendar size={12} /> Schedule
                                                </button>
                                                <button onClick={() => handleDuplicateReport(report.name)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[rgba(15,23,42,0.12)] text-[#475569] rounded-lg text-[11px] font-medium hover:bg-[#F8FAFC]">
                                                    <Copy size={12} /> Duplicate
                                                </button>
                                                <button onClick={() => handleExport(report.name)} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[rgba(15,23,42,0.12)] text-[#475569] rounded-lg text-[11px] font-medium hover:bg-[#F8FAFC]">
                                                    <Download size={12} /> Export
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* AI Insight */}
                                <div className="bg-white rounded-lg card-shadow p-6">
                                    <h3 className="font-semibold text-[#0F172A] mb-3">AI Report Suggestions</h3>
                                    <div className="space-y-2">
                                        {[
                                            "Based on your recent activity, a \"Weekly Pipeline Health\" report would help track deal velocity changes.",
                                            "Your team's email-to-meeting conversion rate has changed significantly — consider a \"Communication Effectiveness\" report.",
                                            "Churn risk signals detected for 3 accounts. The \"Churn Risk Analysis\" report can provide actionable recommendations.",
                                        ].map((suggestion, i) => (
                                            <div key={i} className="p-3 bg-[#0891B2]/5 rounded-lg border border-[#0891B2]/10 flex items-start gap-2">
                                                <Info size={14} className="text-[#0891B2] flex-shrink-0 mt-0.5" />
                                                <span className="text-xs text-[#0891B2]">{suggestion}</span>
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
