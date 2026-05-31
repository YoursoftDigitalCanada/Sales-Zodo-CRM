import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, CalendarClock, CheckCircle2, Download, Eye, FileSignature, FileText, Plus, RefreshCw, Save, Search, Send, UserRound, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
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
  if (normalized === "ACTIVE" || normalized === "COMPLETED") return <Badge className="bg-emerald-600">{normalized === "ACTIVE" ? "Signed" : "Completed"}</Badge>;
  if (normalized === "SENT") return <Badge className="bg-blue-600">Sent</Badge>;
  if (normalized === "CANCELLED") return <Badge variant="destructive">Declined</Badge>;
  if (normalized === "EXPIRED") return <Badge className="bg-amber-500">Expired</Badge>;
  return <Badge variant="outline">Draft</Badge>;
}

function contactName(contact?: ContractContactEntity | ContractEntity["contact"] | null) {
  if (!contact) return "";
  return contact.contactName || [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() || contact.email || "";
}

function ContractDialog({ contract, clients, contacts, onSaved }: { contract?: ContractEntity | null; clients: ClientEntity[]; contacts: ContractContactEntity[]; onSaved: () => void }) {
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
        {contract ? <Button size="sm" variant="outline">Edit</Button> : <Button><Plus className="mr-2 h-4 w-4" />Create Contract</Button>}
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
          <Button onClick={submit} disabled={saving}>{saving ? "Saving..." : "Save Contract"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-md bg-[#F8FAFC] p-3">
      <p className="text-xs text-[#64748B]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[#0F172A]">{value || "-"}</p>
    </div>
  );
}

function ContractDetailDialog({
  contract,
  onClose,
  onDownload,
  onAction,
  onCreateInvoice,
}: {
  contract: ContractEntity | null;
  onClose: () => void;
  onDownload: (contract: ContractEntity) => void;
  onAction: (label: string, action: () => Promise<unknown>) => void;
  onCreateInvoice: (contract: ContractEntity) => void;
}) {
  if (!contract) return null;
  const docsUrl = `/documents?linkedEntityType=Contract&linkedEntityId=${encodeURIComponent(contract.id)}`;
  const dealUrl = contract.projectId ? `/deals?dealId=${encodeURIComponent(contract.projectId)}` : "";
  const proposalUrl = contract.quoteId ? `/proposals?quoteId=${encodeURIComponent(contract.quoteId)}` : "";

  return (
    <Dialog open={Boolean(contract)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-3">
            {contract.contractNumber}
            {statusBadge(contract.status)}
          </DialogTitle>
          <DialogDescription>{contract.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DetailRow label="Company" value={contract.client?.clientName} />
            <DetailRow label="Contact" value={contactName(contract.contact)} />
            <DetailRow label="Value" value={money(contract.value, contract.currency)} />
            <DetailRow label="Signed At" value={contract.signedAt ? new Date(contract.signedAt).toLocaleDateString() : "Not signed"} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-md border bg-white p-4">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-[#0F172A]"><Building2 className="h-4 w-4 text-[#0891B2]" />Relationships</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between"><span className="text-[#64748B]">Proposal</span>{proposalUrl ? <Button size="sm" variant="ghost" onClick={() => window.location.assign(proposalUrl)}>Open</Button> : <span>-</span>}</div>
                <div className="flex items-center justify-between"><span className="text-[#64748B]">Deal</span>{dealUrl ? <Button size="sm" variant="ghost" onClick={() => window.location.assign(dealUrl)}>Open</Button> : <span>-</span>}</div>
                <div className="flex items-center justify-between"><span className="text-[#64748B]">Documents</span><Button size="sm" variant="ghost" onClick={() => window.location.assign(docsUrl)}>Open</Button></div>
              </div>
            </section>

            <section className="rounded-md border bg-white p-4">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-[#0F172A]"><CalendarClock className="h-4 w-4 text-[#0891B2]" />Lifecycle</h3>
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
              <div className="space-y-3 text-sm text-[#475569]">
                {contract.description && <p className="whitespace-pre-line">{contract.description}</p>}
                {contract.terms && <p className="whitespace-pre-line">{contract.terms}</p>}
                {contract.notes && <p className="whitespace-pre-line">{contract.notes}</p>}
              </div>
            </section>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {["DRAFT", "SENT"].includes(contract.status) && <Button onClick={() => onAction(contract.status === "SENT" ? "Contract resent" : "Contract sent", () => sendContract(contract.id))}><Send className="mr-2 h-4 w-4" />{contract.status === "SENT" ? "Resend" : "Send"}</Button>}
          {contract.status === "SENT" && <Button onClick={() => onAction("Contract signed", () => signContract(contract.id))}><CheckCircle2 className="mr-2 h-4 w-4" />Mark Signed</Button>}
          {contract.status === "SENT" && <Button variant="outline" onClick={() => onAction("Contract declined", () => declineContract(contract.id))}><XCircle className="mr-2 h-4 w-4" />Decline</Button>}
          <Button variant="outline" onClick={() => onDownload(contract)}><Download className="mr-2 h-4 w-4" />Download PDF</Button>
          <Button variant="outline" onClick={() => onAction("Contract saved to Documents", () => saveContractDocument(contract.id, contract.status === "ACTIVE" ? "signed" : "sent"))}><Save className="mr-2 h-4 w-4" />Save to Documents</Button>
          <Button variant="outline" onClick={() => onCreateInvoice(contract)}><FileText className="mr-2 h-4 w-4" />Create Invoice</Button>
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
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contracts.filter((contract) => {
      const matchesStatus = status === "all" || contract.status === status;
      const matchesSearch = !q || [contract.contractNumber, contract.title, contract.client?.clientName].some((value) => String(value || "").toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [contracts, search, status]);

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
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-[#0891B2]"><FileSignature className="h-4 w-4" /> Sales Documents</div>
            <h1 className="text-2xl font-semibold text-[#0F172A]">Contracts</h1>
            <p className="text-sm text-[#64748B]">Send, sign, store, and invoice Sales CRM contracts.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
            <ContractDialog clients={clients} contacts={contacts} onSaved={load} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-md border bg-white p-4"><p className="text-xs text-[#64748B]">Total Contracts</p><p className="text-2xl font-semibold">{contracts.length}</p></div>
          <div className="rounded-md border bg-white p-4"><p className="text-xs text-[#64748B]">Sent</p><p className="text-2xl font-semibold">{contracts.filter((c) => c.status === "SENT").length}</p></div>
          <div className="rounded-md border bg-white p-4"><p className="text-xs text-[#64748B]">Signed</p><p className="text-2xl font-semibold">{contracts.filter((c) => c.status === "ACTIVE").length}</p></div>
          <div className="rounded-md border bg-white p-4"><p className="text-xs text-[#64748B]">Pipeline Value</p><p className="text-2xl font-semibold">{money(contracts.reduce((sum, c) => sum + Number(c.value || 0), 0))}</p></div>
        </div>

        <div className="rounded-md border bg-white">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contracts..." className="pl-9" /></div>
            <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="DRAFT">Draft</SelectItem><SelectItem value="SENT">Sent</SelectItem><SelectItem value="ACTIVE">Signed</SelectItem><SelectItem value="CANCELLED">Declined</SelectItem><SelectItem value="EXPIRED">Expired</SelectItem></SelectContent></Select>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Contract</TableHead><TableHead>Company / Contact</TableHead><TableHead>Status</TableHead><TableHead>Dates</TableHead><TableHead>Value</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell><button className="text-left" onClick={() => openContract(contract)}><div className="font-medium text-[#0F172A] hover:text-[#0891B2]">{contract.contractNumber}</div><div className="text-sm text-[#64748B]">{contract.title}</div></button></TableCell>
                  <TableCell><div className="flex flex-col gap-1"><span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-[#94A3B8]" />{contract.client?.clientName || "-"}</span>{contract.contact && <span className="flex items-center gap-1 text-xs text-[#64748B]"><UserRound className="h-3 w-3" />{contactName(contract.contact)}</span>}</div></TableCell>
                  <TableCell>{statusBadge(contract.status)}</TableCell>
                  <TableCell><div className="flex items-center gap-1 text-sm"><CalendarClock className="h-3.5 w-3.5" />{new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}</div>{contract.signedAt && <div className="text-xs text-emerald-600">Signed {new Date(contract.signedAt).toLocaleDateString()}</div>}</TableCell>
                  <TableCell>{money(contract.value, contract.currency)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openContract(contract)}><Eye className="mr-1.5 h-3.5 w-3.5" />Details</Button>
                      <ContractDialog contract={contract} clients={clients} contacts={contacts} onSaved={load} />
                      {["DRAFT", "SENT"].includes(contract.status) && <Button size="sm" onClick={() => runAction(contract.status === "SENT" ? "Contract resent" : "Contract sent", () => sendContract(contract.id))}><Send className="mr-1.5 h-3.5 w-3.5" />{contract.status === "SENT" ? "Resend" : "Send"}</Button>}
                      {contract.status === "SENT" && <Button size="sm" onClick={() => runAction("Contract signed", () => signContract(contract.id))}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Mark Signed</Button>}
                      {contract.status === "SENT" && <Button size="sm" variant="outline" onClick={() => runAction("Contract declined", () => declineContract(contract.id))}><XCircle className="mr-1.5 h-3.5 w-3.5" />Decline</Button>}
                      <Button size="sm" variant="outline" onClick={() => downloadPdf(contract)}><Download className="mr-1.5 h-3.5 w-3.5" />PDF</Button>
                      <Button size="sm" variant="outline" onClick={() => runAction("Contract saved to Documents", () => saveContractDocument(contract.id, contract.status === "ACTIVE" ? "signed" : "sent"))}><Save className="mr-1.5 h-3.5 w-3.5" />Save</Button>
                      <Button size="sm" variant="outline" onClick={() => createInvoice(contract)}><FileText className="mr-1.5 h-3.5 w-3.5" />Invoice</Button>
                      <Button size="sm" variant="ghost" onClick={() => window.location.assign(`/documents?linkedEntityType=Contract&linkedEntityId=${encodeURIComponent(contract.id)}`)}>Docs</Button>
                      {contract.projectId && <Button size="sm" variant="ghost" onClick={() => window.location.assign(`/deals?dealId=${encodeURIComponent(contract.projectId || "")}`)}>Deal</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={6} className="py-12 text-center text-[#64748B]">No contracts found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>
      <ContractDetailDialog contract={selectedContract} onClose={closeContract} onDownload={downloadPdf} onAction={runAction} onCreateInvoice={createInvoice} />
    </div>
  );
}
