import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Eye, MoreHorizontal, Pencil, Plus, Receipt, Search, Trash2 } from "lucide-react";

import {
  getBillingInvoices,
  getPayment,
  getPayments,
  recordPayment,
  updatePayment,
  voidPayment,
  type BillingRecord,
} from "@/features/billing/services/billing-service";
import { useCanPerformAction } from "@/hooks/usePermissionAccess";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const PAYMENT_METHODS = ["BANK_TRANSFER", "E_TRANSFER", "CREDIT_CARD", "DEBIT_CARD", "CHECK", "CASH", "STRIPE", "PAYPAL", "OTHER"];

const emptyForm = {
  invoiceId: "",
  amount: "",
  paymentMethod: "BANK_TRANSFER",
  paymentDate: new Date().toISOString().slice(0, 10),
  reference: "",
  notes: "",
};

const money = (value: unknown, currency = "CAD") => new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency,
  maximumFractionDigits: 2,
}).format(Number(value || 0));

const dateLabel = (value?: string) => value
  ? new Date(value).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
  : "-";

const methodLabel = (value?: string) => String(value || "OTHER").replaceAll("_", " ");

const effectiveAmount = (payment: BillingRecord) => {
  const status = String(payment.status || "SUCCESSFUL").toUpperCase();
  if (status === "SUCCESSFUL") return Number(payment.amount || 0);
  if (status === "PARTIALLY_REFUNDED") {
    return Math.max(Number(payment.amount || 0) - Number(payment.refundAmount || 0), 0);
  }
  return 0;
};

const statusClasses: Record<string, string> = {
  SUCCESSFUL: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PARTIALLY_REFUNDED: "border-amber-200 bg-amber-50 text-amber-700",
  REFUNDED: "border-blue-200 bg-blue-50 text-blue-700",
  FAILED: "border-red-200 bg-red-50 text-red-700",
  VOIDED: "border-slate-200 bg-slate-100 text-slate-600",
};

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const canCreate = useCanPerformAction("payments", "create");
  const canUpdate = useCanPerformAction("payments", "update");
  const canDelete = useCanPerformAction("payments", "delete");
  const [editorMode, setEditorMode] = useState<"create" | "edit" | null>(null);
  const [editingPayment, setEditingPayment] = useState<BillingRecord | null>(null);
  const [viewPaymentId, setViewPaymentId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<BillingRecord | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [form, setForm] = useState(emptyForm);

  const paymentsQuery = useQuery({ queryKey: ["payments"], queryFn: () => getPayments() });
  const invoicesQuery = useQuery({ queryKey: ["billing-invoices"], queryFn: () => getBillingInvoices({ status: "all" }) });
  const paymentDetailQuery = useQuery({
    queryKey: ["payment", viewPaymentId],
    queryFn: () => getPayment(viewPaymentId!),
    enabled: Boolean(viewPaymentId),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    queryClient.invalidateQueries({ queryKey: ["billing-invoices"] });
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    queryClient.invalidateQueries({ queryKey: ["bookkeeping"] });
  };

  const closeEditor = () => {
    setEditorMode(null);
    setEditingPayment(null);
    setForm(emptyForm);
  };

  const createMutation = useMutation({
    mutationFn: () => recordPayment({ ...form, amount: Number(form.amount) }),
    onSuccess: () => {
      refresh();
      closeEditor();
      toast({ title: "Payment recorded" });
    },
    onError: (error: any) => toast({
      title: "Payment failed",
      description: error?.response?.data?.message || error?.message,
      variant: "destructive",
    }),
  });

  const updateMutation = useMutation({
    mutationFn: () => updatePayment(editingPayment!.id, {
      amount: Number(form.amount),
      paymentMethod: form.paymentMethod,
      paymentDate: form.paymentDate,
      reference: form.reference,
      notes: form.notes,
    }),
    onSuccess: () => {
      refresh();
      closeEditor();
      toast({ title: "Payment updated" });
    },
    onError: (error: any) => toast({
      title: "Payment update failed",
      description: error?.response?.data?.message || error?.message,
      variant: "destructive",
    }),
  });

  const voidMutation = useMutation({
    mutationFn: (id: string) => voidPayment(id),
    onSuccess: () => {
      refresh();
      setVoidTarget(null);
      toast({ title: "Payment voided", description: "Invoice and bookkeeping balances were recalculated." });
    },
    onError: (error: any) => toast({
      title: "Payment could not be voided",
      description: error?.response?.data?.message || error?.message,
      variant: "destructive",
    }),
  });

  const payments = paymentsQuery.data || [];
  const invoices = (invoicesQuery.data || []).filter((invoice) => Number(invoice.amountDue || 0) > 0);
  const filteredPayments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return payments.filter((payment) => {
      const status = String(payment.status || "SUCCESSFUL").toUpperCase();
      if (statusFilter !== "ALL" && status !== statusFilter) return false;
      if (!needle) return true;
      return [
        payment.paymentNumber,
        payment.reference,
        payment.client?.clientName,
        payment.invoice?.invoiceNumber,
        payment.paymentMethod,
      ].some((value) => String(value || "").toLowerCase().includes(needle));
    });
  }, [payments, search, statusFilter]);
  const total = payments.reduce((sum, payment) => sum + effectiveAmount(payment), 0);

  const openCreate = () => {
    setEditingPayment(null);
    setForm(emptyForm);
    setEditorMode("create");
  };

  const openEdit = (payment: BillingRecord) => {
    setEditingPayment(payment);
    setForm({
      invoiceId: payment.invoiceId || payment.invoice?.id || "",
      amount: String(payment.amount || ""),
      paymentMethod: payment.paymentMethod || "BANK_TRANSFER",
      paymentDate: payment.paymentDate ? new Date(payment.paymentDate).toISOString().slice(0, 10) : emptyForm.paymentDate,
      reference: payment.reference || "",
      notes: payment.notes || "",
    });
    setEditorMode("edit");
  };

  const submitPayment = () => {
    if (!form.amount || Number(form.amount) <= 0 || (editorMode === "create" && !form.invoiceId)) {
      toast({ title: "Complete the required payment fields", variant: "destructive" });
      return;
    }
    if (editorMode === "edit") updateMutation.mutate();
    else createMutation.mutate();
  };

  const selectedPayment = paymentDetailQuery.data;
  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-semibold text-[#0F172A]">Payments</h1>
            <p className="text-sm text-[#64748B]">Record, review, update, and safely void customer invoice payments.</p>
          </div>
          {canCreate ? (
            <Button onClick={openCreate} className="gap-2 bg-[#0F766E] hover:bg-[#115E59]">
              <Plus size={16} />Record Payment
            </Button>
          ) : null}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-[#E2E8F0] bg-white p-4"><Receipt className="text-[#0F766E]" size={20} /><p className="mt-2 text-sm text-[#64748B]">Payments</p><p className="text-xl font-semibold">{payments.length}</p></div>
          <div className="rounded-lg border border-[#E2E8F0] bg-white p-4"><CreditCard className="text-[#0F766E]" size={20} /><p className="mt-2 text-sm text-[#64748B]">Net Collected</p><p className="text-xl font-semibold">{money(total)}</p></div>
          <div className="rounded-lg border border-[#E2E8F0] bg-white p-4"><Receipt className="text-[#0F766E]" size={20} /><p className="mt-2 text-sm text-[#64748B]">Open Invoices</p><p className="text-xl font-semibold">{invoices.length}</p></div>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search payments, clients, invoices, references..." className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["ALL", "SUCCESSFUL", "PARTIALLY_REFUNDED", "REFUNDED", "FAILED", "VOIDED"].map((status) => (
                <SelectItem key={status} value={status}>{status === "ALL" ? "All statuses" : methodLabel(status)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
          {paymentsQuery.isLoading ? <div className="p-8 text-center text-sm text-[#64748B]">Loading payments...</div> : null}
          {paymentsQuery.isError ? <div className="p-8 text-center text-sm text-red-600">Payments could not be loaded.</div> : null}
          {filteredPayments.map((payment) => {
            const status = String(payment.status || "SUCCESSFUL").toUpperCase();
            const editable = ["SUCCESSFUL", "PARTIALLY_REFUNDED"].includes(status);
            return (
              <div key={payment.id} className="grid items-center gap-3 border-b border-[#F1F5F9] px-4 py-3 last:border-0 md:grid-cols-[2fr_1fr_1fr_1.2fr_auto]">
                <div>
                  <p className="font-medium text-[#0F172A]">{payment.paymentNumber || payment.reference || payment.id}</p>
                  <p className="text-sm text-[#64748B]">{payment.client?.clientName || "Account"} · Invoice {payment.invoice?.invoiceNumber || "-"}</p>
                </div>
                <p className="font-semibold text-[#0F766E]">{money(payment.amount, payment.invoice?.currency || "CAD")}</p>
                <p className="text-sm text-[#475569]">{methodLabel(payment.paymentMethod)}</p>
                <div>
                  <Badge variant="outline" className={statusClasses[status] || "border-slate-200 bg-slate-50 text-slate-700"}>{methodLabel(status)}</Badge>
                  <p className="mt-1 text-xs text-[#64748B]">{dateLabel(payment.paymentDate)}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Payment actions"><MoreHorizontal size={17} /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setViewPaymentId(payment.id)}><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
                    {canUpdate && editable ? <DropdownMenuItem onClick={() => openEdit(payment)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem> : null}
                    {canDelete && status !== "VOIDED" ? <DropdownMenuItem onClick={() => setVoidTarget(payment)} className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-4 w-4" />Void payment</DropdownMenuItem> : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
          {!paymentsQuery.isLoading && !filteredPayments.length ? <div className="p-8 text-center text-sm text-[#64748B]">No matching payments found.</div> : null}
        </div>
      </main>

      <Dialog open={Boolean(editorMode)} onOpenChange={(open) => { if (!open) closeEditor(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editorMode === "edit" ? "Edit Payment" : "Record Payment"}</DialogTitle>
            <DialogDescription>{editorMode === "edit" ? "Update payment details and recalculate the linked invoice." : "Record a payment against an open customer invoice."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Invoice *</Label>
              <Select value={form.invoiceId} disabled={editorMode === "edit"} onValueChange={(value) => {
                const invoice = invoices.find((item) => item.id === value);
                setForm((current) => ({ ...current, invoiceId: value, amount: String(invoice?.amountDue || "") }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                <SelectContent>{invoices.map((invoice) => <SelectItem key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} · {money(invoice.amountDue, invoice.currency)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Amount *</Label><Input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Payment Date *</Label><Input type="date" value={form.paymentDate} onChange={(event) => setForm((current) => ({ ...current, paymentDate: event.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <Select value={form.paymentMethod} onValueChange={(value) => setForm((current) => ({ ...current, paymentMethod: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map((method) => <SelectItem key={method} value={method}>{methodLabel(method)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Reference / Transaction Number</Label><Input value={form.reference} onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditor}>Cancel</Button>
            <Button onClick={submitPayment} disabled={saving} className="bg-[#0F766E] hover:bg-[#115E59]">{saving ? "Saving..." : editorMode === "edit" ? "Save Changes" : "Record Payment"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewPaymentId)} onOpenChange={(open) => { if (!open) setViewPaymentId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>Customer payment, invoice, and transaction information.</DialogDescription>
          </DialogHeader>
          {paymentDetailQuery.isLoading ? <p className="py-8 text-center text-sm text-[#64748B]">Loading payment...</p> : null}
          {selectedPayment ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Payment", selectedPayment.paymentNumber || selectedPayment.id],
                ["Status", methodLabel(selectedPayment.status)],
                ["Amount", money(selectedPayment.amount, selectedPayment.invoice?.currency || "CAD")],
                ["Method", methodLabel(selectedPayment.paymentMethod)],
                ["Date", dateLabel(selectedPayment.paymentDate)],
                ["Invoice", selectedPayment.invoice?.invoiceNumber || "-"],
                ["Customer", selectedPayment.client?.clientName || "-"],
                ["Reference", selectedPayment.reference || "-"],
              ].map(([label, value]) => <div key={label} className="rounded-md bg-[#F8FAFC] p-3"><p className="text-xs font-medium uppercase text-[#64748B]">{label}</p><p className="mt-1 break-words text-sm font-medium text-[#0F172A]">{value}</p></div>)}
              {selectedPayment.notes ? <div className="sm:col-span-2"><Label>Notes</Label><p className="mt-2 whitespace-pre-wrap rounded-md bg-[#F8FAFC] p-3 text-sm text-[#475569]">{selectedPayment.notes}</p></div> : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(voidTarget)} onOpenChange={(open) => { if (!open) setVoidTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              The payment will remain in the audit history, but its value will be removed from the invoice and bookkeeping totals. Reconciled payments cannot be voided.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => voidTarget && voidMutation.mutate(voidTarget.id)} className="bg-red-600 hover:bg-red-700">
              {voidMutation.isPending ? "Voiding..." : "Void Payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
