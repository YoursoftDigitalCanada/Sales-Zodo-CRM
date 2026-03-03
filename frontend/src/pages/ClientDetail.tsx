import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { getClientById, updateClient } from "@/services/clientService";
import { getTasks, createTask, updateTask } from "@/features/tasks/services/tasks-service";
import { getProjects } from "@/features/projects/services/projects-service";
import { getFiles } from "@/features/files/services/files-service";
import { getEmails } from "@/features/emails/services/emails-service";
import { getInvoices } from "@/features/invoices/services/invoice-service";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { useToast } from "@/hooks/use-toast";
import {
  Bell, Mail, Phone, MapPin, Star, Tag, User, Calendar, Plus, MoreHorizontal,
  Pencil, MessageSquare, FileText, CheckSquare, TrendingUp, FolderOpen,
  Send, ArrowLeft, Loader2, DollarSign, Clock, Users, Download, Trash2, X,
  Image as ImageIcon, File, Files, Clock3, Receipt,
  Home, Shield, Landmark, AlertTriangle, ChevronDown, ChevronUp, Globe, BanIcon,
  Layers, Ruler, Wrench, Building2, CreditCard, CircleDollarSign
} from "lucide-react";

// ── Interfaces ──────────────────────────────────────────────────────
interface ClientData {
  id: string;
  clientName: string;
  companyName?: string;
  clientType: string;
  clientLogo?: string;
  primaryEmail: string;
  primaryPhone: string;
  secondaryPhone?: string;
  spouseCoOwnerName?: string;
  status: string;
  lifecycleStage?: string;
  assignedOwner?: any;

  // Address
  streetAddress?: string;
  suite?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;

  // Property & Roof
  propertyType?: string;
  numberOfStories?: string;
  currentRoofMaterial?: string;
  roofAge?: string;
  roofSize?: string;
  roofPitch?: string;
  serviceType?: string;
  isHomeowner?: string;
  isHOA?: string;
  hoaRestrictions?: string;

  // Insurance
  insuranceCompanyName?: string;
  isInsuranceClaim?: string;

  // Lead
  leadSource?: string;
  clientCategory?: string;
  budgetRange?: string;
  urgencyLevel?: string;

  // Financial
  creditLimit?: number;
  paymentTerms?: string;
  currency?: string;
  totalRevenue?: number;

  // Communication
  preferredContactMethod?: string;
  bestTimeToContact?: string;
  language?: string;
  doNotContact?: boolean;
  nextFollowUp?: string;

  // Notes
  internalNotes?: string;
  tags?: any;

  // Contact
  contactName?: string;
  position?: string;
  directPhone?: string;

  // Warranty
  warrantyExpiration?: string;

  // Counts
  _count?: { contacts?: number; projects?: number; invoices?: number; quotes?: number; files?: number };

  createdAt?: string;
  updatedAt?: string;
}

interface ClientTask {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
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
  const fn = x.firstName || x.user?.firstName || "";
  const ln = x.lastName || x.user?.lastName || "";
  return `${fn} ${ln}`.trim();
};

const buildAddress = (d: ClientData) => {
  return [d.streetAddress, d.suite, d.city, d.province, d.postalCode, d.country].filter(Boolean).join(", ");
};

const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : "CL";

const fmtCurrency = (n?: number, currency = 'CAD') =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n || 0);

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString() : "—";

// ── Collapsible Section ─────────────────────────────────────────────
function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <CardHeader
        className="pb-2 cursor-pointer flex flex-row items-center justify-between border-b hover:bg-slate-50/50 transition"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#0891B2]/10 rounded-md"><Icon className="h-3.5 w-3.5 text-[#0891B2]" /></div>
          <CardTitle className="text-xs font-semibold text-[#0F172A] uppercase tracking-wide">{title}</CardTitle>
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-[#94A3B8]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#94A3B8]" />}
      </CardHeader>
      {open && <CardContent className="pt-3 space-y-2.5">{children}</CardContent>}
    </Card>
  );
}

function Field({ label, value, icon: Icon }: { label: string; value?: string | number | null; icon?: any }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-2.5 group">
      {Icon && (
        <div className="p-1.5 bg-[#F8FAFC] rounded-md group-hover:bg-[#0891B2]/10 transition-colors mt-0.5">
          <Icon className="h-3 w-3 text-[#475569] group-hover:text-[#0891B2]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-medium">{label}</p>
        <p className="text-sm font-medium text-[#0F172A] break-words">{String(value)}</p>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────
const ClientDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<ClientData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("deals");

  // Notes
  const [internalNotes, setInternalNotes] = useState("");
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

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
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Task Modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [savingTask, setSavingTask] = useState(false);

  // ── Data Fetching ───────────────────────────────────────────────
  const fetchClient = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getClientById(id!) as any;
      if (data) {
        setClient(data);
        setInternalNotes(data.internalNotes || "");
      }
    } catch (error) {
      console.error("Error fetching client:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const fetchTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      const data = await getTasks({ clientId: id!, limit: 100 }) as any[];
      setTasks(data.map((t: any) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "No Date",
        completed: t.status === "DONE" || t.status === "COMPLETED",
        priority: mapPriority(t.priority),
      })));
    } catch { } finally { setLoadingTasks(false); }
  }, [id]);

  const fetchDeals = useCallback(async () => {
    try { setLoadingDeals(true); const data = await getProjects({ clientId: id!, limit: 100 }); setDeals(data); } catch { } finally { setLoadingDeals(false); }
  }, [id]);

  const fetchDocuments = useCallback(async () => {
    try { setLoadingDocs(true); const data = await getFiles({ clientId: id!, limit: 100 }); setDocuments(Array.isArray(data) ? data : []); } catch { } finally { setLoadingDocs(false); }
  }, [id]);

  const fetchEmails = useCallback(async () => {
    try { setLoadingEmails(true); const data = await getEmails({ clientId: id!, limit: 50 }); setEmails(Array.isArray(data) ? data : []); } catch { } finally { setLoadingEmails(false); }
  }, [id]);

  const fetchInvoices = useCallback(async () => {
    try { setLoadingInvoices(true); const data = await getInvoices({ clientId: id! }); setInvoices(Array.isArray(data) ? data : []); } catch { } finally { setLoadingInvoices(false); }
  }, [id]);

  useEffect(() => {
    fetchClient(); fetchTasks(); fetchDeals(); fetchDocuments(); fetchEmails(); fetchInvoices();
  }, [fetchClient, fetchTasks, fetchDeals, fetchDocuments, fetchEmails, fetchInvoices]);

  // ── Actions ─────────────────────────────────────────────────────
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const updated = internalNotes ? `${newNote.trim()}\n\n---\n\n${internalNotes}` : newNote.trim();
      await updateClient(id!, { internalNotes: updated });
      setInternalNotes(updated);
      setNewNote("");
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
  if (isLoading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><Loader2 className="animate-spin text-[#0891B2]" size={40} /></div>;
  if (!client) return null;

  const address = buildAddress(client);
  const tags = normalizeTags(client.tags);
  const ownerName = formatAssignedOwner(client.assignedOwner);
  const statusLabel = toStatusLabel(client.status);
  const typeLabel = toClientTypeLabel(client.clientType);

  const tabs = [
    { id: 'deals', label: 'Deals', icon: TrendingUp },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'documents', label: 'Documents', icon: FolderOpen },
    { id: 'invoices', label: 'Invoices', icon: Receipt },
    { id: 'mail', label: 'Mail', icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <main className="min-h-screen transition-all duration-300">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b bg-white px-6 h-16 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/client-list')} className="hover:bg-[#F8FAFC]"><ArrowLeft className="h-5 w-5" /></Button>
            <Breadcrumb><BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbLink href="/client-list">Clients</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage className="font-semibold text-[#0891B2]">{client.clientName}</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList></Breadcrumb>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2"><Send className="h-4 w-4" /><span className="hidden sm:inline">Email</span></Button>
            <Button className="bg-[#0891B2] hover:bg-[#0891B2]/80 gap-2"><span className="hidden sm:inline">Actions</span><MoreHorizontal className="h-4 w-4" /></Button>
          </div>
        </header>

        <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">

            {/* ═══════════ LEFT PANEL — 6 SECTIONS ═══════════ */}
            <div className="lg:col-span-4 space-y-3">

              {/* Profile Card */}
              <Card className="overflow-hidden border-none shadow-md">
                <div className="bg-gradient-to-r from-[#0891B2] to-[#06b6d4] h-20" />
                <CardContent className="pt-0 -mt-10">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="h-20 w-20 border-4 border-white shadow-md bg-white">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${client.clientName}`} />
                      <AvatarFallback className="bg-[#0891B2]/10 text-[#0891B2] text-xl font-bold">{getInitials(client.clientName)}</AvatarFallback>
                    </Avatar>
                    <h2 className="text-lg font-bold text-[#0F172A] mt-2">{client.clientName}</h2>
                    {client.companyName && <p className="text-xs text-[#475569]">{client.companyName}</p>}
                    <p className="text-xs text-[#94A3B8]">{typeLabel}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <Badge className={`px-3 py-0.5 text-xs ${statusLabel === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{statusLabel}</Badge>
                      {client.doNotContact && <Badge className="bg-red-100 text-red-600 text-xs px-2 py-0.5 gap-1"><BanIcon className="h-3 w-3" /> DNC</Badge>}
                    </div>
                    {ownerName && <p className="text-xs text-[#94A3B8] mt-2">Assigned to <span className="font-medium text-[#0F172A]">{ownerName}</span></p>}
                    <p className="text-[10px] text-[#CBD5E1] mt-1">Client since {fmtDate(client.createdAt)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* 1️⃣ Contact Information */}
              <Section title="Contact Information" icon={User}>
                <Field label="Primary Email" value={client.primaryEmail} icon={Mail} />
                <Field label="Primary Phone" value={client.primaryPhone} icon={Phone} />
                <Field label="Alternate Phone" value={client.secondaryPhone} icon={Phone} />
                <Field label="Address" value={address} icon={MapPin} />
                <Field label="Contact Person" value={client.contactName} icon={User} />
                {client.directPhone && <Field label="Direct Line" value={client.directPhone} icon={Phone} />}
                <Field label="Spouse / Co-Owner" value={client.spouseCoOwnerName} icon={Users} />
                <Field label="Preferred Contact" value={client.preferredContactMethod} icon={MessageSquare} />
                <Field label="Best Time" value={client.bestTimeToContact} icon={Clock} />
                <Field label="Language" value={client.language} icon={Globe} />
              </Section>

              {/* 2️⃣ Property Details */}
              <Section title="Property Details" icon={Home} defaultOpen={false}>
                <Field label="Property Type" value={client.propertyType} icon={Building2} />
                <Field label="Stories" value={client.numberOfStories} icon={Layers} />
                <Field label="Roof Material" value={client.currentRoofMaterial} icon={Home} />
                <Field label="Roof Age" value={client.roofAge} icon={Clock3} />
                <Field label="Roof Size (sqft)" value={client.roofSize} icon={Ruler} />
                <Field label="Roof Pitch / Layers" value={client.roofPitch} icon={Layers} />
                <Field label="Service Type" value={client.serviceType} icon={Wrench} />
                <Field label="Homeowner" value={client.isHomeowner} icon={Home} />
                <Field label="HOA" value={client.isHOA} icon={Landmark} />
                {client.hoaRestrictions && <Field label="HOA Restrictions" value={client.hoaRestrictions} icon={AlertTriangle} />}
                <Field label="Photos / Files" value={client._count?.files ? `${client._count.files} file(s)` : undefined} icon={ImageIcon} />
              </Section>

              {/* 3️⃣ Lead & Source Tracking */}
              <Section title="Lead & Source Tracking" icon={TrendingUp} defaultOpen={false}>
                <Field label="Lead Source" value={client.leadSource} icon={Globe} />
                <Field label="Category" value={client.clientCategory} icon={Tag} />
                <Field label="Budget Range" value={client.budgetRange} icon={DollarSign} />
                <Field label="Urgency" value={client.urgencyLevel} icon={AlertTriangle} />
                <Field label="Lifecycle Stage" value={client.lifecycleStage} icon={TrendingUp} />
                <Field label="Lead Date" value={fmtDate(client.createdAt)} icon={Calendar} />
              </Section>

              {/* 4️⃣ Sales & Financial */}
              <Section title="Sales & Financial" icon={CircleDollarSign} defaultOpen={false}>
                <Field label="Total Revenue" value={fmtCurrency(Number(client.totalRevenue), client.currency)} icon={DollarSign} />
                <Field label="Payment Terms" value={client.paymentTerms} icon={Clock} />
                <Field label="Credit Limit" value={client.creditLimit ? fmtCurrency(client.creditLimit, client.currency) : undefined} icon={CreditCard} />
                <Field label="Currency" value={client.currency} icon={CircleDollarSign} />
                <Field label="Insurance Company" value={client.insuranceCompanyName} icon={Shield} />
                <Field label="Insurance Claim" value={client.isInsuranceClaim} icon={Shield} />
              </Section>

              {/* 5️⃣ Project & Service History */}
              <Section title="Project & Service History" icon={FolderOpen} defaultOpen={false}>
                <Field label="Projects" value={client._count?.projects ? `${client._count.projects} project(s)` : "0"} icon={FolderOpen} />
                <Field label="Quotes" value={client._count?.quotes ? `${client._count.quotes} quote(s)` : "0"} icon={FileText} />
                <Field label="Invoices" value={client._count?.invoices ? `${client._count.invoices} invoice(s)` : "0"} icon={Receipt} />
                <Field label="Warranty Expiration" value={client.warrantyExpiration ? fmtDate(client.warrantyExpiration) : undefined} icon={Shield} />
              </Section>

              {/* 6️⃣ Communication & Notes */}
              <Section title="Communication & Notes" icon={MessageSquare} defaultOpen={false}>
                <Field label="Do Not Contact" value={client.doNotContact ? "Yes — Opted Out" : "No"} icon={BanIcon} />
                <Field label="Next Follow-Up" value={client.nextFollowUp ? fmtDate(client.nextFollowUp) : undefined} icon={Calendar} />
                <Field label="Notes" value={client.internalNotes ? `${client.internalNotes.split('---').length} note(s)` : "0 notes"} icon={FileText} />
                {/* Tags */}
                <div>
                  <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-medium mb-1.5">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.length > 0 ? tags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#0891B2]/10 text-[#0891B2]">
                        <Tag size={10} className="mr-1" />{tag}
                      </span>
                    )) : <span className="text-xs text-[#94A3B8] italic">No tags</span>}
                  </div>
                </div>
              </Section>
            </div>

            {/* ═══════════ RIGHT PANEL — TABS ═══════════ */}
            <div className="lg:col-span-8">
              <Card className="h-full border-none shadow-md bg-white">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                  <CardHeader className="pb-0 border-b px-0">
                    <div className="px-6 overflow-x-auto scrollbar-hide">
                      <TabsList className="bg-transparent h-auto p-0 gap-6 inline-flex w-max min-w-full justify-start">
                        {tabs.map((tab) => (
                          <TabsTrigger key={tab.id} value={tab.id}
                            className="px-0 py-4 rounded-none border-b-2 bg-transparent text-sm font-medium text-[#475569]
                              data-[state=active]:border-[#0891B2] data-[state=active]:text-[#0891B2]
                              hover:text-[#0F172A] transition-colors gap-2">
                            <tab.icon className="h-4 w-4" />{tab.label}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 flex-1 bg-[#F8FAFC]/30">
                    {/* Deals */}
                    <TabsContent value="deals" className="m-0 space-y-4">
                      {loadingDeals ? (
                        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-[#0891B2] mr-2" size={20} /><span className="text-sm text-[#94A3B8]">Loading deals…</span></div>
                      ) : deals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <div className="w-16 h-16 rounded-full bg-[#0891B2]/10 flex items-center justify-center mb-4"><DollarSign className="h-8 w-8 text-[#0891B2]" /></div>
                          <h3 className="text-lg font-semibold text-[#0F172A] mb-1">No Deals Yet</h3>
                          <p className="text-sm text-[#475569] max-w-sm">Deals associated with this client will appear here once they are created.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {deals.map((deal: any) => {
                            const status = (deal.status || 'IN_PROGRESS').toUpperCase();
                            const statusColor = status === 'COMPLETED' ? 'bg-green-100 text-green-700' : status === 'ON_HOLD' ? 'bg-amber-100 text-amber-700' : status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700';
                            const statusLabel = status === 'IN_PROGRESS' ? 'In Progress' : status === 'ON_HOLD' ? 'On Hold' : status.charAt(0) + status.slice(1).toLowerCase();
                            return (
                              <div key={deal.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
                                <div className="flex-1">
                                  <h4 className="font-medium text-[#0F172A] text-sm">{deal.name || deal.Name}</h4>
                                  <div className="flex items-center gap-3 mt-1">
                                    {(deal.budget || deal.Budget) && <span className="text-xs text-[#475569] flex items-center gap-1"><DollarSign size={10} />{fmtCurrency(Number(deal.budget || deal.Budget))}</span>}
                                    {(deal.dueDate || deal.DueDate) && <span className="text-xs text-[#94A3B8] flex items-center gap-1"><Calendar size={10} />{new Date(deal.dueDate || deal.DueDate).toLocaleDateString()}</span>}
                                  </div>
                                </div>
                                <Badge className={`${statusColor} text-xs font-medium`}>{statusLabel}</Badge>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    {/* Timeline */}
                    <TabsContent value="timeline" className="m-0 px-2">
                      <ActivityTimeline entityType="Client" entityId={id!} />
                    </TabsContent>

                    {/* Notes */}
                    <TabsContent value="notes" className="m-0 space-y-6">
                      <div className="bg-white p-4 rounded-md border border-[rgba(15,23,42,0.06)] shadow-sm">
                        <label className="text-sm font-medium text-[#475569] mb-2 block">Add a new note</label>
                        <Textarea placeholder="Type your note here..." className="resize-none min-h-[80px]" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                        <div className="flex justify-end mt-3">
                          <Button size="sm" className="bg-[#0891B2] text-white" onClick={handleAddNote} disabled={savingNote || !newNote.trim()}>
                            {savingNote ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            {savingNote ? "Saving..." : "Save Note"}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {!internalNotes ? (
                          <div className="text-center py-10 text-[#94A3B8]">No notes yet. Add one above.</div>
                        ) : internalNotes.split('\n\n---\n\n').map((note, index) => (
                          <div key={index} className="bg-yellow-50/50 p-4 rounded-md border border-yellow-100">
                            <p className="text-[#0F172A] text-sm whitespace-pre-wrap">{note}</p>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    {/* Tasks */}
                    <TabsContent value="tasks" className="m-0 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-[#0F172A]">To-Do List</h3>
                        <Button variant="outline" size="sm" onClick={() => setIsTaskModalOpen(true)} className="bg-white hover:bg-[#F8FAFC]"><Plus className="h-3 w-3 mr-1" /> New Task</Button>
                      </div>
                      {tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mb-3"><CheckSquare className="h-6 w-6 text-orange-500" /></div>
                          <h4 className="text-sm font-semibold text-[#0F172A] mb-1">No Tasks Yet</h4>
                          <p className="text-xs text-[#475569]">Create a task to keep track of to-dos for this client.</p>
                        </div>
                      ) : tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 p-3 bg-white rounded-md hover:shadow-sm transition-shadow">
                          <Checkbox id={`task-${task.id}`} checked={task.completed} onCheckedChange={() => toggleTask(task.id)} />
                          <div className="flex-1">
                            <label htmlFor={`task-${task.id}`} className={`text-sm font-medium cursor-pointer ${task.completed ? 'text-[#94A3B8] line-through' : 'text-[#0F172A]'}`}>{task.title}</label>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${task.priority === 'High' ? 'bg-red-50 text-red-600' : task.priority === 'Medium' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>{task.priority}</span>
                              <span className="text-xs text-[#94A3B8] flex items-center gap-1"><Clock size={10} /> {task.dueDate}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </TabsContent>

                    {/* Documents */}
                    <TabsContent value="documents" className="m-0 space-y-6">
                      {loadingDocs ? (
                        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-[#0891B2] mr-2" size={20} /><span className="text-sm text-[#94A3B8]">Loading documents…</span></div>
                      ) : documents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4"><FolderOpen className="h-8 w-8 text-[#0891B2]" /></div>
                          <h3 className="text-lg font-semibold text-[#0F172A] mb-1">No Documents</h3>
                          <p className="text-sm text-[#475569] max-w-sm">Documents linked to this client will appear here.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {documents.map((doc: any) => {
                            const ext = doc.extension || doc.name?.split('.').pop() || '';
                            const sizeKb = doc.size ? (Number(doc.size) / 1024).toFixed(1) : '—';
                            return (
                              <div key={doc.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
                                <div className="w-9 h-9 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0"><FileText className="h-4 w-4 text-blue-600" /></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[#0F172A] truncate">{doc.originalName || doc.name}</p>
                                  <p className="text-xs text-[#94A3B8]">{sizeKb} KB · {ext.toUpperCase()} · {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : ''}</p>
                                </div>
                                <a href={doc.path} target="_blank" rel="noreferrer" className="text-[#0891B2] hover:text-[#0891B2]/80"><Download size={16} /></a>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    {/* Invoices */}
                    <TabsContent value="invoices" className="m-0 space-y-4">
                      {loadingInvoices ? (
                        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-[#0891B2] mr-2" size={20} /><span className="text-sm text-[#94A3B8]">Loading invoices…</span></div>
                      ) : invoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mb-3"><Receipt className="h-6 w-6 text-[#0891B2]" /></div>
                          <h4 className="text-sm font-semibold text-[#0F172A] mb-1">No Invoices</h4>
                          <p className="text-xs text-[#475569]">Invoices for this client will appear here.</p>
                          <Button variant="outline" size="sm" className="mt-4 text-[#0891B2] border-[#0891B2]/30 hover:bg-[#0891B2]/5" onClick={() => navigate('/invoice/create')}><Plus className="h-4 w-4 mr-1" /> Create Invoice</Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {invoices.map((inv: any) => {
                            const status = (inv.status || 'DRAFT').toString();
                            const statusColor = status === 'PAID' ? 'bg-green-100 text-green-700' : status === 'SENT' ? 'bg-blue-100 text-blue-700' : status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600';
                            const total = Number(inv.total) || 0;
                            const amountDue = Number(inv.amountDue) || (total - (Number(inv.amountPaid) || 0));
                            return (
                              <div key={inv.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => navigate('/invoice')}>
                                <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0"><Receipt className="h-4 w-4 text-[#0891B2]" /></div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-[#0F172A]">{inv.invoiceNumber || 'N/A'}</p>
                                    <Badge className={`text-[10px] px-2 py-0.5 ${statusColor}`}>{status}</Badge>
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-[#94A3B8]">{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : '—'}</span>
                                    <div className="text-right">
                                      <span className="text-sm font-bold text-[#0F172A]">{fmtCurrency(total, inv.currency || 'CAD')}</span>
                                      {amountDue > 0 && status !== 'PAID' && <span className="block text-[10px] text-amber-600">Due: {fmtCurrency(amountDue, inv.currency || 'CAD')}</span>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    {/* Mail */}
                    <TabsContent value="mail" className="m-0 space-y-4">
                      {loadingEmails ? (
                        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-[#0891B2] mr-2" size={20} /><span className="text-sm text-[#94A3B8]">Loading emails…</span></div>
                      ) : emails.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mb-3"><Mail className="h-6 w-6 text-purple-500" /></div>
                          <h4 className="text-sm font-semibold text-[#0F172A] mb-1">No Emails</h4>
                          <p className="text-xs text-[#475569]">Emails linked to this client will appear here.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {emails.map((email: any) => (
                            <div key={email.id} className={`flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:shadow-sm transition-shadow ${!email.isRead ? 'border-l-2 border-l-[#0891B2]' : ''}`}>
                              <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 mt-0.5"><Mail className="h-4 w-4 text-purple-600" /></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className={`text-sm truncate ${!email.isRead ? 'font-semibold text-[#0F172A]' : 'font-medium text-[#475569]'}`}>{email.subject || '(No Subject)'}</p>
                                  <span className="text-xs text-[#94A3B8] ml-2 whitespace-nowrap">{email.sentAt ? new Date(email.sentAt).toLocaleDateString() : ''}</span>
                                </div>
                                <p className="text-xs text-[#94A3B8] mt-0.5 truncate">{email.fromName || email.fromAddress || '—'}</p>
                                {email.bodyText && <p className="text-xs text-[#64748B] mt-1 line-clamp-2">{email.bodyText.slice(0, 150)}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-md shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold text-lg">Add New Task</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsTaskModalOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2"><label className="text-sm font-medium text-[#475569]">Task Title</label><Input placeholder="Enter task description..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} autoFocus /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium text-[#475569]">Due Date</label><Input type="date" value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} /></div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#475569]">Priority</label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value as any)}>
                    <option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 bg-[#F8FAFC] flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsTaskModalOpen(false)}>Cancel</Button>
              <Button className="bg-[#0891B2] hover:bg-[#0891B2]/80 text-white" onClick={handleAddTask} disabled={savingTask}>{savingTask ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}Add Task</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetailPage;
