import { useEffect, useMemo, useRef, useState, type DragEvent, type ElementType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
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
import { Skeleton } from "@/components/ui/skeleton";
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
import { syncLegacyThemeStorage } from "@/lib/workspace-theme";

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
  createdAt: string;
  updatedAt: string;
  isStalled: boolean;
}

interface InvoiceItem {
  id: string;
  client: string;
  amount: number;
  outstandingAmount: number;
  dueDate: string;
  paidAt?: string | null;
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

function DashboardSectionHeaderSkeleton() {
  return (
    <div className="p-5 border-b border-[rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md bg-[#F1F5F9]" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-36 bg-[#F1F5F9]" />
            <Skeleton className="h-3 w-48 bg-[#F1F5F9]" />
          </div>
        </div>
        <Skeleton className="h-4 w-24 bg-[#F1F5F9]" />
      </div>
    </div>
  );
}

function DashboardActionCenterSkeleton() {
  return (
    <div className={sectionCardClassName}>
      <DashboardSectionHeaderSkeleton />
      <div className="divide-y divide-[rgba(15,23,42,0.04)]">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 px-5 py-4">
            <Skeleton className="h-8 w-8 rounded-md bg-[#F1F5F9]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-3/4 bg-[#F1F5F9]" />
              <Skeleton className="h-3 w-1/2 bg-[#F1F5F9]" />
            </div>
            <Skeleton className="h-3 w-20 bg-[#F1F5F9]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardAlertSkeleton() {
  return (
    <div className="rounded-md border border-red-200/15 bg-[#FF2E2D]/5 px-5 py-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 rounded-md bg-white/70" />
        <div className="flex-1 space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40 bg-white/70" />
            <Skeleton className="h-3 w-56 bg-white/70" />
          </div>
          <Skeleton className="h-7 w-32 bg-white/70" />
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3 w-24 bg-white/70" />
              <Skeleton className="h-3 w-16 bg-white/70" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3 w-28 bg-white/70" />
              <Skeleton className="h-3 w-16 bg-white/70" />
            </div>
          </div>
          <Skeleton className="h-8 w-36 rounded-md bg-white/70" />
        </div>
      </div>
    </div>
  );
}

function DashboardKanbanSkeleton() {
  return (
    <div className={sectionCardClassName}>
      <DashboardSectionHeaderSkeleton />
      <div className="overflow-x-auto">
        <div className="grid min-w-[980px] grid-cols-5 gap-4 p-5">
          {Array.from({ length: 5 }).map((_, columnIndex) => (
            <div
              key={columnIndex}
              className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F7F7FB] p-3 min-h-[360px]"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-20 bg-white" />
                <Skeleton className="h-5 w-8 rounded bg-white" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((__, cardIndex) => (
                  <div key={cardIndex} className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-28 bg-[#F1F5F9]" />
                          <Skeleton className="h-3 w-full bg-[#F1F5F9]" />
                        </div>
                        <Skeleton className="h-3 w-14 bg-[#F1F5F9]" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-12 rounded bg-[#F1F5F9]" />
                        <Skeleton className="h-5 w-20 rounded bg-[#F1F5F9]" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-16 bg-[#F1F5F9]" />
                        <Skeleton className="h-3 w-24 bg-[#F1F5F9]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardJobsSkeleton() {
  return (
    <div className={sectionCardClassName}>
      <DashboardSectionHeaderSkeleton />
      <div className="grid gap-4 p-5 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32 bg-[#F1F5F9]" />
                <Skeleton className="h-3 w-24 bg-[#F1F5F9]" />
              </div>
              <Skeleton className="h-5 w-16 rounded bg-[#F1F5F9]" />
            </div>
            <div className="mt-4 space-y-3">
              <Skeleton className="h-3 w-full bg-[#F1F5F9]" />
              <Skeleton className="h-3 w-full bg-[#F1F5F9]" />
              <Skeleton className="h-3 w-full bg-[#F1F5F9]" />
              <Skeleton className="h-3 w-full bg-[#F1F5F9]" />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[rgba(15,23,42,0.06)] pt-4">
              <Skeleton className="h-3 w-20 bg-[#F1F5F9]" />
              <Skeleton className="h-8 w-20 rounded-md bg-[#F1F5F9]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardClientsSkeleton() {
  return (
    <div className={sectionCardClassName}>
      <DashboardSectionHeaderSkeleton />
      <div className="divide-y divide-[rgba(15,23,42,0.04)]">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-28 bg-[#F1F5F9]" />
                <Skeleton className="h-3 w-32 bg-[#F1F5F9]" />
              </div>
              <Skeleton className="h-8 w-28 rounded-md bg-[#F1F5F9]" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Skeleton className="h-8 w-16 rounded-md bg-[#F1F5F9]" />
              <Skeleton className="h-8 w-28 rounded-md bg-[#F1F5F9]" />
              <Skeleton className="h-8 w-24 rounded-md bg-[#F1F5F9]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardQueueSkeleton() {
  return (
    <div className={sectionCardClassName}>
      <DashboardSectionHeaderSkeleton />
      <div className="divide-y divide-[rgba(15,23,42,0.04)]">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="px-5 py-4 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-32 bg-[#F1F5F9]" />
              <Skeleton className="h-3 w-28 bg-[#F1F5F9]" />
            </div>
            <div className="space-y-2 text-right">
              <Skeleton className="ml-auto h-3 w-16 bg-[#F1F5F9]" />
              <Skeleton className="ml-auto h-3 w-20 bg-[#F1F5F9]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardMobileQuickActionsSkeleton() {
  return (
    <div className={sectionCardClassName}>
      <div className="p-4 border-b border-[rgba(15,23,42,0.06)]">
        <Skeleton className="h-4 w-28 bg-[#F1F5F9]" />
        <Skeleton className="mt-2 h-3 w-40 bg-[#F1F5F9]" />
      </div>
      <div className="grid grid-cols-2 gap-3 p-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4">
            <Skeleton className="h-10 w-10 rounded-md bg-[#F1F5F9]" />
            <Skeleton className="mt-4 h-4 w-20 bg-[#F1F5F9]" />
            <Skeleton className="mt-2 h-3 w-full bg-[#F1F5F9]" />
            <Skeleton className="mt-2 h-3 w-4/5 bg-[#F1F5F9]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardMobileListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className={sectionCardClassName}>
      <DashboardSectionHeaderSkeleton />
      <div className="divide-y divide-[rgba(15,23,42,0.04)]">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="px-4 py-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-9 w-9 rounded-md bg-[#F1F5F9]" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3 bg-[#F1F5F9]" />
                <Skeleton className="h-3 w-full bg-[#F1F5F9]" />
                <Skeleton className="h-3 w-3/4 bg-[#F1F5F9]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

function isDateInRange(value: string | null | undefined, start: Date, end: Date): boolean {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= start.getTime() && time < end.getTime();
}

function formatTrend(current: number, previous: number) {
  if (current === 0 && previous === 0) {
    return { label: "No prior data", tone: "neutral" as const };
  }

  if (previous === 0) {
    return { label: "New activity", tone: "positive" as const };
  }

  const change = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.abs(change) >= 10 ? Math.round(change) : Number(change.toFixed(1));
  const prefix = change > 0 ? "+" : change < 0 ? "-" : "";

  return {
    label: `${prefix}${Math.abs(rounded)}%`,
    tone: change > 0 ? "positive" as const : change < 0 ? "negative" as const : "neutral" as const,
  };
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
  if (stage === "lead") return temperature === "hot" ? "Call prospect" : "Qualify opportunity";
  if (stage === "contacted") return "Schedule demo";
  if (stage === "estimate-sent") return "Follow up on proposal";
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
    jobType: readText(lead.serviceType) || "Software sales",
    nextAction: getLeadNextAction(stage, temperature),
    phone: readText(lead.phone),
    email: readText(lead.email),
    createdAt: lead.createdAt,
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
    paidAt: invoice.paidAt || null,
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
    type: readText((project as Record<string, unknown>).projectType) || "Sales Deal",
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
    recipientName: readText(quote.client?.clientName) || leadName || readText(quote.lead?.companyName) || "Proposal recipient",
    createdAt: quote.createdAt,
    validUntil: quote.validUntil,
    sentAt: quote.sentAt || null,
  };
}

function mapInspection(inspection: DashboardInspection): SiteVisitItem {
  const customerName = inspection.lead
    ? `${readText(inspection.lead.firstName)} ${readText(inspection.lead.lastName)}`.trim() || readText(inspection.lead.companyName) || "Client"
    : readText(inspection.client?.clientName) || readText(inspection.client?.companyName) || "Client";

  const address = inspection.lead
    ? buildAddress([
      inspection.lead?.propertyAddress,
      inspection.lead?.city,
      inspection.lead?.state,
      inspection.lead?.zipCode,
    ])
    : buildAddress([
      inspection.client?.streetAddress,
      inspection.client?.city,
      inspection.client?.province,
      inspection.client?.postalCode,
    ]);

  return {
    id: inspection.id,
    leadId: inspection.leadId,
    clientName: customerName,
    address: address || "Address pending",
    inspectionType: readText(inspection.inspectionType) || "Meeting",
    scheduledAt: inspection.inspectionDate ? new Date(inspection.inspectionDate) : null,
    estimateValue: Number(inspection.totalEstimate || 0),
  };
}

function mapClient(client: DashboardClient): ClientItem {
  return {
    id: readText(client.id ?? client.Id) || readText(client.clientName ?? client.ClientName ?? client.name ?? client.Name),
    name: readText(client.clientName ?? client.ClientName ?? client.name ?? client.Name) || "Client",
    phone: readText(
      client.primaryPhone
      ?? client.primaryContactPhone
      ?? client.directPhone
      ?? client.phone
      ?? client.mobile
      ?? client.contactNo,
    ),
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
  const { resolvedTheme, setTheme } = useTheme();
  const companyName = branding?.companyName?.trim() || "ZODO CRM";
  const companyLogoUrl = branding?.logoUrl || null;
  const isDarkMode = resolvedTheme === "dark";
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
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(true);
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
  const [pendingTasksCount, setPendingTasksCount] = useState(0);

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
        setPendingTasksCount(data.pendingTasks);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLeads([]);
        setInvoices([]);
        setJobs([]);
        setQuotes([]);
        setSiteVisits([]);
        setClients([]);
        setPendingTasksCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    const loadNotifications = async () => {
      setIsNotificationsLoading(true);
      try {
        const data = await getNotifications({ limit: 10 });
        setNotifications(data.map(mapApiNotification));
      } catch (error) {
        console.error("Failed to fetch notifications for dashboard:", error);
      } finally {
        setIsNotificationsLoading(false);
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
    const nextMode = isDarkMode ? "light" : "dark";
    setTheme(nextMode);
    syncLegacyThemeStorage(nextMode);
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
      navigate(dashboardAccess.canViewSiteVisits ? "/calendar" : "/leads/pipeline");
      return;
    }

    if (lead.stage === "won") {
      navigate("/deals");
      return;
    }

    navigate(dashboardAccess.canViewQuotes ? "/proposals" : "/leads/pipeline");
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

    if (dashboardAccess.canViewLeads) {
      items.push({
        id: "add-lead",
        label: "Add Lead",
        description: "Create a new sales opportunity",
        icon: Target,
        path: "/leads",
        variant: "default",
      });
    }

    if (dashboardAccess.canViewProjects) {
      items.push({
        id: "create-deal",
        label: "Create Deal",
        description: "Open a new pipeline deal",
        icon: Briefcase,
        path: "/deals",
        variant: "outline",
      });
    }

    if (dashboardAccess.canViewLeads) {
      items.push({
        id: "view-pipeline",
        label: "View Pipeline",
        description: "Work the deals closest to revenue",
        icon: Target,
        path: "/leads/pipeline",
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
    dashboardAccess.canViewProjects,
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
        id: "proposals-not-sent",
        tone: "warning",
        label: `${draftEstimates.length} proposal${draftEstimates.length === 1 ? "" : "s"} not sent`,
        detail: draftEstimates.length > 0
          ? `${formatMoney(estimateNotSentValue)} still sitting in draft`
          : "Every proposal in the queue has been sent",
        actionLabel: "Open Proposals",
        path: "/proposals",
      });
    }

    if (dashboardAccess.canViewSiteVisits) {
      items.push({
        id: "next-meeting",
        tone: "success",
        label: nextSiteVisit
          ? `Meeting at ${formatTimeLabel(nextSiteVisit.scheduledAt)} - ${nextSiteVisit.clientName}`
          : "Meeting calendar is open",
        detail: nextSiteVisit
          ? `${nextSiteVisit.inspectionType} with ${nextSiteVisit.clientName}`
          : "Schedule the next demo, call, or customer meeting",
        actionLabel: nextSiteVisit ? "Open Calendar" : "Schedule Meeting",
        path: "/calendar",
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
    { id: "estimate-sent" as const, title: "Proposal Sent", leads: leads.filter((lead) => lead.stage === "estimate-sent") },
    { id: "negotiation" as const, title: "Negotiation", leads: leads.filter((lead) => lead.stage === "negotiation") },
    { id: "won" as const, title: "Won", leads: leads.filter((lead) => lead.stage === "won") },
  ]), [leads]);

  const mobilePipelineColumns = useMemo(() => (
    kanbanColumns.map((column) => ({
      ...column,
      totalValue: column.leads.reduce((sum, lead) => sum + lead.value, 0),
    }))
  ), [kanbanColumns]);

  const totalPipelineCards = useMemo(() => (
    mobilePipelineColumns.reduce((sum, column) => sum + column.leads.length, 0)
  ), [mobilePipelineColumns]);

  const recentActivity = useMemo(() => notifications.slice(0, 4), [notifications]);

  const mobileActionCenterPath = dashboardAccess.canViewTasks
    ? "/tasks"
    : dashboardAccess.canViewLeads
      ? "/leads/pipeline"
      : dashboardAccess.canViewInvoices
        ? "/invoice"
        : dashboardAccess.canViewQuotes
          ? "/proposals"
          : "/notifications";

  const hasAnyDashboardModuleAccess =
    dashboardAccess.canViewLeads ||
    dashboardAccess.canViewInvoices ||
    dashboardAccess.canViewQuotes ||
    dashboardAccess.canViewProjects ||
    dashboardAccess.canViewClients ||
    dashboardAccess.canViewRoofEstimator ||
    dashboardAccess.canViewSiteVisits;

  const wonLeads = leads.filter((lead) => lead.stage === "won");
  const totalDeals = jobs.length || leads.filter((lead) => lead.stage !== "lead").length;
  const paidInvoiceRevenue = invoices
    .filter((invoice) => invoice.status === "paid")
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const closedWonRevenue = wonLeads.reduce((sum, lead) => sum + lead.value, 0) || paidInvoiceRevenue;
  const conversionRate = leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0;
  const forecastWeights: Record<RevenuePipelineStage, number> = {
    lead: 0.15,
    contacted: 0.35,
    "estimate-sent": 0.6,
    negotiation: 0.8,
    won: 1,
    lost: 0,
  };
  const salesForecast = openPipelineLeads.reduce((sum, lead) => sum + (lead.value * forecastWeights[lead.stage]), 0);
  const currentPeriodStart = new Date(currentTime.getTime() - 7 * 86400000);
  const previousPeriodStart = new Date(currentTime.getTime() - 14 * 86400000);
  const newLeadsCurrentPeriod = leads.filter((lead) => isDateInRange(lead.createdAt, currentPeriodStart, currentTime)).length;
  const newLeadsPreviousPeriod = leads.filter((lead) => isDateInRange(lead.createdAt, previousPeriodStart, currentPeriodStart)).length;
  const wonDealsCurrentPeriod = wonLeads.filter((lead) => isDateInRange(lead.updatedAt, currentPeriodStart, currentTime)).length;
  const wonDealsPreviousPeriod = wonLeads.filter((lead) => isDateInRange(lead.updatedAt, previousPeriodStart, currentPeriodStart)).length;
  const revenueCurrentPeriod = invoices
    .filter((invoice) => invoice.status === "paid" && isDateInRange(invoice.paidAt, currentPeriodStart, currentTime))
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const revenuePreviousPeriod = invoices
    .filter((invoice) => invoice.status === "paid" && isDateInRange(invoice.paidAt, previousPeriodStart, currentPeriodStart))
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const kpiTrends = {
    newLeads: formatTrend(newLeadsCurrentPeriod, newLeadsPreviousPeriod),
    wonDeals: formatTrend(wonDealsCurrentPeriod, wonDealsPreviousPeriod),
    revenue: formatTrend(revenueCurrentPeriod, revenuePreviousPeriod),
  };
  const todaysActivities = siteVisits.filter((visit) => {
    if (!visit.scheduledAt) return false;
    const today = new Date();
    return visit.scheduledAt.toDateString() === today.toDateString();
  });
  const pipelineHealthStages = [
    { id: "lead", title: "New Lead", color: "bg-[#0891B2]" },
    { id: "contacted", title: "Qualified", color: "bg-[#6637F4]" },
    { id: "estimate-sent", title: "Proposal", color: "bg-[#D97706]" },
    { id: "negotiation", title: "Negotiation", color: "bg-[#FF7B36]" },
    { id: "won", title: "Won", color: "bg-[#01C44A]" },
  ].map((stage) => {
    const matchingLeads = leads.filter((lead) => lead.stage === stage.id);
    return {
      ...stage,
      count: matchingLeads.length,
      value: matchingLeads.reduce((sum, lead) => sum + lead.value, 0),
    };
  });
  const maxPipelineStageCount = Math.max(...pipelineHealthStages.map((stage) => stage.count), 1);
  const leadSourceBreakdown = Object.values(leads.reduce<Record<string, { source: string; count: number; value: number }>>((acc, lead) => {
    const source = lead.source || "Direct";
    acc[source] = acc[source] || { source, count: 0, value: 0 };
    acc[source].count += 1;
    acc[source].value += lead.value;
    return acc;
  }, {})).sort((left, right) => right.count - left.count).slice(0, 5);
  const newLeadCount = leads.filter((lead) => lead.stage === "lead").length;
  const qualifiedLeadCount = leads.filter((lead) => ["contacted", "estimate-sent", "negotiation", "won"].includes(lead.stage)).length;
  const recentRevenueRecords = [
    ...leads.slice(0, 4).map((lead) => ({
      id: `lead-${lead.id}`,
      title: lead.name,
      meta: `${lead.company} · ${lead.source}`,
      value: formatMoney(lead.value),
      path: `/leads/${lead.id}`,
      type: "Lead",
    })),
    ...jobs.slice(0, 4).map((deal) => ({
      id: `deal-${deal.id}`,
      title: deal.name,
      meta: `${deal.client} · ${deal.statusLabel}`,
      value: formatMoney(deal.value),
      path: `/deals`,
      type: "Deal",
    })),
  ].slice(0, 6);
  const salesLeaderboard = Object.values(leads.reduce<Record<string, { rep: string; leads: number; revenue: number; won: number }>>((acc, lead) => {
    const rep = lead.assignee || "Unassigned";
    acc[rep] = acc[rep] || { rep, leads: 0, revenue: 0, won: 0 };
    acc[rep].leads += 1;
    acc[rep].revenue += lead.stage === "won" ? lead.value : lead.value * forecastWeights[lead.stage];
    acc[rep].won += lead.stage === "won" ? 1 : 0;
    return acc;
  }, {})).sort((left, right) => right.revenue - left.revenue).slice(0, 5);

  const kpiCards = [
    { label: "Total Leads", value: leads.length.toLocaleString(), detail: `${hotLeads.length} hot leads`, icon: Target, tone: "text-[#0891B2]", bg: "bg-[#0891B2]/10" },
    { label: "Total Deals", value: totalDeals.toLocaleString(), detail: `${openPipelineLeads.length} open opportunities`, icon: Briefcase, tone: "text-[#6637F4]", bg: "bg-[#6637F4]/10" },
    { label: "Revenue Closed Won", value: formatMoney(closedWonRevenue), detail: `${wonLeads.length} won lead${wonLeads.length === 1 ? "" : "s"}`, icon: DollarSign, tone: "text-[#01C44A]", bg: "bg-[#01C44A]/10" },
    { label: "Conversion Rate", value: `${conversionRate}%`, detail: "Lead to won conversion", icon: ArrowUpRight, tone: "text-[#D97706]", bg: "bg-[#D97706]/10" },
  ];

  const renderPanelHeader = (title: string, description: string, Icon: ElementType) => (
    <div className="flex items-start justify-between gap-3 border-b border-[rgba(15,23,42,0.06)] px-5 py-4">
      <div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0891B2]/10 text-[#0891B2]">
            <Icon size={16} />
          </div>
          <h2 className="text-sm font-semibold text-[#0F172A]">{title}</h2>
        </div>
        <p className="mt-1 text-xs text-[#64748B]">{description}</p>
      </div>
    </div>
  );

  const renderSalesDashboard = () => {
    const compactCard = "rounded-xl border border-[rgba(15,23,42,0.06)] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.04)]";
    const dateRange = `${currentTime.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(currentTime.getTime() + 6 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    const pipelineColumns = pipelineHealthStages.map((stage) => ({
      ...stage,
      leads: leads.filter((lead) => lead.stage === stage.id).slice(0, 3),
    }));
    const sourceColors = ["#22A06B", "#2F80ED", "#7C3AED", "#F97316", "#CBD5E1"];
    const sourceTotal = Math.max(leadSourceBreakdown.reduce((sum, source) => sum + source.count, 0), 1);
    const upcomingActivities = todaysActivities.length > 0
      ? todaysActivities.slice(0, 5).map((activity, index) => ({
          id: activity.id,
          title: activity.clientName,
          detail: activity.inspectionType,
          time: formatTimeLabel(activity.scheduledAt),
          tag: index % 2 === 0 ? "Call" : "Meeting",
        }))
      : recentRevenueRecords.slice(0, 5).map((record, index) => ({
          id: record.id,
          title: record.title,
          detail: record.meta,
          time: ["09:30 AM", "11:00 AM", "01:30 PM", "03:30 PM", "04:30 PM"][index] || "Today",
          tag: index % 3 === 0 ? "Call" : index % 3 === 1 ? "Meeting" : "Task",
        }));
    const taskRows = actionCenterItems.slice(0, 4).map((item, index) => ({
      id: item.id,
      label: item.label,
      date: index === 0 ? "Today" : index === 1 ? "Tomorrow" : `May ${14 + index}`,
      done: index < 2,
    }));
    const recentDeals = recentRevenueRecords.slice(0, 5);

    return (
      <div className={cn("page-enter text-[#172033]", isMobile ? "space-y-4 p-3" : "min-h-[calc(100vh-48px)] space-y-4 overflow-visible p-4 pb-16")}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#111827]">{getGreeting()}, {user ? user.firstName : "there"}</h1>
            <p className="mt-0.5 text-xs text-[#64748B]">Here's what's happening with {companyName} today.</p>
          </div>
          <button className="hidden items-center gap-2 rounded-lg border border-[rgba(15,23,42,0.08)] bg-white px-3 py-2 text-xs font-medium text-[#475569] shadow-sm lg:flex">
            <Calendar size={14} />
            {dateRange}
            <ChevronDown size={14} />
          </button>
        </div>

      {!hasAnyDashboardModuleAccess ? (
        <div className={`${sectionCardClassName} px-5 py-4`}>
          <h2 className="text-sm font-semibold text-[#0F172A]">Dashboard Access Limited</h2>
          <p className="mt-1 text-sm text-[#475569]">This account can open the dashboard, but sales widgets are hidden by permissions.</p>
        </div>
      ) : null}

        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "New Leads", value: newLeadCount.toLocaleString(), detail: "vs previous 7 days", icon: Target, tone: "text-[#22A06B]", bg: "bg-[#E7F7EF]", trend: kpiTrends.newLeads, path: "/leads" },
          { label: "Open Deals", value: openPipelineLeads.length.toLocaleString(), detail: "Current snapshot", icon: Briefcase, tone: "text-[#7C3AED]", bg: "bg-[#F1EAFF]", path: "/deals" },
          { label: "Revenue", value: formatMoney(closedWonRevenue || salesForecast), detail: "paid vs previous 7 days", icon: DollarSign, tone: "text-[#159A62]", bg: "bg-[#E7F7EF]", trend: kpiTrends.revenue, path: "/invoice" },
          { label: "Won Deals", value: wonLeads.length.toLocaleString(), detail: "vs previous 7 days", icon: FileText, tone: "text-[#F97316]", bg: "bg-[#FFF1E8]", trend: kpiTrends.wonDeals, path: "/deals" },
          { label: "Tasks Due", value: pendingTasksCount.toLocaleString(), detail: "Current snapshot", icon: Clock, tone: "text-[#2F80ED]", bg: "bg-[#EAF3FF]", path: "/tasks" },
        ].map((card, index) => (
          <motion.button
            key={card.label}
            type="button"
            onClick={() => navigate(card.path)}
            whileHover={{ y: -2 }}
              className={`${compactCard} min-h-[96px] p-4 text-left transition-shadow hover:shadow-md`}
          >
              <div className="flex items-start justify-between gap-3">
              <div>
                  <div className={cn("mb-2 flex h-8 w-8 items-center justify-center rounded-lg", card.bg, card.tone)}>
                    <card.icon size={15} />
                  </div>
                  <p className="text-[11px] font-medium text-[#64748B]">{card.label}</p>
                  <p className="mt-1 text-lg font-semibold leading-none text-[#0F172A]">{isLoading ? "..." : card.value}</p>
                  <p className={cn(
                    "mt-3 text-[11px] font-semibold",
                    card.trend?.tone === "positive" ? "text-[#16A34A]" : card.trend?.tone === "negative" ? "text-[#EF4444]" : "text-[#64748B]",
                  )}>{card.trend?.label || card.detail}</p>
                  <p className="mt-0.5 text-[10px] text-[#64748B]">{card.trend ? card.detail : "Live count from CRM data"}</p>
              </div>
                <svg className="mt-10 h-8 w-20" viewBox="0 0 100 36" fill="none" aria-hidden="true">
                  <path d={index % 2 === 0 ? "M2 31 C14 29 13 13 28 16 C43 19 40 4 55 9 C70 14 68 31 82 17 C89 9 94 11 98 14" : "M2 29 C13 25 15 23 28 24 C40 25 37 11 52 10 C67 9 66 24 78 17 C87 12 89 2 98 9"} stroke="currentColor" strokeWidth="2" className={card.tone} />
                </svg>
            </div>
          </motion.button>
        ))}
      </section>

        <section className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1.65fr_0.9fr]">
          <div className={`${compactCard} overflow-hidden`}>
            <div className="flex h-12 items-center justify-between border-b border-[rgba(15,23,42,0.06)] px-4">
              <div>
                <h2 className="text-sm font-semibold text-[#0F172A]">Sales Pipeline</h2>
                <p className="mt-0.5 text-[10px] text-[#64748B]">{openPipelineLeads.length} open deals · {formatMoney(totalPotentialRevenue)} pipeline value</p>
              </div>
              <button onClick={() => navigate("/leads/pipeline")} className="rounded-lg border border-[rgba(15,23,42,0.08)] px-3 py-1.5 text-[11px] font-semibold text-[#475569] hover:border-[#0891B2]/30 hover:text-[#0891B2]">Open Pipeline</button>
            </div>
            <div className="grid min-h-[190px] gap-px bg-[rgba(15,23,42,0.05)] md:grid-cols-5">
              {pipelineColumns.map((stage) => (
                <div key={stage.id} className="bg-white p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-2 w-2 rounded-full", stage.color)} />
                        <p className="truncate text-[11px] font-semibold text-[#0F172A]">{stage.title}</p>
                      </div>
                      <p className="mt-0.5 text-[10px] text-[#64748B]">{formatMoney(stage.value)}</p>
                    </div>
                    <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-semibold text-[#334155]">{stage.count}</span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {stage.leads.map((lead) => (
                      <button key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)} className="w-full rounded-lg border border-[rgba(15,23,42,0.07)] bg-[#FCFCFD] px-2.5 py-2 text-left transition hover:border-[#0891B2]/30 hover:bg-[#ECFEFF]">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-semibold text-[#334155]">{lead.name}</p>
                            <p className="truncate text-[10px] text-[#64748B]">{lead.company || lead.source}</p>
                          </div>
                          <p className="shrink-0 text-[11px] font-semibold text-[#0F172A]">{formatMoney(lead.value)}</p>
                        </div>
                      </button>
                    ))}
                    {stage.leads.length === 0 ? <button onClick={() => navigate("/leads")} className="w-full rounded-lg border border-dashed border-[rgba(15,23,42,0.08)] bg-[#F8FAFC] px-2 py-3 text-center text-[10px] font-medium text-[#94A3B8] hover:border-[#0891B2]/30 hover:text-[#0891B2]">Add deal</button> : null}
                  </div>
                  {stage.count > stage.leads.length ? <button onClick={() => navigate("/leads/pipeline")} className="mt-2 text-[10px] font-semibold text-[#0891B2]">+ {stage.count - stage.leads.length} more</button> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className={`${compactCard} overflow-hidden`}>
              <div className="flex h-11 items-center justify-between border-b border-[rgba(15,23,42,0.06)] px-4">
                <h2 className="text-sm font-semibold text-[#0F172A]">Upcoming Activities</h2>
                <button onClick={() => navigate("/calendar")} className="text-[11px] font-semibold text-[#159A62]">View Calendar</button>
              </div>
              <div className="divide-y divide-[rgba(15,23,42,0.05)]">
                {upcomingActivities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#2F80ED]"><Calendar size={13} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium text-[#334155]">{activity.title}</p>
                      <p className="truncate text-[10px] text-[#64748B]">{activity.detail}</p>
                    </div>
                    <span className="text-[10px] text-[#475569]">{activity.time}</span>
                    <span className="rounded-full bg-[#EAF7EF] px-2 py-0.5 text-[10px] font-semibold text-[#159A62]">{activity.tag}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${compactCard} overflow-hidden`}>
              <div className="flex h-10 items-center justify-between px-4">
                <div>
                  <h2 className="text-sm font-semibold text-[#0F172A]">Tasks</h2>
                  <p className="text-[10px] text-[#64748B]">{Math.max(0, pendingTasksCount - taskRows.length)} pending</p>
                </div>
                <button onClick={() => navigate("/tasks")} className="text-[11px] font-semibold text-[#159A62]">View All</button>
              </div>
              <div className="h-1 bg-[#E2E8F0]"><div className="h-1 bg-[#22A06B]" style={{ width: `${pendingTasksCount > 0 ? 52 : 100}%` }} /></div>
              <div className="space-y-1 px-4 py-2">
                {taskRows.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 text-[11px]">
                    <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded border", task.done ? "border-[#22A06B] bg-[#22A06B]" : "border-[#CBD5E1] bg-white")} />
                    <span className="min-w-0 flex-1 truncate text-[#475569]">{task.label}</span>
                    <span className="text-[10px] text-[#64748B]">{task.date}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${compactCard} overflow-hidden`}>
              <div className="flex h-10 items-center justify-between px-4">
                <h2 className="text-sm font-semibold text-[#0F172A]">AI Insights</h2>
                <button onClick={() => navigate("/ai/sales-assistant")} className="text-[11px] font-semibold text-[#159A62]">Ask AI</button>
              </div>
              <div className="space-y-2 px-4 pb-3">
                {[
                  `${hotLeads.length} hot leads need attention`,
                  `${leads.filter((lead) => lead.isStalled).length} stuck deals need follow-up`,
                  `${pendingTasksCount} open follow-ups remain`,
                  `${openPipelineLeads.slice(0, 3).length} deals should have next action checked`,
                ].map((insight) => (
                  <button key={insight} onClick={() => navigate("/ai/sales-assistant")} className="flex w-full items-center gap-2 rounded-lg bg-[#F8FAFC] px-3 py-2 text-left text-[11px] text-[#475569] hover:bg-[#ECFEFF]">
                    <Sparkles size={13} className="text-[#0891B2]" />
                    {insight}
                  </button>
                ))}
              </div>
            </div>

            <div className={`${compactCard} overflow-hidden`}>
              <div className="flex h-10 items-center justify-between px-4">
                <h2 className="text-sm font-semibold text-[#0F172A]">Recent Deals</h2>
                <button onClick={() => navigate("/deals")} className="text-[11px] font-semibold text-[#159A62]">View All</button>
              </div>
              <div className="px-4 pb-2">
                {recentDeals.map((deal) => (
                  <button key={deal.id} onClick={() => navigate(deal.path)} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 py-1 text-left">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-[#334155]">{deal.title}</p>
                      <p className="truncate text-[10px] text-[#64748B]">{deal.type}</p>
                    </div>
                    <span className="text-[11px] font-semibold text-[#0F172A]">{deal.value}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr] xl:grid-cols-[0.72fr_0.72fr_1fr]">
          <div className={`${compactCard} p-4`}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#0F172A]">Revenue Overview</h2>
              <button className="rounded-lg border border-[rgba(15,23,42,0.08)] px-3 py-1.5 text-[11px] text-[#475569]">This Year</button>
            </div>
            <svg className="h-[138px] w-full" viewBox="0 0 420 150" fill="none" aria-hidden="true">
              {[30, 60, 90, 120].map((y) => <line key={y} x1="0" y1={y} x2="420" y2={y} stroke="#E2E8F0" strokeDasharray="4 4" />)}
              <path d="M4 126 C40 100 48 54 88 70 C126 86 127 31 174 42 C222 53 210 126 255 103 C292 84 281 27 325 34 C365 41 363 86 416 44" stroke="#159A62" strokeWidth="3" />
              <path d="M300 93 C319 43 344 19 369 34 C388 45 392 62 416 42" stroke="#159A62" strokeWidth="2" strokeDasharray="6 6" />
            </svg>
          </div>

          <div className={`${compactCard} p-4`}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#0F172A]">Deal Sources</h2>
              <button className="rounded-lg border border-[rgba(15,23,42,0.08)] px-3 py-1.5 text-[11px] text-[#475569]">This Month</button>
            </div>
            <div className="flex items-center gap-4">
              <div className="grid h-[132px] w-[132px] place-items-center rounded-full" style={{ background: `conic-gradient(${leadSourceBreakdown.map((source, index) => `${sourceColors[index]} 0 ${(source.count / sourceTotal) * 100}%`).join(", ") || "#22A06B 0 100%"})` }}>
                <div className="grid h-[78px] w-[78px] place-items-center rounded-full bg-white text-center">
                  <span className="text-lg font-semibold text-[#0F172A]">{leads.length}</span>
                  <span className="-mt-6 text-[10px] text-[#64748B]">Total Leads</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {(leadSourceBreakdown.length ? leadSourceBreakdown : [{ source: "Website", count: leads.length || 1, value: 0 }]).slice(0, 5).map((source, index) => (
                  <div key={source.source} className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="flex min-w-0 items-center gap-2 truncate text-[#475569]"><span className="h-2 w-2 rounded-full" style={{ background: sourceColors[index] }} />{source.source}</span>
                    <span className="font-medium text-[#334155]">{Math.round((source.count / sourceTotal) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`${compactCard} flex items-center gap-4 p-4`}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0EEFF] text-[#6637F4]"><Sparkles size={22} /></div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-[#0F172A]">Let AI work for you</h2>
              <p className="mt-1 text-[11px] text-[#64748B]">Your AI Sales Assistant is ready to help close more deals.</p>
            </div>
            <button onClick={() => navigate("/ai/sales-assistant")} className="rounded-lg bg-[#159A62] px-4 py-2 text-[11px] font-semibold text-white shadow-sm">Open AI Assistant</button>
          </div>
        </section>
      </div>
    );
  };
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
                  onClick={() => navigate("/profile")}
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
                <div className="crm-toolbar-search flex-1 max-w-[160px] sm:max-w-xs md:max-w-none md:flex-none md:w-72">
                  <Search className="crm-toolbar-search-icon" />
                  <input
                    type="text"
                    placeholder="Search leads, deals, contacts..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onClick={() => setShowSearchModal(true)}
                    className="crm-toolbar-search-input h-10 pr-4 text-sm md:pr-14"
                  />
                  <kbd className="crm-toolbar-kbd absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex">
                    <Command size={10} />
                    K
                  </kbd>
                </div>
              </div>

              <div className="crm-toolbar-actions flex-shrink-0 gap-1.5 sm:gap-2 md:gap-3">
                <div className="hidden lg:flex items-center gap-2">
                  {quickActions.slice(0, 3).map((action) => (
                    <Button
                      key={action.id}
                      size="sm"
                      onClick={() => navigate(action.path)}
                      className={cn(
                        "crm-toolbar-button",
                        action.variant === "default" ? "crm-toolbar-button-primary" : "crm-toolbar-button-secondary"
                      )}
                    >
                      <action.icon />
                      <span>{action.label}</span>
                    </Button>
                  ))}
                </div>

                <button
                  onClick={toggleDarkMode}
                  className="crm-toolbar-button crm-toolbar-button-secondary crm-toolbar-icon-button text-[#475569]"
                >
                  {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
                </button>

                <div ref={notificationRef} className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="crm-toolbar-button crm-toolbar-button-secondary crm-toolbar-icon-button relative overflow-visible text-[#475569]"
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
                            onClick={() => navigate("/profile")}
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

        {renderSalesDashboard()}

        <div className={cn("hidden space-y-4 md:space-y-6 page-enter", isMobile ? "p-3" : "p-4 md:p-6")}>
          <div className={cn(
            "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between",
            isMobile && `${sectionCardClassName} p-4`,
          )}>
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

          {!hasAnyDashboardModuleAccess ? (
            <div className={`${sectionCardClassName} px-5 py-4`}>
              <h2 className="text-sm font-semibold text-[#0F172A]">Dashboard Access Limited</h2>
              <p className="mt-1 text-sm text-[#475569]">
                This account can access the dashboard shell, but revenue widgets are hidden by permissions.
              </p>
            </div>
          ) : null}

          {hasAnyDashboardModuleAccess ? (
            isMobile ? (
              <>
                {quickActions.length > 0 ? (
                  <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 }}
                    className={sectionCardClassName}
                  >
                    <div className="p-4 border-b border-[rgba(15,23,42,0.06)]">
                      <h2 className="text-sm font-semibold text-[#0F172A]">Quick Actions</h2>
                      <p className="mt-1 text-[11px] text-[#94A3B8]">Jump straight into the work that moves revenue today.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-4">
                      {quickActions.map((action) => (
                        <button
                          key={action.id}
                          onClick={() => navigate(action.path)}
                          className={cn(
                            "rounded-md border p-4 text-left transition-colors",
                            action.variant === "default"
                              ? "border-[#0891B2]/15 bg-[#0891B2]/5"
                              : "border-[rgba(15,23,42,0.06)] bg-white",
                          )}
                        >
                          <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-md",
                            action.variant === "default" ? "bg-[#0891B2]/10 text-[#0891B2]" : "bg-[#F1F5F9] text-[#475569]",
                          )}>
                            <action.icon size={18} />
                          </div>
                          <p className="mt-4 text-sm font-semibold text-[#0F172A]">{action.label}</p>
                          <p className="mt-1 line-clamp-2 text-[11px] text-[#475569]">{action.description}</p>
                        </button>
                      ))}
                    </div>
                  </motion.section>
                ) : isLoading ? (
                  <DashboardMobileQuickActionsSkeleton />
                ) : null}

                {isLoading ? (
                  <DashboardMobileListSkeleton rows={4} />
                ) : (
                  <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 }}
                    className={sectionCardClassName}
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-[rgba(15,23,42,0.06)] p-4">
                      <div>
                        <h2 className="text-sm font-semibold text-[#0F172A]">Tasks & Follow-up</h2>
                        <p className="mt-1 text-[11px] text-[#94A3B8]">
                          {dashboardAccess.canViewTasks
                            ? `${pendingTasksCount} open task${pendingTasksCount === 1 ? "" : "s"} plus follow-up work across the CRM`
                            : "Priority work from leads, proposals, meetings, and collections"}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(mobileActionCenterPath)}
                        className="text-xs font-medium text-[#0891B2] hover:underline"
                      >
                        Open
                      </button>
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
                            className="w-full px-4 py-4 text-left transition-colors hover:bg-[#F7F7FB]"
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn("mt-0.5 flex h-9 w-9 items-center justify-center rounded-md", toneClasses.bg)}>
                                {item.tone === "danger" ? (
                                  <AlertTriangle size={15} className={toneClasses.text} />
                                ) : item.tone === "warning" ? (
                                  <FileText size={15} className={toneClasses.text} />
                                ) : (
                                  <Calendar size={15} className={toneClasses.text} />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-[#0F172A]">{item.label}</p>
                                <p className="mt-1 text-[11px] text-[#475569]">{item.detail}</p>
                                <p className="mt-2 text-[11px] font-medium text-[#0891B2]">{item.actionLabel}</p>
                              </div>
                            </div>
                          </button>
                        );
                      }) : (
                        <div className="px-4 py-6 text-sm text-[#475569]">
                          No priority work is queued for this account right now.
                        </div>
                      )}
                    </div>
                  </motion.section>
                )}

                <motion.section
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 }}
                  className="space-y-3"
                >
                  <div>
                    <h2 className="text-sm font-semibold text-[#0F172A]">Revenue Snapshot</h2>
                    <p className="mt-1 text-[11px] text-[#94A3B8]">Pipeline, proposals, and collections in one swipeable row.</p>
                  </div>
                  <div className="-mx-1 overflow-x-auto pb-1">
                    <div className="flex items-stretch gap-3 px-1">
                      <div className="flex min-w-[250px] flex-none">
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
                      </div>
                      <div className="flex min-w-[250px] flex-none">
                        <StatCard
                          title="Hot Leads Value"
                          value={formatMoney(hotLeadsValue)}
                          subtitle={`${hotLeads.length} hot sales opportunities`}
                          trend={hotLeadsTrend}
                          comparison="of open leads"
                          icon={Target}
                          color="yellow"
                          isLoading={isLoading}
                          lastUpdated="Updated just now"
                          aiInsight={hotLeads.length > 0 ? "Call these first for fastest revenue" : undefined}
                        />
                      </div>
                      <div className="flex min-w-[250px] flex-none">
                        <StatCard
                          title="Proposals Sent Value"
                          value={formatMoney(estimatesSentValue)}
                          subtitle={`${sentEstimates.length} proposal${sentEstimates.length === 1 ? "" : "s"} out with clients`}
                          trend={estimatesSentTrend}
                          comparison="sent rate"
                          icon={FileText}
                          color="cyan"
                          isLoading={isLoading}
                          lastUpdated="Updated just now"
                          aiInsight={sentEstimates.length > 0 ? "Follow up before validity dates expire" : undefined}
                        />
                      </div>
                      <div className="flex min-w-[250px] flex-none">
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
                    </div>
                  </div>
                </motion.section>

                {isNotificationsLoading ? (
                  <DashboardMobileListSkeleton rows={3} />
                ) : (
                  <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={sectionCardClassName}
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-[rgba(15,23,42,0.06)] p-4">
                      <div>
                        <h2 className="text-sm font-semibold text-[#0F172A]">Recent Activity</h2>
                        <p className="mt-1 text-[11px] text-[#94A3B8]">The latest alerts and updates from your workspace.</p>
                      </div>
                      <button
                        onClick={() => navigate("/notifications")}
                        className="text-xs font-medium text-[#0891B2] hover:underline"
                      >
                        View all
                      </button>
                    </div>
                    <div className="divide-y divide-[rgba(15,23,42,0.04)]">
                      {recentActivity.length > 0 ? recentActivity.map((notification) => {
                        const colors = getColorClasses(notification.color);
                        return (
                          <button
                            key={notification.id}
                            onClick={() => navigate("/notifications")}
                            className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-[#F7F7FB]"
                          >
                            <div className={cn("flex h-9 w-9 items-center justify-center rounded-md", colors.light)}>
                              <notification.icon size={15} className={colors.text} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-[#0F172A] line-clamp-1">{notification.title}</p>
                                {!notification.read ? <span className="h-1.5 w-1.5 rounded-full bg-[#0891B2]" /> : null}
                              </div>
                              <p className="mt-1 line-clamp-2 text-[11px] text-[#475569]">{notification.message}</p>
                              <p className="mt-2 text-[11px] text-[#94A3B8]">{notification.time}</p>
                            </div>
                          </button>
                        );
                      }) : (
                        <div className="px-4 py-6 text-sm text-[#475569]">
                          No recent activity has come in yet.
                        </div>
                      )}
                    </div>
                  </motion.section>
                )}

                {dashboardAccess.canViewInvoices ? (
                  isLoading ? (
                    <DashboardMobileListSkeleton rows={3} />
                  ) : (
                    <motion.section
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.12 }}
                      className={sectionCardClassName}
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-[rgba(15,23,42,0.06)] p-4">
                        <div>
                          <h2 className="text-sm font-semibold text-[#0F172A]">Invoices</h2>
                          <p className="mt-1 text-[11px] text-[#94A3B8]">Invoices waiting for payment or collection follow-up.</p>
                        </div>
                        <button
                          onClick={() => navigate("/invoice")}
                          className="text-xs font-medium text-[#0891B2] hover:underline"
                        >
                          Open
                        </button>
                      </div>
                      <div className="divide-y divide-[rgba(15,23,42,0.04)]">
                        {pendingPayments.length > 0 ? pendingPayments.slice(0, 4).map((invoice) => (
                          <button
                            key={invoice.id}
                            onClick={() => navigate("/invoice")}
                            className="w-full px-4 py-4 text-left transition-colors hover:bg-[#F7F7FB]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#0F172A] line-clamp-1">{invoice.client}</p>
                                <p className="mt-1 text-[11px] text-[#94A3B8]">{invoice.invoiceNo} · Due {invoice.dueDate}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-[#0F172A]">{formatMoney(invoice.outstandingAmount)}</p>
                                <p className={cn(
                                  "mt-1 text-[11px] font-medium",
                                  invoice.status === "overdue" ? "text-[#FF2E2D]" : "text-[#D97706]",
                                )}>
                                  {invoice.status === "overdue" ? "Overdue" : "Pending"}
                                </p>
                              </div>
                            </div>
                          </button>
                        )) : (
                          <div className="px-4 py-6 text-sm text-[#475569]">
                            No invoices are waiting on action right now.
                          </div>
                        )}
                      </div>
                    </motion.section>
                  )
                ) : null}

                {dashboardAccess.canViewLeads ? (
                  isLoading ? (
                    <DashboardMobileListSkeleton rows={5} />
                  ) : (
                    <motion.section
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.14 }}
                      className={sectionCardClassName}
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-[rgba(15,23,42,0.06)] p-4">
                        <div>
                          <h2 className="text-sm font-semibold text-[#0F172A]">Pipeline Snapshot</h2>
                          <p className="mt-1 text-[11px] text-[#94A3B8]">
                            {totalPipelineCards} lead{totalPipelineCards === 1 ? "" : "s"} across the revenue funnel
                          </p>
                        </div>
                        <button
                          onClick={() => navigate("/leads/pipeline")}
                          className="text-xs font-medium text-[#0891B2] hover:underline"
                        >
                          View
                        </button>
                      </div>
                      <div className="space-y-4 p-4">
                        {mobilePipelineColumns.map((column) => {
                          const width = totalPipelineCards > 0
                            ? Math.max(8, Math.round((column.leads.length / totalPipelineCards) * 100))
                            : 0;

                          return (
                            <div key={column.id}>
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-[#0F172A]">{column.title}</p>
                                  <p className="text-[11px] text-[#94A3B8]">{column.leads.length} lead{column.leads.length === 1 ? "" : "s"}</p>
                                </div>
                                <p className="text-sm font-semibold text-[#0F172A]">{formatMoney(column.totalValue)}</p>
                              </div>
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
                                <div
                                  className="h-full rounded-full bg-[#0891B2]"
                                  style={{ width: `${width}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.section>
                  )
                ) : null}

                {dashboardAccess.canViewProjects ? (
                  isLoading ? (
                    <DashboardMobileListSkeleton rows={3} />
                  ) : (
                    <motion.section
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.16 }}
                      className={sectionCardClassName}
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-[rgba(15,23,42,0.06)] p-4">
                        <div>
                          <h2 className="text-sm font-semibold text-[#0F172A]">Active Deals</h2>
                          <p className="mt-1 text-[11px] text-[#94A3B8]">Open customer opportunities already moving through the pipeline.</p>
                        </div>
                        <button
                          onClick={() => navigate("/deals")}
                          className="text-xs font-medium text-[#0891B2] hover:underline"
                        >
                          View
                        </button>
                      </div>
                      <div className="divide-y divide-[rgba(15,23,42,0.04)]">
                        {activeJobs.length > 0 ? activeJobs.map((job) => (
                          <button
                            key={job.id}
                            onClick={() => navigate("/deals")}
                            className="w-full px-4 py-4 text-left transition-colors hover:bg-[#F7F7FB]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#0F172A] line-clamp-1">{job.name}</p>
                                <p className="mt-1 text-[11px] text-[#94A3B8] line-clamp-1">{job.client} · {job.deadline}</p>
                              </div>
                              <span className={cn("rounded px-2 py-0.5 text-[10px] font-semibold", getJobStatusBadgeClasses(job.status))}>
                                {job.statusLabel}
                              </span>
                            </div>
                          </button>
                        )) : (
                          <div className="px-4 py-6 text-sm text-[#475569]">
                            No active jobs are on the board yet.
                          </div>
                        )}
                      </div>
                    </motion.section>
                  )
                ) : null}

                {dashboardAccess.canViewClients ? (
                  isLoading ? (
                    <DashboardMobileListSkeleton rows={3} />
                  ) : (
                    <motion.section
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.18 }}
                      className={sectionCardClassName}
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-[rgba(15,23,42,0.06)] p-4">
                        <div>
                          <h2 className="text-sm font-semibold text-[#0F172A]">Recent Clients</h2>
                          <p className="mt-1 text-[11px] text-[#94A3B8]">Recent homeowners and commercial accounts.</p>
                        </div>
                        <button
                          onClick={() => navigate("/client-list")}
                          className="text-xs font-medium text-[#0891B2] hover:underline"
                        >
                          View
                        </button>
                      </div>
                      <div className="divide-y divide-[rgba(15,23,42,0.04)]">
                        {recentClients.length > 0 ? recentClients.map((client) => (
                          <div key={client.id} className="px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#0F172A]">{client.name}</p>
                                <p className="mt-1 text-[11px] text-[#94A3B8]">
                                  {client.lastContacted ? `Last contacted ${formatDateLabel(client.lastContacted)}` : "Newly added client"}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleClientCall(client)}
                              >
                                <PhoneCall />
                                <span>Call</span>
                              </Button>
                            </div>
                          </div>
                        )) : (
                          <div className="px-4 py-6 text-sm text-[#475569]">
                            No recent clients are available yet.
                          </div>
                        )}
                      </div>
                    </motion.section>
                  )
                ) : null}

                {(dashboardAccess.canViewQuotes || dashboardAccess.canViewSiteVisits) ? (
                  <div className="grid grid-cols-1 gap-4">
                    {dashboardAccess.canViewQuotes ? (
                      isLoading ? (
                        <DashboardMobileListSkeleton rows={3} />
                      ) : (
                        <motion.section
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className={sectionCardClassName}
                        >
                          <div className="border-b border-[rgba(15,23,42,0.06)] p-4">
                            <h2 className="text-sm font-semibold text-[#0F172A]">Proposal Queue</h2>
                            <p className="mt-1 text-[11px] text-[#94A3B8]">Drafts and sent proposals ready for follow-up.</p>
                          </div>
                          <div className="divide-y divide-[rgba(15,23,42,0.04)]">
                            {[...draftEstimates, ...sentEstimates].slice(0, 4).map((estimate) => (
                              <button
                                key={estimate.id}
                                onClick={() => navigate("/proposals")}
                                className="w-full px-4 py-4 text-left transition-colors hover:bg-[#F7F7FB]"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[#0F172A] line-clamp-1">{estimate.recipientName}</p>
                                    <p className="mt-1 text-[11px] text-[#94A3B8]">
                                      {estimate.quoteNumber} · {isEstimateDraft(estimate) ? "Draft" : "Sent"}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-[#0F172A]">{formatMoney(estimate.total)}</p>
                                    <p className="mt-1 text-[11px] text-[#94A3B8]">Valid {formatDateLabel(estimate.validUntil)}</p>
                                  </div>
                                </div>
                              </button>
                            ))}
                            {draftEstimates.length + sentEstimates.length === 0 ? (
                              <div className="px-4 py-6 text-sm text-[#475569]">No proposals are in the queue yet.</div>
                            ) : null}
                          </div>
                        </motion.section>
                      )
                    ) : null}

                    {dashboardAccess.canViewSiteVisits ? (
                      isLoading ? (
                        <DashboardMobileListSkeleton rows={3} />
                      ) : (
                        <motion.section
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.22 }}
                          className={sectionCardClassName}
                        >
                          <div className="border-b border-[rgba(15,23,42,0.06)] p-4">
                            <h2 className="text-sm font-semibold text-[#0F172A]">Meetings</h2>
                            <p className="mt-1 text-[11px] text-[#94A3B8]">Upcoming demos, calls, and customer meetings.</p>
                          </div>
                          <div className="divide-y divide-[rgba(15,23,42,0.04)]">
                            {siteVisits
                              .filter((visit) => visit.scheduledAt)
                              .sort((left, right) => (left.scheduledAt?.getTime() || 0) - (right.scheduledAt?.getTime() || 0))
                              .slice(0, 4)
                              .map((visit) => (
                                <button
                                  key={visit.id}
                                  onClick={() => navigate("/calendar")}
                                  className="w-full px-4 py-4 text-left transition-colors hover:bg-[#F7F7FB]"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-[#0F172A]">{visit.clientName}</p>
                                      <p className="mt-1 line-clamp-1 text-[11px] text-[#94A3B8]">{visit.address}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-semibold text-[#0F172A]">{formatTimeLabel(visit.scheduledAt)}</p>
                                      <p className="mt-1 text-[11px] text-[#94A3B8]">{formatDateTimeLabel(visit.scheduledAt)}</p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            {siteVisits.filter((visit) => visit.scheduledAt).length === 0 ? (
                              <div className="px-4 py-6 text-sm text-[#475569]">No meetings are scheduled yet.</div>
                            ) : null}
                          </div>
                        </motion.section>
                      )
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <>
              <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-[1.4fr,0.9fr]">
                {isLoading ? (
                  <>
                    <DashboardActionCenterSkeleton />
                    <DashboardAlertSkeleton />
                  </>
                ) : (
                  <>
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
                              <span className="text-[#475569]">Proposal not sent</span>
                              <span className="font-semibold text-[#0F172A]">{formatMoney(estimateNotSentValue)}</span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() => navigate(draftEstimates.length > 0 ? "/proposals" : "/leads/pipeline")}
                          >
                            Recover Revenue
                          </Button>
                        </div>
                      </div>
                    </motion.section>
                  </>
                )}
              </div>

              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-[#0F172A]">Revenue Snapshot</h2>
                    <p className="text-[11px] text-[#94A3B8]">Pipeline, proposals, and collections in one view</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-4">
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
                    subtitle={`${hotLeads.length} hot sales opportunities`}
                    trend={hotLeadsTrend}
                    comparison="of open leads"
                    icon={Target}
                    color="yellow"
                    isLoading={isLoading}
                    lastUpdated="Updated just now"
                    aiInsight={hotLeads.length > 0 ? "Call these first for fastest revenue" : undefined}
                  />
                  <StatCard
                    title="Proposals Sent Value"
                    value={formatMoney(estimatesSentValue)}
                    subtitle={`${sentEstimates.length} proposal${sentEstimates.length === 1 ? "" : "s"} out with clients`}
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
                isLoading ? (
                  <DashboardKanbanSkeleton />
                ) : (
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
                )
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-[1.2fr,0.8fr]">
                {dashboardAccess.canViewProjects ? (
                  isLoading ? (
                    <DashboardJobsSkeleton />
                  ) : (
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
                              <h2 className="text-sm font-semibold text-[#0F172A]">Active Deals</h2>
                              <p className="text-[11px] text-[#94A3B8]">Customer opportunities already sold or in active follow-up</p>
                            </div>
                          </div>
                          <button
                            onClick={() => navigate("/deals")}
                            className="text-xs text-[#0891B2] font-medium hover:underline flex items-center gap-1"
                          >
                            View Deals
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
                                <span className="text-[#94A3B8]">Owner</span>
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
                                onClick={() => navigate("/deals")}
                              >
                                View Deal
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
                  )
                ) : null}

                {dashboardAccess.canViewClients ? (
                  isLoading ? (
                    <DashboardClientsSkeleton />
                  ) : (
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
                                  onClick={() => navigate("/proposals")}
                                >
                                  <Sparkles />
                                  <span>Send proposal?</span>
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
                                onClick={() => navigate("/proposals")}
                              >
                                <FileText />
                                <span>Send Proposal</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate("/deals")}
                              >
                                <Briefcase />
                                <span>View Deals</span>
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
                  )
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
                    isLoading ? (
                      <DashboardQueueSkeleton />
                    ) : (
                    <div className={sectionCardClassName}>
                      <div className="p-5 border-b border-[rgba(15,23,42,0.06)]">
                        <h2 className="text-sm font-semibold text-[#0F172A]">Proposal Queue</h2>
                        <p className="text-[11px] text-[#94A3B8]">Drafts and sent proposals ready for follow-up</p>
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
                          <div className="px-5 py-8 text-sm text-[#475569]">No proposals are in the queue yet.</div>
                        ) : null}
                      </div>
                    </div>
                    )
                  ) : null}

                  {dashboardAccess.canViewSiteVisits ? (
                    isLoading ? (
                      <DashboardQueueSkeleton />
                    ) : (
                    <div className={sectionCardClassName}>
                      <div className="p-5 border-b border-[rgba(15,23,42,0.06)]">
                        <h2 className="text-sm font-semibold text-[#0F172A]">Meetings</h2>
                        <p className="text-[11px] text-[#94A3B8]">Upcoming demos, calls, and customer meetings</p>
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
                          <div className="px-5 py-8 text-sm text-[#475569]">No meetings are scheduled yet.</div>
                        ) : null}
                      </div>
                    </div>
                    )
                  ) : null}

                  {dashboardAccess.canViewInvoices ? (
                    isLoading ? (
                      <DashboardQueueSkeleton />
                    ) : (
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
                    )
                  ) : null}
                </motion.section>
              ) : null}
              </>
            )
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
                  placeholder="Search actions across leads, deals, and contacts..."
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
