import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  DollarSign,
  Filter,
  LineChart,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getSalesAnalyticsSummary,
  getSalesDealAnalytics,
  getSalesForecast,
  getSalesLeadAnalytics,
  getSalesRepPerformance,
  getSalesRevenueAnalytics,
  getSalesSourcePerformance,
  getSalesSubscriptionAnalytics,
  type SalesAnalyticsFilters,
} from "@/features/analytics";

const COLORS = ["#0891B2", "#0F766E", "#7C3AED", "#D97706", "#2563EB", "#DB2777", "#16A34A", "#DC2626"];
const STAGES = ["Qualification", "Demo Scheduled", "Proposal Sent", "Negotiation", "Won", "Lost"];
const PLANS = ["Starter", "Professional", "Enterprise", "Roofer CRM"];
const ACCOUNT_STATUSES = ["ACTIVE", "PROSPECT", "INACTIVE", "CHURNED"];

function dateRangeToFilters(range: string) {
  const now = new Date();
  const start = new Date(now);
  if (range === "7d") start.setDate(now.getDate() - 7);
  if (range === "30d") start.setDate(now.getDate() - 30);
  if (range === "90d") start.setDate(now.getDate() - 90);
  if (range === "12m") start.setMonth(now.getMonth() - 12);
  if (range === "ytd") start.setMonth(0, 1);
  start.setHours(0, 0, 0, 0);
  return { startDate: start.toISOString(), endDate: now.toISOString() };
}

function money(value: unknown) {
  const amount = Number(value || 0);
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function pct(value: unknown) {
  return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center text-sm text-[#64748B]">{label}</div>;
}

function KpiCard({ label, value, hint, tone = "#0891B2" }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#0F172A]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#64748B]">{hint}</p> : <span className="mt-2 block h-1 w-10 rounded-full" style={{ backgroundColor: tone }} />}
    </div>
  );
}

function ChartCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-[#0F172A]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SimpleTable({ columns, rows, empty }: { columns: string[]; rows: any[]; empty: string }) {
  if (!rows.length) return <EmptyState label={empty} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E2E8F0]">
            {columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase text-[#64748B]">{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || row.sourceId || row.repId || row.reason || index} className="border-b border-[#F1F5F9]">
              {columns.map((column) => <td key={column} className="whitespace-nowrap px-3 py-3 text-[#334155]">{row[column]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState("30d");
  const [rep, setRep] = useState("all");
  const [source, setSource] = useState("all");
  const [stage, setStage] = useState("all");
  const [plan, setPlan] = useState("all");
  const [accountStatus, setAccountStatus] = useState("all");

  const filters = useMemo<SalesAnalyticsFilters>(() => ({
    ...dateRangeToFilters(range),
    ...(rep !== "all" ? { salesRepId: rep } : {}),
    ...(source !== "all" ? { leadSourceId: source } : {}),
    ...(stage !== "all" ? { dealStage: stage } : {}),
    ...(plan !== "all" ? { plan } : {}),
    ...(accountStatus !== "all" ? { accountStatus } : {}),
  }), [range, rep, source, stage, plan, accountStatus]);

  const analytics = useQuery({
    queryKey: ["sales-analytics", filters],
    queryFn: async () => {
      const [summary, leads, deals, revenue, subscriptions, reps, sources, forecast] = await Promise.all([
        getSalesAnalyticsSummary(filters),
        getSalesLeadAnalytics(filters),
        getSalesDealAnalytics(filters),
        getSalesRevenueAnalytics(filters),
        getSalesSubscriptionAnalytics(filters),
        getSalesRepPerformance(filters),
        getSalesSourcePerformance(filters),
        getSalesForecast(filters),
      ]);
      return { summary, leads, deals, revenue, subscriptions, reps, sources, forecast };
    },
  });

  const data = analytics.data || {};
  const summary = data.summary || {};
  const leads = data.leads || {};
  const deals = data.deals || {};
  const revenue = data.revenue || {};
  const subscriptions = data.subscriptions || {};
  const reps = data.reps || [];
  const sources = data.sources || [];
  const forecast = data.forecast || {};

  const insights = [
    ...(deals.staleDeals?.length ? [{ label: `${deals.staleDeals.length} stale deals have had no activity for 7+ days`, tone: "warning" }] : []),
    ...(forecast.dealsClosingNext7Days?.length ? [{ label: `${forecast.dealsClosingNext7Days.length} deals are closing in the next 7 days`, tone: "info" }] : []),
    ...(deals.highValueWithoutNextTask?.length ? [{ label: `${deals.highValueWithoutNextTask.length} high-value deals need a next action`, tone: "warning" }] : []),
    ...(reps.filter((item: any) => item.overdueTasks > 0).length ? [{ label: "Some reps have overdue tasks", tone: "warning" }] : []),
    ...(sources.filter((item: any) => item.lowConversion).length ? [{ label: "Some lead sources have low conversion", tone: "warning" }] : []),
    ...(subscriptions.renewalsDue?.length ? [{ label: `${subscriptions.renewalsDue.length} subscriptions renew within 30 days`, tone: "info" }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0891B2]/10 text-[#0891B2]"><BarChart3 size={20} /></div>
              <div>
                <h1 className="text-2xl font-semibold text-[#0F172A]">Analytics & Forecast</h1>
                <p className="text-sm text-[#64748B]">Lead volume, pipeline health, revenue, subscriptions, rep performance, and forecast.</p>
              </div>
            </div>
            <Button onClick={() => analytics.refetch()} variant="outline" className="gap-2"><RefreshCw size={16} />Refresh</Button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Select value={range} onValueChange={setRange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7d">Last 7 days</SelectItem><SelectItem value="30d">Last 30 days</SelectItem><SelectItem value="90d">Last 90 days</SelectItem><SelectItem value="12m">Last 12 months</SelectItem><SelectItem value="ytd">Year to date</SelectItem></SelectContent></Select>
            <Select value={rep} onValueChange={setRep}><SelectTrigger><SelectValue placeholder="Rep" /></SelectTrigger><SelectContent><SelectItem value="all">All reps</SelectItem>{reps.map((item: any) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
            <Select value={source} onValueChange={setSource}><SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger><SelectContent><SelectItem value="all">All sources</SelectItem>{sources.filter((item: any) => item.sourceId).map((item: any) => <SelectItem key={item.sourceId} value={item.sourceId}>{item.sourceName}</SelectItem>)}</SelectContent></Select>
            <Select value={stage} onValueChange={setStage}><SelectTrigger><SelectValue placeholder="Stage" /></SelectTrigger><SelectContent><SelectItem value="all">All stages</SelectItem>{STAGES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
            <Select value={plan} onValueChange={setPlan}><SelectTrigger><SelectValue placeholder="Plan" /></SelectTrigger><SelectContent><SelectItem value="all">All plans</SelectItem>{PLANS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
            <Select value={accountStatus} onValueChange={setAccountStatus}><SelectTrigger><SelectValue placeholder="Account status" /></SelectTrigger><SelectContent><SelectItem value="all">All accounts</SelectItem>{ACCOUNT_STATUSES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {analytics.isLoading ? <EmptyState label="Loading sales analytics..." /> : analytics.isError ? <EmptyState label="Unable to load analytics. Please refresh or check API access." /> : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-white p-1">
              {["Overview", "Leads", "Pipeline", "Revenue", "Subscriptions", "Reps", "Sources", "Forecast"].map((tab) => (
                <TabsTrigger key={tab} value={tab.toLowerCase()}>{tab}</TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Total Leads" value={String(summary.totalLeads || 0)} />
                <KpiCard label="Total Deals" value={String(summary.totalDeals || 0)} tone="#7C3AED" />
                <KpiCard label="Closed Won Revenue" value={money(summary.closedWonRevenue)} tone="#16A34A" />
                <KpiCard label="Conversion Rate" value={pct(summary.conversionRate)} tone="#D97706" />
                <KpiCard label="Open Pipeline" value={money(summary.openPipelineValue)} />
                <KpiCard label="Win Rate" value={pct(summary.winRate)} tone="#16A34A" />
                <KpiCard label="MRR" value={money(summary.mrr)} tone="#0F766E" />
                <KpiCard label="ARR" value={money(summary.arr)} tone="#2563EB" />
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <ChartCard title="Pipeline Value by Stage">
                  {(deals.byStage || []).length ? <ResponsiveContainer width="100%" height={260}><BarChart data={deals.byStage}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="stage" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(value) => `$${Number(value) / 1000}k`} /><Tooltip formatter={(value) => money(value)} /><Bar dataKey="value" fill="#0891B2" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyState label="No deal pipeline data yet." />}
                </ChartCard>
                <ChartCard title="AI Forecast/Risk Insights">
                  {insights.length ? <div className="space-y-3">{insights.map((item, index) => <div key={index} className="flex items-start gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3"><AlertTriangle className={item.tone === "warning" ? "text-[#D97706]" : "text-[#0891B2]"} size={18} /><p className="text-sm text-[#334155]">{item.label}</p></div>)}</div> : <EmptyState label="No urgent sales insights for this filter." />}
                </ChartCard>
              </div>
            </TabsContent>

            <TabsContent value="leads" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <KpiCard label="New Leads" value={String(leads.newVsQualified?.new || 0)} />
                <KpiCard label="Qualified Leads" value={String(leads.newVsQualified?.qualified || 0)} tone="#16A34A" />
                <KpiCard label="Lead to Qualified" value={pct(leads.leadToQualifiedConversionRate)} tone="#7C3AED" />
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <ChartCard title="Leads by Status" action={<Button variant="ghost" size="sm" onClick={() => window.location.assign("/leads?temperature=HOT")}>Hot leads</Button>}>
                  {(leads.byStatus || []).length ? <ResponsiveContainer width="100%" height={260}><BarChart data={leads.byStatus}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="status" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#0891B2" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyState label="No lead status data yet." />}
                </ChartCard>
                <ChartCard title="Lead Source Breakdown">
                  {(leads.bySource || []).length ? <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={leads.bySource} dataKey="count" nameKey="sourceName" outerRadius={90} label>{leads.bySource.map((_: any, index: number) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <EmptyState label="No lead source data yet." />}
                </ChartCard>
              </div>
            </TabsContent>

            <TabsContent value="pipeline" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <KpiCard label="Average Probability" value={pct(deals.averageProbability)} />
                <KpiCard label="Closing This Week" value={String(deals.closingThisWeek?.length || 0)} tone="#D97706" />
                <KpiCard label="Won Deals" value={String(deals.wonCount || 0)} tone="#16A34A" />
                <KpiCard label="Lost Deals" value={String(deals.lostCount || 0)} tone="#DC2626" />
              </div>
              <ChartCard title="Deals by Stage" action={<Button variant="ghost" size="sm" onClick={() => window.location.assign("/deals?closing=week")}>Deals closing this week</Button>}>
                {(deals.byStage || []).length ? <ResponsiveContainer width="100%" height={280}><BarChart data={deals.byStage}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="stage" /><YAxis /><Tooltip /><Legend /><Bar dataKey="count" fill="#0891B2" name="Deals" /><Bar dataKey="averageProbability" fill="#7C3AED" name="Avg probability" /></BarChart></ResponsiveContainer> : <EmptyState label="No deal stage data yet." />}
              </ChartCard>
              <div className="grid gap-5 lg:grid-cols-2">
                <ChartCard title="Stale Deals">
                  <SimpleTable columns={["Deal", "Account", "Value"]} rows={(deals.staleDeals || []).map((item: any) => ({ Deal: item.name, Account: item.account || "-", Value: money(item.value) }))} empty="No stale deals right now." />
                </ChartCard>
                <ChartCard title="Lost Reason Breakdown">
                  <SimpleTable columns={["Reason", "Count"]} rows={(deals.lostReasons || []).map((item: any) => ({ Reason: item.reason, Count: item.count }))} empty="No lost reasons captured yet." />
                </ChartCard>
              </div>
            </TabsContent>

            <TabsContent value="revenue" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <KpiCard label="Closed Won" value={money(revenue.closedWonRevenue)} />
                <KpiCard label="Invoiced" value={money(revenue.invoicedRevenue)} tone="#7C3AED" />
                <KpiCard label="Paid" value={money(revenue.paidRevenue)} tone="#16A34A" />
                <KpiCard label="Outstanding" value={money(revenue.outstandingBalance)} tone="#D97706" />
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <ChartCard title="Revenue by Rep"><SimpleTable columns={["Rep", "Revenue"]} rows={(revenue.revenueByRep || []).map((item: any) => ({ Rep: item.repName, Revenue: money(item.revenue) }))} empty="No rep revenue yet." /></ChartCard>
                <ChartCard title="Revenue by Source"><SimpleTable columns={["Source", "Revenue"]} rows={(revenue.revenueBySource || []).map((item: any) => ({ Source: item.sourceName, Revenue: money(item.revenue) }))} empty="No source revenue yet." /></ChartCard>
              </div>
            </TabsContent>

            <TabsContent value="subscriptions" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <KpiCard label="Active Subscriptions" value={String(subscriptions.activeSubscriptions || 0)} />
                <KpiCard label="MRR" value={money(subscriptions.mrr)} tone="#0F766E" />
                <KpiCard label="ARR" value={money(subscriptions.arr)} tone="#2563EB" />
                <KpiCard label="Past Due" value={String(subscriptions.pastDueSubscriptions || 0)} tone="#DC2626" />
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <ChartCard title="MRR / ARR by Plan"><SimpleTable columns={["Plan", "Subscriptions", "MRR", "ARR"]} rows={(subscriptions.byPlan || []).map((item: any) => ({ Plan: item.planName, Subscriptions: item.count, MRR: money(item.mrr), ARR: money(item.arr) }))} empty="No subscription plan data yet." /></ChartCard>
                <ChartCard title="Renewals Within 30 Days"><SimpleTable columns={["Account", "Plan", "ARR", "Renewal"]} rows={(subscriptions.renewalsDue || []).map((item: any) => ({ Account: item.account, Plan: item.planName, ARR: money(item.arr), Renewal: new Date(item.renewalDate).toLocaleDateString() }))} empty="No renewals due in the next 30 days." /></ChartCard>
              </div>
            </TabsContent>

            <TabsContent value="reps" className="space-y-6">
              <ChartCard title="Rep Leaderboard">
                <SimpleTable columns={["Rep", "Leads", "Qualified", "Won", "Lost", "Revenue", "Win Rate", "Overdue"]} rows={reps.map((item: any) => ({ Rep: <button className="font-medium text-[#0891B2]" onClick={() => setRep(item.id)}>{item.name}</button>, Leads: item.leadsAssigned, Qualified: item.qualifiedLeads, Won: item.dealsWon, Lost: item.dealsLost, Revenue: money(item.revenueClosed), "Win Rate": pct(item.winRate), Overdue: item.overdueTasks }))} empty="No rep performance data yet." />
              </ChartCard>
              <ChartCard title="Sales Activities by Rep">
                <SimpleTable columns={["Rep", "Calls", "Emails", "Meetings", "Tasks Completed"]} rows={reps.map((item: any) => ({ Rep: item.name, Calls: item.calls, Emails: item.emails, Meetings: item.meetings, "Tasks Completed": item.tasksCompleted }))} empty="No activity data yet." />
              </ChartCard>
            </TabsContent>

            <TabsContent value="sources" className="space-y-6">
              <ChartCard title="Lead Source Performance">
                <SimpleTable columns={["Source", "Leads", "Qualified", "Conversion", "Revenue", "Insight"]} rows={sources.map((item: any) => ({ Source: item.sourceName, Leads: item.leads, Qualified: item.qualified, Conversion: pct(item.conversionRate), Revenue: money(item.revenue), Insight: item.lowConversion ? <Badge variant="outline" className="border-[#F59E0B] text-[#B45309]">Low conversion</Badge> : <Badge variant="outline" className="border-[#16A34A] text-[#15803D]">Healthy</Badge> }))} empty="No source performance data yet." />
              </ChartCard>
            </TabsContent>

            <TabsContent value="forecast" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <KpiCard label="Weighted Forecast" value={money(forecast.weightedForecast)} />
                <KpiCard label="Closing Next 7 Days" value={String(forecast.dealsClosingNext7Days?.length || 0)} tone="#D97706" />
                <KpiCard label="Renewal Risk" value={money(summary.renewalRevenueAtRisk)} tone="#DC2626" />
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <ChartCard title="Forecast by Month">
                  {(forecast.byMonth || []).length ? <ResponsiveContainer width="100%" height={260}><BarChart data={forecast.byMonth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis tickFormatter={(value) => `$${Number(value) / 1000}k`} /><Tooltip formatter={(value) => money(value)} /><Bar dataKey="value" fill="#0891B2" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyState label="No forecast data yet." />}
                </ChartCard>
                <ChartCard title="Forecast by Stage"><SimpleTable columns={["Stage", "Forecast"]} rows={(forecast.byStage || []).map((item: any) => ({ Stage: item.stage, Forecast: money(item.value) }))} empty="No stage forecast yet." /></ChartCard>
              </div>
              <ChartCard title="Deals Closing Next 7 Days"><SimpleTable columns={["Deal", "Stage", "Value", "Probability", "Close Date"]} rows={(forecast.dealsClosingNext7Days || []).map((item: any) => ({ Deal: item.name, Stage: item.stage || "-", Value: money(item.value), Probability: pct(item.probability), "Close Date": item.expectedCloseDate ? new Date(item.expectedCloseDate).toLocaleDateString() : "-" }))} empty="No deals closing in the next 7 days." /></ChartCard>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
