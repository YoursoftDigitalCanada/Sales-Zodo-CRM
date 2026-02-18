// src/pages/Leads/LeadSources.tsx

import React, { useState, useEffect } from "react";
import axios from "@/lib/axios";
import { Sidebar } from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  Search,
  Plus,
  Filter,
  Download,
  MoreVertical,
  LayoutGrid,
  List,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  Check,
  X,
  Globe,
  Users,
  Phone,
  Mail,
  Building2,
  MessageSquare,
  Target,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  PieChart,
  BarChart3,
  DollarSign,
  Percent,
  Link as LinkIcon,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  Megaphone,
  Newspaper,
  Radio,
  Tv,
  QrCode,
  Handshake,
  Calendar,
  Sparkles,
  Settings,
  ExternalLink,
  Copy,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

// ============================================
// TYPES
// ============================================

interface LeadSource {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  type: "digital" | "traditional" | "referral" | "direct";
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  totalRevenue: number;
  avgDealSize: number;
  cost: number;
  roi: number;
  trend: number;
  isActive: boolean;
  lastLeadDate: string;
  description?: string;
  trackingUrl?: string;
}

interface SourceStats {
  totalSources: number;
  activeSources: number;
  totalLeads: number;
  avgConversionRate: number;
  totalRevenue: number;
  bestPerformer: string;
}

// ============================================
// SOURCE ICON / COLOR MAPS
// ============================================

const sourceIcons: { [key: string]: LucideIcon } = {
  globe: Globe,
  linkedin: Linkedin,
  twitter: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  phone: Phone,
  mail: Mail,
  users: Users,
  building: Building2,
  megaphone: Megaphone,
  newspaper: Newspaper,
  radio: Radio,
  tv: Tv,
  qrcode: QrCode,
  handshake: Handshake,
  target: Target,
  message: MessageSquare,
};

const sourceColors = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
];

/** Guess an icon based on source name */
function guessIconForName(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes("linkedin")) return Linkedin;
  if (n.includes("twitter") || n.includes("x.com")) return Twitter;
  if (n.includes("facebook") || n.includes("meta")) return Facebook;
  if (n.includes("email") || n.includes("mail") || n.includes("newsletter")) return Mail;
  if (n.includes("phone") || n.includes("call") || n.includes("cold call")) return Phone;
  if (n.includes("event") || n.includes("trade") || n.includes("conference")) return Building2;
  if (n.includes("ads") || n.includes("google") || n.includes("ppc")) return Target;
  if (n.includes("referral") || n.includes("partner")) return Handshake;
  if (n.includes("content") || n.includes("blog") || n.includes("seo")) return Globe;
  if (n.includes("social")) return MessageSquare;
  return Globe;
}

/** Map API response to frontend LeadSource shape */
function mapApiSourceToLocal(apiSource: any, index: number, statsMap: Map<string, any>): LeadSource {
  const stats = statsMap.get(apiSource.id);
  const leadCount = stats?.leadCount ?? apiSource.leadCount ?? apiSource._count?.leads ?? 0;
  const convertedCount = stats?.convertedCount ?? 0;
  const totalValue = stats?.totalValue ?? 0;
  const conversionRate = stats?.conversionRate ?? (leadCount > 0 ? (convertedCount / leadCount) * 100 : 0);
  const avgDealSize = convertedCount > 0 ? totalValue / convertedCount : 0;

  return {
    id: apiSource.id,
    name: apiSource.name,
    icon: guessIconForName(apiSource.name),
    color: sourceColors[index % sourceColors.length],
    type: "digital" as const,
    totalLeads: leadCount,
    convertedLeads: convertedCount,
    conversionRate,
    totalRevenue: totalValue,
    avgDealSize,
    cost: 0,
    roi: 0,
    trend: 0,
    isActive: apiSource.isActive ?? true,
    lastLeadDate: apiSource.updatedAt ? new Date(apiSource.updatedAt).toISOString().split("T")[0] : "",
    description: apiSource.description || undefined,
  };
}


// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat("en-CA").format(num);
};

const formatPercent = (num: number): string => {
  return `${num.toFixed(1)}%`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getTypeColor = (type: string) => {
  switch (type) {
    case "digital":
      return { bg: "#EFF6FF", text: "#3B82F6" };
    case "traditional":
      return { bg: "#FEF3C7", text: "#D97706" };
    case "referral":
      return { bg: "#ECFDF5", text: "#059669" };
    case "direct":
      return { bg: "#F5F3FF", text: "#7C3AED" };
    default:
      return { bg: "#F1F5F9", text: "#64748B" };
  }
};

// ============================================
// STAT CARD COMPONENT
// ============================================

const StatCard = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  prefix = "",
  suffix = "",
  delay = 0,
}: {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  color: string;
  prefix?: string;
  suffix?: string;
  delay?: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="relative bg-white rounded-2xl p-5 border border-slate-200 hover:border-[#17C3B2]/30 hover:shadow-xl hover:shadow-[#17C3B2]/5 transition-all overflow-hidden group"
    >
      <div
        className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-all"
        style={{ backgroundColor: color }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-[#0D2342]">
            {prefix}
            {typeof value === "number" ? formatNumber(value) : value}
            {suffix}
          </p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {change >= 0 ? (
                <ArrowUpRight size={14} className="text-green-500" />
              ) : (
                <ArrowDownRight size={14} className="text-red-500" />
              )}
              <span
                className={cn(
                  "text-xs font-semibold",
                  change >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {Math.abs(change)}%
              </span>
              <span className="text-xs text-slate-400">vs last month</span>
            </div>
          )}
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon size={22} style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// SOURCE CARD COMPONENT (GRID VIEW)
// ============================================

const SourceCard = ({
  source,
  onView,
  onEdit,
  onDelete,
  onToggle,
  delay = 0,
}: {
  source: LeadSource;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  delay?: number;
}) => {
  const SourceIcon = source.icon;
  const typeColor = getTypeColor(source.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className={cn(
        "relative bg-white rounded-2xl border overflow-hidden transition-all group cursor-pointer",
        source.isActive
          ? "border-slate-200 hover:border-[#17C3B2]/30 hover:shadow-xl hover:shadow-[#17C3B2]/5"
          : "border-slate-200 opacity-60"
      )}
      onClick={onView}
    >
      {/* Status Badge */}
      <div className="absolute top-4 right-4 z-10">
        <span
          className={cn(
            "px-2 py-1 rounded-lg text-xs font-medium",
            source.isActive
              ? "bg-green-100 text-green-600"
              : "bg-slate-100 text-slate-500"
          )}
        >
          {source.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Card Content */}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${source.color}15` }}
          >
            <SourceIcon size={28} style={{ color: source.color }} />
          </div>
          <div>
            <h3 className="font-semibold text-[#0D2342] group-hover:text-[#17C3B2] transition-colors">
              {source.name}
            </h3>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-md capitalize"
              style={{ backgroundColor: typeColor.bg, color: typeColor.text }}
            >
              {source.type}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">Total Leads</p>
            <p className="text-lg font-bold text-[#0D2342]">{source.totalLeads}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">Conversion</p>
            <p className="text-lg font-bold text-[#17C3B2]">{formatPercent(source.conversionRate)}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">Revenue</p>
            <p className="text-lg font-bold text-[#0D2342]">{formatCurrency(source.totalRevenue)}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">ROI</p>
            <p className="text-lg font-bold text-green-500">
              {source.roi === Infinity ? "∞" : `${formatNumber(source.roi)}%`}
            </p>
          </div>
        </div>

        {/* Trend */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {source.trend >= 0 ? (
              <TrendingUp size={16} className="text-green-500" />
            ) : (
              <TrendingDown size={16} className="text-red-500" />
            )}
            <span
              className={cn(
                "text-sm font-semibold",
                source.trend >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {source.trend >= 0 ? "+" : ""}
              {source.trend}%
            </span>
            <span className="text-xs text-slate-400">this month</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem onClick={onView} className="rounded-lg">
                <Eye size={14} className="mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="rounded-lg">
                <Pencil size={14} className="mr-2" /> Edit Source
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggle} className="rounded-lg">
                {source.isActive ? (
                  <>
                    <X size={14} className="mr-2" /> Deactivate
                  </>
                ) : (
                  <>
                    <Check size={14} className="mr-2" /> Activate
                  </>
                )}
              </DropdownMenuItem>
              {source.trackingUrl && (
                <DropdownMenuItem className="rounded-lg">
                  <Copy size={14} className="mr-2" /> Copy Tracking URL
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="rounded-lg text-red-600">
                <Trash2 size={14} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// SOURCE ROW COMPONENT (TABLE VIEW)
// ============================================

const SourceRow = ({
  source,
  onView,
  onEdit,
  onDelete,
  onToggle,
}: {
  source: LeadSource;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) => {
  const SourceIcon = source.icon;
  const typeColor = getTypeColor(source.type);

  return (
    <TableRow className={cn("group hover:bg-slate-50", !source.isActive && "opacity-60")}>
      <TableCell>
        <div className="flex items-center gap-3 cursor-pointer" onClick={onView}>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${source.color}15` }}
          >
            <SourceIcon size={20} style={{ color: source.color }} />
          </div>
          <div>
            <p className="font-medium text-[#0D2342] group-hover:text-[#17C3B2] transition-colors">
              {source.name}
            </p>
            <p className="text-xs text-slate-500">{source.description}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span
          className="text-xs font-medium px-2 py-1 rounded-lg capitalize"
          style={{ backgroundColor: typeColor.bg, color: typeColor.text }}
        >
          {source.type}
        </span>
      </TableCell>
      <TableCell>
        <span className="font-semibold text-[#0D2342]">{source.totalLeads}</span>
        <span className="text-slate-400 text-sm ml-1">
          ({source.convertedLeads} converted)
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="w-16">
            <Progress
              value={source.conversionRate}
              className="h-2"
              style={
                {
                  "--progress-background": source.color,
                } as React.CSSProperties
              }
            />
          </div>
          <span className="text-sm font-medium text-[#0D2342]">
            {formatPercent(source.conversionRate)}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <span className="font-semibold text-[#0D2342]">{formatCurrency(source.totalRevenue)}</span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-slate-600">{formatCurrency(source.avgDealSize)}</span>
      </TableCell>
      <TableCell>
        <span
          className={cn(
            "font-semibold",
            source.roi === Infinity
              ? "text-green-500"
              : source.roi > 1000
                ? "text-green-500"
                : source.roi > 500
                  ? "text-yellow-500"
                  : "text-red-500"
          )}
        >
          {source.roi === Infinity ? "∞" : `${formatNumber(source.roi)}%`}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {source.trend >= 0 ? (
            <ArrowUpRight size={14} className="text-green-500" />
          ) : (
            <ArrowDownRight size={14} className="text-red-500" />
          )}
          <span
            className={cn(
              "text-sm font-medium",
              source.trend >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {source.trend >= 0 ? "+" : ""}
            {source.trend}%
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Switch
          checked={source.isActive}
          onCheckedChange={onToggle}
          className="data-[state=checked]:bg-[#17C3B2]"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onView}>
                  <Eye size={16} className="text-slate-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View Details</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onEdit}>
                  <Pencil size={16} className="text-slate-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                <MoreVertical size={16} className="text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem onClick={onView} className="rounded-lg">
                <BarChart3 size={14} className="mr-2" /> View Analytics
              </DropdownMenuItem>
              {source.trackingUrl && (
                <>
                  <DropdownMenuItem className="rounded-lg">
                    <ExternalLink size={14} className="mr-2" /> Open Tracking URL
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg">
                    <Copy size={14} className="mr-2" /> Copy URL
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="rounded-lg text-red-600">
                <Trash2 size={14} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
};

// ============================================
// ADD/EDIT SOURCE DIALOG
// ============================================

const SourceFormDialog = ({
  isOpen,
  onClose,
  source,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  source: LeadSource | null;
  onSubmit: (data: Partial<LeadSource>) => void;
}) => {
  const [formData, setFormData] = useState({
    name: "",
    type: "digital" as LeadSource["type"],
    icon: "globe",
    color: "#3B82F6",
    description: "",
    trackingUrl: "",
    cost: "",
    isActive: true,
  });

  React.useEffect(() => {
    if (source) {
      setFormData({
        name: source.name,
        type: source.type,
        icon: Object.keys(sourceIcons).find(
          (key) => sourceIcons[key] === source.icon
        ) || "globe",
        color: source.color,
        description: source.description || "",
        trackingUrl: source.trackingUrl || "",
        cost: source.cost.toString(),
        isActive: source.isActive,
      });
    } else {
      setFormData({
        name: "",
        type: "digital",
        icon: "globe",
        color: "#3B82F6",
        description: "",
        trackingUrl: "",
        cost: "",
        isActive: true,
      });
    }
  }, [source, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      icon: sourceIcons[formData.icon],
      cost: parseFloat(formData.cost) || 0,
    });
    onClose();
  };

  const SelectedIcon = sourceIcons[formData.icon];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-[#17C3B2]/10 to-transparent">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0D2342]">
              {source ? "Edit Lead Source" : "Add Lead Source"}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {source ? "Update source configuration" : "Configure a new lead source"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Source Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">
              Source Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., LinkedIn, Google Ads"
              required
              className="h-11 rounded-xl"
            />
          </div>

          {/* Type & Icon */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(val) => setFormData({ ...formData, type: val as LeadSource["type"] })}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="digital" className="rounded-lg">Digital</SelectItem>
                  <SelectItem value="traditional" className="rounded-lg">Traditional</SelectItem>
                  <SelectItem value="referral" className="rounded-lg">Referral</SelectItem>
                  <SelectItem value="direct" className="rounded-lg">Direct</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Icon</Label>
              <Select
                value={formData.icon}
                onValueChange={(val) => setFormData({ ...formData, icon: val })}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <SelectedIcon size={16} />
                      <span className="capitalize">{formData.icon}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-[200px]">
                  {Object.entries(sourceIcons).map(([key, Icon]) => (
                    <SelectItem key={key} value={key} className="rounded-lg">
                      <div className="flex items-center gap-2">
                        <Icon size={16} />
                        <span className="capitalize">{key}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">Color</Label>
            <div className="flex items-center gap-2">
              {sourceColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={cn(
                    "w-8 h-8 rounded-lg transition-all",
                    formData.color === color && "ring-2 ring-offset-2 ring-[#17C3B2]"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">Description</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this source"
              className="h-11 rounded-xl"
            />
          </div>

          {/* Tracking URL */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">Tracking URL</Label>
            <div className="relative">
              <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={formData.trackingUrl}
                onChange={(e) => setFormData({ ...formData, trackingUrl: e.target.value })}
                placeholder="https://..."
                className="h-11 pl-10 rounded-xl"
              />
            </div>
          </div>

          {/* Monthly Cost */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">Monthly Cost ($)</Label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="0"
                className="h-11 pl-10 rounded-xl"
              />
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="font-medium text-[#0D2342]">Active Source</p>
              <p className="text-sm text-slate-500">Enable lead tracking for this source</p>
            </div>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              className="data-[state=checked]:bg-[#17C3B2]"
            />
          </div>

          <DialogFooter className="pt-4 gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.name}
              className="bg-[#17C3B2] hover:bg-[#17C3B2]/90 text-white rounded-xl"
            >
              {source ? (
                <>
                  <Check size={16} className="mr-2" /> Update Source
                </>
              ) : (
                <>
                  <Plus size={16} className="mr-2" /> Add Source
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// MAIN LEAD SOURCES PAGE
// ============================================

const LeadSources = () => {
  const { toast } = useToast();

  // State
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [currentSource, setCurrentSource] = useState<LeadSource | null>(null);
  const [sourceToDelete, setSourceToDelete] = useState<LeadSource | null>(null);

  // Fetch sources from API
  const fetchSources = async () => {
    try {
      setLoading(true);
      // Fetch both lists and statistics in parallel
      const [listRes, statsRes] = await Promise.all([
        axios.get("/lead-sources", { params: { limit: 100 } }),
        axios.get("/lead-sources/statistics").catch(() => ({ data: { data: [] } })),
      ]);

      const apiSources = listRes.data?.data || listRes.data || [];
      const statsArr = statsRes.data?.data || statsRes.data || [];

      // Build stats map by id
      const statsMap = new Map<string, any>();
      if (Array.isArray(statsArr)) {
        statsArr.forEach((s: any) => statsMap.set(s.id, s));
      }

      const mapped = Array.isArray(apiSources)
        ? apiSources.map((s: any, i: number) => mapApiSourceToLocal(s, i, statsMap))
        : [];

      setSources(mapped);
    } catch (error) {
      console.error("Failed to fetch lead sources:", error);
      toast({ title: "Error", description: "Failed to load lead sources.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  // Filtered sources
  const filteredSources = sources.filter((source) => {
    const matchesSearch =
      source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || source.type === selectedType;
    const matchesActive = !showActiveOnly || source.isActive;
    return matchesSearch && matchesType && matchesActive;
  });

  // Calculate stats
  const stats: SourceStats = {
    totalSources: sources.length,
    activeSources: sources.filter((s) => s.isActive).length,
    totalLeads: sources.reduce((acc, s) => acc + s.totalLeads, 0),
    avgConversionRate:
      sources.length > 0
        ? sources.reduce((acc, s) => acc + s.conversionRate, 0) / sources.length
        : 0,
    totalRevenue: sources.reduce((acc, s) => acc + s.totalRevenue, 0),
    bestPerformer: sources.length > 0
      ? sources.reduce((a, b) => a.conversionRate > b.conversionRate ? a : b).name
      : "N/A",
  };

  // Handlers
  const handleAddSource = async (data: Partial<LeadSource>) => {
    try {
      await axios.post("/lead-sources", {
        name: data.name,
        description: data.description || undefined,
        isActive: data.isActive ?? true,
      });
      toast({ title: "Source Added", description: `${data.name} has been added to your lead sources.` });
      fetchSources(); // Reload
    } catch (error: any) {
      console.error("Failed to add source:", error);
      const msg = error.response?.data?.message || "Failed to add lead source.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleEditSource = async (data: Partial<LeadSource>) => {
    if (!currentSource) return;
    try {
      await axios.put(`/lead-sources/${currentSource.id}`, {
        name: data.name,
        description: data.description || undefined,
        isActive: data.isActive,
      });
      toast({ title: "Source Updated", description: "The lead source has been updated successfully." });
      fetchSources(); // Reload
    } catch (error: any) {
      console.error("Failed to update source:", error);
      const msg = error.response?.data?.message || "Failed to update lead source.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleDeleteSource = async () => {
    if (!sourceToDelete) return;
    try {
      await axios.delete(`/lead-sources/${sourceToDelete.id}`);
      setIsDeleteAlertOpen(false);
      setSourceToDelete(null);
      toast({ title: "Source Deleted", description: "The lead source has been removed.", variant: "destructive" });
      fetchSources(); // Reload
    } catch (error: any) {
      console.error("Failed to delete source:", error);
      const msg = error.response?.data?.message || "Failed to delete lead source. It may have associated leads.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleToggleSource = async (source: LeadSource) => {
    try {
      const newState = !source.isActive;
      await axios.put(`/lead-sources/${source.id}`, { isActive: newState });
      // Optimistic update
      setSources((prev) =>
        prev.map((s) => s.id === source.id ? { ...s, isActive: newState } : s)
      );
      toast({
        title: newState ? "Source Activated" : "Source Deactivated",
        description: `${source.name} has been ${newState ? "activated" : "deactivated"}.`,
      });
    } catch (error) {
      console.error("Failed to toggle source:", error);
      toast({ title: "Error", description: "Failed to update source status.", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />

      <main className="flex-1 ml-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-200">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                  <Link to="/dashboard" className="hover:text-[#17C3B2]">
                    Dashboard
                  </Link>
                  <ChevronRight size={14} />
                  <Link to="/leads" className="hover:text-[#17C3B2]">
                    Leads
                  </Link>
                  <ChevronRight size={14} />
                  <span className="text-[#0D2342] font-medium">Sources</span>
                </div>
                <h1 className="text-2xl font-bold text-[#0D2342]">Lead Sources</h1>
              </div>

              <div className="flex items-center gap-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="rounded-xl">
                        <Download size={18} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export Data</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button
                  onClick={() => {
                    setCurrentSource(null);
                    setIsFormOpen(true);
                  }}
                  className="bg-[#17C3B2] hover:bg-[#17C3B2]/90 text-white rounded-xl gap-2"
                >
                  <Plus size={18} />
                  Add Source
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-5 gap-6 mb-8">
            <StatCard
              title="Total Sources"
              value={stats.totalSources}
              icon={Target}
              color="#17C3B2"
            />
            <StatCard
              title="Active Sources"
              value={stats.activeSources}
              icon={Sparkles}
              color="#10B981"
              delay={0.1}
            />
            <StatCard
              title="Total Leads"
              value={stats.totalLeads}
              change={15.3}
              icon={Users}
              color="#3B82F6"
              delay={0.2}
            />
            <StatCard
              title="Avg. Conversion"
              value={formatPercent(stats.avgConversionRate)}
              change={5.2}
              icon={Percent}
              color="#F59E0B"
              delay={0.3}
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(stats.totalRevenue)}
              change={22.8}
              icon={DollarSign}
              color="#C9A14A"
              delay={0.4}
            />
          </div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
          >
            {/* Filters */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search sources..."
                      className="pl-9 h-10 w-64 rounded-xl border-slate-200"
                    />
                  </div>

                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-[140px] h-10 rounded-xl border-slate-200">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all" className="rounded-lg">All Types</SelectItem>
                      <SelectItem value="digital" className="rounded-lg">Digital</SelectItem>
                      <SelectItem value="traditional" className="rounded-lg">Traditional</SelectItem>
                      <SelectItem value="referral" className="rounded-lg">Referral</SelectItem>
                      <SelectItem value="direct" className="rounded-lg">Direct</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
                    <Switch
                      id="active-only"
                      checked={showActiveOnly}
                      onCheckedChange={setShowActiveOnly}
                      className="data-[state=checked]:bg-[#17C3B2]"
                    />
                    <Label htmlFor="active-only" className="text-sm text-slate-600 cursor-pointer">
                      Active only
                    </Label>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    className="rounded-lg h-9 w-9"
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid size={16} />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    className="rounded-lg h-9 w-9"
                    onClick={() => setViewMode("list")}
                  >
                    <List size={16} />
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
              {viewMode === "grid" ? (
                <div className="p-6 grid grid-cols-3 gap-6">
                  {filteredSources.length === 0 ? (
                    <div className="col-span-3 text-center py-12">
                      <Target size={48} className="text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">No sources found</p>
                      <p className="text-slate-400 text-sm">Try adjusting your filters</p>
                    </div>
                  ) : (
                    filteredSources.map((source, index) => (
                      <SourceCard
                        key={source.id}
                        source={source}
                        onView={() => {
                          setCurrentSource(source);
                          toast({
                            title: "Source Details",
                            description: `Viewing ${source.name} analytics`,
                          });
                        }}
                        onEdit={() => {
                          setCurrentSource(source);
                          setIsFormOpen(true);
                        }}
                        onDelete={() => {
                          setSourceToDelete(source);
                          setIsDeleteAlertOpen(true);
                        }}
                        onToggle={() => handleToggleSource(source)}
                        delay={index * 0.05}
                      />
                    ))
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Source</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Leads</TableHead>
                        <TableHead>Conversion</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Avg. Deal</TableHead>
                        <TableHead>ROI</TableHead>
                        <TableHead>Trend</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-28">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSources.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-12">
                            <div className="flex flex-col items-center">
                              <Target size={48} className="text-slate-300 mb-3" />
                              <p className="text-slate-500 font-medium">No sources found</p>
                              <p className="text-slate-400 text-sm">Try adjusting your filters</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSources.map((source) => (
                          <SourceRow
                            key={source.id}
                            source={source}
                            onView={() => {
                              setCurrentSource(source);
                              toast({
                                title: "Source Details",
                                description: `Viewing ${source.name} analytics`,
                              });
                            }}
                            onEdit={() => {
                              setCurrentSource(source);
                              setIsFormOpen(true);
                            }}
                            onDelete={() => {
                              setSourceToDelete(source);
                              setIsDeleteAlertOpen(true);
                            }}
                            onToggle={() => handleToggleSource(source)}
                          />
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Performance Chart Placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 bg-white rounded-2xl border border-slate-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-[#0D2342]">Source Performance</h3>
                <p className="text-sm text-slate-500">Lead generation by source over time</p>
              </div>
              <Select defaultValue="30">
                <SelectTrigger className="w-[140px] h-9 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="7" className="rounded-lg">Last 7 days</SelectItem>
                  <SelectItem value="30" className="rounded-lg">Last 30 days</SelectItem>
                  <SelectItem value="90" className="rounded-lg">Last 90 days</SelectItem>
                  <SelectItem value="365" className="rounded-lg">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Chart Placeholder */}
            <div className="h-64 bg-slate-50 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <BarChart3 size={48} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Performance Chart</p>
                <p className="text-slate-400 text-sm">Integrate with your charting library</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              {filteredSources.slice(0, 4).map((source) => {
                const SourceIcon = source.icon;
                return (
                  <div
                    key={source.id}
                    className="p-4 bg-slate-50 rounded-xl flex items-center gap-3"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${source.color}15` }}
                    >
                      <SourceIcon size={20} style={{ color: source.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0D2342] truncate">
                        {source.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {source.totalLeads} leads · {formatPercent(source.conversionRate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {source.trend >= 0 ? (
                        <ArrowUpRight size={14} className="text-green-500" />
                      ) : (
                        <ArrowDownRight size={14} className="text-red-500" />
                      )}
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          source.trend >= 0 ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {Math.abs(source.trend)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Dialogs */}
      <SourceFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setCurrentSource(null);
        }}
        source={currentSource}
        onSubmit={currentSource ? handleEditSource : handleAddSource}
      />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead Source</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{sourceToDelete?.name}"? This will remove all
              tracking data associated with this source. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSource}
              className="bg-red-500 hover:bg-red-600 rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeadSources;