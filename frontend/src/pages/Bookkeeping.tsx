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
  return <section className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</section>;
}

function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
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

function TransactionDialog({ accounts, categories, vendors, onSaved }: { accounts: BookkeepingRecord[]; categories: BookkeepingRecord[]; vendors: BookkeepingRecord[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [form, setForm] = useState<BookkeepingRecord>({ type: "EXPENSE", description: "", amount: "", currency: "CAD", transactionDate: today(), status: "POSTED" });

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
      const transaction = await createTransaction({
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
      });
      if (fileId && transaction?.id) {
        await linkDocument(fileId, "BookkeepingTransaction", transaction.id);
      }
      toast.success("Transaction saved");
      setForm({ type: "EXPENSE", description: "", amount: "", currency: "CAD", transactionDate: today(), status: "POSTED" });
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
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Transaction</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manual Transaction</DialogTitle>
          <DialogDescription>Create income, expense, adjustment, or refund records. Receipts are stored in Documents.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Type"><Select value={form.type} onValueChange={(type) => setForm({ ...form, type })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["INCOME", "EXPENSE", "ADJUSTMENT", "REFUND"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Account"><Select value={form.accountId || ""} onValueChange={(accountId) => setForm({ ...form, accountId })}><SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger><SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Category"><Select value={form.categoryId || ""} onValueChange={(categoryId) => setForm({ ...form, categoryId })}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Vendor"><Select value={form.vendorId || ""} onValueChange={(vendorId) => setForm({ ...form, vendorId })}><SelectTrigger><SelectValue placeholder="Optional vendor" /></SelectTrigger><SelectContent>{vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Amount"><Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="Date"><Input type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} /></Field>
          <Field label="Payment Method"><Input value={form.paymentMethod || ""} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} placeholder="Card, EFT, cash" /></Field>
          <Field label="Reference"><Input value={form.reference || ""} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Receipt, cheque, transaction id" /></Field>
          <div className="md:col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What happened?" /></Field></div>
          <div className="md:col-span-2"><Field label="Receipt"><Input type="file" onChange={(e) => setReceipt(e.target.files?.[0] || null)} /></Field></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Transaction"}</Button></DialogFooter>
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
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Fill the required details and save.</DialogDescription></DialogHeader>
        <div className="grid gap-3">
          {fields.map((field) => (
            <Field key={field.key} label={field.label}>
              {field.options ? (
                <Select value={form[field.key] || ""} onValueChange={(value) => setForm({ ...form, [field.key]: value })}><SelectTrigger><SelectValue placeholder={field.label} /></SelectTrigger><SelectContent>{field.options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>
              ) : (
                <Input type={field.type || "text"} value={form[field.key] || ""} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} />
              )}
            </Field>
          ))}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BookkeepingPage() {
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());
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
        safe(getBookkeepingDashboard(), {}, "dashboard"),
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
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-[#0891B2]"><Landmark className="h-4 w-4" /> Finance</div>
            <h1 className="text-2xl font-semibold text-[#0F172A]">Bookkeeping</h1>
            <p className="text-sm text-[#64748B]">Tenant-safe ledger, accounts, reports, reconciliation, and finance sync.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={setup}><WalletCards className="mr-2 h-4 w-4" />Setup</Button>
            <Button variant="outline" onClick={sync}><RefreshCw className="mr-2 h-4 w-4" />Sync Finance</Button>
            <TransactionDialog accounts={accounts} categories={categories} vendors={vendors} onSaved={reload} />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {[
            ["Income", dashboard.totals?.totalIncome, "text-emerald-600"],
            ["Expenses", dashboard.totals?.totalExpenses, "text-rose-600"],
            ["Net Profit", dashboard.totals?.netProfit, "text-slate-900"],
            ["Cash / Bank", dashboard.totals?.cashBankBalance, "text-cyan-700"],
          ].map(([label, value, tone]) => (
            <Panel key={String(label)}>
              <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
              <p className={`mt-2 text-2xl font-semibold ${tone}`}>{money(value)}</p>
            </Panel>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 md:flex-row md:items-center">
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search transactions, vendors, accounts" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="md:w-40" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="md:w-40" />
          <Button variant="outline" onClick={reload} disabled={loading}>Refresh</Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex h-auto flex-wrap justify-start">
            {["overview", "transactions", "accounts", "categories", "vendors", "reconciliation", "recurring", "reports"].map((tab) => (
              <TabsTrigger key={tab} value={tab} className="capitalize">{tab}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 lg:grid-cols-3">
              <Panel className="lg:col-span-2">
                <h2 className="mb-3 text-base font-semibold text-slate-900">Recent Transactions</h2>
                <TransactionTable rows={transactions.slice(0, 8)} accountName={accountName} categoryName={categoryName} vendorName={vendorName} onVoid={async (id) => { await voidTransaction(id); reload(); }} onReceipt={attachReceiptToTransaction} onToggleReconcile={toggleReconciled} />
              </Panel>
              <Panel>
                <h2 className="mb-3 text-base font-semibold text-slate-900">Operating Signals</h2>
                <div className="space-y-3 text-sm">
                  <Metric label="Unpaid invoices" value={dashboard.totals?.unpaidInvoices || 0} />
                  <Metric label="Overdue invoices" value={dashboard.totals?.overdueInvoices || 0} />
                  <Metric label="Pending expenses" value={dashboard.totals?.pendingExpenses || 0} />
                  <Metric label="Bookkeeping accounts" value={accounts.length} />
                </div>
              </Panel>
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <Panel>
              <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold">Transactions Ledger</h2><TransactionDialog accounts={accounts} categories={categories} vendors={vendors} onSaved={reload} /></div>
              <TransactionTable rows={transactions} accountName={accountName} categoryName={categoryName} vendorName={vendorName} onVoid={async (id) => { await voidTransaction(id); reload(); }} onReceipt={attachReceiptToTransaction} onToggleReconcile={toggleReconciled} />
            </Panel>
          </TabsContent>

          <TabsContent value="accounts">
            <Panel>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold">Chart of Accounts</h2>
                <SimpleCreateDialog title="Account" trigger={<Button><Plus className="mr-2 h-4 w-4" />Account</Button>} fields={[
                  { key: "name", label: "Name" }, { key: "code", label: "Code" }, { key: "type", label: "Type", options: ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"] }, { key: "subtype", label: "Subtype" }, { key: "openingBalance", label: "Opening Balance", type: "number" },
                ]} onSubmit={async (data) => { await createAccount({ ...data, currency: "CAD" }); reload(); }} />
              </div>
              <DataTable columns={["Name", "Code", "Type", "Balance", "Bank", "Status"]} rows={accounts.map((a) => ({ Name: a.name, Code: a.code || "-", Type: a.type, Balance: money(a.currentBalance), Bank: a.isBankAccount ? "Yes" : "No", Status: a.isActive ? "Active" : "Inactive" }))} />
            </Panel>
          </TabsContent>

          <TabsContent value="categories">
            <Panel>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold">Income & Expense Categories</h2>
                <SimpleCreateDialog title="Category" trigger={<Button><Plus className="mr-2 h-4 w-4" />Category</Button>} fields={[{ key: "name", label: "Name" }, { key: "type", label: "Type", options: ["INCOME", "EXPENSE"] }, { key: "color", label: "Color" }]} onSubmit={async (data) => { await createCategory(data); reload(); }} />
              </div>
              <DataTable columns={["Name", "Type", "Color", "Status"]} rows={categories.map((c) => ({ Name: c.name, Type: c.type, Color: c.color || "-", Status: c.isActive ? "Active" : "Inactive" }))} />
            </Panel>
          </TabsContent>

          <TabsContent value="vendors">
            <Panel>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold">Vendors</h2>
                <SimpleCreateDialog title="Vendor" trigger={<Button><Plus className="mr-2 h-4 w-4" />Vendor</Button>} fields={[{ key: "name", label: "Name" }, { key: "email", label: "Email", type: "email" }, { key: "phone", label: "Phone", type: "tel" }, { key: "website", label: "Website", type: "url" }, { key: "taxId", label: "Tax ID" }]} onSubmit={async (data) => { await createVendor(normalizeVendorPayload(data)); reload(); }} />
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
  return <div className="flex items-center justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">{label}</span><span className="font-semibold text-slate-900">{value}</span></div>;
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
}) {
  if (!rows.length) return <EmptyState title="No transactions found." />;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader><TableRow>{["Date", "Number", "Type", "Description", "Account", "Category", "Vendor", "Source", "Sync", "Receipt", "Amount", "Status", "Actions"].map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
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
                <label className="inline-flex cursor-pointer items-center rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">
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
              <div className="flex flex-wrap gap-1">
                <Button variant="ghost" size="sm" onClick={() => onToggleReconcile(tx)}>{tx.isReconciled || tx.status === "RECONCILED" ? "Unreconcile" : "Reconcile"}</Button>
                {tx.status !== "VOID" && !(tx.isReconciled || tx.status === "RECONCILED") ? <Button variant="ghost" size="sm" onClick={() => onVoid(tx.id)}>Void</Button> : null}
              </div>
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
    <div className="overflow-x-auto">
      <Table><TableHeader><TableRow>{columns.map((col) => <TableHead key={col}>{col}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((row, index) => <TableRow key={index}>{columns.map((col) => <TableCell key={col}>{row[col]}</TableCell>)}</TableRow>)}</TableBody></Table>
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
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel>
        <h2 className="mb-3 text-base font-semibold">New Reconciliation</h2>
        <div className="space-y-3">
          <Field label="Account"><Select value={form.accountId || ""} onValueChange={(accountId) => setForm({ ...form, accountId })}><SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger><SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Statement Date"><Input type="date" value={form.statementDate} onChange={(e) => setForm({ ...form, statementDate: e.target.value })} /></Field>
          <Field label="Starting Balance"><Input type="number" value={form.statementStartingBalance} onChange={(e) => setForm({ ...form, statementStartingBalance: e.target.value })} /></Field>
          <Field label="Ending Balance"><Input type="number" value={form.statementEndingBalance} onChange={(e) => setForm({ ...form, statementEndingBalance: e.target.value })} /></Field>
          <Metric label="Selected movement" value={money(selectedTotal)} />
          <Metric label="Calculated difference" value={money(calculatedDifference)} />
          <div className="max-h-56 space-y-2 overflow-auto rounded-md border border-slate-200 p-2">
            {accountTransactions.length ? accountTransactions.map((tx) => (
              <label key={tx.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-slate-50">
                <Checkbox checked={selectedIds.includes(tx.id)} onCheckedChange={() => toggleTransaction(tx.id)} />
                <span className="min-w-0 flex-1 truncate">{tx.description}</span>
                <span className={tx.type === "EXPENSE" ? "text-rose-600" : "text-emerald-600"}>{money(tx.amount, tx.currency || "CAD")}</span>
              </label>
            )) : <p className="py-3 text-center text-sm text-slate-500">Select an account to choose unreconciled transactions.</p>}
          </div>
          <Button onClick={save} className="w-full">Create Draft</Button>
        </div>
      </Panel>
      <Panel className="lg:col-span-2">
        <h2 className="mb-3 text-base font-semibold">Reconciliations</h2>
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
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Recurring Income & Expenses</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={async () => { await runDueRecurringRules(); toast.success("Due rules processed"); onSaved(); }}>Run Due</Button>
          <SimpleCreateDialog title="Recurring Rule" trigger={<Button><Plus className="mr-2 h-4 w-4" />Rule</Button>} fields={[
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
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold">Profit & Loss</h2><Button variant="outline" size="sm" onClick={() => download("profit-loss-export")}><Download className="mr-2 h-4 w-4" />CSV</Button></div>
        <Metric label="Income" value={money(reports.profitLoss?.totals?.income)} />
        <Metric label="Expenses" value={money(reports.profitLoss?.totals?.expenses)} />
        <Metric label="Net Profit" value={money(reports.profitLoss?.netProfit)} />
      </Panel>
      <Panel>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold">Cash Flow</h2><Button variant="outline" size="sm" onClick={() => download("transactions-export")}><Download className="mr-2 h-4 w-4" />Transactions</Button></div>
        <Metric label="Money In" value={money(reports.cashFlow?.moneyIn)} />
        <Metric label="Money Out" value={money(reports.cashFlow?.moneyOut)} />
        <Metric label="Net Movement" value={money(reports.cashFlow?.netCashMovement)} />
      </Panel>
      <Panel>
        <h2 className="mb-3 text-base font-semibold">Tax Summary</h2>
        <Metric label="Tax Collected" value={money(reports.taxSummary?.taxCollected)} />
        <Metric label="Tax Paid" value={money(reports.taxSummary?.taxPaid)} />
        <Metric label="Net Tax Estimate" value={money(reports.taxSummary?.netTaxEstimate)} />
      </Panel>
      <Panel>
        <h2 className="mb-3 text-base font-semibold">Balance Sheet</h2>
        <Metric label="Assets" value={money(reports.balanceSheet?.assets?.total)} />
        <Metric label="Liabilities" value={money(reports.balanceSheet?.liabilities?.total)} />
        <Metric label="Equity" value={money(reports.balanceSheet?.equity?.total)} />
      </Panel>
    </div>
  );
}
