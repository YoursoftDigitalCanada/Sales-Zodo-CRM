import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { getBillingInvoices, getPayments, recordPayment } from "@/features/billing/services/billing-service";
import { CreditCard, Plus, Receipt } from "lucide-react";

const money = (value: unknown, currency = "CAD") => new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value || 0));
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) : "-";

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ invoiceId: "", amount: "", paymentMethod: "BANK_TRANSFER", reference: "", notes: "" });
  const paymentsQuery = useQuery({ queryKey: ["payments"], queryFn: () => getPayments() });
  const invoicesQuery = useQuery({ queryKey: ["billing-invoices"], queryFn: () => getBillingInvoices({ status: "all" }) });
  const saveMutation = useMutation({
    mutationFn: () => recordPayment({ ...form, amount: Number(form.amount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["billing-invoices"] });
      setOpen(false);
      setForm({ invoiceId: "", amount: "", paymentMethod: "BANK_TRANSFER", reference: "", notes: "" });
      toast({ title: "Payment recorded" });
    },
    onError: (error: any) => toast({ title: "Payment failed", description: error?.response?.data?.message || error?.message, variant: "destructive" }),
  });
  const payments = paymentsQuery.data || [];
  const invoices = (invoicesQuery.data || []).filter((invoice) => Number(invoice.amountDue || 0) > 0);
  const total = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div><h1 className="text-2xl font-semibold text-[#0F172A]">Payments</h1><p className="text-sm text-[#64748B]">Record customer payments against SaaS invoices and subscriptions.</p></div>
          <Button onClick={() => setOpen(true)} className="gap-2 bg-[#0F766E] hover:bg-[#115E59]"><Plus size={16} />Record Payment</Button>
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-[#E2E8F0] bg-white p-4"><Receipt className="text-[#0F766E]" size={20} /><p className="mt-2 text-sm text-[#64748B]">Payments</p><p className="text-xl font-semibold">{payments.length}</p></div>
          <div className="rounded-lg border border-[#E2E8F0] bg-white p-4"><CreditCard className="text-[#0F766E]" size={20} /><p className="mt-2 text-sm text-[#64748B]">Collected</p><p className="text-xl font-semibold">{money(total)}</p></div>
          <div className="rounded-lg border border-[#E2E8F0] bg-white p-4"><Receipt className="text-[#0F766E]" size={20} /><p className="mt-2 text-sm text-[#64748B]">Open Invoices</p><p className="text-xl font-semibold">{invoices.length}</p></div>
        </div>
        <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
          {payments.map((payment) => (
            <div key={payment.id} className="grid gap-3 border-b border-[#F1F5F9] px-4 py-3 last:border-0 md:grid-cols-5">
              <div className="md:col-span-2"><p className="font-medium text-[#0F172A]">{payment.paymentNumber || payment.reference || payment.id}</p><p className="text-sm text-[#64748B]">{payment.client?.clientName || "Account"} · Invoice {payment.invoice?.invoiceNumber || "-"}</p></div>
              <p className="font-semibold text-[#0F766E]">{money(payment.amount)}</p>
              <Badge variant="outline">{payment.paymentMethod}</Badge>
              <p className="text-sm text-[#64748B]">{dateLabel(payment.paymentDate)} · {payment.status || "SUCCESSFUL"}</p>
            </div>
          ))}
          {!payments.length && <div className="p-8 text-center text-sm text-[#64748B]">No payments recorded yet.</div>}
        </div>
      </main>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Invoice</Label><Select value={form.invoiceId} onValueChange={(value) => {
              const invoice = invoices.find((item) => item.id === value);
              setForm((current) => ({ ...current, invoiceId: value, amount: String(invoice?.amountDue || "") }));
            }}><SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger><SelectContent>{invoices.map((invoice) => <SelectItem key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} · {money(invoice.amountDue, invoice.currency)}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Payment Method</Label><Select value={form.paymentMethod} onValueChange={(value) => setForm((c) => ({ ...c, paymentMethod: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["BANK_TRANSFER", "CREDIT_CARD", "E_TRANSFER", "CHECK", "CASH", "STRIPE", "OTHER"].map((method) => <SelectItem key={method} value={method}>{method.replace("_", " ")}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Reference / Transaction Number</Label><Input value={form.reference} onChange={(e) => setForm((c) => ({ ...c, reference: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={() => saveMutation.mutate()} className="bg-[#0F766E] hover:bg-[#115E59]">Record Payment</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
