// src/pages/Quotes.tsx
import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Eye, Pencil, Trash2, MoreVertical, MoreHorizontal, Filter,
  LayoutGrid, List, ChevronDown, ChevronLeft, ChevronRight, Download, Upload,
  RefreshCw, X, Sparkles, Copy, Send, Mail, Printer, CheckCircle2, XCircle,
  AlertCircle, Clock3, FileText, DollarSign, TrendingUp, TrendingDown,
  ArrowUp, ArrowDown, Activity, Zap, FileDown, FilePlus, AlertTriangle,
  Hash, Calendar, CalendarDays, Target, Users, ArrowRight, FileStack,
  type LucideIcon,
} from "lucide-react";
import {
  Quote, QuoteItem, quoteStatusOptions, dateFilterOptions,
  getInitials, formatCurrency, formatDate, getRelativeTime, getDaysUntilExpiry,
  isExpired, getStatusConfig, getAiInsights, isSignedQuote, isRejectedQuote, canSendForSignature,
} from "./quotes-data";
import {
  getQuotes, createQuote, updateQuote, deleteQuote as deleteQuoteApi,
  sendQuoteEmail, type QuoteEntity,
} from "@/features/quotes";
import { createProjectFromQuote } from "@/features/projects";
import { getClients, type ClientEntity } from "@/features/clients/services/clients-service";
import { getLeads, type LeadEntity } from "@/features/leads/services/leads-service";
import { getEstimates, type RoofEstimate } from "@/features/roof-estimator";

// ============================================
// STAT CARD
// ============================================
const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, delay = 0 }: {
  title: string; value: string | number; subtitle: string; icon: LucideIcon;
  color: "teal" | "gold" | "purple" | "green" | "red" | "blue"; trend?: { value: number; positive: boolean }; delay?: number;
}) => {
  const colorClasses: Record<string, { bg: string; light: string; text: string }> = {
    teal: { bg: "bg-[#0891B2]", light: "bg-[#0891B2]/10", text: "text-[#0891B2]" },
    gold: { bg: "bg-[#D97706]", light: "bg-[#D97706]/10", text: "text-[#D97706]" },
    purple: { bg: "bg-purple-500", light: "bg-purple-500/10", text: "text-purple-500" },
    green: { bg: "bg-green-500", light: "bg-green-500/10", text: "text-green-500" },
    red: { bg: "bg-red-500", light: "bg-red-500/10", text: "text-red-500" },
    blue: { bg: "bg-[#0891B2]", light: "bg-[#0891B2]/10", text: "text-blue-500" },
  };
  const colors = colorClasses[color];
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      whileHover={{ y: -4 }}
      className="relative bg-white rounded-md p-5 border border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg transition-all overflow-hidden group">
      <div className={cn("absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-all", colors.bg)} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-[#94A3B8] mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">{value}</p>
            {trend && (
              <span className={cn("flex items-center text-xs font-semibold", trend.positive ? "text-green-600" : "text-red-600")}>
                {trend.positive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{trend.value}%
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
// QUOTE ROW (Table View)
// ============================================
const QuoteRow = ({ quote, isSelected, onSelect, onView, onEdit, onDelete, onSend, onDuplicate, onConvert }: {
  quote: Quote; isSelected: boolean; onSelect: (c: boolean) => void;
  onView: () => void; onEdit: () => void; onDelete: () => void;
  onSend: () => void; onDuplicate: () => void; onConvert: () => void;
}) => {
  const statusConfig = getStatusConfig(quote.status);
  const StatusIcon = statusConfig.icon;
  const expired = isExpired(quote.validUntil, quote.status);
  const daysLeft = getDaysUntilExpiry(quote.validUntil);

  return (
    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={cn("group hover:bg-[#F8FAFC]/80 transition-colors cursor-pointer border-b border-[rgba(15,23,42,0.06)] last:border-0", isSelected && "bg-[#0891B2]/5")}
      onClick={onView}>
      <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
        <Checkbox checked={isSelected} onCheckedChange={onSelect} className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]" />
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-md flex items-center justify-center", expired ? "bg-red-100" : "bg-[#0891B2]/10")}>
            <FileStack size={18} className={expired ? "text-red-600" : "text-[#0891B2]"} />
          </div>
          <div>
            <p className="font-semibold text-[#0F172A] group-hover:text-[#0891B2] transition-colors">{quote.quoteNumber}</p>
            <p className="text-xs text-[#475569] truncate max-w-[200px]">{quote.title}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold",
            quote.leadId ? "bg-[#D97706]/10 text-[#D97706]" : "bg-[#F1F5F9] text-[#0F172A]")}>
            {getInitials(quote.leadId ? (quote.leadName || quote.clientName) : quote.clientName)}
          </div>
          <div>
            <p className="text-sm font-medium text-[#0F172A]">{quote.leadId ? (quote.leadName || quote.clientName) : quote.clientName}</p>
            <span className={cn("inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5",
              quote.leadId ? "bg-[#D97706]/10 text-[#D97706]" : "bg-[#0891B2]/10 text-[#0891B2]")}>
              {quote.leadId ? "Lead" : "Client"}
            </span>
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className={cn("flex items-center gap-2", expired ? "text-red-600" : "text-[#475569]")}>
          <CalendarDays size={14} className={expired ? "text-red-400" : "text-[#475569]"} />
          <div>
            <p className="text-sm">{formatDate(quote.validUntil)}</p>
            {daysLeft !== null && !isSignedQuote(quote.status) && !isRejectedQuote(quote.status) && (
              <p className={cn("text-xs", expired ? "text-red-500 font-semibold" : "text-[#475569]")}>
                {expired ? `Expired ${Math.abs(daysLeft)} days ago` : daysLeft === 0 ? "Expires today" : `${daysLeft} days left`}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
          expired && !isSignedQuote(quote.status) && !isRejectedQuote(quote.status) ? "bg-amber-100 text-amber-600" : statusConfig.bg,
          expired && !isSignedQuote(quote.status) && !isRejectedQuote(quote.status) ? "" : statusConfig.text)}>
          {expired && !isSignedQuote(quote.status) && !isRejectedQuote(quote.status) ? <AlertTriangle size={12} /> : <StatusIcon size={12} />}
          {expired && !isSignedQuote(quote.status) && !isRejectedQuote(quote.status) ? "Expired" : quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
        </span>
      </td>
      <td className="py-4 px-4 text-right">
        <p className="font-bold text-[#0F172A]">{formatCurrency(quote.total)}</p>
        <p className="text-xs text-[#475569]">{quote.items.length} items</p>
      </td>
      <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canSendForSignature(quote.status) && (
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onSend}
              className="p-2 rounded-md hover:bg-[#0891B2]/10 text-[#0891B2] transition-colors" title="Send for Signature">
              <Send size={16} />
            </motion.button>
          )}
          {isSignedQuote(quote.status) && !quote.linkedProjectId && (
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onConvert}
              className="p-2 rounded-md hover:bg-green-100 text-green-600 transition-colors" title="Convert to Job">
              <ArrowRight size={16} />
            </motion.button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-md hover:bg-white/10 text-[#475569] transition-colors"><MoreVertical size={16} /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-md">
              <DropdownMenuItem onClick={onView} className="rounded-md"><Eye size={14} className="mr-2" />View Quote</DropdownMenuItem>
              {!isSignedQuote(quote.status) && <DropdownMenuItem onClick={onEdit} className="rounded-md"><Pencil size={14} className="mr-2" />Edit Quote</DropdownMenuItem>}
              <DropdownMenuItem onClick={onDuplicate} className="rounded-md"><Copy size={14} className="mr-2" />Duplicate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSend} className="rounded-md"><Send size={14} className="mr-2" />Send for Signature</DropdownMenuItem>
              <DropdownMenuItem className="rounded-md"><FileDown size={14} className="mr-2" />Download PDF</DropdownMenuItem>
              <DropdownMenuItem className="rounded-md"><Printer size={14} className="mr-2" />Print</DropdownMenuItem>
              {isSignedQuote(quote.status) && !quote.linkedProjectId && (
                <><DropdownMenuSeparator /><DropdownMenuItem onClick={onConvert} className="rounded-md text-green-600"><ArrowRight size={14} className="mr-2" />Convert to Job</DropdownMenuItem></>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-md text-red-600 focus:text-red-600 focus:bg-red-50" onClick={onDelete}>
                <Trash2 size={14} className="mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </motion.tr>
  );
};

// ============================================
// QUOTE CARD (Grid View)
// ============================================
const QuoteCard = ({ quote, isSelected, onSelect, onView, onEdit, onDelete, onSend, onConvert }: {
  quote: Quote; isSelected: boolean; onSelect: (c: boolean) => void;
  onView: () => void; onEdit: () => void; onDelete: () => void; onSend: () => void; onConvert: () => void;
}) => {
  const statusConfig = getStatusConfig(quote.status);
  const StatusIcon = statusConfig.icon;
  const expired = isExpired(quote.validUntil, quote.status);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      className={cn("bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden cursor-pointer group",
        "hover:border-[#22D3EE]/30 hover:shadow-lg transition-all",
        isSelected && "border-[#22D3EE] bg-[#0891B2]/5", expired && "border-amber-200")}
      onClick={onView}>
      <div className={cn("h-1", expired ? "bg-amber-500" : statusConfig.dot)} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Checkbox checked={isSelected} onCheckedChange={onSelect} onClick={e => e.stopPropagation()}
              className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]" />
            <div className={cn("w-11 h-11 rounded-md flex items-center justify-center", expired ? "bg-amber-100" : "bg-[#F1F5F9]")}>
              <FileStack size={20} className={expired ? "text-amber-600" : "text-[#0891B2]"} />
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <button className="p-1.5 rounded-md hover:bg-white/10 text-[#475569] opacity-0 group-hover:opacity-100 transition-all">
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-md">
              <DropdownMenuItem onClick={onView} className="rounded-md"><Eye size={14} className="mr-2" />View</DropdownMenuItem>
              {!isSignedQuote(quote.status) && <DropdownMenuItem onClick={onEdit} className="rounded-md"><Pencil size={14} className="mr-2" />Edit</DropdownMenuItem>}
              <DropdownMenuItem onClick={onSend} className="rounded-md"><Send size={14} className="mr-2" />Send for Signature</DropdownMenuItem>
              {isSignedQuote(quote.status) && !quote.linkedProjectId && (
                <DropdownMenuItem onClick={onConvert} className="rounded-md text-green-600"><ArrowRight size={14} className="mr-2" />Convert to Job</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-md text-red-600" onClick={onDelete}><Trash2 size={14} className="mr-2" />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-[#0F172A] group-hover:text-[#0891B2] transition-colors">{quote.quoteNumber}</h3>
            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
              expired && !isSignedQuote(quote.status) && !isRejectedQuote(quote.status) ? "bg-amber-100 text-amber-600" : statusConfig.bg,
              expired && !isSignedQuote(quote.status) && !isRejectedQuote(quote.status) ? "" : statusConfig.text)}>
              {expired && !isSignedQuote(quote.status) && !isRejectedQuote(quote.status) ? <AlertTriangle size={10} /> : <StatusIcon size={10} />}
              {expired && !isSignedQuote(quote.status) && !isRejectedQuote(quote.status) ? "Expired" : quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
            </span>
          </div>
          <p className="text-xs text-[#475569] truncate">{quote.title}</p>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center text-[#475569] text-xs font-semibold">
            {getInitials(quote.clientName)}
          </div>
          <span className="text-sm text-[#475569]">{quote.clientName}</span>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-[rgba(15,23,42,0.06)]">
          <div>
            <p className="text-xs text-[#475569]">Total</p>
            <p className="text-lg font-bold text-[#0F172A]">{formatCurrency(quote.total)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#475569]">Valid Until</p>
            <p className={cn("text-sm font-medium", expired ? "text-amber-600" : "text-[#475569]")}>{formatDate(quote.validUntil)}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4 pt-4 border-t border-[rgba(15,23,42,0.06)]" onClick={e => e.stopPropagation()}>
          {canSendForSignature(quote.status) ? (
            <Button size="sm" onClick={onSend} className="flex-1 bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md h-9">
              <Send size={14} className="mr-1.5" />Send for Signature
            </Button>
          ) : isSignedQuote(quote.status) && !quote.linkedProjectId ? (
            <Button size="sm" onClick={onConvert} className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-md h-9">
              <ArrowRight size={14} className="mr-1.5" />Convert to Job
            </Button>
          ) : (
            <Button size="sm" onClick={onView} className="flex-1 bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md h-9">
              <Eye size={14} className="mr-1.5" />View
            </Button>
          )}
          {!isSignedQuote(quote.status) ? (
            <Button size="sm" variant="outline" onClick={onEdit} className="flex-1 rounded-md h-9 border-[rgba(15,23,42,0.06)]">
              <Pencil size={14} className="mr-1.5" />Edit
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onView} className="flex-1 rounded-md h-9 border-[rgba(15,23,42,0.06)]">
              <Eye size={14} className="mr-1.5" />View
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// QUOTE FORM DIALOG
// ============================================
const QuoteFormDialog = ({ isOpen, onClose, quote, onSubmit }: {
  isOpen: boolean; onClose: () => void; quote: Quote | null;
  onSubmit: (data: Partial<Quote>) => void;
}) => {
  const [formData, setFormData] = useState({
    title: "", clientId: "", clientName: "", clientEmail: "", clientCompany: "",
    leadId: "", leadName: "", projectName: "",
    description: "", notes: "", terms: "50% upfront, 50% on delivery. Net 30 terms.",
    validUntil: "", priority: "medium" as Quote["priority"], status: "draft" as Quote["status"],
    items: [{ id: "new-1", description: "", quantity: 1, rate: 0, amount: 0 }] as QuoteItem[],
    discount: 0, tax: 13,
  });
  const [recipientType, setRecipientType] = useState<"client" | "lead">("client");
  const [clients, setClients] = useState<ClientEntity[]>([]);
  const [leads, setLeads] = useState<LeadEntity[]>([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [roofEstimates, setRoofEstimates] = useState<RoofEstimate[]>([]);
  const [selectedEstimateId, setSelectedEstimateId] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      getClients().then(setClients).catch(() => { });
      getLeads().then(setLeads).catch(() => { });
      getEstimates().then(setRoofEstimates).catch(() => { });
    }
  }, [isOpen]);

  useState(() => {
    if (quote) {
      setFormData({
        title: quote.title, clientId: quote.clientId || "", clientName: quote.clientName,
        clientEmail: quote.clientEmail || "", clientCompany: quote.clientCompany || "",
        leadId: quote.leadId || "", leadName: quote.leadName || "",
        projectName: quote.projectName || "",
        description: quote.description || "", notes: quote.notes || "", terms: quote.terms || "",
        validUntil: quote.validUntil ? new Date(quote.validUntil).toISOString().split("T")[0] : "",
        priority: quote.priority, status: quote.status,
        items: quote.items.length > 0 ? quote.items : [{ id: "new-1", description: "", quantity: 1, rate: 0, amount: 0 }],
        discount: quote.discount, tax: quote.tax,
      });
      if (quote.leadId) setRecipientType("lead");
      if (quote.roofEstimateId) setSelectedEstimateId(quote.roofEstimateId);
    }
  });

  const updateItem = (index: number, field: keyof QuoteItem, value: string | number) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      (newItems[index] as any)[field] = value;
      if (field === "quantity" || field === "rate") {
        newItems[index].amount = Number(newItems[index].quantity) * Number(newItems[index].rate);
      }
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { id: `new-${Date.now()}`, description: "", quantity: 1, rate: 0, amount: 0 }],
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = subtotal * (formData.tax / 100);
  const total = subtotal + taxAmount - formData.discount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validUntilDate = formData.validUntil || new Date(Date.now() + 30 * 86400000).toISOString();
    onSubmit({
      title: formData.title,
      clientId: recipientType === "client" ? (formData.clientId || undefined) : undefined,
      clientName: recipientType === "client" ? formData.clientName : (formData.leadName || ""),
      clientEmail: formData.clientEmail,
      clientCompany: formData.clientCompany,
      leadId: recipientType === "lead" ? (formData.leadId || undefined) : undefined,
      leadName: recipientType === "lead" ? formData.leadName : undefined,
      projectName: formData.projectName,
      description: formData.description, notes: formData.notes, terms: formData.terms,
      validUntil: validUntilDate, priority: formData.priority, status: formData.status,
      items: formData.items, subtotal, tax: taxAmount, discount: formData.discount, total,
      currency: "CAD",
      roofEstimateId: selectedEstimateId || undefined,
    });
    onClose();
  };

  const hasRecipient = recipientType === "client" ? !!formData.clientName : !!formData.leadName;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0 rounded-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              {quote ? "Edit Quote" : "Create New Quote"}
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              {quote ? `Editing ${quote.quoteNumber}` : "Fill in the details to create a professional quote"}
            </DialogDescription>
          </DialogHeader>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
            {/* Client & Project Info */}
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs text-[#475569]">Quote Title *</Label>
                <Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Website Redesign Package" className="mt-1 rounded-md" required />
              </div>
              <div><Label className="text-xs text-[#475569]">Project Name</Label>
                <Input value={formData.projectName} onChange={e => setFormData(p => ({ ...p, projectName: e.target.value }))}
                  placeholder="e.g. Web Revamp 2026" className="mt-1 rounded-md" />
              </div>
            </div>

            {/* Recipient Type Toggle */}
            <div>
              <Label className="text-xs text-[#475569] mb-2 block">Send To *</Label>
              <div className="flex gap-2 mb-3">
                <button type="button"
                  className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                    recipientType === "client"
                      ? "bg-[#0891B2] text-white shadow-sm"
                      : "bg-gray-100 text-[#475569] hover:bg-gray-200")}
                  onClick={() => setRecipientType("client")}>
                  <Users className="inline w-3.5 h-3.5 mr-1.5" />Client
                </button>
                <button type="button"
                  className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                    recipientType === "lead"
                      ? "bg-[#D97706] text-white shadow-sm"
                      : "bg-gray-100 text-[#475569] hover:bg-gray-200")}
                  onClick={() => setRecipientType("lead")}>
                  <Target className="inline w-3.5 h-3.5 mr-1.5" />Lead
                </button>
              </div>
            </div>

            {/* Client / Lead Selector */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-[#475569]">
                  {recipientType === "client" ? "Client Name *" : "Lead Name *"}
                </Label>
                <div className="relative mt-1">
                  <Input
                    value={recipientSearch || (recipientType === "client" ? formData.clientName : formData.leadName)}
                    onChange={e => {
                      setRecipientSearch(e.target.value);
                      if (recipientType === "client") {
                        setFormData(p => ({ ...p, clientName: e.target.value, clientId: "" }));
                      } else {
                        setFormData(p => ({ ...p, leadName: e.target.value, leadId: "" }));
                      }
                    }}
                    placeholder={recipientType === "client" ? "Search clients..." : "Search leads..."}
                    className="rounded-md"
                    required
                  />
                  {recipientSearch && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {recipientType === "client" ? (
                        <>
                          {clients
                            .filter(c => {
                              const name = String(c.clientName || "");
                              return name.toLowerCase().includes(recipientSearch.toLowerCase());
                            })
                            .slice(0, 10)
                            .map(c => {
                              const cId = String(c.id || "");
                              const cName = String(c.clientName || "");
                              const cEmail = String(c.primaryEmail || "");
                              const cCompany = String((c as any).companyName || "");
                              return (
                                <button key={cId} type="button"
                                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-b-0"
                                  onClick={() => {
                                    setFormData(p => ({ ...p, clientId: cId, clientName: cName, clientEmail: cEmail, clientCompany: cCompany }));
                                    setRecipientSearch("");
                                  }}>
                                  <p className="font-medium text-[#0F172A]">{cName}</p>
                                  {cEmail && <p className="text-xs text-[#94A3B8]">{cEmail}</p>}
                                </button>
                              );
                            })}
                          {clients.filter(c => String(c.clientName || "").toLowerCase().includes(recipientSearch.toLowerCase())).length === 0 && (
                            <p className="px-3 py-2 text-sm text-[#94A3B8]">No clients found</p>
                          )}
                        </>
                      ) : (
                        <>
                          {leads
                            .filter(l => {
                              const name = [l.firstName, l.lastName].filter(Boolean).join(" ") || String(l.companyName || "");
                              return name.toLowerCase().includes(recipientSearch.toLowerCase());
                            })
                            .slice(0, 10)
                            .map(l => {
                              const lId = String(l.id);
                              const lName = [l.firstName, l.lastName].filter(Boolean).join(" ") || String(l.companyName || "");
                              const lEmail = String(l.email || "");
                              const lCompany = String(l.companyName || "");
                              return (
                                <button key={lId} type="button"
                                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-b-0"
                                  onClick={() => {
                                    setFormData(p => ({ ...p, leadId: lId, leadName: lName, clientEmail: lEmail, clientCompany: lCompany }));
                                    setRecipientSearch("");
                                  }}>
                                  <p className="font-medium text-[#0F172A]">{lName}</p>
                                  {lEmail && <p className="text-xs text-[#94A3B8]">{lEmail}</p>}
                                  {lCompany && <p className="text-xs text-[#CBD5E1]">{lCompany}</p>}
                                </button>
                              );
                            })}
                          {leads.filter(l => {
                            const name = [l.firstName, l.lastName].filter(Boolean).join(" ") || String(l.companyName || "");
                            return name.toLowerCase().includes(recipientSearch.toLowerCase());
                          }).length === 0 && (
                              <p className="px-3 py-2 text-sm text-[#94A3B8]">No leads found</p>
                            )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div><Label className="text-xs text-[#475569]">Email</Label>
                <Input value={formData.clientEmail} onChange={e => setFormData(p => ({ ...p, clientEmail: e.target.value }))}
                  placeholder="email@example.com" type="email" className="mt-1 rounded-md" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div><Label className="text-xs text-[#475569]">Company</Label>
                <Input value={formData.clientCompany} onChange={e => setFormData(p => ({ ...p, clientCompany: e.target.value }))}
                  placeholder="Company name" className="mt-1 rounded-md" />
              </div>
              <div><Label className="text-xs text-[#475569]">Valid Until</Label>
                <Input type="date" value={formData.validUntil} onChange={e => setFormData(p => ({ ...p, validUntil: e.target.value }))}
                  className="mt-1 rounded-md" />
              </div>
              <div><Label className="text-xs text-[#475569]">Priority</Label>
                <Select value={formData.priority} onValueChange={v => setFormData(p => ({ ...p, priority: v as Quote["priority"] }))}>
                  <SelectTrigger className="mt-1 rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
                </Select>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold text-[#0F172A]">Line Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="rounded-md h-8 text-xs">
                  <Plus size={14} className="mr-1" />Add Item
                </Button>
              </div>
              <div className="border border-[rgba(15,23,42,0.06)] rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-[#F8FAFC] text-[#475569]">
                    <th className="text-left px-3 py-2 text-xs font-medium">Description</th>
                    <th className="text-center px-3 py-2 text-xs font-medium w-20">Qty</th>
                    <th className="text-center px-3 py-2 text-xs font-medium w-24">Rate</th>
                    <th className="text-right px-3 py-2 text-xs font-medium w-24">Amount</th>
                    <th className="w-10"></th>
                  </tr></thead>
                  <tbody>
                    {formData.items.map((item, idx) => (
                      <tr key={item.id} className="border-t border-[rgba(15,23,42,0.06)]">
                        <td className="px-3 py-2"><Input value={item.description} onChange={e => updateItem(idx, "description", e.target.value)}
                          placeholder="Service description" className="h-8 rounded-md text-sm" /></td>
                        <td className="px-3 py-2"><Input type="number" value={item.quantity} onChange={e => updateItem(idx, "quantity", Number(e.target.value))}
                          className="h-8 rounded-md text-sm text-center" min={1} /></td>
                        <td className="px-3 py-2"><Input type="number" value={item.rate} onChange={e => updateItem(idx, "rate", Number(e.target.value))}
                          className="h-8 rounded-md text-sm text-center" min={0} /></td>
                        <td className="px-3 py-2 text-right font-medium text-[#0F172A]">{formatCurrency(item.amount)}</td>
                        <td className="px-2 py-2">
                          {formData.items.length > 1 && (
                            <button type="button" onClick={() => removeItem(idx)} className="p-1 rounded hover:bg-red-50 text-[#94A3B8] hover:text-red-500"><X size={14} /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Totals */}
              <div className="mt-3 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-[#475569]">Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-[#475569]">Tax (%)</span>
                    <Input type="number" value={formData.tax} onChange={e => setFormData(p => ({ ...p, tax: Number(e.target.value) }))}
                      className="w-16 h-7 text-xs text-center rounded-md" min={0} max={100} />
                    <span className="font-medium w-20 text-right">{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-[#475569]">Discount</span>
                    <Input type="number" value={formData.discount} onChange={e => setFormData(p => ({ ...p, discount: Number(e.target.value) }))}
                      className="w-20 h-7 text-xs text-center rounded-md" min={0} />
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-[rgba(15,23,42,0.06)]">
                    <span>Total</span><span className="text-[#0891B2]">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Roof Estimate Attachment */}
            {(() => {
              const selectedRecipientId = recipientType === "client" ? formData.clientId : formData.leadId;
              const filteredEstimates = selectedRecipientId
                ? roofEstimates.filter(e => e.clientId === selectedRecipientId)
                : roofEstimates;
              return filteredEstimates.length > 0 ? (
                <div>
                  <Label className="text-xs text-[#475569] mb-1.5 block">📎 Attach Roof Estimate PDF</Label>
                  <Select value={selectedEstimateId} onValueChange={setSelectedEstimateId}>
                    <SelectTrigger className="rounded-md">
                      <SelectValue placeholder="Select a roof estimate (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No attachment</SelectItem>
                      {filteredEstimates.map(est => (
                        <SelectItem key={est.id} value={est.id}>
                          {est.address} — {est.roofAreaSqft.toFixed(0)} sq ft — ${est.totalEstimate.toFixed(0)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-[#94A3B8] mt-1">This PDF will be attached when the quote is sent via email.</p>
                </div>
              ) : null;
            })()}

            {/* Notes & Terms */}
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs text-[#475569]">Notes</Label>
                <Textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Internal notes..." className="mt-1 rounded-md h-20" />
              </div>
              <div><Label className="text-xs text-[#475569]">Terms & Conditions</Label>
                <Textarea value={formData.terms} onChange={e => setFormData(p => ({ ...p, terms: e.target.value }))}
                  placeholder="Payment terms..." className="mt-1 rounded-md h-20" />
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 pt-0 gap-3 border-t border-[rgba(15,23,42,0.06)]">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-md">Cancel</Button>
            <Button type="submit" disabled={!formData.title || !hasRecipient}
              className="bg-[#0891B2] hover:bg-[#0E7490] text-white rounded-md">
              {quote ? <><CheckCircle2 size={16} className="mr-2" />Update Quote</> : <><Plus size={16} className="mr-2" />Create Quote</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// QUOTE DETAIL DIALOG
// ============================================
const QuoteDetailDialog = ({ isOpen, onClose, quote, onEdit, onDelete, onSend, onConvert }: {
  isOpen: boolean; onClose: () => void; quote: Quote | null;
  onEdit: () => void; onDelete: () => void; onSend: () => void; onConvert: () => void;
}) => {
  if (!quote) return null;
  const statusConfig = getStatusConfig(quote.status);
  const StatusIcon = statusConfig.icon;
  const expired = isExpired(quote.validUntil, quote.status);
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 rounded-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-gradient-to-r from-[#0891B2]/5 to-transparent">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-[#0F172A]">{quote.quoteNumber}</h2>
                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold", statusConfig.bg, statusConfig.text)}>
                  <StatusIcon size={12} />{quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                </span>
                {quote.priority === "high" && <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs font-semibold">High Priority</span>}
              </div>
              <p className="text-sm text-[#475569]">{quote.title}</p>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-[#0891B2]">{formatCurrency(quote.total)}</p>
          </div>
        </div>
        <div className="p-6 space-y-5">
          {/* Client Info */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-md bg-[#F1F5F9] flex items-center justify-center text-sm font-semibold text-[#0F172A]">
              {getInitials(quote.clientName)}
            </div>
            <div><p className="font-medium text-[#0F172A]">{quote.clientName}</p>
              {quote.clientCompany && <p className="text-xs text-[#475569]">{quote.clientCompany}</p>}
              {quote.clientEmail && <p className="text-xs text-[#94A3B8]">{quote.clientEmail}</p>}
            </div>
          </div>
          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-3 bg-[#F8FAFC] rounded-md"><p className="text-xs text-[#94A3B8]">Created</p><p className="text-sm font-medium text-[#0F172A]">{formatDate(quote.createdAt)}</p></div>
            <div className="p-3 bg-[#F8FAFC] rounded-md"><p className="text-xs text-[#94A3B8]">Valid Until</p>
              <p className={cn("text-sm font-medium", expired ? "text-amber-600" : "text-[#0F172A]")}>{formatDate(quote.validUntil)}</p>
            </div>
            {quote.sentAt && <div className="p-3 bg-[#F8FAFC] rounded-md"><p className="text-xs text-[#94A3B8]">Sent</p><p className="text-sm font-medium text-[#0F172A]">{formatDate(quote.sentAt)}</p></div>}
            {quote.viewCount !== undefined && quote.viewCount > 0 && <div className="p-3 bg-[#F8FAFC] rounded-md"><p className="text-xs text-[#94A3B8]">Viewed</p><p className="text-sm font-medium text-[#0F172A]">{quote.viewCount} time{quote.viewCount === 1 ? "" : "s"}</p></div>}
            {quote.lastViewedAt && <div className="p-3 bg-[#F8FAFC] rounded-md"><p className="text-xs text-[#94A3B8]">Last Viewed</p><p className="text-sm font-medium text-[#0F172A]">{formatDate(quote.lastViewedAt)}</p></div>}
            {quote.signedAt && <div className="p-3 bg-[#F8FAFC] rounded-md"><p className="text-xs text-[#94A3B8]">Signed On</p><p className="text-sm font-medium text-[#0F172A]">{formatDate(quote.signedAt)}</p></div>}
          </div>
          {(quote.publicToken || quote.signedBy) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {quote.publicToken && <div className="p-3 bg-[#F8FAFC] rounded-md"><p className="text-xs text-[#94A3B8]">Share Link</p><p className="text-sm font-medium text-[#0F172A] break-all">{`${window.location.origin}/estimate/sign/${quote.publicToken}`}</p></div>}
              {quote.signedBy && <div className="p-3 bg-[#F8FAFC] rounded-md"><p className="text-xs text-[#94A3B8]">Signed By</p><p className="text-sm font-medium text-[#0F172A]">{quote.signedBy}</p></div>}
            </div>
          )}
          {/* Line Items */}
          <div>
            <p className="text-sm font-semibold text-[#0F172A] mb-2">Line Items ({quote.items.length})</p>
            <div className="border border-[rgba(15,23,42,0.06)] rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-[#F8FAFC] text-[#475569]">
                  <th className="text-left px-3 py-2 text-xs font-medium">Description</th>
                  <th className="text-center px-3 py-2 text-xs font-medium">Qty</th>
                  <th className="text-right px-3 py-2 text-xs font-medium">Rate</th>
                  <th className="text-right px-3 py-2 text-xs font-medium">Amount</th>
                </tr></thead>
                <tbody>
                  {quote.items.map(item => (
                    <tr key={item.id} className="border-t border-[rgba(15,23,42,0.06)]">
                      <td className="px-3 py-2 text-[#0F172A]">{item.description}</td>
                      <td className="px-3 py-2 text-center text-[#475569]">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-[#475569]">{formatCurrency(item.rate)}</td>
                      <td className="px-3 py-2 text-right font-medium text-[#0F172A]">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 py-2 bg-[#F8FAFC] space-y-1">
                <div className="flex justify-between text-sm"><span className="text-[#475569]">Subtotal</span><span>{formatCurrency(quote.subtotal)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-[#475569]">Tax</span><span>{formatCurrency(quote.tax)}</span></div>
                {quote.discount > 0 && <div className="flex justify-between text-sm"><span className="text-[#475569]">Discount</span><span className="text-green-600">-{formatCurrency(quote.discount)}</span></div>}
                <div className="flex justify-between text-base font-bold pt-1 border-t border-[rgba(15,23,42,0.06)]"><span>Total</span><span className="text-[#0891B2]">{formatCurrency(quote.total)}</span></div>
              </div>
            </div>
          </div>
          {/* Notes & Terms */}
          {quote.notes && <div className="p-3 bg-[#F8FAFC] rounded-md"><p className="text-xs text-[#94A3B8] mb-1">Notes</p><p className="text-sm text-[#475569]">{quote.notes}</p></div>}
          {quote.terms && <div className="p-3 bg-[#F8FAFC] rounded-md"><p className="text-xs text-[#94A3B8] mb-1">Terms & Conditions</p><p className="text-sm text-[#475569]">{quote.terms}</p></div>}
          {quote.tags && quote.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {quote.tags.map(tag => <Badge key={tag} variant="secondary" className="rounded-md text-xs">{tag}</Badge>)}
            </div>
          )}
        </div>
        <DialogFooter className="p-6 pt-0 gap-2 border-t border-[rgba(15,23,42,0.06)] flex-wrap">
          <Button variant="outline" onClick={onDelete} className="rounded-md text-red-600 border-red-200 hover:bg-red-50">
            <Trash2 size={16} className="mr-2" />Delete
          </Button>
          <div className="flex-1" />
          {canSendForSignature(quote.status) && <Button onClick={onSend} className="rounded-md bg-[#0891B2] hover:bg-[#0891B2]/90 text-white"><Send size={16} className="mr-2" />Send for Signature</Button>}
          {isSignedQuote(quote.status) && !quote.linkedProjectId && <Button onClick={onConvert} className="rounded-md bg-green-600 hover:bg-green-700 text-white"><ArrowRight size={16} className="mr-2" />Convert to Job</Button>}
          {!isSignedQuote(quote.status) && <Button onClick={onEdit} className="rounded-md bg-[#0891B2] hover:bg-[#0891B2]/90 text-white"><Pencil size={16} className="mr-2" />Edit</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// MAIN QUOTES PAGE
// ============================================
// Helper: map backend QuoteEntity to frontend Quote type
function mapApiQuote(q: QuoteEntity): Quote {
  const clientName = q.client?.clientName || "";
  const lead = (q as any).lead;
  const leadName = [lead?.firstName, lead?.lastName].filter(Boolean).join(" ").trim() || lead?.companyName || "";
  const normalizedStatus = q.status.toLowerCase() === "accepted"
    ? "signed"
    : q.status.toLowerCase() === "rejected"
      ? "rejected"
      : q.status.toLowerCase();
  return {
    id: q.id,
    quoteNumber: q.quoteNumber,
    clientId: q.client?.id,
    clientName: clientName || leadName || "Unknown",
    clientEmail: undefined,
    leadId: (q as any).leadId || undefined,
    leadName: leadName || undefined,
    title: q.quoteNumber,
    items: (q.items || []).map((item, idx) => ({
      id: `item-${idx}`,
      description: item.description,
      quantity: item.quantity,
      rate: item.unitPrice,
      amount: item.total,
    })),
    subtotal: q.subtotal,
    tax: q.taxAmount,
    discount: q.discountAmount,
    total: q.total,
    status: normalizedStatus as Quote["status"],
    priority: "medium",
    validUntil: q.validUntil,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
    sentAt: q.sentAt || undefined,
    acceptedAt: q.acceptedAt || undefined,
    publicToken: q.publicToken || undefined,
    viewCount: q.viewCount ?? 0,
    firstViewedAt: q.firstViewedAt || undefined,
    lastViewedAt: q.lastViewedAt || undefined,
    signedAt: q.signedAt || q.acceptedAt || undefined,
    signedBy: q.signedBy || undefined,
    signatureType: q.signatureType || undefined,
    isContract: q.isContract ?? false,
    linkedProjectId: q.linkedProjectId || undefined,
    signedPdfFileId: q.signedPdfFileId || undefined,
    notes: q.notes || undefined,
    terms: q.terms || undefined,
    currency: q.currency || "CAD",
    createdBy: "System",
    roofEstimateId: q.roofEstimateId || undefined,
  };
}

const QuotesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedQuotes, setSelectedQuotes] = useState<Set<string>>(new Set());
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [dismissedInsights, setDismissedInsights] = useState<string[]>([]);
  const itemsPerPage = 10;

  // Fetch quotes from API
  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getQuotes({ limit: 200 });
      setQuotes(result.data.map(mapApiQuote));
    } catch (err) {
      console.error("Failed to load quotes:", err);
      toast({ title: "Error", description: "Failed to load quotes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  // Stats
  const stats = useMemo(() => {
    const totalValue = quotes.reduce((s, q) => s + q.total, 0);
    const acceptedValue = quotes.filter(q => isSignedQuote(q.status)).reduce((s, q) => s + q.total, 0);
    const pendingValue = quotes.filter(q => ["draft", "sent", "viewed"].includes(q.status)).reduce((s, q) => s + q.total, 0);
    const conversionRate = quotes.length > 0 ? Math.round(((quotes.filter(q => isSignedQuote(q.status)).length) / quotes.length) * 100) : 0;
    const avgValue = quotes.length > 0 ? totalValue / quotes.length : 0;
    const expiringSoonCount = quotes.filter(q => {
      const d = getDaysUntilExpiry(q.validUntil);
      return d !== null && d >= 0 && d <= 7 && !isSignedQuote(q.status) && !isRejectedQuote(q.status) && q.status !== "expired";
    }).length;
    return { totalValue, acceptedValue, pendingValue, conversionRate, avgValue, expiringSoonCount, totalCount: quotes.length };
  }, [quotes]);

  // AI Insights
  const aiInsights = useMemo(() => getAiInsights(quotes).filter(i => !dismissedInsights.includes(i.id)), [quotes, dismissedInsights]);

  // Filtered quotes
  const filteredQuotes = useMemo(() => {
    let result = [...quotes];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(qt => qt.quoteNumber.toLowerCase().includes(q) || qt.title.toLowerCase().includes(q) || qt.clientName.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") result = result.filter(qt => qt.status === statusFilter);
    if (dateFilter !== "all") {
      const now = new Date();
      result = result.filter(qt => {
        const created = new Date(qt.createdAt);
        const diff = (now.getTime() - created.getTime()) / 86400000;
        if (dateFilter === "today") return diff < 1;
        if (dateFilter === "week") return diff < 7;
        if (dateFilter === "month") return diff < 30;
        if (dateFilter === "quarter") return diff < 90;
        if (dateFilter === "year") return diff < 365;
        return true;
      });
    }
    return result;
  }, [quotes, searchQuery, statusFilter, dateFilter]);

  const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage);
  const paginatedQuotes = filteredQuotes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Handlers
  const handleCreateQuote = async (data: Partial<Quote>) => {
    try {
      const apiPayload: Record<string, unknown> = {
        clientId: data.clientId || null,
        leadId: data.leadId || null,
        validUntil: data.validUntil || new Date(Date.now() + 30 * 86400000).toISOString(),
        currency: data.currency || "CAD",
        taxRate: 13,
        discountAmount: data.discount || 0,
        notes: data.notes,
        terms: data.terms,
        items: (data.items || []).map((item, idx) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.rate,
          total: item.amount,
          sortOrder: idx,
        })),
        roofEstimateId: data.roofEstimateId || null,
      };
      await createQuote(apiPayload);
      toast({ title: "Quote Created", description: "New quote has been created successfully." });
      fetchQuotes();
    } catch (err) {
      console.error("Failed to create quote:", err);
      toast({ title: "Error", description: "Failed to create quote", variant: "destructive" });
    }
  };

  const handleEditQuote = async (data: Partial<Quote>) => {
    if (!currentQuote) return;
    try {
      const apiPayload: Record<string, unknown> = {
        clientId: data.clientId || null,
        leadId: data.leadId || null,
        validUntil: data.validUntil,
        currency: data.currency || "CAD",
        discountAmount: data.discount || 0,
        notes: data.notes,
        terms: data.terms,
        items: (data.items || []).map((item, idx) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.rate,
          total: item.amount,
          sortOrder: idx,
        })),
        roofEstimateId: data.roofEstimateId || null,
      };
      await updateQuote(currentQuote.id, apiPayload);
      toast({ title: "Quote Updated", description: `${currentQuote.quoteNumber} has been updated.` });
      fetchQuotes();
    } catch (err) {
      console.error("Failed to update quote:", err);
      toast({ title: "Error", description: "Failed to update quote", variant: "destructive" });
    }
  };

  const handleDeleteQuote = async () => {
    if (!deleteQuoteId) return;
    const qt = quotes.find(q => q.id === deleteQuoteId);
    try {
      await deleteQuoteApi(deleteQuoteId);
      setQuotes(prev => prev.filter(q => q.id !== deleteQuoteId));
      setDeleteQuoteId(null);
      setIsDetailOpen(false);
      toast({ title: "Quote Deleted", description: `${qt?.quoteNumber || "Quote"} has been deleted.` });
    } catch (err) {
      console.error("Failed to delete quote:", err);
      toast({ title: "Error", description: "Failed to delete quote", variant: "destructive" });
    }
  };

  const handleSendQuote = async (quoteId: string) => {
    try {
      await sendQuoteEmail(quoteId);
      await fetchQuotes();
      toast({ title: "Signature Request Sent", description: "Estimate link has been emailed to the recipient." });
    } catch (err: any) {
      console.error("Failed to send quote:", err);
      const msg = err?.response?.data?.message || "Failed to send signature request";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleConvertToJob = async (quoteId: string) => {
    try {
      const project = await createProjectFromQuote(quoteId);
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, linkedProjectId: project.id } : q));
      toast({ title: "Converted to Job", description: "Signed estimate has been converted into a job." });
      navigate(`/projects/${project.id}`);
    } catch (err) {
      console.error("Failed to convert estimate into job:", err);
      toast({ title: "Error", description: "Failed to convert estimate into a job", variant: "destructive" });
    }
  };

  const handleDuplicate = async (quoteId: string) => {
    const original = quotes.find(q => q.id === quoteId);
    if (!original) return;
    try {
      const apiPayload: Record<string, unknown> = {
        validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
        currency: original.currency || "CAD",
        taxRate: 13,
        discountAmount: original.discount || 0,
        notes: original.notes,
        terms: original.terms,
        items: (original.items || []).map((item, idx) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.rate,
          total: item.amount,
          sortOrder: idx,
        })),
      };
      await createQuote(apiPayload);
      toast({ title: "Quote Duplicated", description: `New quote created from ${original.quoteNumber}.` });
      fetchQuotes();
    } catch (err) {
      console.error("Failed to duplicate quote:", err);
      toast({ title: "Error", description: "Failed to duplicate quote", variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.allSettled(Array.from(selectedQuotes).map(id => deleteQuoteApi(id)));
      setQuotes(prev => prev.filter(q => !selectedQuotes.has(q.id)));
      toast({ title: "Quotes Deleted", description: `${selectedQuotes.size} quotes deleted.` });
      setSelectedQuotes(new Set());
    } catch (err) {
      console.error("Failed to bulk delete:", err);
      toast({ title: "Error", description: "Failed to delete some quotes", variant: "destructive" });
    }
  };

  const handleBulkSend = async () => {
    const sendableIds = Array.from(selectedQuotes).filter(id => canSendForSignature(quotes.find(q => q.id === id)?.status));
    try {
      await Promise.allSettled(sendableIds.map(id => sendQuoteEmail(id)));
      await fetchQuotes();
      toast({ title: "Signature Requests Sent", description: "Selected estimates have been sent for signature." });
      setSelectedQuotes(new Set());
    } catch (err) {
      console.error("Failed to bulk send:", err);
      toast({ title: "Error", description: "Failed to send some signature requests", variant: "destructive" });
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedQuotes(new Set(paginatedQuotes.map(q => q.id)));
    else setSelectedQuotes(new Set());
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-[1600px] mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
                  <FileStack size={20} className="text-[#0891B2]" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Quotes</h1>
                  <p className="text-sm text-[#94A3B8]">{stats.totalCount} quotes · Pipeline value {formatCurrency(stats.totalValue)}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="rounded-md border-[rgba(15,23,42,0.06)]" onClick={() => fetchQuotes()} disabled={loading}>
                <RefreshCw size={16} className={`mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
              </Button>
              <Button variant="outline" size="sm" className="rounded-md border-[rgba(15,23,42,0.06)]">
                <Download size={16} className="mr-2" />Export
              </Button>
              <Button size="sm" className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
                onClick={() => { setCurrentQuote(null); setIsFormOpen(true); }}>
                <Plus size={16} className="mr-2" />New Quote
              </Button>
            </div>
          </motion.div>

          {/* AI Insights Strip */}
          <AnimatePresence>
            {aiInsights.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-[#0891B2]/10 to-purple-500/10 rounded-full">
                    <Sparkles size={12} className="text-[#0891B2]" />
                    <span className="text-xs font-semibold text-[#0891B2]">AI Insights</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {aiInsights.map(insight => (
                    <motion.div key={insight.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={cn("p-3 rounded-md border flex items-start gap-3 group",
                        insight.type === "warning" && "bg-amber-50 border-amber-200",
                        insight.type === "success" && "bg-green-50 border-green-200",
                        insight.type === "info" && "bg-blue-50 border-blue-200",
                        insight.type === "danger" && "bg-red-50 border-red-200")}>
                      <div className={cn("w-8 h-8 rounded-md flex items-center justify-center shrink-0",
                        insight.type === "warning" && "bg-amber-100", insight.type === "success" && "bg-green-100",
                        insight.type === "info" && "bg-blue-100", insight.type === "danger" && "bg-red-100")}>
                        {insight.type === "warning" && <AlertTriangle size={16} className="text-amber-600" />}
                        {insight.type === "success" && <CheckCircle2 size={16} className="text-green-600" />}
                        {insight.type === "info" && <Zap size={16} className="text-blue-600" />}
                        {insight.type === "danger" && <XCircle size={16} className="text-red-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#0F172A]">{insight.title}</p>
                        <p className="text-xs text-[#475569]">{insight.message}</p>
                      </div>
                      <button onClick={() => setDismissedInsights(p => [...p, insight.id])}
                        className="p-1 rounded hover:bg-white/50 text-[#94A3B8] opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={12} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <StatCard title="Total Pipeline" value={formatCurrency(stats.totalValue)} subtitle={`${stats.totalCount} quotes`} icon={DollarSign} color="teal" trend={{ value: 12, positive: true }} delay={0} />
            <StatCard title="Signed Value" value={formatCurrency(stats.acceptedValue)} subtitle="Contracts ready to convert" icon={CheckCircle2} color="green" trend={{ value: 8, positive: true }} delay={0.05} />
            <StatCard title="Pending" value={formatCurrency(stats.pendingValue)} subtitle="Awaiting response" icon={Clock3} color="gold" delay={0.1} />
            <StatCard title="Win Rate" value={`${stats.conversionRate}%`} subtitle="Conversion rate" icon={Target} color="purple" trend={{ value: 3, positive: true }} delay={0.15} />
            <StatCard title="Avg. Value" value={formatCurrency(stats.avgValue)} subtitle="Per quote" icon={TrendingUp} color="blue" delay={0.2} />
            <StatCard title="Expiring Soon" value={stats.expiringSoonCount} subtitle="Within 7 days" icon={AlertTriangle} color="red" delay={0.25} />
          </div>

          {/* Toolbar */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-4 mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[240px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <Input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Search quotes..." className="pl-10 rounded-md border-[rgba(15,23,42,0.06)] h-10" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]">
                    <X size={14} />
                  </button>
                )}
              </div>
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[160px] rounded-md border-[rgba(15,23,42,0.06)] h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{quoteStatusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}</SelectContent>
              </Select>
              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={v => { setDateFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[140px] rounded-md border-[rgba(15,23,42,0.06)] h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{dateFilterOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}</SelectContent>
              </Select>
              {/* View Toggle */}
              <div className="flex border border-[rgba(15,23,42,0.06)] rounded-md overflow-hidden">
                <button onClick={() => setViewMode("list")} className={cn("p-2.5 transition-colors", viewMode === "list" ? "bg-[#0891B2] text-white" : "text-[#475569] hover:bg-[#F8FAFC]")}><List size={16} /></button>
                <button onClick={() => setViewMode("grid")} className={cn("p-2.5 transition-colors", viewMode === "grid" ? "bg-[#0891B2] text-white" : "text-[#475569] hover:bg-[#F8FAFC]")}><LayoutGrid size={16} /></button>
              </div>
            </div>
            {/* Bulk Actions */}
            <AnimatePresence>
              {selectedQuotes.size > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 mt-3 pt-3 border-t border-[rgba(15,23,42,0.06)]">
                  <span className="text-sm text-[#475569]">{selectedQuotes.size} selected</span>
                  <Button size="sm" variant="outline" className="rounded-md h-8 text-xs" onClick={handleBulkSend}>
                    <Send size={14} className="mr-1" />Send for Signature
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-md h-8 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={handleBulkDelete}>
                    <Trash2 size={14} className="mr-1" />Delete Selected
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-md h-8 text-xs" onClick={() => setSelectedQuotes(new Set())}>
                    Clear Selection
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Content */}
          {loading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-16 text-center">
              <RefreshCw size={32} className="text-[#0891B2] animate-spin mx-auto mb-4" />
              <p className="text-[#94A3B8]">Loading quotes...</p>
            </motion.div>
          ) : filteredQuotes.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-4">
                <FileStack size={32} className="text-[#94A3B8]" />
              </div>
              <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No quotes found</h3>
              <p className="text-[#94A3B8] mb-6">Create your first quote to get started</p>
              <Button className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
                onClick={() => { setCurrentQuote(null); setIsFormOpen(true); }}>
                <Plus size={16} className="mr-2" />Create Quote
              </Button>
            </motion.div>
          ) : viewMode === "list" ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden">
              <div className="responsive-table">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[rgba(15,23,42,0.06)]">
                      <th className="py-3 px-4 text-left">
                        <Checkbox checked={selectedQuotes.size === paginatedQuotes.length && paginatedQuotes.length > 0}
                          onCheckedChange={toggleSelectAll}
                          className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]" />
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider">Quote</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider">Client / Lead</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider">Valid Until</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">Amount</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {paginatedQuotes.map(q => (
                        <QuoteRow key={q.id} quote={q}
                          isSelected={selectedQuotes.has(q.id)}
                          onSelect={c => { const s = new Set(selectedQuotes); c ? s.add(q.id) : s.delete(q.id); setSelectedQuotes(s); }}
                          onView={() => { setCurrentQuote(q); setIsDetailOpen(true); }}
                          onEdit={() => { setCurrentQuote(q); setIsFormOpen(true); }}
                          onDelete={() => setDeleteQuoteId(q.id)}
                          onSend={() => handleSendQuote(q.id)}
                          onDuplicate={() => handleDuplicate(q.id)}
                          onConvert={() => handleConvertToJob(q.id)} />
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-[rgba(15,23,42,0.06)]">
                  <p className="text-sm text-[#94A3B8]">
                    Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredQuotes.length)} of {filteredQuotes.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
                      className="rounded-md h-8"><ChevronLeft size={16} /></Button>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <Button key={i} variant={currentPage === i + 1 ? "default" : "outline"} size="sm"
                        onClick={() => setCurrentPage(i + 1)}
                        className={cn("rounded-md h-8 w-8", currentPage === i + 1 && "bg-[#0891B2] hover:bg-[#0891B2]/90 text-white")}>
                        {i + 1}
                      </Button>
                    ))}
                    <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
                      className="rounded-md h-8"><ChevronRight size={16} /></Button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence>
                {paginatedQuotes.map(q => (
                  <QuoteCard key={q.id} quote={q}
                    isSelected={selectedQuotes.has(q.id)}
                    onSelect={c => { const s = new Set(selectedQuotes); c ? s.add(q.id) : s.delete(q.id); setSelectedQuotes(s); }}
                    onView={() => { setCurrentQuote(q); setIsDetailOpen(true); }}
                    onEdit={() => { setCurrentQuote(q); setIsFormOpen(true); }}
                    onDelete={() => setDeleteQuoteId(q.id)}
                    onSend={() => handleSendQuote(q.id)}
                    onConvert={() => handleConvertToJob(q.id)} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <QuoteFormDialog isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setCurrentQuote(null); }}
        quote={currentQuote} onSubmit={currentQuote ? handleEditQuote : handleCreateQuote} />

      <QuoteDetailDialog isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} quote={currentQuote}
        onEdit={() => { setIsDetailOpen(false); setIsFormOpen(true); }}
        onDelete={() => { setIsDetailOpen(false); if (currentQuote) setDeleteQuoteId(currentQuote.id); }}
        onSend={() => { if (currentQuote) handleSendQuote(currentQuote.id); setIsDetailOpen(false); }}
        onConvert={() => { if (currentQuote) handleConvertToJob(currentQuote.id); }} />

      <AlertDialog open={!!deleteQuoteId} onOpenChange={() => setDeleteQuoteId(null)}>
        <AlertDialogContent className="rounded-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this quote? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuote} className="bg-red-600 hover:bg-red-700 rounded-md">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default QuotesPage;
