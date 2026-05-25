// src/pages/InvoiceDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  createInvoice,
  getInvoiceById,
  recordInvoicePayment,
  sendInvoice,
  downloadInvoicePdf,
  saveInvoicePdfToDocuments,
  updateInvoicePaymentStatus,
} from "@/services/invoiceService";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  ArrowLeft,
  Send,
  Download,
  Loader2,
  CheckCircle2,
  Receipt,
  CalendarDays,
  Building2,
  Users,
  FileText,
  DollarSign,
  Clock3,
  AlertTriangle,
  XCircle,
  Eye,
  Hash,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Copy,
  FilePlus,
  Undo2,
  BanknoteIcon,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  taxRate?: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  sentAt?: string;
  viewedAt?: string;
  paidAt?: string;
  notes?: string;
  terms?: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: Record<string, string>;
  businessGstHstNumber?: string;
  clientBusinessName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: Record<string, string>;
  clientGstHstNumber?: string;
  client?: {
    id: string;
    clientName: string;
    companyName?: string;
    primaryEmail?: string;
    primaryPhone?: string;
    streetAddress?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
  };
  contact?: {
    id: string;
    contactName: string;
    email?: string | null;
    officePhone?: string | null;
    mobilePhone?: string | null;
  } | null;
  quote?: { id: string; quoteNumber: string } | null;
  project?: { id: string; name?: string | null; projectNumber?: string | null } | null;
  contract?: { id: string; contractNumber: string; title: string } | null;
  quoteId?: string | null;
  projectId?: string | null;
  contractId?: string | null;
  contactId?: string | null;
  items: InvoiceItem[];
  payments?: Array<{
    id: string;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    reference?: string | null;
    notes?: string | null;
    status?: string;
    refundAmount?: number;
    refundedAt?: string | null;
    voidedAt?: string | null;
  }>;
  createdAt: string;
}

// ============================================
// UTILITIES
// ============================================

const formatCurrency = (amount?: number, currency = "CAD") => {
  if (amount === undefined || amount === null) return "$0.00";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-CA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusConfig = (status: string) => {
  const s = status?.toUpperCase() || "DRAFT";
  const configs: Record<string, { bg: string; text: string; icon: LucideIcon; label: string }> = {
    DRAFT: { bg: "bg-slate-100", text: "text-slate-600", icon: FileText, label: "Draft" },
    SENT: { bg: "bg-blue-100", text: "text-blue-600", icon: Send, label: "Sent" },
    VIEWED: { bg: "bg-purple-100", text: "text-purple-600", icon: Eye, label: "Viewed" },
    PAID: { bg: "bg-green-100", text: "text-green-600", icon: CheckCircle2, label: "Paid" },
    PARTIALLY_PAID: { bg: "bg-amber-100", text: "text-amber-600", icon: Clock3, label: "Partially Paid" },
    OVERDUE: { bg: "bg-red-100", text: "text-red-600", icon: AlertTriangle, label: "Overdue" },
    CANCELLED: { bg: "bg-slate-100", text: "text-slate-400", icon: XCircle, label: "Cancelled" },
  };
  return configs[s] || configs.DRAFT;
};

const isOverdue = (dueDate?: string, status?: string) => {
  const s = status?.toUpperCase();
  if (!dueDate || s === "PAID" || s === "CANCELLED") return false;
  return new Date(dueDate) < new Date();
};

// ============================================
// SUB-COMPONENTS
// ============================================

const InfoRow = ({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon size={15} className="text-[#94A3B8] mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-[#94A3B8]">{label}</p>
        <p className="text-sm text-[#0F172A]">{value}</p>
      </div>
    </div>
  );
};

const SectionCard = ({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden"
  >
    <div className="px-6 py-4 border-b border-[rgba(15,23,42,0.06)] flex items-center gap-2">
      <div className="w-8 h-8 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
        <Icon size={16} className="text-[#0891B2]" />
      </div>
      <h3 className="font-semibold text-[#0F172A]">{title}</h3>
    </div>
    <div className="p-6">{children}</div>
  </motion.div>
);

// ============================================
// MAIN COMPONENT
// ============================================

const InvoiceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isMobile } = useIsMobile();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [paymentNotes, setPaymentNotes] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getInvoiceById(id)
      .then((data) => setInvoice(data))
      .catch(() => {
        toast({ title: "Error", description: "Failed to load invoice.", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSend = async () => {
    if (!invoice) return;
    setActionLoading("send");
    try {
      await sendInvoice(invoice.id, invoice.clientEmail || invoice.client?.primaryEmail);
      toast({ title: "Invoice Sent!", description: `Invoice ${invoice.invoiceNumber} has been sent.` });
      const updated = await getInvoiceById(invoice.id);
      setInvoice(updated);
    } catch {
      toast({ title: "Error", description: "Failed to send invoice.", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRecordPayment = async () => {
    if (!invoice) return;
    setActionLoading("paid");
    try {
      await recordInvoicePayment(invoice.id, {
        amount: Number(paymentAmount),
        paymentMethod: paymentMethod as
          | "CASH"
          | "CREDIT_CARD"
          | "CHECK"
          | "BANK_TRANSFER"
          | "E_TRANSFER"
          | "OTHER",
        notes: paymentNotes || undefined,
      });
      toast({
        title: "Payment Recorded",
        description: `Payment recorded against ${invoice.invoiceNumber}.`,
      });
      const updated = await getInvoiceById(invoice.id);
      setInvoice(updated);
      setPaymentSheetOpen(false);
      setPaymentNotes("");
    } catch {
      toast({ title: "Error", description: "Failed to record payment.", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async () => {
    if (!invoice || !invoice.client?.id) {
      toast({
        title: "Client required",
        description: "This invoice cannot be duplicated because its client record is missing.",
        variant: "destructive",
      });
      return;
    }
    setActionLoading("duplicate");
    try {
      const duplicate = await createInvoice({
        clientId: invoice.client.id,
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        invoiceDate: new Date().toISOString(),
        dueDate: invoice.dueDate || new Date(Date.now() + 30 * 86400000).toISOString(),
        currency: invoice.currency || "CAD",
        discountAmount: invoice.discountAmount || 0,
        notes: invoice.notes,
        items: invoice.items.map((item, index) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          sortOrder: index,
        })),
      } as any);
      toast({
        title: "Invoice Duplicated",
        description: `Created ${duplicate.invoiceNumber}.`,
      });
      navigate(`/invoice/${duplicate.id}/edit`);
    } catch {
      toast({ title: "Error", description: "Failed to duplicate invoice.", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownload = async () => {
    if (!invoice) return;
    setActionLoading("download");
    try {
      await downloadInvoicePdf(invoice.id);
      toast({ title: "Downloaded", description: "PDF downloaded successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to download PDF.", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveDocument = async () => {
    if (!invoice) return;
    setActionLoading("save-document");
    try {
      await saveInvoicePdfToDocuments(invoice.id);
      toast({ title: "Saved to Documents", description: "Invoice PDF is linked to this invoice." });
    } catch {
      toast({ title: "Error", description: "Failed to save invoice PDF to Documents.", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePaymentStatus = async (
    paymentId: string,
    status: "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED" | "VOIDED",
  ) => {
    if (!invoice) return;
    const payment = invoice.payments?.find((item) => item.id === paymentId);
    const refundAmount = status === "PARTIALLY_REFUNDED"
      ? Number(window.prompt("Refund amount", payment ? String(payment.amount / 2) : "0") || 0)
      : undefined;
    if (status === "PARTIALLY_REFUNDED" && (!refundAmount || refundAmount <= 0)) return;
    const confirmed = window.confirm(`Mark this payment as ${status.replaceAll("_", " ").toLowerCase()}?`);
    if (!confirmed) return;
    setActionLoading(`payment-${paymentId}`);
    try {
      const updated = await updateInvoicePaymentStatus(invoice.id, paymentId, { status, refundAmount });
      setInvoice(updated as InvoiceData);
      toast({ title: "Payment Updated", description: "Invoice balance and bookkeeping sync were updated." });
    } catch {
      toast({ title: "Error", description: "Failed to update payment status.", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (!invoice) return;
    const outstanding = Math.max(Number(invoice.amountDue || invoice.total - invoice.amountPaid), 0);
    setPaymentAmount(outstanding > 0 ? String(outstanding) : "");
  }, [invoice]);

  const paymentMethodOptions = [
    { value: "BANK_TRANSFER", label: "Bank Transfer", icon: Building2 },
    { value: "CASH", label: "Cash", icon: BanknoteIcon },
    { value: "CREDIT_CARD", label: "Credit / Debit Card", icon: CreditCard },
    { value: "E_TRANSFER", label: "E-Transfer", icon: Wallet },
    { value: "CHECK", label: "Cheque", icon: FileText },
    { value: "OTHER", label: "Other", icon: Receipt },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#0891B2]" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
        <Receipt size={48} className="text-[#94A3B8]" />
        <h2 className="text-xl font-bold text-[#0F172A]">Invoice Not Found</h2>
        <p className="text-[#475569]">The invoice you're looking for doesn't exist or has been deleted.</p>
        <Button onClick={() => navigate("/invoice")} className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md">
          Back to Invoices
        </Button>
      </div>
    );
  }

  const overdue = isOverdue(invoice.dueDate, invoice.status);
  const effectiveStatus = overdue && invoice.status?.toUpperCase() !== "PAID" ? "OVERDUE" : invoice.status?.toUpperCase();
  const statusConfig = getStatusConfig(effectiveStatus || "DRAFT");
  const StatusIcon = statusConfig.icon;

  const clientName = invoice.client?.clientName || invoice.clientBusinessName || "Client";
  const clientEmail = invoice.clientEmail || invoice.client?.primaryEmail;
  const clientPhone = invoice.clientPhone || invoice.client?.primaryPhone;
  const contactPhone = invoice.contact?.mobilePhone || invoice.contact?.officePhone;
  const clientAddr = invoice.clientAddress
    ? [invoice.clientAddress.address, invoice.clientAddress.city, invoice.clientAddress.province, invoice.clientAddress.postalCode].filter(Boolean).join(", ")
    : invoice.client
      ? [invoice.client.streetAddress, invoice.client.city, invoice.client.province, invoice.client.postalCode, invoice.client.country].filter(Boolean).join(", ")
      : "";

  const bizAddr = invoice.businessAddress
    ? [invoice.businessAddress.address, invoice.businessAddress.city, invoice.businessAddress.province, invoice.businessAddress.postalCode].filter(Boolean).join(", ")
    : "";

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-[rgba(15,23,42,0.06)]">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/invoice")}
              className="p-2 rounded-md hover:bg-[#F1F5F9] text-[#475569] transition-colors"
            >
              <ArrowLeft size={20} />
            </motion.button>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#475569]">Invoices</span>
              <span className="text-[#94A3B8]">/</span>
              <span className="font-medium text-[#0F172A]">{invoice.invoiceNumber}</span>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                statusConfig.bg,
                statusConfig.text
              )}
            >
              <StatusIcon size={12} />
              {statusConfig.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {invoice.status?.toUpperCase() !== "PAID" && invoice.status?.toUpperCase() !== "CANCELLED" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSend}
                  disabled={!!actionLoading}
                  className={cn("rounded-md border-[rgba(15,23,42,0.06)]", isMobile && "hidden")}
                >
                  {actionLoading === "send" ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Send size={14} className="mr-1.5" />}
                  Send
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPaymentSheetOpen(true)}
                  disabled={!!actionLoading}
                  className={cn("rounded-md border-green-200 text-green-600 hover:bg-green-50", isMobile && "hidden")}
                >
                  {actionLoading === "paid" ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <CreditCard size={14} className="mr-1.5" />}
                  Record Payment
                </Button>
              </>
            )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
              disabled={!!actionLoading}
              className={cn("rounded-md border-[rgba(15,23,42,0.06)]", isMobile && "hidden")}
            >
              {actionLoading === "download" ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Download size={14} className="mr-1.5" />}
              PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveDocument}
              disabled={!!actionLoading}
              className={cn("rounded-md border-[rgba(15,23,42,0.06)]", isMobile && "hidden")}
            >
              {actionLoading === "save-document" ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <FilePlus size={14} className="mr-1.5" />}
              Save Document
            </Button>
            {!isMobile && (
              <Button
                size="sm"
                onClick={handleDuplicate}
                disabled={!!actionLoading}
                className="rounded-md bg-[#0891B2] hover:bg-[#0891B2]/90 text-white"
              >
                {actionLoading === "duplicate" ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Copy size={14} className="mr-1.5" />}
                Duplicate
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className={cn("max-w-5xl mx-auto space-y-6 p-6", isMobile && "pb-28 px-4 pt-4")}>
        {/* Summary Cards */}
        <div
          className={cn(
            isMobile
              ? "flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              : "grid grid-cols-1 gap-4 md:grid-cols-4"
          )}
        >
          {[
            { label: "Total Amount", value: formatCurrency(invoice.total, invoice.currency), icon: DollarSign, color: "bg-[#0891B2]/10 text-[#0891B2]" },
            { label: "Amount Paid", value: formatCurrency(invoice.amountPaid, invoice.currency), icon: CheckCircle2, color: "bg-green-100 text-green-600" },
            { label: "Amount Due", value: formatCurrency(invoice.amountDue, invoice.currency), icon: overdue ? AlertTriangle : Clock3, color: overdue ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600" },
            { label: "Due Date", value: formatDate(invoice.dueDate), icon: CalendarDays, color: overdue ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600" },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn("bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5", isMobile && "min-w-[220px]")}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#94A3B8] uppercase tracking-wider">{card.label}</p>
                <div className={cn("w-8 h-8 rounded-md flex items-center justify-center", card.color.split(" ")[0])}>
                  <card.icon size={16} className={card.color.split(" ")[1]} />
                </div>
              </div>
              <p className="text-xl font-bold text-[#0F172A]">{card.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Billed By */}
          <SectionCard title="Billed By" icon={Building2}>
            <div className="space-y-1">
              <p className="font-semibold text-[#0F172A] text-lg">{invoice.businessName || "Your Business"}</p>
              <InfoRow icon={Mail} label="Email" value={invoice.businessEmail} />
              <InfoRow icon={Phone} label="Phone" value={invoice.businessPhone} />
              <InfoRow icon={MapPin} label="Address" value={bizAddr} />
              <InfoRow icon={Hash} label="GST/HST #" value={invoice.businessGstHstNumber} />
            </div>
          </SectionCard>

          {/* Billed To */}
          <SectionCard title="Billed To" icon={Users}>
            <div className="space-y-1">
              <p className="font-semibold text-[#0F172A] text-lg">{clientName}</p>
              <InfoRow icon={Mail} label="Email" value={clientEmail} />
              <InfoRow icon={Phone} label="Phone" value={clientPhone} />
              <InfoRow icon={MapPin} label="Address" value={clientAddr} />
              <InfoRow icon={Hash} label="GST/HST #" value={invoice.clientGstHstNumber || invoice.client?.clientName ? undefined : undefined} />
              <InfoRow icon={Users} label="Primary Contact" value={invoice.contact?.contactName} />
              <InfoRow icon={Mail} label="Contact Email" value={invoice.contact?.email || undefined} />
              <InfoRow icon={Phone} label="Contact Phone" value={contactPhone || undefined} />
            </div>
          </SectionCard>
        </div>

        {(invoice.project || invoice.quote || invoice.contract) && (
          <SectionCard title="Sales Relationships" icon={FileText}>
            <div className="grid gap-3 sm:grid-cols-3">
              {invoice.project ? (
                <Button variant="outline" className="justify-start rounded-md border-[rgba(15,23,42,0.06)]" onClick={() => navigate(`/deals?dealId=${invoice.project?.id}`)}>
                  Deal: {invoice.project.name || invoice.project.projectNumber || "Open"}
                </Button>
              ) : null}
              {invoice.quote ? (
                <Button variant="outline" className="justify-start rounded-md border-[rgba(15,23,42,0.06)]" onClick={() => navigate(`/proposals?quoteId=${invoice.quote?.id}`)}>
                  Proposal: {invoice.quote.quoteNumber}
                </Button>
              ) : null}
              {invoice.contract ? (
                <Button variant="outline" className="justify-start rounded-md border-[rgba(15,23,42,0.06)]" onClick={() => navigate(`/contracts?contractId=${invoice.contract?.id}`)}>
                  Contract: {invoice.contract.contractNumber}
                </Button>
              ) : null}
              <Button variant="outline" className="justify-start rounded-md border-[rgba(15,23,42,0.06)]" onClick={() => navigate(`/bookkeeping?invoiceId=${invoice.id}`)}>
                View Bookkeeping
              </Button>
              <Button variant="outline" className="justify-start rounded-md border-[rgba(15,23,42,0.06)]" onClick={() => navigate(`/documents?linkedEntityType=Invoice&linkedEntityId=${invoice.id}`)}>
                View Documents
              </Button>
            </div>
          </SectionCard>
        )}

        {/* Line Items */}
        <SectionCard title="Invoice Items" icon={Receipt}>
          {isMobile ? (
            <div className="space-y-3">
              {(invoice.items || []).map((item, index) => (
                <div
                  key={item.id || index}
                  className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-[#94A3B8]">Item {index + 1}</p>
                      <p className="mt-1 text-sm font-semibold text-[#0F172A]">{item.description || "-"}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#0891B2]">{formatCurrency(item.amount, invoice.currency)}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-[#94A3B8]">Qty</p>
                      <p className="mt-1 text-sm font-medium text-[#0F172A]">{Number(item.quantity || 0).toFixed(2)}</p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-[#94A3B8]">Rate</p>
                      <p className="mt-1 text-sm font-medium text-[#0F172A]">{formatCurrency(item.unitPrice, invoice.currency)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-[rgba(15,23,42,0.06)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F8FAFC]">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">#</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Description</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Qty</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Rate</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.items || []).map((item, index) => (
                    <tr key={item.id || index} className="border-t border-[rgba(15,23,42,0.06)] hover:bg-[#F8FAFC]/50">
                      <td className="py-3 px-4 text-[#94A3B8]">{index + 1}</td>
                      <td className="py-3 px-4 text-[#0F172A] font-medium">{item.description || "-"}</td>
                      <td className="py-3 px-4 text-right text-[#475569]">{Number(item.quantity || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-[#475569]">{formatCurrency(item.unitPrice, invoice.currency)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-[#0F172A]">{formatCurrency(item.amount, invoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className={cn("mt-4 space-y-2 text-sm", isMobile ? "w-full" : "ml-auto max-w-xs")}>
            <div className="flex justify-between py-1">
              <span className="text-[#94A3B8]">Subtotal</span>
              <span className="text-[#0F172A] font-medium">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>
            {(invoice.taxAmount || 0) > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-[#94A3B8]">Tax{invoice.taxRate ? ` (${invoice.taxRate}%)` : ""}</span>
                <span className="text-[#0F172A]">{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
              </div>
            )}
            {(invoice.discountAmount || 0) > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-[#94A3B8]">Discount</span>
                <span className="text-green-600">-{formatCurrency(invoice.discountAmount, invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t border-[rgba(15,23,42,0.06)]">
              <span className="font-bold text-[#0F172A]">Total</span>
              <span className="font-bold text-xl text-[#0891B2]">{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
            {(invoice.amountPaid || 0) > 0 && (
              <>
                <div className="flex justify-between py-1">
                  <span className="text-[#94A3B8]">Paid</span>
                  <span className="text-green-600">{formatCurrency(invoice.amountPaid, invoice.currency)}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-[rgba(15,23,42,0.06)]">
                  <span className="font-bold text-[#0F172A]">Balance Due</span>
                  <span className={cn("font-bold text-lg", overdue ? "text-red-600" : "text-[#0F172A]")}>{formatCurrency(invoice.amountDue, invoice.currency)}</span>
                </div>
              </>
            )}
          </div>
        </SectionCard>

        {/* Notes & Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {invoice.notes && (
              <SectionCard title="Notes" icon={FileText}>
                <p className="text-sm text-[#475569] whitespace-pre-wrap">{invoice.notes}</p>
              </SectionCard>
            )}
            {invoice.terms && (
              <SectionCard title="Terms & Conditions" icon={FileText}>
                <p className="text-sm text-[#475569] whitespace-pre-wrap">{invoice.terms}</p>
              </SectionCard>
            )}
          </div>
        )}

        {(invoice.payments?.length || invoice.sentAt || invoice.paidAt) && (
          <SectionCard title="Activity" icon={CreditCard}>
            <div className="space-y-3">
              {invoice.sentAt ? (
                <div className="flex items-center justify-between rounded-md bg-[#F8FAFC] px-4 py-3">
                  <span className="text-sm text-[#475569]">Invoice sent</span>
                  <span className="text-sm font-medium text-[#0F172A]">{formatDate(invoice.sentAt)}</span>
                </div>
              ) : null}
              {invoice.payments?.map((payment) => (
                <div key={payment.id} className="rounded-md border border-[rgba(15,23,42,0.06)] px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">{payment.paymentMethod.replaceAll("_", " ")}</p>
                      <p className="text-xs text-[#94A3B8]">
                        {formatDate(payment.paymentDate)}
                        {payment.status ? ` · ${payment.status.replaceAll("_", " ")}` : ""}
                      </p>
                    </div>
                    <span className={cn("text-sm font-semibold", ["REFUNDED", "VOIDED", "FAILED"].includes(String(payment.status || "").toUpperCase()) ? "text-slate-500" : "text-green-600")}>
                      {formatCurrency(payment.amount, invoice.currency)}
                    </span>
                  </div>
                  {(payment.refundAmount || 0) > 0 ? (
                    <p className="mt-2 text-xs text-amber-700">Refunded: {formatCurrency(payment.refundAmount, invoice.currency)}</p>
                  ) : null}
                  {payment.reference || payment.notes ? (
                    <p className="mt-2 text-xs text-[#475569]">
                      {[payment.reference, payment.notes].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                  {String(payment.status || "SUCCESSFUL").toUpperCase() === "SUCCESSFUL" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="h-8 rounded-md border-[rgba(15,23,42,0.06)] text-xs" disabled={!!actionLoading} onClick={() => handlePaymentStatus(payment.id, "PARTIALLY_REFUNDED")}>
                        <Undo2 size={13} className="mr-1.5" />
                        Partial Refund
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 rounded-md border-amber-200 text-amber-700 text-xs" disabled={!!actionLoading} onClick={() => handlePaymentStatus(payment.id, "REFUNDED")}>
                        Refund
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 rounded-md border-red-200 text-red-600 text-xs" disabled={!!actionLoading} onClick={() => handlePaymentStatus(payment.id, "VOIDED")}>
                        Void
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 rounded-md border-slate-200 text-slate-600 text-xs" disabled={!!actionLoading} onClick={() => handlePaymentStatus(payment.id, "FAILED")}>
                        Failed
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Invoice Meta */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-6 text-xs text-[#94A3B8]"
        >
          Invoice #{invoice.invoiceNumber} · Created {formatDate(invoice.createdAt)} · {invoice.currency}
        </motion.div>
      </div>

      <Drawer open={paymentSheetOpen} onOpenChange={setPaymentSheetOpen}>
        <DrawerContent className="max-h-[88dvh]">
          <DrawerHeader>
            <DrawerTitle>Record Payment</DrawerTitle>
            <DrawerDescription>
              Apply a payment to {invoice.invoiceNumber} without leaving the invoice.
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-5 px-5 pb-6">
            <div className="rounded-2xl bg-[#F8FAFC] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#94A3B8]">Outstanding</span>
                <span className="font-semibold text-[#0F172A]">{formatCurrency(invoice.amountDue, invoice.currency)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#475569]">Amount</label>
              <Input
                inputMode="decimal"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                className="h-11 rounded-xl border-[rgba(15,23,42,0.06)]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#475569]">Method</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-11 rounded-xl border-[rgba(15,23,42,0.06)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {paymentMethodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#475569]">Notes</label>
              <Textarea
                value={paymentNotes}
                onChange={(event) => setPaymentNotes(event.target.value)}
                placeholder="Reference number, confirmation note, or collection details..."
                className="min-h-[96px] rounded-2xl border-[rgba(15,23,42,0.06)]"
              />
            </div>
          </div>
          <DrawerFooter className="border-t bg-white">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => setPaymentSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-11 rounded-xl bg-[#0891B2] text-white hover:bg-[#0891B2]/90"
              onClick={handleRecordPayment}
              disabled={!!actionLoading || !paymentAmount}
            >
              {actionLoading === "paid" ? <Loader2 size={16} className="mr-2 animate-spin" /> : <CreditCard size={16} className="mr-2" />}
              Record Payment
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {isMobile && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(15,23,42,0.06)] bg-white/95 px-3 py-3 backdrop-blur">
          <div className="grid grid-cols-4 gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSend}
              disabled={!!actionLoading || invoice.status?.toUpperCase() === "PAID" || invoice.status?.toUpperCase() === "CANCELLED"}
              className="h-11 rounded-xl border-[rgba(15,23,42,0.06)] px-2 text-xs"
            >
              <Send size={14} className="mr-1.5" />
              Send
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPaymentSheetOpen(true)}
              disabled={invoice.status?.toUpperCase() === "PAID" || invoice.status?.toUpperCase() === "CANCELLED"}
              className="h-11 rounded-xl border-[rgba(15,23,42,0.06)] px-2 text-xs"
            >
              <CreditCard size={14} className="mr-1.5" />
              Payment
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDownload}
              disabled={!!actionLoading}
              className="h-11 rounded-xl border-[rgba(15,23,42,0.06)] px-2 text-xs"
            >
              <Download size={14} className="mr-1.5" />
              PDF
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDuplicate}
              disabled={!!actionLoading}
              className="h-11 rounded-xl bg-[#0891B2] px-2 text-xs text-white hover:bg-[#0891B2]/90"
            >
              <Copy size={14} className="mr-1.5" />
              Duplicate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceDetailPage;
