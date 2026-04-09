
// src/pages/ClientGroups.tsx

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  getGroups,
  createGroup as createGroupApi,
  updateGroup as updateGroupApi,
  deleteGroup as deleteGroupApi,
  addGroupMembers,
  removeGroupMember,
} from "@/features/groups";
import { getClients } from "@/features/clients";
import { Loader2 } from "lucide-react";
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  ListCardSkeleton,
  PullToRefreshIndicator,
  SwipeActionCard,
  usePullToRefresh,
} from "@/features/clients/components/responsive-helpers";
import {
  Users,
  UserPlus,
  UserMinus,
  UserCheck,
  User,
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  MoreHorizontal,
  MoreVertical,
  LayoutGrid,
  List,
  ChevronRight,
  ChevronDown,
  Eye,
  Pencil,
  Trash2,
  Copy,
  Check,
  X,
  Star,
  StarOff,
  Mail,
  Phone,
  MapPin,
  Globe,
  Building2,
  Briefcase,
  Calendar,
  CalendarDays,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Settings,
  Tag,
  Tags,
  Folder,
  FolderPlus,
  FolderOpen,
  Layers,
  Target,
  Zap,
  Sparkles,
  Crown,
  Shield,
  Heart,
  Award,
  Gem,
  CircleDollarSign,
  PieChart,
  BarChart3,
  Activity,
  Send,
  MessageSquare,
  Bell,
  Link as LinkIcon,
  ExternalLink,
  Palette,
  Hash,
  AtSign,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

// ============================================
// TYPES
// ============================================

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  avatar?: string;
  status: "active" | "inactive" | "pending";
  totalRevenue: number;
  projectsCount: number;
  lastActivity: Date;
  joinedDate: Date;
  tags?: string[];
}

interface ClientGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  type: "segment" | "tier" | "industry" | "region" | "custom";
  members: Client[];
  memberCount: number;
  totalRevenue: number;
  avgRevenue: number;
  isDefault: boolean;
  isAutomatic: boolean;
  rules?: GroupRule[];
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
}

interface GroupRule {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface GroupStats {
  totalGroups: number;
  totalClients: number;
  avgGroupSize: number;
  totalRevenue: number;
  topGroup: string;
}

// ============================================
// CONSTANTS & DATA
// ============================================

const groupIcons: { [key: string]: LucideIcon } = {
  users: Users,
  crown: Crown,
  gem: Gem,
  star: Star,
  shield: Shield,
  heart: Heart,
  award: Award,
  target: Target,
  zap: Zap,
  building: Building2,
  briefcase: Briefcase,
  globe: Globe,
  folder: Folder,
  layers: Layers,
  tag: Tag,
};

const groupColors = [
  { id: "blue", color: "#3B82F6", name: "Blue" },
  { id: "purple", color: "#8B5CF6", name: "Purple" },
  { id: "green", color: "#10B981", name: "Green" },
  { id: "yellow", color: "#F59E0B", name: "Yellow" },
  { id: "red", color: "#EF4444", name: "Red" },
  { id: "pink", color: "#EC4899", name: "Pink" },
  { id: "teal", color: "#22D3EE", name: "Teal" },
  { id: "orange", color: "#F97316", name: "Orange" },
  { id: "indigo", color: "#6366F1", name: "Indigo" },
  { id: "gray", color: "#64748B", name: "Gray" },
];

const groupTypes = [
  { id: "segment", name: "Segment", description: "Group by behavior or characteristics" },
  { id: "tier", name: "Tier", description: "Group by value or subscription level" },
  { id: "industry", name: "Industry", description: "Group by business sector" },
  { id: "region", name: "Region", description: "Group by geographic location" },
  { id: "custom", name: "Custom", description: "Custom grouping criteria" },
];

// Sample clients data
const sampleClients: Client[] = [
  {
    id: "client_1",
    name: "Sarah Johnson",
    email: "sarah@techcorp.com",
    phone: "+1 (416) 555-0123",
    company: "TechCorp Solutions",
    avatar: "https://randomuser.me/api/portraits/women/1.jpg",
    status: "active",
    totalRevenue: 125000,
    projectsCount: 8,
    lastActivity: new Date("2024-01-20"),
    joinedDate: new Date("2023-03-15"),
    tags: ["enterprise", "priority"],
  },
  {
    id: "client_2",
    name: "Michael Chen",
    email: "m.chen@innovatelab.io",
    phone: "+1 (604) 555-0456",
    company: "InnovateLab",
    avatar: "https://randomuser.me/api/portraits/men/2.jpg",
    status: "active",
    totalRevenue: 98500,
    projectsCount: 5,
    lastActivity: new Date("2024-01-19"),
    joinedDate: new Date("2023-05-20"),
    tags: ["startup", "tech"],
  },
  {
    id: "client_3",
    name: "Emma Williams",
    email: "emma@retailplus.ca",
    phone: "+1 (905) 555-0789",
    company: "RetailPlus Canada",
    avatar: "https://randomuser.me/api/portraits/women/3.jpg",
    status: "active",
    totalRevenue: 67000,
    projectsCount: 4,
    lastActivity: new Date("2024-01-18"),
    joinedDate: new Date("2023-07-10"),
    tags: ["retail"],
  },
  {
    id: "client_4",
    name: "David Brown",
    email: "david@globalfinance.com",
    phone: "+1 (514) 555-0321",
    company: "Global Finance Inc.",
    avatar: "https://randomuser.me/api/portraits/men/4.jpg",
    status: "active",
    totalRevenue: 245000,
    projectsCount: 12,
    lastActivity: new Date("2024-01-20"),
    joinedDate: new Date("2022-11-05"),
    tags: ["enterprise", "finance"],
  },
  {
    id: "client_5",
    name: "Lisa Anderson",
    email: "lisa@startupventure.io",
    phone: "+1 (403) 555-0654",
    company: "Startup Venture",
    avatar: "https://randomuser.me/api/portraits/women/5.jpg",
    status: "pending",
    totalRevenue: 15000,
    projectsCount: 2,
    lastActivity: new Date("2024-01-15"),
    joinedDate: new Date("2024-01-01"),
    tags: ["startup"],
  },
  {
    id: "client_6",
    name: "James Taylor",
    email: "j.taylor@meditech.ca",
    phone: "+1 (613) 555-0987",
    company: "MediTech Solutions",
    avatar: "https://randomuser.me/api/portraits/men/6.jpg",
    status: "active",
    totalRevenue: 156000,
    projectsCount: 9,
    lastActivity: new Date("2024-01-17"),
    joinedDate: new Date("2023-02-28"),
    tags: ["healthcare", "enterprise"],
  },
  {
    id: "client_7",
    name: "Amanda Martinez",
    email: "amanda@edulearn.org",
    phone: "+1 (204) 555-0147",
    company: "EduLearn Institute",
    avatar: "https://randomuser.me/api/portraits/women/7.jpg",
    status: "active",
    totalRevenue: 45000,
    projectsCount: 3,
    lastActivity: new Date("2024-01-19"),
    joinedDate: new Date("2023-09-15"),
    tags: ["education", "non-profit"],
  },
  {
    id: "client_8",
    name: "Robert Garcia",
    email: "rgarcia@constructco.ca",
    phone: "+1 (780) 555-0258",
    company: "ConstructCo Ltd.",
    avatar: "https://randomuser.me/api/portraits/men/8.jpg",
    status: "inactive",
    totalRevenue: 32000,
    projectsCount: 2,
    lastActivity: new Date("2023-12-10"),
    joinedDate: new Date("2023-06-20"),
    tags: ["construction"],
  },
  {
    id: "client_9",
    name: "Jennifer Lee",
    email: "jennifer@designstudio.com",
    phone: "+1 (647) 555-0369",
    company: "Creative Design Studio",
    avatar: "https://randomuser.me/api/portraits/women/9.jpg",
    status: "active",
    totalRevenue: 78000,
    projectsCount: 6,
    lastActivity: new Date("2024-01-18"),
    joinedDate: new Date("2023-04-12"),
    tags: ["creative", "design"],
  },
  {
    id: "client_10",
    name: "William Thompson",
    email: "w.thompson@lawfirm.ca",
    phone: "+1 (416) 555-0741",
    company: "Thompson & Associates",
    avatar: "https://randomuser.me/api/portraits/men/10.jpg",
    status: "active",
    totalRevenue: 189000,
    projectsCount: 7,
    lastActivity: new Date("2024-01-16"),
    joinedDate: new Date("2022-08-30"),
    tags: ["legal", "enterprise"],
  },
];

// Sample groups data
const initialGroups: ClientGroup[] = [
  {
    id: "group_1",
    name: "Enterprise Clients",
    description: "High-value enterprise customers with annual contracts over $100k",
    color: "#8B5CF6",
    icon: "crown",
    type: "tier",
    members: sampleClients.filter((c) => c.tags?.includes("enterprise")),
    memberCount: 4,
    totalRevenue: 715000,
    avgRevenue: 178750,
    isDefault: false,
    isAutomatic: true,
    rules: [
      { id: "r1", field: "totalRevenue", operator: "greaterThan", value: "100000" },
    ],
    createdBy: "John Smith",
    createdAt: new Date("2023-06-01"),
  },
  {
    id: "group_2",
    name: "Startup Partners",
    description: "Early-stage startups and emerging businesses",
    color: "#10B981",
    icon: "zap",
    type: "segment",
    members: sampleClients.filter((c) => c.tags?.includes("startup")),
    memberCount: 2,
    totalRevenue: 113500,
    avgRevenue: 56750,
    isDefault: false,
    isAutomatic: false,
    createdBy: "Emily Davis",
    createdAt: new Date("2023-08-15"),
  },
  {
    id: "group_3",
    name: "Healthcare Sector",
    description: "Clients in healthcare and medical technology industries",
    color: "#3B82F6",
    icon: "heart",
    type: "industry",
    members: sampleClients.filter((c) => c.tags?.includes("healthcare")),
    memberCount: 1,
    totalRevenue: 156000,
    avgRevenue: 156000,
    isDefault: false,
    isAutomatic: true,
    rules: [
      { id: "r2", field: "industry", operator: "equals", value: "healthcare" },
    ],
    createdBy: "Sarah Johnson",
    createdAt: new Date("2023-09-20"),
  },
  {
    id: "group_4",
    name: "VIP Clients",
    description: "Top-tier clients requiring premium support and services",
    color: "#F59E0B",
    icon: "gem",
    type: "tier",
    members: sampleClients.filter((c) => c.totalRevenue > 150000),
    memberCount: 3,
    totalRevenue: 590000,
    avgRevenue: 196667,
    isDefault: false,
    isAutomatic: true,
    rules: [
      { id: "r3", field: "totalRevenue", operator: "greaterThan", value: "150000" },
    ],
    createdBy: "John Smith",
    createdAt: new Date("2023-05-10"),
  },
  {
    id: "group_5",
    name: "Creative & Design",
    description: "Clients in creative industries including design and media",
    color: "#EC4899",
    icon: "star",
    type: "industry",
    members: sampleClients.filter((c) => c.tags?.includes("creative") || c.tags?.includes("design")),
    memberCount: 1,
    totalRevenue: 78000,
    avgRevenue: 78000,
    isDefault: false,
    isAutomatic: false,
    createdBy: "Mike Wilson",
    createdAt: new Date("2023-10-05"),
  },
  {
    id: "group_6",
    name: "New Clients (2024)",
    description: "Clients who joined in 2024",
    color: "#22D3EE",
    icon: "users",
    type: "segment",
    members: sampleClients.filter((c) => c.joinedDate >= new Date("2024-01-01")),
    memberCount: 1,
    totalRevenue: 15000,
    avgRevenue: 15000,
    isDefault: false,
    isAutomatic: true,
    rules: [
      { id: "r4", field: "joinedDate", operator: "after", value: "2024-01-01" },
    ],
    createdBy: "System",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "group_7",
    name: "All Clients",
    description: "Default group containing all clients",
    color: "#64748B",
    icon: "folder",
    type: "custom",
    members: sampleClients,
    memberCount: 10,
    totalRevenue: sampleClients.reduce((acc, c) => acc + c.totalRevenue, 0),
    avgRevenue: sampleClients.reduce((acc, c) => acc + c.totalRevenue, 0) / 10,
    isDefault: true,
    isAutomatic: true,
    createdBy: "System",
    createdAt: new Date("2022-01-01"),
  },
];

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

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat("en-CA").format(num);
};

const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

const getTypeInfo = (type: string) => {
  return groupTypes.find((t) => t.id === type) || groupTypes[4];
};

const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return formatDate(date);
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
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  color: string;
  trend?: { value: number; label: string };
  delay?: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="relative bg-white rounded-md p-5 border border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all overflow-hidden group"
    >
      <div
        className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-all"
        style={{ backgroundColor: color }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-[#94A3B8] mb-1">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">
            {typeof value === "number" ? formatNumber(value) : value}
          </p>
          {subtitle && <p className="text-xs text-[#475569] mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.value >= 0 ? (
                <ArrowUpRight size={14} className="text-green-500" />
              ) : (
                <ArrowDownRight size={14} className="text-red-500" />
              )}
              <span
                className={cn(
                  "text-xs font-semibold",
                  trend.value >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-[#475569]">{trend.label}</span>
            </div>
          )}
        </div>
        <div
          className="w-12 h-12 rounded-md flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon size={22} style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// GROUP CARD COMPONENT
// ============================================

const GroupCard = ({
  group,
  onClick,
  onEdit,
  onDelete,
  onManageMembers,
  delay = 0,
}: {
  group: ClientGroup;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onManageMembers: () => void;
  delay?: number;
}) => {
  const IconComponent = groupIcons[group.icon] || Users;
  const typeInfo = getTypeInfo(group.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="relative bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all group cursor-pointer"
      onClick={onClick}
    >
      {/* Color Header */}
      <div
        className="h-2"
        style={{ backgroundColor: group.color }}
      />

      {/* Actions */}
      <div
        className="absolute top-5 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
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
            <DropdownMenuItem onClick={onClick} className="rounded-md">
              <Eye size={14} className="mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onManageMembers} className="rounded-md">
              <Users size={14} className="mr-2" /> Manage Members
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit} className="rounded-md">
              <Pencil size={14} className="mr-2" /> Edit Group
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-md">
              <Copy size={14} className="mr-2" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-md">
              <Mail size={14} className="mr-2" /> Email Group
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-md">
              <Download size={14} className="mr-2" /> Export Members
            </DropdownMenuItem>
            {!group.isDefault && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="rounded-md text-red-600 focus:text-red-600"
                >
                  <Trash2 size={14} className="mr-2" /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-14 h-14 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${group.color}15` }}
          >
            <IconComponent size={28} style={{ color: group.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-[#0F172A] truncate group-hover:text-[#0891B2] transition-colors">
                {group.name}
              </h3>
              {group.isDefault && (
                <span className="px-2 py-0.5 bg-white/5 text-[#94A3B8] text-xs font-medium rounded">
                  Default
                </span>
              )}
              {group.isAutomatic && (
                <Zap size={14} className="text-yellow-500" title="Auto-updated" />
              )}
            </div>
            <p className="text-sm text-[#94A3B8] line-clamp-2">{group.description}</p>
          </div>
        </div>

        {/* Type Badge */}
        <div className="mb-4">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium capitalize"
            style={{ backgroundColor: `${group.color}10`, color: group.color }}
          >
            <Tag size={12} />
            {typeInfo.name}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 bg-[#F8FAFC] rounded-md">
            <p className="text-lg font-bold text-[#0F172A]">{group.memberCount}</p>
            <p className="text-xs text-[#94A3B8]">Members</p>
          </div>
          <div className="text-center p-3 bg-[#F8FAFC] rounded-md">
            <p className="text-lg font-bold text-[#0891B2]">{formatCurrency(group.totalRevenue)}</p>
            <p className="text-xs text-[#94A3B8]">Total Revenue</p>
          </div>
          <div className="text-center p-3 bg-[#F8FAFC] rounded-md">
            <p className="text-lg font-bold text-[#D97706]">{formatCurrency(group.avgRevenue)}</p>
            <p className="text-xs text-[#94A3B8]">Avg Revenue</p>
          </div>
        </div>

        {/* Members Preview */}
        <div className="flex items-center justify-between pt-4 border-t border-[rgba(15,23,42,0.06)]">
          <div className="flex -space-x-2">
            {group.members.slice(0, 5).map((member) => (
              <Avatar key={member.id} className="h-8 w-8 border-2 border-white">
                <AvatarImage src={member.avatar} />
                <AvatarFallback className="text-xs bg-slate-200">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>
            ))}
            {group.memberCount > 5 && (
              <div className="h-8 w-8 rounded-full bg-white/5 border-2 border-white flex items-center justify-center text-xs font-medium text-[#475569]">
                +{group.memberCount - 5}
              </div>
            )}
          </div>
          <span className="text-xs text-[#475569]">
            Updated {getRelativeTime(group.updatedAt || group.createdAt)}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const MobileGroupCard = ({
  group,
  onView,
  onDelete,
}: {
  group: ClientGroup;
  onView: () => void;
  onDelete: () => void;
}) => {
  const IconComponent = groupIcons[group.icon] || Users;
  const typeInfo = getTypeInfo(group.type);

  return (
    <SwipeActionCard onView={onView} onDelete={onDelete}>
      <div
        className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white p-4"
        onClick={onView}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${group.color}15` }}
          >
            <IconComponent size={22} style={{ color: group.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-[#0F172A]">{group.name}</p>
                <p className="truncate text-sm text-[#475569]">{group.description || typeInfo.name}</p>
              </div>
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ backgroundColor: `${group.color}10`, color: group.color }}
              >
                {typeInfo.name}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#F8FAFC] px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Members</p>
                <p className="mt-1 text-sm font-semibold text-[#0F172A]">{group.memberCount}</p>
              </div>
              <div className="rounded-xl bg-[#F8FAFC] px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Revenue</p>
                <p className="mt-1 text-sm font-semibold text-[#0F172A]">{formatCurrency(group.totalRevenue)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SwipeActionCard>
  );
};

// ============================================
// GROUP TABLE ROW COMPONENT
// ============================================

const GroupTableRow = ({
  group,
  onClick,
  onEdit,
  onDelete,
  onManageMembers,
}: {
  group: ClientGroup;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onManageMembers: () => void;
}) => {
  const IconComponent = groupIcons[group.icon] || Users;
  const typeInfo = getTypeInfo(group.type);
  const { isTablet } = useIsMobile();

  return (
    <TableRow className="group hover:bg-[#F8FAFC] cursor-pointer" onClick={onClick}>
      <TableCell>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center"
            style={{ backgroundColor: `${group.color}15` }}
          >
            <IconComponent size={20} style={{ color: group.color }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-[#0F172A] group-hover:text-[#0891B2] transition-colors">
                {group.name}
              </p>
              {group.isDefault && (
                <span className="px-1.5 py-0.5 bg-white/5 text-[#94A3B8] text-[10px] font-medium rounded">
                  Default
                </span>
              )}
              {group.isAutomatic && (
                <Zap size={12} className="text-yellow-500" />
              )}
            </div>
            <p className="text-sm text-[#94A3B8] truncate max-w-[250px]">
              {group.description}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium capitalize"
          style={{ backgroundColor: `${group.color}10`, color: group.color }}
        >
          {typeInfo.name}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {group.members.slice(0, 3).map((member) => (
              <Avatar key={member.id} className="h-6 w-6 border border-white">
                <AvatarImage src={member.avatar} />
                <AvatarFallback className="text-[10px] bg-slate-200">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="text-sm font-medium text-[#0F172A]">{group.memberCount}</span>
        </div>
      </TableCell>
      <TableCell>
        <span className="font-semibold text-[#0F172A]">
          {formatCurrency(group.totalRevenue)}
        </span>
      </TableCell>
      {!isTablet && (
        <TableCell>
          <span className="text-sm text-[#475569]">
            {formatCurrency(group.avgRevenue)}
          </span>
        </TableCell>
      )}
      {!isTablet && (
        <TableCell>
          <span className="text-sm text-[#94A3B8]">
            {formatDate(group.createdAt)}
          </span>
        </TableCell>
      )}
      <TableCell>
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={onClick}>
                  <Eye size={16} className="text-[#475569]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View Details</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={onManageMembers}>
                  <Users size={16} className="text-[#475569]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Manage Members</TooltipContent>
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
              <DropdownMenuItem className="rounded-md">
                <Mail size={14} className="mr-2" /> Email Group
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-md">
                <Download size={14} className="mr-2" /> Export Members
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-md">
                <Copy size={14} className="mr-2" /> Duplicate
              </DropdownMenuItem>
              {!group.isDefault && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="rounded-md text-red-600">
                    <Trash2 size={14} className="mr-2" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
};

// ============================================
// GROUP FORM DIALOG
// ============================================

const GroupFormDialog = ({
  isOpen,
  onClose,
  group,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  group: ClientGroup | null;
  onSubmit: (data: Partial<ClientGroup>) => void;
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
    icon: "users",
    type: "custom" as ClientGroup["type"],
    isAutomatic: false,
  });

  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name,
        description: group.description || "",
        color: group.color,
        icon: group.icon,
        type: group.type,
        isAutomatic: group.isAutomatic,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        color: "#3B82F6",
        icon: "users",
        type: "custom",
        isAutomatic: false,
      });
    }
  }, [group, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    onSubmit(formData);
    onClose();
  };

  const SelectedIcon = groupIcons[formData.icon] || Users;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 rounded-md overflow-hidden max-h-[90vh]">
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              {group ? "Edit Group" : "Create New Group"}
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              {group ? "Update group settings" : "Create a new client group for better organization"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[calc(90vh-88px)] overflow-y-auto p-6 space-y-5">
          {/* Group Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">
              Group Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Enterprise Clients, VIP Members"
              required
              className="h-11 rounded-md"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe this group's purpose..."
              rows={3}
              className="rounded-md resize-none"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Group Type</Label>
            <Select
              value={formData.type}
              onValueChange={(val) => setFormData({ ...formData, type: val as ClientGroup["type"] })}
            >
              <SelectTrigger className="h-11 rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-md">
                {groupTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id} className="rounded-md">
                    <div>
                      <p className="font-medium">{type.name}</p>
                      <p className="text-xs text-[#94A3B8]">{type.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Icon</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(groupIcons).map(([key, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: key })}
                  className={cn(
                    "w-10 h-10 rounded-md flex items-center justify-center transition-all",
                    formData.icon === key
                      ? "ring-2 ring-[#22D3EE] ring-offset-2"
                      : "hover:bg-white/10"
                  )}
                  style={{
                    backgroundColor: formData.icon === key ? `${formData.color}15` : undefined,
                  }}
                >
                  <Icon
                    size={20}
                    style={{ color: formData.icon === key ? formData.color : "#64748B" }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Color</Label>
            <div className="flex flex-wrap gap-2">
              {groupColors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: c.color })}
                  className={cn(
                    "w-8 h-8 rounded-md transition-all",
                    formData.color === c.color && "ring-2 ring-offset-2 ring-[#22D3EE]"
                  )}
                  style={{ backgroundColor: c.color }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-[#F8FAFC] rounded-md">
            <p className="text-xs text-[#475569] mb-3">Preview</p>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-md flex items-center justify-center"
                style={{ backgroundColor: `${formData.color}15` }}
              >
                <SelectedIcon size={24} style={{ color: formData.color }} />
              </div>
              <div>
                <p className="font-semibold text-[#0F172A]">
                  {formData.name || "Group Name"}
                </p>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium capitalize"
                  style={{ backgroundColor: `${formData.color}10`, color: formData.color }}
                >
                  {getTypeInfo(formData.type).name}
                </span>
              </div>
            </div>
          </div>

          {/* Auto-update Toggle */}
          <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-md">
            <div className="flex items-center gap-3">
              <Zap size={18} className="text-yellow-500" />
              <div>
                <p className="font-medium text-[#0F172A]">Auto-update Members</p>
                <p className="text-xs text-[#94A3B8]">Automatically add clients based on rules</p>
              </div>
            </div>
            <Switch
              checked={formData.isAutomatic}
              onCheckedChange={(checked) => setFormData({ ...formData, isAutomatic: checked })}
              className="data-[state=checked]:bg-[#0891B2]"
            />
          </div>

          <DialogFooter className="pt-4 gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-md">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.name.trim()}
              className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
            >
              {group ? (
                <>
                  <Check size={16} className="mr-2" /> Update Group
                </>
              ) : (
                <>
                  <Plus size={16} className="mr-2" /> Create Group
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
// MANAGE MEMBERS DIALOG
// ============================================

const ManageMembersDialog = ({
  isOpen,
  onClose,
  group,
  allClients,
  onUpdateMembers,
}: {
  isOpen: boolean;
  onClose: () => void;
  group: ClientGroup | null;
  allClients: Client[];
  onUpdateMembers: (members: Client[]) => void;
}) => {
  const { isMobile } = useIsMobile();
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (group) {
      setSelectedMembers(new Set(group.members.map((m) => m.id)));
    }
  }, [group, isOpen]);

  if (!group) return null;

  const filteredClients = allClients.filter((client) => {
    const query = searchQuery.toLowerCase();
    return (
      client.name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query) ||
      client.company.toLowerCase().includes(query)
    );
  });

  const toggleMember = (clientId: string) => {
    setSelectedMembers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const handleSave = () => {
    const members = allClients.filter((c) => selectedMembers.has(c.id));
    onUpdateMembers(members);
    onClose();
  };

  const IconComponent = groupIcons[group.icon] || Users;

  const content = (
    <>
        <div
          className="p-6 border-b border-[rgba(15,23,42,0.06)]"
          style={{ background: `linear-gradient(to right, ${group.color}10, transparent)` }}
        >
          {isMobile ? (
            <DrawerHeader className="p-0 text-left">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: `${group.color}20` }}
                >
                  <IconComponent size={24} style={{ color: group.color }} />
                </div>
                <div>
                  <DrawerTitle className="text-xl font-bold text-[#0F172A]">
                    Manage Members
                  </DrawerTitle>
                  <DrawerDescription className="text-[#94A3B8]">
                    {group.name} • {selectedMembers.size} members selected
                  </DrawerDescription>
                </div>
              </div>
            </DrawerHeader>
          ) : (
            <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-md flex items-center justify-center"
                style={{ backgroundColor: `${group.color}20` }}
              >
                <IconComponent size={24} style={{ color: group.color }} />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-[#0F172A]">
                  Manage Members
                </DialogTitle>
                <DialogDescription className="text-[#94A3B8]">
                  {group.name} • {selectedMembers.size} members selected
                </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          )}
        </div>

        <div className="p-4 border-b border-[rgba(15,23,42,0.06)]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients..."
              className="pl-9 h-10 rounded-md border-[rgba(15,23,42,0.06)]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[400px] p-4">
          <div className="space-y-2">
            {filteredClients.map((client) => {
              const isSelected = selectedMembers.has(client.id);

              return (
                <div
                  key={client.id}
                  onClick={() => toggleMember(client.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all",
                    isSelected
                      ? "bg-[#0891B2]/10 border border-[#22D3EE]/30"
                      : "hover:bg-[#F8FAFC] border border-transparent"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleMember(client.id)}
                    className="data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
                  />
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={client.avatar} />
                    <AvatarFallback className="bg-slate-200 text-sm">
                      {getInitials(client.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#0F172A]">{client.name}</p>
                    <p className="text-sm text-[#94A3B8] truncate">{client.company}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#0F172A]">
                      {formatCurrency(client.totalRevenue)}
                    </p>
                    <p className="text-xs text-[#475569]">
                      {client.projectsCount} projects
                    </p>
                  </div>
                  {isSelected && (
                    <Check size={16} className="text-[#0891B2]" />
                  )}
                </div>
              );
            })}

            {filteredClients.length === 0 && (
              <div className="text-center py-8">
                <Users size={32} className="text-[#475569] mx-auto mb-2" />
                <p className="text-[#94A3B8]">No clients found</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 pt-4 border-t border-[rgba(15,23,42,0.06)]">
          <div className="flex-1 text-sm text-[#94A3B8]">
            {selectedMembers.size} of {allClients.length} clients selected
          </div>
          <div className="mt-3 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose} className="rounded-md">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
            >
              <Check size={16} className="mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[90vh] rounded-t-[24px] border-none bg-white">
          <div className="overflow-y-auto">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 rounded-md overflow-hidden max-h-[80vh]">
        {content}
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// GROUP DETAILS DIALOG
// ============================================

const GroupDetailsDialog = ({
  isOpen,
  onClose,
  group,
  onEdit,
  onManageMembers,
}: {
  isOpen: boolean;
  onClose: () => void;
  group: ClientGroup | null;
  onEdit: () => void;
  onManageMembers: () => void;
}) => {
  const { isMobile } = useIsMobile();
  if (!group) return null;

  const IconComponent = groupIcons[group.icon] || Users;
  const typeInfo = getTypeInfo(group.type);

  // Calculate stats
  const activeMembers = group.members.filter((m) => m.status === "active").length;
  const avgProjects = group.members.length > 0
    ? Math.round(group.members.reduce((acc, m) => acc + m.projectsCount, 0) / group.members.length)
    : 0;

  const content = (
    <>
        {/* Header */}
        <div
          className="p-6 border-b border-[rgba(15,23,42,0.06)]"
          style={{ background: `linear-gradient(to right, ${group.color}15, transparent)` }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div
                className="w-16 h-16 rounded-md flex items-center justify-center"
                style={{ backgroundColor: `${group.color}20` }}
              >
                <IconComponent size={32} style={{ color: group.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A]">{group.name}</h2>
                  {group.isDefault && (
                    <span className="px-2 py-0.5 bg-slate-200 text-[#475569] text-xs font-medium rounded">
                      Default
                    </span>
                  )}
                  {group.isAutomatic && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-600 text-xs font-medium rounded flex items-center gap-1">
                      <Zap size={10} /> Auto
                    </span>
                  )}
                </div>
                <p className="text-[#94A3B8] mb-2">{group.description}</p>
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium capitalize"
                  style={{ backgroundColor: `${group.color}15`, color: group.color }}
                >
                  <Tag size={14} />
                  {typeInfo.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 bg-[#F8FAFC] rounded-md text-center">
              <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">{group.memberCount}</p>
              <p className="text-sm text-[#94A3B8]">Total Members</p>
            </div>
            <div className="p-4 bg-green-50 rounded-md text-center">
              <p className="text-xl sm:text-2xl font-bold text-green-600">{activeMembers}</p>
              <p className="text-sm text-[#94A3B8]">Active</p>
            </div>
            <div className="p-4 bg-[#0891B2]/10 rounded-md text-center">
              <p className="text-xl sm:text-2xl font-bold text-[#0891B2]">{formatCurrency(group.totalRevenue)}</p>
              <p className="text-sm text-[#94A3B8]">Total Revenue</p>
            </div>
            <div className="p-4 bg-[#D97706]/10 rounded-md text-center">
              <p className="text-xl sm:text-2xl font-bold text-[#D97706]">{avgProjects}</p>
              <p className="text-sm text-[#94A3B8]">Avg Projects</p>
            </div>
          </div>

          {/* Auto Rules */}
          {group.isAutomatic && group.rules && group.rules.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A] mb-3 flex items-center gap-2">
                <Zap size={16} className="text-yellow-500" />
                Automatic Membership Rules
              </h3>
              <div className="space-y-2">
                {group.rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-100 rounded-md text-sm"
                  >
                    <span className="font-medium text-slate-200 capitalize">{rule.field}</span>
                    <span className="text-[#94A3B8]">{rule.operator.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                    <span className="font-medium text-[#0F172A]">{rule.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#0F172A]">
                Members ({group.memberCount})
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={onManageMembers}
                className="rounded-md"
              >
                <UserPlus size={14} className="mr-1" />
                Manage
              </Button>
            </div>
            <div className="border border-[rgba(15,23,42,0.06)] rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F8FAFC]">
                    <TableHead>Client</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.members.slice(0, 5).map((member) => (
                    <TableRow key={member.id} className="hover:bg-[#F8FAFC]">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback className="text-xs bg-slate-200">
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-[#0F172A]">{member.name}</p>
                            <p className="text-xs text-[#94A3B8]">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-[#475569]">{member.company}</TableCell>
                      <TableCell className="font-medium text-[#0F172A]">
                        {formatCurrency(member.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-sm text-[#475569]">{member.projectsCount}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium capitalize",
                            member.status === "active" && "bg-green-100 text-green-600",
                            member.status === "inactive" && "bg-white/5 text-[#475569]",
                            member.status === "pending" && "bg-yellow-100 text-yellow-600"
                          )}
                        >
                          {member.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {group.memberCount > 5 && (
                <div className="p-3 text-center border-t border-[rgba(15,23,42,0.06)]">
                  <Button variant="link" size="sm" onClick={onManageMembers}>
                    View all {group.memberCount} members
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Meta Info */}
          <div className="pt-4 border-t border-[rgba(15,23,42,0.06)] grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[#475569]">Created by</p>
              <p className="font-medium text-[#0F172A]">{group.createdBy}</p>
            </div>
            <div>
              <p className="text-[#475569]">Created on</p>
              <p className="font-medium text-[#0F172A]">{formatDate(group.createdAt)}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-[rgba(15,23,42,0.06)] p-6 pt-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" className="rounded-md gap-2">
            <Mail size={16} />
            Email Group
          </Button>
          <Button variant="outline" className="rounded-md gap-2">
            <Download size={16} />
            Export
          </Button>
          <Button
            onClick={onEdit}
            className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md gap-2"
          >
            <Pencil size={16} />
            Edit Group
          </Button>
          </div>
        </div>
      </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[92vh] rounded-t-[24px] border-none bg-white">
          <div className="overflow-y-auto">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0 rounded-md overflow-hidden max-h-[90vh] overflow-y-auto">
        {content}
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// MAIN CLIENT GROUPS PAGE
// ============================================

const ClientGroupsPage = () => {
  const { toast } = useToast();
  const { isMobile, isTablet } = useIsMobile();

  // State
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "members" | "revenue" | "created">("name");

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<ClientGroup | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(
    typeof window !== "undefined" ? !window.navigator.onLine : false
  );

  // ── Fetch data from API ───────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [groupsData, clientsData] = await Promise.all([
        getGroups(),
        getClients().catch(() => []),
      ]);

      const normClients: Client[] = (clientsData as any[]).map((c: any) => ({
        id: c.id,
        name: c.name || c.contactName || '',
        email: c.email || c.contactEmail || '',
        phone: c.phone || c.contactPhone || '',
        company: c.company || c.name || '',
        avatar: c.avatar,
        status: c.status || 'active',
        totalRevenue: Number(c.totalRevenue || c.revenue || 0),
        projectsCount: Number(c.projectsCount || c.projects?.length || 0),
        lastActivity: new Date(c.updatedAt || c.lastActivity || Date.now()),
        joinedDate: new Date(c.createdAt || c.joinedDate || Date.now()),
        tags: c.tags || [],
      }));

      const normGroups: ClientGroup[] = (groupsData as any[]).map((g: any) => {
        const members = (g.members || []).map((m: any) => {
          const client = normClients.find(c => c.id === (m.clientId || m.id));
          return client || {
            id: m.clientId || m.id,
            name: m.clientName || m.name || '',
            email: m.email || '',
            phone: m.phone || '',
            company: m.company || '',
            status: 'active' as const,
            totalRevenue: 0,
            projectsCount: 0,
            lastActivity: new Date(),
            joinedDate: new Date(),
          };
        });
        const totalRevenue = members.reduce((acc: number, m: Client) => acc + m.totalRevenue, 0);
        return {
          id: g.id,
          name: g.name,
          description: g.description || '',
          color: g.color || '#3B82F6',
          icon: g.icon || 'users',
          type: g.type || 'custom',
          members,
          memberCount: g.memberCount ?? members.length,
          totalRevenue,
          avgRevenue: members.length > 0 ? totalRevenue / members.length : 0,
          isDefault: g.isDefault || false,
          isAutomatic: g.isAutomatic || false,
          rules: g.rules || [],
          createdBy: g.createdBy || 'System',
          createdAt: new Date(g.createdAt || Date.now()),
          updatedAt: g.updatedAt ? new Date(g.updatedAt) : undefined,
        };
      });

      setGroups(normGroups);
      setClients(normClients);
      setLoadError(null);
    } catch (err) {
      console.error('Failed to load groups', err);
      setLoadError("Failed to load client groups");
      toast({ title: 'Error', description: 'Failed to load client groups', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);
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

  const { handlers, pullDistance, isRefreshing } = usePullToRefresh({
    enabled: isMobile,
    onRefresh: fetchData,
  });

  // Continue from where the code was cut off...

  const filteredGroups = useMemo(() => {
    let result = [...groups];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(query) ||
          g.description?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (selectedType !== "all") {
      result = result.filter((g) => g.type === selectedType);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "members":
          return b.memberCount - a.memberCount;
        case "revenue":
          return b.totalRevenue - a.totalRevenue;
        case "created":
          return b.createdAt.getTime() - a.createdAt.getTime();
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [groups, searchQuery, selectedType, sortBy]);

  // Calculate stats
  const stats: GroupStats = useMemo(() => {
    const totalRevenue = groups.reduce((acc, g) => acc + g.totalRevenue, 0);
    const topGroup = groups.reduce((max, g) =>
      g.totalRevenue > max.totalRevenue ? g : max, groups[0]
    );
    const totalMembers = groups.reduce((acc, g) => acc + g.memberCount, 0);

    return {
      totalGroups: groups.length,
      totalClients: clients.length,
      avgGroupSize: groups.length > 0 ? Math.round(totalMembers / groups.length) : 0,
      totalRevenue,
      topGroup: topGroup?.name || "N/A",
    };
  }, [groups, clients]);

  // Handlers
  const handleCreateGroup = () => {
    setCurrentGroup(null);
    setIsFormOpen(true);
  };

  const handleEditGroup = (group: ClientGroup) => {
    setCurrentGroup(group);
    setIsFormOpen(true);
  };

  const handleViewGroup = (group: ClientGroup) => {
    setCurrentGroup(group);
    setIsDetailsOpen(true);
  };

  const handleManageMembers = (group: ClientGroup) => {
    setCurrentGroup(group);
    setIsMembersOpen(true);
  };

  const handleDeleteGroup = (group: ClientGroup) => {
    setCurrentGroup(group);
    setIsDeleteAlertOpen(true);
  };

  const handleFormSubmit = async (data: Partial<ClientGroup>) => {
    try {
      if (currentGroup) {
        // Update existing group via API
        await updateGroupApi(currentGroup.id, {
          name: data.name,
          description: data.description,
          color: data.color,
          icon: data.icon,
          type: data.type,
        });
        setGroups((prev) =>
          prev.map((g) =>
            g.id === currentGroup.id
              ? { ...g, ...data, updatedAt: new Date() }
              : g
          )
        );
        toast({
          title: "Group Updated",
          description: `"${data.name}" has been updated successfully.`,
        });
      } else {
        // Create new group via API
        const created = await createGroupApi({
          name: data.name || "",
          description: data.description,
          color: data.color,
          icon: data.icon,
          type: data.type,
        });
        const newGroup: ClientGroup = {
          id: (created as any).id || `group_${Date.now()}`,
          name: data.name || "",
          description: data.description,
          color: data.color || "#3B82F6",
          icon: data.icon || "users",
          type: data.type || "custom",
          members: [],
          memberCount: 0,
          totalRevenue: 0,
          avgRevenue: 0,
          isDefault: false,
          isAutomatic: data.isAutomatic || false,
          createdBy: "Current User",
          createdAt: new Date(),
        };
        setGroups((prev) => [...prev, newGroup]);
        toast({
          title: "Group Created",
          description: `"${data.name}" has been created successfully.`,
        });
      }
    } catch (err) {
      console.error('Group save failed', err);
      toast({ title: 'Error', description: 'Failed to save group', variant: 'destructive' });
    }
  };

  const handleUpdateMembers = (members: Client[]) => {
    if (!currentGroup) return;

    const totalRevenue = members.reduce((acc, m) => acc + m.totalRevenue, 0);
    const avgRevenue = members.length > 0 ? totalRevenue / members.length : 0;

    setGroups((prev) =>
      prev.map((g) =>
        g.id === currentGroup.id
          ? {
            ...g,
            members,
            memberCount: members.length,
            totalRevenue,
            avgRevenue,
            updatedAt: new Date(),
          }
          : g
      )
    );

    toast({
      title: "Members Updated",
      description: `${members.length} members in "${currentGroup.name}".`,
    });
  };

  const confirmDeleteGroup = async () => {
    if (!currentGroup) return;

    try {
      await deleteGroupApi(currentGroup.id);
      setGroups((prev) => prev.filter((g) => g.id !== currentGroup.id));
      setIsDeleteAlertOpen(false);
      setCurrentGroup(null);
      toast({
        title: "Group Deleted",
        description: `"${currentGroup.name}" has been deleted.`,
        variant: "destructive",
      });
    } catch (err) {
      console.error('Delete failed', err);
      toast({ title: 'Error', description: 'Failed to delete group', variant: 'destructive' });
    }
  };

  // ============================================
  // RENDER
  // ============================================

  const hasActiveFilters =
    Boolean(searchQuery) || selectedType !== "all" || sortBy !== "name";

  return (
    <div className="min-h-screen bg-[#F8FAFC]" {...handlers}>
      <PullToRefreshIndicator
        visible={isMobile && (pullDistance > 0 || isRefreshing)}
        distance={pullDistance}
        isRefreshing={isRefreshing}
      />

      <main className="w-full min-w-0 overflow-x-hidden overflow-y-auto pb-24 md:pb-0">
        {/* Header */}
        <div className="crm-module-header sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-[rgba(15,23,42,0.06)]">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="hidden sm:flex items-center gap-2 text-sm text-[#94A3B8] mb-1">
                  <Link to="/dashboard" className="hover:text-[#0891B2]">
                    Dashboard
                  </Link>
                  <ChevronRight size={14} />
                  <Link to="/clients" className="hover:text-[#0891B2]">
                    Clients
                  </Link>
                  <ChevronRight size={14} />
                  <span className="text-[#0F172A]">Groups</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Client Groups</h1>
                <p className="text-[#94A3B8] mt-1">
                  Organize and segment your clients for targeted management
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 xl:justify-end">
                {!isMobile && (
                  <Button variant="outline" className="rounded-md gap-2">
                    <Upload size={16} />
                    Import
                  </Button>
                )}
                {!isMobile && (
                  <Button variant="outline" className="rounded-md gap-2">
                    <Download size={16} />
                    Export
                  </Button>
                )}
                {!isMobile && (
                  <Button
                    onClick={handleCreateGroup}
                    className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md gap-2"
                  >
                    <Plus size={16} />
                    Create Group
                  </Button>
                )}
                {isMobile && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-md"
                    onClick={fetchData}
                    aria-label="Refresh groups"
                  >
                    <RefreshCw size={16} />
                  </Button>
                )}
                {isMobile && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-md"
                    onClick={() => setIsFilterDrawerOpen(true)}
                    aria-label="Open filters"
                  >
                    <Filter size={16} />
                  </Button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div
              className={cn(
                "gap-3 sm:gap-4",
                isMobile
                  ? "flex overflow-x-auto pb-1"
                  : "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5"
              )}
            >
              {[
                {
                  title: "Total Groups",
                  value: stats.totalGroups,
                  icon: Layers,
                  color: "#8B5CF6",
                  delay: 0,
                },
                {
                  title: "Total Clients",
                  value: stats.totalClients,
                  icon: Users,
                  color: "#3B82F6",
                  delay: 0.05,
                },
                {
                  title: "Avg Group Size",
                  value: stats.avgGroupSize,
                  subtitle: "clients per group",
                  icon: Target,
                  color: "#10B981",
                  delay: 0.1,
                },
                {
                  title: "Total Revenue",
                  value: formatCurrency(stats.totalRevenue),
                  icon: CircleDollarSign,
                  color: "#22D3EE",
                  trend: { value: 12.5, label: "vs last month" },
                  delay: 0.15,
                },
                {
                  title: "Top Group",
                  value: stats.topGroup,
                  subtitle: "by revenue",
                  icon: Crown,
                  color: "#FBBF24",
                  delay: 0.2,
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className={cn(isMobile && "min-w-[220px] flex-none")}
                >
                  <StatCard {...card} />
                </div>
              ))}
            </div>
          </div>

          {/* Filters Bar */}
          <div className="border-t border-[rgba(15,23,42,0.06)]">
            <div className="mx-auto w-full max-w-[1600px] px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
            {isMobile ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"
                    />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search groups..."
                      className="h-10 rounded-md border-[rgba(15,23,42,0.06)] pl-9 focus:border-[#22D3EE] focus:ring-[#22D3EE]/20"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-md"
                    onClick={() => setViewMode((prev) => (prev === "grid" ? "list" : "grid"))}
                    aria-label="Toggle layout"
                  >
                    {viewMode === "grid" ? <List size={16} /> : <LayoutGrid size={16} />}
                  </Button>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <Badge className="rounded-full bg-[#0891B2]/10 px-3 py-1 text-[#0891B2]">
                    {filteredGroups.length} groups
                  </Badge>
                  {selectedType !== "all" && (
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      {getTypeInfo(selectedType).name}
                    </Badge>
                  )}
                  {sortBy !== "name" && (
                    <Badge variant="outline" className="rounded-full px-3 py-1 capitalize">
                      Sort: {sortBy}
                    </Badge>
                  )}
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedType("all");
                        setSortBy("name");
                      }}
                      className="h-8 rounded-full px-3 text-[#94A3B8]"
                    >
                      <X size={14} className="mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                  {/* Search */}
                  <div className={cn("relative w-full", isTablet ? "max-w-sm" : "xl:w-80 xl:max-w-sm")}>
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"
                    />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search groups..."
                      className="pl-9 h-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-[#22D3EE]/20"
                    />
                  </div>

                  {/* Type Filter */}
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="h-10 w-full rounded-md sm:w-44">
                      <Filter size={14} className="mr-2 text-[#475569]" />
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="all" className="rounded-md">
                        All Types
                      </SelectItem>
                      {groupTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id} className="rounded-md">
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Sort */}
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                    <SelectTrigger className="h-10 w-full rounded-md sm:w-40">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="name" className="rounded-md">
                        Name
                      </SelectItem>
                      <SelectItem value="members" className="rounded-md">
                        Members
                      </SelectItem>
                      <SelectItem value="revenue" className="rounded-md">
                        Revenue
                      </SelectItem>
                      <SelectItem value="created" className="rounded-md">
                        Date Created
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedType("all");
                        setSortBy("name");
                      }}
                      className="rounded-md text-[#94A3B8]"
                    >
                      <X size={14} className="mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                {/* View Toggle */}
                <div className="flex shrink-0 items-center gap-1 self-start rounded-md bg-white/5 p-1 xl:self-auto">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "rounded-md h-8 w-8 p-0",
                      viewMode === "grid" && "bg-white"
                    )}
                  >
                    <LayoutGrid size={16} />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "rounded-md h-8 w-8 p-0",
                      viewMode === "list" && "bg-white"
                    )}
                  >
                    <List size={16} />
                  </Button>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {isOffline && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              You&apos;re offline. Showing the most recently loaded client groups.
            </div>
          )}

          {loading ? (
            <ListCardSkeleton count={isMobile ? 4 : 6} />
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[rgba(15,23,42,0.08)] bg-white px-6 py-16 text-center">
              <div className="mb-4 rounded-full bg-red-50 p-4 text-red-500">
                <AlertCircle size={28} />
              </div>
              <h3 className="text-lg font-semibold text-[#0F172A]">Couldn&apos;t load client groups</h3>
              <p className="mt-2 max-w-md text-sm text-[#475569]">{loadError}</p>
              <Button onClick={fetchData} className="mt-5 bg-[#0891B2] text-white hover:bg-[#0891B2]/90">
                <RefreshCw size={16} className="mr-2" />
                Retry
              </Button>
            </div>
          ) : filteredGroups.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Folder size={32} className="text-[#475569]" />
              </div>
              <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
                {hasActiveFilters ? "No matching groups" : "No groups found"}
              </h3>
              <p className="text-[#94A3B8] mb-6 text-center max-w-md">
                {hasActiveFilters
                  ? "Try adjusting your search or filters to find a group."
                  : "Create your first client group to start organizing your clients."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedType("all");
                      setSortBy("name");
                    }}
                    className="rounded-md"
                  >
                    Clear Filters
                  </Button>
                )}
                <Button
                  onClick={handleCreateGroup}
                  className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md gap-2"
                >
                  <Plus size={16} />
                  Create Group
                </Button>
              </div>
            </motion.div>
          ) : isMobile ? (
            <div className="space-y-4">
              {filteredGroups.map((group) => (
                <MobileGroupCard
                  key={group.id}
                  group={group}
                  onView={() => handleViewGroup(group)}
                  onDelete={() => handleDeleteGroup(group)}
                />
              ))}
            </div>
          ) : viewMode === "grid" ? (
            <div className={cn("grid gap-6", isTablet ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3")}>
              <AnimatePresence mode="popLayout">
                {filteredGroups.map((group, index) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onClick={() => handleViewGroup(group)}
                    onEdit={() => handleEditGroup(group)}
                    onDelete={() => handleDeleteGroup(group)}
                    onManageMembers={() => handleManageMembers(group)}
                    delay={index * 0.05}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden"
            >
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F8FAFC]">
                    <TableHead className="font-semibold">Group</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Members</TableHead>
                    <TableHead className="font-semibold">Total Revenue</TableHead>
                    {!isTablet && <TableHead className="font-semibold">Avg Revenue</TableHead>}
                    {!isTablet && <TableHead className="font-semibold">Created</TableHead>}
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.map((group) => (
                    <GroupTableRow
                      key={group.id}
                      group={group}
                      onClick={() => handleViewGroup(group)}
                      onEdit={() => handleEditGroup(group)}
                      onDelete={() => handleDeleteGroup(group)}
                      onManageMembers={() => handleManageMembers(group)}
                    />
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          )}

          {/* Results Count */}
          {filteredGroups.length > 0 && (
            <div className="mt-6 text-center text-sm text-[#94A3B8]">
              Showing {filteredGroups.length} of {groups.length} groups
            </div>
          )}
        </div>
      </main>

      {isMobile && (
        <Button
          onClick={handleCreateGroup}
          size="icon"
          className="mobile-create-fab fixed bottom-6 right-5 z-40 h-14 w-14 rounded-full bg-[#0891B2] text-white shadow-lg hover:bg-[#0891B2]/90"
          aria-label="Create group"
        >
          <Plus size={22} />
        </Button>
      )}

      <Drawer open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
        <DrawerContent className="rounded-t-[24px] border-none bg-white">
          <DrawerHeader>
            <DrawerTitle>Filter Client Groups</DrawerTitle>
            <DrawerDescription>
              Narrow down groups by type and sort order.
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-5 px-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="mobile-group-type">Group Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger id="mobile-group-type" className="h-11 rounded-md">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="all">All Types</SelectItem>
                  {groupTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile-group-sort">Sort By</Label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                <SelectTrigger id="mobile-group-sort" className="h-11 rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="members">Members</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="created">Date Created</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DrawerFooter className="flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setSearchQuery("");
                setSelectedType("all");
                setSortBy("name");
              }}
            >
              Clear
            </Button>
            <Button
              className="flex-1 bg-[#0891B2] text-white hover:bg-[#0891B2]/90"
              onClick={() => setIsFilterDrawerOpen(false)}
            >
              Apply
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Dialogs */}
      <GroupFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        group={currentGroup}
        onSubmit={handleFormSubmit}
      />

      <GroupDetailsDialog
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        group={currentGroup}
        onEdit={() => {
          setIsDetailsOpen(false);
          setIsFormOpen(true);
        }}
        onManageMembers={() => {
          setIsDetailsOpen(false);
          setIsMembersOpen(true);
        }}
      />

      <ManageMembersDialog
        isOpen={isMembersOpen}
        onClose={() => setIsMembersOpen(false)}
        group={currentGroup}
        allClients={clients}
        onUpdateMembers={handleUpdateMembers}
      />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{currentGroup?.name}"? This action cannot
              be undone. The clients in this group will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteGroup}
              className="bg-red-600 hover:bg-red-700 rounded-md"
            >
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientGroupsPage;
