import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, AlertTriangle, Clock, Copy, Globe2, MousePointerClick, Plus, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  createWebsiteAnalyticsSite,
  getWebsiteAnalyticsSites,
  getWebsiteAnalyticsSnippet,
  getWebsiteSession,
  getWebsiteSessions,
  type WebsiteAnalyticsSite,
  type WebsiteSession,
} from "@/features/website-analytics";
import { toast } from "@/hooks/use-toast";

function formatNumber(value: number | undefined) {
  return new Intl.NumberFormat().format(value || 0);
}

function formatDuration(ms?: number | null) {
  if (!ms) return "0s";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Activity }) {
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-[#0F172A]">{value}</p>
        </div>
        <div className="rounded-lg bg-[#0891B2]/10 p-2 text-[#0891B2]">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function WebsiteAnalyticsPage() {
  const queryClient = useQueryClient();
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [form, setForm] = useState({ name: "", domain: "" });
  const [snippet, setSnippet] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const sitesQuery = useQuery({ queryKey: ["website-analytics", "sites"], queryFn: getWebsiteAnalyticsSites });
  const sites = sitesQuery.data || [];
  const selectedSite = sites.find((site) => site.id === selectedSiteId) || sites[0];
  const activeSiteId = selectedSite?.id;

  const sessionsQuery = useQuery({
    queryKey: ["website-analytics", "sessions", activeSiteId],
    queryFn: () => getWebsiteSessions({ siteId: activeSiteId, limit: 100 }),
    enabled: Boolean(activeSiteId),
  });

  const sessionDetailQuery = useQuery({
    queryKey: ["website-analytics", "session", selectedSessionId],
    queryFn: () => getWebsiteSession(selectedSessionId!),
    enabled: Boolean(selectedSessionId),
  });

  const createMutation = useMutation({
    mutationFn: createWebsiteAnalyticsSite,
    onSuccess: async (site) => {
      setForm({ name: "", domain: "" });
      setSelectedSiteId(site.id);
      await queryClient.invalidateQueries({ queryKey: ["website-analytics"] });
      toast({ title: "Website added", description: "Tracking snippet is ready to install." });
    },
  });

  const snippetMutation = useMutation({
    mutationFn: getWebsiteAnalyticsSnippet,
    onSuccess: (data) => setSnippet(data.snippet),
  });

  const totals = useMemo(() => {
    return sites.reduce(
      (acc, site) => ({
        totalSessions: acc.totalSessions + (site.metrics?.totalSessions || 0),
        pageViews: acc.pageViews + (site.metrics?.pageViews || 0),
        uniqueVisitors: acc.uniqueVisitors + (site.metrics?.uniqueVisitors || 0),
        jsErrors: acc.jsErrors + (site.metrics?.jsErrors || 0),
        durationSum: acc.durationSum + (site.metrics?.averageDurationMs || 0),
      }),
      { totalSessions: 0, pageViews: 0, uniqueVisitors: 0, jsErrors: 0, durationSum: 0 }
    );
  }, [sites]);

  const averageDuration = sites.length ? Math.round(totals.durationSum / sites.length) : 0;
  const sessions = sessionsQuery.data || [];
  const sessionDetail = sessionDetailQuery.data;

  const copySnippet = async () => {
    if (!snippet) return;
    await navigator.clipboard.writeText(snippet);
    toast({ title: "Snippet copied", description: "Paste it before the closing body tag on your website." });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-[#E2E8F0] bg-white px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#0891B2]/10 p-2 text-[#0891B2]"><Globe2 size={22} /></div>
            <div>
              <h1 className="text-2xl font-semibold text-[#0F172A]">Website Analytics</h1>
              <p className="text-sm text-[#64748B]">Tenant-safe visitor tracking for websites you connect to this CRM.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => { void sitesQuery.refetch(); void sessionsQuery.refetch(); }} className="gap-2">
            <RefreshCw size={16} />Refresh
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Total Sessions" value={formatNumber(totals.totalSessions)} icon={Activity} />
          <MetricCard label="Page Views" value={formatNumber(totals.pageViews)} icon={Search} />
          <MetricCard label="Unique Visitors" value={formatNumber(totals.uniqueVisitors)} icon={Globe2} />
          <MetricCard label="JS Errors" value={formatNumber(totals.jsErrors)} icon={AlertTriangle} />
          <MetricCard label="Avg Duration" value={formatDuration(averageDuration)} icon={Clock} />
        </section>

        <section className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-5">
            <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <Plus size={18} className="text-[#0891B2]" />
                <h2 className="text-sm font-semibold text-[#0F172A]">Add Website</h2>
              </div>
              <div className="space-y-3">
                <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Roofer CRM website" /></div>
                <div className="space-y-2"><Label>Domain</Label><Input value={form.domain} onChange={(event) => setForm((current) => ({ ...current, domain: event.target.value }))} placeholder="example.com" /></div>
                <Button disabled={createMutation.isPending} onClick={() => createMutation.mutate(form)} className="w-full bg-[#0891B2] hover:bg-[#0E7490]">Create Tracking Site</Button>
              </div>
            </div>

            <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
              <h2 className="text-sm font-semibold text-[#0F172A]">Websites</h2>
              <div className="mt-3 space-y-2">
                {sites.length === 0 ? <p className="rounded-md bg-[#F8FAFC] p-4 text-sm text-[#64748B]">No websites connected yet.</p> : null}
                {sites.map((site: WebsiteAnalyticsSite) => (
                  <button key={site.id} onClick={() => { setSelectedSiteId(site.id); setSnippet(""); }} className={`w-full rounded-md border p-3 text-left transition ${activeSiteId === site.id ? "border-[#0891B2] bg-[#ECFEFF]" : "border-[#E2E8F0] hover:bg-[#F8FAFC]"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[#0F172A]">{site.name}</span>
                      <Badge variant={site.isActive ? "default" : "secondary"}>{site.isActive ? "Active" : "Inactive"}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-[#64748B]">{site.domain}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[#0F172A]">Tracking Snippet</h2>
                  <p className="text-xs text-[#64748B]">{selectedSite ? `Install this on ${selectedSite.domain}.` : "Create a website to generate a script."}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={!activeSiteId || snippetMutation.isPending} onClick={() => activeSiteId && snippetMutation.mutate(activeSiteId)}>Generate</Button>
                  <Button variant="outline" disabled={!snippet} onClick={copySnippet} className="gap-2"><Copy size={16} />Copy</Button>
                </div>
              </div>
              <Textarea readOnly value={snippet || "Tracking snippet will appear here."} className="mt-4 min-h-[96px] font-mono text-xs" />
            </div>

            <div className="rounded-lg border border-[#E2E8F0] bg-white">
              <div className="border-b border-[#E2E8F0] p-5">
                <h2 className="text-sm font-semibold text-[#0F172A]">Sessions</h2>
                <p className="text-xs text-[#64748B]">Click a session to inspect page views, clicks, scrolls, and errors.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead className="bg-[#F8FAFC] text-left text-xs uppercase text-[#64748B]">
                    <tr>
                      {["Started", "Entry URL", "Duration", "Browser", "Device", "Country", "Pages", "Events", "Errors"].map((item) => <th key={item} className="px-4 py-3 font-medium">{item}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {sessions.map((session: WebsiteSession) => (
                      <tr key={session.id} onClick={() => setSelectedSessionId(session.id)} className="cursor-pointer hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3 text-[#0F172A]">{formatDate(session.startedAt)}</td>
                        <td className="max-w-[260px] truncate px-4 py-3 text-[#334155]">{session.entryUrl}</td>
                        <td className="px-4 py-3">{formatDuration(session.durationMs)}</td>
                        <td className="px-4 py-3">{session.browser || "-"}</td>
                        <td className="px-4 py-3">{session.device || "-"}</td>
                        <td className="px-4 py-3">{session.country || "-"}</td>
                        <td className="px-4 py-3">{session.pageCount}</td>
                        <td className="px-4 py-3">{session.eventCount}</td>
                        <td className="px-4 py-3">{session.hasJsError ? <Badge variant="destructive">Yes</Badge> : <Badge variant="secondary">No</Badge>}</td>
                      </tr>
                    ))}
                    {sessions.length === 0 ? <tr><td colSpan={9} className="px-4 py-10 text-center text-[#64748B]">No sessions collected yet. Install the tracking snippet to start receiving data.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Sheet open={Boolean(selectedSessionId)} onOpenChange={(open) => !open && setSelectedSessionId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Session Detail</SheetTitle>
          </SheetHeader>
          {sessionDetail ? (
            <div className="mt-6 space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard label="Pages" value={String(sessionDetail.pageCount)} icon={Search} />
                <MetricCard label="Events" value={String(sessionDetail.eventCount)} icon={MousePointerClick} />
              </div>
              <div className="rounded-lg border border-[#E2E8F0] p-4 text-sm">
                <p><span className="font-medium">Entry:</span> {sessionDetail.entryUrl}</p>
                <p className="mt-2"><span className="font-medium">Exit:</span> {sessionDetail.exitUrl || "-"}</p>
                <p className="mt-2"><span className="font-medium">Browser:</span> {sessionDetail.browser || "-"} / {sessionDetail.os || "-"}</p>
              </div>
              <div className="space-y-3">
                {(sessionDetail.events || []).map((event) => (
                  <div key={event.id} className="rounded-lg border border-[#E2E8F0] bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline">{event.type}</Badge>
                      <span className="text-xs text-[#64748B]">{formatDate(event.createdAt)}</span>
                    </div>
                    <p className="mt-2 truncate text-sm text-[#334155]">{event.url}</p>
                    {event.payload ? <pre className="mt-3 max-h-44 overflow-auto rounded-md bg-[#F8FAFC] p-3 text-xs text-[#475569]">{JSON.stringify(event.payload, null, 2)}</pre> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="mt-6 text-sm text-[#64748B]">Loading session...</p>}
        </SheetContent>
      </Sheet>
    </div>
  );
}
