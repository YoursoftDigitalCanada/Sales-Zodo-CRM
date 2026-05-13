import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import rrwebPlayer from "rrweb-player";
import "rrweb-player/dist/style.css";
import { Activity, AlertTriangle, Bot, Clock, Copy, Eye, Globe2, MessageSquare, MousePointerClick, Plus, RefreshCw, Search, Share2, Sparkles, Star, Tags, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  analyzeWebsiteBehaviorSession,
  analyzeWebsiteJourneys,
  createWebsiteAiConversation,
  createWebsiteAiMessage,
  createWebsiteLiveEventSource,
  createWebsiteFunnel,
  createWebsiteAnalyticsSegment,
  createWebsiteSessionTag,
  createWebsiteHeatmapSnapshot,
  createWebsiteAnalyticsSite,
  createWebsiteAnalyticsIntegration,
  deleteWebsiteAnalyticsSegment,
  deleteWebsiteAnalyticsIntegration,
  deleteWebsiteSessionTag,
  generateWebsiteAiInsight,
  getWebsiteAiConversations,
  getWebsiteAiInsights,
  getWebsiteAiMessages,
  getWebsiteAnalyticsIngestionHealth,
  getWebsiteAnalyticsIntegrationDeliveries,
  getWebsiteAnalyticsIntegrations,
  getWebsiteAnalyticsReportAcquisition,
  getWebsiteAnalyticsReportBehavior,
  getWebsiteAnalyticsReportConversions,
  getWebsiteAnalyticsReportOverview,
  getWebsiteAnalyticsReportPages,
  getWebsiteAnalyticsReportTechnical,
  getWebsiteAnalyticsRetentionPreview,
  getWebsiteAnalyticsStorageUsage,
  getWebsiteLiveOverview,
  getWebsiteLiveSessions,
  getWebsiteBehaviorIssue,
  getWebsiteBehaviorIssues,
  getWebsiteBehaviorSignals,
  getWebsiteFunnelRunSessions,
  getWebsiteFunnels,
  getWebsiteJourneyAggregates,
  getWebsiteJourneyPath,
  getWebsiteJourneyPaths,
  getWebsiteAnalyticsSegments,
  getWebsiteFilterOptions,
  getWebsiteHeatmapPoints,
  getWebsiteHeatmaps,
  getWebsiteAnalyticsSites,
  getWebsiteAnalyticsSnippet,
  getWebsiteRecording,
  getWebsiteRecordingChunks,
  getWebsiteRecordings,
  getWebsiteSession,
  getWebsiteSessions,
  setWebsiteRecordingFavorite,
  setWebsiteRecordingLabels,
  shareWebsiteRecording,
  runWebsiteFunnel,
  deleteWebsiteAnalyticsVisitor,
  exportWebsiteAnalyticsVisitor,
  runWebsiteAnalyticsRetentionCleanup,
  summarizeWebsiteAiRecording,
  summarizeWebsiteAiSession,
  updateWebsiteAiInsightStatus,
  updateWebsiteBehaviorIssueStatus,
  updateWebsiteAnalyticsSegment,
  updateWebsiteAnalyticsIntegration,
  updateWebsiteAnalyticsSite,
  testWebsiteAnalyticsIntegration,
  type WebsiteAnalyticsSegment,
  type WebsiteAnalyticsIntegration,
  type WebsiteAnalyticsWebhookDelivery,
  type WebsiteAiConversation,
  type WebsiteAiInsight,
  type WebsiteAiMessage,
  type WebsiteLiveSessionState,
  type WebsiteBehaviorSignal,
  type WebsiteFunnel,
  type WebsiteFunnelRun,
  type WebsiteFunnelStep,
  type WebsiteJourneyPath,
  type WebsitePathAggregate,
  type WebsiteHeatmapPoint,
  type WebsiteHeatmapSnapshot,
  type WebsiteIssueGroup,
  type WebsiteAnalyticsSite,
  type WebsiteRecording,
  type WebsiteSession,
} from "@/features/website-analytics";
import { prepareReplayEvents } from "@/features/website-analytics/utils/replay-events";
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

function formatBehaviorType(value?: string) {
  return String(value || "").toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function severityBadgeVariant(severity?: string) {
  return severity === "HIGH" ? "destructive" : severity === "MEDIUM" ? "default" : "secondary";
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
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [activeTab, setActiveTab] = useState("websites");
  const [heatmapForm, setHeatmapForm] = useState({
    path: "/",
    dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    dateTo: new Date().toISOString().slice(0, 10),
    deviceType: "all",
    type: "click",
  });
  const [selectedHeatmapId, setSelectedHeatmapId] = useState<string>("");
  const [compareHeatmapId, setCompareHeatmapId] = useState<string>("");
  const [filters, setFilters] = useState({
    segmentId: "",
    dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    dateTo: new Date().toISOString().slice(0, 10),
    country: "",
    browser: "",
    os: "",
    device: "",
    path: "",
    referrer: "",
    externalUserId: "",
    tags: "",
    labels: "",
    hasJsError: "all",
    hasRecording: "all",
    isFavorite: "all",
    behaviorTypes: "",
  });
  const [segmentName, setSegmentName] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [behaviorFilters, setBehaviorFilters] = useState({ type: "all", severity: "all", status: "OPEN", path: "" });
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [funnelForm, setFunnelForm] = useState({
    name: "",
    description: "",
    steps: [
      { name: "Pricing page", type: "page", operator: "contains", value: "/pricing" },
      { name: "Lead created", type: "custom_event", operator: "equals", value: "lead_created" },
    ] as WebsiteFunnelStep[],
  });
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("");
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [aiFilters, setAiFilters] = useState({ type: "all", severity: "all", status: "GENERATED" });
  const [selectedAiConversationId, setSelectedAiConversationId] = useState<string>("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [liveFilters, setLiveFilters] = useState({ path: "", country: "", device: "", hasJsError: "all", hasBehaviorSignal: "all" });
  const [liveStatus, setLiveStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const [liveEvents, setLiveEvents] = useState<Array<{ id: string; type: string; payload: any; at: string }>>([]);
  const [integrationForm, setIntegrationForm] = useState({ provider: "CUSTOM_WEBHOOK", name: "", webhookUrl: "", signingSecret: "", events: "session.started,behavior.detected,js_error.detected" });
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>("");
  const [privacyTool, setPrivacyTool] = useState({ visitorId: "", externalUserId: "" });
  const [privacyExport, setPrivacyExport] = useState<Record<string, unknown> | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);

  const sitesQuery = useQuery({ queryKey: ["website-analytics", "sites"], queryFn: getWebsiteAnalyticsSites });
  const sites = sitesQuery.data || [];
  const selectedSite = sites.find((site) => site.id === selectedSiteId) || sites[0];
  const activeSiteId = selectedSite?.id;
  const analyticsFilters = useMemo(() => ({
    siteId: activeSiteId,
    limit: 100,
    ...(filters.segmentId ? { segmentId: filters.segmentId } : {}),
    ...(filters.dateFrom ? { dateFrom: `${filters.dateFrom}T00:00:00` } : {}),
    ...(filters.dateTo ? { dateTo: `${filters.dateTo}T23:59:59` } : {}),
    ...(filters.country ? { country: filters.country } : {}),
    ...(filters.browser ? { browser: filters.browser } : {}),
    ...(filters.os ? { os: filters.os } : {}),
    ...(filters.device ? { device: filters.device } : {}),
    ...(filters.path ? { path: filters.path } : {}),
    ...(filters.referrer ? { referrer: filters.referrer } : {}),
    ...(filters.externalUserId ? { externalUserId: filters.externalUserId } : {}),
    ...(filters.tags ? { tags: filters.tags.split(",").map((item) => item.trim()).filter(Boolean) } : {}),
    ...(filters.labels ? { labels: filters.labels.split(",").map((item) => item.trim()).filter(Boolean) } : {}),
    ...(filters.hasJsError !== "all" ? { hasJsError: filters.hasJsError } : {}),
    ...(filters.hasRecording !== "all" ? { hasRecording: filters.hasRecording } : {}),
    ...(filters.isFavorite !== "all" ? { isFavorite: filters.isFavorite } : {}),
    ...(filters.behaviorTypes ? { behaviorTypes: filters.behaviorTypes.split(",").map((item) => item.trim()).filter(Boolean) } : {}),
  }), [activeSiteId, filters]);

  const sessionsQuery = useQuery({
    queryKey: ["website-analytics", "sessions", analyticsFilters],
    queryFn: () => getWebsiteSessions(analyticsFilters),
    enabled: Boolean(activeSiteId),
  });

  const sessionDetailQuery = useQuery({
    queryKey: ["website-analytics", "session", selectedSessionId],
    queryFn: () => getWebsiteSession(selectedSessionId!),
    enabled: Boolean(selectedSessionId),
  });
  const recordingsQuery = useQuery({
    queryKey: ["website-analytics", "recordings", analyticsFilters],
    queryFn: () => getWebsiteRecordings(analyticsFilters),
    enabled: Boolean(activeSiteId),
  });
  const heatmapsQuery = useQuery({
    queryKey: ["website-analytics", "heatmaps", analyticsFilters],
    queryFn: () => getWebsiteHeatmaps(analyticsFilters),
    enabled: Boolean(activeSiteId),
  });
  const segmentsQuery = useQuery({
    queryKey: ["website-analytics", "segments", activeSiteId],
    queryFn: () => getWebsiteAnalyticsSegments({ siteId: activeSiteId }),
    enabled: Boolean(activeSiteId),
  });
  const filterOptionsQuery = useQuery({
    queryKey: ["website-analytics", "filter-options", activeSiteId, filters.dateFrom, filters.dateTo],
    queryFn: () => getWebsiteFilterOptions({ siteId: activeSiteId, dateFrom: filters.dateFrom, dateTo: filters.dateTo }),
    enabled: Boolean(activeSiteId),
  });
  const funnelsQuery = useQuery({
    queryKey: ["website-analytics", "funnels", activeSiteId],
    queryFn: () => getWebsiteFunnels({ siteId: activeSiteId }),
    enabled: Boolean(activeSiteId),
  });
  const selectedFunnel = (funnelsQuery.data || []).find((funnel) => funnel.id === selectedFunnelId) || (funnelsQuery.data || [])[0];
  const selectedRun = selectedRunId
    ? ((selectedFunnel?.runs || []).find((run) => run.id === selectedRunId) as WebsiteFunnelRun | undefined)
    : (selectedFunnel?.runs?.[0] as WebsiteFunnelRun | undefined);
  const runSessionsQuery = useQuery({
    queryKey: ["website-analytics", "funnel-run-sessions", selectedRun?.id],
    queryFn: () => getWebsiteFunnelRunSessions(selectedRun!.id, { droppedOff: true }),
    enabled: Boolean(selectedRun?.id),
  });
  const journeyAggregatesQuery = useQuery({
    queryKey: ["website-analytics", "journey-aggregates", analyticsFilters],
    queryFn: () => getWebsiteJourneyAggregates(analyticsFilters),
    enabled: Boolean(activeSiteId),
  });
  const journeyPathsQuery = useQuery({
    queryKey: ["website-analytics", "journey-paths", analyticsFilters],
    queryFn: () => getWebsiteJourneyPaths(analyticsFilters),
    enabled: Boolean(activeSiteId),
  });
  const journeyDetailQuery = useQuery({
    queryKey: ["website-analytics", "journey-path", selectedJourneyId],
    queryFn: () => getWebsiteJourneyPath(selectedJourneyId!),
    enabled: Boolean(selectedJourneyId),
  });
  const effectiveHeatmapId = selectedHeatmapId || heatmapsQuery.data?.[0]?.id || "";
  const heatmapPointsQuery = useQuery({
    queryKey: ["website-analytics", "heatmap-points", effectiveHeatmapId, heatmapForm.type],
    queryFn: () => getWebsiteHeatmapPoints(effectiveHeatmapId, { type: heatmapForm.type, limit: 8000 }),
    enabled: Boolean(effectiveHeatmapId),
  });
  const comparePointsQuery = useQuery({
    queryKey: ["website-analytics", "heatmap-points", compareHeatmapId, heatmapForm.type],
    queryFn: () => getWebsiteHeatmapPoints(compareHeatmapId, { type: heatmapForm.type, limit: 8000 }),
    enabled: Boolean(compareHeatmapId),
  });
  const behaviorQueryParams = {
    ...analyticsFilters,
    limit: 200,
    ...(behaviorFilters.type !== "all" ? { type: behaviorFilters.type } : {}),
    ...(behaviorFilters.severity !== "all" ? { severity: behaviorFilters.severity } : {}),
    ...(behaviorFilters.status !== "all" ? { status: behaviorFilters.status } : {}),
    ...(behaviorFilters.path.trim() ? { path: behaviorFilters.path.trim() } : {}),
  };
  const behaviorIssuesQuery = useQuery({
    queryKey: ["website-analytics", "behavior-issues", behaviorQueryParams],
    queryFn: () => getWebsiteBehaviorIssues(behaviorQueryParams),
    enabled: Boolean(activeSiteId),
  });
  const behaviorSignalsQuery = useQuery({
    queryKey: ["website-analytics", "behavior-signals", behaviorQueryParams],
    queryFn: () => getWebsiteBehaviorSignals(behaviorQueryParams),
    enabled: Boolean(activeSiteId),
  });
  const issueDetailQuery = useQuery({
    queryKey: ["website-analytics", "behavior-issue", selectedIssueId],
    queryFn: () => getWebsiteBehaviorIssue(selectedIssueId!),
    enabled: Boolean(selectedIssueId),
  });
  const recordingDetailQuery = useQuery({
    queryKey: ["website-analytics", "recording", selectedRecordingId],
    queryFn: () => getWebsiteRecording(selectedRecordingId!),
    enabled: Boolean(selectedRecordingId),
  });
  const recordingChunksQuery = useQuery({
    queryKey: ["website-analytics", "recording", selectedRecordingId, "chunks"],
    queryFn: () => getWebsiteRecordingChunks(selectedRecordingId!),
    enabled: Boolean(selectedRecordingId),
  });
  const aiInsightParams = {
    siteId: activeSiteId,
    ...(filters.dateFrom ? { dateFrom: `${filters.dateFrom}T00:00:00` } : {}),
    ...(filters.dateTo ? { dateTo: `${filters.dateTo}T23:59:59` } : {}),
    ...(aiFilters.type !== "all" ? { type: aiFilters.type } : {}),
    ...(aiFilters.severity !== "all" ? { severity: aiFilters.severity } : {}),
    ...(aiFilters.status !== "all" ? { status: aiFilters.status } : {}),
  };
  const aiInsightsQuery = useQuery({
    queryKey: ["website-analytics", "ai-insights", aiInsightParams],
    queryFn: () => getWebsiteAiInsights(aiInsightParams),
    enabled: Boolean(activeSiteId),
  });
  const aiConversationsQuery = useQuery({
    queryKey: ["website-analytics", "ai-conversations", activeSiteId],
    queryFn: () => getWebsiteAiConversations({ siteId: activeSiteId }),
    enabled: Boolean(activeSiteId),
  });
  const selectedAiConversation = selectedAiConversationId
    ? (aiConversationsQuery.data || []).find((item) => item.id === selectedAiConversationId)
    : (aiConversationsQuery.data || [])[0];
  const aiMessagesQuery = useQuery({
    queryKey: ["website-analytics", "ai-messages", selectedAiConversation?.id],
    queryFn: () => getWebsiteAiMessages(selectedAiConversation!.id),
    enabled: Boolean(selectedAiConversation?.id),
  });
  const liveQueryParams = {
    siteId: activeSiteId,
    ...(liveFilters.path ? { path: liveFilters.path } : {}),
    ...(liveFilters.country ? { country: liveFilters.country } : {}),
    ...(liveFilters.device ? { device: liveFilters.device } : {}),
    ...(liveFilters.hasJsError !== "all" ? { hasJsError: liveFilters.hasJsError } : {}),
    ...(liveFilters.hasBehaviorSignal !== "all" ? { hasBehaviorSignal: liveFilters.hasBehaviorSignal } : {}),
  };
  const liveOverviewQuery = useQuery({
    queryKey: ["website-analytics", "live-overview", liveQueryParams],
    queryFn: () => getWebsiteLiveOverview(liveQueryParams),
    enabled: Boolean(activeSiteId),
    refetchInterval: 5000,
  });
  const liveSessionsQuery = useQuery({
    queryKey: ["website-analytics", "live-sessions", liveQueryParams],
    queryFn: () => getWebsiteLiveSessions(liveQueryParams),
    enabled: Boolean(activeSiteId),
    refetchInterval: 5000,
  });
  const integrationsQuery = useQuery({
    queryKey: ["website-analytics", "integrations", activeSiteId],
    queryFn: () => getWebsiteAnalyticsIntegrations({ siteId: activeSiteId }),
    enabled: Boolean(activeSiteId),
  });
  const selectedIntegration = selectedIntegrationId
    ? (integrationsQuery.data || []).find((item) => item.id === selectedIntegrationId)
    : (integrationsQuery.data || [])[0];
  const integrationDeliveriesQuery = useQuery({
    queryKey: ["website-analytics", "integration-deliveries", selectedIntegration?.id],
    queryFn: () => getWebsiteAnalyticsIntegrationDeliveries(selectedIntegration!.id),
    enabled: Boolean(selectedIntegration?.id),
  });
  const reportOverviewQuery = useQuery({ queryKey: ["website-analytics", "report-overview", analyticsFilters], queryFn: () => getWebsiteAnalyticsReportOverview(analyticsFilters), enabled: Boolean(activeSiteId) });
  const reportPagesQuery = useQuery({ queryKey: ["website-analytics", "report-pages", analyticsFilters], queryFn: () => getWebsiteAnalyticsReportPages(analyticsFilters), enabled: Boolean(activeSiteId) });
  const reportAcquisitionQuery = useQuery({ queryKey: ["website-analytics", "report-acquisition", analyticsFilters], queryFn: () => getWebsiteAnalyticsReportAcquisition(analyticsFilters), enabled: Boolean(activeSiteId) });
  const reportBehaviorQuery = useQuery({ queryKey: ["website-analytics", "report-behavior", analyticsFilters], queryFn: () => getWebsiteAnalyticsReportBehavior(analyticsFilters), enabled: Boolean(activeSiteId) });
  const reportTechnicalQuery = useQuery({ queryKey: ["website-analytics", "report-technical", analyticsFilters], queryFn: () => getWebsiteAnalyticsReportTechnical(analyticsFilters), enabled: Boolean(activeSiteId) });
  const reportConversionsQuery = useQuery({ queryKey: ["website-analytics", "report-conversions", analyticsFilters], queryFn: () => getWebsiteAnalyticsReportConversions(analyticsFilters), enabled: Boolean(activeSiteId) });
  const retentionPreviewQuery = useQuery({ queryKey: ["website-analytics", "retention-preview", activeSiteId], queryFn: () => getWebsiteAnalyticsRetentionPreview({ siteId: activeSiteId }), enabled: Boolean(activeSiteId) });
  const storageUsageQuery = useQuery({ queryKey: ["website-analytics", "storage", activeSiteId], queryFn: () => getWebsiteAnalyticsStorageUsage({ siteId: activeSiteId }), enabled: Boolean(activeSiteId) });
  const ingestionHealthQuery = useQuery({ queryKey: ["website-analytics", "ingestion", activeSiteId], queryFn: () => getWebsiteAnalyticsIngestionHealth({ siteId: activeSiteId }), enabled: Boolean(activeSiteId) });

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
  const updateSiteMutation = useMutation({
    mutationFn: ({ id, privacySettings }: { id: string; privacySettings: Record<string, unknown> }) => updateWebsiteAnalyticsSite(id, { privacySettings } as any),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "sites"] });
      toast({ title: "Privacy settings saved" });
    },
  });
  const favoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) => setWebsiteRecordingFavorite(id, isFavorite),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "recordings"] });
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "recording", selectedRecordingId] });
    },
  });
  const labelsMutation = useMutation({
    mutationFn: ({ id, labels }: { id: string; labels: string[] }) => setWebsiteRecordingLabels(id, labels),
    onSuccess: async () => {
      setLabelDraft("");
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "recordings"] });
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "recording", selectedRecordingId] });
    },
  });
  const shareMutation = useMutation({
    mutationFn: shareWebsiteRecording,
    onSuccess: async (result) => {
      const url = `${window.location.origin}/shared-recording/${result.shareToken}`;
      await navigator.clipboard.writeText(url);
      toast({ title: "Share link copied", description: "The public replay link is now on your clipboard." });
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "recording", selectedRecordingId] });
    },
  });
  const heatmapMutation = useMutation({
    mutationFn: createWebsiteHeatmapSnapshot,
    onSuccess: async (snapshot) => {
      setSelectedHeatmapId(snapshot.id);
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "heatmaps"] });
      toast({ title: "Heatmap generated", description: "Snapshot is ready to inspect." });
    },
  });
  const segmentMutation = useMutation({
    mutationFn: () => createWebsiteAnalyticsSegment({
      name: segmentName,
      siteId: activeSiteId,
      filters: analyticsFilters,
      isShared: true,
    }),
    onSuccess: async (segment) => {
      setSegmentName("");
      setFilters((current) => ({ ...current, segmentId: segment.id }));
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "segments"] });
      toast({ title: "Segment saved", description: "The current filters are now reusable." });
    },
  });
  const deleteSegmentMutation = useMutation({
    mutationFn: deleteWebsiteAnalyticsSegment,
    onSuccess: async () => {
      setFilters((current) => ({ ...current, segmentId: "" }));
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "segments"] });
    },
  });
  const defaultSegmentMutation = useMutation({
    mutationFn: ({ id, isDefault }: { id: string; isDefault: boolean }) => updateWebsiteAnalyticsSegment(id, { isDefault } as any),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "segments"] });
      toast({ title: "Default segment updated" });
    },
  });
  const tagMutation = useMutation({
    mutationFn: ({ sessionId, name }: { sessionId: string; name: string }) => createWebsiteSessionTag(sessionId, { name }),
    onSuccess: async () => {
      setTagDraft("");
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "session", selectedSessionId] });
    },
  });
  const createFunnelMutation = useMutation({
    mutationFn: () => createWebsiteFunnel({ siteId: activeSiteId, name: funnelForm.name, description: funnelForm.description, steps: funnelForm.steps, segmentId: filters.segmentId || undefined }),
    onSuccess: async (funnel) => {
      setSelectedFunnelId(funnel.id);
      setFunnelForm((current) => ({ ...current, name: "", description: "" }));
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "funnels"] });
      toast({ title: "Funnel saved" });
    },
  });
  const runFunnelMutation = useMutation({
    mutationFn: (id: string) => runWebsiteFunnel(id, { dateFrom: `${filters.dateFrom}T00:00:00`, dateTo: `${filters.dateTo}T23:59:59`, segmentId: filters.segmentId || undefined, filters: analyticsFilters }),
    onSuccess: async (run) => {
      setSelectedRunId(run.id);
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "funnels"] });
      toast({ title: "Funnel analyzed", description: `${run.totalConversions} conversions from ${run.totalEntrants} entrants.` });
    },
  });
  const journeyAnalyzeMutation = useMutation({
    mutationFn: () => analyzeWebsiteJourneys({ ...analyticsFilters, siteId: activeSiteId, dateFrom: `${filters.dateFrom}T00:00:00`, dateTo: `${filters.dateTo}T23:59:59` }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "journey"] });
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "journey-paths"] });
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "journey-aggregates"] });
      toast({ title: "Journeys analyzed", description: `${result.pathCount} paths extracted.` });
    },
  });
  const deleteTagMutation = useMutation({
    mutationFn: ({ sessionId, tagId }: { sessionId: string; tagId: string }) => deleteWebsiteSessionTag(sessionId, tagId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "session", selectedSessionId] });
    },
  });
  const issueStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "OPEN" | "IGNORED" | "RESOLVED" }) => updateWebsiteBehaviorIssueStatus(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "behavior-issues"] });
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "behavior-issue", selectedIssueId] });
      toast({ title: "Issue status updated" });
    },
  });
  const analyzeSessionMutation = useMutation({
    mutationFn: analyzeWebsiteBehaviorSession,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "behavior"] });
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "behavior-issues"] });
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "behavior-signals"] });
      toast({ title: "Session analyzed", description: `${result.signalCount} behavior signals found.` });
    },
  });
  const generateAiInsightMutation = useMutation({
    mutationFn: (type: string) => generateWebsiteAiInsight({
      type,
      siteId: activeSiteId,
      filters: analyticsFilters,
      dateFrom: filters.dateFrom ? `${filters.dateFrom}T00:00:00` : undefined,
      dateTo: filters.dateTo ? `${filters.dateTo}T23:59:59` : undefined,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "ai-insights"] });
      toast({ title: "AI insight generated" });
    },
  });
  const updateAiInsightMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "GENERATED" | "DISMISSED" | "ARCHIVED" }) => updateWebsiteAiInsightStatus(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "ai-insights"] });
    },
  });
  const createAiConversationMutation = useMutation({
    mutationFn: () => createWebsiteAiConversation({ siteId: activeSiteId, filters: analyticsFilters, title: "Website analytics chat" }),
    onSuccess: async (conversation) => {
      setSelectedAiConversationId(conversation.id);
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "ai-conversations"] });
    },
  });
  const sendAiMessageMutation = useMutation({
    mutationFn: async () => {
      const content = aiPrompt.trim();
      if (!content) throw new Error("Message is required");
      const conversation = selectedAiConversation || await createWebsiteAiConversation({ siteId: activeSiteId, filters: analyticsFilters, title: content.slice(0, 80) });
      setSelectedAiConversationId(conversation.id);
      return createWebsiteAiMessage(conversation.id, { content });
    },
    onSuccess: async () => {
      setAiPrompt("");
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "ai-conversations"] });
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "ai-messages"] });
    },
  });
  const sessionAiSummaryMutation = useMutation({
    mutationFn: summarizeWebsiteAiSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "ai-insights"] });
      toast({ title: "Session AI summary generated" });
    },
  });
  const recordingAiSummaryMutation = useMutation({
    mutationFn: summarizeWebsiteAiRecording,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "ai-insights"] });
      toast({ title: "Recording AI summary generated" });
    },
  });
  const createIntegrationMutation = useMutation({
    mutationFn: () => createWebsiteAnalyticsIntegration({
      siteId: activeSiteId,
      provider: integrationForm.provider,
      name: integrationForm.name || integrationForm.provider.replace(/_/g, " "),
      config: { webhookUrl: integrationForm.webhookUrl, events: integrationForm.events.split(",").map((item) => item.trim()).filter(Boolean) },
      secretConfig: integrationForm.signingSecret ? { signingSecret: integrationForm.signingSecret } : {},
    }),
    onSuccess: async (integration) => {
      setSelectedIntegrationId(integration.id);
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "integrations"] });
      toast({ title: "Integration saved" });
    },
  });
  const deleteIntegrationMutation = useMutation({
    mutationFn: deleteWebsiteAnalyticsIntegration,
    onSuccess: async () => {
      setSelectedIntegrationId("");
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "integrations"] });
    },
  });
  const testIntegrationMutation = useMutation({
    mutationFn: testWebsiteAnalyticsIntegration,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["website-analytics", "integration-deliveries"] });
      toast({ title: "Integration test queued" });
    },
  });
  const visitorExportMutation = useMutation({
    mutationFn: exportWebsiteAnalyticsVisitor,
    onSuccess: (data) => setPrivacyExport(data),
  });
  const visitorDeleteMutation = useMutation({
    mutationFn: deleteWebsiteAnalyticsVisitor,
    onSuccess: async () => {
      setPrivacyExport(null);
      await queryClient.invalidateQueries({ queryKey: ["website-analytics"] });
      toast({ title: "Visitor data deleted" });
    },
  });
  const retentionCleanupMutation = useMutation({
    mutationFn: () => runWebsiteAnalyticsRetentionCleanup({ siteId: activeSiteId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["website-analytics"] });
      toast({ title: "Retention cleanup completed" });
    },
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
  const recordings = recordingsQuery.data || [];
  const heatmaps = heatmapsQuery.data || [];
  const segments = segmentsQuery.data || [];
  const filterOptions = filterOptionsQuery.data;
  const behaviorIssues = behaviorIssuesQuery.data || [];
  const behaviorSignals = behaviorSignalsQuery.data || [];
  const selectedIssue = issueDetailQuery.data;
  const aiInsights = aiInsightsQuery.data || [];
  const aiConversations = aiConversationsQuery.data || [];
  const aiMessages = aiMessagesQuery.data || [];
  const liveOverview = liveOverviewQuery.data;
  const liveSessions = liveSessionsQuery.data || [];
  const integrations = integrationsQuery.data || [];
  const integrationDeliveries = integrationDeliveriesQuery.data || [];
  const reportOverview = reportOverviewQuery.data || {};
  const funnels = funnelsQuery.data || [];
  const journeyAggregates = journeyAggregatesQuery.data || [];
  const journeyPaths = journeyPathsQuery.data || [];
  const selectedJourney = journeyDetailQuery.data;
  const runSessions = runSessionsQuery.data || [];
  const selectedHeatmap = heatmaps.find((item) => item.id === effectiveHeatmapId) || heatmaps[0];
  const compareHeatmap = heatmaps.find((item) => item.id === compareHeatmapId);
  const heatmapPoints = heatmapPointsQuery.data || [];
  const comparePoints = comparePointsQuery.data || [];
  const recordingDetail = recordingDetailQuery.data;
  const replayEvents = useMemo(
    () => prepareReplayEvents((recordingChunksQuery.data?.chunks || []).flatMap((chunk) => chunk.events || [])),
    [recordingChunksQuery.data],
  );
  const behaviorSummary = useMemo(() => {
    const types = ["RAGE_CLICK", "DEAD_CLICK", "QUICK_BACK", "EXCESSIVE_SCROLL", "JS_ERROR", "BROKEN_INTERACTION"];
    return types.map((type) => ({
      type,
      count: behaviorIssues.filter((issue) => issue.type === type).reduce((sum, issue) => sum + (issue.occurrenceCount || 0), 0),
    }));
  }, [behaviorIssues]);
  const severitySummary = useMemo(() => {
    return ["HIGH", "MEDIUM", "LOW"].map((severity) => ({
      severity,
      count: behaviorIssues.filter((issue) => issue.severity === severity).length,
    }));
  }, [behaviorIssues]);
  const topAffectedPages = useMemo(() => {
    const map = new Map<string, number>();
    behaviorIssues.forEach((issue) => {
      const key = issue.path || issue.url || "Unknown page";
      map.set(key, (map.get(key) || 0) + (issue.occurrenceCount || 0));
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [behaviorIssues]);

  useEffect(() => {
    if (!playerRef.current || replayEvents.length < 2) return;
    playerRef.current.innerHTML = "";
    const player = new rrwebPlayer({
      target: playerRef.current,
      props: {
        events: replayEvents,
        width: Math.min(900, playerRef.current.clientWidth || 900),
        height: 520,
        showController: true,
        speedOption: [0.5, 1, 1.5, 2, 4],
      },
    } as any);
    return () => {
      playerRef.current && (playerRef.current.innerHTML = "");
      void player;
    };
  }, [replayEvents]);

  useEffect(() => {
    if (!activeSiteId) return;
    setLiveStatus("connecting");
    const source = createWebsiteLiveEventSource(liveQueryParams);
    const refresh = () => {
      void liveOverviewQuery.refetch();
      void liveSessionsQuery.refetch();
    };
    source.onopen = () => setLiveStatus("connected");
    source.addEventListener("connected", () => setLiveStatus("connected"));
    source.onerror = () => setLiveStatus("disconnected");
    ["overview.updated", "session.started", "session.updated", "session.ended", "event.received", "error.received", "behavior.detected", "recording.started", "recording.ended"].forEach((type) => {
      source.addEventListener(type, (event) => {
        const payload = JSON.parse((event as MessageEvent).data || "{}");
        if (["event.received", "error.received", "behavior.detected"].includes(type)) {
          setLiveEvents((current) => [{ id: `${type}-${Date.now()}-${Math.random()}`, type, payload, at: new Date().toISOString() }, ...current].slice(0, 80));
        }
        refresh();
      });
    });
    return () => source.close();
  }, [activeSiteId, liveFilters.path, liveFilters.country, liveFilters.device, liveFilters.hasJsError, liveFilters.hasBehaviorSignal]);

  const copySnippet = async () => {
    if (!snippet) return;
    await navigator.clipboard.writeText(snippet);
    toast({ title: "Snippet copied", description: "Paste it before the closing body tag on your website." });
  };

  const privacy = (selectedSite?.privacySettings || {}) as Record<string, any>;
  const updatePrivacy = (patch: Record<string, unknown>) => {
    if (!selectedSite) return;
    updateSiteMutation.mutate({ id: selectedSite.id, privacySettings: { ...privacy, ...patch } });
  };

  const generateHeatmap = () => {
    if (!activeSiteId) return;
    heatmapMutation.mutate({
      siteId: activeSiteId,
      path: heatmapForm.path || "/",
      deviceType: heatmapForm.deviceType,
      dateFrom: new Date(`${heatmapForm.dateFrom}T00:00:00`).toISOString(),
      dateTo: new Date(`${heatmapForm.dateTo}T23:59:59`).toISOString(),
    });
  };

  const renderHeatmapCanvas = (points: WebsiteHeatmapPoint[], snapshot?: WebsiteHeatmapSnapshot, label = "Heatmap") => {
    const displayPoints = points.filter((point) => point.type.toLowerCase() === heatmapForm.type || (heatmapForm.type === "click" && point.type === "CLICK")).slice(0, 1200);
    return (
      <div className="rounded-lg border border-[#E2E8F0] bg-white">
        <div className="border-b border-[#E2E8F0] p-4">
          <h3 className="text-sm font-semibold text-[#0F172A]">{label}</h3>
          <p className="mt-1 truncate text-xs text-[#64748B]">{snapshot?.path || heatmapForm.path || "/"}</p>
        </div>
        <div className="relative mx-auto my-5 h-[520px] w-full max-w-[840px] overflow-hidden rounded-md border border-[#CBD5E1] bg-gradient-to-b from-white to-[#F8FAFC]">
          <div className="absolute inset-x-0 top-0 border-b border-dashed border-[#CBD5E1] bg-white/80 px-3 py-2 text-xs text-[#64748B]">{snapshot?.url || "Page preview placeholder"}</div>
          {heatmapForm.type === "scroll" ? (
            <div className="absolute inset-x-0 top-10 bottom-0">
              {((snapshot?.metadata?.scrollBands as any[]) || []).map((band, index) => (
                <div key={band.depth} className="absolute inset-x-0 border-t border-white/80" style={{ top: `${Math.min(100, band.depth)}%`, height: "25%", background: `rgba(8, 145, 178, ${0.08 + (band.percentage / 100) * 0.42})` }}>
                  <span className="ml-3 text-xs font-medium text-[#0F172A]">{band.depth}% depth · {band.percentage}%</span>
                </div>
              ))}
            </div>
          ) : displayPoints.map((point, index) => (
            <span
              key={`${point.id}-${index}`}
              className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[1px]"
              style={{
                left: `${Math.max(0, Math.min(1, point.normalizedX ?? 0)) * 100}%`,
                top: `${Math.max(0, Math.min(1, point.normalizedY ?? 0)) * 100}%`,
                background: heatmapForm.type === "click" ? "rgba(239,68,68,0.5)" : "rgba(8,145,178,0.35)",
                boxShadow: heatmapForm.type === "click" ? "0 0 18px rgba(239,68,68,0.75)" : "0 0 18px rgba(8,145,178,0.55)",
              }}
              title={point.selector || point.type}
            />
          ))}
        </div>
      </div>
    );
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

        <section className="rounded-lg border border-[#E2E8F0] bg-white p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#0F172A]">Filters & Segments</h2>
              <p className="text-xs text-[#64748B]">Apply one filter set across sessions, recordings, heatmaps, and behavior issues.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input className="w-48" value={segmentName} onChange={(event) => setSegmentName(event.target.value)} placeholder="Segment name" />
              <Button variant="outline" disabled={!segmentName.trim() || segmentMutation.isPending} onClick={() => segmentMutation.mutate()}>Save Segment</Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-1">
              <Label>Segment</Label>
              <select className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm" value={filters.segmentId} onChange={(event) => setFilters((current) => ({ ...current, segmentId: event.target.value }))}>
                <option value="">Current filters</option>
                {segments.map((segment: WebsiteAnalyticsSegment) => <option key={segment.id} value={segment.id}>{segment.isDefault ? "★ " : ""}{segment.name}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label>Date From</Label><Input type="date" value={filters.dateFrom} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Date To</Label><Input type="date" value={filters.dateTo} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Country</Label><Input list="wa-countries" value={filters.country} onChange={(event) => setFilters((current) => ({ ...current, country: event.target.value }))} placeholder="Canada" /></div>
            <div className="space-y-1"><Label>Browser</Label><Input list="wa-browsers" value={filters.browser} onChange={(event) => setFilters((current) => ({ ...current, browser: event.target.value }))} placeholder="Chrome" /></div>
            <div className="space-y-1"><Label>Device</Label><Input list="wa-devices" value={filters.device} onChange={(event) => setFilters((current) => ({ ...current, device: event.target.value }))} placeholder="Desktop" /></div>
            <div className="space-y-1"><Label>OS</Label><Input list="wa-os" value={filters.os} onChange={(event) => setFilters((current) => ({ ...current, os: event.target.value }))} placeholder="macOS" /></div>
            <div className="space-y-1"><Label>URL / Path</Label><Input list="wa-pages" value={filters.path} onChange={(event) => setFilters((current) => ({ ...current, path: event.target.value }))} placeholder="/pricing" /></div>
            <div className="space-y-1"><Label>Referrer</Label><Input list="wa-referrers" value={filters.referrer} onChange={(event) => setFilters((current) => ({ ...current, referrer: event.target.value }))} placeholder="google.com" /></div>
            <div className="space-y-1"><Label>User ID</Label><Input value={filters.externalUserId} onChange={(event) => setFilters((current) => ({ ...current, externalUserId: event.target.value }))} placeholder="user_123" /></div>
            <div className="space-y-1"><Label>Tags</Label><Input list="wa-tags" value={filters.tags} onChange={(event) => setFilters((current) => ({ ...current, tags: event.target.value }))} placeholder="pricing-interest" /></div>
            <div className="space-y-1"><Label>Labels</Label><Input list="wa-labels" value={filters.labels} onChange={(event) => setFilters((current) => ({ ...current, labels: event.target.value }))} placeholder="bug, vip" /></div>
            <div className="space-y-1">
              <Label>Errors</Label>
              <select className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm" value={filters.hasJsError} onChange={(event) => setFilters((current) => ({ ...current, hasJsError: event.target.value }))}>
                <option value="all">All</option><option value="true">With errors</option><option value="false">No errors</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Recording</Label>
              <select className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm" value={filters.hasRecording} onChange={(event) => setFilters((current) => ({ ...current, hasRecording: event.target.value }))}>
                <option value="all">All</option><option value="true">Available</option><option value="false">Missing</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Favorite</Label>
              <select className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm" value={filters.isFavorite} onChange={(event) => setFilters((current) => ({ ...current, isFavorite: event.target.value }))}>
                <option value="all">All</option><option value="true">Favorites</option><option value="false">Not favorite</option>
              </select>
            </div>
            <div className="space-y-1"><Label>Behavior</Label><Input list="wa-behaviors" value={filters.behaviorTypes} onChange={(event) => setFilters((current) => ({ ...current, behaviorTypes: event.target.value }))} placeholder="RAGE_CLICK" /></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.segmentId ? <Button variant="outline" onClick={() => defaultSegmentMutation.mutate({ id: filters.segmentId, isDefault: true })}>Mark Default</Button> : null}
            {filters.segmentId ? <Button variant="outline" onClick={() => deleteSegmentMutation.mutate(filters.segmentId)}>Delete Segment</Button> : null}
            <Button variant="outline" onClick={() => setFilters((current) => ({ ...current, segmentId: "", country: "", browser: "", os: "", device: "", path: "", referrer: "", externalUserId: "", tags: "", labels: "", hasJsError: "all", hasRecording: "all", isFavorite: "all", behaviorTypes: "" }))}>Clear Filters</Button>
          </div>
          <datalist id="wa-countries">{(filterOptions?.countries || []).map((item) => <option key={item} value={item} />)}</datalist>
          <datalist id="wa-browsers">{(filterOptions?.browsers || []).map((item) => <option key={item} value={item} />)}</datalist>
          <datalist id="wa-devices">{(filterOptions?.devices || []).map((item) => <option key={item} value={item} />)}</datalist>
          <datalist id="wa-os">{(filterOptions?.operatingSystems || []).map((item) => <option key={item} value={item} />)}</datalist>
          <datalist id="wa-pages">{(filterOptions?.pages || []).map((item) => <option key={item} value={item} />)}</datalist>
          <datalist id="wa-referrers">{(filterOptions?.referrers || []).map((item) => <option key={item} value={item} />)}</datalist>
          <datalist id="wa-tags">{(filterOptions?.tags || []).map((item) => <option key={item} value={item} />)}</datalist>
          <datalist id="wa-labels">{(filterOptions?.labels || []).map((item) => <option key={item} value={item} />)}</datalist>
          <datalist id="wa-behaviors">{(filterOptions?.behaviorTypes || []).map((item) => <option key={item} value={item} />)}</datalist>
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <div className="rounded-lg border border-[#E2E8F0] bg-white p-2">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 lg:grid-cols-12">
              <TabsTrigger value="websites" className="gap-2 rounded-md py-3 data-[state=active]:bg-[#ECFEFF] data-[state=active]:text-[#0E7490] data-[state=active]:shadow-none"><Globe2 size={16} />Websites</TabsTrigger>
              <TabsTrigger value="privacy" className="gap-2 rounded-md py-3 data-[state=active]:bg-[#ECFEFF] data-[state=active]:text-[#0E7490] data-[state=active]:shadow-none"><Eye size={16} />Privacy & Tracking</TabsTrigger>
              <TabsTrigger value="sessions" className="gap-2 rounded-md py-3 data-[state=active]:bg-[#ECFEFF] data-[state=active]:text-[#0E7490] data-[state=active]:shadow-none"><Activity size={16} />Sessions</TabsTrigger>
              <TabsTrigger value="recordings" className="gap-2 rounded-md py-3 data-[state=active]:bg-[#ECFEFF] data-[state=active]:text-[#0E7490] data-[state=active]:shadow-none"><MousePointerClick size={16} />Recordings</TabsTrigger>
              <TabsTrigger value="live" className="gap-2 rounded-md py-3 data-[state=active]:bg-[#ECFEFF] data-[state=active]:text-[#0E7490] data-[state=active]:shadow-none"><Wifi size={16} />Live</TabsTrigger>
              <TabsTrigger value="heatmaps" className="gap-2 rounded-md py-3 data-[state=active]:bg-[#ECFEFF] data-[state=active]:text-[#0E7490] data-[state=active]:shadow-none"><Activity size={16} />Heatmaps</TabsTrigger>
              <TabsTrigger value="behavior" className="gap-2 rounded-md py-3 data-[state=active]:bg-[#ECFEFF] data-[state=active]:text-[#0E7490] data-[state=active]:shadow-none"><AlertTriangle size={16} />Behavior</TabsTrigger>
              <TabsTrigger value="funnels" className="gap-2 rounded-md py-3 data-[state=active]:bg-[#ECFEFF] data-[state=active]:text-[#0E7490] data-[state=active]:shadow-none"><Activity size={16} />Funnels</TabsTrigger>
              <TabsTrigger value="ai" className="gap-2 rounded-md py-3 data-[state=active]:bg-[#ECFEFF] data-[state=active]:text-[#0E7490] data-[state=active]:shadow-none"><Sparkles size={16} />AI Insights</TabsTrigger>
              <TabsTrigger value="integrations" className="gap-2 rounded-md py-3 data-[state=active]:bg-[#ECFEFF] data-[state=active]:text-[#0E7490] data-[state=active]:shadow-none"><Share2 size={16} />Integrations</TabsTrigger>
              <TabsTrigger value="reports" className="gap-2 rounded-md py-3 data-[state=active]:bg-[#ECFEFF] data-[state=active]:text-[#0E7490] data-[state=active]:shadow-none"><Search size={16} />Reports</TabsTrigger>
              <TabsTrigger value="admin" className="gap-2 rounded-md py-3 data-[state=active]:bg-[#ECFEFF] data-[state=active]:text-[#0E7490] data-[state=active]:shadow-none"><Activity size={16} />Admin</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="websites" className="mt-0 space-y-5">
            <section className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
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
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {sites.length === 0 ? <p className="rounded-md bg-[#F8FAFC] p-4 text-sm text-[#64748B] md:col-span-2">No websites connected yet.</p> : null}
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
            </section>
          </TabsContent>

          <TabsContent value="privacy" className="mt-0 space-y-5">
            <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
                <h2 className="text-sm font-semibold text-[#0F172A]">Tracking Snippet</h2>
                <p className="mt-1 text-xs text-[#64748B]">{selectedSite ? `Install this on ${selectedSite.domain}.` : "Create a website to generate a script."}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" disabled={!activeSiteId || snippetMutation.isPending} onClick={() => activeSiteId && snippetMutation.mutate(activeSiteId)}>Generate</Button>
                  <Button variant="outline" disabled={!snippet} onClick={copySnippet} className="gap-2"><Copy size={16} />Copy</Button>
                </div>
                <Textarea readOnly value={snippet || "Tracking snippet will appear here."} className="mt-4 min-h-[132px] font-mono text-xs" />
              </div>

              <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
                <h2 className="text-sm font-semibold text-[#0F172A]">Privacy & Recording Settings</h2>
                <div className="mt-4 grid gap-3">
                  {[
                    ["trackingEnabled", "Enable tracking"],
                    ["consentMode", "Consent mode"],
                    ["requireConsentForRecording", "Require recording consent"],
                    ["requireConsentForCookies", "Require cookie consent"],
                    ["recordingsEnabled", "Record sessions"],
                    ["heatmapsEnabled", "Collect heatmaps"],
                    ["aiProcessingEnabled", "Allow AI processing"],
                    ["maskAllInputs", "Mask all inputs"],
                    ["maskTextByDefault", "Mask text by default"],
                    ["respectDoNotTrack", "Respect Do Not Track"],
                    ["ipAnonymizationEnabled", "Anonymize IP"],
                    ["piiRedactionEnabled", "Redact PII"],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between rounded-md border border-[#E2E8F0] px-3 py-2 text-sm">
                      <span>{label}</span>
                      <input type="checkbox" checked={privacy[key] !== false} onChange={(event) => updatePrivacy({ [key]: event.target.checked })} />
                    </label>
                  ))}
                  <div className="space-y-2">
                    <Label>Retention Days</Label>
                    <Input type="number" value={privacy.dataRetentionDays || privacy.retentionDays || 30} onChange={(event) => updatePrivacy({ dataRetentionDays: Number(event.target.value || 30), retentionDays: Number(event.target.value || 30) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Recording Retention Days</Label>
                    <Input type="number" value={privacy.recordingRetentionDays || 30} onChange={(event) => updatePrivacy({ recordingRetentionDays: Number(event.target.value || 30) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Mask Selectors</Label>
                    <Input value={(privacy.maskSelectors || []).join(", ")} onChange={(event) => updatePrivacy({ maskSelectors: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder=".private, [data-secret]" />
                  </div>
                  <div className="space-y-2">
                    <Label>Block Selectors</Label>
                    <Input value={(privacy.blockSelectors || []).join(", ")} onChange={(event) => updatePrivacy({ blockSelectors: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder=".billing-card, iframe" />
                  </div>
                  <div className="space-y-2">
                    <Label>Allowed Domains</Label>
                    <Input value={(privacy.allowedDomains || []).join(", ")} onChange={(event) => updatePrivacy({ allowedDomains: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="example.com, app.example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Blocked Countries</Label>
                    <Input value={(privacy.blockedCountries || []).join(", ")} onChange={(event) => updatePrivacy({ blockedCountries: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="EU, Germany" />
                  </div>
                </div>
              </div>
            </section>
            <section className="rounded-lg border border-[#E2E8F0] bg-white p-5">
              <h2 className="text-sm font-semibold text-[#0F172A]">Visitor Privacy Tools</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
                <Input value={privacyTool.visitorId} onChange={(event) => setPrivacyTool((current) => ({ ...current, visitorId: event.target.value }))} placeholder="Visitor ID" />
                <Input value={privacyTool.externalUserId} onChange={(event) => setPrivacyTool((current) => ({ ...current, externalUserId: event.target.value }))} placeholder="External user ID" />
                <Button variant="outline" onClick={() => visitorExportMutation.mutate(privacyTool)}>Export</Button>
                <Button variant="outline" onClick={() => visitorDeleteMutation.mutate(privacyTool)}>Delete</Button>
              </div>
              {privacyExport ? <pre className="mt-4 max-h-80 overflow-auto rounded-md bg-[#F8FAFC] p-3 text-xs text-[#475569]">{JSON.stringify(privacyExport, null, 2)}</pre> : null}
            </section>
          </TabsContent>

          <TabsContent value="sessions" className="mt-0">
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
          </TabsContent>

          <TabsContent value="recordings" className="mt-0">
            <div className="rounded-lg border border-[#E2E8F0] bg-white">
              <div className="border-b border-[#E2E8F0] p-5">
                <h2 className="text-sm font-semibold text-[#0F172A]">Session Recordings</h2>
                <p className="text-xs text-[#64748B]">Replay rrweb recordings captured by the tracking script.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-[#F8FAFC] text-left text-xs uppercase text-[#64748B]">
                    <tr>
                      {["", "Started", "Entry URL", "Duration", "Browser", "Device", "Country", "Events", "JS Error", "Labels", "Replay"].map((item) => <th key={item} className="px-4 py-3 font-medium">{item}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {recordings.map((recording: WebsiteRecording) => (
                      <tr key={recording.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3"><button onClick={() => favoriteMutation.mutate({ id: recording.id, isFavorite: !recording.isFavorite })}><Star size={16} className={recording.isFavorite ? "fill-amber-400 text-amber-500" : "text-[#94A3B8]"} /></button></td>
                        <td className="px-4 py-3">{formatDate(recording.startedAt)}</td>
                        <td className="max-w-[260px] truncate px-4 py-3">{recording.session?.entryUrl || "-"}</td>
                        <td className="px-4 py-3">{formatDuration(recording.durationMs)}</td>
                        <td className="px-4 py-3">{recording.session?.browser || "-"}</td>
                        <td className="px-4 py-3">{recording.session?.device || "-"}</td>
                        <td className="px-4 py-3">{recording.session?.country || "-"}</td>
                        <td className="px-4 py-3">{recording.eventCount}</td>
                        <td className="px-4 py-3">{recording.session?.hasJsError ? <Badge variant="destructive">Yes</Badge> : <Badge variant="secondary">No</Badge>}</td>
                        <td className="px-4 py-3">{(recording.labels || []).join(", ") || "-"}</td>
                        <td className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => setSelectedRecordingId(recording.id)} className="gap-2"><Eye size={14} />Open</Button></td>
                      </tr>
                    ))}
                    {recordings.length === 0 ? <tr><td colSpan={11} className="px-4 py-10 text-center text-[#64748B]">No recordings yet. Recordings appear after the snippet is installed and visitors browse your website.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="live" className="mt-0 space-y-5">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Active Sessions" value={formatNumber(liveOverview?.activeSessionCount)} icon={Wifi} />
              <MetricCard label="Active Visitors" value={formatNumber(liveOverview?.activeVisitors)} icon={Globe2} />
              <MetricCard label="Live Errors" value={formatNumber(liveOverview?.liveErrorsCount)} icon={AlertTriangle} />
              <MetricCard label="Behavior Alerts" value={formatNumber(liveOverview?.liveBehaviorAlertsCount)} icon={MousePointerClick} />
              <MetricCard label="Recording Now" value={formatNumber(liveOverview?.activeRecordingsCount)} icon={Eye} />
            </section>

            <section className="rounded-lg border border-[#E2E8F0] bg-white p-5">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]"><Wifi size={16} />Live Analytics</h2>
                  <p className="text-xs text-[#64748B]">Connection: <span className={liveStatus === "connected" ? "text-[#159A62]" : "text-[#B45309]"}>{liveStatus}</span></p>
                </div>
                <Button variant="outline" onClick={() => { void liveOverviewQuery.refetch(); void liveSessionsQuery.refetch(); }} className="gap-2"><RefreshCw size={16} />Refresh</Button>
              </div>
              <div className="grid gap-3 md:grid-cols-5">
                <div className="space-y-1"><Label>Page / Path</Label><Input value={liveFilters.path} onChange={(event) => setLiveFilters((current) => ({ ...current, path: event.target.value }))} placeholder="/pricing" /></div>
                <div className="space-y-1"><Label>Country</Label><Input value={liveFilters.country} onChange={(event) => setLiveFilters((current) => ({ ...current, country: event.target.value }))} placeholder="Canada" /></div>
                <div className="space-y-1"><Label>Device</Label><Input value={liveFilters.device} onChange={(event) => setLiveFilters((current) => ({ ...current, device: event.target.value }))} placeholder="Desktop" /></div>
                <div className="space-y-1">
                  <Label>Errors</Label>
                  <select className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm" value={liveFilters.hasJsError} onChange={(event) => setLiveFilters((current) => ({ ...current, hasJsError: event.target.value }))}>
                    <option value="all">All</option><option value="true">With errors</option><option value="false">No errors</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Behavior</Label>
                  <select className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm" value={liveFilters.hasBehaviorSignal} onChange={(event) => setLiveFilters((current) => ({ ...current, hasBehaviorSignal: event.target.value }))}>
                    <option value="all">All</option><option value="true">With alerts</option><option value="false">No alerts</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="rounded-lg border border-[#E2E8F0] bg-white">
                <div className="border-b border-[#E2E8F0] p-5">
                  <h2 className="text-sm font-semibold text-[#0F172A]">Live Sessions</h2>
                  <p className="text-xs text-[#64748B]">Active means the visitor sent an event or heartbeat in the last 2 minutes.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1040px] text-sm">
                    <thead className="bg-[#F8FAFC] text-left text-xs uppercase text-[#64748B]">
                      <tr>
                        {["Current Page", "Visitor / User", "Country", "Browser", "Device", "Started", "Last Event", "Pages", "Events", "Recording", "Alerts", "Open"].map((item) => <th key={item} className="px-4 py-3 font-medium">{item}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {liveSessions.map((session: WebsiteLiveSessionState) => (
                        <tr key={session.id} className="hover:bg-[#F8FAFC]">
                          <td className="max-w-[260px] truncate px-4 py-3 text-[#0F172A]">{session.currentPath || session.currentUrl || "-"}</td>
                          <td className="px-4 py-3">{session.session?.visitor?.identity?.externalUserId || session.session?.visitor?.anonymousId || session.visitorId || "-"}</td>
                          <td className="px-4 py-3">{session.country || "-"}</td>
                          <td className="px-4 py-3">{session.browser || "-"}</td>
                          <td className="px-4 py-3">{session.device || "-"}</td>
                          <td className="px-4 py-3">{formatDate(session.startedAt)}</td>
                          <td className="px-4 py-3">{formatDate(session.lastEventAt)}</td>
                          <td className="px-4 py-3">{session.pageCount}</td>
                          <td className="px-4 py-3">{session.eventCount}</td>
                          <td className="px-4 py-3">{session.isRecording ? <Badge variant="default">Live</Badge> : <Badge variant="secondary">No</Badge>}</td>
                          <td className="px-4 py-3">{session.hasJsError || session.hasBehaviorSignal ? <Badge variant="destructive">Yes</Badge> : <Badge variant="secondary">No</Badge>}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => setSelectedSessionId(session.sessionId)}>Session</Button>
                              {session.session?.recordings?.[0]?.id ? <Button size="sm" variant="outline" onClick={() => setSelectedRecordingId(session.session?.recordings?.[0]?.id || null)}>Replay</Button> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {liveSessions.length === 0 ? <tr><td colSpan={12} className="px-4 py-10 text-center text-[#64748B]">No active visitors right now.</td></tr> : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <aside className="space-y-5">
                <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
                  <h3 className="text-sm font-semibold text-[#0F172A]">Top Live Pages</h3>
                  <div className="mt-3 space-y-2">
                    {(liveOverview?.topCurrentPages || []).length === 0 ? <p className="text-sm text-[#64748B]">No live pages yet.</p> : null}
                    {(liveOverview?.topCurrentPages || []).map((page) => (
                      <div key={page.path} className="flex items-center justify-between gap-3 rounded-md bg-[#F8FAFC] px-3 py-2 text-sm">
                        <span className="truncate">{page.path}</span>
                        <Badge variant="outline">{page.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
                  <h3 className="text-sm font-semibold text-[#0F172A]">Live Event Feed</h3>
                  <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto">
                    {liveEvents.length === 0 ? <p className="text-sm text-[#64748B]">Waiting for live events.</p> : null}
                    {liveEvents.map((event) => (
                      <div key={event.id} className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant={event.type.includes("error") || event.type.includes("behavior") ? "destructive" : "outline"}>{event.type}</Badge>
                          <span className="text-xs text-[#64748B]">{formatDate(event.at)}</span>
                        </div>
                        <p className="mt-2 truncate text-[#334155]">{event.payload?.path || event.payload?.currentPath || event.payload?.url || "-"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </section>
          </TabsContent>

          <TabsContent value="heatmaps" className="mt-0 space-y-5">
            <section className="rounded-lg border border-[#E2E8F0] bg-white p-5">
              <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
                <div className="space-y-2">
                  <Label>URL / Path</Label>
                  <Input value={heatmapForm.path} onChange={(event) => setHeatmapForm((current) => ({ ...current, path: event.target.value }))} placeholder="/pricing" />
                </div>
                <div className="space-y-2">
                  <Label>Date From</Label>
                  <Input type="date" value={heatmapForm.dateFrom} onChange={(event) => setHeatmapForm((current) => ({ ...current, dateFrom: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Date To</Label>
                  <Input type="date" value={heatmapForm.dateTo} onChange={(event) => setHeatmapForm((current) => ({ ...current, dateTo: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Device</Label>
                  <select className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm" value={heatmapForm.deviceType} onChange={(event) => setHeatmapForm((current) => ({ ...current, deviceType: event.target.value }))}>
                    <option value="all">All</option>
                    <option value="desktop">Desktop</option>
                    <option value="tablet">Tablet</option>
                    <option value="mobile">Mobile</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button disabled={!activeSiteId || heatmapMutation.isPending} onClick={generateHeatmap} className="w-full bg-[#0891B2] hover:bg-[#0E7490]">Generate</Button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["click", "scroll", "engagement"].map((type) => (
                  <Button key={type} variant={heatmapForm.type === type ? "default" : "outline"} onClick={() => setHeatmapForm((current) => ({ ...current, type }))}>{type}</Button>
                ))}
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
                <h2 className="text-sm font-semibold text-[#0F172A]">Snapshots</h2>
                <div className="mt-3 space-y-2">
                  {heatmaps.length === 0 ? <p className="rounded-md bg-[#F8FAFC] p-4 text-sm text-[#64748B]">No heatmap snapshots yet.</p> : null}
                  {heatmaps.map((snapshot) => (
                    <button key={snapshot.id} onClick={() => setSelectedHeatmapId(snapshot.id)} className={`w-full rounded-md border p-3 text-left text-sm ${selectedHeatmap?.id === snapshot.id ? "border-[#0891B2] bg-[#ECFEFF]" : "border-[#E2E8F0]"}`}>
                      <div className="font-medium text-[#0F172A]">{snapshot.path}</div>
                      <div className="mt-1 text-xs text-[#64748B]">{snapshot.deviceType || "all"} · {snapshot.clickCount} clicks</div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <Label>Compare With</Label>
                  <select className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm" value={compareHeatmapId} onChange={(event) => setCompareHeatmapId(event.target.value)}>
                    <option value="">No comparison</option>
                    {heatmaps.filter((snapshot) => snapshot.id !== selectedHeatmap?.id).map((snapshot) => <option key={snapshot.id} value={snapshot.id}>{snapshot.path} · {new Date(snapshot.createdAt).toLocaleDateString()}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-5">
                <div className={compareHeatmap ? "grid gap-5 xl:grid-cols-2" : ""}>
                  {renderHeatmapCanvas(heatmapPoints, selectedHeatmap, "Selected Heatmap")}
                  {compareHeatmap ? renderHeatmapCanvas(comparePoints, compareHeatmap, "Comparison Heatmap") : null}
                </div>
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
                    <h3 className="text-sm font-semibold text-[#0F172A]">Scroll Depth Summary</h3>
                    <div className="mt-3 space-y-2 text-sm text-[#334155]">
                      <p>Max depth: {selectedHeatmap?.maxScrollDepth ?? 0}%</p>
                      <p>Average depth: {selectedHeatmap?.avgScrollDepth ?? 0}%</p>
                      <p>Samples: {selectedHeatmap?.scrollSampleCount ?? 0}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
                    <h3 className="text-sm font-semibold text-[#0F172A]">Top Clicked Areas</h3>
                    <div className="mt-3 space-y-2">
                      {((selectedHeatmap?.metadata?.topClickedAreas as any[]) || []).length === 0 ? <p className="text-sm text-[#64748B]">No click areas yet.</p> : null}
                      {((selectedHeatmap?.metadata?.topClickedAreas as any[]) || []).map((item) => (
                        <div key={item.selector} className="flex items-center justify-between rounded-md bg-[#F8FAFC] px-3 py-2 text-sm">
                          <span className="truncate text-[#334155]">{item.selector}</span>
                          <Badge variant="outline">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="behavior" className="mt-0 space-y-5">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              {behaviorSummary.map((item) => (
                <div key={item.type} className="rounded-lg border border-[#E2E8F0] bg-white p-4">
                  <p className="text-xs font-medium uppercase text-[#64748B]">{formatBehaviorType(item.type)}</p>
                  <p className="mt-2 text-2xl font-semibold text-[#0F172A]">{formatNumber(item.count)}</p>
                </div>
              ))}
            </section>

            <section className="rounded-lg border border-[#E2E8F0] bg-white p-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.3fr_auto]">
                <div className="space-y-2">
                  <Label>Issue Type</Label>
                  <select className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm" value={behaviorFilters.type} onChange={(event) => setBehaviorFilters((current) => ({ ...current, type: event.target.value }))}>
                    <option value="all">All</option>
                    {["RAGE_CLICK", "DEAD_CLICK", "QUICK_BACK", "EXCESSIVE_SCROLL", "JS_ERROR", "BROKEN_INTERACTION"].map((type) => <option key={type} value={type}>{formatBehaviorType(type)}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <select className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm" value={behaviorFilters.severity} onChange={(event) => setBehaviorFilters((current) => ({ ...current, severity: event.target.value }))}>
                    <option value="all">All</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm" value={behaviorFilters.status} onChange={(event) => setBehaviorFilters((current) => ({ ...current, status: event.target.value }))}>
                    <option value="all">All</option>
                    <option value="OPEN">Open</option>
                    <option value="IGNORED">Ignored</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Page Path</Label>
                  <Input value={behaviorFilters.path} onChange={(event) => setBehaviorFilters((current) => ({ ...current, path: event.target.value }))} placeholder="/pricing" />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => { void behaviorIssuesQuery.refetch(); void behaviorSignalsQuery.refetch(); }} className="w-full gap-2"><RefreshCw size={16} />Refresh</Button>
                </div>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-lg border border-[#E2E8F0] bg-white">
                <div className="border-b border-[#E2E8F0] p-5">
                  <h2 className="text-sm font-semibold text-[#0F172A]">Issue Groups</h2>
                  <p className="text-xs text-[#64748B]">Grouped behavior problems across visitor sessions.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead className="bg-[#F8FAFC] text-left text-xs uppercase text-[#64748B]">
                      <tr>
                        {["Type", "Severity", "Page", "Selector / Message", "Occurrences", "Sessions", "Last Seen", "Status", "Open"].map((item) => <th key={item} className="px-4 py-3 font-medium">{item}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {behaviorIssues.map((issue: WebsiteIssueGroup) => (
                        <tr key={issue.id} className="hover:bg-[#F8FAFC]">
                          <td className="px-4 py-3 font-medium text-[#0F172A]">{formatBehaviorType(issue.type)}</td>
                          <td className="px-4 py-3"><Badge variant={severityBadgeVariant(issue.severity) as any}>{issue.severity}</Badge></td>
                          <td className="max-w-[220px] truncate px-4 py-3">{issue.path || issue.url || "-"}</td>
                          <td className="max-w-[260px] truncate px-4 py-3">{issue.selector || issue.message || "-"}</td>
                          <td className="px-4 py-3">{issue.occurrenceCount}</td>
                          <td className="px-4 py-3">{issue.affectedSessionCount}</td>
                          <td className="px-4 py-3">{formatDate(issue.lastSeenAt)}</td>
                          <td className="px-4 py-3"><Badge variant={issue.status === "OPEN" ? "default" : "secondary"}>{issue.status}</Badge></td>
                          <td className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => setSelectedIssueId(issue.id)}>Details</Button></td>
                        </tr>
                      ))}
                      {behaviorIssues.length === 0 ? <tr><td colSpan={9} className="px-4 py-10 text-center text-[#64748B]">No behavior issues match these filters yet.</td></tr> : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <aside className="space-y-5">
                <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
                  <h3 className="text-sm font-semibold text-[#0F172A]">Severity Breakdown</h3>
                  <div className="mt-3 space-y-2">
                    {severitySummary.map((item) => (
                      <div key={item.severity} className="flex items-center justify-between rounded-md bg-[#F8FAFC] px-3 py-2 text-sm">
                        <span>{item.severity}</span>
                        <Badge variant={severityBadgeVariant(item.severity) as any}>{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
                  <h3 className="text-sm font-semibold text-[#0F172A]">Top Affected Pages</h3>
                  <div className="mt-3 space-y-2">
                    {topAffectedPages.length === 0 ? <p className="text-sm text-[#64748B]">No affected pages yet.</p> : null}
                    {topAffectedPages.map(([path, count]) => (
                      <div key={path} className="flex items-center justify-between gap-3 rounded-md bg-[#F8FAFC] px-3 py-2 text-sm">
                        <span className="truncate">{path}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </section>

            <section className="rounded-lg border border-[#E2E8F0] bg-white">
              <div className="border-b border-[#E2E8F0] p-5">
                <h2 className="text-sm font-semibold text-[#0F172A]">Signals by Session</h2>
                <p className="text-xs text-[#64748B]">Individual rage clicks, dead clicks, errors, quick backs, and broken interactions.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-[#F8FAFC] text-left text-xs uppercase text-[#64748B]">
                    <tr>
                      {["Timestamp", "Type", "Severity", "Page", "Browser", "Device", "Country", "Recording"].map((item) => <th key={item} className="px-4 py-3 font-medium">{item}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {behaviorSignals.map((signal: WebsiteBehaviorSignal) => (
                      <tr key={signal.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3">{formatDate(signal.firstSeenAt)}</td>
                        <td className="px-4 py-3 font-medium text-[#0F172A]">{formatBehaviorType(signal.type)}</td>
                        <td className="px-4 py-3"><Badge variant={severityBadgeVariant(signal.severity) as any}>{signal.severity}</Badge></td>
                        <td className="max-w-[260px] truncate px-4 py-3">{signal.path || signal.url}</td>
                        <td className="px-4 py-3">{signal.session?.browser || "-"}</td>
                        <td className="px-4 py-3">{signal.session?.device || "-"}</td>
                        <td className="px-4 py-3">{signal.session?.country || "-"}</td>
                        <td className="px-4 py-3">{signal.recordingId ? <Button size="sm" variant="outline" onClick={() => setSelectedRecordingId(signal.recordingId!)}>Open</Button> : "-"}</td>
                      </tr>
                    ))}
                    {behaviorSignals.length === 0 ? <tr><td colSpan={8} className="px-4 py-10 text-center text-[#64748B]">No behavior signals collected yet.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="funnels" className="mt-0 space-y-5">
            <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
                <h2 className="text-sm font-semibold text-[#0F172A]">Create Funnel</h2>
                <div className="mt-4 space-y-3">
                  <div className="space-y-2"><Label>Name</Label><Input value={funnelForm.name} onChange={(event) => setFunnelForm((current) => ({ ...current, name: event.target.value }))} placeholder="Pricing to lead" /></div>
                  <div className="space-y-2"><Label>Description</Label><Input value={funnelForm.description} onChange={(event) => setFunnelForm((current) => ({ ...current, description: event.target.value }))} placeholder="Track pricing page visitors into leads" /></div>
                  <div className="space-y-3">
                    {funnelForm.steps.map((step, index) => (
                      <div key={index} className="rounded-md border border-[#E2E8F0] p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#64748B]">Step {index + 1}</span>
                          <Button size="sm" variant="outline" onClick={() => setFunnelForm((current) => ({ ...current, steps: current.steps.filter((_, stepIndex) => stepIndex !== index) }))}>Remove</Button>
                        </div>
                        <div className="grid gap-2">
                          <Input value={step.name} onChange={(event) => setFunnelForm((current) => ({ ...current, steps: current.steps.map((item, stepIndex) => stepIndex === index ? { ...item, name: event.target.value } : item) }))} placeholder="Step name" />
                          <select className="h-10 rounded-md border border-[#E2E8F0] bg-white px-3 text-sm" value={step.type} onChange={(event) => setFunnelForm((current) => ({ ...current, steps: current.steps.map((item, stepIndex) => stepIndex === index ? { ...item, type: event.target.value } : item) }))}>
                            <option value="page">Page</option>
                            <option value="custom_event">Custom Event</option>
                            <option value="click">Click Selector</option>
                            <option value="behavior_signal">Behavior Signal</option>
                            <option value="tag">Session Tag</option>
                            <option value="js_error">JS Error</option>
                          </select>
                          <select className="h-10 rounded-md border border-[#E2E8F0] bg-white px-3 text-sm" value={step.operator} onChange={(event) => setFunnelForm((current) => ({ ...current, steps: current.steps.map((item, stepIndex) => stepIndex === index ? { ...item, operator: event.target.value } : item) }))}>
                            <option value="contains">Contains</option>
                            <option value="equals">Equals</option>
                            <option value="selector">Selector</option>
                          </select>
                          <Input value={step.value || ""} onChange={(event) => setFunnelForm((current) => ({ ...current, steps: current.steps.map((item, stepIndex) => stepIndex === index ? { ...item, value: event.target.value } : item) }))} placeholder="/pricing, lead_created, #signup" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setFunnelForm((current) => ({ ...current, steps: [...current.steps, { name: `Step ${current.steps.length + 1}`, type: "page", operator: "contains", value: "" }] }))}>Add Step</Button>
                    <Button disabled={!activeSiteId || !funnelForm.name.trim() || createFunnelMutation.isPending} onClick={() => createFunnelMutation.mutate()} className="bg-[#0891B2] hover:bg-[#0E7490]">Save Funnel</Button>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                      <Label>Saved Funnels</Label>
                      <select className="h-10 min-w-[260px] rounded-md border border-[#E2E8F0] bg-white px-3 text-sm" value={selectedFunnel?.id || ""} onChange={(event) => { setSelectedFunnelId(event.target.value); setSelectedRunId(""); }}>
                        {funnels.length === 0 ? <option value="">No funnels yet</option> : null}
                        {funnels.map((funnel: WebsiteFunnel) => <option key={funnel.id} value={funnel.id}>{funnel.name}</option>)}
                      </select>
                    </div>
                    <Button disabled={!selectedFunnel?.id || runFunnelMutation.isPending} onClick={() => selectedFunnel?.id && runFunnelMutation.mutate(selectedFunnel.id)} className="bg-[#0891B2] hover:bg-[#0E7490]">Run Funnel</Button>
                  </div>
                  {selectedRun ? (
                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                      <MetricCard label="Entrants" value={formatNumber(selectedRun.totalEntrants)} icon={Activity} />
                      <MetricCard label="Conversions" value={formatNumber(selectedRun.totalConversions)} icon={MousePointerClick} />
                      <MetricCard label="Conversion Rate" value={`${selectedRun.conversionRate || 0}%`} icon={Search} />
                    </div>
                  ) : <p className="mt-5 rounded-md bg-[#F8FAFC] p-4 text-sm text-[#64748B]">Run a funnel to see conversion and drop-off metrics.</p>}
                </div>

                {selectedRun?.results?.steps ? (
                  <div className="grid gap-3 lg:grid-cols-3">
                    {selectedRun.results.steps.map((step) => (
                      <div key={step.index} className="rounded-lg border border-[#E2E8F0] bg-white p-4">
                        <p className="text-sm font-semibold text-[#0F172A]">{step.name}</p>
                        <div className="mt-3 space-y-1 text-sm text-[#334155]">
                          <p>Entrants: {step.entrants}</p>
                          <p>Drop-offs: {step.dropOffs}</p>
                          <p>Avg time: {formatDuration(step.avgTimeFromPreviousMs)}</p>
                          <p>Median time: {formatDuration(step.medianTimeFromPreviousMs)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="rounded-lg border border-[#E2E8F0] bg-white">
                  <div className="border-b border-[#E2E8F0] p-5">
                    <h2 className="text-sm font-semibold text-[#0F172A]">Drop-off Sessions</h2>
                  </div>
                  <div className="divide-y divide-[#E2E8F0]">
                    {runSessions.map((session) => (
                      <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                        <div>
                          <p className="font-medium text-[#0F172A]">{session.entryUrl}</p>
                          <p className="text-xs text-[#64748B]">{session.browser || "-"} / {session.device || "-"} / {formatDuration(session.durationMs)}</p>
                        </div>
                        <div className="flex gap-2">
                          {session.recordings?.[0]?.id ? <Button size="sm" variant="outline" onClick={() => setSelectedRecordingId(session.recordings?.[0]?.id || null)}>Recording</Button> : null}
                          <Button size="sm" variant="outline" onClick={() => setSelectedSessionId(session.id)}>Session</Button>
                        </div>
                      </div>
                    ))}
                    {runSessions.length === 0 ? <p className="p-6 text-sm text-[#64748B]">No drop-off sessions for the selected run yet.</p> : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <div className="rounded-lg border border-[#E2E8F0] bg-white">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] p-5">
                  <div>
                    <h2 className="text-sm font-semibold text-[#0F172A]">Top Journey Paths</h2>
                    <p className="text-xs text-[#64748B]">Common page and custom-event paths.</p>
                  </div>
                  <Button variant="outline" disabled={!activeSiteId || journeyAnalyzeMutation.isPending} onClick={() => journeyAnalyzeMutation.mutate()}>Analyze</Button>
                </div>
                <div className="divide-y divide-[#E2E8F0]">
                  {journeyAggregates.map((path: WebsitePathAggregate) => (
                    <div key={path.id} className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[#0F172A]">{path.steps.map((step) => step.label).join(" → ")}</p>
                        <Badge variant="outline">{path.occurrenceCount}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-[#64748B]">Conversions: {path.conversionCount} · Avg duration: {formatDuration(path.avgDurationMs)}</p>
                    </div>
                  ))}
                  {journeyAggregates.length === 0 ? <p className="p-6 text-sm text-[#64748B]">Analyze journeys to populate common paths.</p> : null}
                </div>
              </div>

              <div className="rounded-lg border border-[#E2E8F0] bg-white">
                <div className="border-b border-[#E2E8F0] p-5">
                  <h2 className="text-sm font-semibold text-[#0F172A]">Session Journeys</h2>
                </div>
                <div className="divide-y divide-[#E2E8F0]">
                  {journeyPaths.map((path: WebsiteJourneyPath) => (
                    <div key={path.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#0F172A]">{path.steps.map((step) => step.label).join(" → ")}</p>
                        <p className="text-xs text-[#64748B]">{path.stepCount} steps · {path.converted ? `Converted: ${path.conversionEvent}` : "Dropped off"}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setSelectedJourneyId(path.id)}>Open</Button>
                    </div>
                  ))}
                  {journeyPaths.length === 0 ? <p className="p-6 text-sm text-[#64748B]">No journey paths yet.</p> : null}
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="ai" className="mt-0 space-y-5">
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="space-y-5">
                <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h2 className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]"><Sparkles size={16} />AI Insights</h2>
                      <p className="mt-1 text-xs text-[#64748B]">Evidence-based summaries from sessions, behavior issues, heatmaps, funnels, and journeys.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" disabled={!activeSiteId || generateAiInsightMutation.isPending} onClick={() => generateAiInsightMutation.mutate("TREND_SUMMARY")}>Trend Summary</Button>
                      <Button variant="outline" disabled={!activeSiteId || generateAiInsightMutation.isPending} onClick={() => generateAiInsightMutation.mutate("RECOMMENDATION")}>Recommendations</Button>
                      <Button disabled={!activeSiteId || generateAiInsightMutation.isPending} onClick={() => generateAiInsightMutation.mutate("BEHAVIOR_INSIGHT")} className="bg-[#0891B2] hover:bg-[#0E7490]">Generate Insight</Button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label>Type</Label>
                      <select className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm" value={aiFilters.type} onChange={(event) => setAiFilters((current) => ({ ...current, type: event.target.value }))}>
                        <option value="all">All</option>
                        {["RECORDING_SUMMARY", "SESSION_SUMMARY", "HEATMAP_INSIGHT", "BEHAVIOR_INSIGHT", "FUNNEL_INSIGHT", "JOURNEY_INSIGHT", "TREND_SUMMARY", "RECOMMENDATION"].map((type) => <option key={type} value={type}>{formatBehaviorType(type)}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>Severity</Label>
                      <select className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm" value={aiFilters.severity} onChange={(event) => setAiFilters((current) => ({ ...current, severity: event.target.value }))}>
                        <option value="all">All</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>Status</Label>
                      <select className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm" value={aiFilters.status} onChange={(event) => setAiFilters((current) => ({ ...current, status: event.target.value }))}>
                        <option value="all">All</option>
                        <option value="GENERATED">Generated</option>
                        <option value="DISMISSED">Dismissed</option>
                        <option value="ARCHIVED">Archived</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {aiInsights.map((insight: WebsiteAiInsight) => (
                    <article key={insight.id} className="rounded-lg border border-[#E2E8F0] bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{formatBehaviorType(insight.type)}</Badge>
                            {insight.severity ? <Badge variant={severityBadgeVariant(insight.severity) as any}>{insight.severity}</Badge> : null}
                            {typeof insight.confidence === "number" ? <Badge variant="secondary">{Math.round(insight.confidence * 100)}% confidence</Badge> : null}
                          </div>
                          <h3 className="mt-3 text-base font-semibold text-[#0F172A]">{insight.title}</h3>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" disabled={updateAiInsightMutation.isPending} onClick={() => updateAiInsightMutation.mutate({ id: insight.id, status: "DISMISSED" })}>Dismiss</Button>
                          <Button size="sm" variant="outline" disabled={updateAiInsightMutation.isPending} onClick={() => updateAiInsightMutation.mutate({ id: insight.id, status: "ARCHIVED" })}>Archive</Button>
                        </div>
                      </div>
                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#334155]">{insight.summary}</p>
                      {(insight.recommendations || []).length ? (
                        <div className="mt-4 rounded-md bg-[#F8FAFC] p-3">
                          <p className="text-xs font-semibold uppercase text-[#64748B]">Recommendations</p>
                          <ul className="mt-2 space-y-1 text-sm text-[#334155]">
                            {(insight.recommendations || []).map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)}
                          </ul>
                        </div>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {insight.sourceType && insight.sourceId ? <Badge variant="outline">{insight.sourceType}: {insight.sourceId.slice(0, 8)}</Badge> : null}
                        {((insight.evidence?.citations || insight.evidence || []) as any[]).slice?.(0, 6)?.map((citation: any, index: number) => <Badge key={`${citation.type}-${citation.id}-${index}`} variant="secondary">{citation.type || "Source"} {String(citation.id || "").slice(0, 8)}</Badge>)}
                      </div>
                    </article>
                  ))}
                  {aiInsights.length === 0 ? <p className="rounded-lg border border-[#E2E8F0] bg-white p-8 text-center text-sm text-[#64748B] lg:col-span-2">No AI insights yet. Generate a trend summary or inspect a session/recording to create the first one.</p> : null}
                </div>
              </div>

              <aside className="rounded-lg border border-[#E2E8F0] bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]"><MessageSquare size={16} />AI Chat</h2>
                    <p className="mt-1 text-xs text-[#64748B]">Ask questions using the selected site, date range, and segment context.</p>
                  </div>
                  <Button size="sm" variant="outline" disabled={!activeSiteId || createAiConversationMutation.isPending} onClick={() => createAiConversationMutation.mutate()}>New</Button>
                </div>
                <div className="mt-4 space-y-2">
                  <Label>Conversation</Label>
                  <select className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm" value={selectedAiConversation?.id || ""} onChange={(event) => setSelectedAiConversationId(event.target.value)}>
                    {aiConversations.length === 0 ? <option value="">Start a chat</option> : null}
                    {aiConversations.map((conversation: WebsiteAiConversation) => <option key={conversation.id} value={conversation.id}>{conversation.title || formatDate(conversation.createdAt)}</option>)}
                  </select>
                </div>
                <div className="mt-4 h-[440px] space-y-3 overflow-y-auto rounded-md bg-[#F8FAFC] p-3">
                  {aiMessages.map((message: WebsiteAiMessage) => (
                    <div key={message.id} className={`rounded-lg border p-3 text-sm ${message.role === "USER" ? "border-[#BAE6FD] bg-white" : "border-[#E2E8F0] bg-[#ECFEFF]"}`}>
                      <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-[#64748B]">{message.role === "USER" ? "You" : <><Bot size={13} />AI Analyst</>}</p>
                      <p className="whitespace-pre-line text-[#334155]">{message.content}</p>
                      {(message.citations || []).length ? <div className="mt-2 flex flex-wrap gap-1">{message.citations?.slice(0, 5).map((citation: any, index: number) => <Badge key={`${citation.type}-${citation.id}-${index}`} variant="outline">{citation.type} {String(citation.id).slice(0, 8)}</Badge>)}</div> : null}
                    </div>
                  ))}
                  {aiMessages.length === 0 ? <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-white p-5 text-sm text-[#64748B]">Try: “Why are users dropping off?” or “Which recordings should I watch first?”</div> : null}
                </div>
                <div className="mt-4 space-y-2">
                  <Textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder="Ask about drop-offs, rage clicks, recordings, funnels, or pages..." className="min-h-[92px]" />
                  <Button disabled={!activeSiteId || !aiPrompt.trim() || sendAiMessageMutation.isPending} onClick={() => sendAiMessageMutation.mutate()} className="w-full bg-[#0891B2] hover:bg-[#0E7490]">Ask AI</Button>
                </div>
              </aside>
            </section>
          </TabsContent>

          <TabsContent value="integrations" className="mt-0 space-y-5">
            <section className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
                <h2 className="text-sm font-semibold text-[#0F172A]">Create Integration</h2>
                <div className="mt-4 space-y-3">
                  <select className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm" value={integrationForm.provider} onChange={(event) => setIntegrationForm((current) => ({ ...current, provider: event.target.value }))}>
                    {["CUSTOM_WEBHOOK", "GOOGLE_ANALYTICS", "GOOGLE_TAG_MANAGER", "SHOPIFY", "ADS"].map((provider) => <option key={provider} value={provider}>{formatBehaviorType(provider)}</option>)}
                  </select>
                  <Input value={integrationForm.name} onChange={(event) => setIntegrationForm((current) => ({ ...current, name: event.target.value }))} placeholder="Integration name" />
                  {integrationForm.provider === "CUSTOM_WEBHOOK" ? (
                    <>
                      <Input value={integrationForm.webhookUrl} onChange={(event) => setIntegrationForm((current) => ({ ...current, webhookUrl: event.target.value }))} placeholder="https://example.com/webhook" />
                      <Input value={integrationForm.signingSecret} onChange={(event) => setIntegrationForm((current) => ({ ...current, signingSecret: event.target.value }))} placeholder="Signing secret" />
                      <Textarea value={integrationForm.events} onChange={(event) => setIntegrationForm((current) => ({ ...current, events: event.target.value }))} />
                    </>
                  ) : <p className="rounded-md bg-[#F8FAFC] p-3 text-sm text-[#64748B]">OAuth is not enabled yet. Save this provider to keep setup instructions and mapping fields for rollout.</p>}
                  <Button disabled={!activeSiteId || createIntegrationMutation.isPending} onClick={() => createIntegrationMutation.mutate()} className="w-full bg-[#0891B2] hover:bg-[#0E7490]">Save Integration</Button>
                </div>
              </div>
              <div className="rounded-lg border border-[#E2E8F0] bg-white">
                <div className="border-b border-[#E2E8F0] p-5"><h2 className="text-sm font-semibold text-[#0F172A]">Integrations</h2></div>
                <div className="divide-y divide-[#E2E8F0]">
                  {integrations.map((integration: WebsiteAnalyticsIntegration) => (
                    <div key={integration.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <button className="text-left" onClick={() => setSelectedIntegrationId(integration.id)}>
                        <p className="font-medium text-[#0F172A]">{integration.name}</p>
                        <p className="text-xs text-[#64748B]">{formatBehaviorType(integration.provider)} · {integration.status} · {integration.lastError || "No errors"}</p>
                      </button>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => testIntegrationMutation.mutate(integration.id)}>Test</Button>
                        <Button size="sm" variant="outline" onClick={() => deleteIntegrationMutation.mutate(integration.id)}>Delete</Button>
                      </div>
                    </div>
                  ))}
                  {integrations.length === 0 ? <p className="p-6 text-sm text-[#64748B]">No integrations yet.</p> : null}
                </div>
              </div>
            </section>
            <section className="rounded-lg border border-[#E2E8F0] bg-white">
              <div className="border-b border-[#E2E8F0] p-5"><h2 className="text-sm font-semibold text-[#0F172A]">Delivery Log</h2></div>
              <div className="divide-y divide-[#E2E8F0]">
                {integrationDeliveries.map((delivery: WebsiteAnalyticsWebhookDelivery) => (
                  <div key={delivery.id} className="grid gap-2 p-4 text-sm md:grid-cols-5">
                    <span>{delivery.eventType}</span><span>{delivery.status}</span><span>{delivery.attempts} attempts</span><span>{delivery.responseStatus || "-"}</span><span className="truncate">{delivery.responseBody || "-"}</span>
                  </div>
                ))}
                {integrationDeliveries.length === 0 ? <p className="p-6 text-sm text-[#64748B]">Select an integration to inspect deliveries.</p> : null}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="reports" className="mt-0 space-y-5">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <MetricCard label="Sessions" value={formatNumber(reportOverview.sessions)} icon={Activity} />
              <MetricCard label="Visitors" value={formatNumber(reportOverview.uniqueVisitors)} icon={Globe2} />
              <MetricCard label="Page Views" value={formatNumber(reportOverview.pageViews)} icon={Search} />
              <MetricCard label="Avg Duration" value={formatDuration(reportOverview.averageDurationMs)} icon={Clock} />
              <MetricCard label="Behavior Issues" value={formatNumber(reportOverview.behaviorIssues)} icon={AlertTriangle} />
              <MetricCard label="Conversions" value={formatNumber(reportOverview.funnelConversions)} icon={MousePointerClick} />
            </section>
            <section className="grid gap-5 xl:grid-cols-2">
              {[
                ["Top Pages", reportPagesQuery.data || [], "path", "pageViews"],
                ["Acquisition", reportAcquisitionQuery.data || [], "name", "sessions"],
                ["Behavior Issues", reportBehaviorQuery.data || [], "type", "occurrenceCount"],
                ["Technical Errors", reportTechnicalQuery.data || [], "path", "type"],
                ["Funnel Conversions", reportConversionsQuery.data || [], "funnel.name", "conversionRate"],
              ].map(([title, rows, labelKey, valueKey]: any) => (
                <div key={title} className="rounded-lg border border-[#E2E8F0] bg-white">
                  <div className="border-b border-[#E2E8F0] p-5"><h2 className="text-sm font-semibold text-[#0F172A]">{title}</h2></div>
                  <div className="divide-y divide-[#E2E8F0]">
                    {rows.slice(0, 8).map((row: any, index: number) => {
                      const label = labelKey.includes(".") ? row.funnel?.name : row[labelKey];
                      return <div key={`${title}-${index}`} className="flex justify-between gap-3 p-4 text-sm"><span className="truncate">{label || "-"}</span><Badge variant="outline">{String(row[valueKey] ?? "-")}</Badge></div>;
                    })}
                    {rows.length === 0 ? <p className="p-6 text-sm text-[#64748B]">No data yet.</p> : null}
                  </div>
                </div>
              ))}
            </section>
          </TabsContent>

          <TabsContent value="admin" className="mt-0 space-y-5">
            <section className="grid gap-4 md:grid-cols-3">
              <MetricCard label="Recording Storage" value={`${Math.round((storageUsageQuery.data?.recordingBytes || 0) / 1024)} KB`} icon={Eye} />
              <MetricCard label="Events Stored" value={formatNumber(storageUsageQuery.data?.eventCount)} icon={Activity} />
              <MetricCard label="Sessions Stored" value={formatNumber(storageUsageQuery.data?.sessionCount)} icon={Globe2} />
            </section>
            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
                <h2 className="text-sm font-semibold text-[#0F172A]">Ingestion Health</h2>
                <pre className="mt-3 rounded-md bg-[#F8FAFC] p-3 text-xs text-[#475569]">{JSON.stringify(ingestionHealthQuery.data || {}, null, 2)}</pre>
              </div>
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
                <h2 className="text-sm font-semibold text-[#0F172A]">Retention Preview</h2>
                <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-[#F8FAFC] p-3 text-xs text-[#475569]">{JSON.stringify(retentionPreviewQuery.data || [], null, 2)}</pre>
                <Button className="mt-4 bg-[#0891B2] hover:bg-[#0E7490]" disabled={retentionCleanupMutation.isPending} onClick={() => retentionCleanupMutation.mutate()}>Run Cleanup</Button>
              </div>
            </section>
          </TabsContent>
        </Tabs>
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
                <p className="mt-2"><span className="font-medium">Visitor:</span> {sessionDetail.visitor?.anonymousId || sessionDetail.visitorId || "-"}</p>
                <p className="mt-2"><span className="font-medium">User ID:</span> {sessionDetail.visitor?.identity?.externalUserId || "-"}</p>
                {sessionDetail.visitor?.identity?.traits ? <pre className="mt-3 max-h-32 overflow-auto rounded-md bg-[#F8FAFC] p-3 text-xs text-[#475569]">{JSON.stringify(sessionDetail.visitor.identity.traits, null, 2)}</pre> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {(sessionDetail.tags || []).map((tag) => (
                    <Badge key={tag.id} variant="outline" className="gap-2">
                      {tag.name}
                      <button onClick={() => deleteTagMutation.mutate({ sessionId: sessionDetail.id, tagId: tag.id })}>×</button>
                    </Badge>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} placeholder="Add tag" />
                  <Button variant="outline" disabled={!tagDraft.trim()} onClick={() => tagMutation.mutate({ sessionId: sessionDetail.id, name: tagDraft })}>Add</Button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" disabled={analyzeSessionMutation.isPending} onClick={() => analyzeSessionMutation.mutate(sessionDetail.id)}>Analyze Behavior</Button>
                  <Button variant="outline" disabled={sessionAiSummaryMutation.isPending} onClick={() => sessionAiSummaryMutation.mutate(sessionDetail.id)} className="gap-2"><Sparkles size={14} />Generate AI Summary</Button>
                </div>
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

      <Sheet open={Boolean(selectedRecordingId)} onOpenChange={(open) => !open && setSelectedRecordingId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-6xl">
          <SheetHeader>
            <SheetTitle>Session Recording Replay</SheetTitle>
          </SheetHeader>
          {recordingDetail ? (
            <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
                  {replayEvents.length >= 2 ? <div ref={playerRef} className="min-h-[520px]" /> : <div className="p-10 text-center text-sm text-[#64748B]">This recording does not have enough replay data yet. Keep the visitor page open and interact for a few seconds, then refresh recordings.</div>}
                </div>
                <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
                  <h3 className="text-sm font-semibold text-[#0F172A]">Event Markers</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(recordingDetail.session?.events || []).filter((event) => ["click", "page_view", "js_error", "unhandled_rejection"].includes(event.type)).slice(0, 80).map((event) => (
                      <Badge key={event.id} variant={event.type.includes("error") ? "destructive" : "outline"}>{event.type}</Badge>
                    ))}
                    {(recordingDetail.session?.behaviorSignals || []).slice(0, 40).map((signal) => (
                      <Badge key={signal.id} variant={severityBadgeVariant(signal.severity) as any}>{formatBehaviorType(signal.type)}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <aside className="space-y-4">
                <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => favoriteMutation.mutate({ id: recordingDetail.id, isFavorite: !recordingDetail.isFavorite })} className="gap-2"><Star size={16} />{recordingDetail.isFavorite ? "Unfavorite" : "Favorite"}</Button>
                    <Button variant="outline" onClick={() => shareMutation.mutate(recordingDetail.id)} className="gap-2"><Share2 size={16} />Share</Button>
                    <Button variant="outline" disabled={recordingAiSummaryMutation.isPending} onClick={() => recordingAiSummaryMutation.mutate(recordingDetail.id)} className="gap-2"><Sparkles size={16} />AI</Button>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-[#334155]">
                    <p><span className="font-medium">Site:</span> {recordingDetail.site?.name}</p>
                    <p><span className="font-medium">Entry:</span> {recordingDetail.session?.entryUrl || "-"}</p>
                    <p><span className="font-medium">Exit:</span> {recordingDetail.session?.exitUrl || "-"}</p>
                    <p><span className="font-medium">Browser:</span> {recordingDetail.session?.browser || "-"} / {recordingDetail.session?.os || "-"}</p>
                    <p><span className="font-medium">Device:</span> {recordingDetail.session?.device || "-"}</p>
                    <p><span className="font-medium">Country:</span> {recordingDetail.session?.country || "-"}</p>
                    <p><span className="font-medium">Duration:</span> {formatDuration(recordingDetail.durationMs)}</p>
                    <p><span className="font-medium">Events:</span> {recordingDetail.eventCount}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]"><Tags size={16} />Labels</h3>
                  <div className="mt-3 flex flex-wrap gap-2">{(recordingDetail.labels || []).map((label) => <Badge key={label} variant="outline">{label}</Badge>)}</div>
                  <div className="mt-3 flex gap-2">
                    <Input value={labelDraft} onChange={(event) => setLabelDraft(event.target.value)} placeholder="hot, bug, pricing" />
                    <Button variant="outline" onClick={() => labelsMutation.mutate({ id: recordingDetail.id, labels: labelDraft.split(",").map((item) => item.trim()).filter(Boolean) })}>Save</Button>
                  </div>
                </div>
              </aside>
            </div>
          ) : <p className="mt-6 text-sm text-[#64748B]">Loading recording...</p>}
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(selectedIssueId)} onOpenChange={(open) => !open && setSelectedIssueId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Behavior Issue Detail</SheetTitle>
          </SheetHeader>
          {selectedIssue ? (
            <div className="mt-6 space-y-5">
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{formatBehaviorType(selectedIssue.type)}</Badge>
                  <Badge variant={severityBadgeVariant(selectedIssue.severity) as any}>{selectedIssue.severity}</Badge>
                  <Badge variant={selectedIssue.status === "OPEN" ? "default" : "secondary"}>{selectedIssue.status}</Badge>
                </div>
                <div className="mt-4 space-y-2 text-sm text-[#334155]">
                  <p><span className="font-medium">Page:</span> {selectedIssue.path || selectedIssue.url || "-"}</p>
                  <p><span className="font-medium">Selector:</span> {selectedIssue.selector || "-"}</p>
                  <p><span className="font-medium">Message:</span> {selectedIssue.message || "-"}</p>
                  <p><span className="font-medium">Occurrences:</span> {selectedIssue.occurrenceCount}</p>
                  <p><span className="font-medium">Affected sessions:</span> {selectedIssue.affectedSessionCount}</p>
                  <p><span className="font-medium">Last seen:</span> {formatDate(selectedIssue.lastSeenAt)}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["OPEN", "IGNORED", "RESOLVED"] as const).map((status) => (
                    <Button key={status} variant={selectedIssue.status === status ? "default" : "outline"} size="sm" disabled={issueStatusMutation.isPending} onClick={() => issueStatusMutation.mutate({ id: selectedIssue.id, status })}>{status}</Button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-[#E2E8F0] bg-white">
                <div className="border-b border-[#E2E8F0] p-4">
                  <h3 className="text-sm font-semibold text-[#0F172A]">Occurrences</h3>
                </div>
                <div className="divide-y divide-[#E2E8F0]">
                  {(selectedIssue.signals || []).map((signal) => (
                    <div key={signal.id} className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={severityBadgeVariant(signal.severity) as any}>{signal.severity}</Badge>
                          <span className="text-sm font-medium text-[#0F172A]">{formatDate(signal.firstSeenAt)}</span>
                        </div>
                        {signal.recordingId ? <Button size="sm" variant="outline" onClick={() => setSelectedRecordingId(signal.recordingId!)}>Open Recording</Button> : null}
                      </div>
                      <p className="mt-2 truncate text-sm text-[#334155]">{signal.url}</p>
                      <p className="mt-1 text-xs text-[#64748B]">{signal.session?.browser || "-"} / {signal.session?.device || "-"} / {signal.session?.country || "-"}</p>
                    </div>
                  ))}
                  {(selectedIssue.signals || []).length === 0 ? <p className="p-6 text-sm text-[#64748B]">No individual signals returned for this issue.</p> : null}
                </div>
              </div>
            </div>
          ) : <p className="mt-6 text-sm text-[#64748B]">Loading behavior issue...</p>}
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(selectedJourneyId)} onOpenChange={(open) => !open && setSelectedJourneyId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Journey Detail</SheetTitle>
          </SheetHeader>
          {selectedJourney ? (
            <div className="mt-6 space-y-5">
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={selectedJourney.converted ? "default" : "secondary"}>{selectedJourney.converted ? "Converted" : "Dropped off"}</Badge>
                  <Badge variant="outline">{selectedJourney.stepCount} steps</Badge>
                  <Badge variant="outline">{formatDuration(selectedJourney.durationMs)}</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {(selectedJourney.steps || []).map((step, index) => (
                    <div key={`${step.label}-${index}`} className="rounded-md bg-[#F8FAFC] px-3 py-2 text-sm">
                      <p className="font-medium text-[#0F172A]">{index + 1}. {step.label}</p>
                      <p className="text-xs text-[#64748B]">{step.type} · {formatDate(step.at)}</p>
                    </div>
                  ))}
                </div>
              </div>
              {selectedJourney.session?.behaviorSignals?.length ? (
                <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
                  <h3 className="text-sm font-semibold text-[#0F172A]">Behavior Signals</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedJourney.session.behaviorSignals.map((signal) => <Badge key={signal.id} variant={severityBadgeVariant(signal.severity) as any}>{formatBehaviorType(signal.type)}</Badge>)}
                  </div>
                </div>
              ) : null}
              <div className="flex gap-2">
                {selectedJourney.session?.recordings?.[0]?.id ? <Button variant="outline" onClick={() => setSelectedRecordingId(selectedJourney.session?.recordings?.[0]?.id || null)}>Open Recording</Button> : null}
                {selectedJourney.sessionId ? <Button variant="outline" onClick={() => setSelectedSessionId(selectedJourney.sessionId || null)}>Open Session</Button> : null}
              </div>
            </div>
          ) : <p className="mt-6 text-sm text-[#64748B]">Loading journey...</p>}
        </SheetContent>
      </Sheet>
    </div>
  );
}
