// src/pages/InvoiceDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  getInvoiceById,
  sendInvoice,
  markInvoiceAsPaid,
  downloadInvoicePdf,
} from "@/services/invoiceService";
import {
  ArrowLeft,
  Send,
  Download,
  Pencil,
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
  items: InvoiceItem[];
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
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const handleMarkPaid = async () => {
    if (!invoice) return;
    setActionLoading("paid");
    try {
      await markInvoiceAsPaid(invoice.id);
      toast({ title: "Paid!", description: `Invoice ${invoice.invoiceNumber} marked as paid.` });
      const updated = await getInvoiceById(invoice.id);
      setInvoice(updated);
    } catch {
      toast({ title: "Error", description: "Failed to mark as paid.", variant: "destructive" });
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
                  className="rounded-md border-[rgba(15,23,42,0.06)]"
                >
                  {actionLoading === "send" ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Send size={14} className="mr-1.5" />}
                  Send
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMarkPaid}
                  disabled={!!actionLoading}
                  className="rounded-md border-green-200 text-green-600 hover:bg-green-50"
                >
                  {actionLoading === "paid" ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <CreditCard size={14} className="mr-1.5" />}
                  Mark Paid
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              disabled={!!actionLoading}
              className="rounded-md border-[rgba(15,23,42,0.06)]"
            >
              {actionLoading === "download" ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Download size={14} className="mr-1.5" />}
              PDF
            </Button>
            <Button
              size="sm"
              onClick={() => navigate(`/invoice/create?invoiceId=${invoice.id}`)}
              className="rounded-md bg-[#0891B2] hover:bg-[#0891B2]/90 text-white"
            >
              <Pencil size={14} className="mr-1.5" />
              Edit
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5"
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
            </div>
          </SectionCard>
        </div>

        {/* Line Items */}
        <SectionCard title="Invoice Items" icon={Receipt}>
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

          {/* Totals */}
          <div className="mt-4 ml-auto max-w-xs space-y-2 text-sm">
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

        {/* Invoice Meta */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-6 text-xs text-[#94A3B8]"
        >
          Invoice #{invoice.invoiceNumber} · Created {formatDate(invoice.createdAt)} · {invoice.currency}
        </motion.div>
      </div>
    </div>
  );
};

export default InvoiceDetailPage;
