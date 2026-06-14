import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle, Building2, CalendarClock, CheckCircle2, Download, Eye, FileSignature, FileText, Loader2, Mail, Plus, RefreshCw, Save, Search, Send, UserRound, XCircle, ChevronRight, ChevronDown, ChevronUp, Filter, Check, User, X, MoreHorizontal, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ContractEntity,
  ContractContactEntity,
  createContract,
  createInvoiceFromContract,
  declineContract,
  deleteContract,
  downloadContractPdf,
  getContractContacts,
  getContracts,
  saveContractDocument,
  sendContract,
  signContract,
  updateContract,
} from "@/features/contracts";
import { getClients, type ClientEntity } from "@/features/clients/services/clients-service";

const today = () => new Date().toISOString().slice(0, 10);
const thirtyDays = () => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

function money(value: unknown, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(Number(value || 0));
}

function statusBadge(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "ACTIVE" || normalized === "COMPLETED") return <Badge className="bg-emerald-600 hover:bg-emerald-700">{normalized === "ACTIVE" ? "Signed" : "Completed"}</Badge>;
  if (normalized === "SENT") return <Badge className="bg-blue-600 hover:bg-blue-700">Sent</Badge>;
  if (normalized === "CANCELLED") return <Badge variant="destructive">Declined</Badge>;
  if (normalized === "EXPIRED") return <Badge className="bg-amber-500 hover:bg-amber-600">Expired</Badge>;
  return <Badge variant="outline">Draft</Badge>;
}

function contactName(contact?: ContractContactEntity | ContractEntity["contact"] | null) {
  if (!contact) return "";
  return contact.contactName || [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() || contact.email || "";
}

const getContractYear = (value?: string): number | null => {
  if (!value) return null;
  const calendarDate = value.match(/^(\d{4})/);
  if (calendarDate) return Number(calendarDate[1]);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getFullYear();
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  prefix = "",
  suffix = "",
  delay = 0,
  sparklineData,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  prefix?: string;
  suffix?: string;
  delay?: number;
  sparklineData?: number[];
}) => {
  const sparklinePath = useMemo(() => {
    const data = sparklineData || [];
    if (data.length < 2) return "";
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 120;
    const height = 30;
    const step = width / (data.length - 1);
    return data
      .map((v, i) => {
        const x = i * step;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [sparklineData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="relative bg-white rounded-md p-5 border border-[rgba(15,23,42,0.06)] hover:border-[rgba(15,23,42,0.12)] hover:shadow-lg transition-all overflow-hidden group"
    >
      <div
        className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-all"
        style={{ backgroundColor: color }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-[#94A3B8] mb-1">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">
            {prefix}
            {typeof value === "number" ? value.toLocaleString() : value}
            {suffix}
          </p>
        </div>
        <div
          className="w-12 h-12 rounded-md flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon size={22} style={{ color }} />
        </div>
      </div>

      {sparklinePath && (
        <div className="mt-3 -mx-1">
          <svg width="120" height="30" viewBox="0 0 120 30" className="w-full">
            <defs>
              <linearGradient id={`sparkGrad-${title.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.15" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={sparklinePath + ` L 120 30 L 0 30 Z`}
              fill={`url(#sparkGrad-${title.replace(/\s+/g, "")})`}
            />
            <path
              d={sparklinePath}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-60"
            />
          </svg>
        </div>
      )}
    </motion.div>
  );
};

function ContractDialog({ contract, clients, contacts, onSaved, trigger }: { contract?: ContractEntity | null; clients: ClientEntity[]; contacts: ContractContactEntity[]; onSaved: () => void; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({
    title: contract?.title || "",
    clientId: contract?.client?.id || contract?.clientId || "",
    contactId: contract?.contact?.id || contract?.contactId || "",
    value: String(contract?.value || ""),
    currency: contract?.currency || "CAD",
    startDate: contract?.startDate ? contract.startDate.slice(0, 10) : today(),
    endDate: contract?.endDate ? contract.endDate.slice(0, 10) : thirtyDays(),
    terms: contract?.terms || "",
    notes: contract?.notes || "",
    description: contract?.description || "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      title: contract?.title || "",
      clientId: contract?.client?.id || contract?.clientId || "",
      contactId: contract?.contact?.id || contract?.contactId || "",
      value: String(contract?.value || ""),
      currency: contract?.currency || "CAD",
      startDate: contract?.startDate ? contract.startDate.slice(0, 10) : today(),
      endDate: contract?.endDate ? contract.endDate.slice(0, 10) : thirtyDays(),
      terms: contract?.terms || "",
      notes: contract?.notes || "",
      description: contract?.description || "",
    });
  }, [contract, open]);

  const submit = async () => {
    if (!form.title || !form.clientId || !form.value) {
      toast.error("Title, company, and value are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        clientId: form.clientId,
        contactId: form.contactId || null,
        value: Number(form.value),
        currency: form.currency || "CAD",
        startDate: form.startDate,
        endDate: form.endDate,
        terms: form.terms || null,
        notes: form.notes || null,
        description: form.description || null,
      };
      if (contract) await updateContract(contract.id, payload);
      else await createContract(payload);
      toast.success(contract ? "Contract updated" : "Contract created");
      setOpen(false);
      onSaved();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not save contract");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : (contract ? <Button size="sm" variant="outline">Edit</Button> : <Button><Plus className="mr-2 h-4 w-4" />Create Contract</Button>)}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{contract ? "Edit Contract" : "Create Contract"}</DialogTitle>
          <DialogDescription>Prepare a Sales CRM contract linked to a customer company.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Company</Label><Select value={form.clientId} onValueChange={(value) => setForm((p) => ({ ...p, clientId: value, contactId: "" }))}><SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger><SelectContent>{clients.map((client) => <SelectItem key={client.id} value={String(client.id)}>{client.clientName}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Primary Contact</Label><Select value={form.contactId || "none"} onValueChange={(value) => setForm((p) => ({ ...p, contactId: value === "none" ? "" : value }))}><SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger><SelectContent><SelectItem value="none">No contact</SelectItem>{contacts.filter((contact) => !form.clientId || !contact.companyId || contact.companyId === form.clientId).map((contact) => <SelectItem key={contact.id} value={contact.id}>{contactName(contact)}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Value</Label><Input type="number" min="0" value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} /></div>
          <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Terms</Label><Textarea value={form.terms} onChange={(e) => setForm((p) => ({ ...p, terms: e.target.value }))} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving} style={{ background: "#0F766E", color: "#fff" }}>{saving ? "Saving..." : "Save Contract"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-md bg-[#F8FAFC] p-3">
      <p className="text-xs font-medium uppercase text-[#64748B]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[#0F172A] break-words">{value || "-"}</p>
    </div>
  );
}

function ContractDetailDialog({
  contract,
  onClose,
  onDownload,
  onAction,
  onCreateInvoice,
  onSend,
}: {
  contract: ContractEntity | null;
  onClose: () => void;
  onDownload: (contract: ContractEntity) => void;
  onAction: (label: string, action: () => Promise<unknown>) => void;
  onCreateInvoice: (contract: ContractEntity) => void;
  onSend: (contract: ContractEntity) => void;
  onDelete: (contract: ContractEntity) => void;
}) {
  if (!contract) return null;
  const docsUrl = `/documents?linkedEntityType=Contract&linkedEntityId=${encodeURIComponent(contract.id)}`;
  const dealUrl = contract.projectId ? `/deals?dealId=${encodeURIComponent(contract.projectId)}` : "";
  const proposalUrl = contract.quoteId ? `/proposals?quoteId=${encodeURIComponent(contract.quoteId)}` : "";

  return (
    <Dialog open={Boolean(contract)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="grid h-[calc(100svh-1rem)] w-[calc(100vw-1rem)] max-w-4xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-xl p-0 sm:h-auto sm:max-h-[calc(100svh-2rem)] sm:w-[calc(100vw-2rem)] sm:rounded-2xl">
        <DialogHeader className="shrink-0 border-b border-[rgba(15,23,42,0.08)] bg-white px-4 py-4 pr-12 text-left sm:px-6 sm:py-5 sm:pr-14">
          <DialogTitle className="flex min-w-0 flex-wrap items-center gap-2 text-base sm:gap-3 sm:text-lg">
            <span className="min-w-0 break-all sm:break-normal">{contract.contractNumber}</span>
            {statusBadge(contract.status)}
          </DialogTitle>
          <DialogDescription className="break-words pr-2">{contract.title}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain bg-[#F8FAFC] px-4 py-4 sm:space-y-5 sm:px-6 sm:py-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DetailRow label="Company" value={contract.client?.clientName} />
            <DetailRow label="Contact" value={contactName(contract.contact)} />
            <DetailRow label="Value" value={money(contract.value, contract.currency)} />
            <DetailRow label="Signed At" value={contract.signedAt ? new Date(contract.signedAt).toLocaleDateString() : "Not signed"} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-md border bg-white p-4">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-[#0F172A]"><Building2 className="h-4 w-4 text-[#0F766E]" />Relationships</h3>
              <div className="space-y-2 text-sm">
                <div className="flex min-h-9 items-center justify-between gap-3"><span className="text-[#64748B]">Proposal</span>{proposalUrl ? <Button size="sm" variant="ghost" className="shrink-0 text-[#0F766E]" onClick={() => window.location.assign(proposalUrl)}>Open</Button> : <span>-</span>}</div>
                <div className="flex min-h-9 items-center justify-between gap-3"><span className="text-[#64748B]">Deal</span>{dealUrl ? <Button size="sm" variant="ghost" className="shrink-0 text-[#0F766E]" onClick={() => window.location.assign(dealUrl)}>Open</Button> : <span>-</span>}</div>
                <div className="flex min-h-9 items-center justify-between gap-3"><span className="text-[#64748B]">Documents</span><Button size="sm" variant="ghost" className="shrink-0 text-[#0F766E]" onClick={() => window.location.assign(docsUrl)}>Open</Button></div>
              </div>
            </section>

            <section className="rounded-md border bg-white p-4">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-[#0F172A]"><CalendarClock className="h-4 w-4 text-[#0F766E]" />Lifecycle</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailRow label="Start Date" value={new Date(contract.startDate).toLocaleDateString()} />
                <DetailRow label="End Date" value={new Date(contract.endDate).toLocaleDateString()} />
                <DetailRow label="Created" value={new Date(contract.createdAt).toLocaleDateString()} />
                <DetailRow label="Updated" value={new Date(contract.updatedAt).toLocaleDateString()} />
              </div>
            </section>
          </div>

          {(contract.terms || contract.notes || contract.description) && (
            <section className="rounded-md border bg-white p-4">
              <h3 className="mb-3 font-semibold text-[#0F172A]">Terms, Notes, and Scope</h3>
              <div className="space-y-3 break-words text-sm text-[#475569]">
                {contract.description && <p className="whitespace-pre-wrap">{contract.description}</p>}
                {contract.terms && <p className="whitespace-pre-wrap">{contract.terms}</p>}
                {contract.notes && <p className="whitespace-pre-wrap">{contract.notes}</p>}
              </div>
            </section>
          )}
        </div>

        <DialogFooter className="max-h-[42svh] shrink-0 overflow-y-auto border-t border-[rgba(15,23,42,0.08)] bg-white px-4 py-3 sm:max-h-none sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2 sm:space-x-0 sm:px-6 sm:py-4">
          {["DRAFT", "SENT"].includes(contract.status) && <Button className="w-full sm:w-auto" onClick={() => onSend(contract)} style={{ background: "#0F766E" }}><Send className="mr-2 h-4 w-4" />{contract.status === "SENT" ? "Resend" : "Send"}</Button>}
          {contract.status === "SENT" && <Button className="w-full sm:w-auto" onClick={() => onAction("Contract signed", () => signContract(contract.id))} style={{ background: "#10B981" }}><CheckCircle2 className="mr-2 h-4 w-4" />Mark Signed</Button>}
          {contract.status === "SENT" && <Button className="w-full sm:w-auto" variant="outline" onClick={() => onAction("Contract declined", () => declineContract(contract.id))}><XCircle className="mr-2 h-4 w-4" />Decline</Button>}
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => onDownload(contract)}><Download className="mr-2 h-4 w-4" />Download PDF</Button>
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => onAction("Contract saved to Documents", () => saveContractDocument(contract.id, contract.status === "ACTIVE" ? "signed" : "sent"))}><Save className="mr-2 h-4 w-4" />Save to Documents</Button>
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => onCreateInvoice(contract)}><FileText className="mr-2 h-4 w-4" />Create Invoice</Button>
          <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 sm:w-auto" onClick={() => onDelete(contract)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SendContractDialog({
  contract,
  onClose,
  onSent,
}: {
  contract: ContractEntity | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!contract) return;
    setEmail(contract.contact?.email || "");
  }, [contract]);

  const handleSend = async () => {
    if (!contract || !email.trim()) return;
    setIsSending(true);
    try {
      await sendContract(contract.id, email.trim());
      toast.success(`Contract emailed to ${email.trim()}`);
      onSent();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not send contract email");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={Boolean(contract)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[450px] p-0 rounded-md overflow-hidden">
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">Send Contract</DialogTitle>
            <DialogDescription className="text-[#64748B]">
              Send {contract?.contractNumber || "this contract"} with a PDF attachment.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="p-6 space-y-5">
          <div className="p-4 bg-[#F8FAFC] rounded-md flex items-center gap-4">
            <div className="w-12 h-12 rounded-md bg-[#0F766E]/10 flex items-center justify-center">
              <FileSignature size={24} className="text-[#0F766E]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#0F172A] truncate">{contract?.contractNumber}</p>
              <p className="text-sm text-[#64748B] truncate">{contract?.client?.clientName || contract?.title}</p>
            </div>
            <p className="text-base font-bold text-[#0F766E]">{money(contract?.value, contract?.currency)}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#475569]">
              Recipient Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="client@example.com"
                className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20"
              />
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-md">
            <AlertCircle size={18} className="text-blue-500 mt-0.5" />
            <p className="text-xs text-blue-700">
              The contract PDF will be attached. Change the email here if the saved contact email is not the mailbox you want to test.
            </p>
          </div>
        </div>
        <DialogFooter className="p-6 pt-0 gap-3">
          <Button variant="outline" onClick={onClose} className="rounded-md">Cancel</Button>
          <Button onClick={handleSend} disabled={isSending || !email.trim()} className="bg-[#0F766E] hover:bg-[#0F766E]/90 text-white rounded-md">
            {isSending ? <Loader2 size={16} className="animate-spin mr-2" /> : <Send size={16} className="mr-2" />}
            Send Contract
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ContractsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contracts, setContracts] = useState<ContractEntity[]>([]);
  const [clients, setClients] = useState<ClientEntity[]>([]);
  const [contacts, setContacts] = useState<ContractContactEntity[]>([]);
  const [selectedContract, setSelectedContract] = useState<ContractEntity | null>(null);
  const [contractToSend, setContractToSend] = useState<ContractEntity | null>(null);
  const [contractToDelete, setContractToDelete] = useState<ContractEntity | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [nameFilter, setNameFilter] = useState("ALL");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "value" | "name">("date");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const load = async () => {
    setLoading(true);
    try {
      const [contractResult, clientResult, contactResult] = await Promise.all([
        getContracts(),
        getClients().catch((error) => {
          console.warn("Could not load companies for contracts", error);
          return [];
        }),
        getContractContacts().catch((error) => {
          console.warn("Could not load contacts for contracts", error);
          return [];
        }),
      ]);
      setContracts(contractResult.data);
      setClients(Array.isArray(clientResult) ? clientResult : []);
      setContacts(contactResult);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not load contracts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    const contractId = searchParams.get("contractId");
    if (!contractId) return;
    const contract = contracts.find((item) => item.id === contractId);
    if (contract) setSelectedContract(contract);
  }, [contracts, searchParams]);

  // Derived filter options
  const uniqueClientNames = useMemo(() => {
    const names = new Set<string>();
    contracts.forEach((c) => {
      const name = c.client?.clientName;
      if (name) names.add(name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [contracts]);

  const uniqueYears = useMemo(() => {
    const years = new Set<number>();
    contracts.forEach((c) => {
      const year = getContractYear(c.startDate);
      if (year) years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [contracts]);

  // 1. Base Filtered Contracts (respects all dropdown filters)
  const baseFilteredContracts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return contracts.filter((contract) => {
      const status = contract.status.toUpperCase();

      // Status dropdown filter
      if (statusFilter !== "ALL" && status !== statusFilter) return false;

      // Name filter
      if (nameFilter !== "ALL") {
        if (contract.client?.clientName !== nameFilter) return false;
      }

      // Year filter
      if (yearFilter !== "ALL") {
        const year = getContractYear(contract.startDate);
        if (!year || String(year) !== yearFilter) return false;
      }

      // Search filter
      if (needle) {
        return [
          contract.contractNumber,
          contract.title,
          contract.client?.clientName,
        ].some((value) => String(value || "").toLowerCase().includes(needle));
      }

      return true;
    });
  }, [contracts, search, statusFilter, nameFilter, yearFilter]);

  // Stats calculation (based on baseFilteredContracts)
  const sentCount = baseFilteredContracts.filter((c) => c.status === "SENT").length;
  const signedCount = baseFilteredContracts.filter((c) => c.status === "ACTIVE").length;
  const draftCount = baseFilteredContracts.filter((c) => c.status === "DRAFT").length;
  const otherCount = baseFilteredContracts.filter((c) => ["CANCELLED", "EXPIRED", "COMPLETED"].includes(c.status)).length;
  const pipelineValue = baseFilteredContracts.reduce((sum, c) => sum + Number(c.value || 0), 0);

  // 2. Tab Filter & Sorting (for the table)
  const filteredContracts = useMemo(() => {
    let result = baseFilteredContracts.filter((contract) => {
      const status = contract.status.toUpperCase();
      if (activeTab === "signed" && status !== "ACTIVE") return false;
      if (activeTab === "sent" && status !== "SENT") return false;
      if (activeTab === "draft" && status !== "DRAFT") return false;
      if (activeTab === "other" && !["CANCELLED", "EXPIRED", "COMPLETED"].includes(status)) return false;
      return true;
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "date") {
        comparison = new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime();
      } else if (sortBy === "value") {
        comparison = Number(a.value || 0) - Number(b.value || 0);
      } else if (sortBy === "name") {
        comparison = String(a.client?.clientName || "").localeCompare(String(b.client?.clientName || ""));
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [baseFilteredContracts, activeTab, sortBy, sortOrder]);

  const hasActiveFilters = Boolean(search) || statusFilter !== "ALL" || nameFilter !== "ALL" || yearFilter !== "ALL";

  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setNameFilter("ALL");
    setYearFilter("ALL");
  };

  const downloadPdf = async (contract: ContractEntity) => {
    try {
      const blob = await downloadContractPdf(contract.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${contract.contractNumber || "contract"}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not download PDF");
    }
  };

  const runAction = async (label: string, action: () => Promise<unknown>) => {
    try {
      const result = await action();
      toast.success(label);
      await load();
      return result;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Action failed");
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!contractToDelete) return;
    try {
      await deleteContract(contractToDelete.id);
      toast.success("Contract deleted successfully");
      setContractToDelete(null);
      if (selectedContract?.id === contractToDelete.id) {
        closeContract();
      }
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not delete contract");
    }
  };

  const createInvoice = async (contract: ContractEntity) => {
    try {
      const invoice = await createInvoiceFromContract(contract.id) as { id?: string; invoiceNumber?: string };
      toast.success(invoice?.invoiceNumber ? `Invoice ${invoice.invoiceNumber} is ready` : "Invoice is ready");
      await load();
      if (invoice?.id) navigate(`/invoice/${invoice.id}/edit`);
      else navigate(`/invoice?contractId=${encodeURIComponent(contract.id)}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not create invoice from contract");
    }
  };

  const openContract = (contract: ContractEntity) => {
    setSelectedContract(contract);
    const next = new URLSearchParams(searchParams);
    next.set("contractId", contract.id);
    setSearchParams(next, { replace: true });
  };

  const closeContract = () => {
    setSelectedContract(null);
    const next = new URLSearchParams(searchParams);
    next.delete("contractId");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F7F7FB]">
      <main className="flex-1 pb-24 md:pb-0">
        {/* ── Header ── */}
        <header className="crm-module-header sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-[rgba(15,23,42,0.06)]">
          <div className="px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
            <div className="crm-toolbar-row">
              <div className="crm-toolbar-meta">
                <div className="crm-toolbar-breadcrumb hidden sm:flex mb-1">
                  <Link to="/dashboard" className="hover:text-[#0F766E]">
                    Dashboard
                  </Link>
                  <ChevronRight size={14} />
                  <span className="crm-toolbar-breadcrumb-current" style={{ color: "#0F766E" }}>Contracts</span>
                </div>
                <h1 className="crm-toolbar-title text-lg sm:text-[clamp(1.35rem,1.12rem+0.48vw,1.75rem)]">Contracts</h1>
              </div>

              <div className="crm-toolbar-actions gap-2 sm:gap-3">
                <Button variant="outline" onClick={load} disabled={loading} className="crm-toolbar-button gap-2 bg-white h-9">
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                <ContractDialog 
                  clients={clients} 
                  contacts={contacts} 
                  onSaved={load} 
                  trigger={
                    <Button
                      className="crm-toolbar-button gap-2 h-9"
                      size="sm"
                      style={{
                        background: "#0F766E",
                        color: "#FFFFFF",
                        border: "1px solid rgba(15,118,110,0.16)",
                        boxShadow: "0 8px 20px rgba(15,118,110,0.16)",
                      }}
                    >
                      <Plus size={16} />
                      <span className="hidden sm:inline">Create Contract</span>
                      <span className="sm:hidden">Create</span>
                    </Button>
                  } 
                />
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* ── Stats Cards ── */}
          <div className="mb-4 lg:mb-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <StatCard
              title="Total Contracts"
              value={baseFilteredContracts.length}
              icon={FileSignature}
              color="#0F766E"
              sparklineData={[3, 5, 4, 7, 6, 8, baseFilteredContracts.length || 10]}
            />
            <StatCard
              title="Pipeline Value"
              value={money(pipelineValue)}
              icon={FileText}
              color="#F59E0B"
              delay={0.1}
              sparklineData={[1000, 2500, 1800, 3200, 2800, 4100, pipelineValue || 1000]}
            />
            <StatCard
              title="Sent"
              value={sentCount}
              icon={Send}
              color="#3B82F6"
              delay={0.2}
              sparklineData={[2, 3, 1, 4, 3, 2, sentCount || 1]}
            />
            <StatCard
              title="Signed"
              value={signedCount}
              icon={CheckCircle2}
              color="#10B981"
              delay={0.3}
              sparklineData={[1, 2, 3, 2, 4, 3, signedCount || 1]}
            />
          </div>

          {/* ── Main Content Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden"
          >
            {/* Tabs & Filters */}
            <div className="p-3 sm:p-4 border-b border-[rgba(15,23,42,0.06)]">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                  <div className="overflow-x-auto -mx-1 px-1 flex-1 min-w-0">
                    <TabsList className="bg-white/5 rounded-md p-1 inline-flex w-max">
                      <TabsTrigger value="all" className="rounded-md data-[state=active]:bg-white text-xs sm:text-sm px-2 sm:px-3">
                        All ({baseFilteredContracts.length})
                      </TabsTrigger>
                      <TabsTrigger value="signed" className="rounded-md data-[state=active]:bg-white text-xs sm:text-sm px-2 sm:px-3">
                        Signed ({signedCount})
                      </TabsTrigger>
                      <TabsTrigger value="sent" className="rounded-md data-[state=active]:bg-white text-xs sm:text-sm px-2 sm:px-3">
                        Sent ({sentCount})
                      </TabsTrigger>
                      <TabsTrigger value="draft" className="rounded-md data-[state=active]:bg-white text-xs sm:text-sm px-2 sm:px-3">
                        Draft ({draftCount})
                      </TabsTrigger>
                      {otherCount > 0 && (
                        <TabsTrigger value="other" className="rounded-md data-[state=active]:bg-white text-xs sm:text-sm px-2 sm:px-3">
                          Other ({otherCount})
                        </TabsTrigger>
                      )}
                    </TabsList>
                  </div>
                </div>

                {/* Search & Filter Dropdowns */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="relative flex-1 sm:max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search contracts, titles, clients..."
                      className="pl-9 h-10 rounded-md border-[rgba(15,23,42,0.06)] w-full"
                    />
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto">
                    {/* Status Filter */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[120px] sm:w-[140px] h-9 sm:h-10 rounded-md border-[rgba(15,23,42,0.06)] text-xs sm:text-sm flex-shrink-0">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-md">
                        <SelectItem value="ALL" className="rounded-md">All Statuses</SelectItem>
                        <SelectItem value="DRAFT" className="rounded-md">Draft</SelectItem>
                        <SelectItem value="SENT" className="rounded-md">Sent</SelectItem>
                        <SelectItem value="ACTIVE" className="rounded-md">Signed</SelectItem>
                        <SelectItem value="COMPLETED" className="rounded-md">Completed</SelectItem>
                        <SelectItem value="CANCELLED" className="rounded-md">Declined</SelectItem>
                        <SelectItem value="EXPIRED" className="rounded-md">Expired</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Client Name Filter */}
                    <Select value={nameFilter} onValueChange={setNameFilter}>
                      <SelectTrigger className="w-[120px] sm:w-[150px] h-9 sm:h-10 rounded-md border-[rgba(15,23,42,0.06)] text-xs sm:text-sm flex-shrink-0">
                        <SelectValue placeholder="Client" />
                      </SelectTrigger>
                      <SelectContent className="rounded-md max-h-64">
                        <SelectItem value="ALL" className="rounded-md">All Clients</SelectItem>
                        {uniqueClientNames.map((name) => (
                          <SelectItem key={name} value={name} className="rounded-md">
                            <div className="flex items-center gap-2">
                              <User size={14} className="text-[#94A3B8]" />
                              {name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Year Filter */}
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                      <SelectTrigger className="w-[90px] sm:w-[110px] h-9 sm:h-10 rounded-md border-[rgba(15,23,42,0.06)] text-xs sm:text-sm flex-shrink-0">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent className="rounded-md">
                        <SelectItem value="ALL" className="rounded-md">All Years</SelectItem>
                        {uniqueYears.map((year) => (
                          <SelectItem key={year} value={String(year)} className="rounded-md">
                            <div className="flex items-center gap-2">
                              <CalendarClock size={14} className="text-[#94A3B8]" />
                              {year}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Sort Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="rounded-md gap-1 sm:gap-2 h-9 sm:h-10 text-xs sm:text-sm flex-shrink-0">
                          <Filter size={14} />
                          <span className="hidden sm:inline">Sort</span>
                          {sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-md">
                        <DropdownMenuItem onClick={() => { setSortBy("date"); setSortOrder(prev => prev === "asc" ? "desc" : "asc"); }} className="rounded-md">
                          <CalendarClock size={14} className="mr-2" /> Date
                          {sortBy === "date" && <Check size={14} className="ml-auto text-[#0F766E]" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSortBy("value"); setSortOrder(prev => prev === "asc" ? "desc" : "asc"); }} className="rounded-md">
                          <FileText size={14} className="mr-2" /> Value
                          {sortBy === "value" && <Check size={14} className="ml-auto text-[#0F766E]" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSortBy("name"); setSortOrder(prev => prev === "asc" ? "desc" : "asc"); }} className="rounded-md">
                          <User size={14} className="mr-2" /> Client Name
                          {sortBy === "name" && <Check size={14} className="ml-auto text-[#0F766E]" />}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Active Filter Chips */}
                {hasActiveFilters && (
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span className="text-xs text-[#94A3B8] font-medium">Active filters:</span>
                    {search && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F1F5F9] text-[#475569] rounded-md text-xs">
                        <Search size={10} /> "{search}"
                        <button onClick={() => setSearch("")} className="ml-0.5 hover:text-red-500 transition-colors"><X size={12} /></button>
                      </span>
                    )}
                    {statusFilter !== "ALL" && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F1F5F9] text-[#475569] rounded-md text-xs">
                        Status: {statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()}
                        <button onClick={() => setStatusFilter("ALL")} className="ml-0.5 hover:text-red-500 transition-colors"><X size={12} /></button>
                      </span>
                    )}
                    {nameFilter !== "ALL" && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F1F5F9] text-[#475569] rounded-md text-xs">
                        Client: {nameFilter}
                        <button onClick={() => setNameFilter("ALL")} className="ml-0.5 hover:text-red-500 transition-colors"><X size={12} /></button>
                      </span>
                    )}
                    {yearFilter !== "ALL" && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F1F5F9] text-[#475569] rounded-md text-xs">
                        Year: {yearFilter}
                        <button onClick={() => setYearFilter("ALL")} className="ml-0.5 hover:text-red-500 transition-colors"><X size={12} /></button>
                      </span>
                    )}
                    <Button variant="ghost" size="sm" className="text-xs text-[#94A3B8] hover:text-red-500 h-7 px-2" onClick={clearAllFilters}>
                      <X size={12} className="mr-1" /> Clear all
                    </Button>
                  </div>
                )}
              </Tabs>
            </div>

            {/* ── Table Content ── */}
            {loading ? (
              <div className="p-6">
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 bg-[#F1F5F9] rounded-md animate-pulse" />)}
                </div>
              </div>
            ) : (
              <div className="responsive-table">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Contract</TableHead>
                      <TableHead>Company / Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead className="w-28 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContracts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center">
                            <FileSignature size={48} className="text-[#94A3B8] mb-3" />
                            <p className="text-[#94A3B8] font-medium">
                              {hasActiveFilters ? "No matching contracts" : "No contracts yet"}
                            </p>
                            <p className="text-[#475569] text-sm mt-1">
                              {hasActiveFilters ? "Try adjusting your filters." : "Create your first contract to get started."}
                            </p>
                            {hasActiveFilters && (
                              <Button variant="outline" className="rounded-md mt-4" onClick={clearAllFilters}>
                                Clear Filters
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredContracts.map((contract) => (
                        <TableRow key={contract.id} className="group cursor-pointer transition-colors" onClick={() => openContract(contract)}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-[#0F172A] group-hover:text-[#0F766E] transition-colors">{contract.contractNumber}</p>
                              <p className="text-xs text-[#64748B] truncate max-w-[150px] sm:max-w-[200px]">{contract.title}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="flex items-center gap-1.5 text-sm font-medium text-[#0F172A]">
                                <Building2 size={14} className="text-[#94A3B8]" />
                                {contract.client?.clientName || "-"}
                              </p>
                              {contract.contact && (
                                <p className="flex items-center gap-1.5 text-xs text-[#64748B] mt-0.5">
                                  <UserRound size={12} />
                                  {contactName(contract.contact)}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{statusBadge(contract.status)}</TableCell>
                          <TableCell>
                            <div className="text-sm text-[#475569]">
                              {new Date(contract.startDate).toLocaleDateString()}
                              <span className="mx-1 text-[#94A3B8]">→</span>
                              {new Date(contract.endDate).toLocaleDateString()}
                            </div>
                            {contract.signedAt && <div className="text-xs text-emerald-600 mt-0.5 font-medium">Signed {new Date(contract.signedAt).toLocaleDateString()}</div>}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-[#0F172A]">
                              {money(contract.value, contract.currency)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => openContract(contract)}>
                                      <Eye size={16} className="text-[#475569]" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View Details</TooltipContent>
                                </Tooltip>
                                {["DRAFT", "SENT"].includes(contract.status) && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => setContractToSend(contract)}>
                                        <Send size={16} className="text-[#475569]" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Send Contract</TooltipContent>
                                  </Tooltip>
                                )}
                              </TooltipProvider>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
                                    <MoreHorizontal size={16} className="text-[#475569]" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 rounded-md">
                                  <DropdownMenuItem onClick={() => openContract(contract)} className="rounded-md">
                                    <Eye size={14} className="mr-2" /> View Details
                                  </DropdownMenuItem>
                                  <ContractDialog 
                                    contract={contract} 
                                    clients={clients} 
                                    contacts={contacts} 
                                    onSaved={load} 
                                    trigger={
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="rounded-md w-full">
                                        <FileSignature size={14} className="mr-2" /> Edit Contract
                                      </DropdownMenuItem>
                                    } 
                                  />
                                  {["DRAFT", "SENT"].includes(contract.status) && (
                                    <DropdownMenuItem onClick={() => setContractToSend(contract)} className="rounded-md">
                                      <Send size={14} className="mr-2" /> {contract.status === "SENT" ? "Resend" : "Send"}
                                    </DropdownMenuItem>
                                  )}
                                  {contract.status === "SENT" && (
                                    <DropdownMenuItem onClick={() => runAction("Contract signed", () => signContract(contract.id))} className="rounded-md">
                                      <CheckCircle2 size={14} className="mr-2 text-emerald-600" /> Mark Signed
                                    </DropdownMenuItem>
                                  )}
                                  {contract.status === "SENT" && (
                                    <DropdownMenuItem onClick={() => runAction("Contract declined", () => declineContract(contract.id))} className="rounded-md text-red-600 focus:text-red-600">
                                      <XCircle size={14} className="mr-2" /> Decline
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => downloadPdf(contract)} className="rounded-md">
                                    <Download size={14} className="mr-2" /> Download PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => runAction("Contract saved to Documents", () => saveContractDocument(contract.id, contract.status === "ACTIVE" ? "signed" : "sent"))} className="rounded-md">
                                    <Save size={14} className="mr-2" /> Save to Documents
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => createInvoice(contract)} className="rounded-md">
                                    <FileText size={14} className="mr-2" /> Create Invoice
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setContractToDelete(contract)} className="rounded-md text-red-600 focus:text-red-600 focus:bg-red-50">
                                    <Trash2 size={14} className="mr-2" /> Delete Contract
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Results Count Footer */}
            {!loading && filteredContracts.length > 0 && (
              <div className="px-4 py-3 border-t border-[rgba(15,23,42,0.06)] text-xs text-[#94A3B8]">
                Showing {filteredContracts.length} of {baseFilteredContracts.length} contract{baseFilteredContracts.length !== 1 ? "s" : ""}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Overlays */}
      <ContractDetailDialog 
        contract={selectedContract} 
        onClose={closeContract} 
        onDownload={downloadPdf} 
        onAction={runAction} 
        onCreateInvoice={createInvoice} 
        onSend={setContractToSend} 
        onDelete={(c) => {
          closeContract();
          setContractToDelete(c);
        }}
      />
      <SendContractDialog 
        contract={contractToSend} 
        onClose={() => setContractToSend(null)} 
        onSent={load} 
      />
      
      <AlertDialog open={Boolean(contractToDelete)} onOpenChange={(open) => { if (!open) setContractToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contract?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {contractToDelete?.contractNumber}? This action cannot be undone and will permanently remove the contract and its history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
