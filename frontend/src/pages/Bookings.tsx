// src/pages/Bookings.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  SlidersHorizontal,
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
  CalendarCheck,
  CalendarClock,
  CalendarX,
  CalendarPlus,
  Timer,
  Video,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  Briefcase,
  DollarSign,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Activity,
  Zap,
  Send,
  MessageSquare,
  UserCheck,
  UserX,
  Globe,
  Link2,
  Settings,
  CircleDot,
  BadgeCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/axios";

// ============================================
// TYPES
// ============================================

interface Booking {
  id: string | number;
  clientName: string;
  clientEmail: string;
  serviceName: string;
  serviceId: string | number;
  providerName: string;
  providerId: string | number;
  startTime: string;
  endTime?: string;
  status: string;
  notes?: string;
  price?: number;
  duration?: number;
  location?: string;
  isOnline?: boolean;
  meetingLink?: string;
  reminder?: boolean;
  createdAt?: string;
}

interface Service {
  id: string | number;
  name: string;
  price: number;
  duration?: number;
  description?: string;
  color?: string;
}

interface Provider {
  id: string | number;
  name: string;
  email?: string;
  avatar?: string;
  specialty?: string;
  available?: boolean;
}

interface AppUser {
  firstName: string;
  lastName: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const statusOptions = [
  { value: "all", label: "All Status", icon: CircleDot },
  { value: "confirmed", label: "Confirmed", icon: CheckCircle2, color: "green" },
  { value: "pending", label: "Pending", icon: Clock, color: "amber" },
  { value: "cancelled", label: "Cancelled", icon: XCircle, color: "red" },
  { value: "completed", label: "Completed", icon: BadgeCheck, color: "blue" },
  { value: "no_show", label: "No Show", icon: UserX, color: "slate" },
];

const timeSlots: TimeSlot[] = [
  { time: "09:00", available: true },
  { time: "09:30", available: true },
  { time: "10:00", available: false },
  { time: "10:30", available: true },
  { time: "11:00", available: true },
  { time: "11:30", available: false },
  { time: "12:00", available: false },
  { time: "12:30", available: false },
  { time: "13:00", available: true },
  { time: "13:30", available: true },
  { time: "14:00", available: true },
  { time: "14:30", available: false },
  { time: "15:00", available: true },
  { time: "15:30", available: true },
  { time: "16:00", available: true },
  { time: "16:30", available: true },
  { time: "17:00", available: false },
];

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

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInHours < 0) return "Past";
  if (diffInHours === 0) return "Now";
  if (diffInHours < 24) return `In ${diffInHours}h`;
  if (diffInDays === 1) return "Tomorrow";
  if (diffInDays < 7) return `In ${diffInDays} days`;
  return formatDate(dateString);
};

const getStatusConfig = (status: string) => {
  const configs: Record<string, { bg: string; text: string; dot: string; icon: LucideIcon }> = {
    confirmed: { bg: "bg-green-100", text: "text-green-600", dot: "bg-green-500", icon: CheckCircle2 },
    pending: { bg: "bg-amber-100", text: "text-amber-600", dot: "bg-amber-500", icon: Clock },
    cancelled: { bg: "bg-red-100", text: "text-red-600", dot: "bg-red-500", icon: XCircle },
    completed: { bg: "bg-blue-100", text: "text-blue-600", dot: "bg-blue-500", icon: BadgeCheck },
    no_show: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-500", icon: UserX },
  };
  return configs[status?.toLowerCase().replace(" ", "_")] || configs.pending;
};

const formatCurrency = (amount?: number) => {
  if (!amount) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
};

const isToday = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

const isUpcoming = (dateString: string) => {
  return new Date(dateString) > new Date();
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
    teal: { bg: "bg-[#23D3EE]", light: "bg-[#23D3EE]/10", text: "text-[#23D3EE]" },
    gold: { bg: "bg-[#FBBF23]", light: "bg-[#FBBF23]/10", text: "text-[#FBBF23]" },
    navy: { bg: "bg-[#0F172A]", light: "bg-[#0F172A]/10", text: "text-[#0F172A]" },
    purple: { bg: "bg-purple-500", light: "bg-purple-500/10", text: "text-purple-500" },
    green: { bg: "bg-green-500", light: "bg-green-500/10", text: "text-green-500" },
    red: { bg: "bg-red-500", light: "bg-red-500/10", text: "text-red-500" },
    blue: { bg: "bg-blue-500", light: "bg-blue-500/10", text: "text-blue-500" },
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="relative bg-white rounded-2xl p-5 border border-slate-200 hover:border-[#23D3EE]/30 hover:shadow-xl hover:shadow-[#23D3EE]/5 transition-all overflow-hidden group"
    >
      <div className={cn("absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-all", colors.bg)} />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-[#0F172A]">{value}</p>
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
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors.light)}>
          <Icon size={18} className={colors.text} />
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// BOOKING ROW COMPONENT
// ============================================

const BookingRow = ({
  booking,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onCancel,
  onReschedule,
  onMarkComplete,
}: {
  booking: Booking;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onReschedule: () => void;
  onMarkComplete: () => void;
}) => {
  const statusConfig = getStatusConfig(booking.status);
  const StatusIcon = statusConfig.icon;
  const upcoming = isUpcoming(booking.startTime);
  const today = isToday(booking.startTime);

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "group hover:bg-slate-50/80 transition-colors cursor-pointer border-b border-slate-100 last:border-0",
        isSelected && "bg-[#23D3EE]/5"
      )}
      onClick={onView}
    >
      {/* Checkbox */}
      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="border-slate-300 data-[state=checked]:bg-[#23D3EE] data-[state=checked]:border-[#23D3EE]"
        />
      </td>

      {/* Client */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#23D3EE] to-[#6366F1] flex items-center justify-center text-white font-semibold text-sm">
            {getInitials(booking.clientName)}
          </div>
          <div>
            <p className="font-semibold text-[#0F172A] group-hover:text-[#23D3EE] transition-colors">
              {booking.clientName}
            </p>
            <p className="text-xs text-slate-400">{booking.clientEmail}</p>
          </div>
        </div>
      </td>

      {/* Service */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#23D3EE]/10 flex items-center justify-center">
            <Briefcase size={14} className="text-[#23D3EE]" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">{booking.serviceName}</p>
            {booking.duration && (
              <p className="text-xs text-slate-400">{booking.duration} min</p>
            )}
          </div>
        </div>
      </td>

      {/* Date & Time */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            today ? "bg-[#23D3EE]/10" : "bg-slate-100"
          )}>
            <CalendarDays size={14} className={today ? "text-[#23D3EE]" : "text-slate-500"} />
          </div>
          <div>
            <p className={cn(
              "text-sm font-medium",
              today ? "text-[#23D3EE]" : "text-slate-700"
            )}>
              {formatDate(booking.startTime)}
              {today && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-[#23D3EE]/10 text-[#23D3EE] text-[10px] font-semibold">
                  TODAY
                </span>
              )}
            </p>
            <p className="text-xs text-slate-400">{formatTime(booking.startTime)}</p>
          </div>
        </div>
      </td>

      {/* Provider */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-semibold">
            {getInitials(booking.providerName)}
          </div>
          <span className="text-sm text-slate-600">{booking.providerName}</span>
        </div>
      </td>

      {/* Status */}
      <td className="py-4 px-4">
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
          statusConfig.bg,
          statusConfig.text
        )}>
          <StatusIcon size={12} />
          {booking.status}
        </span>
      </td>

      {/* Price */}
      <td className="py-4 px-4">
        <span className="text-sm font-semibold text-[#0F172A]">
          {formatCurrency(booking.price)}
        </span>
      </td>

      {/* Actions */}
      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {upcoming && booking.status === "Confirmed" && (
            <>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onMarkComplete}
                className="p-2 rounded-lg hover:bg-green-100 text-green-600 transition-colors"
                title="Mark Complete"
              >
                <CheckCircle2 size={16} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onReschedule}
                className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                title="Reschedule"
              >
                <CalendarClock size={16} />
              </motion.button>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <MoreVertical size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem onClick={onView} className="rounded-lg">
                <Eye size={14} className="mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="rounded-lg">
                <Pencil size={14} className="mr-2" />
                Edit Booking
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-lg">
                <Send size={14} className="mr-2" />
                Send Reminder
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg">
                <MessageSquare size={14} className="mr-2" />
                Send Message
              </DropdownMenuItem>
              {booking.isOnline && booking.meetingLink && (
                <DropdownMenuItem className="rounded-lg">
                  <Video size={14} className="mr-2" />
                  Join Meeting
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {booking.status !== "Cancelled" && (
                <DropdownMenuItem
                  className="rounded-lg text-red-600 focus:text-red-600 focus:bg-red-50"
                  onClick={onCancel}
                >
                  <XCircle size={14} className="mr-2" />
                  Cancel Booking
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </motion.tr>
  );
};

// ============================================
// BOOKING CARD COMPONENT (Grid View)
// ============================================

const BookingCard = ({
  booking,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onCancel,
}: {
  booking: Booking;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onCancel: () => void;
}) => {
  const statusConfig = getStatusConfig(booking.status);
  const StatusIcon = statusConfig.icon;
  const today = isToday(booking.startTime);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      className={cn(
        "bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer group",
        "hover:border-[#23D3EE]/30 hover:shadow-xl hover:shadow-[#23D3EE]/5 transition-all",
        isSelected && "border-[#23D3EE] bg-[#23D3EE]/5"
      )}
      onClick={onView}
    >
      {/* Time Banner */}
      <div className={cn(
        "px-4 py-2 flex items-center justify-between",
        today ? "bg-[#23D3EE]/10" : "bg-slate-50"
      )}>
        <div className="flex items-center gap-2">
          <Clock size={14} className={today ? "text-[#23D3EE]" : "text-slate-500"} />
          <span className={cn(
            "text-sm font-semibold",
            today ? "text-[#23D3EE]" : "text-slate-600"
          )}>
            {formatTime(booking.startTime)}
          </span>
          {today && (
            <span className="px-1.5 py-0.5 rounded bg-[#23D3EE] text-white text-[10px] font-semibold">
              TODAY
            </span>
          )}
        </div>
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
          statusConfig.bg,
          statusConfig.text
        )}>
          <StatusIcon size={10} />
          {booking.status}
        </span>
      </div>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              onClick={(e) => e.stopPropagation()}
              className="border-slate-300 data-[state=checked]:bg-[#23D3EE] data-[state=checked]:border-[#23D3EE]"
            />
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#23D3EE] to-[#6366F1] flex items-center justify-center text-white font-bold text-sm">
              {getInitials(booking.clientName)}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 transition-all">
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem onClick={onView} className="rounded-lg">
                <Eye size={14} className="mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="rounded-lg">
                <Pencil size={14} className="mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="rounded-lg text-red-600"
                onClick={onCancel}
              >
                <XCircle size={14} className="mr-2" />
                Cancel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Client Info */}
        <div className="mb-3">
          <h3 className="font-semibold text-[#0F172A] group-hover:text-[#23D3EE] transition-colors mb-0.5">
            {booking.clientName}
          </h3>
          <p className="text-xs text-slate-400">{booking.clientEmail}</p>
        </div>

        {/* Service & Provider */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <Briefcase size={14} className="text-[#23D3EE]" />
            <span className="text-slate-600">{booking.serviceName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User size={14} className="text-[#FBBF23]" />
            <span className="text-slate-600">{booking.providerName}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-sm font-bold text-[#0F172A]">
            {formatCurrency(booking.price)}
          </span>
          <span className="text-xs text-slate-400">
            {formatDate(booking.startTime)}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// UPCOMING BOOKING MINI CARD
// ============================================

const UpcomingBookingMini = ({
  booking,
  onClick,
}: {
  booking: Booking;
  onClick: () => void;
}) => {
  const today = isToday(booking.startTime);

  return (
    <motion.div
      whileHover={{ x: 4 }}
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group"
    >
      <div className={cn(
        "w-12 h-12 rounded-xl flex flex-col items-center justify-center text-center",
        today ? "bg-[#23D3EE]/10" : "bg-slate-100"
      )}>
        <span className={cn(
          "text-xs font-semibold",
          today ? "text-[#23D3EE]" : "text-slate-500"
        )}>
          {new Date(booking.startTime).toLocaleDateString("en-US", { month: "short" })}
        </span>
        <span className={cn(
          "text-lg font-bold -mt-1",
          today ? "text-[#23D3EE]" : "text-slate-700"
        )}>
          {new Date(booking.startTime).getDate()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[#0F172A] truncate group-hover:text-[#23D3EE] transition-colors">
          {booking.clientName}
        </p>
        <p className="text-xs text-slate-500">
          {formatTime(booking.startTime)} • {booking.serviceName}
        </p>
      </div>
      <ChevronRight size={16} className="text-slate-300 group-hover:text-[#23D3EE] transition-colors" />
    </motion.div>
  );
};

// ============================================
// CREATE BOOKING WIZARD
// ============================================

const CreateBookingWizard = ({
  isOpen,
  onClose,
  onSubmit,
  services,
  providers,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  services: Service[];
  providers: Provider[];
}) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [clientDetails, setClientDetails] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [isOnline, setIsOnline] = useState(false);
  const [sendReminder, setSendReminder] = useState(true);

  const resetForm = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedProvider(null);
    setDate("");
    setTime("");
    setClientDetails({ name: "", email: "", phone: "", notes: "" });
    setIsOnline(false);
    setSendReminder(true);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        serviceId: selectedService?.id,
        providerId: selectedProvider?.id,
        clientName: clientDetails.name,
        clientEmail: clientDetails.email,
        clientPhone: clientDetails.phone,
        notes: clientDetails.notes,
        startTime: `${date}T${time}:00`,
        isOnline,
        sendReminder,
        status: "Confirmed",
        price: selectedService?.price,
        duration: selectedService?.duration,
      });
      handleClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: "Service", icon: Briefcase },
    { num: 2, title: "Schedule", icon: Calendar },
    { num: 3, title: "Client", icon: User },
    { num: 4, title: "Confirm", icon: CheckCircle2 },
  ];

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedService && selectedProvider;
      case 2:
        return date && time;
      case 3:
        return clientDetails.name && clientDetails.email;
      default:
        return true;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] p-0 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-[#23D3EE]/10 to-[#FBBF23]/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              New Booking
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Schedule a new appointment in 4 easy steps
            </DialogDescription>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mt-6">
            {steps.map((s, index) => {
              const Icon = s.icon;
              const isActive = step === s.num;
              const isCompleted = step > s.num;

              return (
                <div key={s.num} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <motion.div
                      animate={{
                        scale: isActive ? 1.1 : 1,
                        backgroundColor: isCompleted
                          ? "#23D3EE"
                          : isActive
                          ? "#23D3EE"
                          : "#f1f5f9",
                      }}
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                        (isActive || isCompleted) ? "text-white" : "text-slate-400"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <Icon size={18} />
                      )}
                    </motion.div>
                    <span className={cn(
                      "text-xs mt-1 font-medium",
                      isActive ? "text-[#23D3EE]" : "text-slate-400"
                    )}>
                      {s.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "w-12 h-0.5 mx-2 rounded transition-colors",
                      step > s.num ? "bg-[#23D3EE]" : "bg-slate-200"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* Step 1: Service & Provider */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                {/* Service Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-600">
                    Select Service <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {services.map((service) => (
                      <motion.button
                        key={service.id}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedService(service)}
                        className={cn(
                          "relative p-4 rounded-xl border-2 text-left transition-all",
                          selectedService?.id === service.id
                            ? "border-[#23D3EE] bg-[#23D3EE]/5"
                            : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="w-8 h-8 rounded-lg bg-[#23D3EE]/10 flex items-center justify-center">
                            <Briefcase size={16} className="text-[#23D3EE]" />
                          </div>
                          <span className="text-lg font-bold text-[#23D3EE]">
                            ${service.price}
                          </span>
                        </div>
                        <p className="font-semibold text-[#0F172A] mb-1">{service.name}</p>
                        {service.duration && (
                          <p className="text-xs text-slate-400">{service.duration} minutes</p>
                        )}
                        {selectedService?.id === service.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-[#23D3EE] rounded-full flex items-center justify-center"
                          >
                            <CheckCircle2 size={14} className="text-white" />
                          </motion.div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Provider Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-600">
                    Select Provider <span className="text-red-500">*</span>
                  </Label>
                  <div className="space-y-2">
                    {providers.map((provider) => (
                      <motion.button
                        key={provider.id}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        onClick={() => setSelectedProvider(provider)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                          selectedProvider?.id === provider.id
                            ? "border-[#23D3EE] bg-[#23D3EE]/5"
                            : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F172A] to-[#23D3EE] flex items-center justify-center text-white font-semibold text-sm">
                          {getInitials(provider.name)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-[#0F172A]">{provider.name}</p>
                          {provider.specialty && (
                            <p className="text-xs text-slate-400">{provider.specialty}</p>
                          )}
                        </div>
                        {provider.available && (
                          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-600 text-xs font-medium">
                            Available
                          </span>
                        )}
                        {selectedProvider?.id === provider.id && (
                          <CheckCircle2 size={18} className="text-[#23D3EE]" />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Date & Time */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                {/* Date Picker */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-600">
                    Select Date <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="h-12 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
                    />
                  </div>
                </div>

                {/* Time Slots */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-600">
                    Select Time <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {timeSlots.map((slot) => (
                      <motion.button
                        key={slot.time}
                        type="button"
                        whileHover={{ scale: slot.available ? 1.05 : 1 }}
                        whileTap={{ scale: slot.available ? 0.95 : 1 }}
                        onClick={() => slot.available && setTime(slot.time)}
                        disabled={!slot.available}
                        className={cn(
                          "p-3 rounded-xl text-sm font-medium transition-all",
                          time === slot.time
                            ? "bg-[#23D3EE] text-white shadow-lg shadow-[#23D3EE]/25"
                            : slot.available
                            ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            : "bg-slate-50 text-slate-300 cursor-not-allowed"
                        )}
                      >
                        {slot.time}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Meeting Type */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#23D3EE]/10 flex items-center justify-center">
                      <Video size={18} className="text-[#23D3EE]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#0F172A]">Online Meeting</p>
                      <p className="text-xs text-slate-500">Generate video call link</p>
                    </div>
                  </div>
                  <Checkbox
                    checked={isOnline}
                    onCheckedChange={(checked) => setIsOnline(checked as boolean)}
                    className="border-slate-300 data-[state=checked]:bg-[#23D3EE] data-[state=checked]:border-[#23D3EE]"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 3: Client Details */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-600">
                    Client Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={clientDetails.name}
                      onChange={(e) => setClientDetails({ ...clientDetails, name: e.target.value })}
                      placeholder="John Doe"
                      className="h-11 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-600">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="email"
                      value={clientDetails.email}
                      onChange={(e) => setClientDetails({ ...clientDetails, email: e.target.value })}
                      placeholder="john@example.com"
                      className="h-11 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-600">Phone</Label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={clientDetails.phone}
                      onChange={(e) => setClientDetails({ ...clientDetails, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      className="h-11 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-600">Notes</Label>
                  <Textarea
                    value={clientDetails.notes}
                    onChange={(e) => setClientDetails({ ...clientDetails, notes: e.target.value })}
                    placeholder="Any special requests or notes..."
                    rows={3}
                    className="rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20 resize-none"
                  />
                </div>

                {/* Send Reminder */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#FBBF23]/10 flex items-center justify-center">
                      <Bell size={18} className="text-[#FBBF23]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#0F172A]">Send Reminder</p>
                      <p className="text-xs text-slate-500">Email reminder 24h before</p>
                    </div>
                  </div>
                  <Checkbox
                    checked={sendReminder}
                    onCheckedChange={(checked) => setSendReminder(checked as boolean)}
                    className="border-slate-300 data-[state=checked]:bg-[#23D3EE] data-[state=checked]:border-[#23D3EE]"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-[#23D3EE]/10 flex items-center justify-center mx-auto mb-4">
                    <CalendarCheck size={32} className="text-[#23D3EE]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0F172A]">Review Booking</h3>
                  <p className="text-sm text-slate-500">Please confirm the details below</p>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                  {/* Service */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#23D3EE]/10 flex items-center justify-center">
                        <Briefcase size={14} className="text-[#23D3EE]" />
                      </div>
                      <span className="text-sm text-slate-500">Service</span>
                    </div>
                    <span className="font-medium text-[#0F172A]">{selectedService?.name}</span>
                  </div>

                  {/* Provider */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FBBF23]/10 flex items-center justify-center">
                        <User size={14} className="text-[#FBBF23]" />
                      </div>
                      <span className="text-sm text-slate-500">Provider</span>
                    </div>
                    <span className="font-medium text-[#0F172A]">{selectedProvider?.name}</span>
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <CalendarDays size={14} className="text-blue-600" />
                      </div>
                      <span className="text-sm text-slate-500">Date & Time</span>
                    </div>
                    <span className="font-medium text-[#0F172A]">
                      {date && new Date(date).toLocaleDateString()} at {time}
                    </span>
                  </div>

                  {/* Client */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                        <UserCheck size={14} className="text-purple-600" />
                      </div>
                      <span className="text-sm text-slate-500">Client</span>
                    </div>
                    <span className="font-medium text-[#0F172A]">{clientDetails.name}</span>
                  </div>

                  {/* Meeting Type */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                        {isOnline ? <Video size={14} className="text-green-600" /> : <MapPin size={14} className="text-green-600" />}
                      </div>
                      <span className="text-sm text-slate-500">Location</span>
                    </div>
                    <span className="font-medium text-[#0F172A]">
                      {isOnline ? "Online Meeting" : "In Person"}
                    </span>
                  </div>
                </div>

                {/* Price Summary */}
                <div className="flex items-center justify-between p-4 bg-[#23D3EE]/10 rounded-xl">
                  <span className="font-medium text-[#0F172A]">Total Amount</span>
                  <span className="text-2xl font-bold text-[#23D3EE]">
                    ${selectedService?.price || 0}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <DialogFooter className="p-6 pt-0 gap-3">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="rounded-xl"
            >
              <ChevronLeft size={16} className="mr-1" />
              Back
            </Button>
          )}
          {step < 4 ? (
            <Button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="bg-[#23D3EE] hover:bg-[#23D3EE]/90 text-white rounded-xl flex-1"
            >
              Continue
              <ChevronRight size={16} className="ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-[#23D3EE] to-[#23D3EE]/90 hover:from-[#23D3EE]/90 hover:to-[#23D3EE] text-white rounded-xl shadow-lg shadow-[#23D3EE]/25 flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles size={16} className="mr-2" />
                  Confirm Booking
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// EMPTY STATE COMPONENT
// ============================================

const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 px-4"
  >
    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#23D3EE]/10 to-[#FBBF23]/10 flex items-center justify-center mb-6">
      <CalendarDays size={40} className="text-[#23D3EE]" />
    </div>
    <h3 className="text-xl font-semibold text-[#0F172A] mb-2">No bookings yet</h3>
    <p className="text-slate-500 text-center max-w-sm mb-6">
      Start scheduling appointments by creating your first booking.
    </p>
    <Button
      onClick={onAdd}
      className="bg-gradient-to-r from-[#23D3EE] to-[#23D3EE]/90 hover:from-[#23D3EE]/90 hover:to-[#23D3EE] text-white rounded-xl shadow-lg shadow-[#23D3EE]/25"
    >
      <Plus size={18} className="mr-2" />
      Create Your First Booking
    </Button>
  </motion.div>
);

// ============================================
// MAIN COMPONENT
// ============================================

const BookingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedBookings, setSelectedBookings] = useState<number[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [user, setUser] = useState<AppUser | null>(null);

  // Dialog State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

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

  useEffect(() => {
    loadData();
  }, []);

  // ============================================
  // API CALLS
  // ============================================

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bookingsRes, usersRes] = await Promise.all([
        api.get("/bookings"),
        api.get("/users"),
      ]);

      const bookingsData = bookingsRes.data?.data || [];
      const usersData = usersRes.data?.data || [];

      // Normalize bookings to current UI shape
      const enhancedBookings = (bookingsData || []).map((b: any) => {
        const startDate = b.startTime ? new Date(b.startTime) : new Date();
        const endDate = b.endTime ? new Date(b.endTime) : new Date(startDate.getTime() + 30 * 60000);
        const duration = Math.max(30, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
        const assignedName = b.assignedTo
          ? `${b.assignedTo.firstName || ""} ${b.assignedTo.lastName || ""}`.trim()
          : "Unassigned";

        return {
          id: b.id,
          clientName: b.client?.displayName || "Client",
          clientEmail: b.clientEmail || "",
          serviceName: b.title || "Appointment",
          serviceId: b.serviceId || b.id,
          providerName: assignedName || "Unassigned",
          providerId: b.assignedTo?.id || "",
          startTime: b.startTime,
          endTime: b.endTime,
          status: (b.status || "PENDING").toLowerCase(),
          notes: b.notes || "",
          price: b.price || Math.floor(Math.random() * 200) + 50,
          duration,
          location: b.location || "",
          isOnline: (b.location || "").toLowerCase() === "online",
        };
      });

      // Derive service options from bookings (fallback keeps page usable with current backend)
      const serviceByName = new Map<string, Service>();
      enhancedBookings.forEach((booking: any) => {
        if (!serviceByName.has(booking.serviceName)) {
          serviceByName.set(booking.serviceName, {
            id: booking.serviceId,
            name: booking.serviceName,
            price: booking.price || 0,
            duration: booking.duration || 30,
          });
        }
      });
      const enhancedServices = Array.from(serviceByName.values());

      // Providers from users endpoint
      const enhancedProviders = (usersData || []).map((u: any) => ({
        id: u.id,
        name: u.fullName || `${u.firstName || ""} ${u.lastName || ""}`.trim(),
        email: u.email,
        available: u.isActive !== false,
        specialty: u.role?.name || "General",
      }));

      setBookings(enhancedBookings);
      setServices(enhancedServices);
      setProviders(enhancedProviders);
    } catch (err) {
      console.error("Failed to load data:", err);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBooking = async (payload: any) => {
    try {
      const startTime = new Date(payload.startTime);
      const endTime = new Date(startTime.getTime() + (Number(payload.duration) || 30) * 60000);
      const selectedService = services.find((s) => String(s.id) === String(payload.serviceId));

      await api.post("/bookings", {
        title: selectedService?.name || "Appointment",
        description: payload.notes || null,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: "CONFIRMED",
        assignedToId: payload.providerId || null,
        location: payload.isOnline ? "Online" : null,
        notes: payload.notes || null,
      });

      toast({
        title: "Booking Created!",
        description: "The appointment has been scheduled successfully.",
      });

      loadData();
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      });
      throw e;
    }
  };

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;
    setIsCancelling(true);

    try {
      await api.patch(`/bookings/${bookingToCancel.id}/cancel`);

      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingToCancel.id ? { ...b, status: "cancelled" } : b
        )
      );

      toast({
        title: "Booking Cancelled",
        description: `Appointment with ${bookingToCancel.clientName} has been cancelled.`,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
      setCancelDialogOpen(false);
      setBookingToCancel(null);
    }
  };

  const handleMarkComplete = async (booking: Booking) => {
    try {
            setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id ? { ...b, status: "Completed" } : b
        )
      );

      toast({
        title: "Booking Completed",
        description: `Appointment with ${booking.clientName} marked as complete.`,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to update booking",
        variant: "destructive",
      });
    }
  };

  // ============================================
  // FILTERING & SORTING
  // ============================================

  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (b) =>
          b.clientName?.toLowerCase().includes(term) ||
          b.clientEmail?.toLowerCase().includes(term) ||
          b.serviceName?.toLowerCase().includes(term) ||
          b.providerName?.toLowerCase().includes(term)
      );
    }

    // Status Filter
    if (filterStatus !== "all") {
      result = result.filter(
        (b) => b.status?.toLowerCase().replace(" ", "_") === filterStatus
      );
    }

    // Date Filter
    if (filterDate !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);

      result = result.filter((b) => {
        const bookingDate = new Date(b.startTime);
        switch (filterDate) {
          case "today":
            return bookingDate >= today && bookingDate < tomorrow;
          case "tomorrow":
            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
            return bookingDate >= tomorrow && bookingDate < dayAfterTomorrow;
          case "week":
            return bookingDate >= today && bookingDate < weekEnd;
          case "upcoming":
            return bookingDate >= now;
          case "past":
            return bookingDate < now;
          default:
            return true;
        }
      });
    }

    // Sort by date (newest first for upcoming, oldest first for past)
    result.sort((a, b) => {
      const dateA = new Date(a.startTime).getTime();
      const dateB = new Date(b.startTime).getTime();
      return dateA - dateB;
    });

    return result;
  }, [bookings, searchTerm, filterStatus, filterDate]);

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / pageSize);
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayBookings = bookings.filter((b) => {
      const date = new Date(b.startTime);
      return date >= today && date < tomorrow;
    });

    const upcoming = bookings.filter(
      (b) => new Date(b.startTime) > new Date() && b.status !== "Cancelled"
    );

    const confirmed = bookings.filter((b) => b.status === "Confirmed");
    const cancelled = bookings.filter((b) => b.status === "Cancelled");
    const completed = bookings.filter((b) => b.status === "Completed");

    const totalRevenue = bookings
      .filter((b) => b.status === "Completed" || b.status === "Confirmed")
      .reduce((acc, b) => acc + (b.price || 0), 0);

    return {
      todayCount: todayBookings.length,
      upcomingCount: upcoming.length,
      confirmedCount: confirmed.length,
      cancelledCount: cancelled.length,
      completedCount: completed.length,
      totalRevenue,
    };
  }, [bookings]);

  // Upcoming bookings for sidebar
  const upcomingBookings = useMemo(() => {
    return bookings
      .filter((b) => new Date(b.startTime) > new Date() && b.status !== "Cancelled")
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5);
  }, [bookings]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBookings(paginatedBookings.map((b) => b.id));
    } else {
      setSelectedBookings([]);
    }
  };

  const handleSelectBooking = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedBookings((prev) => [...prev, id]);
    } else {
      setSelectedBookings((prev) => prev.filter((b) => b !== id));
    }
  };

  const handleBulkCancel = async () => {
    if (selectedBookings.length === 0) return;

    try {
      setBookings((prev) =>
        prev.map((b) =>
          selectedBookings.includes(b.id) ? { ...b, status: "Cancelled" } : b
        )
      );
      toast({
        title: "Bookings Cancelled",
        description: `${selectedBookings.length} bookings have been cancelled.`,
      });
      setSelectedBookings([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel bookings",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    const data = filteredBookings.map((b) => ({
      Client: b.clientName,
      Email: b.clientEmail,
      Service: b.serviceName,
      Provider: b.providerName,
      Date: formatDate(b.startTime),
      Time: formatTime(b.startTime),
      Status: b.status,
      Price: formatCurrency(b.price),
    }));

    const csv = [
      Object.keys(data[0] || {}).join(","),
      ...data.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bookings.csv";
    a.click();

    toast({
      title: "Exported",
      description: "Bookings exported to CSV successfully.",
    });
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />

      <main
        className={cn(
          "flex-1 transition-all duration-300",
          sidebarCollapsed ? "ml-0" : "ml-30"
        )}
      >
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-slate-200/50">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">Dashboard</span>
              <ChevronRight size={16} className="text-slate-300" />
              <span className="font-medium text-[#0F172A]">Bookings</span>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
              >
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#23D3EE] rounded-full" />
              </motion.button>

              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#23D3EE] to-[#6366F1] flex items-center justify-center text-white font-semibold text-sm">
                  {user ? getInitials(`${user.firstName} ${user.lastName}`) : "?"}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ============================================ */}
        {/* CONTENT */}
        {/* ============================================ */}
        <div className="p-6 space-y-6">
          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#23D3EE] to-[#6366F1] flex items-center justify-center shadow-lg shadow-[#23D3EE]/25">
                <CalendarDays size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#0F172A]">Bookings</h1>
                <p className="text-slate-500">Manage appointments and schedules</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={loadData}
                className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              >
                <RefreshCw size={18} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              >
                <Download size={18} />
                <span className="font-medium">Export</span>
              </motion.button>

              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-to-r from-[#23D3EE] to-[#23D3EE]/90 hover:from-[#23D3EE]/90 hover:to-[#23D3EE] text-white rounded-xl shadow-lg shadow-[#23D3EE]/25 px-5"
              >
                <Plus size={18} className="mr-2" />
                New Booking
              </Button>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-5 gap-4">
            <StatCard
              title="Today's Bookings"
              value={stats.todayCount}
              subtitle="Scheduled for today"
              icon={CalendarDays}
              color="teal"
              delay={0}
            />
            <StatCard
              title="Upcoming"
              value={stats.upcomingCount}
              subtitle="Future appointments"
              icon={CalendarClock}
              color="gold"
              delay={0.1}
            />
            <StatCard
              title="Confirmed"
              value={stats.confirmedCount}
              subtitle="Ready to go"
              icon={CheckCircle2}
              color="green"
              delay={0.2}
            />
            <StatCard
              title="Completed"
              value={stats.completedCount}
              subtitle="Successfully done"
              icon={BadgeCheck}
              color="blue"
              delay={0.3}
            />
            <StatCard
              title="Revenue"
              value={formatCurrency(stats.totalRevenue)}
              subtitle="From bookings"
              icon={DollarSign}
              color="purple"
              trend={{ value: 15, positive: true }}
              delay={0.4}
            />
          </div>

          <div className="grid grid-cols-4 gap-6">
            {/* Main Content - 3 columns */}
            <div className="col-span-3 space-y-4">
              {/* Filters & Actions Bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Left Side - Search & Filters */}
                  <div className="flex items-center gap-3 flex-1">
                    {/* Search */}
                    <div className="relative max-w-sm flex-1">
                      <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search bookings..."
                        className="h-11 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    {/* Status Filter */}
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="h-11 w-[150px] rounded-xl border-slate-200">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {statusOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className="rounded-lg"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Date Filter */}
                    <Select value={filterDate} onValueChange={setFilterDate}>
                      <SelectTrigger className="h-11 w-[150px] rounded-xl border-slate-200">
                        <SelectValue placeholder="Date" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all" className="rounded-lg">All Dates</SelectItem>
                        <SelectItem value="today" className="rounded-lg">Today</SelectItem>
                        <SelectItem value="tomorrow" className="rounded-lg">Tomorrow</SelectItem>
                        <SelectItem value="week" className="rounded-lg">This Week</SelectItem>
                        <SelectItem value="upcoming" className="rounded-lg">Upcoming</SelectItem>
                        <SelectItem value="past" className="rounded-lg">Past</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Clear Filters */}
                    {(filterStatus !== "all" || filterDate !== "all" || searchTerm) && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => {
                          setSearchTerm("");
                          setFilterStatus("all");
                          setFilterDate("all");
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-[#23D3EE] hover:bg-[#23D3EE]/5 transition-colors"
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
                      {selectedBookings.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex items-center gap-2 pr-3 mr-3 border-r border-slate-200"
                        >
                          <span className="text-sm text-slate-500">
                            {selectedBookings.length} selected
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleBulkCancel}
                            className="h-9 rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <XCircle size={14} className="mr-1" />
                            Cancel
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* View Toggle */}
                    <div className="flex items-center p-1 bg-slate-100 rounded-xl">
                      <button
                        onClick={() => setViewMode("table")}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          viewMode === "table"
                            ? "bg-white text-[#23D3EE] shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        <List size={18} />
                      </button>
                      <button
                        onClick={() => setViewMode("grid")}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          viewMode === "grid"
                            ? "bg-white text-[#23D3EE] shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        <LayoutGrid size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Bookings Content */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
              >
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 size={40} className="animate-spin text-[#23D3EE] mb-4" />
                    <p className="text-slate-500">Loading bookings...</p>
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <EmptyState onAdd={() => setIsModalOpen(true)} />
                ) : viewMode === "table" ? (
                  <>
                    {/* Table View */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="py-4 px-4 text-left">
                              <Checkbox
                                checked={
                                  selectedBookings.length === paginatedBookings.length &&
                                  paginatedBookings.length > 0
                                }
                                onCheckedChange={handleSelectAll}
                                className="border-slate-300 data-[state=checked]:bg-[#23D3EE] data-[state=checked]:border-[#23D3EE]"
                              />
                            </th>
                            <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Client
                            </th>
                            <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Service
                            </th>
                            <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Date & Time
                            </th>
                            <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Provider
                            </th>
                            <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Price
                            </th>
                            <th className="py-4 px-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <AnimatePresence>
                            {paginatedBookings.map((booking) => (
                              <BookingRow
                                key={booking.id}
                                booking={booking}
                                isSelected={selectedBookings.includes(booking.id)}
                                onSelect={(checked) => handleSelectBooking(booking.id, checked)}
                                onView={() => navigate(`/bookings/${booking.id}`)}
                                onEdit={() => navigate(`/bookings/${booking.id}/edit`)}
                                onCancel={() => {
                                  setBookingToCancel(booking);
                                  setCancelDialogOpen(true);
                                }}
                                onReschedule={() => navigate(`/bookings/${booking.id}/reschedule`)}
                                onMarkComplete={() => handleMarkComplete(booking)}
                              />
                            ))}
                          </AnimatePresence>
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>
                          Showing {((currentPage - 1) * pageSize) + 1} to{" "}
                          {Math.min(currentPage * pageSize, filteredBookings.length)} of{" "}
                          {filteredBookings.length}
                        </span>
                        <Select
                          value={String(pageSize)}
                          onValueChange={(v) => {
                            setPageSize(Number(v));
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="h-8 w-[70px] rounded-lg text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {[10, 20, 50, 100].map((size) => (
                              <SelectItem key={size} value={String(size)} className="rounded-lg">
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
                          className="h-9 w-9 p-0 rounded-lg"
                        >
                          <ChevronsLeft size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="h-9 w-9 p-0 rounded-lg"
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
                                  "h-9 w-9 rounded-lg text-sm font-medium transition-all",
                                  currentPage === pageNum
                                    ? "bg-[#23D3EE] text-white shadow-lg shadow-[#23D3EE]/25"
                                    : "text-slate-600 hover:bg-slate-100"
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
                          className="h-9 w-9 p-0 rounded-lg"
                        >
                          <ChevronRight size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className="h-9 w-9 p-0 rounded-lg"
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
                        {paginatedBookings.map((booking, index) => (
                          <motion.div
                            key={booking.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <BookingCard
                              booking={booking}
                              isSelected={selectedBookings.includes(booking.id)}
                              onSelect={(checked) => handleSelectBooking(booking.id, checked)}
                              onView={() => navigate(`/bookings/${booking.id}`)}
                              onEdit={() => navigate(`/bookings/${booking.id}/edit`)}
                              onCancel={() => {
                                setBookingToCancel(booking);
                                setCancelDialogOpen(true);
                              }}
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
                          className="rounded-xl"
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
                                  "h-9 w-9 rounded-lg text-sm font-medium transition-all",
                                  currentPage === pageNum
                                    ? "bg-[#23D3EE] text-white shadow-lg shadow-[#23D3EE]/25"
                                    : "text-slate-600 hover:bg-slate-100"
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
                          className="rounded-xl"
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
              {/* Upcoming Bookings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#0F172A]">Upcoming</h3>
                  <span className="text-xs text-slate-400">{upcomingBookings.length} bookings</span>
                </div>

                <div className="space-y-1">
                  {upcomingBookings.length > 0 ? (
                    upcomingBookings.map((booking, index) => (
                      <motion.div
                        key={booking.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                      >
                        <UpcomingBookingMini
                          booking={booking}
                          onClick={() => navigate(`/bookings/${booking.id}`)}
                        />
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <CalendarX size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm text-slate-400">No upcoming bookings</p>
                    </div>
                  )}
                </div>

                {upcomingBookings.length > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full mt-3 text-[#23D3EE] hover:text-[#23D3EE]/80 hover:bg-[#23D3EE]/5"
                    onClick={() => setFilterDate("upcoming")}
                  >
                    View All Upcoming
                    <ChevronRight size={16} className="ml-1" />
                  </Button>
                )}
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-2xl border border-slate-200 p-5"
              >
                <h3 className="font-semibold text-[#0F172A] mb-4">Quick Actions</h3>

                <div className="space-y-2">
                  {[
                    { icon: CalendarPlus, label: "New Booking", color: "teal", action: () => setIsModalOpen(true) },
                    { icon: CalendarDays, label: "View Calendar", color: "blue", action: () => navigate("/calendar") },
                    { icon: Users, label: "Manage Services", color: "purple", action: () => navigate("/services") },
                    { icon: Settings, label: "Settings", color: "slate", action: () => navigate("/settings/booking") },
                  ].map((action, index) => {
                    const colorClasses: Record<string, string> = {
                      teal: "bg-[#23D3EE]/10 text-[#23D3EE]",
                      blue: "bg-blue-500/10 text-blue-500",
                      purple: "bg-purple-500/10 text-purple-500",
                      slate: "bg-slate-100 text-slate-600",
                    };

                    return (
                      <motion.button
                        key={index}
                        whileHover={{ x: 4 }}
                        onClick={action.action}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                      >
                        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", colorClasses[action.color])}>
                          <action.icon size={18} />
                        </div>
                        <span className="font-medium text-slate-600 group-hover:text-[#0F172A] transition-colors">
                          {action.label}
                        </span>
                        <ChevronRight size={16} className="ml-auto text-slate-300 group-hover:text-slate-500 transition-colors" />
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Status Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-2xl border border-slate-200 p-5"
              >
                <h3 className="font-semibold text-[#0F172A] mb-4">Status Summary</h3>

                <div className="space-y-3">
                  {[
                    { label: "Confirmed", count: stats.confirmedCount, color: "green" },
                    { label: "Completed", count: stats.completedCount, color: "blue" },
                    { label: "Cancelled", count: stats.cancelledCount, color: "red" },
                  ].map((status, index) => {
                    const total = bookings.length || 1;
                    const percentage = (status.count / total) * 100;
                    const colorClasses: Record<string, string> = {
                      green: "bg-green-500",
                      blue: "bg-blue-500",
                      red: "bg-red-500",
                    };

                    return (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-600">{status.label}</span>
                          <span className="text-sm font-semibold text-[#0F172A]">{status.count}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                            className={cn("h-full rounded-full", colorClasses[status.color])}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Pro Tip */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="p-4 bg-gradient-to-br from-[#23D3EE]/5 to-[#FBBF23]/5 rounded-2xl border border-[#23D3EE]/20"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#23D3EE]/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={16} className="text-[#23D3EE]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#0F172A] text-sm mb-1">Pro Tip</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Send automated reminders 24 hours before appointments to reduce no-shows by up to 50%.
                    </p>
                    <button className="mt-2 text-xs font-medium text-[#23D3EE] hover:underline">
                      Enable Reminders →
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* DIALOGS */}
        {/* ============================================ */}

        {/* Create Booking Wizard */}
        <CreateBookingWizard
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateBooking}
          services={services}
          providers={providers}
        />

        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <XCircle size={24} className="text-red-600" />
              </div>
              <AlertDialogTitle className="text-center text-[#0F172A]">
                Cancel Booking
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                Are you sure you want to cancel the booking with{" "}
                <span className="font-semibold text-[#0F172A]">
                  {bookingToCancel?.clientName}
                </span>
                ? They will be notified about this cancellation.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 sm:justify-center">
              <AlertDialogCancel className="rounded-xl">Keep Booking</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelBooking}
                disabled={isCancelling}
                className="bg-red-600 hover:bg-red-700 rounded-xl"
              >
                {isCancelling ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle size={16} className="mr-2" />
                    Cancel Booking
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default BookingsPage;
