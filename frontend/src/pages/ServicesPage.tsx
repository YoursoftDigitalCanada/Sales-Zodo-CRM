// src/pages/ServicesPage.tsx

import React, { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
  getServices,
  createService,
  updateService,
  deactivateService,
  deleteService,
} from "@/features/services";
import type { ServiceEntity, CreateServicePayload, UpdateServicePayload } from "@/features/services";
import {
  Bell,
  Search,
  Plus,
  Filter,
  Download,
  MoreVertical,
  MoreHorizontal,
  LayoutGrid,
  List,
  Eye,
  Pencil,
  Trash2,
  X,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Layers,
  Zap,
  Sparkles,
  Tag,
  Package,
  Activity,
  Power,
  PowerOff,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  type LucideIcon,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  basePrice: number;
  durationMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ServiceCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
}

// ============================================
// CONSTANTS
// ============================================

const serviceCategories: ServiceCategory[] = [
  { id: "consulting", name: "Consulting", icon: Sparkles, color: "#8B5CF6" },
  { id: "development", name: "Development", icon: Zap, color: "#3B82F6" },
  { id: "design", name: "Design", icon: Layers, color: "#EC4899" },
  { id: "marketing", name: "Marketing", icon: TrendingUp, color: "#F97316" },
  { id: "maintenance", name: "Maintenance", icon: RefreshCw, color: "#22D3EE" },
  { id: "training", name: "Training", icon: Activity, color: "#10B981" },
  { id: "support", name: "Support", icon: Tag, color: "#6366F1" },
  { id: "other", name: "Other", icon: Package, color: "#64748B" },
];

const statusFilters = [
  { value: "all", label: "All Services" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatCurrency = (amount?: number): string => {
  if (amount === undefined || amount === null) return "—";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount);
};

const formatDuration = (minutes?: number): string => {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes}min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getCategoryInfo = (categoryId?: string): ServiceCategory => {
  return serviceCategories.find((c) => c.id === categoryId) || serviceCategories[7];
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
  delay = 0,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: "teal" | "gold" | "navy" | "purple" | "green" | "blue";
  delay?: number;
}) => {
  const colorClasses = {
    teal: { bg: "bg-[#0891B2]", light: "bg-[#0891B2]/10", text: "text-[#0891B2]" },
    gold: { bg: "bg-[#D97706]", light: "bg-[#D97706]/10", text: "text-[#D97706]" },
    navy: { bg: "bg-[#0F172A]", light: "bg-[#0F172A]/10", text: "text-[#0F172A]" },
    purple: { bg: "bg-purple-500", light: "bg-purple-500/10", text: "text-purple-500" },
    green: { bg: "bg-green-500", light: "bg-green-500/10", text: "text-green-500" },
    blue: { bg: "bg-[#3B82F6]", light: "bg-[#3B82F6]/10", text: "text-[#3B82F6]" },
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
          <p className="text-2xl font-bold text-[#0F172A]">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-xs text-[#94A3B8] mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn("w-12 h-12 rounded-md flex items-center justify-center", colors.light)}>
          <Icon size={22} className={colors.text} />
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// SERVICE ROW COMPONENT
// ============================================

const ServiceRow = ({
  service,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  service: ServiceItem;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) => {
  const categoryInfo = getCategoryInfo(service.category);
  const CategoryIcon = categoryInfo.icon;

  return (
    <TableRow className="group hover:bg-[#F8FAFC]">
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3 cursor-pointer" onClick={onView}>
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center"
            style={{ backgroundColor: `${categoryInfo.color}15` }}
          >
            <CategoryIcon size={18} style={{ color: categoryInfo.color }} />
          </div>
          <div>
            <p className="font-medium text-[#0F172A] group-hover:text-[#0891B2] transition-colors">
              {service.name}
            </p>
            {service.description && (
              <p className="text-sm text-[#94A3B8] truncate max-w-[250px]">
                {service.description}
              </p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
          style={{ backgroundColor: `${categoryInfo.color}15`, color: categoryInfo.color }}
        >
          {categoryInfo.name}
        </span>
      </TableCell>
      <TableCell>
        <span className="font-semibold text-[#0F172A]">
          {formatCurrency(service.basePrice)}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-[#475569]">{formatDuration(service.durationMinutes)}</span>
      </TableCell>
      <TableCell>
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium capitalize",
          service.isActive
            ? "bg-green-50 text-green-600"
            : "bg-red-50 text-red-600"
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", service.isActive ? "bg-green-500" : "bg-red-500")} />
          {service.isActive ? "Active" : "Inactive"}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-[#94A3B8]">{formatDate(service.createdAt)}</span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={onView}>
                  <Eye size={16} className="text-[#475569]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View Details</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={onEdit}>
                  <Pencil size={16} className="text-[#475569]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
                <MoreVertical size={16} className="text-[#475569]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-md">
              <DropdownMenuItem onClick={onView} className="rounded-md">
                <Eye size={14} className="mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="rounded-md">
                <Pencil size={14} className="mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onToggleStatus} className="rounded-md">
                {service.isActive ? (
                  <><PowerOff size={14} className="mr-2" /> Deactivate</>
                ) : (
                  <><Power size={14} className="mr-2 text-green-600" /> Activate</>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="rounded-md text-red-600 focus:text-red-600">
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
// SERVICE CARD COMPONENT (GRID VIEW)
// ============================================

const ServiceCard = ({
  service,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
  delay = 0,
}: {
  service: ServiceItem;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  delay?: number;
}) => {
  const categoryInfo = getCategoryInfo(service.category);
  const CategoryIcon = categoryInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className={cn(
        "relative bg-white rounded-md border overflow-hidden transition-all group cursor-pointer",
        isSelected
          ? "border-[#22D3EE] ring-2 ring-[#22D3EE]/20"
          : "border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg"
      )}
      onClick={onView}
    >
      {/* Selection Checkbox */}
      <div
        className="absolute top-4 left-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE] bg-white"
        />
      </div>

      {/* Actions Menu */}
      <div
        className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md bg-white/80 backdrop-blur-sm hover:bg-white"
            >
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-md">
            <DropdownMenuItem onClick={onView} className="rounded-md">
              <Eye size={14} className="mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit} className="rounded-md">
              <Pencil size={14} className="mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onToggleStatus} className="rounded-md">
              {service.isActive ? (
                <><PowerOff size={14} className="mr-2" /> Deactivate</>
              ) : (
                <><Power size={14} className="mr-2 text-green-600" /> Activate</>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="rounded-md text-red-600 focus:text-red-600">
              <Trash2 size={14} className="mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Card Content */}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${categoryInfo.color}15` }}
          >
            <CategoryIcon size={24} style={{ color: categoryInfo.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#0F172A] truncate group-hover:text-[#0891B2] transition-colors">
              {service.name}
            </h3>
            {service.description && (
              <p className="text-sm text-[#94A3B8] truncate">{service.description}</p>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="mb-4">
          <span className="text-2xl font-bold text-[#0F172A]">
            {formatCurrency(service.basePrice)}
          </span>
          {service.durationMinutes > 0 && (
            <span className="text-sm text-[#94A3B8] ml-2">/ {formatDuration(service.durationMinutes)}</span>
          )}
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-3 mb-4">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium capitalize",
            service.isActive
              ? "bg-green-50 text-green-600"
              : "bg-red-50 text-red-600"
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", service.isActive ? "bg-green-500" : "bg-red-500")} />
            {service.isActive ? "Active" : "Inactive"}
          </span>
          <span className="text-xs text-[#475569] flex items-center gap-1">
            <Clock size={12} />
            {formatDuration(service.durationMinutes)}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[rgba(15,23,42,0.06)]">
          <span
            className="text-xs font-medium px-2 py-1 rounded-md"
            style={{ backgroundColor: `${categoryInfo.color}10`, color: categoryInfo.color }}
          >
            {categoryInfo.name}
          </span>
          <span className="text-xs text-[#475569]">{formatDate(service.createdAt)}</span>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// SERVICE FORM DIALOG
// ============================================

const ServiceFormDialog = ({
  isOpen,
  onClose,
  service,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceItem | null;
  onSubmit: (data: CreateServicePayload | UpdateServicePayload) => Promise<void>;
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "other",
    basePrice: "",
    durationMinutes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description || "",
        category: service.category || "other",
        basePrice: service.basePrice?.toString() || "",
        durationMinutes: service.durationMinutes?.toString() || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        category: "other",
        basePrice: "",
        durationMinutes: "",
      });
    }
  }, [service, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      await onSubmit({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        basePrice: formData.basePrice ? parseFloat(formData.basePrice) : undefined,
        durationMinutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] p-0 rounded-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA] sticky top-0 bg-white z-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              {service ? "Edit Service" : "Create New Service"}
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              {service ? "Update service details" : "Add a new service offering to your catalog"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Service Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">
              Service Name <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Package size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Website Development, SEO Audit"
                required
                className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the service..."
              rows={3}
              className="rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20 resize-none"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(val) => setFormData({ ...formData, category: val })}
            >
              <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-md">
                {serviceCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="rounded-md">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price & Duration row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Base Price (CAD)</Label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                  placeholder="0.00"
                  className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Duration (minutes)</Label>
              <div className="relative">
                <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  type="number"
                  min="0"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                  placeholder="60"
                  className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <DialogFooter className="pt-4 border-t border-[rgba(15,23,42,0.06)]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-md border-[rgba(15,23,42,0.06)]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !formData.name.trim()}
              className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
            >
              {saving ? (
                <><Loader2 size={16} className="mr-2 animate-spin" /> Saving...</>
              ) : service ? (
                "Update Service"
              ) : (
                "Create Service"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// VIEW SERVICE DETAIL DIALOG
// ============================================

const ServiceDetailDialog = ({
  isOpen,
  onClose,
  service,
}: {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceItem | null;
}) => {
  if (!service) return null;
  const categoryInfo = getCategoryInfo(service.category);
  const CategoryIcon = categoryInfo.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 rounded-md overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA]">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${categoryInfo.color}15` }}
            >
              <CategoryIcon size={28} style={{ color: categoryInfo.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-[#0F172A]">
                  {service.name}
                </DialogTitle>
              </DialogHeader>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-md"
                  style={{ backgroundColor: `${categoryInfo.color}15`, color: categoryInfo.color }}
                >
                  {categoryInfo.name}
                </span>
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
                  service.isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", service.isActive ? "bg-green-500" : "bg-red-500")} />
                  {service.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {service.description && (
            <div>
              <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-[#475569]">{service.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#F8FAFC] rounded-md p-4">
              <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">Base Price</p>
              <p className="text-lg font-bold text-[#0F172A]">{formatCurrency(service.basePrice)}</p>
            </div>
            <div className="bg-[#F8FAFC] rounded-md p-4">
              <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">Duration</p>
              <p className="text-lg font-bold text-[#0F172A]">{formatDuration(service.durationMinutes)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">Created</p>
              <p className="text-sm text-[#475569]">{formatDate(service.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">Last Updated</p>
              <p className="text-sm text-[#475569]">{formatDate(service.updatedAt)}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0">
          <Button variant="outline" onClick={onClose} className="rounded-md border-[rgba(15,23,42,0.06)]">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// MAIN SERVICES PAGE
// ============================================

export default function ServicesPage() {
  const { toast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Data
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editService, setEditService] = useState<ServiceItem | null>(null);
  const [viewService, setViewService] = useState<ServiceItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null);

  // ── Fetch services ──

  const fetchServices = async () => {
    setLoading(true);
    try {
      const data = await getServices();
      setServices(
        data.map((s) => ({
          id: String(s.id),
          name: s.name || "",
          description: (s.description as string) || undefined,
          category: (s.category as string) || "other",
          basePrice: Number(s.basePrice) || 0,
          durationMinutes: Number(s.durationMinutes) || 0,
          isActive: Boolean(s.isActive),
          createdAt: String(s.createdAt || new Date().toISOString()),
          updatedAt: String(s.updatedAt || new Date().toISOString()),
        }))
      );
    } catch (err) {
      console.error("Failed to fetch services:", err);
      toast({ title: "Error", description: "Failed to load services", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // ── Filter ──

  const filteredServices = useMemo(() => {
    let result = services;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
      );
    }

    if (statusFilter === "active") result = result.filter((s) => s.isActive);
    if (statusFilter === "inactive") result = result.filter((s) => !s.isActive);

    if (categoryFilter !== "all") result = result.filter((s) => s.category === categoryFilter);

    return result;
  }, [services, searchQuery, statusFilter, categoryFilter]);

  // ── Paginate ──

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / pageSize));
  const paginatedServices = filteredServices.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, categoryFilter]);

  // ── Stats ──

  const stats = useMemo(() => {
    const total = services.length;
    const active = services.filter((s) => s.isActive).length;
    const inactive = total - active;
    const avgPrice =
      services.length > 0
        ? services.reduce((sum, s) => sum + (s.basePrice || 0), 0) / services.length
        : 0;
    return { total, active, inactive, avgPrice };
  }, [services]);

  // ── Selection ──

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedServices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedServices.map((s) => s.id)));
    }
  };

  // ── Handlers ──

  const handleCreate = async (data: CreateServicePayload | UpdateServicePayload) => {
    await createService(data as CreateServicePayload);
    toast({ title: "Service Created", description: "The service has been added to your catalog." });
    fetchServices();
  };

  const handleEdit = async (data: CreateServicePayload | UpdateServicePayload) => {
    if (!editService) return;
    await updateService(editService.id, data as UpdateServicePayload);
    toast({ title: "Service Updated", description: "The service has been updated successfully." });
    fetchServices();
  };

  const handleToggleStatus = async (service: ServiceItem) => {
    try {
      if (service.isActive) {
        await deactivateService(service.id);
        toast({ title: "Service Deactivated", description: `"${service.name}" has been deactivated.` });
      } else {
        await updateService(service.id, { name: service.name });
        toast({ title: "Service Activated", description: `"${service.name}" has been reactivated.` });
      }
      fetchServices();
    } catch (err) {
      toast({ title: "Error", description: "Failed to update service status", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteService(deleteTarget.id);
      toast({ title: "Service Deleted", description: `"${deleteTarget.name}" has been deleted.` });
      setDeleteTarget(null);
      fetchServices();
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete service", variant: "destructive" });
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      <main className="flex-1 ml-0">
        <div className="max-w-[1600px] mx-auto p-6 lg:p-8 space-y-6">

          {/* ── HEADER ── */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#0F172A]">Services</h1>
              <p className="text-sm text-[#94A3B8] mt-1">Manage your service catalog and offerings</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="rounded-md border-[rgba(15,23,42,0.06)] text-[#475569]" onClick={fetchServices}>
                <RefreshCw size={16} className="mr-2" /> Refresh
              </Button>
              <Button
                className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus size={16} className="mr-2" /> Add Service
              </Button>
            </div>
          </div>

          {/* ── STATS ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Services" value={stats.total} icon={Package} color="teal" delay={0} subtitle="All services" />
            <StatCard title="Active" value={stats.active} icon={CheckCircle2} color="green" delay={0.05} subtitle="Currently available" />
            <StatCard title="Inactive" value={stats.inactive} icon={PowerOff} color="navy" delay={0.1} subtitle="Deactivated" />
            <StatCard title="Avg. Price" value={formatCurrency(stats.avgPrice)} icon={DollarSign} color="gold" delay={0.15} subtitle="Across all services" />
          </div>

          {/* ── TOOLBAR ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-4">
            <div className="flex items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search services..."
                  className="h-10 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 w-[140px] rounded-md border-[rgba(15,23,42,0.06)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  {statusFilters.map((f) => (
                    <SelectItem key={f.value} value={f.value} className="rounded-md">
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-10 w-[160px] rounded-md border-[rgba(15,23,42,0.06)]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="all" className="rounded-md">All Categories</SelectItem>
                  {serviceCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="rounded-md">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#94A3B8]">{filteredServices.length} services</span>
              <div className="flex bg-[#F1F5F9] rounded-md p-1">
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-2 rounded-md transition-all",
                    viewMode === "list" ? "bg-white shadow-sm text-[#0891B2]" : "text-[#94A3B8] hover:text-[#475569]"
                  )}
                >
                  <List size={16} />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-2 rounded-md transition-all",
                    viewMode === "grid" ? "bg-white shadow-sm text-[#0891B2]" : "text-[#94A3B8] hover:text-[#475569]"
                  )}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* ── CONTENT ── */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-[#0891B2]" />
            </div>
          ) : filteredServices.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 bg-white rounded-md border border-[rgba(15,23,42,0.06)]"
            >
              <div className="w-16 h-16 rounded-full bg-[#0891B2]/10 flex items-center justify-center mb-4">
                <Package size={32} className="text-[#0891B2]" />
              </div>
              <h3 className="text-lg font-semibold text-[#0F172A]">No services found</h3>
              <p className="text-sm text-[#94A3B8] mt-1 mb-4">
                {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by creating your first service"}
              </p>
              {!searchQuery && statusFilter === "all" && categoryFilter === "all" && (
                <Button
                  className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus size={16} className="mr-2" /> Create Service
                </Button>
              )}
            </motion.div>
          ) : viewMode === "list" ? (
            /* LIST VIEW */
            <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F8FAFC]">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.size === paginatedServices.length && paginatedServices.length > 0}
                        onCheckedChange={toggleSelectAll}
                        className="data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
                      />
                    </TableHead>
                    <TableHead className="text-[#475569] font-semibold text-xs uppercase tracking-wider">Service</TableHead>
                    <TableHead className="text-[#475569] font-semibold text-xs uppercase tracking-wider">Category</TableHead>
                    <TableHead className="text-[#475569] font-semibold text-xs uppercase tracking-wider">Price</TableHead>
                    <TableHead className="text-[#475569] font-semibold text-xs uppercase tracking-wider">Duration</TableHead>
                    <TableHead className="text-[#475569] font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-[#475569] font-semibold text-xs uppercase tracking-wider">Created</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {paginatedServices.map((service) => (
                      <ServiceRow
                        key={service.id}
                        service={service}
                        isSelected={selectedIds.has(service.id)}
                        onSelect={() => toggleSelect(service.id)}
                        onView={() => setViewService(service)}
                        onEdit={() => setEditService(service)}
                        onToggleStatus={() => handleToggleStatus(service)}
                        onDelete={() => setDeleteTarget(service)}
                      />
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          ) : (
            /* GRID VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {paginatedServices.map((service, i) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isSelected={selectedIds.has(service.id)}
                    onSelect={() => toggleSelect(service.id)}
                    onView={() => setViewService(service)}
                    onEdit={() => setEditService(service)}
                    onToggleStatus={() => handleToggleStatus(service)}
                    onDelete={() => setDeleteTarget(service)}
                    delay={i * 0.03}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* ── PAGINATION ── */}
          {filteredServices.length > pageSize && (
            <div className="flex items-center justify-between bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-4">
              <p className="text-sm text-[#94A3B8]">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredServices.length)} of {filteredServices.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" disabled={page <= 1} onClick={() => setPage(1)}>
                  <ChevronsLeft size={14} />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft size={14} />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, i, arr) => (
                    <React.Fragment key={p}>
                      {i > 0 && arr[i - 1] !== p - 1 && <span className="text-[#94A3B8] px-1">…</span>}
                      <Button
                        variant={p === page ? "default" : "outline"}
                        size="icon"
                        className={cn(
                          "h-8 w-8 rounded-md text-xs",
                          p === page && "bg-[#0891B2] hover:bg-[#0891B2]/90 text-white"
                        )}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    </React.Fragment>
                  ))}
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight size={14} />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
                  <ChevronsRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── DIALOGS ── */}
      <ServiceFormDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        service={null}
        onSubmit={handleCreate}
      />

      <ServiceFormDialog
        isOpen={!!editService}
        onClose={() => setEditService(null)}
        service={editService}
        onSubmit={handleEdit}
      />

      <ServiceDetailDialog
        isOpen={!!viewService}
        onClose={() => setViewService(null)}
        service={viewService}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#0F172A]">Delete Service</AlertDialogTitle>
            <AlertDialogDescription className="text-[#475569]">
              Are you sure you want to delete <strong>"{deleteTarget?.name}"</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md border-[rgba(15,23,42,0.06)]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white rounded-md"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}