// src/pages/InvoicePage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { NotificationBell } from "@/components/NotificationBell";
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
import { useToast } from "@/components/ui/use-toast";
import {
  getInvoices,
  getInvoiceById,
  deleteInvoice,
  createInvoice,
  downloadInvoicePdf,
  saveInvoicePdfToDocuments,
  recordInvoicePayment,
  sendInvoice,
  exportInvoicesCsv,
  importInvoicesCsv,
  importInvoicePdfs,
} from "@/services/invoiceService";
import { printInvoiceDocument } from "@/features/invoices/utils/invoice-print";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  ListCardSkeleton,
  PullToRefreshIndicator,
  SwipeActionCard,
  usePullToRefresh,
} from "@/features/clients/components/responsive-helpers";
import {
  Bell,
  Plus,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  Search,
  User,
  Users,
  Building2,
  MoreHorizontal,
  MoreVertical,
  Filter,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Upload,
  RefreshCw,
  X,
  Sparkles,
  ArrowUpDown,
  Copy,
  ExternalLink,
  Calendar,
  Star,
  StarOff,
  Clock,
  FileSpreadsheet,
  FileText,
  Columns,
  CalendarDays,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Activity,
  Zap,
  Send,
  Mail,
  Printer,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock3,
  Receipt,
  CreditCard,
  Wallet,
  BanknoteIcon,
  PiggyBank,
  CircleDot,
  BadgeCheck,
  FileDown,
  FilePlus,
  History,
  AlertTriangle,
  IndianRupee,
  Hash,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanPerformAction, useHasPermission } from "@/hooks/usePermissionAccess";

// ============================================
// TYPES
// ============================================

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId?: string;
  clientName: string;
  clientEmail?: string;
  invoiceDate: string;
  dueDate?: string;
  status: string;
  subtotal?: number;
  tax?: number;
  taxRate?: number;
  taxRates?: Array<{ name?: string; rate?: number }>;
  taxProvince?: string;
  discount?: number;
  total: number;
  amountPaid?: number;
  notes?: string;
  items?: InvoiceItem[];
  createdAt?: string;
  sentAt?: string;
  paidAt?: string;
  payments?: InvoicePayment[];
  lastSent?: string;
  paymentMethod?: string;
  currency?: string;
}

interface InvoiceItem {
  id: string | number;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoicePayment {
  id: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  reference?: string | null;
  notes?: string | null;
  status?: string;
  refundAmount?: number;
}

interface AppUser {
  firstName: string;
  lastName: string;
}

// ============================================
// CONSTANTS
// ============================================

const statusOptions = [
  { value: "all", label: "All Status", icon: CircleDot },
  { value: "draft", label: "Draft", icon: FileText, color: "slate" },
  { value: "sent", label: "Sent", icon: Send, color: "blue" },
  { value: "viewed", label: "Viewed", icon: Eye, color: "purple" },
  { value: "paid", label: "Paid", icon: CheckCircle2, color: "green" },
  { value: "partial", label: "Partially Paid", icon: Clock3, color: "amber" },
  { value: "overdue", label: "Overdue", icon: AlertTriangle, color: "red" },
  { value: "cancelled", label: "Cancelled", icon: XCircle, color: "slate" },
];

const dateFilterOptions = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "quarter", label: "This Quarter" },
  { value: "year", label: "This Year" },
];

const sortOptions = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
  { value: "due-date-asc", label: "Due Date: Soonest" },
  { value: "amount-desc", label: "Amount: High to Low" },
  { value: "amount-asc", label: "Amount: Low to High" },
  { value: "number-asc", label: "Invoice Number: A-Z" },
] as const;

type InvoiceSort = (typeof sortOptions)[number]["value"];

const mobileStatusTabs = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
] as const;

const backendStatusToUi: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  PAID: "Paid",
  PARTIALLY_PAID: "Partial",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

const paymentMethodMap: Record<string, "CASH" | "CREDIT_CARD" | "CHECK" | "BANK_TRANSFER" | "E_TRANSFER" | "OTHER"> = {
  cash: "CASH",
  card: "CREDIT_CARD",
  cheque: "CHECK",
  bank_transfer: "BANK_TRANSFER",
  e_transfer: "E_TRANSFER",
  upi: "E_TRANSFER",
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const getInitials = (name: string) => {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const formatCurrency = (amount?: number, currency = "CAD") => {
  if (amount === undefined || amount === null) return "$0";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getRelativeTime = (dateString?: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return formatDate(dateString);
};

const getDaysUntilDue = (dueDate?: string) => {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diffInDays = Math.floor(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diffInDays;
};

const getStatusConfig = (status: string) => {
  const configs: Record<string, { bg: string; text: string; dot: string; icon: LucideIcon }> = {
    draft: { bg: "bg-white/5", text: "text-[#475569]", dot: "bg-slate-400", icon: FileText },
    sent: { bg: "bg-blue-100", text: "text-[#0891B2]", dot: "bg-[#0891B2]", icon: Send },
    viewed: { bg: "bg-purple-100", text: "text-purple-600", dot: "bg-purple-500", icon: Eye },
    paid: { bg: "bg-green-100", text: "text-green-600", dot: "bg-green-500", icon: CheckCircle2 },
    partial: { bg: "bg-amber-100", text: "text-amber-600", dot: "bg-amber-500", icon: Clock3 },
    overdue: { bg: "bg-red-100", text: "text-red-600", dot: "bg-red-500", icon: AlertTriangle },
    cancelled: { bg: "bg-white/5", text: "text-[#94A3B8]", dot: "bg-slate-400", icon: XCircle },
  };
  return configs[status?.toLowerCase()] || configs.draft;
};

const isOverdue = (dueDate?: string, status?: string) => {
  if (!dueDate || status?.toLowerCase() === "paid" || status?.toLowerCase() === "cancelled") {
    return false;
  }
  return new Date(dueDate) < new Date();
};

const getInvoiceDateRange = (filterDate: string) => {
  if (filterDate === "all") return {};

  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (filterDate.startsWith("year:")) {
    const year = Number(filterDate.slice(5));
    if (!Number.isInteger(year)) return {};
    startDate = new Date(year, 0, 1);
    endDate = new Date(year, 11, 31, 23, 59, 59, 999);
  } else {
    switch (filterDate) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case "week":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case "quarter": {
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
        endDate = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999);
        break;
      }
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default:
        return {};
    }
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
};

const compareInvoices = (sortBy: InvoiceSort) => (first: Invoice, second: Invoice) => {
  switch (sortBy) {
    case "date-asc":
      return new Date(first.invoiceDate).getTime() - new Date(second.invoiceDate).getTime();
    case "due-date-asc":
      return new Date(first.dueDate || "9999-12-31").getTime() - new Date(second.dueDate || "9999-12-31").getTime();
    case "amount-desc":
      return (second.total || 0) - (first.total || 0);
    case "amount-asc":
      return (first.total || 0) - (second.total || 0);
    case "number-asc":
      return first.invoiceNumber.localeCompare(second.invoiceNumber, undefined, { numeric: true });
    case "date-desc":
    default:
      return new Date(second.invoiceDate).getTime() - new Date(first.invoiceDate).getTime();
  }
};

const normalizeInvoice = (inv: any): Invoice => {
  const rawStatus = (inv?.status || "Draft").toString().toUpperCase();
  return {
    id: String(inv?.id || ""),
    invoiceNumber: inv?.invoiceNumber || "",
    clientId: inv?.client?.id ? String(inv.client.id) : inv?.clientId ? String(inv.clientId) : undefined,
    clientName: inv?.client?.clientName || inv?.clientName || "Unknown Client",
    clientEmail: inv?.client?.primaryEmail || inv?.clientEmail || "",
    invoiceDate: inv?.issueDate || inv?.invoiceDate || inv?.createdAt || "",
    dueDate: inv?.dueDate || "",
    status: backendStatusToUi[rawStatus] || rawStatus,
    subtotal: Number(inv?.subtotal) || 0,
    tax: Number(inv?.taxAmount) || 0,
    taxRate: Number(inv?.taxRate) || 0,
    taxRates: Array.isArray(inv?.taxRates) ? inv.taxRates : [],
    taxProvince: inv?.taxProvince || "",
    discount: Number(inv?.discountAmount) || 0,
    total: Number(inv?.total) || 0,
    amountPaid: Number(inv?.amountPaid) || 0,
    notes: inv?.notes || "",
    items: (inv?.items || []).map((item: any, index: number) => ({
      id: item?.id || item?.sortOrder || index,
      description: item?.description || "",
      quantity: Number(item?.quantity) || 0,
      rate: Number(item?.unitPrice ?? item?.rate) || 0,
      amount: Number(item?.amount) || 0,
    })),
    createdAt: inv?.createdAt || "",
    sentAt: inv?.sentAt || "",
    paidAt: inv?.paidAt || "",
    payments: Array.isArray(inv?.payments)
      ? inv.payments.map((payment: any) => ({
        id: String(payment?.id || ""),
        amount: Number(payment?.amount) || 0,
        paymentMethod: String(payment?.paymentMethod || "OTHER"),
        paymentDate: payment?.paymentDate || payment?.createdAt || "",
        reference: payment?.reference || null,
        notes: payment?.notes || null,
        status: payment?.status || "SUCCESSFUL",
        refundAmount: Number(payment?.refundAmount || 0),
      }))
      : [],
    lastSent: inv?.sentAt || "",
    currency: inv?.currency || "CAD",
  };
};

const readText = (value: unknown) => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const mapInvoiceToPrintableDocument = (invoice: any) => {
  const businessAddress =
    invoice?.businessAddress && typeof invoice.businessAddress === "object" ? invoice.businessAddress : {};
  const clientAddress =
    invoice?.clientAddress && typeof invoice.clientAddress === "object" ? invoice.clientAddress : {};
  const client =
    invoice?.client && typeof invoice.client === "object" ? invoice.client : null;

  const currency = readText(invoice?.currency) || "CAD";
  const subtotal = Number(invoice?.subtotal) || 0;
  const taxAmount = Number(invoice?.taxAmount) || 0;
  const taxRate = Number(invoice?.taxRate) || 0;
  const discountAmount = Number(invoice?.discountAmount) || 0;
  const total = Number(invoice?.total) || 0;
  const amountPaid = Number(invoice?.amountPaid) || 0;
  const amountDue = Number(invoice?.amountDue ?? total - amountPaid) || 0;

  return {
    invoiceNumber: readText(invoice?.invoiceNumber),
    invoiceDate: readText(invoice?.issueDate || invoice?.invoiceDate || invoice?.createdAt),
    dueDate: readText(invoice?.dueDate),
    currency,
    amountDue,
    amountDueLabel: "Amount Due",
    brandName: readText(invoice?.businessName) || "Your Business",
    billedBy: {
      businessName: readText(invoice?.businessName),
      email: readText(invoice?.businessEmail),
      phone: readText(invoice?.businessPhone),
      address: readText((businessAddress as Record<string, unknown>).address),
      city: readText((businessAddress as Record<string, unknown>).city),
      province: readText((businessAddress as Record<string, unknown>).province),
      postalCode: readText((businessAddress as Record<string, unknown>).postalCode),
      country: readText((businessAddress as Record<string, unknown>).country),
      gstNumber: readText(invoice?.businessGstHstNumber),
    },
    billedTo: {
      businessName:
        readText(invoice?.clientBusinessName) ||
        readText(invoice?.clientName) ||
        readText(client?.clientName) ||
        "Client",
      email: readText(invoice?.clientEmail) || readText(client?.primaryEmail),
      phone: readText(invoice?.clientPhone) || readText(client?.primaryPhone),
      address: readText((clientAddress as Record<string, unknown>).address) || readText(client?.streetAddress),
      city: readText((clientAddress as Record<string, unknown>).city) || readText(client?.city),
      province: readText((clientAddress as Record<string, unknown>).province) || readText(client?.province),
      postalCode: readText((clientAddress as Record<string, unknown>).postalCode) || readText(client?.postalCode),
      country: readText((clientAddress as Record<string, unknown>).country) || readText(client?.country),
      gstNumber: readText(invoice?.clientGstHstNumber),
    },
    items: Array.isArray(invoice?.items)
      ? invoice.items.map((item: any) => ({
          description: readText(item?.description || item?.itemName),
          quantity: Number(item?.quantity) || 0,
          rate: Number(item?.unitPrice ?? item?.rate) || 0,
          amount: Number(item?.amount ?? item?.lineTotal) || 0,
        }))
      : [],
    summaryLines: [
      { label: "Subtotal", amount: subtotal, tone: "muted" as const },
      ...(discountAmount > 0
        ? [{ label: "Discount", amount: -discountAmount, tone: "positive" as const }]
        : []),
      ...(taxAmount > 0
        ? [{ label: taxRate > 0 ? `Tax (${taxRate}%)` : "Tax", amount: taxAmount }]
        : []),
    ],
    total,
    notes: readText(invoice?.notes),
    terms: readText(invoice?.terms),
  };
};

// ============================================
// STAT CARD COMPONENT
// ============================================

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  delay = 0,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  color: "teal" | "gold" | "navy" | "purple" | "green" | "red" | "blue";
  trend?: { value: number; positive: boolean };
  delay?: number;
}) => {
  const colorClasses = {
    teal: { bg: "bg-[#0891B2]", light: "bg-[#0891B2]/10", text: "text-[#0891B2]" },
    gold: { bg: "bg-[#D97706]", light: "bg-[#D97706]/10", text: "text-[#D97706]" },
    navy: { bg: "bg-[#F8FAFC]", light: "bg-[#F8FAFC]/10", text: "text-[#0F172A]" },
    purple: { bg: "bg-purple-500", light: "bg-purple-500/10", text: "text-purple-500" },
    green: { bg: "bg-green-500", light: "bg-green-500/10", text: "text-green-500" },
    red: { bg: "bg-red-500", light: "bg-red-500/10", text: "text-red-500" },
    blue: { bg: "bg-[#0891B2]", light: "bg-[#0891B2]/10", text: "text-blue-500" },
  };

  const colors = colorClasses[color];


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="relative bg-white rounded-md p-5 border border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all overflow-hidden group"
    >
      <div className={cn("absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-all", colors.bg)} />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-[#94A3B8] mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">{value}</p>
            {trend && (
              <span className={cn(
                "flex items-center text-xs font-semibold",
                trend.positive ? "text-green-600" : "text-red-600"
              )}>
                {trend.positive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                {trend.value}%
              </span>
            )}
          </div>
          <p className="text-xs text-[#475569] mt-1">{subtitle}</p>
        </div>
        <div className={cn("w-10 h-10 rounded-md flex items-center justify-center", colors.light)}>
          <Icon size={18} className={colors.text} />
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// INVOICE ROW COMPONENT
// ============================================

const InvoiceRow = ({
  invoice,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onSend,
  onDownload,
  onSaveDocument,
  onDuplicate,
  onRecordPayment,
  onPrint,
  onHistory,
  canUpdate,
  canDelete,
  canSend,
  canMarkPaid,
  canCreate,
}: {
  invoice: Invoice;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSend: () => void;
  onDownload: () => void;
  onSaveDocument: () => void;
  onDuplicate: () => void;
  onRecordPayment: () => void;
  onPrint: () => void;
  onHistory: () => void;
  canUpdate: boolean;
  canDelete: boolean;
  canSend: boolean;
  canMarkPaid: boolean;
  canCreate: boolean;
}) => {
  const statusConfig = getStatusConfig(invoice.status);
  const StatusIcon = statusConfig.icon;
  const overdue = isOverdue(invoice.dueDate, invoice.status);
  const daysUntilDue = getDaysUntilDue(invoice.dueDate);
  const amountDue = (invoice.total || 0) - (invoice.amountPaid || 0);

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "group hover:bg-[#F8FAFC]/80 transition-colors cursor-pointer border-b border-[rgba(15,23,42,0.06)] last:border-0",
        isSelected && "bg-[#0891B2]/5"
      )}
      onClick={onView}
    >
      {/* Checkbox */}
      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
        />
      </td>

      {/* Invoice Number */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-md flex items-center justify-center",
            overdue ? "bg-red-100" : "bg-[#0891B2]/10"
          )}>
            <Receipt size={18} className={overdue ? "text-red-600" : "text-[#0891B2]"} />
          </div>
          <div>
            <p className="font-semibold text-[#0F172A] group-hover:text-[#0891B2] transition-colors">
              {invoice.invoiceNumber}
            </p>
            <p className="text-xs text-[#475569]">{formatDate(invoice.invoiceDate)}</p>
          </div>
        </div>
      </td>

      {/* Client */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] text-xs font-semibold">
            {getInitials(invoice.clientName)}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">{invoice.clientName}</p>
            {invoice.clientEmail && (
              <p className="text-xs text-[#475569]">{invoice.clientEmail}</p>
            )}
          </div>
        </div>
      </td>

      {/* Due Date */}
      <td className="py-4 px-4">
        <div className={cn(
          "flex items-center gap-2",
          overdue ? "text-red-600" : "text-[#475569]"
        )}>
          <CalendarDays size={14} className={overdue ? "text-red-400" : "text-[#475569]"} />
          <div>
            <p className="text-sm">{invoice.dueDate ? formatDate(invoice.dueDate) : "-"}</p>
            {daysUntilDue !== null && invoice.status !== "Paid" && (
              <p className={cn(
                "text-xs",
                overdue ? "text-red-500 font-semibold" : "text-[#475569]"
              )}>
                {overdue
                  ? `${Math.abs(daysUntilDue)} days overdue`
                  : daysUntilDue === 0
                    ? "Due today"
                    : `Due in ${daysUntilDue} days`}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="py-4 px-4">
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
          overdue && invoice.status !== "Paid" ? "bg-red-100 text-red-600" : statusConfig.bg,
          overdue && invoice.status !== "Paid" ? "" : statusConfig.text
        )}>
          {overdue && invoice.status !== "Paid" ? (
            <AlertTriangle size={12} />
          ) : (
            <StatusIcon size={12} />
          )}
          {overdue && invoice.status !== "Paid" ? "Overdue" : invoice.status}
        </span>
      </td>

      {/* Amount */}
      <td className="py-4 px-4 text-right">
        <div>
          <p className="font-bold text-[#0F172A]">{formatCurrency(invoice.total)}</p>
          {invoice.amountPaid && invoice.amountPaid > 0 && invoice.amountPaid < invoice.total && (
            <p className="text-xs text-amber-600">
              Due: {formatCurrency(amountDue)}
            </p>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canSend && invoice.status === "Draft" && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onSend}
              className="p-2 rounded-md hover:bg-[#0891B2]/10 text-[#0891B2] transition-colors"
              title="Send Invoice"
            >
              <Send size={16} />
            </motion.button>
          )}
          {canMarkPaid && (invoice.status === "Sent" || invoice.status === "Partial" || invoice.status === "Overdue") && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onRecordPayment}
              className="p-2 rounded-md hover:bg-green-100 text-green-600 transition-colors"
              title="Record Payment"
            >
              <CreditCard size={16} />
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onDownload}
            className="p-2 rounded-md hover:bg-white/10 text-[#94A3B8] transition-colors"
            title="Download PDF"
          >
            <FileDown size={16} />
          </motion.button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-md hover:bg-white/10 text-[#475569] transition-colors">
                <MoreVertical size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-md">
              <DropdownMenuItem onClick={onView} className="rounded-md">
                <Eye size={14} className="mr-2" />
                View Invoice
              </DropdownMenuItem>
              {canUpdate ? (
                <DropdownMenuItem onClick={onEdit} className="rounded-md">
                  <Pencil size={14} className="mr-2" />
                  Edit Invoice
                </DropdownMenuItem>
              ) : null}
              {canCreate ? (
                <DropdownMenuItem onClick={onDuplicate} className="rounded-md">
                  <Copy size={14} className="mr-2" />
                  Duplicate
                </DropdownMenuItem>
              ) : null}
              {(canUpdate || canCreate) ? <DropdownMenuSeparator /> : null}
              {canSend ? (
                <DropdownMenuItem onClick={onSend} className="rounded-md">
                  <Send size={14} className="mr-2" />
                  Send Invoice
                </DropdownMenuItem>
              ) : null}
              {canMarkPaid ? (
                <DropdownMenuItem onClick={onRecordPayment} className="rounded-md">
                  <CreditCard size={14} className="mr-2" />
                  Record Payment
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={onDownload} className="rounded-md">
                <FileDown size={14} className="mr-2" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSaveDocument} className="rounded-md">
                <FileText size={14} className="mr-2" />
                Save PDF to Documents
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPrint} className="rounded-md">
                <Printer size={14} className="mr-2" />
                Print
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onHistory} className="rounded-md">
                <History size={14} className="mr-2" />
                View History
              </DropdownMenuItem>
              {canDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="rounded-md text-red-600 focus:text-red-600 focus:bg-red-50"
                    onClick={onDelete}
                  >
                    <Trash2 size={14} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </motion.tr>
  );
};

// ============================================
// INVOICE CARD COMPONENT (Grid View)
// ============================================

const InvoiceCard = ({
  invoice,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onSend,
  onDownload,
  onPrint,
  canUpdate,
  canDelete,
  canSend,
}: {
  invoice: Invoice;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSend: () => void;
  onDownload: () => void;
  onPrint: () => void;
  canUpdate: boolean;
  canDelete: boolean;
  canSend: boolean;
}) => {
  const statusConfig = getStatusConfig(invoice.status);
  const StatusIcon = statusConfig.icon;
  const overdue = isOverdue(invoice.dueDate, invoice.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      className={cn(
        "bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden cursor-pointer group",
        "hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all",
        isSelected && "border-[#22D3EE] bg-[#0891B2]/5",
        overdue && "border-red-200"
      )}
      onClick={onView}
    >
      {/* Status Bar */}
      <div className={cn(
        "h-1",
        overdue ? "bg-red-500" : statusConfig.dot.replace("bg-", "bg-")
      )} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              onClick={(e) => e.stopPropagation()}
              className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
            />
            <div className={cn(
              "w-11 h-11 rounded-md flex items-center justify-center",
              overdue ? "bg-red-100" : "bg-[#F1F5F9]"
            )}>
              <Receipt size={20} className={overdue ? "text-red-600" : "text-[#0891B2]"} />
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="p-1.5 rounded-md hover:bg-white/10 text-[#475569] opacity-0 group-hover:opacity-100 transition-all">
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-md">
              <DropdownMenuItem onClick={onView} className="rounded-md">
                <Eye size={14} className="mr-2" />
                View
              </DropdownMenuItem>
              {canUpdate ? (
                <DropdownMenuItem onClick={onEdit} className="rounded-md">
                  <Pencil size={14} className="mr-2" />
                  Edit
                </DropdownMenuItem>
              ) : null}
              {canSend ? (
                <DropdownMenuItem onClick={onSend} className="rounded-md">
                  <Send size={14} className="mr-2" />
                  Send
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={onDownload} className="rounded-md">
                <FileDown size={14} className="mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPrint} className="rounded-md">
                <Printer size={14} className="mr-2" />
                Print
              </DropdownMenuItem>
              {canDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="rounded-md text-red-600"
                    onClick={onDelete}
                  >
                    <Trash2 size={14} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Invoice Info */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-[#0F172A] group-hover:text-[#0891B2] transition-colors">
              {invoice.invoiceNumber}
            </h3>
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
              overdue && invoice.status !== "Paid" ? "bg-red-100 text-red-600" : statusConfig.bg,
              overdue && invoice.status !== "Paid" ? "" : statusConfig.text
            )}>
              {overdue && invoice.status !== "Paid" ? (
                <AlertTriangle size={10} />
              ) : (
                <StatusIcon size={10} />
              )}
              {overdue && invoice.status !== "Paid" ? "Overdue" : invoice.status}
            </span>
          </div>
          <p className="text-xs text-[#475569]">{formatDate(invoice.invoiceDate)}</p>
        </div>

        {/* Client */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center text-[#475569] text-xs font-semibold">
            {getInitials(invoice.clientName)}
          </div>
          <span className="text-sm text-[#475569]">{invoice.clientName}</span>
        </div>

        {/* Amount */}
        <div className="flex items-center justify-between pt-4 border-t border-[rgba(15,23,42,0.06)]">
          <div>
            <p className="text-xs text-[#475569]">Total Amount</p>
            <p className="text-lg font-bold text-[#0F172A]">{formatCurrency(invoice.total)}</p>
          </div>
          {invoice.dueDate && (
            <div className="text-right">
              <p className="text-xs text-[#475569]">Due Date</p>
              <p className={cn(
                "text-sm font-medium",
                overdue ? "text-red-600" : "text-[#475569]"
              )}>
                {formatDate(invoice.dueDate)}
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div
          className="flex gap-2 mt-4 pt-4 border-t border-[rgba(15,23,42,0.06)]"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="sm"
            onClick={onSend}
            className="flex-1 bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md h-9"
          >
            <Send size={14} className="mr-1.5" />
            Send
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDownload}
            className="flex-1 rounded-md h-9 border-[rgba(15,23,42,0.06)]"
          >
            <FileDown size={14} className="mr-1.5" />
            PDF
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

const MobileInvoiceCard = ({
  invoice,
  isSelected,
  onTap,
  onQuickAction,
  canSend,
  canMarkPaid,
}: {
  invoice: Invoice;
  isSelected: boolean;
  onTap: () => void;
  onQuickAction: () => void;
  canSend: boolean;
  canMarkPaid: boolean;
}) => {
  const overdue = isOverdue(invoice.dueDate, invoice.status);
  const statusConfig = getStatusConfig(overdue && invoice.status !== "Paid" ? "overdue" : invoice.status);
  const StatusIcon = statusConfig.icon;
  const amountDue = Math.max((invoice.total || 0) - (invoice.amountPaid || 0), 0);
  const quickActionLabel =
    invoice.status === "Draft" && canSend
      ? "Send"
      : ["Sent", "Partial", "Overdue"].includes(invoice.status) && canMarkPaid
        ? "Record Payment"
        : "View";

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onTap}
      className={cn(
        "w-full rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white p-4 text-left shadow-sm transition-all",
        isSelected && "border-[#22D3EE] bg-[#0891B2]/5"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", overdue ? "bg-red-100" : "bg-[#0891B2]/10")}>
            <Receipt size={18} className={overdue ? "text-red-600" : "text-[#0891B2]"} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#0F172A]">{invoice.invoiceNumber}</p>
            <p className="truncate text-sm text-[#475569]">{invoice.clientName}</p>
            <p className="mt-1 text-xs text-[#94A3B8]">
              Due {invoice.dueDate ? formatDate(invoice.dueDate) : "-"}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold",
            statusConfig.bg,
            statusConfig.text
          )}
        >
          <StatusIcon size={11} />
          {overdue && invoice.status !== "Paid" ? "Overdue" : invoice.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[#F8FAFC] px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-[#94A3B8]">Amount</p>
          <p className="mt-1 text-base font-semibold text-[#0F172A]">{formatCurrency(invoice.total, invoice.currency)}</p>
        </div>
        <div className="rounded-xl bg-[#F8FAFC] px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-[#94A3B8]">Outstanding</p>
          <p className={cn("mt-1 text-base font-semibold", amountDue > 0 ? "text-[#0F172A]" : "text-green-600")}>
            {formatCurrency(amountDue, invoice.currency)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[rgba(15,23,42,0.06)] pt-3">
        <div className="min-w-0">
          <p className="text-xs text-[#94A3B8]">Invoice date</p>
          <p className="truncate text-sm font-medium text-[#475569]">{formatDate(invoice.invoiceDate)}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={quickActionLabel === "View" ? "outline" : "default"}
          onClick={(event) => {
            event.stopPropagation();
            onQuickAction();
          }}
          className={cn(
            "h-9 shrink-0 rounded-xl px-3",
            quickActionLabel === "View"
              ? "border-[rgba(15,23,42,0.06)]"
              : "bg-[#0891B2] text-white hover:bg-[#0891B2]/90"
          )}
        >
          {quickActionLabel}
        </Button>
      </div>
    </motion.button>
  );
};

// ============================================
// RECORD PAYMENT DIALOG
// ============================================

const RecordPaymentDialog = ({
  isOpen,
  onClose,
  invoice,
  invoices,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  invoices: Invoice[];
  onSubmit: (invoiceId: string, amount: number, method: string, notes: string) => void;
}) => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");

  const availableInvoices = useMemo(
    () => invoices.filter((entry) => entry.status !== "Paid" && entry.status !== "Cancelled"),
    [invoices],
  );

  const selectedInvoice = useMemo(() => {
    if (invoice) {
      return invoice;
    }

    return availableInvoices.find((entry) => entry.id === selectedInvoiceId) || null;
  }, [availableInvoices, invoice, selectedInvoiceId]);

  const amountDue = selectedInvoice ? (selectedInvoice.total - (selectedInvoice.amountPaid || 0)) : 0;

  useEffect(() => {
    if (invoice) {
      setSelectedInvoiceId(invoice.id);
    } else if (availableInvoices.length > 0) {
      setSelectedInvoiceId((current) => current || availableInvoices[0].id);
    } else {
      setSelectedInvoiceId("");
    }
  }, [availableInvoices, invoice]);

  useEffect(() => {
    if (selectedInvoice) {
      setAmount(String(amountDue));
    }
  }, [selectedInvoice, amountDue]);

  const handleSubmit = async () => {
    if (!selectedInvoice) return;
    setIsSubmitting(true);
    await onSubmit(selectedInvoice.id, parseFloat(amount), method, notes);
    setIsSubmitting(false);
    onClose();
    setAmount("");
    setMethod("bank_transfer");
    setNotes("");
    setSelectedInvoiceId("");
  };

  const paymentMethods = [
    { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
    { value: "e_transfer", label: "Interac e-Transfer", icon: Wallet },
    { value: "cash", label: "Cash", icon: BanknoteIcon },
    { value: "card", label: "Credit/Debit Card", icon: CreditCard },
    { value: "cheque", label: "Cheque", icon: FileText },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] p-0 rounded-md overflow-hidden">
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)]  from-green-500/10 to-transparent">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              Record Payment
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              {selectedInvoice
                ? `Record a payment for invoice ${selectedInvoice.invoiceNumber}`
                : "Select an invoice and record its payment."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5">
          {!invoice && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#475569]">
                Select Invoice <span className="text-red-500">*</span>
              </label>
              <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
                <SelectTrigger className="h-12 rounded-md border-[rgba(15,23,42,0.06)]">
                  <SelectValue placeholder="Choose an invoice" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  {availableInvoices.map((entry) => {
                    const outstanding = Math.max((entry.total || 0) - (entry.amountPaid || 0), 0);
                    return (
                      <SelectItem key={entry.id} value={entry.id} className="rounded-md">
                        {entry.invoiceNumber} - {entry.clientName} - {formatCurrency(outstanding, entry.currency)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Invoice Summary */}
          <div className="p-4 bg-[#F8FAFC] rounded-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#94A3B8]">Invoice Total</span>
              <span className="font-semibold text-[#0F172A]">
                {formatCurrency(selectedInvoice?.total, selectedInvoice?.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#94A3B8]">Already Paid</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(selectedInvoice?.amountPaid || 0, selectedInvoice?.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[rgba(15,23,42,0.06)]">
              <span className="text-sm font-medium text-slate-200">Amount Due</span>
              <span className="font-bold text-[#0891B2]">
                {formatCurrency(amountDue, selectedInvoice?.currency)}
              </span>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#475569]">
              Payment Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-12 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20 text-lg font-semibold"
              />
            </div>
            <button
              onClick={() => setAmount(String(amountDue))}
              className="text-xs text-[#0891B2] hover:underline"
            >
              Pay full amount ({formatCurrency(amountDue, selectedInvoice?.currency)})
            </button>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#475569]">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((pm) => (
                <motion.button
                  key={pm.value}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMethod(pm.value)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-md border transition-all text-left",
                    method === pm.value
                      ? "border-[#22D3EE] bg-[#0891B2]/5"
                      : "border-[rgba(15,23,42,0.06)] hover:border-slate-300"
                  )}
                >
                  <pm.icon size={16} className={method === pm.value ? "text-[#0891B2]" : "text-[#475569]"} />
                  <span className={cn(
                    "text-sm font-medium",
                    method === pm.value ? "text-[#0891B2]" : "text-[#475569]"
                  )}>
                    {pm.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#475569]">Notes (optional)</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Transaction ID, reference number, etc."
              className="h-11 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
            />
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 gap-3">
          <Button variant="outline" onClick={onClose} className="rounded-md">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedInvoice || !amount || parseFloat(amount) <= 0}
            className="bg-green-600 hover:bg-green-700 text-[#0F172A] rounded-md"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin mr-2" />
            ) : (
              <CheckCircle2 size={16} className="mr-2" />
            )}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// SEND INVOICE DIALOG
// ============================================

const SendInvoiceDialog = ({
  isOpen,
  onClose,
  invoice,
  onSend,
}: {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSend: (invoiceId: string, email: string, message: string) => void;
}) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (invoice?.clientEmail) {
      setEmail(invoice.clientEmail);
    }
  }, [invoice]);

  const handleSend = async () => {
    if (!invoice) return;
    setIsSending(true);
    await onSend(invoice.id, email, message);
    setIsSending(false);
    onClose();
    setEmail("");
    setMessage("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] p-0 rounded-md overflow-hidden">
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              Send Invoice
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Send invoice {invoice?.invoiceNumber} to the client
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5">
          {/* Invoice Preview */}
          <div className="p-4 bg-[#F8FAFC] rounded-md flex items-center gap-4">
            <div className="w-12 h-12 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
              <Receipt size={24} className="text-[#0891B2]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#0F172A]">{invoice?.invoiceNumber}</p>
              <p className="text-sm text-[#94A3B8]">{invoice?.clientName}</p>
            </div>
            <p className="text-lg font-bold text-[#0891B2]">{formatCurrency(invoice?.total)}</p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#475569]">
              Recipient Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
              />
            </div>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#475569]">Personal Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal note to include in the email..."
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20 resize-none text-sm"
            />
          </div>

          {/* Info */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-md">
            <AlertCircle size={18} className="text-blue-500 mt-0.5" />
            <p className="text-xs text-blue-700">
              A PDF copy of the invoice will be attached to the email automatically.
            </p>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 gap-3">
          <Button variant="outline" onClick={onClose} className="rounded-md">
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !email}
            className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md "
          >
            {isSending ? (
              <Loader2 size={16} className="animate-spin mr-2" />
            ) : (
              <Send size={16} className="mr-2" />
            )}
            Send Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// EMPTY STATE COMPONENT
// ============================================

const EmptyState = ({ onAdd, canCreate }: { onAdd: () => void; canCreate: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 px-4"
  >
    <div className="w-20 h-20 rounded-md bg-[#F1F5F9] flex items-center justify-center mb-6">
      <Receipt size={40} className="text-[#0891B2]" />
    </div>
    <h3 className="text-xl font-semibold text-[#0F172A] mb-2">No invoices found</h3>
    <p className="text-[#94A3B8] text-center max-w-sm mb-6">
      Create your first invoice to start tracking payments and revenue.
    </p>
    {canCreate ? (
      <Button
        onClick={onAdd}
        className="bg-[#F1F5F9]/90 hover:from-[#22D3EE]/90 hover:to-[#22D3EE] text-[#0F172A] rounded-md "
      >
        <Plus size={18} className="mr-2" />
        Create Your First Invoice
      </Button>
    ) : null}
  </motion.div>
);

function InvoiceImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}) {
  const { toast } = useToast();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importIssues, setImportIssues] = useState<Array<{ row?: number; rows?: number[]; reason: string }>>([]);

  const handleImport = async () => {
    if (!csvFile && pdfFiles.length === 0) {
      toast({
        title: "Choose files",
        description: "Upload a CSV to create invoices, or one or more PDFs to store invoice documents.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const summaries: string[] = [];
      if (csvFile) {
        const result: any = await importInvoicesCsv(csvFile);
        summaries.push(`${result.importedCount || 0} invoices created`);
        if (result.aiImportedCount) summaries.push(`${result.aiImportedCount} created with AI mapping`);
        if (result.skippedCount) summaries.push(`${result.skippedCount} CSV rows skipped`);
        setImportIssues(Array.isArray(result.skipped) ? result.skipped : []);
      }
      if (pdfFiles.length) {
        const result: any = await importInvoicePdfs(pdfFiles);
        summaries.push(`${result.convertedCount || result.importedCount || 0} PDFs converted with AI/CRM extraction`);
        if (result.reviewNeededCount) summaries.push(`${result.reviewNeededCount} drafts need review`);
        if (result.skippedCount) summaries.push(`${result.skippedCount} PDFs skipped`);
      }
      toast({
        title: "Import complete",
        description: summaries.join(" · "),
      });
      setCsvFile(null);
      setPdfFiles([]);
      if (!summaries.some((summary) => summary.includes("CSV rows skipped"))) {
        onOpenChange(false);
      }
      onImported();
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error?.response?.data?.message || "Could not import invoice files.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Invoices</DialogTitle>
          <DialogDescription>
            CSV files create invoice records. PDFs use AI extraction when needed, create visible CRM invoice drafts, then regenerate with your CRM invoice template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
            <label className="text-sm font-semibold text-[#0F172A]">Invoice CSV</label>
            <p className="mt-1 text-xs text-[#64748B]">
              Accepted columns include invoiceNumber, company, clientEmail, clientPhone, issueDate, dueDate, currency, description, quantity, unitPrice, lineTotal, total, taxRate, discount, status, amountPaid, notes, and terms. Use the same invoiceNumber on multiple rows to import multiple line items.
            </p>
            <Input
              type="file"
              accept=".csv,text/csv"
              className="mt-3"
              onChange={(event) => setCsvFile(event.target.files?.[0] || null)}
            />
          </div>

          <div className="rounded-xl border border-[rgba(15,23,42,0.08)] bg-white p-4">
            <label className="text-sm font-semibold text-[#0F172A]">Invoice PDFs</label>
            <p className="mt-1 text-xs text-[#64748B]">
              Upload up to 10 PDFs. We extract details from text and page images where possible, create or match invoice drafts, save the original PDF, and generate a clean CRM-format invoice PDF.
            </p>
            <Input
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="mt-3"
              onChange={(event) => setPdfFiles(Array.from(event.target.files || []))}
            />
          </div>

          {importIssues.length ? (
            <div className="max-h-44 overflow-auto rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
              <div className="mb-2 font-semibold">Rows needing review</div>
              <div className="space-y-1">
                {importIssues.slice(0, 12).map((issue, index) => (
                  <div key={`${issue.reason}-${index}`}>
                    Row{issue.rows && issue.rows.length > 1 ? "s" : ""} {issue.rows?.join(", ") || issue.row || "?"}: {issue.reason}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={isImporting}>
            {isImporting ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Upload size={16} className="mr-2" />}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

const InvoicePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isMobile } = useIsMobile();
  const canCreateInvoices = useCanPerformAction("invoices", "create");
  const canUpdateInvoices = useCanPerformAction("invoices", "update");
  const canDeleteInvoices = useCanPerformAction("invoices", "delete");
  const canSendInvoices = useHasPermission("invoices.send");
  const canMarkInvoicesPaid = useHasPermission("invoices.mark-paid");

  const showPermissionDenied = useCallback((description: string) => {
    toast({
      title: "Permission denied",
      description,
      variant: "destructive",
    });
  }, [toast]);

  // State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("all");
  const [sortBy, setSortBy] = useState<InvoiceSort>("date-desc");
  const [mobileStatusTab, setMobileStatusTab] = useState<(typeof mobileStatusTabs)[number]["value"]>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof window !== "undefined" ? !window.navigator.onLine : false
  );

  // Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [invoiceForPayment, setInvoiceForPayment] = useState<Invoice | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [invoiceToSend, setInvoiceToSend] = useState<Invoice | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user data");
      }
    }
  }, []);

  const loadInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const allInvoices: any[] = [];
      let page = 1;
      let pageData: any[] = [];
      do {
        pageData = await getInvoices({ page, limit: 100, sortBy: "issueDate", sortOrder: "desc" });
        allInvoices.push(...pageData);
        page += 1;
      } while (pageData.length === 100);
      setInvoices(allInvoices.map(normalizeInvoice));
    } catch (err) {
      console.error("Failed to load invoices:", err);
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const { handlers, pullDistance, isRefreshing } = usePullToRefresh({
    enabled: isMobile,
    onRefresh: loadInvoices,
  });

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterDate, filterStatus, mobileStatusTab, searchTerm, sortBy]);

  const handleDeleteInvoice = async () => {
    if (!canDeleteInvoices) {
      showPermissionDenied("You no longer have permission to delete invoices.");
      return;
    }

    if (!invoiceToDelete) return;
    setIsDeleting(true);
    try {
      await deleteInvoice(invoiceToDelete.id);
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceToDelete.id));
      toast({
        title: "Deleted",
        description: `Invoice ${invoiceToDelete.invoiceNumber} has been deleted.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const handleRecordPayment = async (invoiceId: string, amount: number, method: string, notes: string) => {
    if (!canMarkInvoicesPaid) {
      showPermissionDenied("You no longer have permission to record invoice payments.");
      return;
    }

    try {
      const updated = await recordInvoicePayment(invoiceId, {
        amount,
        paymentMethod: paymentMethodMap[method] || "OTHER",
        notes: notes || undefined,
      });
      const normalized = normalizeInvoice(updated);
      setInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? normalized : inv)));
      toast({
        title: "Payment Recorded",
        description: `Payment of ${formatCurrency(amount)} has been recorded.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    }
  };

  const handleSendInvoice = async (invoiceId: string, email: string, message: string) => {
    if (!canSendInvoices) {
      showPermissionDenied("You no longer have permission to send invoices.");
      return;
    }

    try {
      const updated = await sendInvoice(invoiceId, email || undefined, message || undefined);
      const normalized = normalizeInvoice(updated);
      setInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? normalized : inv)));
      toast({
        title: "Invoice Sent",
        description: `Invoice has been sent to ${email}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send invoice",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      await downloadInvoicePdf(invoice.id, `${invoice.invoiceNumber}.pdf`);
      toast({
        title: "Downloaded",
        description: `${invoice.invoiceNumber} PDF downloaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download invoice PDF",
        variant: "destructive",
      });
    }
  };

  const handleSavePdfToDocuments = async (invoice: Invoice) => {
    try {
      await saveInvoicePdfToDocuments(invoice.id);
      toast({
        title: "Saved to Documents",
        description: `${invoice.invoiceNumber} PDF is linked to this invoice.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save invoice PDF to Documents",
        variant: "destructive",
      });
    }
  };

  const handlePrintInvoice = async (invoice: Invoice) => {
    try {
      const detailedInvoice = await getInvoiceById(invoice.id);
      await printInvoiceDocument(mapInvoiceToPrintableDocument(detailedInvoice));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open invoice for printing",
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = async (invoice: Invoice) => {
    if (!canCreateInvoices) {
      showPermissionDenied("You no longer have permission to create invoices.");
      return;
    }

    try {
      if (!invoice.clientId) {
        toast({
          title: "Client required",
          description: "This invoice cannot be duplicated because its client record is missing.",
          variant: "destructive",
        });
        return;
      }

      const duplicateData = {
        clientId: invoice.clientId,
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        invoiceDate: new Date().toISOString(),
        dueDate: invoice.dueDate || new Date(Date.now() + 30 * 86400000).toISOString(),
        currency: invoice.currency || "CAD",
        discountAmount: invoice.discount || 0,
        notes: invoice.notes,
        items: invoice.items?.map((item, index) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.rate,
          amount: item.amount,
          sortOrder: index,
        })) || [],
      };
      const result = await createInvoice(duplicateData as any);
      const newInvoice = normalizeInvoice(result);
      setInvoices((prev) => [newInvoice, ...prev]);
      toast({
        title: "Duplicated",
        description: `Invoice duplicated as ${newInvoice.invoiceNumber}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to duplicate invoice",
        variant: "destructive",
      });
    }
  };

  // ============================================
  // FILTERING & SORTING
  // ============================================

  const filteredInvoices = useMemo(() => {
    let result = [...invoices];
    const activeStatusFilter = isMobile ? mobileStatusTab : filterStatus;

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.invoiceNumber?.toLowerCase().includes(term) ||
          inv.clientName?.toLowerCase().includes(term) ||
          inv.clientEmail?.toLowerCase().includes(term)
      );
    }

    // Status Filter
    if (activeStatusFilter !== "all") {
      if (activeStatusFilter === "overdue") {
        result = result.filter((inv) => isOverdue(inv.dueDate, inv.status));
      } else {
        result = result.filter(
          (inv) => inv.status?.toLowerCase() === activeStatusFilter
        );
      }
    }

    // Date Filter
    if (filterDate !== "all") {
      const range = getInvoiceDateRange(filterDate);
      result = result.filter((inv) => {
        const invDate = new Date(inv.invoiceDate);
        return (!range.startDate || invDate >= new Date(range.startDate))
          && (!range.endDate || invDate <= new Date(range.endDate));
      });
    }

    result.sort(compareInvoices(sortBy));

    return result;
  }, [filterDate, filterStatus, invoices, isMobile, mobileStatusTab, searchTerm, sortBy]);

  const yearFilterOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set<number>([currentYear]);
    invoices.forEach((invoice) => {
      const year = new Date(invoice.invoiceDate).getFullYear();
      if (Number.isInteger(year)) years.add(year);
    });
    return [...years]
      .sort((first, second) => second - first)
      .map((year) => ({ value: `year:${year}`, label: `${year}` }));
  }, [invoices]);

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / pageSize);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Stats
  const stats = useMemo(() => {
    const total = invoices.reduce((acc, inv) => acc + (inv.total || 0), 0);
    const paid = invoices
      .filter((inv) => inv.status === "Paid")
      .reduce((acc, inv) => acc + (inv.total || 0), 0);
    const pending = invoices
      .filter((inv) => inv.status !== "Paid" && inv.status !== "Cancelled")
      .reduce((acc, inv) => acc + (inv.total || 0) - (inv.amountPaid || 0), 0);
    const overdue = invoices
      .filter((inv) => isOverdue(inv.dueDate, inv.status))
      .reduce((acc, inv) => acc + (inv.total || 0) - (inv.amountPaid || 0), 0);
    const overdueCount = invoices.filter((inv) => isOverdue(inv.dueDate, inv.status)).length;

    return { total, paid, pending, overdue, overdueCount, count: invoices.length };
  }, [invoices]);

  const invoiceAnalytics = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);

    const weeklyCollected = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + index);
      return { label: day.toLocaleDateString("en-CA", { weekday: "narrow" }), total: 0 };
    });

    const taxTotals = { GST: 0, PST: 0, QST: 0, HST: 0, Other: 0 };
    const paymentTotals: Record<string, number> = {};
    let currentMonthCollected = 0;
    let previousMonthCollected = 0;

    invoices.forEach((invoice) => {
      const invoiceTax = Math.max(Number(invoice.tax || 0), 0);
      if (invoiceTax > 0) {
        const rows = Array.isArray(invoice.taxRates) ? invoice.taxRates.filter((row) => Number(row?.rate) > 0) : [];
        const totalRate = rows.reduce((sum, row) => sum + Number(row.rate || 0), 0);

        if (rows.length && totalRate > 0) {
          rows.forEach((row) => {
            const label = String(row.name || "").toUpperCase();
            const key = label.includes("HST")
              ? "HST"
              : label.includes("QST")
                ? "QST"
                : label.includes("PST")
                  ? "PST"
                  : label.includes("GST")
                    ? "GST"
                    : "Other";
            taxTotals[key] += invoiceTax * (Number(row.rate || 0) / totalRate);
          });
        } else if (invoice.taxRate === 13 || invoice.taxRate === 15) {
          taxTotals.HST += invoiceTax;
        } else if (invoice.taxRate === 12) {
          taxTotals.GST += invoiceTax * (5 / 12);
          taxTotals.PST += invoiceTax * (7 / 12);
        } else if (invoice.taxRate === 11) {
          taxTotals.GST += invoiceTax * (5 / 11);
          taxTotals.PST += invoiceTax * (6 / 11);
        } else if (invoice.taxRate === 14.975) {
          taxTotals.GST += invoiceTax * (5 / 14.975);
          taxTotals.QST += invoiceTax * (9.975 / 14.975);
        } else if (invoice.taxRate === 5) {
          taxTotals.GST += invoiceTax;
        } else {
          taxTotals.Other += invoiceTax;
        }
      }

      (invoice.payments || []).forEach((payment) => {
        const status = String(payment.status || "SUCCESSFUL").toUpperCase();
        if (["FAILED", "VOID", "VOIDED", "CANCELLED"].includes(status)) return;

        const netAmount = Math.max((Number(payment.amount) || 0) - (Number(payment.refundAmount) || 0), 0);
        if (netAmount <= 0) return;

        const paidAt = new Date(payment.paymentDate || invoice.paidAt || invoice.createdAt || "");
        if (!Number.isNaN(paidAt.getTime())) {
          if (paidAt >= currentMonthStart && paidAt < nextMonthStart) {
            currentMonthCollected += netAmount;
          }
          if (paidAt >= previousMonthStart && paidAt < currentMonthStart) {
            previousMonthCollected += netAmount;
          }
          if (paidAt >= weekStart) {
            const dayIndex = Math.floor((paidAt.getTime() - weekStart.getTime()) / 86400000);
            if (dayIndex >= 0 && dayIndex < 7) {
              weeklyCollected[dayIndex].total += netAmount;
            }
          }
        }

        const methodKey = String(payment.paymentMethod || "OTHER").toUpperCase();
        paymentTotals[methodKey] = (paymentTotals[methodKey] || 0) + netAmount;
      });
    });

    const monthTrend = previousMonthCollected > 0
      ? ((currentMonthCollected - previousMonthCollected) / previousMonthCollected) * 100
      : currentMonthCollected > 0
        ? 100
        : 0;
    const maxWeekly = Math.max(...weeklyCollected.map((entry) => entry.total), 0);
    const methodTotal = Object.values(paymentTotals).reduce((sum, value) => sum + value, 0);
    const methodLabels: Record<string, string> = {
      BANK_TRANSFER: "Bank Transfer",
      E_TRANSFER: "Interac e-Transfer",
      CREDIT_CARD: "Credit/Debit Card",
      DEBIT_CARD: "Debit Card",
      CASH: "Cash",
      CHECK: "Cheque",
      CHEQUE: "Cheque",
      STRIPE: "Stripe",
      PAYPAL: "PayPal",
      OTHER: "Other",
    };
    const methodColors = ["bg-[#0891B2]", "bg-[#D97706]", "bg-purple-500", "bg-green-500", "bg-slate-400", "bg-blue-500"];
    const paymentMethods = Object.entries(paymentTotals)
      .map(([method, amount], index) => ({
        method: methodLabels[method] || method.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()),
        amount,
        percentage: methodTotal > 0 ? Math.round((amount / methodTotal) * 100) : 0,
        color: methodColors[index % methodColors.length],
      }))
      .sort((first, second) => second.amount - first.amount);

    return {
      currentMonthCollected,
      previousMonthCollected,
      monthTrend,
      weeklyCollected: weeklyCollected.map((entry) => ({
        ...entry,
        height: maxWeekly > 0 ? Math.max(8, Math.round((entry.total / maxWeekly) * 100)) : 4,
      })),
      taxTotals,
      paymentMethods,
    };
  }, [invoices]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvoices(paginatedInvoices.map((inv) => inv.id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleSelectInvoice = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedInvoices((prev) => [...prev, id]);
    } else {
      setSelectedInvoices((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (!canDeleteInvoices) {
      showPermissionDenied("You no longer have permission to delete invoices.");
      return;
    }

    if (selectedInvoices.length === 0) return;
    try {
      await Promise.all(selectedInvoices.map((id) => deleteInvoice(id)));
      setInvoices((prev) => prev.filter((inv) => !selectedInvoices.includes(inv.id)));
      toast({
        title: "Deleted",
        description: `${selectedInvoices.length} invoices have been deleted.`,
      });
      setSelectedInvoices([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete invoices",
        variant: "destructive",
      });
    }
  };

  const handleBulkSend = async () => {
    if (!canSendInvoices) {
      showPermissionDenied("You no longer have permission to send invoices.");
      return;
    }

    if (selectedInvoices.length === 0) return;
    try {
      await Promise.allSettled(
        selectedInvoices.map((id) => {
          const invoice = invoices.find((entry) => entry.id === id);
          return sendInvoice(id, invoice?.clientEmail || undefined);
        }),
      );
      await loadInvoices();
      toast({
        title: "Invoices Sent",
        description: `${selectedInvoices.length} invoices have been updated.`,
      });
      setSelectedInvoices([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send selected invoices",
        variant: "destructive",
      });
    }
  };

  const handleExport = async () => {
    const activeStatusFilter = isMobile ? mobileStatusTab : filterStatus;
    const exportStatusMap: Record<string, string> = {
      draft: "DRAFT",
      sent: "SENT",
      viewed: "VIEWED",
      paid: "PAID",
      partial: "PARTIALLY_PAID",
      overdue: "OVERDUE",
      cancelled: "CANCELLED",
    };
    try {
      await exportInvoicesCsv({
        search: searchTerm || undefined,
        status: activeStatusFilter !== "all" ? (exportStatusMap[activeStatusFilter] as any) : undefined,
        ...getInvoiceDateRange(filterDate),
        sortBy: sortBy === "number-asc" ? "invoiceNumber" : sortBy.startsWith("amount") ? "total" : sortBy === "due-date-asc" ? "dueDate" : "issueDate",
        sortOrder: sortBy.endsWith("-asc") ? "asc" : "desc",
      });
      toast({
        title: "Exported",
        description: "Invoices exported to CSV successfully.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export invoices.",
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (invoice: Invoice) => {
    if (!canDeleteInvoices) {
      showPermissionDenied("You no longer have permission to delete invoices.");
      return;
    }

    setInvoiceToDelete(invoice);
    setDeleteDialogOpen(true);
  };

  const openSendDialog = (invoice: Invoice) => {
    if (!canSendInvoices) {
      showPermissionDenied("You no longer have permission to send invoices.");
      return;
    }

    setInvoiceToSend(invoice);
    setSendDialogOpen(true);
  };

  const openPaymentDialog = (invoice: Invoice) => {
    if (!canMarkInvoicesPaid) {
      showPermissionDenied("You no longer have permission to record invoice payments.");
      return;
    }

    setInvoiceForPayment(invoice);
    setPaymentDialogOpen(true);
  };

  const handleMobileQuickAction = (invoice: Invoice) => {
    if (invoice.status === "Draft" && canSendInvoices) {
      openSendDialog(invoice);
      return;
    }
    if (["Sent", "Partial", "Overdue"].includes(invoice.status) && canMarkInvoicesPaid) {
      openPaymentDialog(invoice);
      return;
    }
    navigate(`/invoice/${invoice.id}`);
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <main
        className={cn(
          "flex-1 transition-all duration-300"
        )}
        onTouchStart={isMobile ? handlers.onTouchStart : undefined}
        onTouchMove={isMobile ? handlers.onTouchMove : undefined}
        onTouchEnd={isMobile ? handlers.onTouchEnd : undefined}
      >
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <header className="crm-module-header sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-[rgba(15,23,42,0.06)]/50">
          <div className="crm-toolbar-row px-6">
            <div className="crm-toolbar-breadcrumb">
              <span className="text-[#475569]">Dashboard</span>
              <ChevronRight size={16} className="text-[#475569]" />
              <span className="crm-toolbar-breadcrumb-current">Invoices</span>
            </div>

            <div className="crm-toolbar-actions">
              <NotificationBell
                buttonClassName="border-0 bg-transparent p-2 text-[#475569] hover:bg-white/10"
                iconClassName="text-[#475569]"
                iconSize={20}
              />

              <div className="flex items-center gap-3 pl-3 border-l border-[rgba(15,23,42,0.06)]">
                <div className="w-9 h-9 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] font-semibold text-sm">
                  {user ? getInitials(`${user.firstName} ${user.lastName}`) : "?"}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ============================================ */}
        {/* CONTENT */}
        {/* ============================================ */}
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

          {isOffline && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
              <AlertTriangle size={16} className="shrink-0" />
              You&apos;re offline. Showing the latest loaded invoice data until the connection comes back.
            </motion.div>
          )}
          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex items-center justify-between", isMobile && "items-start gap-3")}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-md bg-[#F1F5F9] flex items-center justify-center ">
                <Receipt size={24} className="text-[#0F172A]" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Invoices</h1>
                <p className="text-[#94A3B8]">Manage billing and payments</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={loadInvoices}
                className="p-2.5 rounded-md border border-[rgba(15,23,42,0.06)] hover:bg-[#F8FAFC] text-[#475569] transition-colors"
              >
                <RefreshCw size={18} />
              </motion.button>

              {isMobile ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className="p-2.5 rounded-md border border-[rgba(15,23,42,0.06)] hover:bg-[#F8FAFC] text-[#475569] transition-colors"
                >
                  <Filter size={18} />
                </motion.button>
              ) : (
                <>
                  {canCreateInvoices ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setImportDialogOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-[rgba(15,23,42,0.06)] hover:bg-[#F8FAFC] text-[#475569] transition-colors"
                    >
                      <Upload size={18} />
                      <span className="font-medium">Import</span>
                    </motion.button>
                  ) : null}

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-[rgba(15,23,42,0.06)] hover:bg-[#F8FAFC] text-[#475569] transition-colors"
                  >
                    <Download size={18} />
                    <span className="font-medium">Export</span>
                  </motion.button>

                  {canCreateInvoices ? (
                    <Button
                      onClick={() => navigate("/invoice/create")}
                      className="bg-[#F1F5F9]/90 hover:from-[#22D3EE]/90 hover:to-[#22D3EE] text-[#0F172A] rounded-md  px-5"
                    >
                      <Plus size={18} className="mr-2" />
                      New Invoice
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div
            className={cn(
              isMobile
                ? "flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                : "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 sm:gap-4"
            )}
          >
            <div className={cn(isMobile && "min-w-[220px]")}>
            <StatCard
              title="Total Invoiced"
              value={formatCurrency(stats.total)}
              subtitle={`${stats.count} invoices`}
              icon={Receipt}
              color="teal"
              delay={0}
            />
            </div>
            <div className={cn(isMobile && "min-w-[220px]")}>
            <StatCard
              title="Paid"
              value={formatCurrency(stats.paid)}
              subtitle="Received payments"
              icon={CheckCircle2}
              color="green"
              trend={invoiceAnalytics.monthTrend !== 0 ? { value: Math.round(Math.abs(invoiceAnalytics.monthTrend)), positive: invoiceAnalytics.monthTrend >= 0 } : undefined}
              delay={0.1}
            />
            </div>
            <div className={cn(isMobile && "min-w-[220px]")}>
            <StatCard
              title="Pending"
              value={formatCurrency(stats.pending)}
              subtitle="Awaiting payment"
              icon={Clock3}
              color="gold"
              delay={0.2}
            />
            </div>
            <div className={cn(isMobile && "min-w-[220px]")}>
            <StatCard
              title="Overdue"
              value={formatCurrency(stats.overdue)}
              subtitle={`${stats.overdueCount} invoices overdue`}
              icon={AlertTriangle}
              color="red"
              delay={0.3}
            />
            </div>
            <div className={cn(isMobile && "min-w-[220px]")}>
            <StatCard
              title="Collection Rate"
              value={`${stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0}%`}
              subtitle="Payment success rate"
              icon={TrendingUp}
              color="purple"
              trend={{ value: 5, positive: true }}
              delay={0.4}
            />
            </div>
          </div>

          {isMobile ? (
            <div className="space-y-4 pb-24">
              <div className="space-y-3 rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white p-4 shadow-sm">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                  />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search invoices..."
                    className="h-11 rounded-xl border-[rgba(15,23,42,0.06)] pl-10"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <Tabs value={mobileStatusTab} onValueChange={(value) => setMobileStatusTab(value as (typeof mobileStatusTabs)[number]["value"])}>
                      <TabsList className="inline-flex w-max rounded-2xl bg-[#F8FAFC] p-1">
                        {mobileStatusTabs.map((tab) => (
                          <TabsTrigger key={tab.value} value={tab.value} className="rounded-xl px-4 text-xs">
                            {tab.label}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsFilterDrawerOpen(true)}
                    className="h-10 rounded-xl border-[rgba(15,23,42,0.06)] px-3"
                  >
                    <Filter size={16} className="mr-2" />
                    Filter
                  </Button>
                </div>

                <p className="text-xs text-[#94A3B8]">
                  Swipe right to view, swipe left to delete, and long press any invoice to start multi-select.
                </p>
              </div>

              {selectedInvoices.length > 0 && (
                <div className="sticky top-[88px] z-20 rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-[#0F172A]">
                      {selectedInvoices.length} selected
                    </span>
                    <div className="flex items-center gap-2">
                      {canSendInvoices ? (
                        <Button size="sm" onClick={handleBulkSend} className="h-9 rounded-xl bg-[#0891B2] text-white hover:bg-[#0891B2]/90">
                          <Send size={14} className="mr-1.5" />
                          Send
                        </Button>
                      ) : null}
                      {canDeleteInvoices ? (
                        <Button size="sm" variant="outline" onClick={handleBulkDelete} className="h-9 rounded-xl border-red-200 text-red-600 hover:bg-red-50">
                          <Trash2 size={14} className="mr-1.5" />
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {isLoading ? (
                <ListCardSkeleton rows={4} />
              ) : filteredInvoices.length === 0 ? (
                <div className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white">
                  <EmptyState onAdd={() => navigate("/invoice/create")} canCreate={canCreateInvoices} />
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedInvoices.map((invoice) => {
                    const isSelected = selectedInvoices.includes(invoice.id);
                    const card = (
                      <MobileInvoiceCard
                        invoice={invoice}
                        isSelected={isSelected}
                        onTap={() => navigate(`/invoice/${invoice.id}`)}
                        onQuickAction={() => handleMobileQuickAction(invoice)}
                        canSend={canSendInvoices}
                        canMarkPaid={canMarkInvoicesPaid}
                      />
                    );

                    return canDeleteInvoices ? (
                      <SwipeActionCard
                        key={invoice.id}
                        onView={() => navigate(`/invoice/${invoice.id}`)}
                        onDelete={() => openDeleteDialog(invoice)}
                        onLongPress={() => handleSelectInvoice(invoice.id, !isSelected)}
                        primaryLabel="View"
                        secondaryLabel="Delete"
                      >
                        {card}
                      </SwipeActionCard>
                    ) : (
                      <div key={invoice.id}>{card}</div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white px-4 py-3 text-sm text-[#475569] shadow-sm">
                <span>
                  Showing {filteredInvoices.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
                  {Math.min(currentPage * pageSize, filteredInvoices.length)} of {filteredInvoices.length}
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      className="h-9 rounded-xl border-[rgba(15,23,42,0.06)] px-3"
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                      className="h-9 rounded-xl border-[rgba(15,23,42,0.06)] px-3"
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                )}
              </div>

              {canCreateInvoices ? (
                <Button
                  type="button"
                  onClick={() => navigate("/invoice/create")}
                  className="mobile-create-fab fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full bg-[#0891B2] p-0 text-white shadow-lg hover:bg-[#0891B2]/90"
                >
                  <Plus size={22} />
                </Button>
              ) : null}
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {/* Main Content - 3 columns */}
            <div className="col-span-full lg:col-span-3 space-y-4">
              {/* Filters & Actions Bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Left Side - Search & Filters */}
                  <div className="flex items-center gap-3 flex-1">
                    {/* Search */}
                    <div className="relative max-w-sm flex-1">
                      <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"
                      />
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search invoices..."
                        className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#475569]"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    {/* Status Filter */}
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="h-11 w-[150px] rounded-md border-[rgba(15,23,42,0.06)]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-md">
                        {statusOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className="rounded-md"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Date Filter */}
                    <Select value={filterDate} onValueChange={setFilterDate}>
                      <SelectTrigger className="h-11 w-[140px] rounded-md border-[rgba(15,23,42,0.06)]">
                        <SelectValue placeholder="Period" />
                      </SelectTrigger>
                      <SelectContent className="rounded-md">
                        {dateFilterOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className="rounded-md"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                        {yearFilterOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="rounded-md">
                            Year {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Sort */}
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as InvoiceSort)}>
                      <SelectTrigger className="h-11 w-[190px] rounded-md border-[rgba(15,23,42,0.06)]">
                        <ArrowUpDown size={15} className="mr-2 text-[#64748B]" />
                        <SelectValue placeholder="Sort invoices" />
                      </SelectTrigger>
                      <SelectContent className="rounded-md">
                        {sortOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="rounded-md">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Clear Filters */}
                    {(filterStatus !== "all" || filterDate !== "all" || sortBy !== "date-desc" || searchTerm) && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => {
                          setSearchTerm("");
                          setFilterStatus("all");
                          setFilterDate("all");
                          setSortBy("date-desc");
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-[#94A3B8] hover:text-[#0891B2] hover:bg-[#0891B2]/5 transition-colors"
                      >
                        <X size={14} />
                        Clear
                      </motion.button>
                    )}
                  </div>

                  {/* Right Side - View & Bulk Actions */}
                  <div className="flex items-center gap-2">
                    {/* Bulk Actions */}
                    <AnimatePresence>
                      {selectedInvoices.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex items-center gap-2 pr-3 mr-3 border-r border-[rgba(15,23,42,0.06)]"
                        >
                          <span className="text-sm text-[#94A3B8]">
                            {selectedInvoices.length} selected
                          </span>
                          {canSendInvoices ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 rounded-md border-[rgba(15,23,42,0.06)]"
                              onClick={handleBulkSend}
                            >
                              <Send size={14} className="mr-1" />
                              Send
                            </Button>
                          ) : null}
                          {canDeleteInvoices ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleBulkDelete}
                              className="h-9 rounded-md border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={14} className="mr-1" />
                              Delete
                            </Button>
                          ) : null}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* View Toggle */}
                    <div className="flex items-center p-1 bg-white/5 rounded-md">
                      <button
                        onClick={() => setViewMode("table")}
                        className={cn(
                          "p-2 rounded-md transition-all",
                          viewMode === "table"
                            ? "bg-white text-[#0891B2] shadow-sm"
                            : "text-[#94A3B8] hover:text-slate-200"
                        )}
                      >
                        <List size={18} />
                      </button>
                      <button
                        onClick={() => setViewMode("grid")}
                        className={cn(
                          "p-2 rounded-md transition-all",
                          viewMode === "grid"
                            ? "bg-white text-[#0891B2] shadow-sm"
                            : "text-[#94A3B8] hover:text-slate-200"
                        )}
                      >
                        <LayoutGrid size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Invoices Content */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden"
              >
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 size={40} className="animate-spin text-[#0891B2] mb-4" />
                    <p className="text-[#94A3B8]">Loading invoices...</p>
                  </div>
                ) : filteredInvoices.length === 0 ? (
                  <EmptyState onAdd={() => navigate("/invoice/create")} canCreate={canCreateInvoices} />
                ) : viewMode === "table" ? (
                  <>
                    {/* Table View */}
                    <div className="responsive-table">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[rgba(15,23,42,0.06)] bg-[#F8FAFC]/50">
                            <th className="py-4 px-4 text-left">
                              <Checkbox
                                checked={
                                  selectedInvoices.length === paginatedInvoices.length &&
                                  paginatedInvoices.length > 0
                                }
                                onCheckedChange={handleSelectAll}
                                className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
                              />
                            </th>
                            <th className="py-4 px-4 text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                              Invoice
                            </th>
                            <th className="py-4 px-4 text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                              Client
                            </th>
                            <th className="py-4 px-4 text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                              Due Date
                            </th>
                            <th className="py-4 px-4 text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                              Status
                            </th>
                            <th className="py-4 px-4 text-right text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="py-4 px-4 text-right text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <AnimatePresence>
                            {paginatedInvoices.map((invoice) => (
                              <InvoiceRow
                                key={invoice.id}
                                invoice={invoice}
                                isSelected={selectedInvoices.includes(invoice.id)}
                                onSelect={(checked) => handleSelectInvoice(invoice.id, checked)}
                                onView={() => navigate(`/invoice/${invoice.id}`)}
                                onEdit={() => navigate(`/invoice/${invoice.id}/edit`)}
                                onDelete={() => openDeleteDialog(invoice)}
                                onSend={() => openSendDialog(invoice)}
                                onDownload={() => handleDownloadPDF(invoice)}
                                onSaveDocument={() => handleSavePdfToDocuments(invoice)}
                                onDuplicate={() => handleDuplicate(invoice)}
                                onRecordPayment={() => openPaymentDialog(invoice)}
                                onPrint={() => handlePrintInvoice(invoice)}
                                onHistory={() => navigate(`/invoice/${invoice.id}`)}
                                canUpdate={canUpdateInvoices}
                                canDelete={canDeleteInvoices}
                                canSend={canSendInvoices}
                                canMarkPaid={canMarkInvoicesPaid}
                                canCreate={canCreateInvoices}
                              />
                            ))}
                          </AnimatePresence>
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-[rgba(15,23,42,0.06)]">
                      <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
                        <span>
                          Showing {((currentPage - 1) * pageSize) + 1} to{" "}
                          {Math.min(currentPage * pageSize, filteredInvoices.length)} of{" "}
                          {filteredInvoices.length}
                        </span>
                        <Select
                          value={String(pageSize)}
                          onValueChange={(v) => {
                            setPageSize(Number(v));
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="h-8 w-[70px] rounded-md text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-md">
                            {[10, 20, 50, 100].map((size) => (
                              <SelectItem key={size} value={String(size)} className="rounded-md">
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span>per page</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="h-9 w-9 p-0 rounded-md"
                        >
                          <ChevronsLeft size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="h-9 w-9 p-0 rounded-md"
                        >
                          <ChevronLeft size={16} />
                        </Button>

                        {/* Page Numbers */}
                        <div className="flex items-center gap-1 mx-2">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={cn(
                                  "h-9 w-9 rounded-md text-sm font-medium transition-all",
                                  currentPage === pageNum
                                    ? "bg-[#0891B2] text-white "
                                    : "text-[#475569] hover:bg-white/10"
                                )}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="h-9 w-9 p-0 rounded-md"
                        >
                          <ChevronRight size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className="h-9 w-9 p-0 rounded-md"
                        >
                          <ChevronsRight size={16} />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Grid View */
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <AnimatePresence>
                        {paginatedInvoices.map((invoice, index) => (
                          <motion.div
                            key={invoice.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <InvoiceCard
                              invoice={invoice}
                              isSelected={selectedInvoices.includes(invoice.id)}
                              onSelect={(checked) => handleSelectInvoice(invoice.id, checked)}
                              onView={() => navigate(`/invoice/${invoice.id}`)}
                              onEdit={() => navigate(`/invoice/${invoice.id}/edit`)}
                              onDelete={() => openDeleteDialog(invoice)}
                              onSend={() => openSendDialog(invoice)}
                              onDownload={() => handleDownloadPDF(invoice)}
                              onPrint={() => handlePrintInvoice(invoice)}
                              canUpdate={canUpdateInvoices}
                              canDelete={canDeleteInvoices}
                              canSend={canSendInvoices}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    {/* Grid Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-8">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="rounded-md"
                        >
                          <ChevronLeft size={16} className="mr-1" />
                          Previous
                        </Button>

                        <div className="flex items-center gap-1 mx-4">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={cn(
                                  "h-9 w-9 rounded-md text-sm font-medium transition-all",
                                  currentPage === pageNum
                                    ? "bg-[#0891B2] text-white "
                                    : "text-[#475569] hover:bg-white/10"
                                )}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="rounded-md"
                        >
                          Next
                          <ChevronRight size={16} className="ml-1" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Right Sidebar - 1 column */}
            <div className="space-y-4">
              {/* Revenue Chart Mini */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#0F172A]">Revenue</h3>
                  <span className="text-xs text-[#475569]">This Month</span>
                </div>

                <div className="text-center py-4">
                  <p className="text-3xl font-bold text-[#0F172A]">{formatCurrency(invoiceAnalytics.currentMonthCollected)}</p>
                  <p className="text-sm text-[#94A3B8] mt-1">Collected</p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {invoiceAnalytics.monthTrend >= 0 ? (
                      <TrendingUp size={14} className="text-green-500" />
                    ) : (
                      <TrendingDown size={14} className="text-red-500" />
                    )}
                    <span className={cn("text-xs font-semibold", invoiceAnalytics.monthTrend >= 0 ? "text-green-600" : "text-red-600")}>
                      {invoiceAnalytics.previousMonthCollected > 0
                        ? `${invoiceAnalytics.monthTrend >= 0 ? "+" : "-"}${Math.abs(invoiceAnalytics.monthTrend).toFixed(0)}% from last month`
                        : invoiceAnalytics.currentMonthCollected > 0
                          ? "New collections this month"
                          : "No collections this month"}
                    </span>
                  </div>
                </div>

                {/* Mini Bar Chart */}
                <div className="flex items-end justify-between h-20 mt-4 gap-1">
                  {invoiceAnalytics.weeklyCollected.map((entry, index) => (
                    <motion.div
                      key={index}
                      initial={{ height: 0 }}
                      animate={{ height: `${entry.height}%` }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className={cn(
                        "flex-1 rounded-t-lg",
                        index === 6 ? "bg-[#0891B2]" : "bg-[#0891B2]/20"
                      )}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  {invoiceAnalytics.weeklyCollected.map((entry, index) => (
                    <span key={index} className="text-[10px] text-[#475569] flex-1 text-center">
                      {entry.label}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Canadian Tax Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#0F172A]">Taxes</h3>
                  <span className="text-xs text-[#475569]">From invoices</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "GST", amount: invoiceAnalytics.taxTotals.GST, color: "text-[#0891B2]" },
                    { label: "PST", amount: invoiceAnalytics.taxTotals.PST, color: "text-[#D97706]" },
                    { label: "HST", amount: invoiceAnalytics.taxTotals.HST, color: "text-purple-600" },
                    { label: "QST / Other", amount: invoiceAnalytics.taxTotals.QST + invoiceAnalytics.taxTotals.Other, color: "text-[#475569]" },
                  ].map((taxItem) => (
                    <div key={taxItem.label} className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-3">
                      <p className="text-xs text-[#64748B]">{taxItem.label}</p>
                      <p className={cn("mt-1 text-base font-bold", taxItem.color)}>{formatCurrency(taxItem.amount)}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Overdue Invoices Alert */}
              {stats.overdueCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-red-50 rounded-md border border-red-200 p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-md bg-red-100 flex items-center justify-center">
                      <AlertTriangle size={20} className="text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-800">Overdue Invoices</h3>
                      <p className="text-sm text-red-600 mt-1">
                        {stats.overdueCount} invoice{stats.overdueCount > 1 ? "s" : ""} overdue totaling{" "}
                        <span className="font-bold">{formatCurrency(stats.overdue)}</span>
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setFilterStatus("overdue")}
                        className="mt-3 bg-red-600 hover:bg-red-700 text-[#0F172A] rounded-md h-8"
                      >
                        View Overdue
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5"
              >
                <h3 className="font-semibold text-[#0F172A] mb-4">Quick Actions</h3>

                <div className="space-y-2">
                  {[
                    canCreateInvoices ? { icon: FilePlus, label: "Create Invoice", color: "teal", action: () => navigate("/invoice/create") } : null,
                    { icon: Receipt, label: "Create Proposal", color: "gold", action: () => navigate("/proposals?action=create") },
                    canMarkInvoicesPaid
                      ? {
                          icon: CreditCard,
                          label: "Record Payment",
                          color: "green",
                          action: () => {
                            const candidates = invoices.filter((inv) => inv.status !== "Paid" && inv.status !== "Cancelled");
                            if (candidates.length === 0) {
                              toast({
                                title: "No unpaid invoices",
                                description: "There are no invoices ready for payment.",
                              });
                              return;
                            }
                            setInvoiceForPayment(null);
                            setPaymentDialogOpen(true);
                          },
                        }
                      : null,
                    { icon: FileSpreadsheet, label: "Generate Report", color: "purple", action: () => navigate("/reports/revenue") },
                    { icon: Settings, label: "Invoice Settings", color: "slate", action: () => navigate("/settings/billing") },
                  ].filter(Boolean).map((action, index) => {
                    const colorClasses: Record<string, string> = {
                      teal: "bg-[#0891B2]/10 text-[#0891B2]",
                      gold: "bg-[#D97706]/10 text-[#D97706]",
                      green: "bg-green-500/10 text-green-500",
                      purple: "bg-purple-500/10 text-purple-500",
                      slate: "bg-white/5 text-[#475569]",
                    };

                    return (
                      <motion.button
                        key={index}
                        whileHover={{ x: 4 }}
                        onClick={action.action}
                        className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-[#F8FAFC] transition-colors text-left group"
                      >
                        <div className={cn("w-9 h-9 rounded-md flex items-center justify-center", colorClasses[action.color])}>
                          <action.icon size={18} />
                        </div>
                        <span className="font-medium text-[#475569] group-hover:text-[#0F172A] transition-colors">
                          {action.label}
                        </span>
                        <ChevronRight size={16} className="ml-auto text-[#475569] group-hover:text-[#475569] transition-colors" />
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Recent Activity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#0F172A]">Recent Activity</h3>
                  <button onClick={() => navigate("/notifications")} className="text-xs text-[#0891B2] hover:underline">View All</button>
                </div>

                <div className="space-y-4">
                  {[
                    { action: "Payment received", invoice: "INV-001", amount: 15000, time: "2 hours ago", type: "payment" },
                    { action: "Invoice sent", invoice: "INV-002", amount: 8500, time: "5 hours ago", type: "sent" },
                    { action: "Invoice viewed", invoice: "INV-003", amount: 12000, time: "Yesterday", type: "viewed" },
                    { action: "Invoice created", invoice: "INV-004", amount: 25000, time: "Yesterday", type: "created" },
                  ].map((activity, index) => {
                    const typeIcons: Record<string, { icon: LucideIcon; color: string }> = {
                      payment: { icon: CheckCircle2, color: "text-green-500 bg-green-100" },
                      sent: { icon: Send, color: "text-blue-500 bg-blue-100" },
                      viewed: { icon: Eye, color: "text-purple-500 bg-purple-100" },
                      created: { icon: FilePlus, color: "text-[#0891B2] bg-[#0891B2]/10" },
                    };
                    const { icon: Icon, color } = typeIcons[activity.type];

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <div className={cn("w-8 h-8 rounded-md flex items-center justify-center", color.split(" ")[1])}>
                          <Icon size={14} className={color.split(" ")[0]} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-200">{activity.action}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-medium text-[#0891B2]">{activity.invoice}</span>
                            <span className="text-xs text-[#475569]">•</span>
                            <span className="text-xs text-[#94A3B8]">{formatCurrency(activity.amount)}</span>
                          </div>
                        </div>
                        <span className="text-xs text-[#475569]">{activity.time}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Payment Methods Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5"
              >
                <h3 className="font-semibold text-[#0F172A] mb-4">Payment Methods</h3>

                <div className="space-y-3">
                  {(invoiceAnalytics.paymentMethods.length > 0 ? invoiceAnalytics.paymentMethods : [
                    { method: "No payments recorded", percentage: 0, amount: 0, color: "bg-slate-300" },
                  ]).map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-[#475569]">{item.method}</span>
                        <span className="text-sm font-semibold text-[#0F172A]">
                          {item.percentage}% · {formatCurrency(item.amount)}
                        </span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.percentage}%` }}
                          transition={{ duration: 0.5, delay: 0.9 + index * 0.1 }}
                          className={cn("h-full rounded-full", item.color)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Pro Tip */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="p-4 bg-[#F1F5F9] rounded-md border border-[#22D3EE]/20"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-[#0891B2]/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={16} className="text-[#0891B2]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#0F172A] text-sm mb-1">Pro Tip</p>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      Set up automatic payment reminders to reduce overdue invoices by up to 30%.
                    </p>
                    <button onClick={() => navigate("/settings/notifications")} className="mt-2 text-xs font-medium text-[#0891B2] hover:underline">
                      Configure Reminders →
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
          )}
        </div>

        <Drawer open={isMobile && isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
          <DrawerContent className="max-h-[85dvh] rounded-t-[24px] border-none bg-white px-0">
            <DrawerHeader className="px-5 pb-2 text-left">
              <DrawerTitle className="text-[#0F172A]">Filter Invoices</DrawerTitle>
              <DrawerDescription>
                Refine the invoice list by time period and switch the mobile card style.
              </DrawerDescription>
            </DrawerHeader>
            <div className="space-y-5 px-5 pb-6 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#475569]">Date range</label>
                <Select value={filterDate} onValueChange={setFilterDate}>
                  <SelectTrigger className="h-11 rounded-xl border-[rgba(15,23,42,0.06)]">
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {dateFilterOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                    {yearFilterOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        Year {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#475569]">Sort invoices</label>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as InvoiceSort)}>
                  <SelectTrigger className="h-11 rounded-xl border-[rgba(15,23,42,0.06)]">
                    <SelectValue placeholder="Sort invoices" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {sortOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#475569]">Export</label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExport}
                  className="h-11 w-full rounded-xl border-[rgba(15,23,42,0.06)]"
                >
                  <Download size={16} className="mr-2" />
                  Export current results
                </Button>
              </div>

              {canCreateInvoices ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#475569]">Import</label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsFilterDrawerOpen(false);
                      setImportDialogOpen(true);
                    }}
                    className="h-11 w-full rounded-xl border-[rgba(15,23,42,0.06)]"
                  >
                    <Upload size={16} className="mr-2" />
                    Import CSV or PDFs
                  </Button>
                </div>
              ) : null}
            </div>
            <DrawerFooter className="border-t border-[rgba(15,23,42,0.06)] bg-white px-5 pb-6 pt-4">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => {
                  setFilterDate("all");
                  setIsFilterDrawerOpen(false);
                }}
              >
                Clear filters
              </Button>
              <Button
                type="button"
                className="h-11 rounded-xl bg-[#0891B2] text-white hover:bg-[#0891B2]/90"
                onClick={() => setIsFilterDrawerOpen(false)}
              >
                Apply
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        {/* ============================================ */}
        {/* DIALOGS */}
        {/* ============================================ */}

        <InvoiceImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImported={loadInvoices}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="rounded-md">
            <AlertDialogHeader>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <AlertDialogTitle className="text-center text-[#0F172A]">
                Delete Invoice
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                Are you sure you want to delete invoice{" "}
                <span className="font-semibold text-[#0F172A]">
                  {invoiceToDelete?.invoiceNumber}
                </span>
                ? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 sm:justify-center">
              <AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteInvoice}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 rounded-md"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} className="mr-2" />
                    Delete Invoice
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Record Payment Dialog */}
        <RecordPaymentDialog
          isOpen={paymentDialogOpen}
          onClose={() => {
            setPaymentDialogOpen(false);
            setInvoiceForPayment(null);
          }}
          invoice={invoiceForPayment}
          invoices={invoices}
          onSubmit={handleRecordPayment}
        />

        {/* Send Invoice Dialog */}
        <SendInvoiceDialog
          isOpen={sendDialogOpen}
          onClose={() => {
            setSendDialogOpen(false);
            setInvoiceToSend(null);
          }}
          invoice={invoiceToSend}
          onSend={handleSendInvoice}
        />
      </main>
    </div>
  );
};

export default InvoicePage;
