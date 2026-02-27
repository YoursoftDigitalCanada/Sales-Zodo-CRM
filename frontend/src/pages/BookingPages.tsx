// src/pages/BookingPages.tsx
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  LayoutGrid,
  List,
  ChevronDown,
  ChevronRight,
  Download,
  RefreshCw,
  X,
  Sparkles,
  Copy,
  ExternalLink,
  Calendar,
  Star,
  StarOff,
  Clock,
  Globe,
  Link2,
  Share2,
  QrCode,
  Palette,
  Layout,
  Settings,
  CheckCircle2,
  CalendarDays,
  CalendarCheck,
  CalendarClock,
  Timer,
  Video,
  MapPin,
  Phone,
  Mail,
  ArrowUpRight,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  MousePointerClick,
  Eye as EyeIcon,
  UserPlus,
  FileText,
  Image,
  Brush,
  Monitor,
  Smartphone,
  Sun,
  Moon,
  Layers,
  Grid3X3,
  AlignLeft,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getBookings } from "@/features/bookings";
import { getUsers } from "@/features/users";

// ============================================
// TYPES
// ============================================

interface BookingPage {
  id: number;
  title: string;
  description: string;
  ownerUserId: number;
  themeName: string;
  createdAt: string;
  slug?: string;
  isActive?: boolean;
  views?: number;
  bookings?: number;
  eventTypes?: number;
  lastUpdated?: string;
  coverImage?: string;
  logoUrl?: string;
  primaryColor?: string;
  layout?: "list" | "grid";
}

interface UserProfile {
  id: number;
  fullName?: string;
  fullname?: string;
  email: string;
  avatar?: string;
  role?: string;
  department?: string;
  bookingPageSlug?: string;
  eventTypesCount?: number;
  totalBookings?: number;
  isOnline?: boolean;
}

interface ThemeOption {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  preview: string;
}

interface LayoutOption {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
}

interface AppUser {
  firstName: string;
  lastName: string;
}

// ============================================
// CONSTANTS
// ============================================

const themeOptions: ThemeOption[] = [
  { id: "default", name: "Default", primaryColor: "#22D3EE", secondaryColor: "#FBBF24", preview: "bg-[#F1F5F9]" },
  { id: "ocean", name: "Ocean", primaryColor: "#0EA5E9", secondaryColor: "#06B6D4", preview: "r from-sky-500 to-cyan-500" },
  { id: "forest", name: "Forest", primaryColor: "#22C55E", secondaryColor: "#10B981", preview: "r from-green-500 to-emerald-500" },
  { id: "sunset", name: "Sunset", primaryColor: "#F97316", secondaryColor: "#EAB308", preview: "r from-orange-500 to-yellow-500" },
  { id: "purple", name: "Purple", primaryColor: "#8B5CF6", secondaryColor: "#A855F7", preview: "r from-violet-500 to-purple-500" },
  { id: "rose", name: "Rose", primaryColor: "#F43F5E", secondaryColor: "#EC4899", preview: "r from-rose-500 to-pink-500" },
  { id: "slate", name: "Slate", primaryColor: "#64748B", secondaryColor: "#475569", preview: "r from-slate-500 to-slate-600" },
  { id: "midnight", name: "Midnight", primaryColor: "#1a1a2e", secondaryColor: "#1E3A5F", preview: "bg-[#F1F5F9]" },
];

const layoutOptions: LayoutOption[] = [
  { id: "list", name: "List View", icon: AlignLeft, description: "Show events in a vertical list" },
  { id: "grid", name: "Grid View", icon: Grid3X3, description: "Show events in a grid layout" },
  { id: "cards", name: "Card View", icon: Layers, description: "Large cards with descriptions" },
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

const getRelativeTime = (dateString?: string) => {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return date.toLocaleDateString();
};

const generateSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

const copyToClipboard = async (text: string) => {
  await navigator.clipboard.writeText(text);
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
  color: "teal" | "gold" | "navy" | "purple" | "green" | "blue";
  trend?: { value: number; positive: boolean };
  delay?: number;
}) => {
  const colorClasses = {
    teal: { bg: "bg-[#0891B2]", light: "bg-[#0891B2]/10", text: "text-[#0891B2]" },
    gold: { bg: "bg-[#D97706]", light: "bg-[#D97706]/10", text: "text-[#D97706]" },
    navy: { bg: "bg-[#F8FAFC]", light: "bg-[#F8FAFC]/10", text: "text-[#0F172A]" },
    purple: { bg: "bg-purple-500", light: "bg-purple-500/10", text: "text-purple-500" },
    green: { bg: "bg-green-500", light: "bg-green-500/10", text: "text-green-500" },
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
                <TrendingUp size={12} className={!trend.positive ? "rotate-180" : ""} />
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
// WORKSPACE BOOKING PAGE CARD
// ============================================

const WorkspaceBookingCard = ({
  pages,
  onOpenPage,
  onShare,
  onCustomize,
  onSearch,
  searchTerm,
}: {
  pages: BookingPage[];
  onOpenPage: () => void;
  onShare: () => void;
  onCustomize: () => void;
  onSearch: (term: string) => void;
  searchTerm: string;
}) => {
  const totalViews = pages.reduce((acc, p) => acc + (p.views || 0), 0);
  const totalBookings = pages.reduce((acc, p) => acc + (p.bookings || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all"
    >
      {/* Header with gradient */}
      <div className="relative h-24 bg-[#F1F5F9] p-5">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-md bg-white/20 backdrop-blur-sm flex items-center justify-center text-[#0F172A] font-bold text-xl border border-white/30">
              ZS
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#0F172A]">Zylker Sales</h2>
              <p className="text-[#0F172A]/80 text-sm">Workspace Booking Page</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-[#0F172A] text-xs font-medium border border-white/30">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block mr-1.5 animate-pulse" />
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Description */}
        <p className="text-[#94A3B8] text-sm mb-5">
          This is the workspace booking page. It lists all the event types under this workspace and allows clients to book appointments.
        </p>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          <div className="bg-[#F8FAFC] rounded-md p-3 text-center">
            <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">{pages.length}</p>
            <p className="text-xs text-[#94A3B8]">Event Types</p>
          </div>
          <div className="bg-[#F8FAFC] rounded-md p-3 text-center">
            <p className="text-xl sm:text-2xl font-bold text-[#0891B2]">{totalViews}</p>
            <p className="text-xs text-[#94A3B8]">Total Views</p>
          </div>
          <div className="bg-[#F8FAFC] rounded-md p-3 text-center">
            <p className="text-xl sm:text-2xl font-bold text-[#D97706]">{totalBookings}</p>
            <p className="text-xs text-[#94A3B8]">Bookings</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-5">
          <Button
            onClick={onOpenPage}
            className="flex-1 bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md h-10"
          >
            <ExternalLink size={16} className="mr-2" />
            Open Page
          </Button>
          <Button
            variant="outline"
            onClick={onShare}
            className="flex-1 rounded-md h-10 border-[rgba(15,23,42,0.06)]"
          >
            <Share2 size={16} className="mr-2" />
            Share
          </Button>
          <Button
            variant="outline"
            onClick={onCustomize}
            className="rounded-md h-10 w-10 p-0 border-[rgba(15,23,42,0.06)]"
          >
            <Palette size={16} />
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
          <Input
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search event types..."
            className="h-10 pl-9 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
          />
        </div>

        {/* Event Types List */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          <AnimatePresence>
            {pages.length > 0 ? (
              pages.map((page, index) => (
                <motion.div
                  key={page.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-md hover:bg-[#F8FAFC] cursor-pointer group transition-colors"
                >
                  <div className="w-10 h-10 rounded-md bg-[#F1F5F9] flex items-center justify-center">
                    <CalendarDays size={18} className="text-[#0891B2]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#0F172A] truncate group-hover:text-[#0891B2] transition-colors">
                      {page.title}
                    </p>
                    <p className="text-xs text-[#475569] truncate">
                      {page.description || "No description"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-[#475569]">{page.bookings || 0} bookings</span>
                    <ChevronRight size={16} className="text-[#475569]" />
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8">
                <CalendarDays size={40} className="mx-auto text-[#475569] mb-3" />
                <p className="text-[#94A3B8]">No event types found</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// USER BOOKING CARD COMPONENT
// ============================================

const UserBookingCard = ({
  user,
  onOpenPage,
  onShare,
  onEdit,
  delay = 0,
}: {
  user: UserProfile;
  onOpenPage: () => void;
  onShare: () => void;
  onEdit: () => void;
  delay?: number;
}) => {
  const displayName = user.fullName || user.fullname || "Unknown User";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5 hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all group"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={displayName}
              className="w-14 h-14 rounded-md object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] font-bold text-lg">
              {getInitials(displayName)}
            </div>
          )}
          {user.isOnline && (
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-[#0F172A] truncate group-hover:text-[#0891B2] transition-colors">
              {displayName}
            </h3>
            {user.role && (
              <span className="px-2 py-0.5 rounded-md bg-white/5 text-[#94A3B8] text-xs">
                {user.role}
              </span>
            )}
          </div>
          <p className="text-sm text-[#94A3B8] truncate">{user.email}</p>
          <p className="text-xs text-[#475569] mt-2">
            Your unique booking page with all your event types.
          </p>
        </div>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded-md hover:bg-white/10 text-[#475569] opacity-0 group-hover:opacity-100 transition-all">
              <MoreVertical size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-md">
            <DropdownMenuItem onClick={onOpenPage} className="rounded-md">
              <ExternalLink size={14} className="mr-2" />
              Open Page
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShare} className="rounded-md">
              <Share2 size={14} className="mr-2" />
              Share Link
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-md">
              <QrCode size={14} className="mr-2" />
              Get QR Code
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onEdit} className="rounded-md">
              <Pencil size={14} className="mr-2" />
              Edit Profile
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-1.5 text-sm">
          <CalendarDays size={14} className="text-[#0891B2]" />
          <span className="text-[#475569]">{user.eventTypesCount || 0} Events</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <CalendarCheck size={14} className="text-[#D97706]" />
          <span className="text-[#475569]">{user.totalBookings || 0} Bookings</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 mt-4">
        <Button
          onClick={onOpenPage}
          size="sm"
          className="flex-1 bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md h-9"
        >
          <ExternalLink size={14} className="mr-1.5" />
          Open Page
        </Button>
        <Button
          onClick={onShare}
          size="sm"
          variant="outline"
          className="flex-1 rounded-md h-9 border-[rgba(15,23,42,0.06)]"
        >
          <Share2 size={14} className="mr-1.5" />
          Share
        </Button>
      </div>
    </motion.div>
  );
};

// ============================================
// THEME CUSTOMIZATION DIALOG
// ============================================

const ThemeCustomizationDialog = ({
  isOpen,
  onClose,
  currentTheme,
  currentLayout,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  currentLayout: string;
  onSave: (theme: string, layout: string) => void;
}) => {
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  const [selectedLayout, setSelectedLayout] = useState(currentLayout);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    setSelectedTheme(currentTheme);
    setSelectedLayout(currentLayout);
  }, [currentTheme, currentLayout, isOpen]);

  const handleSave = () => {
    onSave(selectedTheme, selectedLayout);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0 rounded-md overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              Customize Booking Page
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Choose a theme and layout for your booking page
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6">
          <Tabs defaultValue="theme" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 rounded-md bg-white/5 p-1">
              <TabsTrigger value="theme" className="rounded-md data-[state=active]:bg-white">
                <Palette size={16} className="mr-2" />
                Theme
              </TabsTrigger>
              <TabsTrigger value="layout" className="rounded-md data-[state=active]:bg-white">
                <Layout size={16} className="mr-2" />
                Layout
              </TabsTrigger>
            </TabsList>

            {/* Theme Tab */}
            <TabsContent value="theme" className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {themeOptions.map((theme) => (
                  <motion.button
                    key={theme.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={cn(
                      "relative p-3 rounded-md border-2 transition-all",
                      selectedTheme === theme.id
                        ? "border-[#22D3EE] bg-[#0891B2]/5"
                        : "border-[rgba(15,23,42,0.06)] hover:border-slate-300"
                    )}
                  >
                    <div className={cn("w-full h-12 rounded-md mb-2", theme.preview)} />
                    <p className="text-sm font-medium text-[#0F172A]">{theme.name}</p>
                    {selectedTheme === theme.id && (
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
            </TabsContent>

            {/* Layout Tab */}
            <TabsContent value="layout" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {layoutOptions.map((layout) => {
                  const Icon = layout.icon;
                  return (
                    <motion.button
                      key={layout.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedLayout(layout.id)}
                      className={cn(
                        "relative p-4 rounded-md border-2 text-left transition-all",
                        selectedLayout === layout.id
                          ? "border-[#22D3EE] bg-[#0891B2]/5"
                          : "border-[rgba(15,23,42,0.06)] hover:border-slate-300"
                      )}
                    >
                      <div className="w-10 h-10 rounded-md bg-white/5 flex items-center justify-center mb-3">
                        <Icon size={20} className="text-[#475569]" />
                      </div>
                      <p className="font-medium text-[#0F172A] mb-1">{layout.name}</p>
                      <p className="text-xs text-[#94A3B8]">{layout.description}</p>
                      {selectedLayout === layout.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-[#0891B2] rounded-full flex items-center justify-center"
                        >
                          <CheckCircle2 size={14} className="text-[#0F172A]" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          {/* Preview Section */}
          <div className="mt-6 pt-6 border-t border-[rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-[#0F172A]">Preview</h4>
              <div className="flex items-center p-1 bg-white/5 rounded-md">
                <button
                  onClick={() => setPreviewMode("desktop")}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    previewMode === "desktop" ? "bg-white text-[#0891B2] shadow-sm" : "text-[#94A3B8]"
                  )}
                >
                  <Monitor size={16} />
                </button>
                <button
                  onClick={() => setPreviewMode("mobile")}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    previewMode === "mobile" ? "bg-white text-[#0891B2] shadow-sm" : "text-[#94A3B8]"
                  )}
                >
                  <Smartphone size={16} />
                </button>
              </div>
            </div>

            <div className={cn(
              "bg-[#F8FAFC] rounded-md p-4 flex items-center justify-center",
              previewMode === "mobile" ? "max-w-[280px] mx-auto" : ""
            )}>
              <div className={cn(
                "bg-white rounded-md card-shadow overflow-hidden w-full",
                previewMode === "mobile" ? "max-w-[240px]" : "max-w-[400px]"
              )}>
                {/* Mini Preview Header */}
                <div className={cn(
                  "h-12",
                  themeOptions.find(t => t.id === selectedTheme)?.preview || "bg-[#F1F5F9]"
                )} />
                {/* Mini Preview Content */}
                <div className="p-3">
                  <div className="h-3 bg-slate-200 rounded w-3/4 mb-2" />
                  <div className="h-2 bg-white/5 rounded w-1/2 mb-4" />
                  <div className={cn(
                    "gap-2",
                    selectedLayout === "grid" ? "grid grid-cols-2" : "space-y-2"
                  )}>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-8 bg-white/5 rounded" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-6 pt-0 gap-3">
          <Button variant="outline" onClick={onClose} className="rounded-md">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
          >
            <Sparkles size={16} className="mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// SHARE DIALOG
// ============================================

const ShareDialog = ({
  isOpen,
  onClose,
  pageUrl,
  pageTitle,
}: {
  isOpen: boolean;
  onClose: () => void;
  pageUrl: string;
  pageTitle: string;
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(pageUrl);
    setCopied(true);
    toast({
      title: "Link Copied!",
      description: "The booking page link has been copied to your clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOptions = [
    { name: "Email", icon: Mail, action: () => window.open(`mailto:?subject=Book a meeting with ${pageTitle}&body=${pageUrl}`) },
    { name: "LinkedIn", icon: Globe, action: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`) },
    { name: "Twitter", icon: Globe, action: () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=Book a meeting with ${pageTitle}`) },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] p-0 rounded-md overflow-hidden">
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              Share Booking Page
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Share your booking page link with others
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5">
          {/* Copy Link */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Page Link</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  value={pageUrl}
                  readOnly
                  className="h-11 pl-10 pr-4 rounded-md border-[rgba(15,23,42,0.06)] bg-[#F8FAFC]"
                />
              </div>
              <Button
                onClick={handleCopy}
                className={cn(
                  "rounded-md h-11 px-4 transition-all",
                  copied
                    ? "bg-green-500 hover:bg-green-500 text-[#0F172A]"
                    : "bg-[#0891B2] hover:bg-[#0891B2]/90 text-white"
                )}
              >
                {copied ? (
                  <>
                    <CheckCircle2 size={16} className="mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} className="mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Share Options */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Share via</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {shareOptions.map((option) => (
                <motion.button
                  key={option.name}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={option.action}
                  className="flex flex-col items-center gap-2 p-4 rounded-md border border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:bg-[#0891B2]/5 transition-all"
                >
                  <option.icon size={20} className="text-[#475569]" />
                  <span className="text-sm text-[#475569]">{option.name}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* QR Code */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">QR Code</Label>
            <div className="flex items-center gap-4 p-4 bg-[#F8FAFC] rounded-md">
              <div className="w-24 h-24 bg-white rounded-md border border-[rgba(15,23,42,0.06)] flex items-center justify-center">
                <QrCode size={60} className="text-[#0F172A]" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#475569] mb-3">
                  Download the QR code and add it to your email signature or business card.
                </p>
                <Button variant="outline" size="sm" className="rounded-md">
                  <Download size={14} className="mr-2" />
                  Download QR
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// CREATE BOOKING PAGE DIALOG
// ============================================

const CreateBookingPageDialog = ({
  isOpen,
  onClose,
  onSubmit,
  users,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<BookingPage>) => void;
  users: UserProfile[];
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    ownerUserId: "",
    themeName: "default",
    slug: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await onSubmit({
      ...formData,
      ownerUserId: formData.ownerUserId ? parseInt(formData.ownerUserId) : undefined,
      slug: formData.slug || generateSlug(formData.title),
    });
    setIsLoading(false);
    onClose();
    setFormData({
      title: "",
      description: "",
      ownerUserId: "",
      themeName: "default",
      slug: "",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 rounded-md overflow-hidden">
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              Create Booking Page
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Set up a new booking page for scheduling
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">
              Page Title <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., 30 Minute Meeting"
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
              placeholder="Describe what this booking is for..."
              rows={3}
              className="rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20 resize-none"
            />
          </div>

          {/* Owner */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Assign To</Label>
            <Select
              value={formData.ownerUserId}
              onValueChange={(val) => setFormData({ ...formData, ownerUserId: val })}
            >
              <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent className="rounded-md">
                {users.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)} className="rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] text-xs font-semibold">
                        {getInitials(user.fullName || user.fullname || "")}
                      </div>
                      {user.fullName || user.fullname}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Slug */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Custom URL (optional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569] text-sm">
                /book/
              </span>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                placeholder={generateSlug(formData.title) || "custom-url"}
                className="h-11 pl-14 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
              />
            </div>
          </div>

          {/* Theme Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Theme</Label>
            <div className="grid grid-cols-4 gap-2">
              {themeOptions.slice(0, 4).map((theme) => (
                <motion.button
                  key={theme.id}
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFormData({ ...formData, themeName: theme.id })}
                  className={cn(
                    "relative p-2 rounded-md border transition-all",
                    formData.themeName === theme.id
                      ? "border-[#22D3EE] bg-[#0891B2]/5"
                      : "border-[rgba(15,23,42,0.06)] hover:border-slate-300"
                  )}
                >
                  <div className={cn("w-full h-6 rounded", theme.preview)} />
                  {formData.themeName === theme.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-[#0891B2] rounded-full flex items-center justify-center"
                    >
                      <CheckCircle2 size={10} className="text-[#0F172A]" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-md">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.title.trim()}
              className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md "
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Plus size={16} className="mr-2" />
              )}
              Create Page
            </Button>
          </DialogFooter>
        </form>
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
    <h3 className="text-xl font-semibold text-[#0F172A] mb-2">No booking pages yet</h3>
    <p className="text-[#94A3B8] text-center max-w-sm mb-6">
      Create your first booking page to start accepting appointments and meetings from clients.
    </p>
    <Button
      onClick={onAdd}
      className="bg-[#F1F5F9]/90 hover:from-[#22D3EE]/90 hover:to-[#22D3EE] text-[#0F172A] rounded-md "
    >
      <Plus size={18} className="mr-2" />
      Create Your First Booking Page
    </Button>
  </motion.div>
);

// ============================================
// MAIN COMPONENT
// ============================================

const BookingPagesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  // const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Removed: global sidebar
  const [pages, setPages] = useState<BookingPage[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState<AppUser | null>(null);

  // Dialog States
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharePageUrl, setSharePageUrl] = useState("");
  const [sharePageTitle, setSharePageTitle] = useState("");

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
      const [pagesResult, usersResult] = await Promise.allSettled([
        getBookings(),
        getUsers(),
      ]);

      const pData =
        pagesResult.status === "fulfilled"
          ? (pagesResult.value as any[]) || []
          : [];
      const uData =
        usersResult.status === "fulfilled"
          ? (usersResult.value as any[]) || []
          : [];

      // Enhance pages with mock data
      const enhancedPages = (pData || []).map((p: any) => ({
        ...p,
        views: Math.floor(Math.random() * 500) + 50,
        bookings: Math.floor(Math.random() * 100) + 10,
        eventTypes: Math.floor(Math.random() * 5) + 1,
        isActive: true,
      }));

      // Enhance users with mock data
      const enhancedUsers = (uData || []).map((u: any) => ({
        ...u,
        eventTypesCount: Math.floor(Math.random() * 5) + 1,
        totalBookings: Math.floor(Math.random() * 50) + 5,
        isOnline: Math.random() > 0.5,
      }));

      setPages(enhancedPages);
      setUsers(enhancedUsers);
    } catch (e) {
      console.error("Failed to load data:", e);
      toast({
        title: "Error",
        description: "Failed to load booking pages",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePage = async (data: Partial<BookingPage>) => {
    try {
      const newPage: BookingPage = {
        id: Date.now(),
        title: data.title || "",
        description: data.description || "",
        ownerUserId: data.ownerUserId || 0,
        themeName: data.themeName || "default",
        createdAt: new Date().toISOString(),
        slug: data.slug,
        isActive: true,
        views: 0,
        bookings: 0,
      };
      setPages((prev) => [newPage, ...prev]);
      toast({
        title: "Success",
        description: "Booking page created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create booking page",
        variant: "destructive",
      });
    }
  };

  const handleSaveTheme = (theme: string, layout: string) => {
    toast({
      title: "Theme Updated",
      description: "Your booking page appearance has been updated",
    });
  };

  // ============================================
  // HANDLERS
  // ============================================

  const handleOpenPage = (slug?: string) => {
    const url = `${window.location.origin}/book/${slug || "workspace"}`;
    window.open(url, "_blank");
  };

  const handleShare = (title: string, slug?: string) => {
    setSharePageTitle(title);
    setSharePageUrl(`${window.location.origin}/book/${slug || "workspace"}`);
    setShareDialogOpen(true);
  };

  // Filter pages based on search
  const filteredPages = useMemo(() => {
    if (!searchTerm) return pages;
    const term = searchTerm.toLowerCase();
    return pages.filter(
      (p) =>
        p.title.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
    );
  }, [pages, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const totalViews = pages.reduce((acc, p) => acc + (p.views || 0), 0);
    const totalBookings = pages.reduce((acc, p) => acc + (p.bookings || 0), 0);
    const activePages = pages.filter((p) => p.isActive).length;
    const conversionRate = totalViews > 0 ? ((totalBookings / totalViews) * 100).toFixed(1) : 0;

    return { totalViews, totalBookings, activePages, conversionRate };
  }, [pages]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
<main
        className={cn(
          "flex-1 transition-all duration-300",
          sidebarCollapsed ? "ml-[80px]" : "ml-[280px]"
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
              <span className="font-medium text-[#0F172A]">Booking Pages</span>
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
                <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Booking Pages</h1>
                <p className="text-[#94A3B8]">Manage your scheduling pages and event types</p>
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

              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-[#F1F5F9]/90 hover:from-[#22D3EE]/90 hover:to-[#22D3EE] text-[#0F172A] rounded-md  px-5"
              >
                <Plus size={18} className="mr-2" />
                New Booking Page
              </Button>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              title="Total Views"
              value={stats.totalViews.toLocaleString()}
              subtitle="Across all pages"
              icon={EyeIcon}
              color="teal"
              trend={{ value: 12, positive: true }}
              delay={0}
            />
            <StatCard
              title="Total Bookings"
              value={stats.totalBookings}
              subtitle="This month"
              icon={CalendarCheck}
              color="gold"
              trend={{ value: 8, positive: true }}
              delay={0.1}
            />
            <StatCard
              title="Active Pages"
              value={stats.activePages}
              subtitle={`${pages.length} total pages`}
              icon={Zap}
              color="green"
              delay={0.2}
            />
            <StatCard
              title="Conversion Rate"
              value={`${stats.conversionRate}%`}
              subtitle="Views to bookings"
              icon={TrendingUp}
              color="purple"
              trend={{ value: 3, positive: true }}
              delay={0.3}
            />
          </div>

          {/* Main Content */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={40} className="animate-spin text-[#0891B2] mb-4" />
              <p className="text-[#94A3B8]">Loading booking pages...</p>
            </div>
          ) : pages.length === 0 && users.length === 0 ? (
            <EmptyState onAdd={() => setCreateDialogOpen(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Left: Workspace Booking Page */}
              <WorkspaceBookingCard
                pages={filteredPages}
                searchTerm={searchTerm}
                onSearch={setSearchTerm}
                onOpenPage={() => handleOpenPage()}
                onShare={() => handleShare("Zylker Sales")}
                onCustomize={() => setThemeDialogOpen(true)}
              />

              {/* Right: User Booking Pages */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold text-[#0F172A]">Team Members</h2>
                  <span className="text-sm text-[#475569]">{users.length} members</span>
                </div>

                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  <AnimatePresence>
                    {users.length > 0 ? (
                      users.map((user, index) => (
                        <UserBookingCard
                          key={user.id}
                          user={user}
                          delay={index * 0.1}
                          onOpenPage={() => handleOpenPage(user.bookingPageSlug || `user-${user.id}`)}
                          onShare={() => handleShare(
                            user.fullName || user.fullname || "User",
                            user.bookingPageSlug || `user-${user.id}`
                          )}
                          onEdit={() => navigate(`/users/${user.id}/edit`)}
                        />
                      ))
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-8 bg-white rounded-md border border-[rgba(15,23,42,0.06)]"
                      >
                        <Users size={40} className="mx-auto text-[#475569] mb-3" />
                        <p className="text-[#94A3B8]">No team members found</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4 rounded-md"
                          onClick={() => navigate("/users/add")}
                        >
                          <UserPlus size={14} className="mr-2" />
                          Add Team Member
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
          >
            {/* Recent Bookings */}
            <div className="col-span-2 bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#0F172A]">Recent Bookings</h3>
                <Button variant="ghost" size="sm" className="text-[#0891B2] hover:text-[#0891B2]/80">
                  View All
                  <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>

              <div className="space-y-3">
                {[
                  { name: "John Smith", event: "30 Min Meeting", time: "Today, 2:00 PM", status: "confirmed" },
                  { name: "Sarah Johnson", event: "Product Demo", time: "Today, 4:30 PM", status: "confirmed" },
                  { name: "Michael Brown", event: "Consultation Call", time: "Tomorrow, 10:00 AM", status: "pending" },
                  { name: "Emily Davis", event: "30 Min Meeting", time: "Tomorrow, 2:00 PM", status: "confirmed" },
                ].map((booking, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 p-3 rounded-md hover:bg-[#F8FAFC] cursor-pointer transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0891B2] font-semibold text-sm">
                      {getInitials(booking.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[#0F172A] truncate">{booking.name}</p>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                          booking.status === "confirmed"
                            ? "bg-green-100 text-green-600"
                            : "bg-amber-100 text-amber-600"
                        )}>
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-sm text-[#94A3B8]">{booking.event}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[#0F172A]">{booking.time.split(", ")[0]}</p>
                      <p className="text-xs text-[#475569]">{booking.time.split(", ")[1]}</p>
                    </div>
                    <ChevronRight size={16} className="text-[#475569] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5">
              <h3 className="font-semibold text-[#0F172A] mb-4">Quick Actions</h3>

              <div className="space-y-2">
                {[
                  { icon: Plus, label: "Create Event Type", color: "teal", action: () => setCreateDialogOpen(true) },
                  { icon: Palette, label: "Customize Theme", color: "purple", action: () => setThemeDialogOpen(true) },
                  { icon: Share2, label: "Share All Pages", color: "blue", action: () => handleShare("Zylker Sales") },
                  { icon: Settings, label: "Booking Settings", color: "slate", action: () => navigate("/settings/booking") },
                  { icon: BarChart3, label: "View Analytics", color: "gold", action: () => navigate("/analytics") },
                ].map((action, index) => {
                  const colorClasses: Record<string, string> = {
                    teal: "bg-[#0891B2]/10 text-[#0891B2]",
                    purple: "bg-purple-500/10 text-purple-500",
                    blue: "bg-[#0891B2]/10 text-blue-500",
                    slate: "bg-white/5 text-[#475569]",
                    gold: "bg-[#D97706]/10 text-[#D97706]",
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

              {/* Pro Tip */}
              <div className="mt-5 p-4 bg-[#F1F5F9] rounded-md border border-[#22D3EE]/20">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-[#0891B2]/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={16} className="text-[#0891B2]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#0F172A] text-sm mb-1">Pro Tip</p>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      Add your booking page link to your email signature to increase meeting requests by up to 40%.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Analytics Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-[#0F172A]">Booking Analytics</h3>
                <p className="text-sm text-[#94A3B8]">Last 7 days performance</p>
              </div>
              <div className="flex items-center gap-2">
                <Select defaultValue="7days">
                  <SelectTrigger className="h-9 w-[130px] rounded-md border-[rgba(15,23,42,0.06)] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    <SelectItem value="7days" className="rounded-md">Last 7 days</SelectItem>
                    <SelectItem value="30days" className="rounded-md">Last 30 days</SelectItem>
                    <SelectItem value="90days" className="rounded-md">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="rounded-md">
                  <Download size={14} className="mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Chart Placeholder */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Mini Stat Cards */}
              <div className="bg-[#F8FAFC] rounded-md p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MousePointerClick size={16} className="text-[#0891B2]" />
                  <span className="text-sm text-[#94A3B8]">Page Visits</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">1,247</p>
                <span className="text-xs text-green-600">+18% vs last week</span>
              </div>

              <div className="bg-[#F8FAFC] rounded-md p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarCheck size={16} className="text-[#D97706]" />
                  <span className="text-sm text-[#94A3B8]">Bookings</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">89</p>
                <span className="text-xs text-green-600">+12% vs last week</span>
              </div>

              <div className="bg-[#F8FAFC] rounded-md p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Timer size={16} className="text-purple-500" />
                  <span className="text-sm text-[#94A3B8]">Avg Duration</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">32m</p>
                <span className="text-xs text-[#475569]">No change</span>
              </div>

              <div className="bg-[#F8FAFC] rounded-md p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={16} className="text-blue-500" />
                  <span className="text-sm text-[#94A3B8]">Show Rate</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">94%</p>
                <span className="text-xs text-green-600">+2% vs last week</span>
              </div>
            </div>

            {/* Chart Area */}
            <div className="mt-6 h-[200px] r from-slate-50 to-white rounded-md border border-[rgba(15,23,42,0.06)] flex items-center justify-center">
              <div className="text-center">
                <BarChart3 size={40} className="mx-auto text-[#475569] mb-2" />
                <p className="text-sm text-[#475569]">Chart visualization</p>
                <p className="text-xs text-[#475569]">Integrate with your preferred charting library</p>
              </div>
            </div>

            {/* Top Performing Events */}
            <div className="mt-6 pt-6 border-t border-[rgba(15,23,42,0.06)]">
              <h4 className="font-medium text-[#0F172A] mb-4">Top Performing Event Types</h4>
              <div className="space-y-3">
                {[
                  { name: "30 Minute Meeting", bookings: 45, percentage: 50 },
                  { name: "Product Demo", bookings: 28, percentage: 31 },
                  { name: "Consultation Call", bookings: 16, percentage: 18 },
                ].map((event, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-md bg-[#0891B2]/10 flex items-center justify-center text-[#0891B2] font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[#0F172A]">{event.name}</span>
                        <span className="text-sm text-[#94A3B8]">{event.bookings} bookings</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${event.percentage}%` }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className="h-full bg-[#F1F5F9] rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ============================================ */}
        {/* DIALOGS */}
        {/* ============================================ */}

        {/* Create Booking Page Dialog */}
        <CreateBookingPageDialog
          isOpen={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onSubmit={handleCreatePage}
          users={users}
        />

        {/* Theme Customization Dialog */}
        <ThemeCustomizationDialog
          isOpen={themeDialogOpen}
          onClose={() => setThemeDialogOpen(false)}
          currentTheme="default"
          currentLayout="list"
          onSave={handleSaveTheme}
        />

        {/* Share Dialog */}
        <ShareDialog
          isOpen={shareDialogOpen}
          onClose={() => setShareDialogOpen(false)}
          pageUrl={sharePageUrl}
          pageTitle={sharePageTitle}
        />
      </main>
    </div>
  );
};

export default BookingPagesPage;
