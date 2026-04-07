// src/pages/RoofEstimator.tsx — Estimates Landing Page (Client List style)

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  ClipboardList,
  DollarSign,
  Download,
  Eye,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  TrendingUp,
  Triangle,
  Wallet,
} from "lucide-react";
import {
  getEstimates,
  getEstimateStatistics,
  deleteEstimate,
  type RoofEstimate,
  type EstimateStatistics,
} from "@/features/roof-estimator/services/roof-estimator-service";
import {
  getWallet,
  addFunds as addWalletFunds,
  getTransactions,
  type WalletInfo,
  type WalletTransaction,
} from "@/features/wallet/services/wallet-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import useIsMobile from "@/hooks/useIsMobile";
import {
  ListCardSkeleton,
  PullToRefreshIndicator,
  SwipeActionCard,
  usePullToRefresh,
} from "@/features/clients/components/responsive-helpers";
import { useCanPerformAction } from "@/hooks/usePermissionAccess";

/* ─── Helpers ──────────────────────────────────────────────── */

const fmt = (n: number | null | undefined) =>
  n != null ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
const fmtArea = (n: number | null | undefined) =>
  n != null ? `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} sq ft` : "—";
const fmtPct = (n: number | null | undefined) =>
  n != null ? `${n.toFixed(1)}%` : "—";
const short = (id: string) => id.slice(0, 8).toUpperCase();
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} took too long to load.`)), ms);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => {
        if (timer) clearTimeout(timer);
      });
  });
};

const getEstimatePartyName = (estimate: RoofEstimate) => {
  const leadName = `${estimate.lead?.firstName || ""} ${estimate.lead?.lastName || ""}`.trim();
  return estimate.client?.clientName || leadName || estimate.lead?.companyName || "—";
};

/* ─── Stat Card (matches Client List) ────────────────────── */

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  delay = 0,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: "teal" | "gold" | "green" | "navy" | "red" | "purple";
  delay?: number;
}) => {
  const colorClasses = {
    teal: { bg: "bg-[#0891B2]", light: "bg-[#0891B2]/10", text: "text-[#0891B2]" },
    gold: { bg: "bg-[#D97706]", light: "bg-[#D97706]/10", text: "text-[#D97706]" },
    navy: { bg: "bg-[#F8FAFC]", light: "bg-[#F8FAFC]/10", text: "text-[#0F172A]" },
    purple: { bg: "bg-purple-500", light: "bg-purple-500/10", text: "text-purple-500" },
    green: { bg: "bg-emerald-500", light: "bg-emerald-500/10", text: "text-emerald-500" },
    red: { bg: "bg-red-500", light: "bg-red-500/10", text: "text-red-500" },
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="relative bg-white rounded-md p-5 border border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg transition-all overflow-hidden group"
    >
      <div className={cn("absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-all", colors.bg)} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-[#94A3B8] mb-1">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">{value}</p>
          {subtitle && <p className="text-xs text-[#475569] mt-1">{subtitle}</p>}
        </div>
        <div className={cn("w-10 h-10 rounded-md flex items-center justify-center", colors.light)}>
          <Icon size={18} className={colors.text} />
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Status Badge ─────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === "completed"
      ? "bg-emerald-100 text-emerald-700"
      : status === "sent"
      ? "bg-[#0891B2]/10 text-[#0891B2]"
      : "bg-[#D97706]/10 text-[#D97706]";
  const dotClasses =
    status === "completed"
      ? "bg-emerald-500"
      : status === "sent"
      ? "bg-[#0891B2]"
      : "bg-[#D97706]";

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize", classes)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dotClasses)} />
      {status}
    </span>
  );
}

/* ─── Estimate Row (Table View) ──────────────────────────── */

function EstimateRow({
  est,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  canUpdate,
  canDelete,
}: {
  est: RoofEstimate;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canUpdate: boolean;
  canDelete: boolean;
}) {
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
      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
        />
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-[#0891B2]/10 flex items-center justify-center text-[#0891B2]">
            <FileText size={16} />
          </div>
          <div>
            <div className="font-semibold text-[#0F172A] group-hover:text-[#0891B2] transition-colors font-mono text-sm">
              {short(est.id)}
            </div>
            <div className="text-xs text-[#475569]">{fmtDate(est.createdAt)}</div>
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <span className="text-sm font-medium text-[#0F172A]">{getEstimatePartyName(est)}</span>
      </td>
      <td className="py-4 px-4">
        <span className="text-sm text-[#475569] truncate max-w-[200px] block">{est.address}</span>
      </td>
      <td className="py-4 px-4">
        <span className="text-sm text-[#475569]">{fmtArea(est.roofAreaSqft)}</span>
      </td>
      <td className="py-4 px-4">
        <span className="text-sm font-semibold text-[#0F172A]">
          {fmt(est.finalEstimatePrice ?? est.totalEstimate)}
        </span>
      </td>
      <td className="py-4 px-4">
        <StatusBadge status={est.status || "draft"} />
      </td>
      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {est.pdfUrl && (
            <motion.a
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              href={est.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-md hover:bg-emerald-500/10 text-emerald-600 transition-colors"
              title="View Report"
            >
              <Eye size={16} />
            </motion.a>
          )}
          {canUpdate ? (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onEdit}
              className="p-2 rounded-md hover:bg-[#D97706]/10 text-[#D97706] transition-colors"
              title="Edit"
            >
              <Pencil size={16} />
            </motion.button>
          ) : null}
          {canDelete ? (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onDelete}
              className="p-2 rounded-md hover:bg-red-500/10 text-red-500 transition-colors"
              title="Delete"
            >
              <Trash2 size={16} />
            </motion.button>
          ) : null}
        </div>
      </td>
    </motion.tr>
  );
}

/* ─── Estimate Card (Grid View) ──────────────────────────── */

function EstimateCard({
  est,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  canUpdate,
  canDelete,
}: {
  est: RoofEstimate;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      className={cn(
        "bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5 cursor-pointer group",
        "hover:border-[#22D3EE]/30 hover:shadow-lg transition-all",
        isSelected && "border-[#22D3EE] bg-[#0891B2]/5"
      )}
      onClick={onView}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            onClick={(e) => e.stopPropagation()}
            className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
          />
          <div className="w-10 h-10 rounded-md bg-[#0891B2]/10 flex items-center justify-center text-[#0891B2]">
            <FileText size={16} />
          </div>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {est.pdfUrl && (
            <a
              href={est.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-md hover:bg-emerald-500/10 text-emerald-600 transition-colors"
              title="View Report"
            >
              <Eye size={14} />
            </a>
          )}
          {canUpdate ? (
            <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-[#D97706]/10 text-[#D97706] transition-colors" title="Edit">
              <Pencil size={14} />
            </button>
          ) : null}
          {canDelete ? (
            <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-red-500/10 text-red-500 transition-colors" title="Delete">
              <Trash2 size={14} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-3">
        <p className="font-mono text-xs text-[#94A3B8]">{short(est.id)}</p>
        <h3 className="font-semibold text-[#0F172A] group-hover:text-[#0891B2] transition-colors mt-1 truncate">
          {getEstimatePartyName(est)}
        </h3>
        <p className="text-xs text-[#475569] truncate mt-0.5">{est.address}</p>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <StatusBadge status={est.status || "draft"} />
      </div>

      <div className="pt-3 border-t border-[rgba(15,23,42,0.06)]">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-[#94A3B8]">Roof Area</p>
            <p className="text-sm font-semibold text-[#0F172A]">{fmtArea(est.roofAreaSqft)}</p>
          </div>
          <div>
            <p className="text-xs text-[#94A3B8]">Price</p>
            <p className="text-sm font-semibold text-[#0F172A]">{fmt(est.finalEstimatePrice ?? est.totalEstimate)}</p>
          </div>
        </div>
        <p className="text-xs text-[#94A3B8] mt-2">{fmtDate(est.createdAt)}</p>
      </div>
    </motion.div>
  );
}

function MobileEstimateCard({
  est,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  canUpdate,
  canDelete,
}: {
  est: RoofEstimate;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const content = (
      <div
        className={cn(
          "rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4 shadow-sm transition-colors",
          isSelected && "border-[#22D3EE] bg-[#0891B2]/5"
        )}
        onClick={onView}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              onClick={(e) => e.stopPropagation()}
              className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
            />
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#0891B2]/10 text-[#0891B2]">
              <FileText size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[11px] text-[#94A3B8]">{short(est.id)}</div>
              <h3 className="truncate text-sm font-semibold text-[#0F172A]">{getEstimatePartyName(est)}</h3>
              <p className="truncate text-xs text-[#475569]">{est.address}</p>
            </div>
          </div>
          <StatusBadge status={est.status || "draft"} />
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-[rgba(15,23,42,0.06)] pt-3">
          <div>
            <p className="text-[11px] text-[#94A3B8]">Roof Area</p>
            <p className="text-sm font-semibold text-[#0F172A]">{fmtArea(est.roofAreaSqft)}</p>
          </div>
          <div>
            <p className="text-[11px] text-[#94A3B8]">Estimate</p>
            <p className="text-sm font-semibold text-[#0F172A]">{fmt(est.finalEstimatePrice ?? est.totalEstimate)}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[11px] text-[#94A3B8]">{fmtDate(est.createdAt)}</p>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {est.pdfUrl && (
              <a
                href={est.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md p-2 text-emerald-600 transition-colors hover:bg-emerald-500/10"
                title="View Report"
              >
                <Eye size={15} />
              </a>
            )}
            {canUpdate ? (
              <button
                onClick={onEdit}
                className="rounded-md p-2 text-[#D97706] transition-colors hover:bg-[#D97706]/10"
                title="Edit"
              >
                <Pencil size={15} />
              </button>
            ) : null}
            {canDelete ? (
              <button
                onClick={onDelete}
                className="rounded-md p-2 text-red-500 transition-colors hover:bg-red-500/10"
                title="Delete"
              >
                <Trash2 size={15} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
  );

  return canDelete ? (
    <SwipeActionCard onView={onView} onDelete={onDelete} className="rounded-md">
      {content}
    </SwipeActionCard>
  ) : (
    content
  );
}

/* ─── Main Component ──────────────────────────────────────── */

type ViewMode = "grid" | "table";

export default function RoofEstimator() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isMobile, isTablet } = useIsMobile();
  const canCreateEstimates = useCanPerformAction("roof-estimator", "create");
  const canUpdateEstimates = useCanPerformAction("roof-estimator", "update");
  const canDeleteEstimates = useCanPerformAction("roof-estimator", "delete");

  const [estimates, setEstimates] = useState<RoofEstimate[]>([]);
  const [stats, setStats] = useState<EstimateStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [selectedEstimates, setSelectedEstimates] = useState<Set<string>>(new Set());

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Wallet state
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [addingFunds, setAddingFunds] = useState(false);

  const showPermissionDenied = (description: string) => {
    toast({
      title: "Permission denied",
      description,
      variant: "destructive",
    });
  };

  const loadEstimatorData = useMemo(() => async () => {
    setLoading(true);
    try {
      const estimateList = await withTimeout(getEstimates(), 45000, "Estimator list");
      setEstimates(estimateList);
    } catch (error: any) {
      setEstimates([]);
      toast({
        title: "Estimator unavailable",
        description: error?.message || "Failed to load estimator records.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }

    const secondaryResults = await Promise.allSettled([
      withTimeout(getEstimateStatistics(), 15000, "Estimator statistics"),
      withTimeout(getWallet().catch(() => null), 8000, "Wallet"),
      withTimeout(
        getTransactions(1, 10).catch(() => ({ data: [], total: 0, page: 1, limit: 10 })),
        8000,
        "Wallet transactions",
      ),
    ]);

    const [statsResult, walletResult, transactionsResult] = secondaryResults;

    setStats(statsResult.status === "fulfilled" ? statsResult.value : null);
    setWallet(walletResult.status === "fulfilled" && walletResult.value ? walletResult.value : null);
    setTransactions(transactionsResult.status === "fulfilled" ? transactionsResult.value.data || [] : []);
  }, [toast]);

  // Load data
  useEffect(() => {
    let isMounted = true;

    (async () => {
      await loadEstimatorData();
      if (!isMounted) return;
    })();

    return () => {
      isMounted = false;
    };
  }, [loadEstimatorData]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = estimates;
    if (filterStatus !== "all") list = list.filter((e) => e.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.address.toLowerCase().includes(q) ||
          getEstimatePartyName(e).toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [estimates, filterStatus, search]);

  // Delete handler
  const handleDelete = async () => {
    if (!canDeleteEstimates) {
      showPermissionDenied("You no longer have permission to delete roof estimates.");
      return;
    }

    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteEstimate(deleteId);
      setEstimates((prev) => prev.filter((e) => e.id !== deleteId));
      toast({ title: "Deleted", description: "Estimate removed successfully" });
    } catch {
      toast({ title: "Error", description: "Failed to delete estimate", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  // Add funds handler
  const handleAddFunds = async () => {
    const amt = parseFloat(fundAmount);
    if (isNaN(amt) || amt <= 0) {
      toast({ title: "Error", description: "Enter a valid amount", variant: "destructive" });
      return;
    }
    setAddingFunds(true);
    try {
      const result = await addWalletFunds(amt);
      setWallet((prev) => prev ? { ...prev, balance: result.balance } : prev);
      setTransactions((prev) => [result.transaction, ...prev].slice(0, 10));
      setFundAmount("");
      setShowAddFunds(false);
      toast({ title: "Funds Added", description: `$${amt.toFixed(2)} added to your wallet` });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to add funds", variant: "destructive" });
    } finally {
      setAddingFunds(false);
    }
  };

  /* counts */
  const draftCount = estimates.filter((e) => e.status === "draft").length;
  const completedCount = estimates.filter((e) => e.status === "completed").length;
  const sentCount = estimates.filter((e) => e.status === "sent").length;

  const toggleSelect = (id: string) => {
    setSelectedEstimates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEstimates(new Set(filtered.map((e) => e.id)));
    } else {
      setSelectedEstimates(new Set());
    }
  };

  const openEstimateEditor = (estimateId: string) => {
    if (!canUpdateEstimates) {
      showPermissionDenied("You do not have permission to edit roof estimates.");
      return;
    }

    navigate(`/roof-estimator/${estimateId}/edit`);
  };

  const allSelected = filtered.length > 0 && selectedEstimates.size === filtered.length;
  const effectiveViewMode: ViewMode = isMobile ? "grid" : viewMode;
  const { handlers, pullDistance, isRefreshing } = usePullToRefresh({
    enabled: isMobile,
    onRefresh: loadEstimatorData,
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]" {...(isMobile ? handlers : {})}>
      {/* ── Header ───────────────────────────────────────── */}
      <header className="crm-module-header sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-[rgba(15,23,42,0.06)]/50">
        <div className={cn("flex items-center justify-between", isMobile ? "min-h-16 px-4 py-3" : "h-16 px-6")}>
          <div className={cn("flex items-center gap-2 text-sm", isMobile && "min-w-0")}>
            <span className="text-[#475569]">CRM</span>
            <ChevronRight size={16} className="text-[#475569]" />
            <span className="truncate font-medium text-[#0F172A]">EagleView Roof Estimator</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              EagleView Sandbox
            </span>
            {!isMobile && canCreateEstimates && (
              <Button
                onClick={() => navigate("/roof-estimator/new")}
                className="bg-[#0891B2] hover:bg-[#0E7490] text-white rounded-md shadow-sm"
              >
                <Plus size={18} className="mr-2" />
                Create Estimate
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className={cn("mx-auto max-w-[1600px]", isMobile ? "px-4 py-4 pb-24" : "px-6 py-6")}>
        {isMobile && <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />}
        {/* ── Title ─────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
              <ClipboardList size={20} className="text-[#0891B2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">EagleView Roof Estimator</h1>
              <p className="text-sm text-[#94A3B8]">
                {estimates.length} estimates • Manage EagleView sandbox measurements and pricing
              </p>
            </div>
          </div>
        </div>

        {/* ── Stats ─────────────────────────────────────── */}
        <div className={cn(
          "mb-6 gap-4",
          isMobile
            ? "flex overflow-x-auto pb-2 [&>*]:min-w-[240px] [&>*]:shrink-0"
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        )}>
          <StatCard title="Total Estimates" value={stats ? String(stats.totalEstimates) : "—"} subtitle="All estimates" icon={ClipboardList} color="teal" delay={0} />
          <StatCard title="Total Revenue" value={stats ? fmt(stats.totalRevenue) : "—"} subtitle="Booked revenue" icon={DollarSign} color="gold" delay={0.05} />
          <StatCard title="Avg Roof Area" value={stats ? fmtArea(stats.avgRoofArea) : "—"} subtitle="Average per estimate" icon={Triangle} color="green" delay={0.1} />
          <StatCard title="Avg Confidence" value={stats ? fmtPct(stats.avgConfidence) : "—"} subtitle="AI detection accuracy" icon={Shield} color="navy" delay={0.15} />

          {/* Wallet */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -4 }}
            className="relative bg-gradient-to-br from-[#0891B2] to-[#0E7490] rounded-md p-5 border border-[#0891B2]/20 hover:shadow-lg transition-all overflow-hidden group"
          >
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10 group-hover:bg-white/20 transition-all" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm text-white/70 mb-1">Wallet Balance</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{wallet ? fmt(wallet.balance) : "—"}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="w-10 h-10 rounded-md bg-white/15 flex items-center justify-center">
                  <Wallet size={18} className="text-white" />
                </div>
                <button
                  onClick={() => setShowAddFunds(true)}
                  className="text-xs font-semibold text-white/80 hover:text-white px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 transition-all"
                >
                  + Add Funds
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Toolbar ──────────────────────────────────── */}
        <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-4 mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by address, client, or ID..."
                  className="pl-9 rounded-md border-[rgba(15,23,42,0.1)]"
                />
              </div>

              {/* Status filter tabs */}
              <div className={cn(
                "flex items-center gap-1 bg-[#F1F5F9] rounded-md p-1",
                isMobile && "overflow-x-auto"
              )}>
                {[
                  { label: "All", val: "all", count: estimates.length },
                  { label: "Draft", val: "draft", count: draftCount },
                  { label: "Completed", val: "completed", count: completedCount },
                  { label: "Sent", val: "sent", count: sentCount },
                ].map((t) => (
                  <button
                    key={t.val}
                    onClick={() => setFilterStatus(t.val)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap",
                      filterStatus === t.val
                        ? "bg-white text-[#0891B2] shadow-sm"
                        : "text-[#64748B] hover:text-[#0F172A]"
                    )}
                  >
                    {t.label} <span className="opacity-60">({t.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* View toggle */}
            {!isMobile && (
              <div className="flex items-center border border-[rgba(15,23,42,0.1)] rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === "grid"
                    ? "bg-[#0891B2] text-white"
                    : "bg-white text-[#475569] hover:bg-[#F1F5F9]"
                )}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === "table"
                    ? "bg-[#0891B2] text-white"
                    : "bg-white text-[#475569] hover:bg-[#F1F5F9]"
                )}
              >
                <List size={16} />
              </button>
              </div>
            )}
          </div>

          {/* Bulk actions */}
          <AnimatePresence>
            {selectedEstimates.size > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-[rgba(15,23,42,0.06)] flex items-center gap-3"
              >
                <span className="text-sm font-medium text-[#0891B2]">{selectedEstimates.size} selected</span>
                <Button size="sm" variant="outline" className="rounded-md text-red-600 border-red-200 hover:bg-red-50" onClick={() => setSelectedEstimates(new Set())}>
                  <Trash2 size={14} className="mr-1" /> Clear Selection
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Estimates Table / Grid ──────────────────────── */}
        <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden">
          {loading ? (
            <div className="p-4 sm:p-6">
              <ListCardSkeleton rows={isMobile ? 4 : 3} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-[#0891B2]/10 text-[#0891B2]">
                <ClipboardList size={24} />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-[#0F172A]">No estimates found</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm text-[#64748B]">
                Create your first EagleView sandbox estimate to get started.
              </p>
              {canCreateEstimates ? (
                <Button onClick={() => navigate("/roof-estimator/new")} className="mt-5 rounded-md bg-[#0891B2] hover:bg-[#0E7490]">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Estimate
                </Button>
              ) : null}
            </div>
          ) : effectiveViewMode === "table" ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(15,23,42,0.06)] bg-[#F8FAFC]/60">
                    <th className="py-3 px-4 text-left">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                        className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
                      />
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">Estimate</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">Client</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">Address</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">Roof Area</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">Price</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">Status</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filtered.map((est) => (
                      <EstimateRow
                        key={est.id}
                        est={est}
                        isSelected={selectedEstimates.has(est.id)}
                        onSelect={() => toggleSelect(est.id)}
                        onView={() => openEstimateEditor(est.id)}
                        onEdit={() => openEstimateEditor(est.id)}
                        onDelete={() => setDeleteId(est.id)}
                        canUpdate={canUpdateEstimates}
                        canDelete={canDeleteEstimates}
                      />
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          ) : (
            <div className={cn(isMobile ? "p-4" : "p-6")}>
              <div className={cn("grid grid-cols-1 gap-4", !isMobile && "md:grid-cols-2 xl:grid-cols-3")}>
                <AnimatePresence>
                  {filtered.map((est) => (
                    isMobile ? (
                      <MobileEstimateCard
                        key={est.id}
                        est={est}
                        isSelected={selectedEstimates.has(est.id)}
                        onSelect={() => toggleSelect(est.id)}
                        onView={() => openEstimateEditor(est.id)}
                        onEdit={() => openEstimateEditor(est.id)}
                        onDelete={() => setDeleteId(est.id)}
                        canUpdate={canUpdateEstimates}
                        canDelete={canDeleteEstimates}
                      />
                    ) : (
                      <EstimateCard
                        key={est.id}
                        est={est}
                        isSelected={selectedEstimates.has(est.id)}
                        onSelect={() => toggleSelect(est.id)}
                        onView={() => openEstimateEditor(est.id)}
                        onEdit={() => openEstimateEditor(est.id)}
                        onDelete={() => setDeleteId(est.id)}
                        canUpdate={canUpdateEstimates}
                        canDelete={canDeleteEstimates}
                      />
                    )
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Footer  */}
          <div className={cn(
            "border-t border-[rgba(15,23,42,0.06)] bg-[#F8FAFC]/60 text-sm text-[#64748B]",
            isMobile ? "px-4 py-3" : "flex items-center justify-between px-4 py-3"
          )}>
            <span>Showing {filtered.length} of {estimates.length} estimates</span>
            {!isMobile && <span>{selectedEstimates.size > 0 ? `${selectedEstimates.size} selected` : ""}</span>}
          </div>
        </div>

        {/* ── Transaction History ─────────────────────────── */}
        {transactions.length > 0 && (
          <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden mt-6">
            <div className="px-5 py-4 border-b border-[rgba(15,23,42,0.06)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
                  <Wallet size={14} className="text-[#0891B2]" />
                </div>
                <h2 className="text-base font-semibold text-[#0F172A]">Wallet Transactions</h2>
              </div>
              <span className="text-xs text-[#94A3B8]">Last {transactions.length} transactions</span>
            </div>
            {isMobile ? (
              <div className="space-y-3 p-4">
                {transactions.map((tx) => (
                  <div key={tx.id} className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs text-[#64748B]">{fmtDate(tx.createdAt)}</span>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                        tx.type === "credit" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", tx.type === "credit" ? "bg-emerald-500" : "bg-red-500")} />
                        {tx.type}
                      </span>
                    </div>
                    <div className="mb-2 text-sm font-semibold text-[#0F172A]">{tx.description}</div>
                    <div className="flex items-center justify-between text-sm">
                      <span className={cn("font-semibold", tx.type === "credit" ? "text-emerald-600" : "text-red-600")}>
                        {tx.type === "credit" ? "+" : "-"}{fmt(tx.amount)}
                      </span>
                      <span className="text-[#475569]">Balance: <span className="font-semibold text-[#0F172A]">{fmt(tx.balanceAfter)}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgba(15,23,42,0.06)] bg-[#F8FAFC]/60">
                      {["Date", "Type", "Amount", "Description", "Balance After"].map((h) => (
                        <th key={h} className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-[rgba(15,23,42,0.06)] last:border-0 hover:bg-[#F8FAFC]/80 transition-colors">
                        <td className="py-3 px-4 text-sm text-[#64748B] whitespace-nowrap">{fmtDate(tx.createdAt)}</td>
                        <td className="py-3 px-4">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize",
                            tx.type === "credit" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", tx.type === "credit" ? "bg-emerald-500" : "bg-red-500")} />
                            {tx.type}
                          </span>
                        </td>
                        <td className={cn("py-3 px-4 text-sm font-semibold", tx.type === "credit" ? "text-emerald-600" : "text-red-600")}>
                          {tx.type === "credit" ? "+" : "-"}{fmt(tx.amount)}
                        </td>
                        <td className="py-3 px-4 text-sm text-[#475569] max-w-[260px] truncate">{tx.description}</td>
                        <td className="py-3 px-4 text-sm font-semibold text-[#0F172A]">{fmt(tx.balanceAfter)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {isMobile && canCreateEstimates && (
        <Button
          onClick={() => navigate("/roof-estimator/new")}
          size="icon"
          className="fixed bottom-6 right-5 z-40 h-14 w-14 rounded-full bg-[#0891B2] shadow-[0_16px_36px_rgba(8,145,178,0.32)] hover:bg-[#0E7490]"
        >
          <Plus size={22} />
        </Button>
      )}

      {/* ── Delete Dialog ─────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => (!open ? setDeleteId(null) : undefined)}>
        <AlertDialogContent className="rounded-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Estimate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this estimate? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-md bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Add Funds Dialog ─────────────────────────────── */}
      <Dialog open={showAddFunds} onOpenChange={setShowAddFunds}>
        <DialogContent className="rounded-md sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Funds to Wallet</DialogTitle>
            <DialogDescription>
              Current balance: <strong className="text-[#0891B2]">{wallet ? fmt(wallet.balance) : "—"}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Amount (CAD)</Label>
              <Input
                type="number"
                min="1"
                step="0.01"
                placeholder="Enter amount..."
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                className="rounded-md"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[50, 100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setFundAmount(String(amt))}
                  className={cn(
                    "px-4 py-1.5 rounded-md border text-sm font-semibold transition-all",
                    fundAmount === String(amt)
                      ? "bg-[#0891B2] text-white border-[#0891B2]"
                      : "bg-white text-[#475569] border-[rgba(15,23,42,0.1)] hover:border-[#0891B2]/30"
                  )}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-md" onClick={() => setShowAddFunds(false)}>Cancel</Button>
            <Button className="rounded-md bg-[#0891B2] hover:bg-[#0E7490]" onClick={handleAddFunds} disabled={addingFunds || !fundAmount}>
              {addingFunds ? "Adding..." : "Add Funds"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
