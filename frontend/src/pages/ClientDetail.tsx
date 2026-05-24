import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { getClientById, updateClient } from "@/services/clientService";
import { getTasks, createTask, updateTask } from "@/features/tasks/services/tasks-service";
import { getProjects } from "@/features/projects/services/projects-service";
import { getFiles, getDownloadUrl } from "@/features/files/services/files-service";
import { getEmails } from "@/features/emails/services/emails-service";
import { getInvoices } from "@/features/invoices/services/invoice-service";
import { getPayments, getSubscriptions } from "@/features/billing/services/billing-service";
import { getLeads } from "@/features/leads";
import { ComposeEmailSheet } from "@/features/emails/components/ComposeEmailSheet";
import { WhatsAppActionButton } from "@/features/whatsapp/components/WhatsAppActionButton";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Mail, Phone, MapPin, Tag, User, Plus, MoreHorizontal,
  Pencil, MessageSquare, FileText, CheckSquare, TrendingUp, FolderOpen,
  Send, ArrowLeft, Loader2, DollarSign, Clock, Download, X,
  Globe, BanIcon,
  Building2, CircleDollarSign,
  PhoneCall, StickyNote, ExternalLink, ClipboardList
} from "lucide-react";

// ── Interfaces ──────────────────────────────────────────────────────
interface ClientData {
  id: string; clientName: string; companyName?: string; clientType: string;
  clientLogo?: string; primaryEmail: string; primaryPhone: string;
  secondaryPhone?: string; status: string;
  lifecycleStage?: string; assignedOwner?: any;
  streetAddress?: string; suite?: string; city?: string; province?: string;
  postalCode?: string; country?: string;
  website?: string; industry?: string; territory?: string; organizationAddress?: string;
  noOfEmployees?: string; annualRevenue?: number; exchangeRate?: number;
  leadSource?: string; clientCategory?: string; budgetRange?: string;
  urgencyLevel?: string;
  creditLimit?: number; paymentTerms?: string; currency?: string; totalRevenue?: number;
  preferredContactMethod?: string; bestTimeToContact?: string; language?: string;
  doNotContact?: boolean; nextFollowUp?: string;
  internalNotes?: string; tags?: any;
  contactName?: string; position?: string; directPhone?: string;
  _count?: { contacts?: number; projects?: number; invoices?: number; quotes?: number; files?: number };
  createdAt?: string; updatedAt?: string;
}

interface ClientTask {
  id: string; title: string; dueDate: string; completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
}

interface RelatedLeadSummary {
  id: string;
  convertedAt: string | null;
  leadSource: string | null;
  name: string;
}

// ── Helpers ─────────────────────────────────────────────────────────
const toClientTypeLabel = (t?: string) => {
  if (!t) return "Business";
  const u = t.toUpperCase();
  return u === "BUSINESS" ? "Business" : u === "INDIVIDUAL" ? "Individual" : t;
};

const mapPriority = (p: string): 'High' | 'Medium' | 'Low' => {
  const u = (p || '').toUpperCase();
  if (u === 'HIGH' || u === 'URGENT') return 'High';
  if (u === 'LOW') return 'Low';
  return 'Medium';
};

const toStatusLabel = (s?: string) => {
  if (!s) return "Active";
  const u = s.toUpperCase();
  return u === "ACTIVE" ? "Active" : u === "INACTIVE" ? "Inactive" : s;
};

const normalizeTags = (tags: unknown): string[] => {
  if (Array.isArray(tags)) return tags.map(String);
  if (typeof tags === "string") return tags.split(",").map(t => t.trim()).filter(Boolean);
  return [];
};

const formatAssignedOwner = (o: unknown): string => {
  if (!o) return "";
  if (typeof o === "string") return o;
  const x = o as any;
  return `${x.firstName || x.user?.firstName || ""} ${x.lastName || x.user?.lastName || ""}`.trim();
};

const buildAddress = (d: ClientData) =>
  [d.streetAddress, d.suite, d.city, d.province, d.postalCode, d.country].filter(Boolean).join(", ");

const getInitials = (name: string) =>
  name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : "CL";

const fmtCurrency = (n?: number, currency = 'CAD') =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n || 0);

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString() : "—";

const fmtPhone = (p?: string) => {
  if (!p) return "";
  const digits = p.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return p;
};

const dedupeById = <T extends { id: string }>(items: T[]) => {
  const seen = new Map<string, T>();
  for (const item of items) {
    seen.set(item.id, item);
  }
  return Array.from(seen.values());
};

const sortByNewest = <T extends Record<string, any>>(items: T[], ...fields: string[]) =>
  [...items].sort((a, b) => {
    const aTime = fields.map((field) => a?.[field]).find(Boolean);
    const bTime = fields.map((field) => b?.[field]).find(Boolean);
    return new Date(bTime || 0).getTime() - new Date(aTime || 0).getTime();
  });

// ── Animated Counter ────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 600;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{prefix}{display.toLocaleString()}{suffix}</>;
}

// ── Card Wrapper ────────────────────────────────────────────────────
function DashCard({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <div
      className={`bg-white rounded-xl border border-[#E5E7EB] p-5 transition-all duration-200
        hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5
        shadow-[0_1px_3px_rgba(0,0,0,0.08)] ${className}`}
      style={{ animation: `fadeSlideUp 0.4s ease ${delay}ms both` }}
    >
      {children}
    </div>
  );
}

function CardHeader({ icon, title, count, action, actionLabel = "View All →", onAction }: {
  icon: React.ReactNode; title: string; count?: number; action?: () => void;
  actionLabel?: string; onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F1F5F9]">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
        {count !== undefined && (
          <span className="text-xs bg-[#F1F5F9] text-[#6B7280] px-2 py-0.5 rounded-full font-medium">{count}</span>
        )}
      </div>
      {(action || onAction) && (
        <button
          onClick={action || onAction}
          className="text-xs font-medium text-[#14B8A6] hover:text-[#0D9488] transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function EmptyState({ icon, title, subtitle, cta, onCta }: {
  icon: React.ReactNode; title: string; subtitle: string; cta?: string; onCta?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-3">{icon}</div>
      <h4 className="text-sm font-semibold text-[#111827] mb-1">{title}</h4>
      <p className="text-xs text-[#6B7280] mb-3 max-w-[220px]">{subtitle}</p>
      {cta && onCta && (
        <button onClick={onCta} className="text-xs font-medium text-white bg-[#14B8A6] hover:bg-[#0D9488] px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5">
          <Plus size={14} />{cta}
        </button>
      )}
    </div>
  );
}

function InfoField({ label, value, icon: Icon, href, onClick }: { label: string; value?: string | null; icon?: any; href?: string; onClick?: () => void }) {
  if (!value) return null;
  const content = onClick ? (
    <button type="button" onClick={onClick} className="text-sm text-[#14B8A6] hover:underline font-medium break-all text-left">
      {value}
    </button>
  ) : href ? (
    <a href={href} className="text-sm text-[#14B8A6] hover:underline font-medium break-all">{value}</a>
  ) : (
    <p className="text-sm font-medium text-[#111827] break-words">{value}</p>
  );
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      {Icon && <div className="p-1 bg-[#F9FAFB] rounded mt-0.5"><Icon className="h-3.5 w-3.5 text-[#6B7280]" /></div>}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-medium mb-0.5">{label}</p>
        {content}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────
const ClientDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isMobile } = useIsMobile();
  const [client, setClient] = useState<ClientData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [relatedLeadId, setRelatedLeadId] = useState<string | null>(null);
  const [relatedLeadConvertedAt, setRelatedLeadConvertedAt] = useState<string | null>(null);
  const [relatedLeadSummary, setRelatedLeadSummary] = useState<RelatedLeadSummary | null>(null);

  // Notes
  const [internalNotes, setInternalNotes] = useState("");
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);

  // Tasks
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Deals, Documents, Emails, Invoices
  const [deals, setDeals] = useState<any[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [emails, setEmails] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Task Modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [savingTask, setSavingTask] = useState(false);

  // More actions dropdown
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showComposeEmail, setShowComposeEmail] = useState(false);

  // ── Data Fetching ───────────────────────────────────────────────
  const fetchClient = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getClientById(id!) as any;
      if (data) { setClient(data); setInternalNotes(data.internalNotes || ""); }
    } catch (error) { console.error("Error fetching client:", error); }
    finally { setIsLoading(false); }
  }, [id]);

  const fetchRelatedLead = useCallback(async () => {
    try {
      const leads = await getLeads({ convertedToClientId: id!, limit: 1, sortBy: "createdAt", sortOrder: "desc" }) as any[];
      const relatedLead = Array.isArray(leads) ? leads[0] : null;
      setRelatedLeadId(relatedLead?.id || null);
      setRelatedLeadConvertedAt(relatedLead?.convertedAt || null);
      setRelatedLeadSummary(relatedLead ? {
        id: relatedLead.id,
        convertedAt: relatedLead.convertedAt || null,
        leadSource: relatedLead.leadSource || null,
        name: `${relatedLead.firstName || ""} ${relatedLead.lastName || ""}`.trim() || relatedLead.companyName || "Converted lead",
      } : null);
    } catch {
      setRelatedLeadId(null);
      setRelatedLeadConvertedAt(null);
      setRelatedLeadSummary(null);
    }
  }, [id]);

  const fetchTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      const [directTasks, projectTasks] = await Promise.all([
        getTasks({ clientId: id!, limit: 100 }) as Promise<any[]>,
        Promise.all(
          deals
            .map((deal) => deal?.id)
            .filter(Boolean)
            .map((projectId) => getTasks({ projectId, limit: 100 }) as Promise<any[]>),
        ),
      ]);

      const data = dedupeById([...(Array.isArray(directTasks) ? directTasks : []), ...projectTasks.flat()]);
      const sortedTasks = [...data].sort((a: any, b: any) => {
        const aTime = a?.dueDate || a?.updatedAt || a?.createdAt;
        const bTime = b?.dueDate || b?.updatedAt || b?.createdAt;
        return new Date(aTime || 0).getTime() - new Date(bTime || 0).getTime();
      });

      setTasks(sortedTasks.map((t: any) => ({
        id: t.id, title: t.title,
        dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "No Date",
        completed: t.status === "DONE" || t.status === "COMPLETED",
        priority: mapPriority(t.priority),
      })));
    } catch { } finally { setLoadingTasks(false); }
  }, [deals, id]);

  const fetchDeals = useCallback(async () => {
    try {
      setLoadingDeals(true);
      const [clientProjects, leadProjects] = await Promise.all([
        getProjects({ clientId: id!, limit: 100 }),
        relatedLeadId ? getProjects({ leadId: relatedLeadId, limit: 100 }) : Promise.resolve([]),
      ]);
      setDeals(sortByNewest(dedupeById([...(clientProjects || []), ...(leadProjects || [])]), "updatedAt", "createdAt"));
    }
    catch { } finally { setLoadingDeals(false); }
  }, [id, relatedLeadId]);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoadingDocs(true);
      const [clientDocs, leadDocs] = await Promise.all([
        getFiles({ clientId: id!, limit: 100 }),
        relatedLeadId ? getFiles({ leadId: relatedLeadId, limit: 100 }) : Promise.resolve([]),
      ]);
      setDocuments(sortByNewest(dedupeById([...(Array.isArray(clientDocs) ? clientDocs : []), ...(Array.isArray(leadDocs) ? leadDocs : [])]), "createdAt", "updatedAt"));
    }
    catch { } finally { setLoadingDocs(false); }
  }, [id, relatedLeadId]);

  const fetchEmails = useCallback(async () => {
    try {
      setLoadingEmails(true);
      const [clientEmails, leadEmails] = await Promise.all([
        getEmails({ clientId: id!, limit: 50 }),
        relatedLeadId ? getEmails({ leadId: relatedLeadId, limit: 50 }) : Promise.resolve([]),
      ]);
      setEmails(sortByNewest(dedupeById([...(Array.isArray(clientEmails) ? clientEmails : []), ...(Array.isArray(leadEmails) ? leadEmails : [])]), "sentAt", "receivedAt", "createdAt"));
    }
    catch { } finally { setLoadingEmails(false); }
  }, [id, relatedLeadId]);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoadingInvoices(true);
      const [invoiceData, subscriptionData, paymentData] = await Promise.all([
        getInvoices({ clientId: id! }),
        getSubscriptions({ clientId: id! }),
        getPayments({ clientId: id! }),
      ]);
      setInvoices(Array.isArray(invoiceData) ? invoiceData : []);
      setSubscriptions(Array.isArray(subscriptionData?.data) ? subscriptionData.data : []);
      setPayments(Array.isArray(paymentData) ? paymentData : []);
    }
    catch { } finally { setLoadingInvoices(false); }
  }, [id]);

  useEffect(() => {
    fetchClient();
    fetchRelatedLead();
  }, [fetchClient, fetchRelatedLead]);

  useEffect(() => {
    fetchDeals();
    fetchDocuments();
    fetchEmails();
    fetchInvoices();
  }, [fetchDeals, fetchDocuments, fetchEmails, fetchInvoices]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ── Actions ─────────────────────────────────────────────────────
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const updated = internalNotes ? `${newNote.trim()}\n\n---\n\n${internalNotes}` : newNote.trim();
      await updateClient(id!, { internalNotes: updated });
      setInternalNotes(updated); setNewNote(""); setShowNoteForm(false);
      toast({ title: "Note Saved", description: "Your note has been saved." });
    } catch {
      toast({ title: "Error", description: "Failed to save note.", variant: "destructive" });
    } finally { setSavingNote(false); }
  };

  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus = task.completed ? "TODO" : "DONE";
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
    try { await updateTask(taskId, { status: newStatus }); } catch {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: task.completed } : t));
      toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    setSavingTask(true);
    try {
      await createTask({ title: newTaskTitle, dueDate: newTaskDate || undefined, priority: newTaskPriority.toUpperCase(), clientId: id, status: "TODO" });
      setNewTaskTitle(""); setNewTaskDate(""); setNewTaskPriority("Medium"); setIsTaskModalOpen(false);
      toast({ title: "Task Created" }); fetchTasks();
    } catch {
      toast({ title: "Error", description: "Failed to create task.", variant: "destructive" });
    } finally { setSavingTask(false); }
  };

  // ── Render ──────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
      <Loader2 className="animate-spin text-[#14B8A6]" size={40} />
    </div>
  );
  if (!client) return null;

  const address = buildAddress(client);
  const tags = normalizeTags(client.tags);
  const ownerName = formatAssignedOwner(client.assignedOwner);
  const statusLabel = toStatusLabel(client.status);
  const typeLabel = toClientTypeLabel(client.clientType);
  const openTasks = tasks.filter(t => !t.completed).length;
  const totalRevenue = Number(client.totalRevenue) || 0;
  const paidInvoices = invoices.filter((i: any) => (i.status || '').toUpperCase() === 'PAID');
  const overdueInvoices = invoices.filter((i: any) => (i.status || '').toUpperCase() === 'OVERDUE');
  const openInvoices = invoices.filter((i: any) => !['PAID', 'CANCELLED'].includes((i.status || '').toUpperCase()));
  const outstandingAmount = openInvoices.reduce((s: number, i: any) => s + (Number(i.amountDue) || Number(i.total) || 0) - (Number(i.amountPaid) || 0), 0);
  const lastEmail = emails.length > 0 ? emails[0] : null;
  const lastContactedDate = lastEmail?.sentAt ? new Date(lastEmail.sentAt).toLocaleDateString() : null;
  const activityHighlights = [
    relatedLeadSummary ? {
      id: "lead-conversion",
      title: "Lead converted into organization",
      description: `${relatedLeadSummary.name} was converted into this organization record.`,
      date: fmtDate(relatedLeadSummary.convertedAt || client.createdAt),
      actionLabel: "Open Lead",
      action: () => navigate(`/leads/${relatedLeadSummary.id}`),
    } : null,
    (client.leadSource || relatedLeadSummary?.leadSource) ? {
      id: "lead-source",
      title: "Organization source recorded",
      description: `This organization came from ${client.leadSource || relatedLeadSummary?.leadSource}.`,
      date: fmtDate(client.createdAt),
    } : null,
  ].filter(Boolean) as Array<{
    id: string;
    title: string;
    description: string;
    date: string;
    actionLabel?: string;
    action?: () => void;
  }>;

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-24 md:pb-0">
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ═══════════ SECTION 1: STICKY PROFILE HEADER ═══════════ */}
      <header className="crm-module-header sticky top-0 z-30 bg-white border-b border-[#E5E7EB] shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
        {/* Breadcrumb */}
        <div className="px-6 pt-3 pb-1">
          <Breadcrumb><BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="/dashboard" className="text-xs">Dashboard</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href="/client-list" className="text-xs">Organizations</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage className="text-xs font-semibold text-[#14B8A6]">{client.clientName}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList></Breadcrumb>
        </div>

        {/* Profile Row */}
        <div className="px-6 pb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/client-list')} className="p-1.5 rounded-lg hover:bg-[#F9FAFB] text-[#6B7280] transition-colors flex-shrink-0">
              <ArrowLeft size={18} />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#14B8A6] to-[#0D9488] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
              {getInitials(client.clientName)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-[#111827] truncate">{client.clientName}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F3F4F6] text-[#6B7280]">{typeLabel}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${statusLabel === 'Active' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]'}`}>{statusLabel}</span>
                {client.doNotContact && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEE2E2] text-[#DC2626] flex items-center gap-0.5"><BanIcon size={10} />DNC</span>}
              </div>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                Organization since {fmtDate(client.createdAt)}
                {ownerName && <> · Assigned to <span className="font-medium text-[#6B7280]">{ownerName}</span></>}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {client.primaryPhone && (
              <a href={`tel:${client.primaryPhone}`} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#374151] hover:bg-[#F9FAFB] hover:border-[#D1D5DB] transition-all hover:scale-[1.02]">
                <PhoneCall size={14} className="text-[#14B8A6]" />Call
              </a>
            )}
            <button type="button" onClick={() => setShowComposeEmail(true)} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#374151] hover:bg-[#F9FAFB] hover:border-[#D1D5DB] transition-all hover:scale-[1.02]">
              <Mail size={14} className="text-[#14B8A6]" />Email
            </button>
            <WhatsAppActionButton
              contactName={client.clientName}
              phoneNumber={client.primaryPhone}
              className="hidden sm:inline-flex h-auto px-3 py-2 hover:scale-[1.02]"
            />
            <button onClick={() => setShowNoteForm(true)} className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#374151] hover:bg-[#F9FAFB] hover:border-[#D1D5DB] transition-all hover:scale-[1.02]">
              <StickyNote size={14} className="text-[#14B8A6]" />Add Note
            </button>
            <button onClick={() => navigate('/projects/add')} className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#14B8A6] text-white text-xs font-semibold hover:bg-[#0D9488] transition-all hover:scale-[1.02] shadow-sm">
              <DollarSign size={14} />Create Deal
            </button>

            {/* More Actions */}
            <div className="relative">
              <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
                <MoreHorizontal size={16} className="text-[#6B7280]" />
              </button>
              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-[#E5E7EB] shadow-lg z-50 py-1 animate-in fade-in zoom-in-95 duration-150">
                    {[
                      { label: "Edit Organization", icon: Pencil, action: () => navigate(`/client-list/${id}/edit`) },
                      { label: "View on Map", icon: MapPin, action: () => window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank') },
                    ].map((item, i) => (
                      <button key={i} onClick={() => { item.action(); setShowMoreMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#374151] hover:bg-[#F9FAFB] transition-colors">
                        <item.icon size={14} className="text-[#6B7280]" />{item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-5">

        {/* ═══════════ SECTION 2: KPI STATS ROW ═══════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ animation: 'fadeSlideUp 0.35s ease both' }}>
          {[
            { icon: <DollarSign size={18} />, iconBg: "bg-[#CCFBF1]", iconColor: "text-[#0D9488]", value: deals.length, label: "Total Deals" },
            { icon: <CheckSquare size={18} />, iconBg: "bg-[#FFF7ED]", iconColor: "text-[#EA580C]", value: openTasks, label: "Open Tasks" },
            { icon: <TrendingUp size={18} />, iconBg: "bg-[#DCFCE7]", iconColor: "text-[#16A34A]", value: totalRevenue, label: "Total Revenue", isCurrency: true },
            { icon: <Clock size={18} />, iconBg: "bg-[#EFF6FF]", iconColor: "text-[#2563EB]", value: lastContactedDate || "Never", label: "Last Contacted", isText: true },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5"
              style={{ animation: `fadeSlideUp 0.4s ease ${100 + i * 80}ms both` }}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${stat.iconBg} flex items-center justify-center ${stat.iconColor}`}>{stat.icon}</div>
                <div>
                  <div className={`text-xl font-bold ${stat.isText && stat.value === "Never" ? "text-[#EF4444]" : "text-[#111827]"}`}>
                    {stat.isCurrency ? fmtCurrency(stat.value as number) : stat.isText ? stat.value : <AnimatedNumber value={stat.value as number} />}
                  </div>
                  <div className="text-[11px] text-[#6B7280] font-medium">{stat.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ═══════════ SECTION 3: CARD GRID ═══════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ── CARD 1: Contact Information ── */}
          <DashCard delay={200}>
            <CardHeader
              icon={<div className="w-7 h-7 rounded-lg bg-[#CCFBF1] flex items-center justify-center"><User size={14} className="text-[#0D9488]" /></div>}
              title="Contact Information"
              actionLabel="✏️ Edit"
              action={() => navigate(`/client-list/${id}/edit`)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5">
              <InfoField label="Primary Email" value={client.primaryEmail} icon={Mail} onClick={() => setShowComposeEmail(true)} />
              <InfoField label="Contact Person" value={client.contactName} icon={User} />
              <InfoField label="Primary Phone" value={fmtPhone(client.primaryPhone)} icon={Phone} href={`tel:${client.primaryPhone}`} />
              <InfoField label="Direct Line" value={fmtPhone(client.directPhone)} icon={Phone} href={client.directPhone ? `tel:${client.directPhone}` : undefined} />
              <InfoField label="Alternate Phone" value={fmtPhone(client.secondaryPhone)} icon={Phone} href={client.secondaryPhone ? `tel:${client.secondaryPhone}` : undefined} />
              <InfoField label="Preferred Contact" value={client.preferredContactMethod} icon={MessageSquare} />
            </div>
            <div className="mt-2 pt-2 border-t border-[#F3F4F6] space-y-0.5">
              <InfoField label="Best Time to Contact" value={client.bestTimeToContact} icon={Clock} />
              {address && (
                <div className="flex items-start gap-2.5 py-1.5">
                  <div className="p-1 bg-[#F9FAFB] rounded mt-0.5"><MapPin className="h-3.5 w-3.5 text-[#6B7280]" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-medium mb-0.5">Address</p>
                    <p className="text-sm font-medium text-[#111827]">{address}</p>
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer"
                      className="text-xs text-[#14B8A6] hover:underline flex items-center gap-1 mt-1">
                      <MapPin size={10} />View on Map <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </DashCard>

          {/* ── CARD 2: Deals ── */}
          <DashCard delay={280}>
            <CardHeader
              icon={<div className="w-7 h-7 rounded-lg bg-[#CCFBF1] flex items-center justify-center"><DollarSign size={14} className="text-[#0D9488]" /></div>}
              title="Deals"
              count={deals.length}
              actionLabel="View All →"
              action={() => navigate('/projects')}
            />
            {loadingDeals ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-[#14B8A6]" size={20} /></div>
            ) : deals.length === 0 ? (
              <EmptyState icon={<DollarSign size={20} className="text-[#9CA3AF]" />} title="No deals yet" subtitle="Create your first deal to start tracking revenue" cta="Create New Deal" onCta={() => navigate('/projects/add')} />
            ) : (
              <div className="space-y-2">
                {deals.slice(0, 4).map((deal: any) => {
                  const status = (deal.status || 'IN_PROGRESS').toUpperCase();
                  const statusColor = status === 'COMPLETED' ? 'bg-[#DCFCE7] text-[#166534]' : status === 'ON_HOLD' ? 'bg-[#FEF3C7] text-[#92400E]' : status === 'CANCELLED' ? 'bg-[#FEE2E2] text-[#991B1B]' : 'bg-[#DBEAFE] text-[#1E40AF]';
                  const statusLabel = status === 'IN_PROGRESS' ? 'In Progress' : status === 'ON_HOLD' ? 'On Hold' : status.charAt(0) + status.slice(1).toLowerCase();
                  return (
                    <div key={deal.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#F9FAFB] transition-colors cursor-pointer" onClick={() => navigate(`/projects/${deal.id}`)}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#111827] truncate">{deal.name || deal.Name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {(deal.budget || deal.Budget) && <span className="text-xs text-[#6B7280]">{fmtCurrency(Number(deal.budget || deal.Budget))}</span>}
                          {(deal.dueDate || deal.DueDate) && <span className="text-[10px] text-[#9CA3AF]">{fmtDate(deal.dueDate || deal.DueDate)}</span>}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor} flex-shrink-0`}>{statusLabel}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </DashCard>

          {/* ── CARD 3: Tasks ── */}
          <DashCard delay={360}>
            <CardHeader
              icon={<div className="w-7 h-7 rounded-lg bg-[#FFF7ED] flex items-center justify-center"><CheckSquare size={14} className="text-[#EA580C]" /></div>}
              title="Tasks"
              count={tasks.length}
              actionLabel="View All →"
              action={() => navigate('/tasks')}
            />
            {loadingTasks ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-[#14B8A6]" size={20} /></div>
            ) : tasks.length === 0 ? (
              <EmptyState icon={<CheckSquare size={20} className="text-[#9CA3AF]" />} title="No tasks yet" subtitle="Create a task to keep track of to-dos" cta="Add New Task" onCta={() => setIsTaskModalOpen(true)} />
            ) : (
              <div className="space-y-1">
                {tasks.slice(0, 4).map(task => {
                  const prioColor = task.priority === 'High' ? 'bg-[#FEE2E2] text-[#DC2626]' : task.priority === 'Medium' ? 'bg-[#FEF3C7] text-[#D97706]' : 'bg-[#DCFCE7] text-[#16A34A]';
                  const prioIcon = task.priority === 'High' ? '🔴' : task.priority === 'Medium' ? '🟡' : '🟢';
                  return (
                    <div key={task.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-[#F9FAFB] transition-colors group">
                      <Checkbox id={`t-${task.id}`} checked={task.completed} onCheckedChange={() => toggleTask(task.id)} className="flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <label htmlFor={`t-${task.id}`} className={`text-sm font-medium cursor-pointer block truncate transition-all ${task.completed ? 'text-[#9CA3AF] line-through' : 'text-[#111827]'}`}>{task.title}</label>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px]">{prioIcon}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${prioColor}`}>{task.priority}</span>
                          <span className="text-[10px] text-[#9CA3AF] flex items-center gap-0.5"><Clock size={9} />{task.dueDate}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button onClick={() => setIsTaskModalOpen(true)} className="w-full text-left text-xs font-medium text-[#14B8A6] hover:text-[#0D9488] py-2 px-2 flex items-center gap-1 transition-colors">
                  <Plus size={12} />Add New Task
                </button>
              </div>
            )}
          </DashCard>

          {/* ── CARD 4: Financial Summary ── */}
          <DashCard delay={440}>
            <CardHeader
              icon={<div className="w-7 h-7 rounded-lg bg-[#DCFCE7] flex items-center justify-center"><CircleDollarSign size={14} className="text-[#16A34A]" /></div>}
              title="Financial Summary"
              actionLabel="View Details →"
              action={() => navigate('/invoice')}
            />
            <div className="space-y-0">
              {[
                { label: "Total Revenue", value: fmtCurrency(totalRevenue, client.currency), bold: true },
                { label: "Open Invoices", value: openInvoices.length.toString() },
                { label: "Subscriptions", value: subscriptions.length.toString(), bold: subscriptions.some((s) => String(s.status).toUpperCase() === "ACTIVE") },
                { label: "Payments", value: payments.length.toString() },
                { label: "Overdue Invoices", value: overdueInvoices.length.toString(), danger: overdueInvoices.length > 0 },
                { label: "Outstanding Amount", value: fmtCurrency(outstandingAmount, client.currency), danger: outstandingAmount > 0 },
                { label: "Lifetime Value", value: fmtCurrency(totalRevenue + paidInvoices.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0), client.currency) },
              ].map((row, i) => (
                <div key={i} className={`flex items-center justify-between py-2.5 ${i < 4 ? 'border-b border-dashed border-[#F1F5F9]' : ''}`}>
                  <span className="text-xs text-[#6B7280]">{row.label}</span>
                  <span className={`text-sm font-semibold ${row.danger ? 'text-[#EF4444]' : row.bold ? 'text-[#111827]' : 'text-[#374151]'}`}>{row.value}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F1F5F9]">
              <button onClick={() => navigate('/invoice/create')} className="text-xs font-medium text-[#14B8A6] flex items-center gap-1 hover:text-[#0D9488] transition-colors">
                <Plus size={12} />Create Invoice
              </button>
            </div>
          </DashCard>

          {/* ── CARD 5: Account Details ── */}
          <DashCard delay={520}>
            <CardHeader
              icon={<div className="w-7 h-7 rounded-lg bg-[#FEF3C7] flex items-center justify-center"><Building2 size={14} className="text-[#D97706]" /></div>}
              title="Company Profile"
              actionLabel="✏️ Edit"
              action={() => navigate(`/client-list/${id}/edit`)}
            />
            {!client.industry && !client.website && !client.noOfEmployees && !client.lifecycleStage ? (
              <EmptyState icon={<Building2 size={20} className="text-[#9CA3AF]" />} title="No company profile" subtitle="Add industry, website, lifecycle, and account ownership details" cta="Add Company Profile" onCta={() => navigate(`/client-list/${id}/edit`)} />
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
                <InfoField label="Website" value={client.website} icon={Globe} href={client.website ? (/^https?:\/\//i.test(client.website) ? client.website : `https://${client.website}`) : undefined} />
                <InfoField label="Industry" value={client.industry} icon={Building2} />
                <InfoField label="Company Size" value={client.noOfEmployees} icon={User} />
                <InfoField label="Territory" value={client.territory} icon={MapPin} />
                <InfoField label="Lifecycle Stage" value={client.lifecycleStage?.replace(/_/g, " ")} icon={Clock} />
                <InfoField label="Account Manager" value={ownerName || undefined} icon={User} />
                <InfoField label="Lead Source" value={client.leadSource} icon={TrendingUp} />
                <InfoField label="Category" value={client.clientCategory} icon={Tag} />
              </div>
            )}
          </DashCard>

          {/* ── CARD 6: Account Engagement ── */}
          <DashCard delay={600}>
            <CardHeader
              icon={<div className="w-7 h-7 rounded-lg bg-[#FFF7ED] flex items-center justify-center"><ClipboardList size={14} className="text-[#F97316]" /></div>}
              title="Account Engagement"
              actionLabel="Open Calendar →"
              action={() => navigate('/calendar')}
            />
            <div className="space-y-2">
              {[
                {
                  label: "Open tasks",
                  value: openTasks.toString(),
                  helper: openTasks > 0 ? "Follow-ups waiting" : "No pending follow-ups",
                  action: () => navigate('/tasks'),
                },
                {
                  label: "Active deals",
                  value: deals.length.toString(),
                  helper: deals.length > 0 ? "Opportunities in progress" : "No linked deals yet",
                  action: () => navigate('/deals'),
                },
                {
                  label: "Documents",
                  value: documents.length.toString(),
                  helper: documents.length > 0 ? "Files linked to this account" : "No linked documents",
                  action: () => navigate(`/documents?linkedEntityType=Client&linkedEntityId=${id}`),
                },
                {
                  label: "Open invoices",
                  value: openInvoices.length.toString(),
                  helper: outstandingAmount > 0 ? `${fmtCurrency(outstandingAmount, client.currency)} outstanding` : "No outstanding balance",
                  action: () => navigate('/invoice'),
                },
              ].map((row) => (
                <button
                  key={row.label}
                  type="button"
                  onClick={row.action}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#F9FAFB]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#111827]">{row.label}</p>
                    <p className="mt-0.5 truncate text-[10px] text-[#9CA3AF]">{row.helper}</p>
                  </div>
                  <span className="rounded-full bg-[#FFF7ED] px-2.5 py-1 text-xs font-semibold text-[#C2410C]">{row.value}</span>
                </button>
              ))}
              <div className="mt-3 flex flex-wrap gap-2 border-t border-[#F1F5F9] pt-3">
                <button onClick={() => setIsTaskModalOpen(true)} className="text-xs font-medium text-[#14B8A6] flex items-center gap-1 hover:text-[#0D9488] transition-colors">
                  <Plus size={12} />Add Task
                </button>
                <button onClick={() => setShowComposeEmail(true)} className="text-xs font-medium text-[#14B8A6] flex items-center gap-1 hover:text-[#0D9488] transition-colors">
                  <Mail size={12} />Email Contact
                </button>
              </div>
            </div>
          </DashCard>

          {/* ── CARD 7: Recent Activity / Timeline ── */}
          <DashCard delay={600}>
            <CardHeader
              icon={<div className="w-7 h-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center"><Clock size={14} className="text-[#2563EB]" /></div>}
              title="Recent Activity"
            />
            {activityHighlights.length > 0 ? (
              <div className="mb-4 space-y-2">
                {activityHighlights.map((item) => (
                  <div key={item.id} className="rounded-lg border border-[#DBEAFE] bg-[#F8FBFF] px-3 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#0F172A]">{item.title}</p>
                        <p className="mt-0.5 text-xs text-[#475569]">{item.description}</p>
                      </div>
                      <span className="whitespace-nowrap text-[10px] text-[#94A3B8]">{item.date}</span>
                    </div>
                    {item.action ? (
                      <button
                        type="button"
                        onClick={item.action}
                        className="mt-2 text-xs font-medium text-[#14B8A6] hover:text-[#0D9488]"
                      >
                        {item.actionLabel || "Open"}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
            <div className="max-h-[280px] overflow-y-auto -mx-1 px-1">
              <ActivityTimeline entityType="Client" entityId={id!} />
            </div>
          </DashCard>

          {/* ── CARD 8: Documents ── */}
          <DashCard delay={680}>
            <CardHeader
              icon={<div className="w-7 h-7 rounded-lg bg-[#EDE9FE] flex items-center justify-center"><FolderOpen size={14} className="text-[#7C3AED]" /></div>}
              title="Documents"
              count={documents.length}
            />
            {loadingDocs ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-[#14B8A6]" size={20} /></div>
            ) : documents.length === 0 ? (
              <EmptyState icon={<FolderOpen size={20} className="text-[#9CA3AF]" />} title="No documents uploaded" subtitle="Upload certificates, contracts, and files" cta="Upload Document" onCta={() => navigate('/filemanager')} />
            ) : (
              <div className="space-y-2">
                {documents.slice(0, 4).map((doc: any) => {
                  const ext = doc.extension || doc.name?.split('.').pop() || '';
                  const sizeKb = doc.size ? (Number(doc.size) / 1024).toFixed(1) : '—';
                  return (
                    <div key={doc.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-[#F9FAFB] transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-[#EDE9FE] flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-[#7C3AED]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#111827] truncate">{doc.originalName || doc.name}</p>
                        <p className="text-[10px] text-[#9CA3AF]">{sizeKb} KB · {ext.toUpperCase()} · {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : ''}</p>
                      </div>
                      <a href={getDownloadUrl(doc.id)} target="_blank" rel="noreferrer" className="text-[#14B8A6] hover:text-[#0D9488] p-1"><Download size={14} /></a>
                    </div>
                  );
                })}
              </div>
            )}
          </DashCard>

          {/* ── CARD 8: Lead & Source Tracking ── */}
          <DashCard delay={760}>
            <CardHeader
              icon={<div className="w-7 h-7 rounded-lg bg-[#FCE7F3] flex items-center justify-center"><TrendingUp size={14} className="text-[#DB2777]" /></div>}
              title="Lead & Source"
              actionLabel="✏️ Edit"
              action={() => navigate(`/client-list/${id}/edit`)}
            />
            <div className="space-y-0">
              {[
                { label: "Lead Source", value: client.leadSource || "—" },
                { label: "Category", value: client.clientCategory || "—" },
                { label: "Budget Range", value: client.budgetRange || "—" },
                { label: "Urgency Level", value: client.urgencyLevel || "—" },
                { label: "Lifecycle Stage", value: client.lifecycleStage || "—" },
                { label: "Conversion Date", value: fmtDate(relatedLeadConvertedAt || client.createdAt) },
              ].map((row, i) => (
                <div key={i} className={`flex items-center justify-between py-2.5 ${i < 5 ? 'border-b border-dashed border-[#F1F5F9]' : ''}`}>
                  <span className="text-xs text-[#6B7280]">{row.label}</span>
                  <span className="text-sm font-medium text-[#374151]">{row.value}</span>
                </div>
              ))}
            </div>
            {/* Tags */}
            {tags.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
                <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-medium mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#14B8A6]/10 text-[#0D9488]">
                      <Tag size={10} className="mr-1" />{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </DashCard>

          {/* ── CARD 9: Notes (full width) ── */}
          <DashCard delay={840} className="lg:col-span-2">
            <CardHeader
              icon={<div className="w-7 h-7 rounded-lg bg-[#FEF9C3] flex items-center justify-center"><StickyNote size={14} className="text-[#CA8A04]" /></div>}
              title="Internal Notes"
              actionLabel="+ Add Note"
              action={() => setShowNoteForm(!showNoteForm)}
            />
            {showNoteForm && (
              <div className="bg-[#F9FAFB] p-4 rounded-lg mb-3 border border-[#E5E7EB]">
                <Textarea placeholder="Type your note here..." className="resize-none min-h-[80px] bg-white" value={newNote} onChange={(e) => setNewNote(e.target.value)} autoFocus />
                <div className="flex justify-end gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={() => setShowNoteForm(false)}>Cancel</Button>
                  <Button size="sm" className="bg-[#14B8A6] text-white hover:bg-[#0D9488]" onClick={handleAddNote} disabled={savingNote || !newNote.trim()}>
                    {savingNote ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    {savingNote ? "Saving..." : "Save Note"}
                  </Button>
                </div>
              </div>
            )}
            {!internalNotes && !showNoteForm ? (
              <EmptyState icon={<StickyNote size={20} className="text-[#9CA3AF]" />} title="No notes yet" subtitle="Add a note to keep track of important information" cta="Add Note" onCta={() => setShowNoteForm(true)} />
            ) : internalNotes ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {internalNotes.split('\n\n---\n\n').map((note, index) => (
                  <div key={index} className="bg-[#FFFBEB] p-3 rounded-lg border border-[#FDE68A]/50">
                    <p className="text-sm text-[#111827] whitespace-pre-wrap leading-relaxed">{note}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </DashCard>
        </div>
      </div>

      {/* ═══════════ TASK MODAL ═══════════ */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="font-semibold text-lg text-[#111827]">Add New Task</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsTaskModalOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#374151]">Task Title</label>
                <Input placeholder="Enter task description..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#374151]">Due Date</label>
                  <Input type="date" value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#374151]">Priority</label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value as any)}>
                    <option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-5 bg-[#F9FAFB] flex justify-end gap-2 border-t">
              <Button variant="outline" onClick={() => setIsTaskModalOpen(false)}>Cancel</Button>
              <Button className="bg-[#14B8A6] hover:bg-[#0D9488] text-white" onClick={handleAddTask} disabled={savingTask}>
                {savingTask ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}Add Task
              </Button>
            </div>
          </div>
        </div>
      )}

      {isMobile && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E7EB] bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto grid max-w-[640px] grid-cols-3 gap-2">
            {client.primaryPhone ? (
              <Button asChild variant="outline" className="h-11 rounded-md">
                <a href={`tel:${client.primaryPhone}`}>
                  <PhoneCall size={15} className="mr-2" />
                  Call
                </a>
              </Button>
            ) : (
              <Button variant="outline" className="h-11 rounded-md" disabled>
                <PhoneCall size={15} className="mr-2" />
                Call
              </Button>
            )}
            <Button
              variant="outline"
              className="h-11 rounded-md"
              onClick={() => setShowComposeEmail(true)}
            >
              <Mail size={15} className="mr-2" />
              Email
            </Button>
            <Button
              className="h-11 rounded-md bg-[#14B8A6] text-white hover:bg-[#0D9488]"
              onClick={() => navigate(`/client-list/${id}/edit`)}
            >
              <Pencil size={15} className="mr-2" />
              Edit
            </Button>
          </div>
        </div>
      )}

      <ComposeEmailSheet
        isOpen={showComposeEmail}
        onClose={() => setShowComposeEmail(false)}
        defaultRecipientEmail={client.primaryEmail}
        defaultRecipientName={client.clientName}
        clientId={client.id}
        onSent={fetchEmails}
      />
    </div>
  );
};

export default ClientDetailPage;
