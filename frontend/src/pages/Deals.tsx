import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  FileText,
  GitBranch,
  Kanban,
  List,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Sparkles,
  StickyNote,
  Target,
  Trash2,
  User,
  X,
} from "lucide-react";
import { ActivityTimeline } from "@/components/ActivityTimeline";
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
import { getCalendarEvents } from "@/features/calendar/services/calendar-service";
import { getClients } from "@/features/clients/services/clients-service";
import { getLeadSources } from "@/features/leads/services/lead-sources-service";
import { getLeads } from "@/features/leads/services/leads-service";
import {
  createDeal,
  createProjectTask,
  deleteProjectById,
  getProjectById,
  getProjects,
  getSalesReps,
  markDealLost,
  markDealWon,
  moveDealStage,
  updateDeal,
  type ProjectEntity,
  type ProjectUserOption,
} from "@/features/projects/services/projects-service";
import { cn } from "@/lib/utils";

const DEAL_STATUSES = [
  { name: "Qualification", type: "Open", probability: 25, color: "#2563EB" },
  { name: "Demo Scheduled", type: "Open", probability: 40, color: "#7C3AED" },
  { name: "Demo Completed", type: "Open", probability: 45, color: "#0D9488" },
  { name: "Proposal Sent", type: "Open", probability: 50, color: "#4F46E5" },
  { name: "Negotiation", type: "Open", probability: 60, color: "#D97706" },
  { name: "Won", type: "Won", probability: 100, color: "#059669" },
  { name: "Lost", type: "Lost", probability: 0, color: "#DC2626" },
];

const EMPLOYEE_OPTIONS = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

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

type PipelineFilters = {
  owner: string;
  stage: string;
  source: string;
  closeFrom: string;
  closeTo: string;
  minValue: string;
  maxValue: string;
  state: string;
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

const defaultFilters: PipelineFilters = {
  owner: "all",
  stage: "all",
  source: "all",
  closeFrom: "",
  closeTo: "",
  minValue: "",
  maxValue: "",
  state: "all",
};

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

const normalizeStage = (stage?: string | null) => {
  const value = String(stage || "Qualification").trim();
  return DEAL_STATUSES.some((item) => item.name === value) ? value : "Qualification";
};

const statusMeta = (status?: string | null) => DEAL_STATUSES.find((item) => item.name === normalizeStage(status)) || DEAL_STATUSES[0];
const ownerId = (deal: ProjectEntity) => String(deal.dealOwnerId || deal.salesRepId || deal.projectManagerId || "");
const accountName = (deal: ProjectEntity) => deal.client?.clientName || deal.organizationName || deal.organization || deal.name || "Account";
const contactName = (deal: ProjectEntity) =>
  String((deal.contacts as any[])?.find((item) => item.isPrimary)?.contact?.contactName || [deal.firstName, deal.lastName].filter(Boolean).join(" ") || deal.leadName || "No contact");
const dealValue = (deal: ProjectEntity) => toNumber(deal.dealValue ?? deal.contractValue ?? deal.expectedDealValue ?? deal.budget ?? deal.total);

function readDealForm(deal: ProjectEntity): DealFormState {
  return {
    ...emptyDealForm,
    id: deal.id,
    organization: String(deal.organization || deal.organizationName || deal.name || ""),
    nextStep: String(deal.nextStep || ""),
    dealStatus: normalizeStage(deal.dealStatus),
    dealOwnerId: ownerId(deal),
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
  const stage = statusMeta(form.dealStatus);
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
    probability: Number(form.probability || stage.probability),
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

function linkedCount(deal: ProjectEntity, key: string) {
  const value = (deal as any)[key];
  if (Array.isArray(value)) return value.length;
  return deal._count?.[key] || 0;
}

function EmptyLinkedSection({ label, action, onClick }: { label: string; action: string; onClick: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-5 text-center">
      <p className="text-sm font-medium text-[#0F172A]">{label}</p>
      <Button variant="outline" size="sm" onClick={onClick} className="mt-3">{action}</Button>
    </div>
  );
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

  const validate = () => {
    if (!form.clientId) {
      toast({ title: "Account required", description: "Every deal must belong to an Account.", variant: "destructive" });
      return false;
    }
    if (!form.contactId && !form.firstName && !form.lastName && !form.email && !form.phone && !form.mobileNo) {
      toast({ title: "Contact required", description: "Add or select at least one Contact for this deal.", variant: "destructive" });
      return false;
    }
    if (form.dealStatus === "Won" && !toNumber(form.dealValue || form.total || form.expectedDealValue)) {
      toast({ title: "Deal value required", description: "Won deals must have a value.", variant: "destructive" });
      return false;
    }
    if (form.dealStatus === "Lost" && !form.lostReason.trim()) {
      toast({ title: "Lost reason required", description: "Add the reason before marking this deal Lost.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!validate()) return null;
      const payload = buildDealPayload(form);
      return form.id ? updateDeal(form.id, payload) : createDeal(payload);
    },
    onSuccess: (deal) => {
      if (!deal) return;
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deal-detail"] });
      onOpenChange(false);
      toast({ title: "Deal saved" });
    },
    onError: (error: any) => {
      toast({ title: "Deal save failed", description: error?.response?.data?.message || error?.message, variant: "destructive" });
    },
  });

  const set = (key: keyof DealFormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

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
          <DialogDescription>Capture the account, contact, value, stage, owner, and next action for this sales opportunity.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="organization" className="mt-2">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="organization">Account</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="lead">Lead</TabsTrigger>
            <TabsTrigger value="value">Value</TabsTrigger>
            <TabsTrigger value="lost">Lost Details</TabsTrigger>
          </TabsList>

          <TabsContent value="organization" className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Deal Name</Label>
                <Input value={form.organization} onChange={(event) => set("organization", event.target.value)} placeholder="Account expansion, new subscription..." />
              </div>
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select
                  value={form.dealStatus}
                  onValueChange={(value) => {
                    const meta = statusMeta(value);
                    setForm((current) => ({ ...current, dealStatus: value, probability: String(meta.probability) }));
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEAL_STATUSES.map((status) => <SelectItem key={status.name} value={status.name}>{status.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Account *</Label>
                <Select value={form.clientId || "none"} onValueChange={(value) => set("clientId", value === "none" ? "" : value)}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select account</SelectItem>
                    {clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Account Name</Label><Input value={form.organizationName} onChange={(event) => set("organizationName", event.target.value)} /></div>
              <div className="space-y-2">
                <Label>Owner</Label>
                <Select value={form.dealOwnerId || "unassigned"} onValueChange={(value) => set("dealOwnerId", value === "unassigned" ? "" : value)}>
                  <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {owners.map((owner) => <SelectItem key={owner.id} value={String(owner.id)}>{owner.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Next Step</Label><Input value={form.nextStep} onChange={(event) => set("nextStep", event.target.value)} placeholder="Schedule demo, send proposal..." /></div>
              <div className="space-y-2"><Label>Probability</Label><Input type="number" min="0" max="100" value={form.probability} onChange={(event) => set("probability", event.target.value)} /></div>
              <div className="space-y-2"><Label>Expected Close Date</Label><Input type="date" value={form.expectedClosureDate} onChange={(event) => set("expectedClosureDate", event.target.value)} /></div>
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>First Name</Label><Input value={form.firstName} onChange={(event) => set("firstName", event.target.value)} /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input value={form.lastName} onChange={(event) => set("lastName", event.target.value)} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(event) => set("email", event.target.value)} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(event) => set("phone", event.target.value)} /></div>
              <div className="space-y-2"><Label>Mobile No.</Label><Input value={form.mobileNo} onChange={(event) => set("mobileNo", event.target.value)} /></div>
              <div className="space-y-2"><Label>Role / Title</Label><Input value={form.jobTitle} onChange={(event) => set("jobTitle", event.target.value)} /></div>
              <div className="space-y-2"><Label>Salutation</Label><Input value={form.salutation} onChange={(event) => set("salutation", event.target.value)} /></div>
              <div className="space-y-2"><Label>Gender</Label><Input value={form.gender} onChange={(event) => set("gender", event.target.value)} /></div>
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
                <Label>Company Size</Label>
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

          <TabsContent value="value" className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Expected Deal Value</Label><Input type="number" min="0" value={form.expectedDealValue} onChange={(event) => set("expectedDealValue", event.target.value)} /></div>
              <div className="space-y-2"><Label>Deal Value</Label><Input type="number" min="0" value={form.dealValue} onChange={(event) => set("dealValue", event.target.value)} /></div>
              <div className="space-y-2"><Label>Currency</Label><Input value={form.currency} onChange={(event) => set("currency", event.target.value)} /></div>
              <div className="space-y-2"><Label>Exchange Rate</Label><Input type="number" min="0" value={form.exchangeRate} onChange={(event) => set("exchangeRate", event.target.value)} /></div>
              <div className="space-y-2"><Label>Total</Label><Input type="number" min="0" value={form.total} onChange={(event) => set("total", event.target.value)} /></div>
              <div className="space-y-2"><Label>Net Total</Label><Input type="number" min="0" value={form.netTotal} onChange={(event) => set("netTotal", event.target.value)} /></div>
            </div>
            <Textarea value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="Package, seats, requirements, or notes" rows={4} />
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

function DealDetailDialog({
  deal,
  open,
  onOpenChange,
  onEdit,
  onStageAction,
  onCreateTask,
}: {
  deal: ProjectEntity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (deal: ProjectEntity) => void;
  onStageAction: (deal: ProjectEntity, stage: string) => void;
  onCreateTask: (deal: ProjectEntity) => void;
}) {
  const detailQuery = useQuery({
    queryKey: ["deal-detail", deal?.id],
    queryFn: () => getProjectById(deal!.id),
    enabled: open && Boolean(deal?.id),
  });
  const meetingsQuery = useQuery({
    queryKey: ["deal-meetings", deal?.id],
    queryFn: () => getCalendarEvents({ referenceDoctype: "DealAutomation", referenceDocname: `${deal!.id}:demo` }),
    enabled: open && Boolean(deal?.id),
  });

  const current = detailQuery.data || deal;
  if (!current) return null;
  const stage = statusMeta(current.dealStatus);
  const contacts = ((current.contacts as any[]) || []).map((item) => item.contact || item);
  const tasks = ((current as any).projectTasks || []) as any[];
  const emails = ((current as any).emails || []) as any[];
  const invoices = ((current as any).invoices || []) as any[];
  const subscriptions = ((current as any).customerSubscriptions || []) as any[];
  const meetings = meetingsQuery.data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {accountName(current)}
            <Badge style={{ backgroundColor: `${stage.color}18`, color: stage.color }}>{stage.name}</Badge>
          </DialogTitle>
          <DialogDescription>{current.nextStep || "No next action yet"}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-[#E2E8F0] p-3"><p className="text-xs text-[#64748B]">Deal Value</p><p className="font-semibold text-[#0F172A]">{money(dealValue(current), String(current.currency || "CAD"))}</p></div>
          <div className="rounded-lg border border-[#E2E8F0] p-3"><p className="text-xs text-[#64748B]">Probability</p><p className="font-semibold text-[#0F172A]">{toNumber(current.probability ?? stage.probability)}%</p></div>
          <div className="rounded-lg border border-[#E2E8F0] p-3"><p className="text-xs text-[#64748B]">Expected Close</p><p className="font-semibold text-[#0F172A]">{dateLabel(current.expectedClosureDate || current.estimatedEndDate)}</p></div>
          <div className="rounded-lg border border-[#E2E8F0] p-3"><p className="text-xs text-[#64748B]">Primary Contact</p><p className="font-semibold text-[#0F172A]">{contactName(current)}</p></div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => window.location.assign(`/ai/sales-assistant?dealId=${current.id}`)} variant="outline"><Sparkles size={14} className="mr-2" />Ask AI</Button>
          <Button size="sm" onClick={() => window.location.assign(`/ai/deal-insights?dealId=${current.id}`)} variant="outline"><Target size={14} className="mr-2" />AI Insight</Button>
          <Button size="sm" onClick={() => window.location.assign(`/ai/email-generator?dealId=${current.id}`)} variant="outline"><Mail size={14} className="mr-2" />Generate Email</Button>
          <Button size="sm" onClick={() => window.location.assign(`/mail?dealId=${current.id}`)} variant="outline"><Mail size={14} className="mr-2" />Send Email</Button>
          <Button size="sm" onClick={() => window.location.assign(`/calls?dealId=${current.id}`)} variant="outline"><Phone size={14} className="mr-2" />Log Call</Button>
          <Button size="sm" onClick={() => onStageAction(current, "Demo Scheduled")} variant="outline"><CalendarDays size={14} className="mr-2" />Schedule Demo</Button>
          <Button size="sm" onClick={() => onStageAction(current, "Proposal Sent")} variant="outline"><FileText size={14} className="mr-2" />Send Proposal</Button>
          <Button size="sm" onClick={() => window.location.assign(`/proposals?dealId=${current.id}&create=1`)} variant="outline"><FileText size={14} className="mr-2" />Create Proposal</Button>
          <Button size="sm" onClick={() => window.location.assign(`/contracts?dealId=${current.id}&create=1`)} variant="outline"><FileText size={14} className="mr-2" />Create Contract</Button>
          <Button size="sm" onClick={() => window.location.assign(`/invoice/create?dealId=${current.id}`)} variant="outline"><CircleDollarSign size={14} className="mr-2" />Create Invoice</Button>
          <Button size="sm" onClick={() => window.location.assign(`/documents?linkedEntityType=Deal&linkedEntityId=${current.id}`)} variant="outline"><FileText size={14} className="mr-2" />Upload Document</Button>
          <Button size="sm" onClick={() => window.location.assign(`/notes?dealId=${current.id}`)} variant="outline"><StickyNote size={14} className="mr-2" />Add Note</Button>
          <Button size="sm" onClick={() => window.location.assign(`/sequences?targetType=Deal&targetId=${current.id}`)} variant="outline"><GitBranch size={14} className="mr-2" />Start Sequence</Button>
          <Button size="sm" onClick={() => onStageAction(current, "Won")} className="bg-[#0F766E] hover:bg-[#115E59]"><CheckCircle2 size={14} className="mr-2" />Mark Won</Button>
          <Button size="sm" onClick={() => onStageAction(current, "Lost")} variant="outline">Mark Lost</Button>
          <Button size="sm" onClick={() => onEdit(current)} variant="outline"><Pencil size={14} className="mr-2" />Edit</Button>
        </div>

        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="flex w-full justify-start overflow-x-auto">
            {["Overview", "Contacts", "Tasks", "Meetings", "Emails", "Proposal", "Billing", "Activity Timeline"].map((tab) => (
              <TabsTrigger key={tab} value={tab.toLowerCase().replace(/\s+/g, "-")}>{tab}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-4 pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-[#E2E8F0] p-4">
                <h3 className="font-semibold text-[#0F172A]">Account</h3>
                <p className="mt-2 text-sm text-[#64748B]">{current.client?.clientName || current.organizationName || "No account linked"}</p>
                <p className="text-sm text-[#64748B]">{current.client?.primaryEmail || current.email || "No email"}</p>
                <p className="text-sm text-[#64748B]">{current.client?.primaryPhone || current.phone || current.mobileNo || "No phone"}</p>
              </div>
              <div className="rounded-lg border border-[#E2E8F0] p-4">
                <h3 className="font-semibold text-[#0F172A]">Next Action</h3>
                <p className="mt-2 text-sm text-[#64748B]">{current.nextStep || "Create a next action so the opportunity keeps moving."}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="space-y-3 pt-4">
            {contacts.length ? contacts.map((contact: any) => (
              <div key={contact.id || contact.email} className="rounded-lg border border-[#E2E8F0] p-4">
                <p className="font-medium text-[#0F172A]">{contact.contactName || [current.firstName, current.lastName].filter(Boolean).join(" ") || "Contact"}</p>
                <p className="text-sm text-[#64748B]">{contact.email || current.email || "No email"}</p>
                <p className="text-sm text-[#64748B]">{contact.mobilePhone || contact.officePhone || current.phone || current.mobileNo || "No phone"}</p>
              </div>
            )) : <EmptyLinkedSection label="No contacts linked" action="Edit deal" onClick={() => onEdit(current)} />}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-3 pt-4">
            {tasks.length ? tasks.map((task) => (
              <div key={task.id} className="rounded-lg border border-[#E2E8F0] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-[#0F172A]">{task.title}</p>
                  <Badge variant="outline">{task.status || "TODO"}</Badge>
                </div>
                <p className="text-sm text-[#64748B]">{task.description || "No description"}</p>
                <p className="mt-1 text-xs text-[#94A3B8]">Due {dateLabel(task.dueDate)}</p>
              </div>
            )) : <EmptyLinkedSection label="No tasks yet" action="Create Task" onClick={() => onCreateTask(current)} />}
          </TabsContent>

          <TabsContent value="meetings" className="space-y-3 pt-4">
            {meetings.length ? meetings.map((meeting: any) => (
              <div key={meeting.id} className="rounded-lg border border-[#E2E8F0] p-4">
                <p className="font-medium text-[#0F172A]">{String(meeting.title || "Meeting")}</p>
                <p className="text-sm text-[#64748B]">{dateLabel(String(meeting.startTime || meeting.start))}</p>
              </div>
            )) : <EmptyLinkedSection label="No meeting scheduled" action="Schedule Demo" onClick={() => onStageAction(current, "Demo Scheduled")} />}
          </TabsContent>

          <TabsContent value="emails" className="space-y-3 pt-4">
            {emails.length ? emails.map((email: any) => (
              <div key={email.id} className="rounded-lg border border-[#E2E8F0] p-4">
                <p className="font-medium text-[#0F172A]">{email.subject || "Email"}</p>
                <p className="text-sm text-[#64748B]">{email.status || "DRAFT"} · {dateLabel(email.createdAt)}</p>
              </div>
            )) : <EmptyLinkedSection label="No emails linked" action="Send Email" onClick={() => window.location.assign("/mail")} />}
          </TabsContent>

          <TabsContent value="proposal" className="pt-4">
            {current.quote ? (
              <div className="rounded-lg border border-[#E2E8F0] p-4">
                <p className="font-medium text-[#0F172A]">{current.quote.quoteNumber || "Proposal"}</p>
                <p className="text-sm text-[#64748B]">Status: {current.quote.status || "Draft"}</p>
                <p className="mt-1 font-semibold text-[#0F766E]">{money(current.quote.total, current.quote.currency || current.currency || "CAD")}</p>
              </div>
            ) : <EmptyLinkedSection label="No proposal created" action="Send Proposal" onClick={() => onStageAction(current, "Proposal Sent")} />}
          </TabsContent>

          <TabsContent value="billing" className="space-y-3 pt-4">
            {invoices.length || subscriptions.length ? (
              <>
                {invoices.map((invoice: any) => (
                  <div key={invoice.id} className="rounded-lg border border-[#E2E8F0] p-4">
                    <p className="font-medium text-[#0F172A]">Invoice {invoice.invoiceNumber}</p>
                    <p className="text-sm text-[#64748B]">{invoice.status} · {money(invoice.total, invoice.currency || current.currency || "CAD")}</p>
                  </div>
                ))}
                {subscriptions.map((subscription: any) => (
                  <div key={subscription.id} className="rounded-lg border border-[#E2E8F0] p-4">
                    <p className="font-medium text-[#0F172A]">{subscription.planName || "Subscription"}</p>
                    <p className="text-sm text-[#64748B]">{subscription.status} · Renewal {dateLabel(subscription.renewalDate)}</p>
                  </div>
                ))}
              </>
            ) : <EmptyLinkedSection label="Billing appears after a deal is won" action="Mark Won" onClick={() => onStageAction(current, "Won")} />}
          </TabsContent>

          <TabsContent value="activity-timeline" className="pt-4">
            <ActivityTimeline entityType="Project" entityId={current.id} includeRelated />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default function DealsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"pipeline" | "list" | "group">("pipeline");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<PipelineFilters>(defaultFilters);
  const [editingDeal, setEditingDeal] = useState<ProjectEntity | null>(null);
  const [detailDeal, setDetailDeal] = useState<ProjectEntity | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ deal: ProjectEntity; stage: string; value: string; lostReason: string } | null>(null);

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

  const refreshDeals = () => {
    queryClient.invalidateQueries({ queryKey: ["deals"] });
    queryClient.invalidateQueries({ queryKey: ["deal-detail"] });
    queryClient.invalidateQueries({ queryKey: ["deal-meetings"] });
  };

  const stageMutation = useMutation({
    mutationFn: async ({ deal, stage, data }: { deal: ProjectEntity; stage: string; data?: Record<string, any> }) => {
      if (stage === "Won") return markDealWon(deal.id, { stage, dealStatus: stage, ...data } as any);
      if (stage === "Lost") return markDealLost(deal.id, { stage, dealStatus: stage, ...data } as any);
      return moveDealStage(deal.id, { stage, dealStatus: stage, ...data } as any);
    },
    onSuccess: () => {
      refreshDeals();
      setConfirm(null);
      toast({ title: "Deal stage updated" });
    },
    onError: (error: any) => toast({ title: "Stage update failed", description: error?.response?.data?.message || error?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProjectById,
    onSuccess: () => {
      refreshDeals();
      toast({ title: "Deal deleted" });
    },
    onError: (error: any) => toast({ title: "Delete failed", description: error?.message, variant: "destructive" }),
  });

  const taskMutation = useMutation({
    mutationFn: async (deal: ProjectEntity) => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1);
      return createProjectTask(deal.id, {
        title: `Follow up: ${accountName(deal)}`,
        description: deal.nextStep || "Confirm next action for this deal.",
        dueDate: dueDate.toISOString(),
        priority: "HIGH",
        clientId: deal.clientId || deal.client?.id || null,
        leadId: deal.leadId || null,
      });
    },
    onSuccess: () => {
      refreshDeals();
      toast({ title: "Task created" });
    },
    onError: (error: any) => toast({ title: "Task creation failed", description: error?.response?.data?.message || error?.message, variant: "destructive" }),
  });

  const allDeals = dealsQuery.data || [];
  const filteredDeals = useMemo(() => {
    const term = query.trim().toLowerCase();
    return allDeals.filter((deal) => {
      const stage = normalizeStage(deal.dealStatus);
      const value = dealValue(deal);
      const close = String(deal.expectedClosureDate || deal.estimatedEndDate || "").slice(0, 10);
      const state = stage === "Won" ? "won" : stage === "Lost" ? "lost" : "open";
      const matchesText = !term || [accountName(deal), contactName(deal), deal.nextStep, deal.leadName, deal.email, deal.phone, stage].some((item) => String(item || "").toLowerCase().includes(term));
      return matchesText
        && (filters.owner === "all" || ownerId(deal) === filters.owner)
        && (filters.stage === "all" || stage === filters.stage)
        && (filters.source === "all" || String(deal.sourceId || "") === filters.source)
        && (filters.state === "all" || state === filters.state)
        && (!filters.closeFrom || close >= filters.closeFrom)
        && (!filters.closeTo || close <= filters.closeTo)
        && (!filters.minValue || value >= Number(filters.minValue))
        && (!filters.maxValue || value <= Number(filters.maxValue));
    });
  }, [allDeals, query, filters]);

  const totals = useMemo(() => ({
    total: filteredDeals.length,
    open: filteredDeals.filter((deal) => !["Won", "Lost"].includes(normalizeStage(deal.dealStatus))).length,
    won: filteredDeals.filter((deal) => normalizeStage(deal.dealStatus) === "Won").length,
    value: filteredDeals.reduce((sum, deal) => sum + dealValue(deal), 0),
  }), [filteredDeals]);

  const openCreate = (status?: string) => {
    setEditingDeal(status ? ({ id: "", dealStatus: status, probability: statusMeta(status).probability } as any) : null);
    setModalOpen(true);
  };

  const openEdit = (deal: ProjectEntity) => {
    setEditingDeal(deal);
    setModalOpen(true);
  };

  const requestStageMove = (deal: ProjectEntity, stage: string) => {
    if (!deal.clientId && !deal.client) {
      toast({ title: "Account required", description: "Link an Account before moving this deal.", variant: "destructive" });
      openEdit(deal);
      return;
    }
    if (stage === "Won" && !dealValue(deal)) {
      setConfirm({ deal, stage, value: "", lostReason: "" });
      return;
    }
    if (stage === "Lost" && !deal.lostReason) {
      setConfirm({ deal, stage, value: "", lostReason: "" });
      return;
    }
    stageMutation.mutate({ deal, stage });
  };

  const ownerName = (deal: ProjectEntity) => ownersQuery.data?.find((item) => String(item.id) === ownerId(deal))?.name || "Unassigned";

  const DealActions = ({ deal }: { deal: ProjectEntity }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal size={16} /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setDetailDeal(deal)}><Target size={14} className="mr-2" />Open Detail</DropdownMenuItem>
        <DropdownMenuItem onClick={() => openEdit(deal)}><Pencil size={14} className="mr-2" />Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={() => requestStageMove(deal, "Demo Scheduled")}><CalendarDays size={14} className="mr-2" />Schedule Demo</DropdownMenuItem>
        <DropdownMenuItem onClick={() => requestStageMove(deal, "Proposal Sent")}><FileText size={14} className="mr-2" />Send Proposal</DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.location.assign(`/proposals?dealId=${deal.id}&create=1`)}><FileText size={14} className="mr-2" />Create Proposal</DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.location.assign(`/invoice/create?dealId=${deal.id}`)}><CircleDollarSign size={14} className="mr-2" />Create Invoice</DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.location.assign(`/documents?linkedEntityType=Deal&linkedEntityId=${deal.id}`)}><FileText size={14} className="mr-2" />Upload Document</DropdownMenuItem>
        <DropdownMenuItem onClick={() => requestStageMove(deal, "Won")}><CheckCircle2 size={14} className="mr-2" />Mark Won</DropdownMenuItem>
        <DropdownMenuItem onClick={() => requestStageMove(deal, "Lost")}>Mark Lost</DropdownMenuItem>
        <DropdownMenuItem onClick={() => taskMutation.mutate(deal)}><StickyNote size={14} className="mr-2" />Create Task</DropdownMenuItem>
        <DropdownMenuItem onClick={() => deleteMutation.mutate(deal.id)} className="text-red-600"><Trash2 size={14} className="mr-2" />Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const DealCard = ({ deal }: { deal: ProjectEntity }) => {
    const meta = statusMeta(deal.dealStatus);
    return (
      <div
        draggable
        onDragStart={(event) => event.dataTransfer.setData("text/plain", deal.id)}
        className="rounded-lg border border-[#E2E8F0] bg-white p-3 shadow-sm transition hover:border-[#0F766E]/40"
      >
        <div className="flex items-start justify-between gap-2">
          <button onClick={() => setDetailDeal(deal)} className="min-w-0 text-left">
            <p className="truncate font-medium text-[#0F172A]">{deal.organization || deal.name}</p>
            <p className="truncate text-sm text-[#64748B]">{accountName(deal)}</p>
          </button>
          <DealActions deal={deal} />
        </div>
        <div className="mt-3 grid gap-2 text-xs text-[#64748B]">
          <span className="flex items-center gap-1.5"><User size={13} />{contactName(deal)}</span>
          <span className="flex items-center gap-1.5"><CircleDollarSign size={13} />{money(dealValue(deal), String(deal.currency || "CAD"))} · {toNumber(deal.probability ?? meta.probability)}%</span>
          <span className="flex items-center gap-1.5"><Clock size={13} />{dateLabel(deal.expectedClosureDate || deal.estimatedEndDate)}</span>
          <span className="flex items-center gap-1.5"><Target size={13} />{ownerName(deal)}</span>
        </div>
        <div className="mt-3 rounded-md bg-[#F8FAFC] px-2 py-1.5 text-xs text-[#475569]">Next Action: {deal.nextStep || "Set next action"}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h1 className="text-2xl font-semibold text-[#0F172A]">Deals Pipeline</h1>
            <p className="text-sm text-[#64748B]">Manage sales opportunities from qualification to revenue with linked account, contact, proposal, and billing context.</p>
          </div>
          <Button onClick={() => openCreate()} className="gap-2 bg-[#0F766E] hover:bg-[#115E59]"><Plus size={16} />Create Deal</Button>
        </div>
      </div>

      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          {[
            { label: "Total Deals", value: totals.total, icon: Target },
            { label: "Open Deals", value: totals.open, icon: Clock },
            { label: "Won Deals", value: totals.won, icon: CheckCircle2 },
            { label: "Pipeline Value", value: money(totals.value), icon: CircleDollarSign },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-[#E2E8F0] bg-white p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-[#64748B]">{item.label}</p><p className="mt-1 text-xl font-semibold text-[#0F172A]">{item.value}</p></div>
                <item.icon size={20} className="text-[#0F766E]" />
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4 rounded-lg border border-[#E2E8F0] bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search deals, accounts, contacts" className="pl-9" />
            </div>
            <Tabs value={view} onValueChange={(value) => setView(value as any)}>
              <TabsList>
                <TabsTrigger value="pipeline" className="gap-2"><Kanban size={14} />Pipeline</TabsTrigger>
                <TabsTrigger value="list" className="gap-2"><List size={14} />List</TabsTrigger>
                <TabsTrigger value="group" className="gap-2"><Building2 size={14} />Group</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-9">
            <Select value={filters.owner} onValueChange={(value) => setFilters((current) => ({ ...current, owner: value }))}>
              <SelectTrigger><SelectValue placeholder="Owner" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All owners</SelectItem>{(ownersQuery.data || []).map((owner) => <SelectItem key={owner.id} value={String(owner.id)}>{owner.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.stage} onValueChange={(value) => setFilters((current) => ({ ...current, stage: value }))}>
              <SelectTrigger><SelectValue placeholder="Stage" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All stages</SelectItem>{DEAL_STATUSES.map((stage) => <SelectItem key={stage.name} value={stage.name}>{stage.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.source} onValueChange={(value) => setFilters((current) => ({ ...current, source: value }))}>
              <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All sources</SelectItem>{(sourcesQuery.data || []).map((source) => <SelectItem key={source.id} value={source.id}>{source.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.state} onValueChange={(value) => setFilters((current) => ({ ...current, state: value }))}>
              <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Open, Won, Lost</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="won">Won</SelectItem><SelectItem value="lost">Lost</SelectItem></SelectContent>
            </Select>
            <Input type="date" value={filters.closeFrom} onChange={(event) => setFilters((current) => ({ ...current, closeFrom: event.target.value }))} />
            <Input type="date" value={filters.closeTo} onChange={(event) => setFilters((current) => ({ ...current, closeTo: event.target.value }))} />
            <Input type="number" min="0" placeholder="Min value" value={filters.minValue} onChange={(event) => setFilters((current) => ({ ...current, minValue: event.target.value }))} />
            <Input type="number" min="0" placeholder="Max value" value={filters.maxValue} onChange={(event) => setFilters((current) => ({ ...current, maxValue: event.target.value }))} />
            <Button variant="outline" onClick={() => setFilters(defaultFilters)} className="gap-2"><X size={14} />Reset</Button>
          </div>
        </div>

        {view === "pipeline" && (
          <div className="grid gap-4 xl:grid-cols-6">
            {DEAL_STATUSES.map((status) => {
              const deals = filteredDeals.filter((deal) => normalizeStage(deal.dealStatus) === status.name);
              return (
                <section
                  key={status.name}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const id = event.dataTransfer.getData("text/plain");
                    const deal = allDeals.find((item) => item.id === id);
                    if (deal && normalizeStage(deal.dealStatus) !== status.name) requestStageMove(deal, status.name);
                  }}
                  className="min-h-[560px] rounded-lg border border-[#E2E8F0] bg-white"
                >
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                        <h2 className="truncate font-semibold text-[#0F172A]">{status.name}</h2>
                        <Badge variant="secondary">{deals.length}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-[#64748B]">{money(deals.reduce((sum, deal) => sum + dealValue(deal), 0))}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openCreate(status.name)}><Plus size={16} /></Button>
                  </div>
                  <div className="space-y-3 p-3">
                    {deals.length ? deals.map((deal) => <DealCard key={deal.id} deal={deal} />) : (
                      <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4 text-center text-sm text-[#64748B]">
                        No deals here. Drop a card or create a deal for this stage.
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {view === "list" && (
          <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F8FAFC]">
                  <TableHead>Deal</TableHead><TableHead>Stage</TableHead><TableHead>Owner</TableHead><TableHead>Value</TableHead><TableHead>Probability</TableHead><TableHead>Expected Close</TableHead><TableHead>Links</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.map((deal) => {
                  const meta = statusMeta(deal.dealStatus);
                  return (
                    <TableRow key={deal.id} className="cursor-pointer" onClick={() => setDetailDeal(deal)}>
                      <TableCell>
                        <div className="font-medium text-[#0F172A]">{deal.organization || deal.name}</div>
                        <div className="text-xs text-[#64748B]">{accountName(deal)} · {contactName(deal)}</div>
                      </TableCell>
                      <TableCell><Badge style={{ backgroundColor: `${meta.color}18`, color: meta.color }}>{meta.name}</Badge></TableCell>
                      <TableCell>{ownerName(deal)}</TableCell>
                      <TableCell>{money(dealValue(deal), String(deal.currency || "CAD"))}</TableCell>
                      <TableCell>{toNumber(deal.probability ?? meta.probability)}%</TableCell>
                      <TableCell>{dateLabel(deal.expectedClosureDate || deal.estimatedEndDate)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 text-[#64748B]">
                          <span className="flex items-center gap-1"><Mail size={14} />{linkedCount(deal, "emails")}</span>
                          <span className="flex items-center gap-1"><StickyNote size={14} />{linkedCount(deal, "projectTasks")}</span>
                          <span className="flex items-center gap-1"><FileText size={14} />{deal.quote || deal.quoteId ? 1 : 0}</span>
                          <span className="flex items-center gap-1"><MessageSquare size={14} />{linkedCount(deal, "projectCommunications")}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(event) => event.stopPropagation()}><DealActions deal={deal} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {view === "group" && (
          <div className="space-y-4">
            {DEAL_STATUSES.map((status) => {
              const deals = filteredDeals.filter((deal) => normalizeStage(deal.dealStatus) === status.name);
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
                      <button key={deal.id} onClick={() => setDetailDeal(deal)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#F8FAFC]">
                        <div><div className="font-medium text-[#0F172A]">{deal.organization || deal.name}</div><div className="text-sm text-[#64748B]">{accountName(deal)} · {deal.nextStep || "No next action"}</div></div>
                        <div className="text-right"><div className="font-semibold text-[#0F766E]">{money(dealValue(deal), String(deal.currency || "CAD"))}</div><div className="text-sm text-[#64748B]">{dateLabel(deal.expectedClosureDate || deal.estimatedEndDate)}</div></div>
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

      <DealDetailDialog
        deal={detailDeal}
        open={Boolean(detailDeal)}
        onOpenChange={(open) => !open && setDetailDeal(null)}
        onEdit={openEdit}
        onStageAction={requestStageMove}
        onCreateTask={(deal) => taskMutation.mutate(deal)}
      />

      <Dialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm?.stage === "Won" ? "Confirm Won Deal" : "Confirm Lost Deal"}</DialogTitle>
            <DialogDescription>
              {confirm?.stage === "Won" ? "Won deals need a value before automation creates billing records." : "Lost deals need a reason for reporting and future follow-up."}
            </DialogDescription>
          </DialogHeader>
          {confirm?.stage === "Won" ? (
            <div className="space-y-2"><Label>Deal Value</Label><Input type="number" min="0" value={confirm.value} onChange={(event) => setConfirm((current) => current ? { ...current, value: event.target.value } : current)} /></div>
          ) : (
            <div className="space-y-2"><Label>Lost Reason</Label><Input value={confirm?.lostReason || ""} onChange={(event) => setConfirm((current) => current ? { ...current, lostReason: event.target.value } : current)} /></div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button
              className={cn(confirm?.stage === "Won" && "bg-[#0F766E] hover:bg-[#115E59]")}
              onClick={() => {
                if (!confirm) return;
                if (confirm.stage === "Won" && !toNumber(confirm.value)) {
                  toast({ title: "Deal value required", variant: "destructive" });
                  return;
                }
                if (confirm.stage === "Lost" && !confirm.lostReason.trim()) {
                  toast({ title: "Lost reason required", variant: "destructive" });
                  return;
                }
                stageMutation.mutate({
                  deal: confirm.deal,
                  stage: confirm.stage,
                  data: confirm.stage === "Won" ? { dealValue: Number(confirm.value), contractValue: Number(confirm.value), total: Number(confirm.value), netTotal: Number(confirm.value) } : { lostReason: confirm.lostReason },
                });
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
