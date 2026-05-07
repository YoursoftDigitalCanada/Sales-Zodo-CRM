import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  FileText,
  Kanban,
  List,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  StickyNote,
  Target,
  Trash2,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { getClients } from "@/features/clients/services/clients-service";
import { getLeadSources } from "@/features/leads/services/lead-sources-service";
import { getLeads } from "@/features/leads/services/leads-service";
import {
  createProject,
  deleteProjectById,
  getProjects,
  getSalesReps,
  updateProject,
  type ProjectEntity,
  type ProjectUserOption,
} from "@/features/projects/services/projects-service";
import { cn } from "@/lib/utils";

const DEAL_STATUSES = [
  { name: "Qualification", type: "Open", probability: 25, color: "#3B82F6" },
  { name: "Demo Scheduled", type: "Open", probability: 40, color: "#8B5CF6" },
  { name: "Demo Completed", type: "Open", probability: 45, color: "#0EA5E9" },
  { name: "Proposal Sent", type: "Open", probability: 50, color: "#6366F1" },
  { name: "Negotiation", type: "Open", probability: 60, color: "#F59E0B" },
  { name: "Won", type: "Won", probability: 100, color: "#10B981" },
  { name: "Lost", type: "Lost", probability: 0, color: "#EF4444" },
];

const EMPLOYEE_OPTIONS = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

const toNumber = (value: unknown) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const money = (value: unknown, currency = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(toNumber(value));

const dateLabel = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
};

const statusMeta = (status?: string | null) => DEAL_STATUSES.find((item) => item.name === status) || DEAL_STATUSES[0];

type DealFormState = {
  id?: string;
  organization: string;
  nextStep: string;
  dealStatus: string;
  dealOwnerId: string;
  probability: string;
  expectedDealValue: string;
  dealValue: string;
  expectedClosureDate: string;
  closedDate: string;
  clientId: string;
  leadId: string;
  sourceId: string;
  leadName: string;
  organizationName: string;
  website: string;
  noOfEmployees: string;
  jobTitle: string;
  territory: string;
  currency: string;
  exchangeRate: string;
  annualRevenue: string;
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
  mobileNo: string;
  phone: string;
  gender: string;
  contactId: string;
  total: string;
  netTotal: string;
  lostReason: string;
  lostNotes: string;
  description: string;
};

const emptyDealForm: DealFormState = {
  organization: "",
  nextStep: "",
  dealStatus: "Qualification",
  dealOwnerId: "",
  probability: "25",
  expectedDealValue: "",
  dealValue: "",
  expectedClosureDate: "",
  closedDate: "",
  clientId: "",
  leadId: "",
  sourceId: "",
  leadName: "",
  organizationName: "",
  website: "",
  noOfEmployees: "",
  jobTitle: "",
  territory: "",
  currency: "CAD",
  exchangeRate: "1",
  annualRevenue: "",
  salutation: "",
  firstName: "",
  lastName: "",
  email: "",
  mobileNo: "",
  phone: "",
  gender: "",
  contactId: "",
  total: "",
  netTotal: "",
  lostReason: "",
  lostNotes: "",
  description: "",
};

function readDealForm(deal: ProjectEntity): DealFormState {
  return {
    ...emptyDealForm,
    id: deal.id,
    organization: String(deal.organization || deal.organizationName || deal.name || ""),
    nextStep: String(deal.nextStep || ""),
    dealStatus: String(deal.dealStatus || "Qualification"),
    dealOwnerId: String(deal.dealOwnerId || deal.salesRepId || deal.projectManagerId || ""),
    probability: String(deal.probability ?? statusMeta(deal.dealStatus).probability),
    expectedDealValue: String(deal.expectedDealValue ?? deal.budget ?? ""),
    dealValue: String(deal.dealValue ?? deal.contractValue ?? ""),
    expectedClosureDate: String(deal.expectedClosureDate || deal.estimatedEndDate || "").slice(0, 10),
    closedDate: String(deal.closedDate || deal.actualEndDate || "").slice(0, 10),
    clientId: String(deal.clientId || deal.client?.id || ""),
    leadId: String(deal.leadId || deal.lead?.id || ""),
    sourceId: String(deal.sourceId || ""),
    leadName: String(deal.leadName || [deal.lead?.firstName, deal.lead?.lastName].filter(Boolean).join(" ") || ""),
    organizationName: String(deal.organizationName || deal.organization || deal.name || ""),
    website: String(deal.website || ""),
    noOfEmployees: String(deal.noOfEmployees || ""),
    jobTitle: String(deal.jobTitle || ""),
    territory: String(deal.territory || ""),
    currency: String(deal.currency || "CAD"),
    exchangeRate: String(deal.exchangeRate ?? "1"),
    annualRevenue: String(deal.annualRevenue ?? ""),
    salutation: String(deal.salutation || ""),
    firstName: String(deal.firstName || ""),
    lastName: String(deal.lastName || ""),
    email: String(deal.email || ""),
    mobileNo: String(deal.mobileNo || ""),
    phone: String(deal.phone || ""),
    gender: String(deal.gender || ""),
    contactId: String(deal.contactId || ""),
    total: String(deal.total ?? ""),
    netTotal: String(deal.netTotal ?? ""),
    lostReason: String(deal.lostReason || ""),
    lostNotes: String(deal.lostNotes || ""),
    description: String(deal.description || ""),
  };
}

function buildDealPayload(form: DealFormState) {
  const status = statusMeta(form.dealStatus);
  return {
    name: form.organization || form.organizationName || "Untitled Deal",
    description: form.description || null,
    clientId: form.clientId || null,
    leadId: form.leadId || null,
    salesRepId: form.dealOwnerId || null,
    projectManagerId: form.dealOwnerId || null,
    status: form.dealStatus === "Won" ? "COMPLETED" : form.dealStatus === "Lost" ? "CANCELLED" : "ACTIVE",
    projectType: "OTHER",
    propertyType: "COMMERCIAL",
    priority: form.dealStatus === "Negotiation" ? "HIGH" : "NORMAL",
    currency: form.currency || "CAD",
    organization: form.organization || form.organizationName || null,
    organizationName: form.organizationName || form.organization || null,
    nextStep: form.nextStep || null,
    dealStatus: form.dealStatus,
    dealOwnerId: form.dealOwnerId || null,
    probability: Number(form.probability || status.probability),
    expectedDealValue: form.expectedDealValue ? Number(form.expectedDealValue) : null,
    dealValue: form.dealValue ? Number(form.dealValue) : null,
    contractValue: form.dealValue ? Number(form.dealValue) : null,
    budget: form.expectedDealValue ? Number(form.expectedDealValue) : null,
    expectedClosureDate: form.expectedClosureDate || null,
    estimatedEndDate: form.expectedClosureDate || null,
    closedDate: form.closedDate || null,
    sourceId: form.sourceId || null,
    leadName: form.leadName || null,
    website: form.website || null,
    noOfEmployees: form.noOfEmployees || null,
    jobTitle: form.jobTitle || null,
    territory: form.territory || null,
    exchangeRate: Number(form.exchangeRate || 1),
    annualRevenue: form.annualRevenue ? Number(form.annualRevenue) : null,
    salutation: form.salutation || null,
    firstName: form.firstName || null,
    lastName: form.lastName || null,
    email: form.email || null,
    mobileNo: form.mobileNo || form.phone || null,
    phone: form.phone || form.mobileNo || null,
    gender: form.gender || null,
    contactId: form.contactId || null,
    total: form.total ? Number(form.total) : form.dealValue ? Number(form.dealValue) : null,
    netTotal: form.netTotal ? Number(form.netTotal) : form.dealValue ? Number(form.dealValue) : null,
    lostReason: form.lostReason || null,
    lostNotes: form.lostNotes || null,
  } as any;
}

function DealModal({
  open,
  onOpenChange,
  initialDeal,
  owners,
  clients,
  leads,
  sources,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDeal: ProjectEntity | null;
  owners: ProjectUserOption[];
  clients: Array<{ id: string; name: string }>;
  leads: Array<{ id: string; name: string; email?: string; phone?: string; organization?: string }>;
  sources: Array<{ id: string; name: string }>;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<DealFormState>(emptyDealForm);

  useEffect(() => {
    setForm(initialDeal ? readDealForm(initialDeal) : emptyDealForm);
  }, [initialDeal, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildDealPayload(form);
      return form.id ? updateProject(form.id, payload) : createProject(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      onOpenChange(false);
      toast({ title: "Deal saved" });
    },
    onError: (error: any) => {
      toast({ title: "Deal save failed", description: error?.response?.data?.message || error?.message, variant: "destructive" });
    },
  });

  const set = (key: keyof DealFormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const selectLead = (id: string) => {
    const lead = leads.find((item) => item.id === id);
    setForm((current) => ({
      ...current,
      leadId: id,
      leadName: lead?.name || current.leadName,
      organization: lead?.organization || current.organization,
      organizationName: lead?.organization || current.organizationName,
      email: lead?.email || current.email,
      mobileNo: lead?.phone || current.mobileNo,
      phone: lead?.phone || current.phone,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit Deal" : "Create Deal"}</DialogTitle>
          <DialogDescription>CRM-develop style deal fields with links to lead, organization, source, owner, activities, and revenue.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="organization" className="mt-2">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="organization">Organization</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="lead">Lead</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="lost">Lost Details</TabsTrigger>
          </TabsList>

          <TabsContent value="organization" className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Organization</Label>
                <Input value={form.organization} onChange={(event) => set("organization", event.target.value)} placeholder="Organization" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.dealStatus}
                  onValueChange={(value) => {
                    const meta = statusMeta(value);
                    setForm((current) => ({ ...current, dealStatus: value, probability: String(meta.probability) }));
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEAL_STATUSES.map((status) => (
                      <SelectItem key={status.name} value={status.name}>{status.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Next Step</Label>
                <Input value={form.nextStep} onChange={(event) => set("nextStep", event.target.value)} placeholder="Send proposal, book call..." />
              </div>
              <div className="space-y-2">
                <Label>Deal Owner</Label>
                <Select value={form.dealOwnerId || "unassigned"} onValueChange={(value) => set("dealOwnerId", value === "unassigned" ? "" : value)}>
                  <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {owners.map((owner) => <SelectItem key={owner.id} value={String(owner.id)}>{owner.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Probability</Label>
                <Input type="number" min="0" max="100" value={form.probability} onChange={(event) => set("probability", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Expected Closure Date</Label>
                <Input type="date" value={form.expectedClosureDate} onChange={(event) => set("expectedClosureDate", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Expected Deal Value</Label>
                <Input type="number" min="0" value={form.expectedDealValue} onChange={(event) => set("expectedDealValue", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Deal Value</Label>
                <Input type="number" min="0" value={form.dealValue} onChange={(event) => set("dealValue", event.target.value)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Primary Account</Label>
                <Select value={form.clientId || "none"} onValueChange={(value) => set("clientId", value === "none" ? "" : value)}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No account</SelectItem>
                    {clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input value={form.organizationName} onChange={(event) => set("organizationName", event.target.value)} />
              </div>
              <div className="space-y-2"><Label>Salutation</Label><Input value={form.salutation} onChange={(event) => set("salutation", event.target.value)} /></div>
              <div className="space-y-2"><Label>Gender</Label><Input value={form.gender} onChange={(event) => set("gender", event.target.value)} /></div>
              <div className="space-y-2"><Label>First Name</Label><Input value={form.firstName} onChange={(event) => set("firstName", event.target.value)} /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input value={form.lastName} onChange={(event) => set("lastName", event.target.value)} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(event) => set("email", event.target.value)} /></div>
              <div className="space-y-2"><Label>Mobile No.</Label><Input value={form.mobileNo} onChange={(event) => set("mobileNo", event.target.value)} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(event) => set("phone", event.target.value)} /></div>
              <div className="space-y-2"><Label>Job Title</Label><Input value={form.jobTitle} onChange={(event) => set("jobTitle", event.target.value)} /></div>
            </div>
          </TabsContent>

          <TabsContent value="lead" className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Lead</Label>
                <Select value={form.leadId || "none"} onValueChange={(value) => value === "none" ? set("leadId", "") : selectLead(value)}>
                  <SelectTrigger><SelectValue placeholder="Select lead" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No lead</SelectItem>
                    {leads.map((lead) => <SelectItem key={lead.id} value={lead.id}>{lead.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Lead Name</Label><Input value={form.leadName} onChange={(event) => set("leadName", event.target.value)} /></div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={form.sourceId || "none"} onValueChange={(value) => set("sourceId", value === "none" ? "" : value)}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No source</SelectItem>
                    {sources.map((source) => <SelectItem key={source.id} value={source.id}>{source.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Website</Label><Input value={form.website} onChange={(event) => set("website", event.target.value)} /></div>
              <div className="space-y-2">
                <Label>No. of Employees</Label>
                <Select value={form.noOfEmployees || "none"} onValueChange={(value) => set("noOfEmployees", value === "none" ? "" : value)}>
                  <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    {EMPLOYEE_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Territory</Label><Input value={form.territory} onChange={(event) => set("territory", event.target.value)} /></div>
              <div className="space-y-2"><Label>Annual Revenue</Label><Input type="number" min="0" value={form.annualRevenue} onChange={(event) => set("annualRevenue", event.target.value)} /></div>
            </div>
          </TabsContent>

          <TabsContent value="products" className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Currency</Label><Input value={form.currency} onChange={(event) => set("currency", event.target.value)} /></div>
              <div className="space-y-2"><Label>Exchange Rate</Label><Input type="number" min="0" value={form.exchangeRate} onChange={(event) => set("exchangeRate", event.target.value)} /></div>
              <div className="space-y-2"><Label>Total</Label><Input type="number" min="0" value={form.total} onChange={(event) => set("total", event.target.value)} /></div>
              <div className="space-y-2"><Label>Net Total</Label><Input type="number" min="0" value={form.netTotal} onChange={(event) => set("netTotal", event.target.value)} /></div>
            </div>
            <Textarea value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="Products, package, scope, or notes" rows={4} />
          </TabsContent>

          <TabsContent value="lost" className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Lost Reason</Label><Input value={form.lostReason} onChange={(event) => set("lostReason", event.target.value)} placeholder="Price, timing, no fit..." /></div>
              <div className="space-y-2"><Label>Closed Date</Label><Input type="date" value={form.closedDate} onChange={(event) => set("closedDate", event.target.value)} /></div>
            </div>
            <Textarea value={form.lostNotes} onChange={(event) => set("lostNotes", event.target.value)} placeholder="Lost notes" rows={4} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-[#0F766E] hover:bg-[#115E59]">
            {saveMutation.isPending ? "Saving..." : "Save Deal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DealsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "kanban" | "group">("list");
  const [query, setQuery] = useState("");
  const [editingDeal, setEditingDeal] = useState<ProjectEntity | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const dealsQuery = useQuery({ queryKey: ["deals"], queryFn: () => getProjects({ limit: 200, sortBy: "updatedAt", sortOrder: "desc" }) });
  const ownersQuery = useQuery({ queryKey: ["deal-owners"], queryFn: getSalesReps });
  const clientsQuery = useQuery({
    queryKey: ["deal-clients"],
    queryFn: async () =>
      (await getClients()).map((client: any) => ({
        id: String(client.id || client.Id),
        name: String(client.clientName || client.ClientName || client.name || client.Name || "Account"),
      })).filter((client) => client.id && client.id !== "undefined"),
  });
  const leadsQuery = useQuery({
    queryKey: ["deal-leads"],
    queryFn: async () =>
      (await getLeads({ limit: 200 })).map((lead: any) => ({
        id: String(lead.id),
        name: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.fullName || "Lead",
        email: lead.email,
        phone: lead.mobileNo || lead.phone,
        organization: lead.organization || lead.companyName,
      })),
  });
  const sourcesQuery = useQuery({
    queryKey: ["deal-sources"],
    queryFn: async () => (await getLeadSources({ limit: 200 })).map((source: any) => ({ id: String(source.id), name: String(source.name || "") })),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProjectById,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast({ title: "Deal deleted" });
    },
    onError: (error: any) => toast({ title: "Delete failed", description: error?.message, variant: "destructive" }),
  });

  const allDeals = dealsQuery.data || [];
  const filteredDeals = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return allDeals;
    return allDeals.filter((deal) =>
      [
        deal.organization,
        deal.organizationName,
        deal.name,
        deal.leadName,
        deal.email,
        deal.mobileNo,
        deal.phone,
        deal.dealStatus,
      ].some((value) => String(value || "").toLowerCase().includes(term))
    );
  }, [allDeals, query]);

  const totals = useMemo(() => {
    const open = filteredDeals.filter((deal) => !["Won", "Lost"].includes(String(deal.dealStatus)));
    return {
      total: filteredDeals.length,
      open: open.length,
      won: filteredDeals.filter((deal) => deal.dealStatus === "Won").length,
      value: filteredDeals.reduce((sum, deal) => sum + toNumber(deal.dealValue ?? deal.contractValue), 0),
      expected: filteredDeals.reduce((sum, deal) => sum + toNumber(deal.expectedDealValue ?? deal.budget), 0),
    };
  }, [filteredDeals]);

  const openCreate = (status?: string) => {
    setEditingDeal(status ? ({ id: "", dealStatus: status, probability: statusMeta(status).probability } as any) : null);
    setModalOpen(true);
  };

  const openEdit = (deal: ProjectEntity) => {
    setEditingDeal(deal);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h1 className="text-2xl font-semibold text-[#0F172A]">Deals</h1>
            <p className="text-sm text-[#64748B]">Track organization opportunities, owners, source, value, probability, closure, and related activity.</p>
          </div>
          <Button onClick={() => openCreate()} className="gap-2 bg-[#0F766E] hover:bg-[#115E59]">
            <Plus size={16} />
            Create
          </Button>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          {[
            { label: "Total Deals", value: totals.total, icon: Target },
            { label: "Open Deals", value: totals.open, icon: Clock },
            { label: "Won", value: totals.won, icon: CheckCircle2 },
            { label: "Pipeline Value", value: money(totals.value), icon: CircleDollarSign },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-[#E2E8F0] bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">{item.label}</p>
                  <p className="mt-1 text-xl font-semibold text-[#0F172A]">{item.value}</p>
                </div>
                <item.icon size={20} className="text-[#0F766E]" />
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search deals" className="pl-9" />
          </div>
          <Tabs value={view} onValueChange={(value) => setView(value as any)}>
            <TabsList>
              <TabsTrigger value="list" className="gap-2"><List size={14} />List</TabsTrigger>
              <TabsTrigger value="kanban" className="gap-2"><Kanban size={14} />Kanban</TabsTrigger>
              <TabsTrigger value="group" className="gap-2"><Building2 size={14} />Group</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {view === "list" && (
          <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F8FAFC]">
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Probability</TableHead>
                  <TableHead>Close Date</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.map((deal) => {
                  const meta = statusMeta(deal.dealStatus);
                  const owner = ownersQuery.data?.find((item) => String(item.id) === String(deal.dealOwnerId || deal.salesRepId || deal.projectManagerId));
                  return (
                    <TableRow key={deal.id} className="cursor-pointer" onClick={() => openEdit(deal)}>
                      <TableCell>
                        <div className="font-medium text-[#0F172A]">{deal.organization || deal.organizationName || deal.name}</div>
                        <div className="text-xs text-[#64748B]">{deal.nextStep || deal.leadName || "No next step"}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {deal.leadId ? <Badge variant="outline" className="border-[#B2F5EA] bg-[#F0FDFA] text-[10px] text-[#0F766E]">Lead linked</Badge> : null}
                          {deal.clientId || deal.client ? <Badge variant="outline" className="border-[#BFDBFE] bg-[#EFF6FF] text-[10px] text-[#1D4ED8]">Account linked</Badge> : null}
                          {deal.contactId ? <Badge variant="outline" className="border-[#DDD6FE] bg-[#F5F3FF] text-[10px] text-[#6D28D9]">Decision contact</Badge> : null}
                          {deal.quoteId || deal.quote ? <Badge variant="outline" className="border-[#FDE68A] bg-[#FFFBEB] text-[10px] text-[#B45309]">Proposal ready</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell><Badge style={{ backgroundColor: `${meta.color}18`, color: meta.color }}>{deal.dealStatus || "Qualification"}</Badge></TableCell>
                      <TableCell>{owner?.name || "Unassigned"}</TableCell>
                      <TableCell>{money(deal.dealValue ?? deal.contractValue, String(deal.currency || "CAD"))}</TableCell>
                      <TableCell>{toNumber(deal.probability ?? meta.probability)}%</TableCell>
                      <TableCell>{dateLabel(deal.expectedClosureDate || deal.estimatedEndDate)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 text-[#64748B]">
                          <span className="flex items-center gap-1"><Mail size={14} />{deal._count?.emails || 0}</span>
                          <span className="flex items-center gap-1"><StickyNote size={14} />{deal._count?.projectNotes || 0}</span>
                          <span className="flex items-center gap-1"><FileText size={14} />{deal._count?.projectTasks || 0}</span>
                          <span className="flex items-center gap-1"><MessageSquare size={14} />{deal._count?.projectCommunications || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal size={16} /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(deal)}><Pencil size={14} className="mr-2" />Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteMutation.mutate(deal.id)} className="text-red-600"><Trash2 size={14} className="mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {view === "kanban" && (
          <div className="grid gap-4 lg:grid-cols-4">
            {DEAL_STATUSES.map((status) => {
              const deals = filteredDeals.filter((deal) => (deal.dealStatus || "Qualification") === status.name);
              return (
                <section key={status.name} className="min-h-[520px] rounded-lg border border-[#E2E8F0] bg-white">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                      <h2 className="font-semibold text-[#0F172A]">{status.name}</h2>
                      <Badge variant="secondary">{deals.length}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openCreate(status.name)}><Plus size={16} /></Button>
                  </div>
                  <div className="space-y-3 p-3">
                    {deals.map((deal) => (
                      <button key={deal.id} onClick={() => openEdit(deal)} className="w-full rounded-lg border border-[#E2E8F0] bg-white p-3 text-left hover:border-[#0F766E]/40 hover:shadow-sm">
                        <div className="font-medium text-[#0F172A]">{deal.organization || deal.organizationName || deal.name}</div>
                        <div className="mt-1 text-sm text-[#64748B]">{deal.nextStep || "No next step"}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {deal.leadId ? <span className="rounded border border-[#B2F5EA] bg-[#F0FDFA] px-1.5 py-0.5 text-[10px] font-medium text-[#0F766E]">Lead</span> : null}
                          {deal.clientId || deal.client ? <span className="rounded border border-[#BFDBFE] bg-[#EFF6FF] px-1.5 py-0.5 text-[10px] font-medium text-[#1D4ED8]">Account</span> : null}
                          {deal.contactId ? <span className="rounded border border-[#DDD6FE] bg-[#F5F3FF] px-1.5 py-0.5 text-[10px] font-medium text-[#6D28D9]">Contact</span> : null}
                          {deal.quoteId || deal.quote ? <span className="rounded border border-[#FDE68A] bg-[#FFFBEB] px-1.5 py-0.5 text-[10px] font-medium text-[#B45309]">Proposal</span> : null}
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm">
                          <span className="font-semibold text-[#0F766E]">{money(deal.dealValue ?? deal.contractValue, String(deal.currency || "CAD"))}</span>
                          <span className="text-[#64748B]">{toNumber(deal.probability ?? status.probability)}%</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {view === "group" && (
          <div className="space-y-4">
            {DEAL_STATUSES.map((status) => {
              const deals = filteredDeals.filter((deal) => (deal.dealStatus || "Qualification") === status.name);
              if (!deals.length) return null;
              return (
                <div key={status.name} className="rounded-lg border border-[#E2E8F0] bg-white">
                  <div className="flex items-center gap-2 border-b border-[#E2E8F0] px-4 py-3">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                    <h2 className="font-semibold text-[#0F172A]">{status.name}</h2>
                    <Badge variant="secondary">{deals.length}</Badge>
                  </div>
                  <div className="divide-y divide-[#E2E8F0]">
                    {deals.map((deal) => (
                      <button key={deal.id} onClick={() => openEdit(deal)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#F8FAFC]">
                        <div>
                          <div className="font-medium text-[#0F172A]">{deal.organization || deal.name}</div>
                          <div className="text-sm text-[#64748B]">{deal.email || deal.mobileNo || deal.leadName || "No contact"}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-[#0F766E]">{money(deal.dealValue ?? deal.contractValue, String(deal.currency || "CAD"))}</div>
                          <div className="text-sm text-[#64748B]">{dateLabel(deal.expectedClosureDate || deal.estimatedEndDate)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <DealModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialDeal={editingDeal?.id ? editingDeal : editingDeal}
        owners={ownersQuery.data || []}
        clients={clientsQuery.data || []}
        leads={leadsQuery.data || []}
        sources={sourcesQuery.data || []}
      />
    </div>
  );
}
