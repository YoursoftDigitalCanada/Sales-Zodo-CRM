import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { cancelSubscription, createRenewalReminders, getPricingPlans, getSubscription, getSubscriptions, pauseSubscription, reactivateSubscription } from "@/features/billing/services/billing-service";
import { CalendarDays, CreditCard, DollarSign, Pause, Play, RefreshCw, Search, XCircle } from "lucide-react";

const money = (value: unknown, currency = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value || 0));

const dateLabel = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
};

const statusColor = (status: string) => {
  const value = status.toUpperCase();
  if (value === "ACTIVE") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (value === "TRIAL") return "bg-blue-50 text-blue-700 border-blue-200";
  if (value === "PAST_DUE") return "bg-red-50 text-red-700 border-red-200";
  if (value === "PAUSED") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
};

export default function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filters, setFilters] = useState({ status: "all", plan: "all", renewalFrom: "", renewalTo: "", search: "" });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const subscriptionsQuery = useQuery({ queryKey: ["subscriptions", filters], queryFn: () => getSubscriptions(filters) });
  const plansQuery = useQuery({ queryKey: ["pricing-plans"], queryFn: () => getPricingPlans() });
  const detailQuery = useQuery({ queryKey: ["subscription-detail", selectedId], queryFn: () => getSubscription(selectedId!), enabled: Boolean(selectedId) });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["subscription-detail"] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "pause" | "cancel" | "reactivate" }) =>
      action === "pause" ? pauseSubscription(id) : action === "cancel" ? cancelSubscription(id) : reactivateSubscription(id),
    onSuccess: () => { refresh(); toast({ title: "Subscription updated" }); },
    onError: (error: any) => toast({ title: "Update failed", description: error?.response?.data?.message || error?.message, variant: "destructive" }),
  });
  const renewalMutation = useMutation({
    mutationFn: () => createRenewalReminders(30),
    onSuccess: (data: any) => { refresh(); toast({ title: "Renewal reminders prepared", description: `${data?.created || 0} task(s) created.` }); },
  });

  const records = subscriptionsQuery.data?.data || [];
  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return term ? records.filter((sub) => [sub.subscriptionNumber, sub.planName, sub.client?.clientName, sub.project?.organizationName].some((value) => String(value || "").toLowerCase().includes(term))) : records;
  }, [records, filters.search]);
  const totals = subscriptionsQuery.data?.totals || { count: 0, mrr: 0, arr: 0 };
  const detail = detailQuery.data;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h1 className="text-2xl font-semibold text-[#0F172A]">Subscriptions</h1>
            <p className="text-sm text-[#64748B]">Track Roofer CRM recurring revenue, renewals, billing status, invoices, and payments.</p>
          </div>
          <Button onClick={() => renewalMutation.mutate()} className="gap-2 bg-[#0F766E] hover:bg-[#115E59]"><RefreshCw size={16} />Prepare Renewals</Button>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          {[
            { label: "Subscriptions", value: totals.count, icon: CreditCard },
            { label: "MRR", value: money(totals.mrr), icon: DollarSign },
            { label: "ARR", value: money(totals.arr), icon: DollarSign },
            { label: "Renewals", value: filtered.filter((sub) => new Date(sub.renewalDate) <= new Date(Date.now() + 30 * 86400000)).length, icon: CalendarDays },
          ].map((card) => (
            <div key={card.label} className="rounded-lg border border-[#E2E8F0] bg-white p-4">
              <div className="flex items-center justify-between"><div><p className="text-sm text-[#64748B]">{card.label}</p><p className="mt-1 text-xl font-semibold text-[#0F172A]">{card.value}</p></div><card.icon className="text-[#0F766E]" size={20} /></div>
            </div>
          ))}
        </div>

        <div className="mb-4 grid gap-3 rounded-lg border border-[#E2E8F0] bg-white p-4 md:grid-cols-5">
          <div className="relative md:col-span-2"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" /><Input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search subscriptions" className="pl-9" /></div>
          <Select value={filters.status} onValueChange={(value) => setFilters((current) => ({ ...current, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{["TRIAL", "ACTIVE", "PAST_DUE", "PAUSED", "CANCELLED", "EXPIRED"].map((status) => <SelectItem key={status} value={status}>{status.replace("_", " ")}</SelectItem>)}</SelectContent></Select>
          <Select value={filters.plan} onValueChange={(value) => setFilters((current) => ({ ...current, plan: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All plans</SelectItem>{(plansQuery.data || []).map((plan) => <SelectItem key={plan.id} value={plan.planName}>{plan.planName}</SelectItem>)}</SelectContent></Select>
          <Input type="date" value={filters.renewalTo} onChange={(event) => setFilters((current) => ({ ...current, renewalTo: event.target.value }))} />
        </div>

        <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
          <div className="grid grid-cols-7 border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
            <span className="col-span-2">Subscription</span><span>Plan</span><span>Status</span><span>MRR / ARR</span><span>Renewal</span><span className="text-right">Actions</span>
          </div>
          {filtered.map((sub) => (
            <div key={sub.id} className="grid grid-cols-7 items-center gap-3 border-b border-[#F1F5F9] px-4 py-3 last:border-0">
              <button onClick={() => setSelectedId(sub.id)} className="col-span-2 text-left"><p className="font-medium text-[#0F172A]">{sub.subscriptionNumber || sub.id}</p><p className="text-sm text-[#64748B]">{sub.client?.clientName || "Account"} · {sub.project?.organizationName || sub.project?.name || "No deal"}</p></button>
              <span className="text-sm text-[#0F172A]">{sub.planName}</span>
              <Badge variant="outline" className={statusColor(String(sub.status))}>{String(sub.status).replace("_", " ")}</Badge>
              <span className="text-sm text-[#0F172A]">{money(sub.mrr)} / {money(sub.arr)}</span>
              <span className="text-sm text-[#64748B]">{dateLabel(sub.renewalDate)}</span>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => statusMutation.mutate({ id: sub.id, action: "pause" })}><Pause size={14} /></Button>
                <Button variant="outline" size="sm" onClick={() => statusMutation.mutate({ id: sub.id, action: "reactivate" })}><Play size={14} /></Button>
                <Button variant="outline" size="sm" onClick={() => statusMutation.mutate({ id: sub.id, action: "cancel" })}><XCircle size={14} /></Button>
              </div>
            </div>
          ))}
          {!filtered.length && <div className="p-8 text-center text-sm text-[#64748B]">No subscriptions found. Won deals will create subscriptions automatically.</div>}
        </div>
      </main>

      <Dialog open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader><DialogTitle>{detail?.subscriptionNumber || "Subscription"}</DialogTitle><DialogDescription>{detail?.client?.clientName || "Account"} · {detail?.planName}</DialogDescription></DialogHeader>
          <Tabs defaultValue="overview">
            <TabsList className="flex w-full justify-start overflow-x-auto">{["Overview", "Invoices", "Payments", "Renewal Tasks", "Activity Timeline"].map((tab) => <TabsTrigger key={tab} value={tab.toLowerCase().replace(/\s+/g, "-")}>{tab}</TabsTrigger>)}</TabsList>
            <TabsContent value="overview" className="grid gap-3 pt-4 md:grid-cols-3">{["billingCycle", "status", "seats", "setupFee", "discountAmount", "taxRate", "paymentTerms", "startDate", "renewalDate"].map((key) => <div key={key} className="rounded-lg border border-[#E2E8F0] p-3"><p className="text-xs text-[#64748B]">{key}</p><p className="font-medium text-[#0F172A]">{key.includes("Date") ? dateLabel(detail?.[key]) : String(detail?.[key] ?? "-")}</p></div>)}</TabsContent>
            <TabsContent value="invoices" className="pt-4">{detail?.invoice ? <div className="rounded-lg border border-[#E2E8F0] p-4"><p className="font-medium">{detail.invoice.invoiceNumber}</p><p className="text-sm text-[#64748B]">{detail.invoice.status} · {money(detail.invoice.total)}</p></div> : <p className="text-sm text-[#64748B]">No invoice linked.</p>}</TabsContent>
            <TabsContent value="payments" className="space-y-3 pt-4">{(detail?.payments || []).map((payment: any) => <div key={payment.id} className="rounded-lg border border-[#E2E8F0] p-4"><p className="font-medium">{money(payment.amount)} · {payment.paymentMethod}</p><p className="text-sm text-[#64748B]">{dateLabel(payment.paymentDate)} · {payment.reference || "No reference"}</p></div>)}</TabsContent>
            <TabsContent value="renewal-tasks" className="space-y-3 pt-4">{(detail?.renewalTasks || []).map((task: any) => <div key={task.id} className="rounded-lg border border-[#E2E8F0] p-4"><p className="font-medium">{task.title}</p><p className="text-sm text-[#64748B]">{task.status} · Due {dateLabel(task.dueDate)}</p></div>)}</TabsContent>
            <TabsContent value="activity-timeline" className="pt-4">{selectedId ? <ActivityTimeline entityType="CustomerSubscription" entityId={selectedId} includeRelated /> : null}</TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
