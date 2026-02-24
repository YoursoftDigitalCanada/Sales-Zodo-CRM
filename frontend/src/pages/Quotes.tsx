// src/pages/Quotes.tsx
import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/Sidebar";
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
  ArrowUp, ArrowDown, Activity, Zap, Receipt, FileDown, FilePlus, AlertTriangle,
  Hash, Calendar, CalendarDays, Target, Users, ArrowRight, FileStack,
  type LucideIcon,
} from "lucide-react";
import {
  Quote, QuoteItem, quoteStatusOptions, dateFilterOptions,
  getInitials, formatCurrency, formatDate, getRelativeTime, getDaysUntilExpiry,
  isExpired, getStatusConfig, getAiInsights,
} from "./quotes-data";
import {
  getQuotes, createQuote, updateQuote, deleteQuote as deleteQuoteApi,
  updateQuoteStatus, type QuoteEntity,
} from "@/features/quotes";

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
          <div className="w-8 h-8 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] text-xs font-semibold">
            {getInitials(quote.clientName)}
          </div>
          <div>
            <p className="text-sm font-medium text-[#0F172A]">{quote.clientName}</p>
            {quote.clientEmail && <p className="text-xs text-[#475569]">{quote.clientEmail}</p>}
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className={cn("flex items-center gap-2", expired ? "text-red-600" : "text-[#475569]")}>
          <CalendarDays size={14} className={expired ? "text-red-400" : "text-[#475569]"} />
          <div>
            <p className="text-sm">{formatDate(quote.validUntil)}</p>
            {daysLeft !== null && !["accepted", "converted", "declined"].includes(quote.status) && (
              <p className={cn("text-xs", expired ? "text-red-500 font-semibold" : "text-[#475569]")}>
                {expired ? `Expired ${Math.abs(daysLeft)} days ago` : daysLeft === 0 ? "Expires today" : `${daysLeft} days left`}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
          expired && !["accepted", "converted", "declined"].includes(quote.status) ? "bg-amber-100 text-amber-600" : statusConfig.bg,
          expired && !["accepted", "converted", "declined"].includes(quote.status) ? "" : statusConfig.text)}>
          {expired && !["accepted", "converted", "declined"].includes(quote.status) ? <AlertTriangle size={12} /> : <StatusIcon size={12} />}
          {expired && !["accepted", "converted", "declined"].includes(quote.status) ? "Expired" : quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
        </span>
      </td>
      <td className="py-4 px-4 text-right">
        <p className="font-bold text-[#0F172A]">{formatCurrency(quote.total)}</p>
        <p className="text-xs text-[#475569]">{quote.items.length} items</p>
      </td>
      <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {quote.status === "draft" && (
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onSend}
              className="p-2 rounded-md hover:bg-[#0891B2]/10 text-[#0891B2] transition-colors" title="Send Quote">
              <Send size={16} />
            </motion.button>
          )}
          {quote.status === "accepted" && !quote.linkedInvoiceId && (
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onConvert}
              className="p-2 rounded-md hover:bg-green-100 text-green-600 transition-colors" title="Convert to Invoice">
              <Receipt size={16} />
            </motion.button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-md hover:bg-white/10 text-[#475569] transition-colors"><MoreVertical size={16} /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-md">
              <DropdownMenuItem onClick={onView} className="rounded-md"><Eye size={14} className="mr-2" />View Quote</DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="rounded-md"><Pencil size={14} className="mr-2" />Edit Quote</DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate} className="rounded-md"><Copy size={14} className="mr-2" />Duplicate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSend} className="rounded-md"><Send size={14} className="mr-2" />Send to Client</DropdownMenuItem>
              <DropdownMenuItem className="rounded-md"><FileDown size={14} className="mr-2" />Download PDF</DropdownMenuItem>
              <DropdownMenuItem className="rounded-md"><Printer size={14} className="mr-2" />Print</DropdownMenuItem>
              {quote.status === "accepted" && !quote.linkedInvoiceId && (
                <><DropdownMenuSeparator /><DropdownMenuItem onClick={onConvert} className="rounded-md text-green-600"><Receipt size={14} className="mr-2" />Convert to Invoice</DropdownMenuItem></>
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
              <DropdownMenuItem onClick={onEdit} className="rounded-md"><Pencil size={14} className="mr-2" />Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={onSend} className="rounded-md"><Send size={14} className="mr-2" />Send</DropdownMenuItem>
              {quote.status === "accepted" && !quote.linkedInvoiceId && (
                <DropdownMenuItem onClick={onConvert} className="rounded-md text-green-600"><Receipt size={14} className="mr-2" />Convert</DropdownMenuItem>
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
              expired && !["accepted", "converted", "declined"].includes(quote.status) ? "bg-amber-100 text-amber-600" : statusConfig.bg,
              expired && !["accepted", "converted", "declined"].includes(quote.status) ? "" : statusConfig.text)}>
              {expired && !["accepted", "converted", "declined"].includes(quote.status) ? <AlertTriangle size={10} /> : <StatusIcon size={10} />}
              {expired && !["accepted", "converted", "declined"].includes(quote.status) ? "Expired" : quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
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
          {quote.status === "draft" ? (
            <Button size="sm" onClick={onSend} className="flex-1 bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md h-9">
              <Send size={14} className="mr-1.5" />Send
            </Button>
          ) : quote.status === "accepted" && !quote.linkedInvoiceId ? (
            <Button size="sm" onClick={onConvert} className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-md h-9">
              <Receipt size={14} className="mr-1.5" />Convert
            </Button>
          ) : (
            <Button size="sm" onClick={onView} className="flex-1 bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md h-9">
              <Eye size={14} className="mr-1.5" />View
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onEdit} className="flex-1 rounded-md h-9 border-[rgba(15,23,42,0.06)]">
            <Pencil size={14} className="mr-1.5" />Edit
          </Button>
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
    title: "", clientName: "", clientEmail: "", clientCompany: "", projectName: "",
    description: "", notes: "", terms: "50% upfront, 50% on delivery. Net 30 terms.",
    validUntil: "", priority: "medium" as Quote["priority"], status: "draft" as Quote["status"],
    items: [{ id: "new-1", description: "", quantity: 1, rate: 0, amount: 0 }] as QuoteItem[],
    discount: 0, tax: 13,
  });

  useState(() => {
    if (quote) {
      setFormData({
        title: quote.title, clientName: quote.clientName, clientEmail: quote.clientEmail || "",
        clientCompany: quote.clientCompany || "", projectName: quote.projectName || "",
        description: quote.description || "", notes: quote.notes || "", terms: quote.terms || "",
        validUntil: quote.validUntil ? new Date(quote.validUntil).toISOString().split("T")[0] : "",
        priority: quote.priority, status: quote.status,
        items: quote.items.length > 0 ? quote.items : [{ id: "new-1", description: "", quantity: 1, rate: 0, amount: 0 }],
        discount: quote.discount, tax: quote.tax,
      });
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
      title: formData.title, clientName: formData.clientName, clientEmail: formData.clientEmail,
      clientCompany: formData.clientCompany, projectName: formData.projectName,
      description: formData.description, notes: formData.notes, terms: formData.terms,
      validUntil: validUntilDate, priority: formData.priority, status: formData.status,
      items: formData.items, subtotal, tax: taxAmount, discount: formData.discount, total,
      currency: "CAD",
    });
    onClose();
  };

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
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs text-[#475569]">Client Name *</Label>
                <Input value={formData.clientName} onChange={e => setFormData(p => ({ ...p, clientName: e.target.value }))}
                  placeholder="Client name" className="mt-1 rounded-md" required />
              </div>
              <div><Label className="text-xs text-[#475569]">Client Email</Label>
                <Input value={formData.clientEmail} onChange={e => setFormData(p => ({ ...p, clientEmail: e.target.value }))}
                  placeholder="client@example.com" type="email" className="mt-1 rounded-md" />
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
            <Button type="submit" disabled={!formData.title || !formData.clientName}
              className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md">
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
          </div>
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
          {quote.status === "draft" && <Button onClick={onSend} className="rounded-md bg-[#0891B2] hover:bg-[#0891B2]/90 text-white"><Send size={16} className="mr-2" />Send to Client</Button>}
          {quote.status === "accepted" && !quote.linkedInvoiceId && <Button onClick={onConvert} className="rounded-md bg-green-600 hover:bg-green-700 text-white"><Receipt size={16} className="mr-2" />Convert to Invoice</Button>}
          <Button onClick={onEdit} className="rounded-md bg-[#0891B2] hover:bg-[#0891B2]/90 text-white"><Pencil size={16} className="mr-2" />Edit</Button>
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
  return {
    id: q.id,
    quoteNumber: q.quoteNumber,
    clientId: q.client?.id,
    clientName: q.client?.clientName || "Unknown Client",
    clientEmail: undefined,
    title: q.quoteNumber, // use quoteNumber as title if no separate title field
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
    status: q.status.toLowerCase() as Quote["status"],
    priority: "medium",
    validUntil: q.validUntil,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
    sentAt: q.sentAt || undefined,
    acceptedAt: q.acceptedAt || undefined,
    notes: q.notes || undefined,
    terms: q.terms || undefined,
    currency: q.currency || "CAD",
    createdBy: "System",
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
    const acceptedValue = quotes.filter(q => q.status === "accepted" || q.status === "converted").reduce((s, q) => s + q.total, 0);
    const pendingValue = quotes.filter(q => ["draft", "sent", "viewed"].includes(q.status)).reduce((s, q) => s + q.total, 0);
    const conversionRate = quotes.length > 0 ? Math.round(((quotes.filter(q => q.status === "accepted" || q.status === "converted").length) / quotes.length) * 100) : 0;
    const avgValue = quotes.length > 0 ? totalValue / quotes.length : 0;
    const expiringSoonCount = quotes.filter(q => { const d = getDaysUntilExpiry(q.validUntil); return d !== null && d >= 0 && d <= 7 && !["accepted", "declined", "converted", "expired"].includes(q.status); }).length;
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
      await updateQuoteStatus(quoteId, "SENT");
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: "sent" as const, sentAt: new Date().toISOString() } : q));
      toast({ title: "Quote Sent", description: "Quote has been sent to the client." });
    } catch (err) {
      console.error("Failed to send quote:", err);
      toast({ title: "Error", description: "Failed to send quote", variant: "destructive" });
    }
  };

  const handleConvertToInvoice = async (quoteId: string) => {
    try {
      await updateQuoteStatus(quoteId, "CONVERTED");
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: "converted" as const, linkedInvoiceId: `inv-${Date.now()}` } : q));
      toast({ title: "Converted to Invoice", description: "Quote has been converted to an invoice." });
      navigate("/invoice");
    } catch (err) {
      console.error("Failed to convert quote:", err);
      toast({ title: "Error", description: "Failed to convert quote", variant: "destructive" });
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
    const draftIds = Array.from(selectedQuotes).filter(id => quotes.find(q => q.id === id)?.status === "draft");
    try {
      await Promise.allSettled(draftIds.map(id => updateQuoteStatus(id, "SENT")));
      setQuotes(prev => prev.map(q => selectedQuotes.has(q.id) && q.status === "draft" ? { ...q, status: "sent" as const, sentAt: new Date().toISOString() } : q));
      toast({ title: "Quotes Sent", description: "Selected draft quotes have been sent." });
      setSelectedQuotes(new Set());
    } catch (err) {
      console.error("Failed to bulk send:", err);
      toast({ title: "Error", description: "Failed to send some quotes", variant: "destructive" });
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedQuotes(new Set(paginatedQuotes.map(q => q.id)));
    else setSelectedQuotes(new Set());
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar />
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
            <StatCard title="Won Value" value={formatCurrency(stats.acceptedValue)} subtitle="Accepted & converted" icon={CheckCircle2} color="green" trend={{ value: 8, positive: true }} delay={0.05} />
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
                    <Send size={14} className="mr-1" />Send Selected
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[rgba(15,23,42,0.06)]">
                      <th className="py-3 px-4 text-left">
                        <Checkbox checked={selectedQuotes.size === paginatedQuotes.length && paginatedQuotes.length > 0}
                          onCheckedChange={toggleSelectAll}
                          className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]" />
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider">Quote</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider">Client</th>
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
                          onConvert={() => handleConvertToInvoice(q.id)} />
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
                    onConvert={() => handleConvertToInvoice(q.id)} />
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
        onConvert={() => { if (currentQuote) handleConvertToInvoice(currentQuote.id); }} />

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
