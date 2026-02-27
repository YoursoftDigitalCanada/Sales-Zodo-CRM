// src/pages/Bookings.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
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
import { getBookings, createBooking, cancelBooking, confirmBooking } from "@/features/bookings";
import { getUsers } from "@/features/users";

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
    completed: { bg: "bg-blue-100", text: "text-[#0891B2]", dot: "bg-[#0891B2]", icon: BadgeCheck },
    no_show: { bg: "bg-white/5", text: "text-[#475569]", dot: "bg-[#F8FAFC]0", icon: UserX },
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

      {/* Client */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] font-semibold text-sm">
            {getInitials(booking.clientName)}
          </div>
          <div>
            <p className="font-semibold text-[#0F172A] group-hover:text-[#0891B2] transition-colors">
              {booking.clientName}
            </p>
            <p className="text-xs text-[#475569]">{booking.clientEmail}</p>
          </div>
        </div>
      </td>

      {/* Service */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
            <Briefcase size={14} className="text-[#0891B2]" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">{booking.serviceName}</p>
            {booking.duration && (
              <p className="text-xs text-[#475569]">{booking.duration} min</p>
            )}
          </div>
        </div>
      </td>

      {/* Date & Time */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center",
            today ? "bg-[#0891B2]/10" : "bg-white/5"
          )}>
            <CalendarDays size={14} className={today ? "text-[#0891B2]" : "text-[#94A3B8]"} />
          </div>
          <div>
            <p className={cn(
              "text-sm font-medium",
              today ? "text-[#0891B2]" : "text-slate-200"
            )}>
              {formatDate(booking.startTime)}
              {today && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-[#0891B2]/10 text-[#0891B2] text-[10px] font-semibold">
                  TODAY
                </span>
              )}
            </p>
            <p className="text-xs text-[#475569]">{formatTime(booking.startTime)}</p>
          </div>
        </div>
      </td>

      {/* Provider */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center text-[#475569] text-xs font-semibold">
            {getInitials(booking.providerName)}
          </div>
          <span className="text-sm text-[#475569]">{booking.providerName}</span>
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
                className="p-2 rounded-md hover:bg-green-100 text-green-600 transition-colors"
                title="Mark Complete"
              >
                <CheckCircle2 size={16} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onReschedule}
                className="p-2 rounded-md hover:bg-blue-100 text-[#0891B2] transition-colors"
                title="Reschedule"
              >
                <CalendarClock size={16} />
              </motion.button>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-md hover:bg-white/10 text-[#475569] transition-colors">
                <MoreVertical size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-md">
              <DropdownMenuItem onClick={onView} className="rounded-md">
                <Eye size={14} className="mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="rounded-md">
                <Pencil size={14} className="mr-2" />
                Edit Booking
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-md">
                <Send size={14} className="mr-2" />
                Send Reminder
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-md">
                <MessageSquare size={14} className="mr-2" />
                Send Message
              </DropdownMenuItem>
              {booking.isOnline && booking.meetingLink && (
                <DropdownMenuItem className="rounded-md">
                  <Video size={14} className="mr-2" />
                  Join Meeting
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {booking.status !== "Cancelled" && (
                <DropdownMenuItem
                  className="rounded-md text-red-600 focus:text-red-600 focus:bg-red-50"
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
        "bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden cursor-pointer group",
        "hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all",
        isSelected && "border-[#22D3EE] bg-[#0891B2]/5"
      )}
      onClick={onView}
    >
      {/* Time Banner */}
      <div className={cn(
        "px-4 py-2 flex items-center justify-between",
        today ? "bg-[#0891B2]/10" : "bg-[#F8FAFC]"
      )}>
        <div className="flex items-center gap-2">
          <Clock size={14} className={today ? "text-[#0891B2]" : "text-[#94A3B8]"} />
          <span className={cn(
            "text-sm font-semibold",
            today ? "text-[#0891B2]" : "text-[#475569]"
          )}>
            {formatTime(booking.startTime)}
          </span>
          {today && (
            <span className="px-1.5 py-0.5 rounded bg-[#0891B2] text-white text-[10px] font-semibold">
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
              className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
            />
            <div className="w-11 h-11 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] font-bold text-sm">
              {getInitials(booking.clientName)}
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
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="rounded-md">
                <Pencil size={14} className="mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="rounded-md text-red-600"
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
          <h3 className="font-semibold text-[#0F172A] group-hover:text-[#0891B2] transition-colors mb-0.5">
            {booking.clientName}
          </h3>
          <p className="text-xs text-[#475569]">{booking.clientEmail}</p>
        </div>

        {/* Service & Provider */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <Briefcase size={14} className="text-[#0891B2]" />
            <span className="text-[#475569]">{booking.serviceName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User size={14} className="text-[#D97706]" />
            <span className="text-[#475569]">{booking.providerName}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[rgba(15,23,42,0.06)]">
          <span className="text-sm font-bold text-[#0F172A]">
            {formatCurrency(booking.price)}
          </span>
          <span className="text-xs text-[#475569]">
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
      className="flex items-center gap-3 p-3 rounded-md hover:bg-[#F8FAFC] cursor-pointer transition-colors group"
    >
      <div className={cn(
        "w-12 h-12 rounded-md flex flex-col items-center justify-center text-center",
        today ? "bg-[#0891B2]/10" : "bg-white/5"
      )}>
        <span className={cn(
          "text-xs font-semibold",
          today ? "text-[#0891B2]" : "text-[#94A3B8]"
        )}>
          {new Date(booking.startTime).toLocaleDateString("en-US", { month: "short" })}
        </span>
        <span className={cn(
          "text-lg font-bold -mt-1",
          today ? "text-[#0891B2]" : "text-slate-200"
        )}>
          {new Date(booking.startTime).getDate()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[#0F172A] truncate group-hover:text-[#0891B2] transition-colors">
          {booking.clientName}
        </p>
        <p className="text-xs text-[#94A3B8]">
          {formatTime(booking.startTime)} • {booking.serviceName}
        </p>
      </div>
      <ChevronRight size={16} className="text-[#475569] group-hover:text-[#0891B2] transition-colors" />
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
      <DialogContent className="sm:max-w-[600px] p-0 rounded-md overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F1F5F9]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              New Booking
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
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
                          ? "#22D3EE"
                          : isActive
                            ? "#22D3EE"
                            : "#f1f5f9",
                      }}
                      className={cn(
                        "w-10 h-10 rounded-md flex items-center justify-center transition-all",
                        (isActive || isCompleted) ? "text-[#0F172A]" : "text-[#475569]"
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
                      isActive ? "text-[#0891B2]" : "text-[#475569]"
                    )}>
                      {s.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "w-12 h-0.5 mx-2 rounded transition-colors",
                      step > s.num ? "bg-[#0891B2]" : "bg-slate-200"
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
                  <Label className="text-sm font-medium text-[#475569]">
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
                          "relative p-4 rounded-md border-2 text-left transition-all",
                          selectedService?.id === service.id
                            ? "border-[#22D3EE] bg-[#0891B2]/5"
                            : "border-[rgba(15,23,42,0.06)] hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="w-8 h-8 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
                            <Briefcase size={16} className="text-[#0891B2]" />
                          </div>
                          <span className="text-lg font-bold text-[#0891B2]">
                            ${service.price}
                          </span>
                        </div>
                        <p className="font-semibold text-[#0F172A] mb-1">{service.name}</p>
                        {service.duration && (
                          <p className="text-xs text-[#475569]">{service.duration} minutes</p>
                        )}
                        {selectedService?.id === service.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-[#0891B2] rounded-full flex items-center justify-center"
                          >
                            <CheckCircle2 size={14} className="text-[#0F172A]" />
                          </motion.div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Provider Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-[#475569]">
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
                          "w-full flex items-center gap-3 p-3 rounded-md border-2 text-left transition-all",
                          selectedProvider?.id === provider.id
                            ? "border-[#22D3EE] bg-[#0891B2]/5"
                            : "border-[rgba(15,23,42,0.06)] hover:border-slate-300"
                        )}
                      >
                        <div className="w-10 h-10 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] font-semibold text-sm">
                          {getInitials(provider.name)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-[#0F172A]">{provider.name}</p>
                          {provider.specialty && (
                            <p className="text-xs text-[#475569]">{provider.specialty}</p>
                          )}
                        </div>
                        {provider.available && (
                          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-600 text-xs font-medium">
                            Available
                          </span>
                        )}
                        {selectedProvider?.id === provider.id && (
                          <CheckCircle2 size={18} className="text-[#0891B2]" />
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
                  <Label className="text-sm font-medium text-[#475569]">
                    Select Date <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="h-12 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                    />
                  </div>
                </div>

                {/* Time Slots */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">
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
                          "p-3 rounded-md text-sm font-medium transition-all",
                          time === slot.time
                            ? "bg-[#0891B2] text-white "
                            : slot.available
                              ? "bg-white/5 text-slate-200 hover:bg-slate-200"
                              : "bg-[#F8FAFC] text-[#475569] cursor-not-allowed"
                        )}
                      >
                        {slot.time}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Meeting Type */}
                <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
                      <Video size={18} className="text-[#0891B2]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#0F172A]">Online Meeting</p>
                      <p className="text-xs text-[#94A3B8]">Generate video call link</p>
                    </div>
                  </div>
                  <Checkbox
                    checked={isOnline}
                    onCheckedChange={(checked) => setIsOnline(checked as boolean)}
                    className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
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
                  <Label className="text-sm font-medium text-[#475569]">
                    Client Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                    <Input
                      value={clientDetails.name}
                      onChange={(e) => setClientDetails({ ...clientDetails, name: e.target.value })}
                      placeholder="John Doe"
                      className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                    <Input
                      type="email"
                      value={clientDetails.email}
                      onChange={(e) => setClientDetails({ ...clientDetails, email: e.target.value })}
                      placeholder="john@example.com"
                      className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Phone</Label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                    <Input
                      value={clientDetails.phone}
                      onChange={(e) => setClientDetails({ ...clientDetails, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Notes</Label>
                  <Textarea
                    value={clientDetails.notes}
                    onChange={(e) => setClientDetails({ ...clientDetails, notes: e.target.value })}
                    placeholder="Any special requests or notes..."
                    rows={3}
                    className="rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20 resize-none"
                  />
                </div>

                {/* Send Reminder */}
                <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-[#D97706]/10 flex items-center justify-center">
                      <Bell size={18} className="text-[#D97706]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#0F172A]">Send Reminder</p>
                      <p className="text-xs text-[#94A3B8]">Email reminder 24h before</p>
                    </div>
                  </div>
                  <Checkbox
                    checked={sendReminder}
                    onCheckedChange={(checked) => setSendReminder(checked as boolean)}
                    className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
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
                  <div className="w-16 h-16 rounded-md bg-[#0891B2]/10 flex items-center justify-center mx-auto mb-4">
                    <CalendarCheck size={32} className="text-[#0891B2]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0F172A]">Review Booking</h3>
                  <p className="text-sm text-[#94A3B8]">Please confirm the details below</p>
                </div>

                <div className="bg-[#F8FAFC] rounded-md p-4 space-y-4">
                  {/* Service */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
                        <Briefcase size={14} className="text-[#0891B2]" />
                      </div>
                      <span className="text-sm text-[#94A3B8]">Service</span>
                    </div>
                    <span className="font-medium text-[#0F172A]">{selectedService?.name}</span>
                  </div>

                  {/* Provider */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-[#D97706]/10 flex items-center justify-center">
                        <User size={14} className="text-[#D97706]" />
                      </div>
                      <span className="text-sm text-[#94A3B8]">Provider</span>
                    </div>
                    <span className="font-medium text-[#0F172A]">{selectedProvider?.name}</span>
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center">
                        <CalendarDays size={14} className="text-[#0891B2]" />
                      </div>
                      <span className="text-sm text-[#94A3B8]">Date & Time</span>
                    </div>
                    <span className="font-medium text-[#0F172A]">
                      {date && new Date(date).toLocaleDateString()} at {time}
                    </span>
                  </div>

                  {/* Client */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-purple-100 flex items-center justify-center">
                        <UserCheck size={14} className="text-purple-600" />
                      </div>
                      <span className="text-sm text-[#94A3B8]">Client</span>
                    </div>
                    <span className="font-medium text-[#0F172A]">{clientDetails.name}</span>
                  </div>

                  {/* Meeting Type */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-green-100 flex items-center justify-center">
                        {isOnline ? <Video size={14} className="text-green-600" /> : <MapPin size={14} className="text-green-600" />}
                      </div>
                      <span className="text-sm text-[#94A3B8]">Location</span>
                    </div>
                    <span className="font-medium text-[#0F172A]">
                      {isOnline ? "Online Meeting" : "In Person"}
                    </span>
                  </div>
                </div>

                {/* Price Summary */}
                <div className="flex items-center justify-between p-4 bg-[#0891B2]/10 rounded-md">
                  <span className="font-medium text-[#0F172A]">Total Amount</span>
                  <span className="text-xl sm:text-2xl font-bold text-[#0891B2]">
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
              className="rounded-md"
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
              className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md flex-1"
            >
              Continue
              <ChevronRight size={16} className="ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#F1F5F9]/90 hover:from-[#22D3EE]/90 hover:to-[#22D3EE] text-[#0F172A] rounded-md  flex-1"
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
    <div className="w-20 h-20 rounded-md bg-[#F1F5F9] flex items-center justify-center mb-6">
      <CalendarDays size={40} className="text-[#0891B2]" />
    </div>
    <h3 className="text-xl font-semibold text-[#0F172A] mb-2">No bookings yet</h3>
    <p className="text-[#94A3B8] text-center max-w-sm mb-6">
      Start scheduling appointments by creating your first booking.
    </p>
    <Button
      onClick={onAdd}
      className="bg-[#F1F5F9]/90 hover:from-[#22D3EE]/90 hover:to-[#22D3EE] text-[#0F172A] rounded-md "
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
      const [bookingsData, usersData] = await Promise.all([
        getBookings() as Promise<any[]>,
        getUsers() as Promise<any[]>,
      ]);

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
          price: b.price || 0,
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

      await createBooking({
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
      await cancelBooking(bookingToCancel.id);

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
      await confirmBooking(booking.id);
      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id ? { ...b, status: "confirmed" } : b
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
      await Promise.all(
        selectedBookings.map((id) => cancelBooking(id))
      );
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
    <div className="min-h-screen bg-[#F8FAFC]">
<main
        className={cn(
          "flex-1 transition-all duration-300"
        )}
      >
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-[rgba(15,23,42,0.06)]/50">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#475569]">Dashboard</span>
              <ChevronRight size={16} className="text-[#475569]" />
              <span className="font-medium text-[#0F172A]">Bookings</span>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2 rounded-md hover:bg-white/10 text-[#475569] transition-colors"
              >
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#0891B2] rounded-full" />
              </motion.button>

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
          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-md bg-[#F1F5F9] flex items-center justify-center ">
                <CalendarDays size={24} className="text-[#0F172A]" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Bookings</h1>
                <p className="text-[#94A3B8]">Manage appointments and schedules</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={loadData}
                className="p-2.5 rounded-md border border-[rgba(15,23,42,0.06)] hover:bg-[#F8FAFC] text-[#475569] transition-colors"
              >
                <RefreshCw size={18} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-[rgba(15,23,42,0.06)] hover:bg-[#F8FAFC] text-[#475569] transition-colors"
              >
                <Download size={18} />
                <span className="font-medium">Export</span>
              </motion.button>

              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-[#F1F5F9]/90 hover:from-[#22D3EE]/90 hover:to-[#22D3EE] text-[#0F172A] rounded-md  px-5"
              >
                <Plus size={18} className="mr-2" />
                New Booking
              </Button>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
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
                        placeholder="Search bookings..."
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
                      <SelectTrigger className="h-11 w-[150px] rounded-md border-[rgba(15,23,42,0.06)]">
                        <SelectValue placeholder="Date" />
                      </SelectTrigger>
                      <SelectContent className="rounded-md">
                        <SelectItem value="all" className="rounded-md">All Dates</SelectItem>
                        <SelectItem value="today" className="rounded-md">Today</SelectItem>
                        <SelectItem value="tomorrow" className="rounded-md">Tomorrow</SelectItem>
                        <SelectItem value="week" className="rounded-md">This Week</SelectItem>
                        <SelectItem value="upcoming" className="rounded-md">Upcoming</SelectItem>
                        <SelectItem value="past" className="rounded-md">Past</SelectItem>
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
                      {selectedBookings.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex items-center gap-2 pr-3 mr-3 border-r border-[rgba(15,23,42,0.06)]"
                        >
                          <span className="text-sm text-[#94A3B8]">
                            {selectedBookings.length} selected
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleBulkCancel}
                            className="h-9 rounded-md border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <XCircle size={14} className="mr-1" />
                            Cancel
                          </Button>
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

              {/* Bookings Content */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden"
              >
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 size={40} className="animate-spin text-[#0891B2] mb-4" />
                    <p className="text-[#94A3B8]">Loading bookings...</p>
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <EmptyState onAdd={() => setIsModalOpen(true)} />
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
                                  selectedBookings.length === paginatedBookings.length &&
                                  paginatedBookings.length > 0
                                }
                                onCheckedChange={handleSelectAll}
                                className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
                              />
                            </th>
                            <th className="py-4 px-4 text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                              Client
                            </th>
                            <th className="py-4 px-4 text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                              Service
                            </th>
                            <th className="py-4 px-4 text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                              Date & Time
                            </th>
                            <th className="py-4 px-4 text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                              Provider
                            </th>
                            <th className="py-4 px-4 text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                              Status
                            </th>
                            <th className="py-4 px-4 text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                              Price
                            </th>
                            <th className="py-4 px-4 text-right text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
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
                    <div className="flex items-center justify-between px-6 py-4 border-t border-[rgba(15,23,42,0.06)]">
                      <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
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
              {/* Upcoming Bookings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#0F172A]">Upcoming</h3>
                  <span className="text-xs text-[#475569]">{upcomingBookings.length} bookings</span>
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
                      <CalendarX size={32} className="mx-auto text-[#475569] mb-2" />
                      <p className="text-sm text-[#475569]">No upcoming bookings</p>
                    </div>
                  )}
                </div>

                {upcomingBookings.length > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full mt-3 text-[#0891B2] hover:text-[#0891B2]/80 hover:bg-[#0891B2]/5"
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
                className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5"
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
                      teal: "bg-[#0891B2]/10 text-[#0891B2]",
                      blue: "bg-[#0891B2]/10 text-blue-500",
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

              {/* Status Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5"
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
                      blue: "bg-[#0891B2]",
                      red: "bg-red-500",
                    };

                    return (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-[#475569]">{status.label}</span>
                          <span className="text-sm font-semibold text-[#0F172A]">{status.count}</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
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
                className="p-4 bg-[#F1F5F9] rounded-md border border-[#22D3EE]/20"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-[#0891B2]/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={16} className="text-[#0891B2]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#0F172A] text-sm mb-1">Pro Tip</p>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      Send automated reminders 24 hours before appointments to reduce no-shows by up to 50%.
                    </p>
                    <button className="mt-2 text-xs font-medium text-[#0891B2] hover:underline">
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
          <AlertDialogContent className="rounded-md">
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
              <AlertDialogCancel className="rounded-md">Keep Booking</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelBooking}
                disabled={isCancelling}
                className="bg-red-600 hover:bg-red-700 rounded-md"
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
