import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CreditCard,
  DollarSign,
  Eye,
  Filter,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

// ============================================
// CONSTANTS & HELPERS
// ============================================

const PAYMENT_METHODS = ["BANK_TRANSFER", "E_TRANSFER", "CREDIT_CARD", "DEBIT_CARD", "CHECK", "CASH", "STRIPE", "PAYPAL", "OTHER"] as const;
const PAYMENT_METHOD_ALIASES: Record<string, typeof PAYMENT_METHODS[number]> = {
  CARD: "CREDIT_CARD",
  CREDITCARD: "CREDIT_CARD",
  CREDIT_CARD: "CREDIT_CARD",
  DEBITCARD: "DEBIT_CARD",
  DEBIT_CARD: "DEBIT_CARD",
  BANK: "BANK_TRANSFER",
  TRANSFER: "BANK_TRANSFER",
  WIRE: "BANK_TRANSFER",
  WIRE_TRANSFER: "BANK_TRANSFER",
  BANK_TRANSFER: "BANK_TRANSFER",
  ETRANSFER: "E_TRANSFER",
  E_TRANSFER: "E_TRANSFER",
  INTERAC: "E_TRANSFER",
  CHEQUE: "CHECK",
  CHECK: "CHECK",
  CASH: "CASH",
  PAYPAL: "PAYPAL",
  STRIPE: "STRIPE",
  OTHER: "OTHER",
};

const normalizePaymentMethod = (value: unknown): typeof PAYMENT_METHODS[number] => {
  const normalized = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return PAYMENT_METHOD_ALIASES[normalized]
    || PAYMENT_METHOD_ALIASES[normalized.replaceAll("_", "")]
    || "OTHER";
};

const toDateInputValue = (value: unknown) => {
  const text = String(value || "").trim();
  const calendarDate = text.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  if (calendarDate) return calendarDate;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? emptyForm.paymentDate : parsed.toISOString().slice(0, 10);
};

const apiErrorMessage = (error: any, fallback: string) => {
  const errors = error?.response?.data?.details?.errors;
  const firstError = errors && Object.values(errors).flat().find((value) => typeof value === "string");
  return String(firstError || error?.response?.data?.message || error?.message || fallback);
};

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

const dateLabel = (value?: string) => {
  if (!value) return "-";
  const calendarDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = calendarDate
    ? new Date(Number(calendarDate[1]), Number(calendarDate[2]) - 1, Number(calendarDate[3]))
    : new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
};

const getPaymentYear = (value?: string): number | null => {
  if (!value) return null;
  const calendarDate = value.match(/^(\d{4})/);
  if (calendarDate) return Number(calendarDate[1]);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getFullYear();
};

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

const getClientName = (payment: BillingRecord) =>
  payment.client?.clientName || payment.client?.name || "Account";

// ============================================
// STAT CARD COMPONENT (Matching Leads)
// ============================================

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
      className="relative bg-white rounded-md p-5 border border-[rgba(15,23,42,0.06)] hover:border-[#0F766E]/30 hover:shadow-lg transition-all overflow-hidden group"
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

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const canCreate = useCanPerformAction("payments", "create");
  const canUpdate = useCanPerformAction("payments", "update");
  const canDelete = useCanPerformAction("payments", "delete");

  // Editor states
  const [editorMode, setEditorMode] = useState<"create" | "edit" | null>(null);
  const [editingPayment, setEditingPayment] = useState<BillingRecord | null>(null);
  const [viewPaymentId, setViewPaymentId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<BillingRecord | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Filter & sort states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [nameFilter, setNameFilter] = useState("ALL");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "name">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Data queries
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

  // Mutations
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
      paymentMethod: normalizePaymentMethod(form.paymentMethod),
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
      description: apiErrorMessage(error, "The payment could not be updated."),
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

  // Data
  const payments = paymentsQuery.data || [];
  const invoices = (invoicesQuery.data || []).filter((invoice) => Number(invoice.amountDue || 0) > 0);

  // Derived data for filters
  const uniqueClientNames = useMemo(() => {
    const names = new Set<string>();
    payments.forEach((p) => {
      const name = getClientName(p);
      if (name && name !== "Account") names.add(name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [payments]);

  const uniqueYears = useMemo(() => {
    const years = new Set<number>();
    payments.forEach((p) => {
      const year = getPaymentYear(p.paymentDate);
      if (year) years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [payments]);

  // Stats
  const total = payments.reduce((sum, payment) => sum + effectiveAmount(payment), 0);
  const successfulCount = payments.filter((p) => String(p.status || "SUCCESSFUL").toUpperCase() === "SUCCESSFUL").length;
  const refundedCount = payments.filter((p) => {
    const s = String(p.status || "").toUpperCase();
    return s === "REFUNDED" || s === "PARTIALLY_REFUNDED";
  }).length;
  const voidedCount = payments.filter((p) => String(p.status || "").toUpperCase() === "VOIDED").length;
  const failedCount = payments.filter((p) => String(p.status || "").toUpperCase() === "FAILED").length;

  // Filtered & sorted payments
  const filteredPayments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    let result = payments.filter((payment) => {
      const status = String(payment.status || "SUCCESSFUL").toUpperCase();

      // Tab filter
      if (activeTab === "successful" && status !== "SUCCESSFUL") return false;
      if (activeTab === "refunded" && status !== "REFUNDED" && status !== "PARTIALLY_REFUNDED") return false;
      if (activeTab === "voided" && status !== "VOIDED") return false;
      if (activeTab === "failed" && status !== "FAILED") return false;

      // Status dropdown filter
      if (statusFilter !== "ALL" && status !== statusFilter) return false;

      // Name filter
      if (nameFilter !== "ALL") {
        const clientName = getClientName(payment);
        if (clientName !== nameFilter) return false;
      }

      // Year filter
      if (yearFilter !== "ALL") {
        const year = getPaymentYear(payment.paymentDate);
        if (!year || String(year) !== yearFilter) return false;
      }

      // Search
      if (needle) {
        return [
          payment.paymentNumber,
          payment.reference,
          payment.client?.clientName,
          payment.invoice?.invoiceNumber,
          payment.paymentMethod,
        ].some((value) => String(value || "").toLowerCase().includes(needle));
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "date":
          comparison = new Date(a.paymentDate || 0).getTime() - new Date(b.paymentDate || 0).getTime();
          break;
        case "amount":
          comparison = Number(a.amount || 0) - Number(b.amount || 0);
          break;
        case "name":
          comparison = getClientName(a).localeCompare(getClientName(b));
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [payments, search, statusFilter, nameFilter, yearFilter, activeTab, sortBy, sortOrder]);

  const hasActiveFilters =
    Boolean(search) ||
    statusFilter !== "ALL" ||
    nameFilter !== "ALL" ||
    yearFilter !== "ALL";

  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setNameFilter("ALL");
    setYearFilter("ALL");
  };

  // Handlers
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
      paymentMethod: normalizePaymentMethod(payment.paymentMethod),
      paymentDate: toDateInputValue(payment.paymentDate),
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
                  <span className="crm-toolbar-breadcrumb-current" style={{ color: "#0F766E" }}>Payments</span>
                </div>
                <h1 className="crm-toolbar-title text-lg sm:text-[clamp(1.35rem,1.12rem+0.48vw,1.75rem)]">Payments</h1>
              </div>

              <div className="crm-toolbar-actions gap-2 sm:gap-3">
                {canCreate ? (
                  <Button
                    onClick={openCreate}
                    className="crm-toolbar-button gap-2"
                    size="sm"
                    style={{
                      background: "#0F766E",
                      color: "#FFFFFF",
                      border: "1px solid rgba(15,118,110,0.16)",
                      boxShadow: "0 8px 20px rgba(15,118,110,0.16)",
                    }}
                  >
                    <Plus size={16} />
                    <span className="hidden sm:inline">Record Payment</span>
                    <span className="sm:hidden">Record</span>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* ── Stats Cards ── */}
          <div className="mb-4 lg:mb-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <StatCard
              title="Total Payments"
              value={payments.length}
              icon={Receipt}
              color="#0F766E"
              sparklineData={[3, 5, 4, 7, 6, 8, payments.length || 10]}
            />
            <StatCard
              title="Net Collected"
              value={money(total)}
              icon={DollarSign}
              color="#FBBF24"
              delay={0.1}
              sparklineData={[1000, 2500, 1800, 3200, 2800, 4100, total || 1000]}
            />
            <StatCard
              title="Open Invoices"
              value={invoices.length}
              icon={CreditCard}
              color="#3B82F6"
              delay={0.2}
              sparklineData={[2, 3, 1, 4, 3, 2, invoices.length || 1]}
            />
            <StatCard
              title="Successful"
              value={successfulCount}
              icon={ArrowUpRight}
              color="#10B981"
              delay={0.3}
              sparklineData={[1, 2, 3, 2, 4, 3, successfulCount || 1]}
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
                        All ({payments.length})
                      </TabsTrigger>
                      <TabsTrigger value="successful" className="rounded-md data-[state=active]:bg-white text-xs sm:text-sm px-2 sm:px-3">
                        Successful ({successfulCount})
                      </TabsTrigger>
                      <TabsTrigger value="refunded" className="rounded-md data-[state=active]:bg-white text-xs sm:text-sm px-2 sm:px-3">
                        Refunded ({refundedCount})
                      </TabsTrigger>
                      <TabsTrigger value="voided" className="rounded-md data-[state=active]:bg-white text-xs sm:text-sm px-2 sm:px-3">
                        Voided ({voidedCount})
                      </TabsTrigger>
                      {failedCount > 0 && (
                        <TabsTrigger value="failed" className="rounded-md data-[state=active]:bg-white text-xs sm:text-sm px-2 sm:px-3">
                          Failed ({failedCount})
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
                      placeholder="Search payments, clients, invoices..."
                      className="pl-9 h-10 rounded-md border-[rgba(15,23,42,0.06)] w-full"
                    />
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto">
                    {/* Status Filter */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[120px] sm:w-[150px] h-9 sm:h-10 rounded-md border-[rgba(15,23,42,0.06)] text-xs sm:text-sm flex-shrink-0">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-md">
                        <SelectItem value="ALL" className="rounded-md">All Statuses</SelectItem>
                        {["SUCCESSFUL", "PARTIALLY_REFUNDED", "REFUNDED", "FAILED", "VOIDED"].map((status) => (
                          <SelectItem key={status} value={status} className="rounded-md">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    status === "SUCCESSFUL" ? "#10B981" :
                                    status === "PARTIALLY_REFUNDED" ? "#F59E0B" :
                                    status === "REFUNDED" ? "#3B82F6" :
                                    status === "FAILED" ? "#EF4444" :
                                    "#64748B",
                                }}
                              />
                              {methodLabel(status)}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Client Name Filter */}
                    <Select value={nameFilter} onValueChange={setNameFilter}>
                      <SelectTrigger className="w-[120px] sm:w-[160px] h-9 sm:h-10 rounded-md border-[rgba(15,23,42,0.06)] text-xs sm:text-sm flex-shrink-0">
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
                      <SelectTrigger className="w-[100px] sm:w-[120px] h-9 sm:h-10 rounded-md border-[rgba(15,23,42,0.06)] text-xs sm:text-sm flex-shrink-0">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent className="rounded-md">
                        <SelectItem value="ALL" className="rounded-md">All Years</SelectItem>
                        {uniqueYears.map((year) => (
                          <SelectItem key={year} value={String(year)} className="rounded-md">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-[#94A3B8]" />
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
                        <DropdownMenuItem
                          onClick={() => {
                            setSortBy("date");
                            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                          }}
                          className="rounded-md"
                        >
                          <Calendar size={14} className="mr-2" />
                          Date
                          {sortBy === "date" && <Check size={14} className="ml-auto text-[#0F766E]" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSortBy("amount");
                            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                          }}
                          className="rounded-md"
                        >
                          <DollarSign size={14} className="mr-2" />
                          Amount
                          {sortBy === "amount" && <Check size={14} className="ml-auto text-[#0F766E]" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSortBy("name");
                            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                          }}
                          className="rounded-md"
                        >
                          <User size={14} className="mr-2" />
                          Client Name
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
                        <Search size={10} />
                        "{search}"
                        <button onClick={() => setSearch("")} className="ml-0.5 hover:text-red-500 transition-colors"><X size={12} /></button>
                      </span>
                    )}
                    {statusFilter !== "ALL" && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F1F5F9] text-[#475569] rounded-md text-xs">
                        Status: {methodLabel(statusFilter)}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-[#94A3B8] hover:text-red-500 h-7 px-2"
                      onClick={clearAllFilters}
                    >
                      <X size={12} className="mr-1" />
                      Clear all
                    </Button>
                  </div>
                )}
              </Tabs>
            </div>

            {/* ── Table Content ── */}
            {paymentsQuery.isLoading ? (
              <div className="p-6">
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-14 bg-[#F1F5F9] rounded-md animate-pulse" />
                  ))}
                </div>
              </div>
            ) : paymentsQuery.isError ? (
              <div className="p-6">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
                  <Receipt size={28} className="mx-auto mb-3 text-red-500" />
                  <p className="font-semibold text-red-900">Couldn't load payments</p>
                  <p className="mt-1 text-sm text-red-700">Please try refreshing the page.</p>
                </div>
              </div>
            ) : (
              <div className="responsive-table">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Payment</TableHead>
                      <TableHead>Client / Invoice</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center">
                            <Receipt size={48} className="text-[#94A3B8] mb-3" />
                            <p className="text-[#94A3B8] font-medium">
                              {hasActiveFilters ? "No matching payments" : "No payments yet"}
                            </p>
                            <p className="text-[#475569] text-sm mt-1">
                              {hasActiveFilters
                                ? "Try clearing a filter or changing your search."
                                : "Record your first payment to get started."}
                            </p>
                            {hasActiveFilters && (
                              <Button
                                variant="outline"
                                className="rounded-md mt-4"
                                onClick={clearAllFilters}
                              >
                                Clear Filters
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPayments.map((payment) => {
                        const status = String(payment.status || "SUCCESSFUL").toUpperCase();
                        const editable = ["SUCCESSFUL", "PARTIALLY_REFUNDED"].includes(status);
                        return (
                          <TableRow
                            key={payment.id}
                            className="group cursor-pointer transition-colors"
                            onClick={() => setViewPaymentId(payment.id)}
                          >
                            <TableCell>
                              <span className="font-medium text-[#0F172A]">
                                {payment.paymentNumber || payment.reference || payment.id?.slice(0, 8)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium text-[#0F172A]">{getClientName(payment)}</p>
                                <p className="text-xs text-[#94A3B8]">Invoice {payment.invoice?.invoiceNumber || "-"}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold text-[#0F766E]">
                                {money(payment.amount, payment.invoice?.currency || "CAD")}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-[#475569]">{methodLabel(payment.paymentMethod)}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusClasses[status] || "border-slate-200 bg-slate-50 text-slate-700"}>
                                {methodLabel(status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-[#94A3B8]">{dateLabel(payment.paymentDate)}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-md"
                                        onClick={() => setViewPaymentId(payment.id)}
                                      >
                                        <Eye size={16} className="text-[#475569]" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View Details</TooltipContent>
                                  </Tooltip>
                                  {canUpdate && editable ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-md"
                                          onClick={() => openEdit(payment)}
                                        >
                                          <Pencil size={16} className="text-[#475569]" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Edit</TooltipContent>
                                    </Tooltip>
                                  ) : null}
                                </TooltipProvider>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
                                      <MoreHorizontal size={16} className="text-[#475569]" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 rounded-md">
                                    <DropdownMenuItem onClick={() => setViewPaymentId(payment.id)} className="rounded-md">
                                      <Eye size={14} className="mr-2" />View Details
                                    </DropdownMenuItem>
                                    {canUpdate && editable ? (
                                      <DropdownMenuItem onClick={() => openEdit(payment)} className="rounded-md">
                                        <Pencil size={14} className="mr-2" />Edit
                                      </DropdownMenuItem>
                                    ) : null}
                                    {canDelete && status !== "VOIDED" ? (
                                      <DropdownMenuItem
                                        onClick={() => setVoidTarget(payment)}
                                        className="rounded-md text-red-600 focus:text-red-600"
                                      >
                                        <Trash2 size={14} className="mr-2" />Void Payment
                                      </DropdownMenuItem>
                                    ) : null}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Results Count Footer */}
            {!paymentsQuery.isLoading && filteredPayments.length > 0 && (
              <div className="px-4 py-3 border-t border-[rgba(15,23,42,0.06)] text-xs text-[#94A3B8]">
                Showing {filteredPayments.length} of {payments.length} payment{payments.length !== 1 ? "s" : ""}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* ── Record / Edit Payment Dialog ── */}
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
            <Button onClick={submitPayment} disabled={saving} style={{ background: "#0F766E", color: "#fff" }} className="hover:opacity-90">{saving ? "Saving..." : editorMode === "edit" ? "Save Changes" : "Record Payment"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Payment Detail Dialog ── */}
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

      {/* ── Void Confirmation Dialog ── */}
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
