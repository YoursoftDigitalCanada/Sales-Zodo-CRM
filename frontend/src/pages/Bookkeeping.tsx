import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Download, ExternalLink, Eye, Landmark, Plus, RefreshCw, Search, Upload, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { ImportTransactionsDialog } from "@/components/bookkeeping/ImportTransactionsDialog";
import {
  BookkeepingRecord,
  attachReceipt,
  completeReconciliation,
  createAccount,
  createCategory,
  createJournalEntry,
  createReconciliation,
  createRecurringRule,
  createTransaction,
  createTransfer,
  createVendor,
  deleteReconciliation,
  deleteRecurringRule,
  deleteTransaction,
  deleteVendor,
  downloadBookkeepingCsv,
  getAccounts,
  getBalanceSheet,
  getBookkeepingDashboard,
  getCashFlow,
  getCategories,
  getJournalEntries,
  getProfitLoss,
  getReconciliations,
  getRecurringRules,
  getTaxSummary,
  getTransactions,
  getTransfers,
  getVendors,
  postJournalEntry,
  runDueRecurringRules,
  setupBookkeeping,
  syncBookkeeping,
  reconcileTransaction,
  unreconcileTransaction,
  updateTransaction,
  voidTransaction,
} from "@/features/bookkeeping";
import {
  createDocumentCategory,
  fetchDocumentPreviewBlob,
  getDocumentCategories,
  linkDocument,
  uploadDocument,
} from "@/features/documents/services/documents-service";

const money = (value: unknown, currency = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(Number(value || 0));

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

function syncStatusBadge(tx: BookkeepingRecord) {
  const syncStatus = String(tx.metadata?.syncStatus || tx.syncStatus || "").toLowerCase();
  if (syncStatus === "synced") return <Badge className="bg-emerald-600">Synced</Badge>;
  if (syncStatus === "failed") return <Badge variant="destructive">Failed</Badge>;
  if (syncStatus === "needs_review") return <Badge className="bg-amber-500">Needs review</Badge>;
  if (syncStatus === "voided" || syncStatus === "reversed") return <Badge variant="secondary">{syncStatus === "voided" ? "Voided" : "Reversed"}</Badge>;
  if (tx.sourceType && tx.sourceType !== "MANUAL") return <Badge variant="outline">Automated</Badge>;
  return <Badge variant="outline">Manual</Badge>;
}

function sourcePath(tx: BookkeepingRecord) {
  if (tx.invoiceId) return `/invoice/${tx.invoiceId}`;
  if (tx.expenseId) return `/bookkeeping?expenseId=${tx.expenseId}`;
  return null;
}

async function ensureReceiptsCategoryId() {
  const categories = await getDocumentCategories();
  const existing = categories.find((category) => category.name.toLowerCase() === "receipts");
  if (existing) return existing.id;
  const created = await createDocumentCategory({ name: "Receipts", color: "#059669" });
  return created.id;
}

async function openReceiptPreview(fileId: string) {
  try {
    const url = await fetchDocumentPreviewBlob(fileId);
    const previewWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (!previewWindow) {
      window.URL.revokeObjectURL(url);
      toast.error("Your browser blocked the receipt preview window.");
      return;
    }
    window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
  } catch {
    toast.error("Could not open this receipt preview.");
  }
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white p-5 shadow-sm transition-all hover:border-[#0891B2]/20 hover:shadow-md ${className}`}>{children}</section>;
}

function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[rgba(15,23,42,0.16)] bg-[#F8FAFC] p-8 text-center transition-all hover:border-[#0891B2]/30">
      <p className="text-sm font-medium text-[#64748B]">{title}</p>
      {action}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-slate-600">{label}</Label>{children}</div>;
}

function apiErrorMessage(error: any, fallback: string) {
  const details = error?.response?.data?.details?.errors || error?.response?.data?.errors;
  if (details && typeof details === "object") {
    const first = Object.entries(details)[0];
    if (first) {
      const [field, messages] = first;
      const message = Array.isArray(messages) ? messages[0] : String(messages);
      return `${field.replace(/^body\./, "")}: ${message}`;
    }
  }
  return error?.response?.data?.message || fallback;
}

function cleanOptionalText(value: unknown) {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeWebsite(value: unknown) {
  const cleaned = cleanOptionalText(value);
  if (typeof cleaned !== "string") return cleaned;
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `https://${cleaned}`;
}

function normalizeVendorPayload(data: BookkeepingRecord) {
  return {
    name: String(data.name || "").trim(),
    email: cleanOptionalText(data.email),
    phone: cleanOptionalText(data.phone),
    website: normalizeWebsite(data.website),
    taxId: cleanOptionalText(data.taxId),
    address: cleanOptionalText(data.address),
    notes: cleanOptionalText(data.notes),
  };
}

function TransactionDialog({ accounts, categories, vendors, onSaved, tx, open: controlledOpen, onOpenChange }: { accounts: BookkeepingRecord[]; categories: BookkeepingRecord[]; vendors: BookkeepingRecord[]; onSaved: () => void; tx?: BookkeepingRecord; open?: boolean; onOpenChange?: (open: boolean) => void; }) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = onOpenChange || setUncontrolledOpen;

  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  
  const defaultForm = { type: "EXPENSE", description: "", amount: "", currency: "CAD", transactionDate: today(), status: "POSTED" };
  const [form, setForm] = useState<BookkeepingRecord>(defaultForm);

  useEffect(() => {
    if (open) {
      if (tx) {
        setForm({
          ...tx,
          amount: tx.amount || "",
          transactionDate: tx.transactionDate ? new Date(tx.transactionDate).toISOString().slice(0, 10) : today()
        });
      } else {
        setForm(defaultForm);
      }
    }
  }, [open, tx]);

  const save = async () => {
    const amount = Number(form.amount);
    if (!form.description?.trim()) {
      toast.error("Description is required");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter an amount greater than 0");
      return;
    }

    try {
      setSaving(true);
      let fileId: string | undefined;
      if (receipt) {
        const categoryId = await ensureReceiptsCategoryId();
        const uploaded = await uploadDocument(receipt, { documentType: "receipt", categoryId });
        fileId = uploaded.fileId;
      }
      const payload = {
        ...form,
        amount,
        accountId: form.accountId || null,
        categoryId: form.categoryId || null,
        vendorId: form.vendorId || null,
        currency: form.currency || "CAD",
        transactionDate: form.transactionDate || today(),
        status: form.status || "POSTED",
        description: form.description.trim(),
        fileId,
      };

      if (tx) {
        await updateTransaction(tx.id, payload);
        toast.success("Transaction updated");
      } else {
        const transaction = await createTransaction(payload);
        if (fileId && transaction?.id) {
          await linkDocument(fileId, "BookkeepingTransaction", transaction.id);
        }
        toast.success("Transaction saved");
      }
      
      setForm(defaultForm);
      setReceipt(null);
      setOpen(false);
      onSaved();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save transaction");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!tx && <DialogTrigger asChild><Button className="rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white"><Plus className="mr-2 h-4 w-4" />Add Transaction</Button></DialogTrigger>}
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#0F172A]">Manual Transaction</DialogTitle>
          <DialogDescription className="text-[#64748B]">Create income, expense, adjustment, or refund records. Receipts are stored in Documents.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Type"><Select value={form.type} onValueChange={(type) => setForm({ ...form, type })}><SelectTrigger className="rounded-xl h-10 border-[rgba(15,23,42,0.06)]"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{["INCOME", "EXPENSE", "ADJUSTMENT", "REFUND"].map((v) => <SelectItem key={v} value={v} className="rounded-xl">{v}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Account"><Select value={form.accountId || ""} onValueChange={(accountId) => setForm({ ...form, accountId })}><SelectTrigger className="rounded-xl h-10 border-[rgba(15,23,42,0.06)]"><SelectValue placeholder="Select account" /></SelectTrigger><SelectContent className="rounded-xl">{accounts.map((a) => <SelectItem key={a.id} value={a.id} className="rounded-xl">{a.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Category"><Select value={form.categoryId || ""} onValueChange={(categoryId) => setForm({ ...form, categoryId })}><SelectTrigger className="rounded-xl h-10 border-[rgba(15,23,42,0.06)]"><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent className="rounded-xl">{categories.map((c) => <SelectItem key={c.id} value={c.id} className="rounded-xl">{c.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Vendor"><Select value={form.vendorId || ""} onValueChange={(vendorId) => setForm({ ...form, vendorId })}><SelectTrigger className="rounded-xl h-10 border-[rgba(15,23,42,0.06)]"><SelectValue placeholder="Optional vendor" /></SelectTrigger><SelectContent className="rounded-xl">{vendors.map((v) => <SelectItem key={v.id} value={v.id} className="rounded-xl">{v.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Amount"><Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="rounded-xl h-10 border-[rgba(15,23,42,0.06)] focus-visible:ring-[#0891B2]/20" /></Field>
          <Field label="Date"><Input type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} className="rounded-xl h-10 border-[rgba(15,23,42,0.06)] focus-visible:ring-[#0891B2]/20" /></Field>
          <Field label="Payment Method"><Select value={form.paymentMethod || ""} onValueChange={(paymentMethod) => setForm({ ...form, paymentMethod })}><SelectTrigger className="rounded-xl h-10 border-[rgba(15,23,42,0.06)]"><SelectValue placeholder="Select method" /></SelectTrigger><SelectContent className="rounded-xl">{["Credit Card", "Debit Card", "Interac e-Transfer", "EFT (Electronic Funds Transfer)", "Cheque", "Cash", "Bank Draft", "Wire Transfer", "PAD (Pre-authorized Debit)", "Other"].map((v) => <SelectItem key={v} value={v} className="rounded-xl">{v}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Reference"><Input value={form.reference || ""} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Receipt, cheque, transaction id" className="rounded-xl h-10 border-[rgba(15,23,42,0.06)] focus-visible:ring-[#0891B2]/20" /></Field>
          <div className="md:col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What happened?" className="rounded-xl border-[rgba(15,23,42,0.06)] focus-visible:ring-[#0891B2]/20 min-h-[100px]" /></Field></div>
          <div className="md:col-span-2"><Field label="Receipt"><Input type="file" onChange={(e) => setReceipt(e.target.files?.[0] || null)} className="rounded-xl h-10 border-[rgba(15,23,42,0.06)] focus-visible:ring-[#0891B2]/20 file:bg-[#0891B2]/10 file:text-[#0891B2] file:border-0 file:mr-4 file:px-4 file:py-1 file:rounded-xl cursor-pointer" /></Field></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Cancel</Button><Button onClick={save} disabled={saving} className="rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white">{saving ? "Saving..." : "Save Transaction"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SimpleCreateDialog({ title, fields, onSubmit, trigger }: { title: string; fields: Array<{ key: string; label: string; type?: string; options?: string[] }>; onSubmit: (data: BookkeepingRecord) => Promise<void>; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<BookkeepingRecord>({});
  const save = async () => {
    try {
      setSaving(true);
      await onSubmit(form);
      setOpen(false);
      setForm({});
      toast.success(`${title} saved`);
    } catch (error: any) {
      toast.error(apiErrorMessage(error, `Failed to save ${title.toLowerCase()}`));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader><DialogTitle className="text-[#0F172A]">{title}</DialogTitle><DialogDescription className="text-[#64748B]">Fill the required details and save.</DialogDescription></DialogHeader>
        <div className="grid gap-3">
          {fields.map((field) => (
            <Field key={field.key} label={field.label}>
              {field.options ? (
                <Select value={form[field.key] || ""} onValueChange={(value) => setForm({ ...form, [field.key]: value })}><SelectTrigger className="rounded-xl h-10 border-[rgba(15,23,42,0.06)]"><SelectValue placeholder={field.label} /></SelectTrigger><SelectContent className="rounded-xl">{field.options.map((option) => <SelectItem key={option} value={option} className="rounded-xl">{option}</SelectItem>)}</SelectContent></Select>
              ) : (
                <Input type={field.type || "text"} value={form[field.key] || ""} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} className="rounded-xl h-10 border-[rgba(15,23,42,0.06)] focus-visible:ring-[#0891B2]/20" />
              )}
            </Field>
          ))}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Cancel</Button><Button onClick={save} disabled={saving} className="rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white">{saving ? "Saving..." : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BookkeepingPage() {
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dashboard, setDashboard] = useState<BookkeepingRecord>({});
  const [accounts, setAccounts] = useState<BookkeepingRecord[]>([]);
  const [categories, setCategories] = useState<BookkeepingRecord[]>([]);
  const [vendors, setVendors] = useState<BookkeepingRecord[]>([]);
  const [transactions, setTransactions] = useState<BookkeepingRecord[]>([]);
  const [transfers, setTransfers] = useState<BookkeepingRecord[]>([]);
  const [journalEntries, setJournalEntries] = useState<BookkeepingRecord[]>([]);
  const [reconciliations, setReconciliations] = useState<BookkeepingRecord[]>([]);
  const [recurringRules, setRecurringRules] = useState<BookkeepingRecord[]>([]);
  const [reports, setReports] = useState<BookkeepingRecord>({});
  const [editingTx, setEditingTx] = useState<BookkeepingRecord | null>(null);

  const reload = () => setRefreshKey((key) => key + 1);
  const filters = useMemo(() => ({ search, dateFrom, dateTo }), [search, dateFrom, dateTo]);

  useEffect(() => {
    let mounted = true;
    const emptyList = { data: [] as BookkeepingRecord[] };
    const safe = async <T,>(promise: Promise<T>, fallback: T, label: string): Promise<T> => {
      try {
        return await promise;
      } catch (error: any) {
        console.warn(`Bookkeeping ${label} failed`, error?.response?.data || error);
        return fallback;
      }
    };

    async function load() {
      setLoading(true);
      const [dash, accountRes, categoryRes, vendorRes, transactionRes, transferRes, journalRes, recRes, recurringRes, pl, cash, tax, balance] = await Promise.all([
        safe(getBookkeepingDashboard(filters), {}, "dashboard"),
        safe(getAccounts({ limit: 200 }), emptyList, "accounts"),
        safe(getCategories({ limit: 200 }), emptyList, "categories"),
        safe(getVendors({ limit: 200 }), emptyList, "vendors"),
        safe(getTransactions({ ...filters, limit: 100 }), emptyList, "transactions"),
        safe(getTransfers({ limit: 100 }), emptyList, "transfers"),
        safe(getJournalEntries({ limit: 100 }), emptyList, "journal entries"),
        safe(getReconciliations({ limit: 100 }), emptyList, "reconciliations"),
        safe(getRecurringRules({ limit: 100 }), emptyList, "recurring rules"),
        safe(getProfitLoss({ dateFrom, dateTo }), {}, "profit and loss report"),
        safe(getCashFlow({ dateFrom, dateTo }), {}, "cash flow report"),
        safe(getTaxSummary({ dateFrom, dateTo }), {}, "tax summary report"),
        safe(getBalanceSheet({ dateFrom, dateTo }), {}, "balance sheet report"),
      ]);
      if (!mounted) return;
      setDashboard(dash);
      setAccounts(accountRes.data);
      setCategories(categoryRes.data);
      setVendors(vendorRes.data);
      setTransactions(transactionRes.data);
      setTransfers(transferRes.data);
      setJournalEntries(journalRes.data);
      setReconciliations(recRes.data);
      setRecurringRules(recurringRes.data);
      setReports({ profitLoss: pl, cashFlow: cash, taxSummary: tax, balanceSheet: balance });
      setLoading(false);
    }
    load().catch((error: any) => {
      console.error("Bookkeeping load failed", error);
      if (mounted) {
        toast.error(error?.response?.data?.message || "Failed to load bookkeeping");
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [refreshKey, filters, dateFrom, dateTo]);

  const accountName = (id?: string) => accounts.find((a) => a.id === id)?.name || "-";
  const categoryName = (id?: string) => categories.find((c) => c.id === id)?.name || "-";
  const vendorName = (id?: string) => vendors.find((v) => v.id === id)?.name || "-";

  const sync = async () => {
    try {
      await syncBookkeeping();
      toast.success("Invoices, payments, and spending records synced");
      reload();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Sync failed");
    }
  };

  const setup = async () => {
    try {
      await setupBookkeeping();
      toast.success("Bookkeeping defaults are ready");
      reload();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Setup failed");
    }
  };

  const attachReceiptToTransaction = async (tx: BookkeepingRecord, receipt: File) => {
    try {
      const categoryId = await ensureReceiptsCategoryId();
      const uploaded = await uploadDocument(receipt, { documentType: "expense_receipt", categoryId });
      await attachReceipt(tx.id, uploaded.fileId);
      await linkDocument(uploaded.fileId, "BookkeepingTransaction", tx.id);
      toast.success("Receipt attached");
      reload();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to attach receipt");
    }
  };

  const toggleReconciled = async (tx: BookkeepingRecord) => {
    try {
      if (tx.isReconciled || tx.status === "RECONCILED") await unreconcileTransaction(tx.id);
      else await reconcileTransaction(tx.id);
      toast.success(tx.isReconciled || tx.status === "RECONCILED" ? "Transaction unreconciled" : "Transaction reconciled");
      reload();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update reconciliation");
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl border border-[rgba(15,23,42,0.06)] shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0891B2] mb-1"><Landmark className="h-4 w-4" /> Finance</div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Bookkeeping</h1>
            <p className="text-sm text-[#64748B] mt-1">Tenant-safe ledger, accounts, reports, reconciliation, and finance sync.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={setup} className="rounded-xl"><WalletCards className="mr-2 h-4 w-4" />Setup</Button>
            <Button variant="outline" onClick={sync} className="rounded-xl"><RefreshCw className="mr-2 h-4 w-4" />Sync Finance</Button>
            <TransactionDialog accounts={accounts} categories={categories} vendors={vendors} onSaved={reload} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["Income", dashboard.totals?.totalIncome, "text-[#0F766E]"],
            ["Expenses", dashboard.totals?.totalExpenses, "text-[#E11D48]"],
            ["Net Profit", dashboard.totals?.netProfit, "text-[#0F172A]"],
            ["Cash / Bank", dashboard.totals?.cashBankBalance, "text-[#0891B2]"],
          ].map(([label, value, tone]) => (
            <Panel key={String(label)}>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">{label}</p>
              <p className={`mt-3 text-3xl font-bold tracking-tight ${tone}`}>{money(value)}</p>
            </Panel>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white p-5 md:flex-row md:items-center shadow-sm">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" /><Input className="pl-10 h-10 rounded-xl border-[rgba(15,23,42,0.06)] focus-visible:ring-[#0891B2]/20" placeholder="Search transactions, vendors, accounts" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="md:w-40 h-10 rounded-xl border-[rgba(15,23,42,0.06)] focus-visible:ring-[#0891B2]/20" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="md:w-40 h-10 rounded-xl border-[rgba(15,23,42,0.06)] focus-visible:ring-[#0891B2]/20" />
          <Button variant="outline" onClick={reload} disabled={loading} className="rounded-xl h-10"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <ImportTransactionsDialog accounts={accounts} categories={categories} vendors={vendors} transactions={transactions} onSuccess={(dateRange) => { if (dateRange?.from) setDateFrom(dateRange.from); if (dateRange?.to) setDateTo(dateRange.to); reload(); }} />
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex h-12 flex-wrap justify-start rounded-xl bg-white border border-[rgba(15,23,42,0.06)] p-1 shadow-sm">
            {["overview", "transactions", "accounts", "categories", "vendors", "reconciliation", "recurring", "reports"].map((tab) => (
              <TabsTrigger key={tab} value={tab} className="capitalize rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-[#0891B2] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">{tab}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              {[
                ["Unpaid invoices", dashboard.totals?.unpaidInvoices || 0, "text-amber-600"],
                ["Overdue invoices", dashboard.totals?.overdueInvoices || 0, "text-rose-600"],
                ["Pending expenses", dashboard.totals?.pendingExpenses || 0, "text-slate-700"],
                ["Bookkeeping accounts", accounts.length, "text-[#0891B2]"],
              ].map(([label, value, tone]) => (
                <Panel key={String(label)}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">{label}</p>
                  <p className={`mt-3 text-3xl font-bold tracking-tight ${tone}`}>{value}</p>
                </Panel>
              ))}
            </div>

            <Panel>
              <h2 className="mb-4 text-lg font-semibold text-[#0F172A]">Recent Transactions</h2>
              <TransactionTable rows={transactions.slice(0, 8)} accountName={accountName} categoryName={categoryName} vendorName={vendorName} onVoid={async (id) => { await voidTransaction(id); reload(); }} onReceipt={attachReceiptToTransaction} onToggleReconcile={toggleReconciled} />
            </Panel>
          </TabsContent>

          <TabsContent value="transactions">
            <Panel>
              <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-[#0F172A]">Transactions Ledger</h2><TransactionDialog accounts={accounts} categories={categories} vendors={vendors} onSaved={reload} /></div>
              <TransactionTable rows={transactions} accountName={accountName} categoryName={categoryName} vendorName={vendorName} onVoid={async (id) => { await voidTransaction(id); reload(); }} onReceipt={attachReceiptToTransaction} onToggleReconcile={toggleReconciled} onEdit={setEditingTx} onDelete={async (id) => { await deleteTransaction(id); reload(); }} />
              {editingTx && <TransactionDialog accounts={accounts} categories={categories} vendors={vendors} onSaved={reload} tx={editingTx} open={true} onOpenChange={(o) => { if (!o) setEditingTx(null); }} />}
            </Panel>
          </TabsContent>

          <TabsContent value="accounts">
            <Panel>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#0F172A]">Chart of Accounts</h2>
                <SimpleCreateDialog title="Account" trigger={<Button className="rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white"><Plus className="mr-2 h-4 w-4" />Account</Button>} fields={[
                  { key: "name", label: "Name" }, { key: "code", label: "Code" }, { key: "type", label: "Type", options: ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"] }, { key: "subtype", label: "Subtype" }, { key: "openingBalance", label: "Opening Balance", type: "number" },
                ]} onSubmit={async (data) => { await createAccount({ ...data, currency: "CAD" }); reload(); }} />
              </div>
              <DataTable columns={["Name", "Code", "Type", "Balance", "Bank", "Status"]} rows={accounts.map((a) => ({ Name: a.name, Code: a.code || "-", Type: a.type, Balance: money(a.currentBalance), Bank: a.isBankAccount ? "Yes" : "No", Status: a.isActive ? "Active" : "Inactive" }))} />
            </Panel>
          </TabsContent>

          <TabsContent value="categories">
            <Panel>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#0F172A]">Income & Expense Categories</h2>
                <SimpleCreateDialog title="Category" trigger={<Button className="rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white"><Plus className="mr-2 h-4 w-4" />Category</Button>} fields={[{ key: "name", label: "Name" }, { key: "type", label: "Type", options: ["INCOME", "EXPENSE"] }, { key: "color", label: "Color" }]} onSubmit={async (data) => { await createCategory(data); reload(); }} />
              </div>
              <DataTable columns={["Name", "Type", "Color", "Status"]} rows={categories.map((c) => ({ Name: c.name, Type: c.type, Color: c.color || "-", Status: c.isActive ? "Active" : "Inactive" }))} />
            </Panel>
          </TabsContent>

          <TabsContent value="vendors">
            <Panel>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#0F172A]">Vendors</h2>
                <SimpleCreateDialog title="Vendor" trigger={<Button className="rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white"><Plus className="mr-2 h-4 w-4" />Vendor</Button>} fields={[{ key: "name", label: "Name" }, { key: "email", label: "Email", type: "email" }, { key: "phone", label: "Phone", type: "tel" }, { key: "website", label: "Website", type: "url" }, { key: "taxId", label: "Tax ID" }]} onSubmit={async (data) => { await createVendor(normalizeVendorPayload(data)); reload(); }} />
              </div>
              <DataTable columns={["Name", "Email", "Phone", "Tax ID", "Status", "Actions"]} rows={vendors.map((v) => ({ Name: v.name, Email: v.email || "-", Phone: v.phone || "-", "Tax ID": v.taxId || "-", Status: v.isActive ? "Active" : "Inactive", Actions: v.isActive ? <Button variant="ghost" size="sm" onClick={async () => { await deleteVendor(v.id); toast.success("Vendor deactivated"); reload(); }}>Deactivate</Button> : "-" }))} />
            </Panel>
          </TabsContent>

          <TabsContent value="reconciliation">
            <ReconciliationPanel accounts={accounts} transactions={transactions} reconciliations={reconciliations} onSaved={reload} />
          </TabsContent>

          <TabsContent value="recurring">
            <RecurringPanel accounts={accounts} categories={categories} vendors={vendors} rules={recurringRules} onSaved={reload} />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsPanel reports={reports} dateFrom={dateFrom} dateTo={dateTo} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return <div className="flex items-center justify-between border-b border-[rgba(15,23,42,0.06)] pb-3 pt-1"><span className="text-[#64748B] font-medium">{label}</span><span className="font-semibold text-[#0F172A]">{value}</span></div>;
}

function TransactionTable({
  rows,
  accountName,
  categoryName,
  vendorName,
  onVoid,
  onReceipt,
  onToggleReconcile,
}: {
  rows: BookkeepingRecord[];
  accountName: (id?: string) => string;
  categoryName: (id?: string) => string;
  vendorName: (id?: string) => string;
  onVoid: (id: string) => Promise<void>;
  onReceipt: (tx: BookkeepingRecord, file: File) => Promise<void>;
  onToggleReconcile: (tx: BookkeepingRecord) => Promise<void>;
  onEdit?: (tx: BookkeepingRecord) => void;
  onDelete?: (id: string) => Promise<void>;
}) {
  if (!rows.length) return <EmptyState title="No transactions found." />;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader><TableRow className="bg-[#F8FAFC]">{["Date", "Number", "Type", "Description", "Account", "Category", "Vendor", "Source", "Sync", "Receipt", "Amount", "Status", "Actions"].map((h) => <TableHead key={h} className="text-[#64748B] uppercase text-xs tracking-wide">{h}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{rows.map((tx) => (
          <TableRow key={tx.id}>
            <TableCell>{tx.transactionDate ? new Date(tx.transactionDate).toLocaleDateString() : "-"}</TableCell>
            <TableCell className="font-mono text-xs">{tx.transactionNumber || "-"}</TableCell>
            <TableCell><Badge variant={tx.type === "INCOME" ? "default" : "secondary"}>{tx.type}</Badge></TableCell>
            <TableCell className="min-w-56">{tx.description}</TableCell>
            <TableCell>{accountName(tx.accountId)}</TableCell>
            <TableCell>{categoryName(tx.categoryId)}</TableCell>
            <TableCell>{vendorName(tx.vendorId)}</TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <Badge variant="outline">{tx.sourceType || "MANUAL"}</Badge>
                {sourcePath(tx) ? (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { window.location.href = sourcePath(tx) || "/bookkeeping"; }}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
            </TableCell>
            <TableCell>{syncStatusBadge(tx)}</TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                {tx.fileId ? (
                  <Button variant="ghost" size="sm" onClick={() => void openReceiptPreview(tx.fileId!)}>
                    <Eye className="mr-1 h-3.5 w-3.5" />Open
                  </Button>
                ) : null}
                <label className="inline-flex cursor-pointer items-center rounded-xl px-2 py-1.5 text-xs font-medium text-[#64748B] hover:bg-[#F1F5F9] transition-colors">
                  <Upload className="mr-1 h-3.5 w-3.5" />{tx.fileId ? "Replace" : "Upload"}
                  <input type="file" className="hidden" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onReceipt(tx, file);
                    event.currentTarget.value = "";
                  }} />
                </label>
              </div>
            </TableCell>
            <TableCell className={tx.type === "EXPENSE" ? "text-rose-600" : "text-emerald-600"}>{money(tx.amount, tx.currency || "CAD")}</TableCell>
            <TableCell>{tx.isReconciled ? <Badge>Reconciled</Badge> : <Badge variant="outline">{tx.status}</Badge>}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem onClick={() => onToggleReconcile(tx)} className="cursor-pointer rounded-lg font-medium">
                    {tx.isReconciled || tx.status === "RECONCILED" ? "Unreconcile" : "Reconcile"}
                  </DropdownMenuItem>
                  {tx.status !== "VOID" && !(tx.isReconciled || tx.status === "RECONCILED") && (
                    <DropdownMenuItem onClick={() => onVoid(tx.id)} className="cursor-pointer rounded-lg text-rose-600 focus:text-rose-600 font-medium">
                      Void
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onEdit?.(tx)} className="cursor-pointer rounded-lg font-medium">
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    if (confirm("Are you sure you want to permanently delete this transaction?")) {
                      onDelete?.(tx.id).catch(() => toast.error("Failed to delete transaction"));
                    }
                  }} className="cursor-pointer rounded-lg text-rose-600 focus:text-rose-600 font-medium">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}</TableBody>
      </Table>
    </div>
  );
}

function DataTable({ columns, rows }: { columns: string[]; rows: BookkeepingRecord[] }) {
  if (!rows.length) return <EmptyState title="No records yet." />;
  return (
    <div className="overflow-x-auto rounded-xl border border-[rgba(15,23,42,0.06)] shadow-sm">
      <Table><TableHeader><TableRow className="bg-[#F8FAFC]">{columns.map((col) => <TableHead key={col} className="text-[#64748B] uppercase text-xs tracking-wide">{col}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((row, index) => <TableRow key={index}>{columns.map((col) => <TableCell key={col}>{row[col]}</TableCell>)}</TableRow>)}</TableBody></Table>
    </div>
  );
}

function ReconciliationPanel({ accounts, transactions, reconciliations, onSaved }: { accounts: BookkeepingRecord[]; transactions: BookkeepingRecord[]; reconciliations: BookkeepingRecord[]; onSaved: () => void }) {
  const [form, setForm] = useState<BookkeepingRecord>({ statementDate: today(), statementStartingBalance: "0", statementEndingBalance: "", transactionIds: [] });
  const selectedIds = Array.isArray(form.transactionIds) ? form.transactionIds : [];
  const accountTransactions = transactions.filter((tx) => tx.accountId === form.accountId && tx.status !== "VOID" && !tx.isReconciled);
  const selectedTotal = accountTransactions
    .filter((tx) => selectedIds.includes(tx.id))
    .reduce((sum, tx) => sum + (tx.type === "EXPENSE" || tx.type === "REFUND" ? -Number(tx.amount || 0) : Number(tx.amount || 0)), 0);
  const calculatedDifference = Number(form.statementEndingBalance || 0) - Number(form.statementStartingBalance || 0) - selectedTotal;
  const toggleTransaction = (id: string) => {
    setForm({
      ...form,
      transactionIds: selectedIds.includes(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id],
    });
  };
  const save = async () => {
    try {
      await createReconciliation(form);
      toast.success("Reconciliation draft created");
      onSaved();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create reconciliation");
    }
  };
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Panel>
        <h2 className="mb-4 text-lg font-semibold text-[#0F172A]">New Reconciliation</h2>
        <div className="space-y-4">
          <Field label="Account"><Select value={form.accountId || ""} onValueChange={(accountId) => setForm({ ...form, accountId })}><SelectTrigger className="rounded-xl h-10 border-[rgba(15,23,42,0.06)]"><SelectValue placeholder="Select account" /></SelectTrigger><SelectContent className="rounded-xl">{accounts.map((a) => <SelectItem key={a.id} value={a.id} className="rounded-xl">{a.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Statement Date"><Input type="date" value={form.statementDate} onChange={(e) => setForm({ ...form, statementDate: e.target.value })} className="rounded-xl h-10 border-[rgba(15,23,42,0.06)] focus-visible:ring-[#0891B2]/20" /></Field>
          <Field label="Starting Balance"><Input type="number" value={form.statementStartingBalance} onChange={(e) => setForm({ ...form, statementStartingBalance: e.target.value })} className="rounded-xl h-10 border-[rgba(15,23,42,0.06)] focus-visible:ring-[#0891B2]/20" /></Field>
          <Field label="Ending Balance"><Input type="number" value={form.statementEndingBalance} onChange={(e) => setForm({ ...form, statementEndingBalance: e.target.value })} className="rounded-xl h-10 border-[rgba(15,23,42,0.06)] focus-visible:ring-[#0891B2]/20" /></Field>
          <Metric label="Selected movement" value={money(selectedTotal)} />
          <Metric label="Calculated difference" value={money(calculatedDifference)} />
          <div className="max-h-56 space-y-2 overflow-auto rounded-xl border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-3 shadow-inner">
            {accountTransactions.length ? accountTransactions.map((tx) => (
              <label key={tx.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm bg-white border border-[rgba(15,23,42,0.04)] shadow-sm hover:border-[#0891B2]/30 transition-all">
                <Checkbox checked={selectedIds.includes(tx.id)} onCheckedChange={() => toggleTransaction(tx.id)} className="data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#0891B2]" />
                <span className="min-w-0 flex-1 truncate font-medium text-[#0F172A]">{tx.description}</span>
                <span className={`font-semibold ${tx.type === "EXPENSE" ? "text-[#E11D48]" : "text-[#0F766E]"}`}>{money(tx.amount, tx.currency || "CAD")}</span>
              </label>
            )) : <p className="py-4 text-center text-sm font-medium text-[#64748B]">Select an account to choose unreconciled transactions.</p>}
          </div>
          <Button onClick={save} className="w-full rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white">Create Draft</Button>
        </div>
      </Panel>
      <Panel className="lg:col-span-2">
        <h2 className="mb-4 text-lg font-semibold text-[#0F172A]">Reconciliations</h2>
        <DataTable columns={["Date", "Account", "Ending", "Difference", "Status", "Action"]} rows={reconciliations.map((r) => ({ Date: r.statementDate ? new Date(r.statementDate).toLocaleDateString() : "-", Account: accounts.find((a) => a.id === r.accountId)?.name || "-", Ending: money(r.statementEndingBalance), Difference: money(r.difference), Status: r.status, Action: r.status === "DRAFT" ? <div className="flex gap-1"><Button variant="ghost" size="sm" onClick={async () => { await completeReconciliation(r.id); onSaved(); }}>Complete</Button><Button variant="ghost" size="sm" onClick={async () => { await deleteReconciliation(r.id); onSaved(); }}>Void</Button></div> : "-" }))} />
      </Panel>
    </div>
  );
}

function RecurringPanel({ accounts, categories, vendors, rules, onSaved }: { accounts: BookkeepingRecord[]; categories: BookkeepingRecord[]; vendors: BookkeepingRecord[]; rules: BookkeepingRecord[]; onSaved: () => void }) {
  const create = async (data: BookkeepingRecord) => {
    await createRecurringRule({ ...data, currency: "CAD", nextRunAt: data.nextRunAt || today() });
    onSaved();
  };
  return (
    <Panel>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#0F172A]">Recurring Income & Expenses</h2>
        <div className="flex gap-3">
          <Button variant="outline" onClick={async () => { await runDueRecurringRules(); toast.success("Due rules processed"); onSaved(); }} className="rounded-xl h-10">Run Due</Button>
          <SimpleCreateDialog title="Recurring Rule" trigger={<Button className="rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white"><Plus className="mr-2 h-4 w-4" />Rule</Button>} fields={[
            { key: "name", label: "Name" }, { key: "type", label: "Type", options: ["INCOME", "EXPENSE"] }, { key: "amount", label: "Amount", type: "number" }, { key: "frequency", label: "Frequency", options: ["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"] }, { key: "nextRunAt", label: "Next Run", type: "date" },
          ]} onSubmit={create} />
        </div>
      </div>
      <DataTable columns={["Name", "Type", "Amount", "Frequency", "Next Run", "Status", "Actions"]} rows={rules.map((r) => ({ Name: r.name, Type: r.type, Amount: money(r.amount, r.currency || "CAD"), Frequency: r.frequency, "Next Run": r.nextRunAt ? new Date(r.nextRunAt).toLocaleDateString() : "-", Status: r.isActive ? "Active" : "Inactive", Actions: r.isActive ? <Button variant="ghost" size="sm" onClick={async () => { await deleteRecurringRule(r.id); toast.success("Recurring rule deactivated"); onSaved(); }}>Deactivate</Button> : "-" }))} />
    </Panel>
  );
}

function ReportsPanel({ reports, dateFrom, dateTo }: { reports: BookkeepingRecord; dateFrom: string; dateTo: string }) {
  const download = async (path: "transactions-export" | "profit-loss-export") => {
    try {
      const blob = await downloadBookkeepingCsv(path, { dateFrom, dateTo });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${path}-${dateFrom}-${dateTo}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Export failed");
    }
  };
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-[#0F172A]">Profit & Loss</h2><Button variant="outline" size="sm" onClick={() => download("profit-loss-export")} className="rounded-lg h-9"><Download className="mr-2 h-4 w-4" />CSV</Button></div>
        <Metric label="Income" value={money(reports.profitLoss?.totals?.income)} />
        <Metric label="Expenses" value={money(reports.profitLoss?.totals?.expenses)} />
        <Metric label="Net Profit" value={money(reports.profitLoss?.netProfit)} />
      </Panel>
      <Panel>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-[#0F172A]">Cash Flow</h2><Button variant="outline" size="sm" onClick={() => download("transactions-export")} className="rounded-lg h-9"><Download className="mr-2 h-4 w-4" />Transactions</Button></div>
        <Metric label="Money In" value={money(reports.cashFlow?.moneyIn)} />
        <Metric label="Money Out" value={money(reports.cashFlow?.moneyOut)} />
        <Metric label="Net Movement" value={money(reports.cashFlow?.netCashMovement)} />
      </Panel>
      <Panel>
        <h2 className="mb-4 text-lg font-semibold text-[#0F172A]">Tax Summary</h2>
        <Metric label="Tax Collected" value={money(reports.taxSummary?.taxCollected)} />
        <Metric label="Tax Paid" value={money(reports.taxSummary?.taxPaid)} />
        <Metric label="Net Tax Estimate" value={money(reports.taxSummary?.netTaxEstimate)} />
      </Panel>
      <Panel>
        <h2 className="mb-4 text-lg font-semibold text-[#0F172A]">Balance Sheet</h2>
        <Metric label="Assets" value={money(reports.balanceSheet?.assets?.total)} />
        <Metric label="Liabilities" value={money(reports.balanceSheet?.liabilities?.total)} />
        <Metric label="Equity" value={money(reports.balanceSheet?.equity?.total)} />
      </Panel>
    </div>
  );
}
