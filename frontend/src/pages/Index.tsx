import { useEffect, useMemo, useRef, useState, type DragEvent, type ElementType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  fetchDashboardData,
  type DashboardClient,
  type DashboardInspection,
  type DashboardLead,
  type DashboardInvoice,
  type DashboardProject,
  type DashboardQuote,
} from "@/features/dashboard";
import { useToast } from "@/hooks/use-toast";
import {
  getNotifications,
  markAllAsRead as markAllNotificationsRead,
  type NotificationEntity,
} from "@/features/notifications";
import { updateLeadStatus } from "@/features/leads";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Briefcase,
  Calendar,
  ChevronDown,
  Clock,
  Command,
  DollarSign,
  FileText,
  FolderKanban,
  MapPin,
  Moon,
  PhoneCall,
  Receipt,
  Search,
  Sparkles,
  Sun,
  Target,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import useIsMobile from "@/hooks/useIsMobile";
import { canAccessFeature, canAccessModule } from "@/lib/access-control";
import { useWorkspaceBranding } from "@/features/settings/context/workspace-branding";

type ThemeColor = "teal" | "gold" | "navy" | "green" | "blue" | "purple";
type RevenuePipelineStage = "lead" | "contacted" | "estimate-sent" | "negotiation" | "won" | "lost";
type QuickActionVariant = "default" | "outline";
type LeadStatusValue = Parameters<typeof updateLeadStatus>[1];

interface User {
  firstName: string;
  lastName: string;
  email?: string;
  role?: string;
}

interface BellNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  icon: ElementType;
  color: ThemeColor;
  read: boolean;
}

interface LeadItem {
  id: string;
  name: string;
  company: string;
  value: number;
  temperature: "hot" | "warm" | "cold";
  stage: RevenuePipelineStage;
  daysInStage: number;
  source: string;
  assignee: string;
  address: string;
  jobType: string;
  nextAction: string;
  phone: string;
  email: string;
  updatedAt: string;
  isStalled: boolean;
}

interface InvoiceItem {
  id: string;
  client: string;
  amount: number;
  outstandingAmount: number;
  dueDate: string;
  status: "overdue" | "pending" | "paid" | "draft";
  daysOverdue?: number;
  invoiceNo: string;
}

interface JobItem {
  id: string;
  name: string;
  client: string;
  address: string;
  value: number;
  crew: string;
  deadline: string;
  status: "on-track" | "at-risk" | "delayed" | "completed";
  statusLabel: string;
  type: string;
}

interface EstimateItem {
  id: string;
  quoteNumber: string;
  status: string;
  total: number;
  recipientName: string;
  createdAt: string;
  validUntil: string;
  sentAt?: string | null;
}

interface SiteVisitItem {
  id: string;
  leadId: string;
  clientName: string;
  address: string;
  inspectionType: string;
  scheduledAt: Date | null;
  estimateValue: number;
}

interface ClientItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  lastContacted?: string;
}

interface QuickActionItem {
  id: string;
  label: string;
  description: string;
  icon: ElementType;
  path: string;
  variant: QuickActionVariant;
}

interface ActionCenterItem {
  id: string;
  tone: "danger" | "warning" | "success";
  label: string;
  detail: string;
  actionLabel: string;
  path: string;
}

const themeColors: Record<ThemeColor, { bg: string; text: string; light: string }> = {
  teal: { bg: "bg-[#0891B2]", text: "text-[#0891B2]", light: "bg-[#0891B2]/10" },
  gold: { bg: "bg-[#D97706]", text: "text-[#D97706]", light: "bg-[#D97706]/10" },
  navy: { bg: "bg-[#FF7B36]", text: "text-[#FF7B36]", light: "bg-[#FF7B36]/10" },
  green: { bg: "bg-[#01C44A]", text: "text-[#01C44A]", light: "bg-[#01C44A]/10" },
  blue: { bg: "bg-[#0891B2]", text: "text-[#0891B2]", light: "bg-[#0891B2]/10" },
  purple: { bg: "bg-[#6637F4]", text: "text-[#6637F4]", light: "bg-[#6637F4]/10" },
};

const dashboardWidgetConfig = {
  leads: { featureId: "leads" as const, permissionModule: "leads" },
  invoices: { featureId: "finance" as const, permissionModule: "invoices" },
  quotes: { featureId: "finance" as const, permissionModule: "quotes" },
  clients: { featureId: "clients" as const, permissionModule: "clients" },
  projects: { featureId: "projects" as const, permissionModule: "projects" },
  roofEstimator: { featureId: "roofEstimator" as const, permissionModule: "roof-estimator" },
  inspections: { featureId: "leads" as const, permissionModule: "leads" },
  tasks: { featureId: "tasks" as const, permissionModule: "tasks" },
  aiAssistant: { featureId: "aiAssistant" as const },
} as const;

const bellTypeConfig: Record<string, { icon: ElementType; color: ThemeColor }> = {
  info: { icon: AlertCircle, color: "blue" },
  success: { icon: Target, color: "green" },
  warning: { icon: AlertTriangle, color: "gold" },
  error: { icon: AlertCircle, color: "navy" },
  message: { icon: PhoneCall, color: "teal" },
  task: { icon: Clock, color: "purple" },
  deal: { icon: DollarSign, color: "green" },
  calendar: { icon: Calendar, color: "teal" },
  system: { icon: Sparkles, color: "navy" },
  mention: { icon: Users, color: "teal" },
};

const stageToLeadStatus: Record<RevenuePipelineStage, LeadStatusValue> = {
  lead: "NEW",
  contacted: "CONTACTED",
  "estimate-sent": "PROPOSAL",
  negotiation: "NEGOTIATION",
  won: "WON",
  lost: "LOST",
};

const sectionCardClassName = "bg-white rounded-md border border-[rgba(15,23,42,0.06)] card-shadow overflow-hidden";

function getColorClasses(color: ThemeColor) {
  return themeColors[color] || themeColors.teal;
}

function formatRelativeTime(ts: string): string {
  const now = Date.now();
  const date = new Date(ts).getTime();
  if (Number.isNaN(date)) return "";
  const diff = (now - date) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "Yesterday";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function mapApiNotification(notification: NotificationEntity): BellNotification {
  const config = bellTypeConfig[notification.type] || bellTypeConfig.info;
  return {
    id: notification.id,
    title: notification.title || "Notification",
    message: notification.message || "",
    time: formatRelativeTime(notification.createdAt),
    icon: config.icon,
    color: config.color,
    read: notification.isRead,
  };
}

function readText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function buildAddress(parts: Array<unknown>): string {
  return parts.map(readText).filter(Boolean).join(", ");
}

function formatMoney(amount: number): string {
  return `$${Math.round(amount || 0).toLocaleString()}`;
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return "Pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTimeLabel(date: Date | null): string {
  if (!date) return "Schedule pending";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeLabel(date: Date | null): string {
  if (!date) return "Time pending";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function toDashboardLeadStage(status: string): RevenuePipelineStage {
  const normalized = readText(status).toUpperCase();
  if (normalized === "WON") return "won";
  if (normalized === "LOST") return "lost";
  if (normalized === "NEGOTIATION") return "negotiation";
  if (normalized === "PROPOSAL") return "estimate-sent";
  if (normalized === "CONTACTED" || normalized === "QUALIFIED") return "contacted";
  return "lead";
}

function getLeadNextAction(stage: RevenuePipelineStage, temperature: LeadItem["temperature"]): string {
  if (stage === "lead") return temperature === "hot" ? "Call homeowner" : "Qualify opportunity";
  if (stage === "contacted") return "Schedule inspection";
  if (stage === "estimate-sent") return "Follow up on estimate";
  if (stage === "negotiation") return "Resolve objections";
  if (stage === "won") return "Open job file";
  return "Review lead";
}

function mapJobStatus(rawStatus: string): JobItem["status"] {
  const normalized = readText(rawStatus).toUpperCase();
  if (normalized === "COMPLETED" || normalized === "ARCHIVED") return "completed";
  if (normalized === "ON_HOLD" || normalized === "CANCELLED") return "delayed";
  if (normalized === "PLANNING" || normalized === "PENDING") return "at-risk";
  return "on-track";
}

function formatPhoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function isEstimateSent(quote: EstimateItem): boolean {
  const status = quote.status.toLowerCase();
  if (status.includes("draft") || status.includes("cancel")) {
    return false;
  }

  return Boolean(quote.sentAt) || ["sent", "viewed", "open", "approved", "accepted"].some((token) => status.includes(token));
}

function isEstimateDraft(quote: EstimateItem): boolean {
  const status = quote.status.toLowerCase();
  if (status.includes("cancel")) {
    return false;
  }

  return status.includes("draft") || (!quote.sentAt && !isEstimateSent(quote));
}

function mapLead(lead: DashboardLead): LeadItem {
  const updatedAt = new Date(lead.updatedAt).getTime();
  const daysSinceUpdate = Number.isNaN(updatedAt)
    ? 0
    : Math.max(0, Math.floor((Date.now() - updatedAt) / 86400000));
  const temperature = (lead.temperature || "WARM").toLowerCase() as LeadItem["temperature"];
  const stage = toDashboardLeadStage(lead.status);
  const propertyAddress = buildAddress([
    lead.propertyAddress,
    lead.city,
    lead.state,
    lead.zipCode,
  ]);
  const assignee = (lead.assignedTo && "user" in lead.assignedTo && lead.assignedTo.user)
    ? `${readText(lead.assignedTo.user.firstName)} ${readText(lead.assignedTo.user.lastName)}`.trim()
    : `${readText(lead.assignedTo?.firstName)} ${readText(lead.assignedTo?.lastName)}`.trim();
  const name = `${readText(lead.firstName)} ${readText(lead.lastName)}`.trim() || "Lead";

  return {
    id: lead.id,
    name,
    company: lead.companyName || "Residential Prospect",
    value: Number(lead.potentialValue || 0),
    temperature,
    stage,
    daysInStage: daysSinceUpdate,
    source: lead.leadSource?.name || "Direct",
    assignee: assignee || "Unassigned",
    address: propertyAddress || "Address pending",
    jobType: readText(lead.serviceType) || "Roofing estimate",
    nextAction: getLeadNextAction(stage, temperature),
    phone: readText(lead.phone),
    email: readText(lead.email),
    updatedAt: lead.updatedAt,
    isStalled: daysSinceUpdate >= 5 && stage !== "won" && stage !== "lost",
  };
}

function mapInvoice(invoice: DashboardInvoice): InvoiceItem {
  const due = new Date(invoice.dueDate);
  const now = new Date();
  const daysOverdue = invoice.status === "OVERDUE" && !Number.isNaN(due.getTime())
    ? Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86400000))
    : undefined;
  const clientName = invoice.client?.companyName
    || [invoice.client?.firstName, invoice.client?.lastName].filter(Boolean).join(" ")
    || "Client";
  const statusMap: Record<string, InvoiceItem["status"]> = {
    OVERDUE: "overdue",
    SENT: "pending",
    VIEWED: "pending",
    PARTIALLY_PAID: "pending",
    PAID: "paid",
    DRAFT: "draft",
    CANCELLED: "draft",
    REFUNDED: "draft",
  };

  return {
    id: invoice.id,
    client: clientName,
    amount: Number(invoice.total || 0),
    outstandingAmount: Number(invoice.amountDue || invoice.total || 0),
    dueDate: formatDateLabel(invoice.dueDate),
    status: statusMap[invoice.status] || "draft",
    daysOverdue,
    invoiceNo: invoice.invoiceNumber,
  };
}

function mapProject(project: DashboardProject): JobItem {
  const clientName = project.client?.companyName
    || [project.client?.firstName, project.client?.lastName].filter(Boolean).join(" ")
    || "Client";
  const status = mapJobStatus(project.status || "");
  const value = Number(
    (project as Record<string, unknown>).contractValue
      ?? (project as Record<string, unknown>).budget
      ?? 0,
  );
  const crewCount = (project.members || []).filter((member) => member.employee).length;

  return {
    id: project.id,
    name: project.name,
    client: clientName,
    address: readText((project as Record<string, unknown>).jobSiteAddress)
      || readText((project as Record<string, unknown>).address)
      || readText((project as Record<string, unknown>).location)
      || "Address pending",
    value,
    crew: crewCount > 0 ? `${crewCount} crew member${crewCount === 1 ? "" : "s"}` : "Assign crew",
    deadline: project.endDate ? formatDateLabel(project.endDate) : "Pending",
    status,
    statusLabel: status === "on-track" ? "On Track" : status === "at-risk" ? "At Risk" : status === "delayed" ? "Delayed" : "Completed",
    type: readText((project as Record<string, unknown>).projectType) || "Roofing Job",
  };
}

function mapQuote(quote: DashboardQuote): EstimateItem {
  const leadName = quote.lead
    ? `${readText(quote.lead.firstName)} ${readText(quote.lead.lastName)}`.trim()
    : "";
  const normalizedStatus = readText(quote.status).toLowerCase() || (quote.sentAt ? "sent" : "draft");

  return {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    status: normalizedStatus,
    total: Number(quote.total || 0),
    recipientName: readText(quote.client?.clientName) || leadName || readText(quote.lead?.companyName) || "Estimate recipient",
    createdAt: quote.createdAt,
    validUntil: quote.validUntil,
    sentAt: quote.sentAt || null,
  };
}

function mapInspection(inspection: DashboardInspection): SiteVisitItem {
  return {
    id: inspection.id,
    leadId: inspection.leadId,
    clientName: inspection.lead
      ? `${readText(inspection.lead.firstName)} ${readText(inspection.lead.lastName)}`.trim() || readText(inspection.lead.companyName) || "Client"
      : "Client",
    address: buildAddress([
      inspection.lead?.propertyAddress,
      inspection.lead?.city,
      inspection.lead?.state,
      inspection.lead?.zipCode,
    ]) || "Address pending",
    inspectionType: readText(inspection.inspectionType) || "Inspection",
    scheduledAt: inspection.inspectionDate ? new Date(inspection.inspectionDate) : null,
    estimateValue: Number(inspection.totalEstimate || 0),
  };
}

function mapClient(client: DashboardClient): ClientItem {
  return {
    id: readText(client.id ?? client.Id) || readText(client.clientName ?? client.ClientName ?? client.name ?? client.Name),
    name: readText(client.clientName ?? client.ClientName ?? client.name ?? client.Name) || "Client",
    phone: readText(client.primaryContactPhone ?? client.phone ?? client.mobile ?? client.contactNo),
    email: readText(client.primaryEmail ?? client.email ?? client.contactEmail),
    lastContacted: readText(client.lastInteractionDate ?? client.lastContacted),
  };
}

function getTemperatureBadgeClasses(temperature: LeadItem["temperature"]): string {
  if (temperature === "hot") return "bg-[#FF2E2D]/10 text-[#FF2E2D]";
  if (temperature === "warm") return "bg-[#D97706]/10 text-[#D97706]";
  return "bg-[#0891B2]/10 text-[#0891B2]";
}

function getJobStatusBadgeClasses(status: JobItem["status"]): string {
  if (status === "completed") return "bg-[#01C44A]/10 text-[#01C44A]";
  if (status === "delayed") return "bg-[#FF2E2D]/10 text-[#FF2E2D]";
  if (status === "at-risk") return "bg-[#D97706]/10 text-[#D97706]";
  return "bg-[#0891B2]/10 text-[#0891B2]";
}

const Index = () => {
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const { toast } = useToast();
  const { branding } = useWorkspaceBranding();
  const companyName = branding?.companyName?.trim() || "ZODO CRM";
  const companyLogoUrl = branding?.logoUrl || null;
  const dashboardAccess = useMemo(() => ({
    canViewLeads: canAccessFeature(dashboardWidgetConfig.leads.featureId) && canAccessModule(dashboardWidgetConfig.leads.permissionModule),
    canViewInvoices: canAccessFeature(dashboardWidgetConfig.invoices.featureId) && canAccessModule(dashboardWidgetConfig.invoices.permissionModule),
    canViewQuotes: canAccessFeature(dashboardWidgetConfig.quotes.featureId) && canAccessModule(dashboardWidgetConfig.quotes.permissionModule),
    canViewClients: canAccessFeature(dashboardWidgetConfig.clients.featureId) && canAccessModule(dashboardWidgetConfig.clients.permissionModule),
    canViewProjects: canAccessFeature(dashboardWidgetConfig.projects.featureId) && canAccessModule(dashboardWidgetConfig.projects.permissionModule),
    canViewRoofEstimator: canAccessFeature(dashboardWidgetConfig.roofEstimator.featureId) && canAccessModule(dashboardWidgetConfig.roofEstimator.permissionModule),
    canViewSiteVisits: canAccessFeature(dashboardWidgetConfig.inspections.featureId) && canAccessModule(dashboardWidgetConfig.inspections.permissionModule),
    canViewTasks: canAccessFeature(dashboardWidgetConfig.tasks.featureId) && canAccessModule(dashboardWidgetConfig.tasks.permissionModule),
    canViewAiAssistant: canAccessFeature(dashboardWidgetConfig.aiAssistant.featureId),
  }), []);

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<BellNotification[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [quotes, setQuotes] = useState<EstimateItem[]>([]);
  const [siteVisits, setSiteVisits] = useState<SiteVisitItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);

  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;

    try {
      setUser(JSON.parse(storedUser));
    } catch {
      console.error("Failed to parse user data");
    }
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);
    setIsDarkMode(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      try {
        const data = await fetchDashboardData({
          canViewLeads: dashboardAccess.canViewLeads,
          canViewInvoices: dashboardAccess.canViewInvoices,
          canViewQuotes: dashboardAccess.canViewQuotes,
          canViewProjects: dashboardAccess.canViewProjects,
          canViewClients: dashboardAccess.canViewClients,
          canViewInspections: dashboardAccess.canViewSiteVisits,
          canViewTasks: dashboardAccess.canViewTasks,
        });

        setLeads(data.leads.map(mapLead));
        setInvoices(data.invoices.map(mapInvoice));
        setJobs(data.projects.map(mapProject));
        setQuotes(data.quotes.map(mapQuote));
        setSiteVisits(data.inspections.map(mapInspection));
        setClients(data.clients.map(mapClient));
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLeads([]);
        setInvoices([]);
        setJobs([]);
        setQuotes([]);
        setSiteVisits([]);
        setClients([]);
      } finally {
        setIsLoading(false);
      }
    };

    const loadNotifications = async () => {
      try {
        const data = await getNotifications({ limit: 10 });
        setNotifications(data.map(mapApiNotification));
      } catch (error) {
        console.error("Failed to fetch notifications for dashboard:", error);
      }
    };

    loadDashboard();
    loadNotifications();
  }, [
    dashboardAccess.canViewClients,
    dashboardAccess.canViewInvoices,
    dashboardAccess.canViewLeads,
    dashboardAccess.canViewProjects,
    dashboardAccess.canViewQuotes,
    dashboardAccess.canViewSiteVisits,
    dashboardAccess.canViewTasks,
  ]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setShowSearchModal(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }

      if (event.key === "Escape") {
        setShowSearchModal(false);
        setShowNotifications(false);
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    localStorage.setItem("theme", nextMode ? "dark" : "light");

    if (nextMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((previous) => previous.map((notification) => ({ ...notification, read: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      // Keep optimistic UI.
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleClientCall = (client: ClientItem) => {
    if (!client.phone) {
      toast({
        title: "Phone number missing",
        description: `Add a phone number for ${client.name} before calling from the dashboard.`,
      });
      return;
    }

    window.location.href = formatPhoneHref(client.phone);
  };

  const handleLeadSuggestion = (lead: LeadItem) => {
    if (lead.stage === "lead" || lead.stage === "contacted") {
      navigate(dashboardAccess.canViewSiteVisits ? "/inspections/new" : "/leads/pipeline");
      return;
    }

    if (lead.stage === "won") {
      navigate("/projects");
      return;
    }

    navigate(dashboardAccess.canViewQuotes ? "/quotes" : "/leads/pipeline");
  };

  const handleLeadDragStart = (event: DragEvent<HTMLDivElement>, leadId: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/lead-id", leadId);
    setDraggedLeadId(leadId);
  };

  const handleLeadDrop = async (stage: Exclude<RevenuePipelineStage, "lost">) => {
    if (!draggedLeadId) return;

    const previousLead = leads.find((lead) => lead.id === draggedLeadId);
    if (!previousLead || previousLead.stage === stage) {
      setDraggedLeadId(null);
      return;
    }

    setLeads((previous) => previous.map((lead) => (
      lead.id === draggedLeadId
        ? { ...lead, stage, nextAction: getLeadNextAction(stage, lead.temperature), isStalled: false, daysInStage: 0 }
        : lead
    )));

    try {
      await updateLeadStatus(draggedLeadId, stageToLeadStatus[stage]);
      toast({
        title: "Pipeline updated",
        description: `${previousLead.name} moved to ${stage.replace("-", " ")}.`,
      });
    } catch (error) {
      console.error("Failed to update lead status:", error);
      setLeads((previous) => previous.map((lead) => (
        lead.id === draggedLeadId ? previousLead : lead
      )));
      toast({
        title: "Could not update pipeline",
        description: "The lead stayed in its previous stage. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDraggedLeadId(null);
    }
  };

  const unreadNotificationsCount = notifications.filter((notification) => !notification.read).length;

  const quickActions = useMemo<QuickActionItem[]>(() => {
    const items: QuickActionItem[] = [];

    if (dashboardAccess.canViewRoofEstimator) {
      items.push({
        id: "create-estimate",
        label: "Create Estimate",
        description: "Launch the ZODO AI Roof Estimator",
        icon: FileText,
        path: "/roof-estimator/new",
        variant: "default",
      });
    }

    if (dashboardAccess.canViewSiteVisits) {
      items.push({
        id: "schedule-site-visit",
        label: "Schedule Inspection",
        description: "Book the next inspection slot",
        icon: Calendar,
        path: "/inspections/new",
        variant: "outline",
      });
    }

    if (dashboardAccess.canViewLeads) {
      items.push({
        id: "view-pipeline",
        label: "View Pipeline",
        description: "Work the leads closest to revenue",
        icon: Target,
        path: "/leads/pipeline",
        variant: "outline",
      });
    }

    if (dashboardAccess.canViewProjects) {
      items.push({
        id: "view-jobs",
        label: "View Jobs",
        description: "Track production and crew deadlines",
        icon: Briefcase,
        path: "/projects",
        variant: "outline",
      });
    }

    if (dashboardAccess.canViewInvoices) {
      items.push({
        id: "view-invoices",
        label: "View Invoices",
        description: "Collect overdue and pending payments",
        icon: Receipt,
        path: "/invoice",
        variant: "outline",
      });
    }

    return items;
  }, [
    dashboardAccess.canViewInvoices,
    dashboardAccess.canViewLeads,
    dashboardAccess.canViewProjects,
    dashboardAccess.canViewRoofEstimator,
    dashboardAccess.canViewSiteVisits,
  ]);

  const filteredQuickActions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return quickActions;

    return quickActions.filter((action) => (
      `${action.label} ${action.description}`.toLowerCase().includes(query)
    ));
  }, [quickActions, searchQuery]);

  const hotLeads = useMemo(() => (
    dashboardAccess.canViewLeads
      ? leads.filter((lead) => lead.temperature === "hot" && lead.stage !== "won" && lead.stage !== "lost")
      : []
  ), [dashboardAccess.canViewLeads, leads]);

  const overdueInvoices = useMemo(() => (
    dashboardAccess.canViewInvoices
      ? invoices.filter((invoice) => invoice.status === "overdue")
      : []
  ), [dashboardAccess.canViewInvoices, invoices]);

  const pendingPayments = useMemo(() => (
    dashboardAccess.canViewInvoices
      ? invoices.filter((invoice) => invoice.status === "pending" || invoice.status === "overdue")
      : []
  ), [dashboardAccess.canViewInvoices, invoices]);

  const draftEstimates = useMemo(() => (
    dashboardAccess.canViewQuotes
      ? quotes.filter(isEstimateDraft)
      : []
  ), [dashboardAccess.canViewQuotes, quotes]);

  const sentEstimates = useMemo(() => (
    dashboardAccess.canViewQuotes
      ? quotes.filter(isEstimateSent)
      : []
  ), [dashboardAccess.canViewQuotes, quotes]);

  const nextSiteVisit = useMemo(() => {
    if (!dashboardAccess.canViewSiteVisits) return null;

    return [...siteVisits]
      .filter((visit) => visit.scheduledAt && visit.scheduledAt.getTime() >= Date.now())
      .sort((left, right) => (left.scheduledAt?.getTime() || 0) - (right.scheduledAt?.getTime() || 0))[0] || null;
  }, [dashboardAccess.canViewSiteVisits, siteVisits]);

  const activeJobs = useMemo(() => (
    dashboardAccess.canViewProjects
      ? [...jobs]
          .filter((job) => job.status !== "completed")
          .sort((left, right) => left.deadline.localeCompare(right.deadline))
          .slice(0, 4)
      : []
  ), [dashboardAccess.canViewProjects, jobs]);

  const recentClients = useMemo(() => (
    dashboardAccess.canViewClients
      ? [...clients]
          .sort((left, right) => {
            const leftTime = left.lastContacted ? new Date(left.lastContacted).getTime() : 0;
            const rightTime = right.lastContacted ? new Date(right.lastContacted).getTime() : 0;
            return rightTime - leftTime;
          })
          .slice(0, 5)
      : []
  ), [clients, dashboardAccess.canViewClients]);

  const openPipelineLeads = useMemo(() => (
    dashboardAccess.canViewLeads
      ? leads.filter((lead) => lead.stage !== "won" && lead.stage !== "lost")
      : []
  ), [dashboardAccess.canViewLeads, leads]);

  const totalPotentialRevenue = openPipelineLeads.reduce((sum, lead) => sum + lead.value, 0) + pendingPayments.reduce((sum, invoice) => sum + invoice.outstandingAmount, 0);
  const hotLeadsValue = hotLeads.reduce((sum, lead) => sum + lead.value, 0);
  const estimatesSentValue = sentEstimates.reduce((sum, quote) => sum + quote.total, 0);
  const pendingPaymentsValue = pendingPayments.reduce((sum, invoice) => sum + invoice.outstandingAmount, 0);
  const stalledLeadValue = leads.filter((lead) => lead.isStalled).reduce((sum, lead) => sum + lead.value, 0);
  const estimateNotSentValue = draftEstimates.reduce((sum, quote) => sum + quote.total, 0);
  const missedRevenueValue = stalledLeadValue + estimateNotSentValue;

  const totalPotentialTrend = openPipelineLeads.length > 0
    ? Math.round((hotLeadsValue / Math.max(openPipelineLeads.reduce((sum, lead) => sum + lead.value, 0), 1)) * 100)
    : 0;
  const hotLeadsTrend = openPipelineLeads.length > 0
    ? Math.round((hotLeads.length / Math.max(openPipelineLeads.length, 1)) * 100)
    : 0;
  const estimatesSentTrend = quotes.length > 0
    ? Math.round((sentEstimates.length / Math.max(quotes.length, 1)) * 100)
    : 0;
  const pendingPaymentsTrend = invoices.length > 0
    ? Math.round((pendingPayments.length / Math.max(invoices.length, 1)) * 100)
    : 0;

  const actionCenterItems = useMemo<ActionCenterItem[]>(() => {
    const items: ActionCenterItem[] = [];

    if (dashboardAccess.canViewLeads) {
      items.push({
        id: "follow-up-hot-leads",
        tone: "danger",
        label: `Follow up: ${hotLeads.length} hot lead${hotLeads.length === 1 ? "" : "s"}`,
        detail: hotLeads.length > 0
          ? `${formatMoney(hotLeadsValue)} ready for a call back today`
          : "No hot leads waiting right now",
        actionLabel: "Open Pipeline",
        path: "/leads/pipeline",
      });
    }

    if (dashboardAccess.canViewQuotes) {
      items.push({
        id: "estimates-not-sent",
        tone: "warning",
        label: `${draftEstimates.length} estimate${draftEstimates.length === 1 ? "" : "s"} not sent`,
        detail: draftEstimates.length > 0
          ? `${formatMoney(estimateNotSentValue)} still sitting in draft`
          : "Every estimate in the queue has been sent",
        actionLabel: "Open Estimates",
        path: "/quotes",
      });
    }

    if (dashboardAccess.canViewSiteVisits) {
      items.push({
        id: "next-site-visit",
        tone: "success",
        label: nextSiteVisit
          ? `Visit at ${formatTimeLabel(nextSiteVisit.scheduledAt)} - ${nextSiteVisit.clientName}`
          : "Inspection schedule is open",
        detail: nextSiteVisit
          ? `${nextSiteVisit.inspectionType} at ${nextSiteVisit.address}`
          : "Book the next inspection before the day fills up",
        actionLabel: nextSiteVisit ? "Open Inspection" : "Schedule Inspection",
        path: nextSiteVisit ? "/inspections" : "/inspections/new",
      });
    }

    if (dashboardAccess.canViewInvoices) {
      items.push({
        id: "invoice-overdue",
        tone: "danger",
        label: `Invoice overdue: ${formatMoney(overdueInvoices.reduce((sum, invoice) => sum + invoice.outstandingAmount, 0))}`,
        detail: overdueInvoices.length > 0
          ? `${overdueInvoices.length} invoice${overdueInvoices.length === 1 ? "" : "s"} need collection follow-up`
          : "No overdue invoices right now",
        actionLabel: "Open Invoices",
        path: "/invoice",
      });
    }

    return items;
  }, [
    dashboardAccess.canViewInvoices,
    dashboardAccess.canViewLeads,
    dashboardAccess.canViewQuotes,
    dashboardAccess.canViewSiteVisits,
    draftEstimates.length,
    estimateNotSentValue,
    hotLeads.length,
    hotLeadsValue,
    nextSiteVisit,
    overdueInvoices,
  ]);

  const kanbanColumns = useMemo(() => ([
    { id: "lead" as const, title: "Lead", leads: leads.filter((lead) => lead.stage === "lead") },
    { id: "contacted" as const, title: "Contacted", leads: leads.filter((lead) => lead.stage === "contacted") },
    { id: "estimate-sent" as const, title: "Estimate Sent", leads: leads.filter((lead) => lead.stage === "estimate-sent") },
    { id: "negotiation" as const, title: "Negotiation", leads: leads.filter((lead) => lead.stage === "negotiation") },
    { id: "won" as const, title: "Won", leads: leads.filter((lead) => lead.stage === "won") },
  ]), [leads]);

  const hasAnyDashboardModuleAccess =
    dashboardAccess.canViewLeads ||
    dashboardAccess.canViewInvoices ||
    dashboardAccess.canViewQuotes ||
    dashboardAccess.canViewProjects ||
    dashboardAccess.canViewClients ||
    dashboardAccess.canViewRoofEstimator ||
    dashboardAccess.canViewSiteVisits;

  return (
    <div className="min-h-screen w-full bg-[#F7F7FB]">
      <main>
        <header
          className={cn(
            "crm-module-header sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[rgba(15,23,42,0.06)]",
            isMobile ? "pt-[env(safe-area-inset-top,7px)]" : "pt-0",
          )}
        >
          {isMobile ? (
            <div className="flex h-12 items-center justify-between px-4">
              <div className="flex items-center gap-2">
                {companyLogoUrl ? (
                  <img src={companyLogoUrl} alt={companyName} className="h-8 w-8 rounded-md object-contain" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0891B2]/10 text-[11px] font-bold uppercase text-[#0891B2]">
                    {companyName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="max-w-[160px] truncate text-sm font-bold text-[#0F172A] tracking-tight">{companyName}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/settings/profile")}
                  className="p-1.5 rounded-full text-[#475569]"
                >
                  <div className="h-7 w-7 rounded-full bg-[#0891B2] flex items-center justify-center text-white text-[10px] font-bold">
                    {user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : "ZU"}
                  </div>
                </button>
                <div ref={notificationRef} className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-1.5 rounded-full text-[#475569]"
                  >
                    <Bell size={20} />
                    {unreadNotificationsCount > 0 ? (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-[#FF7B36] text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white z-10">
                        {unreadNotificationsCount}
                      </span>
                    ) : null}
                  </button>
                  <AnimatePresence>
                    {showNotifications ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-80 bg-white border border-[rgba(15,23,42,0.06)] card-shadow rounded-md overflow-hidden z-50"
                      >
                        <div className="p-4 border-b border-[rgba(15,23,42,0.06)]">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-[#0F172A]">Notifications</h4>
                            <button
                              onClick={handleMarkAllAsRead}
                              className="text-xs text-[#0891B2] font-medium cursor-pointer hover:underline"
                            >
                              Mark all as read
                            </button>
                          </div>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {notifications.map((notification) => {
                            const colors = getColorClasses(notification.color);
                            return (
                              <div
                                key={notification.id}
                                className={cn(
                                  "p-3 hover:bg-white transition-colors cursor-pointer border-b border-[rgba(15,23,42,0.06)] last:border-0",
                                  !notification.read && "bg-[#0891B2]/5",
                                )}
                              >
                                <div className="flex gap-3">
                                  <div className={cn("w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0", colors.light)}>
                                    <notification.icon size={16} className={colors.text} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-[#0F172A]">{notification.title}</p>
                                    <p className="text-[11px] text-[#475569] line-clamp-2">{notification.message}</p>
                                    <p className="text-[10px] text-[#94A3B8] mt-0.5">{notification.time}</p>
                                  </div>
                                  {!notification.read ? <div className="w-1.5 h-1.5 rounded-full bg-[#0891B2] flex-shrink-0 mt-2" /> : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="p-2.5 bg-white text-center border-t border-[rgba(15,23,42,0.06)]">
                          <button
                            onClick={() => navigate("/notifications")}
                            className="text-xs text-[#0891B2] font-medium hover:underline"
                          >
                            View All Notifications
                          </button>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-12 items-center justify-between px-3 md:px-5">
              <div className="flex items-center gap-2 md:gap-6 flex-1 min-w-0">
                <div className="relative flex-1 max-w-[160px] sm:max-w-xs md:max-w-none md:flex-none md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569]" />
                  <input
                    type="text"
                    placeholder="Search jobs, estimates, clients..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onClick={() => setShowSearchModal(true)}
                    className="w-full h-8 pl-9 pr-4 md:pr-14 rounded-md bg-white border border-[rgba(15,23,42,0.06)] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#0891B2]/30 transition-colors"
                  />
                  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-[#F1F5F9] text-[10px] text-[#475569] border border-[rgba(15,23,42,0.06)] font-mono hidden md:flex items-center gap-1">
                    <Command size={10} />
                    K
                  </kbd>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
                <div className="hidden lg:flex items-center gap-2">
                  {quickActions.slice(0, 3).map((action) => (
                    <Button
                      key={action.id}
                      variant={action.variant}
                      size="sm"
                      onClick={() => navigate(action.path)}
                    >
                      <action.icon />
                      <span>{action.label}</span>
                    </Button>
                  ))}
                </div>

                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-md bg-white border border-[rgba(15,23,42,0.06)] text-[#94A3B8] hover:text-[#475569] transition-colors"
                >
                  {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
                </button>

                <div ref={notificationRef} className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative overflow-visible p-2 rounded-md bg-white border border-[rgba(15,23,42,0.06)] text-[#94A3B8] hover:text-[#475569] transition-colors"
                  >
                    <Bell size={15} />
                    {unreadNotificationsCount > 0 ? (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-[#FF7B36] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white z-10">
                        {unreadNotificationsCount}
                      </span>
                    ) : null}
                  </button>
                  <AnimatePresence>
                    {showNotifications ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-80 bg-white border border-[rgba(15,23,42,0.06)] card-shadow rounded-md overflow-hidden z-50"
                      >
                        <div className="p-4 border-b border-[rgba(15,23,42,0.06)]">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-[#0F172A]">Notifications</h4>
                            <button
                              onClick={handleMarkAllAsRead}
                              className="text-xs text-[#0891B2] font-medium cursor-pointer hover:underline"
                            >
                              Mark all as read
                            </button>
                          </div>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {notifications.map((notification) => {
                            const colors = getColorClasses(notification.color);
                            return (
                              <div
                                key={notification.id}
                                className={cn(
                                  "p-4 hover:bg-white transition-colors cursor-pointer border-b border-[rgba(15,23,42,0.06)] last:border-0",
                                  !notification.read && "bg-[#0891B2]/5",
                                )}
                              >
                                <div className="flex gap-3">
                                  <div className={cn("w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0", colors.light)}>
                                    <notification.icon size={18} className={colors.text} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[#0F172A]">{notification.title}</p>
                                    <p className="text-sm text-[#475569]">{notification.message}</p>
                                    <p className="text-xs text-[#475569] mt-1">{notification.time}</p>
                                  </div>
                                  {!notification.read ? <div className="w-2 h-2 rounded-full bg-[#0891B2] flex-shrink-0 mt-2" /> : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="p-3 bg-white text-center border-t border-[rgba(15,23,42,0.06)]">
                          <button
                            onClick={() => navigate("/notifications")}
                            className="text-sm text-[#0891B2] font-medium hover:underline"
                          >
                            View All Notifications
                          </button>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <div ref={profileRef} className="relative flex items-center gap-3 pl-3 ml-3 border-l border-[rgba(15,23,42,0.06)] hidden md:flex">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-[#0F172A]">
                      {user ? `${user.firstName} ${user.lastName}` : "Guest User"}
                    </p>
                    <p className="text-xs text-[#94A3B8]">{user?.role || "Administrator"}</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="relative cursor-pointer flex items-center gap-2"
                  >
                    <div className="h-8 w-8 rounded-md bg-[#0891B2] flex items-center justify-center text-white text-xs font-bold">
                      {user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : "ZU"}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#01C44A] rounded-full border-2 border-[rgba(15,23,42,0.06)]" />
                  </motion.button>
                  <ChevronDown size={16} className={cn("text-[#475569] transition-transform", showProfileMenu && "rotate-180")} />
                  <AnimatePresence>
                    {showProfileMenu ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-56 bg-white border border-[rgba(15,23,42,0.06)] card-shadow rounded-md overflow-hidden z-50"
                      >
                        <div className="p-4 border-b border-[rgba(15,23,42,0.06)]">
                          <p className="font-semibold text-[#0F172A]">
                            {user ? `${user.firstName} ${user.lastName}` : "Guest User"}
                          </p>
                          <p className="text-xs text-[#475569] truncate">{user?.email || "guest@zodo.ca"}</p>
                        </div>
                        <div className="p-2">
                          <button
                            onClick={() => navigate("/settings/profile")}
                            className="w-full px-3 py-2 text-left text-sm text-[#475569] hover:bg-white hover:text-[#0F172A] rounded-md transition-colors"
                          >
                            Profile Settings
                          </button>
                          <button
                            onClick={() => navigate("/settings")}
                            className="w-full px-3 py-2 text-left text-sm text-[#475569] hover:bg-white hover:text-[#0F172A] rounded-md transition-colors"
                          >
                            Account Settings
                          </button>
                          <button
                            onClick={() => navigate("/help")}
                            className="w-full px-3 py-2 text-left text-sm text-[#475569] hover:bg-white hover:text-[#0F172A] rounded-md transition-colors"
                          >
                            Help and Support
                          </button>
                        </div>
                        <div className="p-2 border-t border-[rgba(15,23,42,0.06)]">
                          <button
                            onClick={handleLogout}
                            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-md transition-colors"
                          >
                            Sign Out
                          </button>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}
        </header>

        <div className={cn("space-y-4 md:space-y-6 page-enter", isMobile ? "p-3" : "p-4 md:p-6")}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#0F172A]">
                {getGreeting()}, {user ? user.firstName : "there"}
              </h1>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                {currentTime.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0891B2] bg-[#0891B2]/10 px-2 py-1 rounded">
                Live
              </span>
              <span className="text-[10px] text-[#94A3B8]">Revenue engine updated just now</span>
            </div>
          </div>

          {isMobile ? (
            <div className="flex flex-wrap gap-2">
              {quickActions.slice(0, 3).map((action) => (
                <Button
                  key={action.id}
                  variant={action.variant}
                  size="sm"
                  onClick={() => navigate(action.path)}
                >
                  <action.icon />
                  <span>{action.label}</span>
                </Button>
              ))}
            </div>
          ) : null}

          {!hasAnyDashboardModuleAccess ? (
            <div className={`${sectionCardClassName} px-5 py-4`}>
              <h2 className="text-sm font-semibold text-[#0F172A]">Dashboard Access Limited</h2>
              <p className="mt-1 text-sm text-[#475569]">
                This account can access the dashboard shell, but roofing revenue widgets are hidden by permissions.
              </p>
            </div>
          ) : null}

          {hasAnyDashboardModuleAccess ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-[1.4fr,0.9fr]">
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className={sectionCardClassName}
                >
                  <div className="p-5 border-b border-[rgba(15,23,42,0.06)]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
                          <Target size={16} className="text-[#0891B2]" />
                        </div>
                        <div>
                          <h2 className="text-sm font-semibold text-[#0F172A]">What should I do today?</h2>
                          <p className="text-[11px] text-[#94A3B8]">Work the tasks that move revenue fastest</p>
                        </div>
                      </div>
                      {dashboardAccess.canViewLeads ? (
                        <button
                          onClick={() => navigate("/leads/pipeline")}
                          className="text-xs text-[#0891B2] font-medium hover:underline flex items-center gap-1"
                        >
                          Open Pipeline
                          <ArrowUpRight size={12} />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="divide-y divide-[rgba(15,23,42,0.04)]">
                    {actionCenterItems.length > 0 ? actionCenterItems.map((item) => {
                      const toneClasses = item.tone === "danger"
                        ? { bg: "bg-[#FF2E2D]/10", text: "text-[#FF2E2D]" }
                        : item.tone === "warning"
                          ? { bg: "bg-[#D97706]/10", text: "text-[#D97706]" }
                          : { bg: "bg-[#01C44A]/10", text: "text-[#01C44A]" };

                      return (
                        <button
                          key={item.id}
                          onClick={() => navigate(item.path)}
                          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F7F7FB] transition-colors"
                        >
                          <div className={cn("w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0", toneClasses.bg)}>
                            {item.tone === "danger" ? (
                              <AlertTriangle size={14} className={toneClasses.text} />
                            ) : item.tone === "warning" ? (
                              <FileText size={14} className={toneClasses.text} />
                            ) : (
                              <Calendar size={14} className={toneClasses.text} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#0F172A]">{item.label}</p>
                            <p className="text-[11px] text-[#475569]">{item.detail}</p>
                          </div>
                          <span className="text-[11px] font-medium text-[#0891B2] whitespace-nowrap">{item.actionLabel}</span>
                        </button>
                      );
                    }) : (
                      <div className="px-5 py-6 text-sm text-[#475569]">
                        No action center items are available for this account yet.
                      </div>
                    )}
                  </div>
                </motion.section>

                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-md border border-red-200/15 bg-[#FF2E2D]/5 px-5 py-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-md bg-[#FF2E2D]/10 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle size={16} className="text-[#FF2E2D]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm font-semibold text-[#0F172A]">Missed Revenue Alert</h2>
                      <p className="text-[11px] text-[#475569] mt-1">Lost momentum that can still be recovered this week.</p>
                      <p className="text-lg font-bold text-[#FF2E2D] mt-3">{formatMoney(missedRevenueValue)}</p>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-[#475569]">No follow-up</span>
                          <span className="font-semibold text-[#0F172A]">{formatMoney(stalledLeadValue)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-[#475569]">Estimate not sent</span>
                          <span className="font-semibold text-[#0F172A]">{formatMoney(estimateNotSentValue)}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => navigate(draftEstimates.length > 0 ? "/quotes" : "/leads/pipeline")}
                      >
                        Recover Revenue
                      </Button>
                    </div>
                  </div>
                </motion.section>
              </div>

              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-[#0F172A]">Revenue Snapshot</h2>
                    <p className="text-[11px] text-[#94A3B8]">Pipeline, estimates, and collections in one view</p>
                  </div>
                </div>

                <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    title="Total Potential Revenue"
                    value={formatMoney(totalPotentialRevenue)}
                    subtitle="Open pipeline plus receivables"
                    trend={totalPotentialTrend}
                    comparison="hot share"
                    icon={DollarSign}
                    color="orange"
                    isLoading={isLoading}
                    lastUpdated="Updated just now"
                    aiInsight={totalPotentialRevenue > 0 ? "Focus on pipeline and collections today" : undefined}
                  />
                  <StatCard
                    title="Hot Leads Value"
                    value={formatMoney(hotLeadsValue)}
                    subtitle={`${hotLeads.length} hot roofing opportunities`}
                    trend={hotLeadsTrend}
                    comparison="of open leads"
                    icon={Target}
                    color="yellow"
                    isLoading={isLoading}
                    lastUpdated="Updated just now"
                    aiInsight={hotLeads.length > 0 ? "Call these first for fastest revenue" : undefined}
                  />
                  <StatCard
                    title="Estimates Sent Value"
                    value={formatMoney(estimatesSentValue)}
                    subtitle={`${sentEstimates.length} estimate${sentEstimates.length === 1 ? "" : "s"} out with clients`}
                    trend={estimatesSentTrend}
                    comparison="sent rate"
                    icon={FileText}
                    color="cyan"
                    isLoading={isLoading}
                    lastUpdated="Updated just now"
                    aiInsight={sentEstimates.length > 0 ? "Follow up before validity dates expire" : undefined}
                  />
                  <StatCard
                    title="Pending Payments Value"
                    value={formatMoney(pendingPaymentsValue)}
                    subtitle={`${pendingPayments.length} invoice${pendingPayments.length === 1 ? "" : "s"} awaiting payment`}
                    trend={pendingPaymentsTrend}
                    comparison="receivable mix"
                    icon={Receipt}
                    color="green"
                    isLoading={isLoading}
                    lastUpdated="Updated just now"
                    aiInsight={pendingPayments.length > 0 ? "Collection follow-up is revenue protection" : undefined}
                  />
                </div>
              </motion.section>

              {dashboardAccess.canViewLeads ? (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={sectionCardClassName}
                >
                  <div className="p-5 border-b border-[rgba(15,23,42,0.06)]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
                          <FolderKanban size={16} className="text-[#0891B2]" />
                        </div>
                        <div>
                          <h2 className="text-sm font-semibold text-[#0F172A]">Job Pipeline</h2>
                          <p className="text-[11px] text-[#94A3B8]">Move leads through the sales stages that create jobs</p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate("/leads/pipeline")}
                        className="text-xs text-[#0891B2] font-medium hover:underline flex items-center gap-1"
                      >
                        View Pipeline
                        <ArrowUpRight size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="grid min-w-[980px] grid-cols-5 gap-4 p-5">
                      {kanbanColumns.map((column) => (
                        <div
                          key={column.id}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => handleLeadDrop(column.id)}
                          className={cn(
                            "rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F7F7FB] p-3 min-h-[360px]",
                            draggedLeadId && "border-dashed",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <h3 className="text-xs font-semibold text-[#0F172A]">{column.title}</h3>
                            <span className="px-2 py-0.5 rounded bg-white text-[10px] font-semibold text-[#475569] border border-[rgba(15,23,42,0.06)]">
                              {column.leads.length}
                            </span>
                          </div>

                          <div className="space-y-3">
                            {column.leads.length > 0 ? column.leads.map((lead) => (
                              <div
                                key={lead.id}
                                draggable
                                onDragStart={(event) => handleLeadDragStart(event, lead.id)}
                                onDragEnd={() => setDraggedLeadId(null)}
                                className={cn(
                                  "bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-4 cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:border-slate-300",
                                  draggedLeadId === lead.id && "opacity-60",
                                )}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[#0F172A]">{lead.name}</p>
                                    <p className="mt-1 text-[11px] text-[#94A3B8] flex items-start gap-1">
                                      <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                                      <span className="line-clamp-2">{lead.address}</span>
                                    </p>
                                  </div>
                                  <span className="text-xs font-semibold text-[#0F172A] whitespace-nowrap">{formatMoney(lead.value)}</span>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold capitalize", getTemperatureBadgeClasses(lead.temperature))}>
                                    {lead.temperature}
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F1F5F9] text-[#475569]">
                                    {lead.jobType}
                                  </span>
                                </div>

                                <div className="mt-4 flex items-end justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#94A3B8]">Next Action</p>
                                    <p className="text-xs font-medium text-[#475569]">{lead.nextAction}</p>
                                  </div>
                                  {dashboardAccess.canViewAiAssistant ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleLeadSuggestion(lead)}
                                    >
                                      <Sparkles />
                                      <span>{lead.stage === "won" ? "Open job?" : "Follow up?"}</span>
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            )) : (
                              <div className="rounded-md border border-dashed border-[rgba(15,23,42,0.08)] bg-white px-4 py-6 text-center text-xs text-[#94A3B8]">
                                No items in this stage
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.section>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-[1.2fr,0.8fr]">
                {dashboardAccess.canViewProjects ? (
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className={sectionCardClassName}
                  >
                    <div className="p-5 border-b border-[rgba(15,23,42,0.06)]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
                            <Briefcase size={16} className="text-[#0891B2]" />
                          </div>
                          <div>
                            <h2 className="text-sm font-semibold text-[#0F172A]">Active Jobs</h2>
                            <p className="text-[11px] text-[#94A3B8]">Production work already sold and scheduled</p>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate("/projects")}
                          className="text-xs text-[#0891B2] font-medium hover:underline flex items-center gap-1"
                        >
                          View Jobs
                          <ArrowUpRight size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 p-5 md:grid-cols-2">
                      {activeJobs.length > 0 ? activeJobs.map((job) => (
                        <div key={job.id} className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#0F172A] line-clamp-1">{job.name}</p>
                              <p className="text-[11px] text-[#94A3B8] line-clamp-1">{job.client}</p>
                            </div>
                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap", getJobStatusBadgeClasses(job.status))}>
                              {job.statusLabel}
                            </span>
                          </div>

                          <div className="mt-4 space-y-3 text-xs">
                            <div className="flex items-start gap-2 text-[#475569]">
                              <MapPin size={13} className="mt-0.5 flex-shrink-0 text-[#94A3B8]" />
                              <span>{job.address}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[#94A3B8]">Value</span>
                              <span className="font-semibold text-[#0F172A]">{formatMoney(job.value)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[#94A3B8]">Crew</span>
                              <span className="font-medium text-[#475569]">{job.crew}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[#94A3B8]">Deadline</span>
                              <span className="font-medium text-[#475569]">{job.deadline}</span>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[rgba(15,23,42,0.06)] pt-4">
                            <span className="text-[11px] text-[#94A3B8]">{job.type}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate("/projects")}
                            >
                              View Job
                            </Button>
                          </div>
                        </div>
                      )) : (
                        <div className="md:col-span-2 rounded-md border border-dashed border-[rgba(15,23,42,0.08)] bg-[#F7F7FB] px-4 py-10 text-center text-sm text-[#475569]">
                          No active jobs are on the board yet.
                        </div>
                      )}
                    </div>
                  </motion.section>
                ) : null}

                {dashboardAccess.canViewClients ? (
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={sectionCardClassName}
                  >
                    <div className="p-5 border-b border-[rgba(15,23,42,0.06)]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
                            <Users size={16} className="text-[#0891B2]" />
                          </div>
                          <div>
                            <h2 className="text-sm font-semibold text-[#0F172A]">Recent Clients</h2>
                            <p className="text-[11px] text-[#94A3B8]">Recent homeowners and commercial accounts</p>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate("/client-list")}
                          className="text-xs text-[#0891B2] font-medium hover:underline flex items-center gap-1"
                        >
                          View Clients
                          <ArrowUpRight size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="divide-y divide-[rgba(15,23,42,0.04)]">
                      {recentClients.length > 0 ? recentClients.map((client) => (
                        <div key={client.id} className="px-5 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#0F172A]">{client.name}</p>
                              <p className="text-[11px] text-[#94A3B8]">
                                {client.lastContacted ? `Last contacted ${formatDateLabel(client.lastContacted)}` : "Newly added client"}
                              </p>
                            </div>
                            {dashboardAccess.canViewAiAssistant ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate("/quotes")}
                              >
                                <Sparkles />
                                <span>Send estimate?</span>
                              </Button>
                            ) : null}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleClientCall(client)}
                            >
                              <PhoneCall />
                              <span>Call</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate("/quotes")}
                            >
                              <FileText />
                              <span>Send Estimate</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate("/projects")}
                            >
                              <Briefcase />
                              <span>View Jobs</span>
                            </Button>
                          </div>
                        </div>
                      )) : (
                        <div className="px-5 py-8 text-sm text-[#475569]">
                          No recent clients are available yet.
                        </div>
                      )}
                    </div>
                  </motion.section>
                ) : null}
              </div>

              {(dashboardAccess.canViewQuotes || dashboardAccess.canViewInvoices || dashboardAccess.canViewSiteVisits) ? (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-3"
                >
                  {dashboardAccess.canViewQuotes ? (
                    <div className={sectionCardClassName}>
                      <div className="p-5 border-b border-[rgba(15,23,42,0.06)]">
                        <h2 className="text-sm font-semibold text-[#0F172A]">Estimate Queue</h2>
                        <p className="text-[11px] text-[#94A3B8]">Drafts and sent estimates ready for follow-up</p>
                      </div>
                      <div className="divide-y divide-[rgba(15,23,42,0.04)]">
                        {[...draftEstimates, ...sentEstimates].slice(0, 4).map((estimate) => (
                          <div key={estimate.id} className="px-5 py-4 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#0F172A] line-clamp-1">{estimate.recipientName}</p>
                              <p className="text-[11px] text-[#94A3B8]">
                                {estimate.quoteNumber} · {isEstimateDraft(estimate) ? "Draft" : "Sent"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-semibold text-[#0F172A]">{formatMoney(estimate.total)}</p>
                              <p className="text-[11px] text-[#94A3B8]">Valid {formatDateLabel(estimate.validUntil)}</p>
                            </div>
                          </div>
                        ))}
                        {draftEstimates.length + sentEstimates.length === 0 ? (
                          <div className="px-5 py-8 text-sm text-[#475569]">No estimates are in the queue yet.</div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {dashboardAccess.canViewSiteVisits ? (
                    <div className={sectionCardClassName}>
                      <div className="p-5 border-b border-[rgba(15,23,42,0.06)]">
                        <h2 className="text-sm font-semibold text-[#0F172A]">Inspections</h2>
                        <p className="text-[11px] text-[#94A3B8]">Upcoming inspections and property visits</p>
                      </div>
                      <div className="divide-y divide-[rgba(15,23,42,0.04)]">
                        {siteVisits
                          .filter((visit) => visit.scheduledAt)
                          .sort((left, right) => (left.scheduledAt?.getTime() || 0) - (right.scheduledAt?.getTime() || 0))
                          .slice(0, 4)
                          .map((visit) => (
                            <div key={visit.id} className="px-5 py-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-[#0F172A]">{visit.clientName}</p>
                                  <p className="text-[11px] text-[#94A3B8] line-clamp-1">{visit.address}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-semibold text-[#0F172A]">{formatTimeLabel(visit.scheduledAt)}</p>
                                  <p className="text-[11px] text-[#94A3B8]">{formatDateTimeLabel(visit.scheduledAt)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        {siteVisits.filter((visit) => visit.scheduledAt).length === 0 ? (
                          <div className="px-5 py-8 text-sm text-[#475569]">No inspections are scheduled yet.</div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {dashboardAccess.canViewInvoices ? (
                    <div className={sectionCardClassName}>
                      <div className="p-5 border-b border-[rgba(15,23,42,0.06)]">
                        <h2 className="text-sm font-semibold text-[#0F172A]">Pending Payments</h2>
                        <p className="text-[11px] text-[#94A3B8]">Invoices waiting for payment or collection</p>
                      </div>
                      <div className="divide-y divide-[rgba(15,23,42,0.04)]">
                        {pendingPayments.slice(0, 4).map((invoice) => (
                          <div key={invoice.id} className="px-5 py-4 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#0F172A] line-clamp-1">{invoice.client}</p>
                              <p className="text-[11px] text-[#94A3B8]">
                                {invoice.invoiceNo} · Due {invoice.dueDate}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-semibold text-[#0F172A]">{formatMoney(invoice.outstandingAmount)}</p>
                              <p className={cn(
                                "text-[11px] font-medium",
                                invoice.status === "overdue" ? "text-[#FF2E2D]" : "text-[#D97706]",
                              )}>
                                {invoice.status === "overdue" ? "Overdue" : "Pending"}
                              </p>
                            </div>
                          </div>
                        ))}
                        {pendingPayments.length === 0 ? (
                          <div className="px-5 py-8 text-sm text-[#475569]">No pending payments right now.</div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </motion.section>
              ) : null}
            </>
          ) : null}
        </div>

        {!isMobile ? (
          <footer className="px-6 py-4 bg-[#F7F7FB] border-b border-[rgba(15,23,42,0.06)]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 md:gap-4 text-xs md:text-sm text-[#94A3B8]">
              <div className="flex items-center gap-2">
                <span>{new Date().getFullYear()}</span>
                <span className="font-semibold text-[#0F172A]">ZODO</span>
                <span className="text-[#0891B2] font-semibold">Dashboard</span>
                <span>All rights reserved</span>
              </div>
              <div className="flex items-center gap-4">
                <a href="#" className="hover:text-[#0891B2] transition-colors">Privacy</a>
                <a href="#" className="hover:text-[#0891B2] transition-colors">Terms</a>
                <a href="#" className="hover:text-[#0891B2] transition-colors">Support</a>
              </div>
            </div>
          </footer>
        ) : null}

        {isMobile ? <div className="h-20" /> : null}
      </main>

      <AnimatePresence>
        {showSearchModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-md"
            onClick={() => setShowSearchModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-2xl bg-white border border-[rgba(15,23,42,0.06)] card-shadow rounded-md overflow-hidden"
            >
              <div className="flex items-center gap-3 p-4 border-b border-[rgba(15,23,42,0.06)]">
                <Search size={20} className="text-[#475569]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search actions across jobs, estimates, and clients..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="flex-1 bg-transparent text-lg text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none"
                />
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="p-1.5 rounded-md hover:bg-[#F1F5F9] text-[#475569] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4">
                <p className="text-xs font-medium text-[#475569] uppercase tracking-wider mb-3">Quick Actions</p>
                <div className="space-y-1">
                  {filteredQuickActions.length > 0 ? filteredQuickActions.map((action) => {
                    const colors = action.variant === "default"
                      ? { light: "bg-[#0891B2]/10", text: "text-[#0891B2]" }
                      : getColorClasses(action.id === "view-invoices" ? "navy" : action.id === "view-pipeline" ? "gold" : "teal");

                    return (
                      <button
                        key={action.id}
                        onClick={() => {
                          navigate(action.path);
                          setShowSearchModal(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-white transition-colors group"
                      >
                        <div className={cn("w-10 h-10 rounded-md flex items-center justify-center", colors.light)}>
                          <action.icon size={18} className={colors.text} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-[#0F172A] group-hover:text-[#0891B2] transition-colors">{action.label}</p>
                          <p className="text-xs text-[#475569]">{action.description}</p>
                        </div>
                        <ArrowUpRight size={14} className="ml-auto text-[#94A3B8] group-hover:text-[#0891B2] transition-colors" />
                      </button>
                    );
                  }) : (
                    <div className="px-3 py-8 text-center text-sm text-[#475569]">
                      No dashboard actions match "{searchQuery}".
                    </div>
                  )}
                </div>
              </div>

              <div className="px-4 py-3 bg-white border-t border-[rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between text-xs text-[#475569]">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-[#F1F5F9] border border-[rgba(15,23,42,0.06)] font-mono">Enter</kbd>
                      to select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-[#F1F5F9] border border-[rgba(15,23,42,0.06)] font-mono">Esc</kbd>
                      to close
                    </span>
                  </div>
                  <span>Powered by ZODO Dashboard</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default Index;
