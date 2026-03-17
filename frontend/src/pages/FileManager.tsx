// src/pages/FileManager.tsx

import React, { useRef, useState, useCallback, useMemo, useEffect } from "react";
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  Bell,
  Maximize2,
  Star,
  StarOff,
  Search,
  Upload,
  Folder,
  FolderPlus,
  FolderOpen,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  File,
  Clock,
  Share2,
  Trash2,
  MoreVertical,
  MoreHorizontal,
  LayoutGrid,
  List,
  HardDrive,
  Download,
  Eye,
  Pencil,
  Copy,
  Link2,
  Users,
  Lock,
  Globe,
  ChevronRight,
  ChevronDown,
  Plus,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  Info,
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  Tag,
  Sparkles,
  Cloud,
  CloudUpload,
  RefreshCw,
  Settings,
  ExternalLink,
  Move,
  FolderInput,
  ArrowUpRight,
  TrendingUp,
  BarChart3,
  PieChart,
  Zap,
  Shield,
  Activity,
  type LucideIcon,
} from "lucide-react";
import {
  uploadFile as apiUploadFile,
  getFiles,
  getFolders,
  getRecentFiles,
  getStarredFiles,
  getTrashedFiles,
  getStorageAnalytics,
  toggleFileStar,
  toggleFolderStar,
  deleteFile as apiDeleteFile,
  deleteFolder as apiDeleteFolder,
  downloadFile as apiDownloadFile,
  createFolder as apiCreateFolder,
  renameFile as apiRenameFile,
  renameFolder as apiRenameFolder,
  bulkDeleteFiles,
  restoreFile as apiRestoreFile,
  createShareLink as apiCreateShareLink,
  type FileResponse,
  type FolderResponse,
  type StorageAnalytics as StorageAnalyticsType,
} from "@/features/files/services/files-service";

// ============================================
// TYPES
// ============================================

interface FileItem {
  id: string;
  name: string;
  type: "folder" | "file";
  fileType?: string;
  size: number;
  sizeFormatted: string;
  modified: string;
  modifiedDate: Date;
  created: string;
  owner: string;
  shared: boolean;
  starred: boolean;
  tags: string[];
  path: string;
  thumbnail?: string;
  color?: string;
  filesCount?: number;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  size: string;
  status: "uploading" | "completed" | "error";
}

interface StorageInfo {
  used: number;
  total: number;
  breakdown: {
    documents: number;
    images: number;
    videos: number;
    audio: number;
    other: number;
  };
}

// ============================================
// CONSTANTS & DATA
// ============================================

const folderColors = [
  { id: "default", color: "#22D3EE", name: "Teal" },
  { id: "gold", color: "#FBBF24", name: "Gold" },
  { id: "blue", color: "#3B82F6", name: "Blue" },
  { id: "purple", color: "#8B5CF6", name: "Purple" },
  { id: "pink", color: "#EC4899", name: "Pink" },
  { id: "orange", color: "#F97316", name: "Orange" },
  { id: "green", color: "#22C55E", name: "Green" },
  { id: "red", color: "#EF4444", name: "Red" },
];

const tags = [
  { id: "important", name: "Important", color: "#EF4444" },
  { id: "work", name: "Work", color: "#3B82F6" },
  { id: "personal", name: "Personal", color: "#8B5CF6" },
  { id: "client", name: "Client", color: "#22D3EE" },
  { id: "archive", name: "Archive", color: "#6B7280" },
];

// Dummy folders data
const initialFolders: FileItem[] = [
  {
    id: "f1",
    name: "Projects",
    type: "folder",
    size: 2252341248,
    sizeFormatted: "2.1 GB",
    modified: "2 hours ago",
    modifiedDate: new Date(Date.now() - 7200000),
    created: "Jan 15, 2024",
    owner: "You",
    shared: true,
    starred: true,
    tags: ["work"],
    path: "/Projects",
    color: "#22D3EE",
    filesCount: 45,
  },
  {
    id: "f2",
    name: "Clients",
    type: "folder",
    size: 838860800,
    sizeFormatted: "800 MB",
    modified: "Yesterday",
    modifiedDate: new Date(Date.now() - 86400000),
    created: "Jan 10, 2024",
    owner: "You",
    shared: true,
    starred: false,
    tags: ["client", "important"],
    path: "/Clients",
    color: "#FBBF24",
    filesCount: 12,
  },
  {
    id: "f3",
    name: "Invoices",
    type: "folder",
    size: 314572800,
    sizeFormatted: "300 MB",
    modified: "3 days ago",
    modifiedDate: new Date(Date.now() - 259200000),
    created: "Dec 20, 2023",
    owner: "You",
    shared: false,
    starred: false,
    tags: ["work"],
    path: "/Invoices",
    color: "#3B82F6",
    filesCount: 120,
  },
  {
    id: "f4",
    name: "Assets",
    type: "folder",
    size: 4831838208,
    sizeFormatted: "4.5 GB",
    modified: "1 week ago",
    modifiedDate: new Date(Date.now() - 604800000),
    created: "Nov 5, 2023",
    owner: "You",
    shared: true,
    starred: true,
    tags: ["work"],
    path: "/Assets",
    color: "#8B5CF6",
    filesCount: 8,
  },
  {
    id: "f5",
    name: "Marketing",
    type: "folder",
    size: 1073741824,
    sizeFormatted: "1 GB",
    modified: "2 weeks ago",
    modifiedDate: new Date(Date.now() - 1209600000),
    created: "Oct 15, 2023",
    owner: "Sarah",
    shared: true,
    starred: false,
    tags: ["work"],
    path: "/Marketing",
    color: "#EC4899",
    filesCount: 32,
  },
  {
    id: "f6",
    name: "Archive",
    type: "folder",
    size: 5368709120,
    sizeFormatted: "5 GB",
    modified: "1 month ago",
    modifiedDate: new Date(Date.now() - 2592000000),
    created: "Sep 1, 2023",
    owner: "You",
    shared: false,
    starred: false,
    tags: ["archive"],
    path: "/Archive",
    color: "#6B7280",
    filesCount: 256,
  },
];

// Dummy files data
const initialFiles: FileItem[] = [
  {
    id: "file1",
    name: "dashboard_redesign.fig",
    type: "file",
    fileType: "figma",
    size: 13107200,
    sizeFormatted: "12.5 MB",
    modified: "5 mins ago",
    modifiedDate: new Date(Date.now() - 300000),
    created: "Today",
    owner: "You",
    shared: true,
    starred: true,
    tags: ["work", "important"],
    path: "/Projects/dashboard_redesign.fig",
  },
  {
    id: "file2",
    name: "client_contract.pdf",
    type: "file",
    fileType: "pdf",
    size: 1258291,
    sizeFormatted: "1.2 MB",
    modified: "1 hour ago",
    modifiedDate: new Date(Date.now() - 3600000),
    created: "Today",
    owner: "You",
    shared: true,
    starred: false,
    tags: ["client", "important"],
    path: "/Clients/client_contract.pdf",
  },
  {
    id: "file3",
    name: "project_timeline.xlsx",
    type: "file",
    fileType: "spreadsheet",
    size: 819200,
    sizeFormatted: "800 KB",
    modified: "3 hours ago",
    modifiedDate: new Date(Date.now() - 10800000),
    created: "Yesterday",
    owner: "Sarah",
    shared: true,
    starred: false,
    tags: ["work"],
    path: "/Projects/project_timeline.xlsx",
  },
  {
    id: "file4",
    name: "api_documentation.md",
    type: "file",
    fileType: "document",
    size: 12288,
    sizeFormatted: "12 KB",
    modified: "Yesterday",
    modifiedDate: new Date(Date.now() - 86400000),
    created: "Yesterday",
    owner: "You",
    shared: false,
    starred: false,
    tags: ["work"],
    path: "/Projects/api_documentation.md",
  },
  {
    id: "file5",
    name: "team_photo.jpg",
    type: "file",
    fileType: "image",
    size: 3145728,
    sizeFormatted: "3 MB",
    modified: "2 days ago",
    modifiedDate: new Date(Date.now() - 172800000),
    created: "2 days ago",
    owner: "Mike",
    shared: true,
    starred: true,
    tags: ["personal"],
    path: "/Assets/team_photo.jpg",
    thumbnail: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100",
  },
  {
    id: "file6",
    name: "presentation.pptx",
    type: "file",
    fileType: "presentation",
    size: 5242880,
    sizeFormatted: "5 MB",
    modified: "3 days ago",
    modifiedDate: new Date(Date.now() - 259200000),
    created: "3 days ago",
    owner: "You",
    shared: true,
    starred: false,
    tags: ["client", "work"],
    path: "/Marketing/presentation.pptx",
  },
  {
    id: "file7",
    name: "source_code.zip",
    type: "file",
    fileType: "archive",
    size: 15728640,
    sizeFormatted: "15 MB",
    modified: "1 week ago",
    modifiedDate: new Date(Date.now() - 604800000),
    created: "1 week ago",
    owner: "You",
    shared: false,
    starred: false,
    tags: ["archive"],
    path: "/Archive/source_code.zip",
  },
  {
    id: "file8",
    name: "product_demo.mp4",
    type: "file",
    fileType: "video",
    size: 52428800,
    sizeFormatted: "50 MB",
    modified: "2 weeks ago",
    modifiedDate: new Date(Date.now() - 1209600000),
    created: "2 weeks ago",
    owner: "Sarah",
    shared: true,
    starred: false,
    tags: ["marketing"],
    path: "/Marketing/product_demo.mp4",
  },
];

const storageInfo: StorageInfo = {
  used: 69793218560,
  total: 107374182400,
  breakdown: {
    documents: 15,
    images: 25,
    videos: 35,
    audio: 5,
    other: 20,
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const getFileIcon = (fileType?: string): LucideIcon => {
  switch (fileType) {
    case "pdf":
    case "document":
    case "doc":
      return FileText;
    case "image":
    case "jpg":
    case "png":
    case "gif":
      return FileImage;
    case "video":
    case "mp4":
    case "mov":
      return FileVideo;
    case "audio":
    case "mp3":
    case "wav":
      return FileAudio;
    case "spreadsheet":
    case "xlsx":
    case "csv":
      return FileSpreadsheet;
    case "code":
    case "js":
    case "ts":
    case "py":
      return FileCode;
    case "archive":
    case "zip":
    case "rar":
      return FileArchive;
    default:
      return File;
  }
};

const getFileTypeColor = (fileType?: string): string => {
  switch (fileType) {
    case "pdf":
      return "#EF4444";
    case "document":
    case "doc":
      return "#3B82F6";
    case "image":
      return "#8B5CF6";
    case "video":
      return "#EC4899";
    case "audio":
      return "#F97316";
    case "spreadsheet":
      return "#22C55E";
    case "figma":
      return "#A855F7";
    case "presentation":
      return "#F59E0B";
    case "archive":
      return "#6B7280";
    default:
      return "#22D3EE";
  }
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return date.toLocaleDateString();
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
// FOLDER CARD COMPONENT
// ============================================

const FolderCard = ({
  folder,
  isSelected,
  onSelect,
  onOpen,
  onStar,
  onShare,
  onRename,
  onDelete,
  viewMode,
  delay = 0,
}: {
  folder: FileItem;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onStar: () => void;
  onShare: () => void;
  onRename: () => void;
  onDelete: () => void;
  viewMode: "grid" | "list";
  delay?: number;
}) => {
  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay }}
        className={cn(
          "flex items-center gap-4 p-4 rounded-md border transition-all cursor-pointer group",
          isSelected
            ? "bg-[#0891B2]/5 border-[#22D3EE]"
            : "bg-white border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg "
        )}
        onClick={onOpen}
      >
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            className="data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
          />
        </div>

        <div
          className="w-12 h-12 rounded-md flex items-center justify-center"
          style={{ backgroundColor: `${folder.color}20` }}
        >
          <Folder size={24} style={{ color: folder.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[#0F172A] truncate group-hover:text-[#0891B2] transition-colors">
              {folder.name}
            </h3>
            {folder.starred && <Star size={14} className="text-[#D97706] fill-[#FBBF24]" />}
            {folder.shared && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#0891B2] text-xs">Shared</span>
            )}
          </div>
          <p className="text-sm text-[#94A3B8]">{folder.filesCount} files • {folder.sizeFormatted}</p>
        </div>

        <div className="text-sm text-[#475569]">{folder.modified}</div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={onStar}>
            {folder.starred ? (
              <Star size={16} className="text-[#D97706] fill-[#FBBF24]" />
            ) : (
              <StarOff size={16} className="text-[#475569]" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
                <MoreVertical size={16} className="text-[#475569]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-md">
              <DropdownMenuItem onClick={onOpen} className="rounded-md">
                <FolderOpen size={14} className="mr-2" /> Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShare} className="rounded-md">
                <Share2 size={14} className="mr-2" /> Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRename} className="rounded-md">
                <Pencil size={14} className="mr-2" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-md">
                <Move size={14} className="mr-2" /> Move to
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="rounded-md text-red-600 focus:text-red-600">
                <Trash2 size={14} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className={cn(
        "relative bg-white rounded-md p-5 border transition-all cursor-pointer group",
        isSelected
          ? "border-[#22D3EE] ring-2 ring-[#22D3EE]/20"
          : "border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg "
      )}
      onClick={onOpen}
    >
      {/* Selection Checkbox */}
      <div
        className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
        />
      </div>

      {/* Actions Menu */}
      <div
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md bg-white/80 backdrop-blur-sm">
              <MoreHorizontal size={16} className="text-[#475569]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-md">
            <DropdownMenuItem onClick={onOpen} className="rounded-md">
              <FolderOpen size={14} className="mr-2" /> Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShare} className="rounded-md">
              <Share2 size={14} className="mr-2" /> Share
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRename} className="rounded-md">
              <Pencil size={14} className="mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-md">
              <Move size={14} className="mr-2" /> Move to
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="rounded-md text-red-600 focus:text-red-600">
              <Trash2 size={14} className="mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Folder Icon */}
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-14 h-14 rounded-md flex items-center justify-center"
          style={{ backgroundColor: `${folder.color}15` }}
        >
          <Folder size={28} style={{ color: folder.color }} />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStar();
          }}
          className="p-2 rounded-md hover:bg-white/10 transition-colors"
        >
          {folder.starred ? (
            <Star size={18} className="text-[#D97706] fill-[#FBBF24]" />
          ) : (
            <Star size={18} className="text-[#475569] group-hover:text-[#475569]" />
          )}
        </button>
      </div>

      {/* Folder Info */}
      <div>
        <h3 className="font-semibold text-[#0F172A] truncate group-hover:text-[#0891B2] transition-colors mb-1">
          {folder.name}
        </h3>
        <p className="text-sm text-[#94A3B8]">{folder.filesCount} files</p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgba(15,23,42,0.06)]">
          <span className="text-xs text-[#475569]">{folder.sizeFormatted}</span>
          <div className="flex items-center gap-1">
            {folder.shared && (
              <span className="p-1 rounded bg-blue-50">
                <Users size={12} className="text-blue-500" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tags */}
      {folder.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {folder.tags.slice(0, 2).map((tagId) => {
            const tag = tags.find((t) => t.id === tagId);
            return tag ? (
              <span
                key={tag.id}
                className="px-2 py-0.5 rounded-md text-xs font-medium"
                style={{ backgroundColor: `${tag.color}15`, color: tag.color }}
              >
                {tag.name}
              </span>
            ) : null;
          })}
        </div>
      )}
    </motion.div>
  );
};

// ============================================
// FILE CARD COMPONENT
// ============================================

const FileCard = ({
  file,
  isSelected,
  onSelect,
  onOpen,
  onStar,
  onShare,
  onDownload,
  onRename,
  onDelete,
  viewMode,
  delay = 0,
}: {
  file: FileItem;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onStar: () => void;
  onShare: () => void;
  onDownload: () => void;
  onRename: () => void;
  onDelete: () => void;
  viewMode: "grid" | "list";
  delay?: number;
}) => {
  const Icon = getFileIcon(file.fileType);
  const iconColor = getFileTypeColor(file.fileType);

  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay }}
        className={cn(
          "flex items-center gap-4 p-4 rounded-md border transition-all cursor-pointer group",
          isSelected
            ? "bg-[#0891B2]/5 border-[#22D3EE]"
            : "bg-white border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg "
        )}
        onClick={onOpen}
      >
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            className="data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
          />
        </div>

        {file.thumbnail ? (
          <img
            src={file.thumbnail}
            alt={file.name}
            className="w-12 h-12 rounded-md object-cover"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-md flex items-center justify-center"
            style={{ backgroundColor: `${iconColor}15` }}
          >
            <Icon size={24} style={{ color: iconColor }} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-[#0F172A] truncate group-hover:text-[#0891B2] transition-colors">
              {file.name}
            </h3>
            {file.starred && <Star size={14} className="text-[#D97706] fill-[#FBBF24]" />}
          </div>
          <p className="text-sm text-[#94A3B8]">{file.fileType?.toUpperCase()} • {file.sizeFormatted}</p>
        </div>

        <div className="text-sm text-[#475569]">{file.modified}</div>
        <div className="text-sm text-[#475569]">{file.owner}</div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={onDownload}>
            <Download size={16} className="text-[#475569]" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={onStar}>
            {file.starred ? (
              <Star size={16} className="text-[#D97706] fill-[#FBBF24]" />
            ) : (
              <StarOff size={16} className="text-[#475569]" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
                <MoreVertical size={16} className="text-[#475569]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-md">
              <DropdownMenuItem onClick={onOpen} className="rounded-md">
                <Eye size={14} className="mr-2" /> Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDownload} className="rounded-md">
                <Download size={14} className="mr-2" /> Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShare} className="rounded-md">
                <Share2 size={14} className="mr-2" /> Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRename} className="rounded-md">
                <Pencil size={14} className="mr-2" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-md">
                <Move size={14} className="mr-2" /> Move to
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="rounded-md text-red-600 focus:text-red-600">
                <Trash2 size={14} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className={cn(
        "relative bg-white rounded-md border overflow-hidden transition-all cursor-pointer group",
        isSelected
          ? "border-[#22D3EE] ring-2 ring-[#22D3EE]/20"
          : "border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg "
      )}
      onClick={onOpen}
    >
      {/* Thumbnail/Preview */}
      <div className="relative h-32 bg-[#F8FAFC] flex items-center justify-center">
        {file.thumbnail ? (
          <img
            src={file.thumbnail}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon size={48} style={{ color: iconColor }} className="opacity-50" />
        )}

        {/* Selection Checkbox */}
        <div
          className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            className="data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE] bg-white"
          />
        </div>

        {/* Quick Actions */}
        <div
          className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md bg-white/90 backdrop-blur-sm hover:bg-white"
            onClick={onDownload}
          >
            <Download size={14} className="text-[#475569]" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md bg-white/90 backdrop-blur-sm hover:bg-white"
              >
                <MoreHorizontal size={14} className="text-[#475569]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-md">
              <DropdownMenuItem onClick={onOpen} className="rounded-md">
                <Eye size={14} className="mr-2" /> Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDownload} className="rounded-md">
                <Download size={14} className="mr-2" /> Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShare} className="rounded-md">
                <Share2 size={14} className="mr-2" /> Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRename} className="rounded-md">
                <Pencil size={14} className="mr-2" /> Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="rounded-md text-red-600 focus:text-red-600">
                <Trash2 size={14} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* File Type Badge */}
        <div className="absolute bottom-3 left-3">
          <span
            className="px-2 py-1 rounded-md text-xs font-semibold text-[#0F172A]"
            style={{ backgroundColor: iconColor }}
          >
            {file.fileType?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* File Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-[#0F172A] truncate group-hover:text-[#0891B2] transition-colors flex-1">
            {file.name}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStar();
            }}
            className="flex-shrink-0"
          >
            {file.starred ? (
              <Star size={16} className="text-[#D97706] fill-[#FBBF24]" />
            ) : (
              <Star size={16} className="text-[#475569] hover:text-[#475569]" />
            )}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-[#475569]">{file.sizeFormatted}</span>
          <span className="text-xs text-[#475569]">{file.modified}</span>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// UPLOAD PROGRESS COMPONENT
// ============================================

const UploadProgress = ({
  files,
  onCancel,
  onClose,
}: {
  files: UploadingFile[];
  onCancel: (id: string) => void;
  onClose: () => void;
}) => {
  if (files.length === 0) return null;

  const allCompleted = files.every((f) => f.status === "completed");

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed bottom-6 right-6 w-96 bg-white rounded-md card-shadow border border-[rgba(15,23,42,0.06)] overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
            <CloudUpload size={20} className="text-[#0891B2]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#0F172A]">
              {allCompleted ? "Upload Complete" : "Uploading Files"}
            </h3>
            <p className="text-xs text-[#94A3B8]">{files.length} file(s)</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>

      {/* Files List */}
      <div className="max-h-64 overflow-y-auto p-4 space-y-3">
        {files.map((file) => (
          <div key={file.id} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-white/5 flex items-center justify-center">
              <FileText size={18} className="text-[#94A3B8]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#0F172A] truncate">{file.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {file.status === "uploading" && (
                  <>
                    <Progress value={file.progress} className="h-1.5 flex-1" />
                    <span className="text-xs text-[#94A3B8]">{file.progress}%</span>
                  </>
                )}
                {file.status === "completed" && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 size={12} />
                    Completed
                  </span>
                )}
                {file.status === "error" && (
                  <span className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle size={12} />
                    Failed
                  </span>
                )}
              </div>
            </div>
            {file.status === "uploading" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md"
                onClick={() => onCancel(file.id)}
              >
                <X size={14} />
              </Button>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ============================================
// CREATE FOLDER DIALOG
// ============================================

const CreateFolderDialog = ({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string) => void;
}) => {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(folderColors[0].color);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim(), selectedColor);
      setName("");
      setSelectedColor(folderColors[0].color);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-0 rounded-md overflow-hidden">
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">Create New Folder</DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Add a new folder to organize your files
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Folder Name</Label>
            <div className="relative">
              <Folder size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: selectedColor }} />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter folder name..."
                className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Folder Color</Label>
            <div className="flex flex-wrap gap-2">
              {folderColors.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setSelectedColor(color.color)}
                  className={cn(
                    "w-10 h-10 rounded-md flex items-center justify-center transition-all",
                    selectedColor === color.color
                      ? "ring-2 ring-offset-2"
                      : "hover:scale-110"
                  )}
                  style={{
                    backgroundColor: `${color.color}20`,
                    ringColor: color.color,
                  }}
                >
                  <Folder size={20} style={{ color: color.color }} />
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-4 gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-md">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
            >
              <FolderPlus size={16} className="mr-2" />
              Create Folder
            </Button>
          </DialogFooter>
        </form>
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
  item,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: FileItem | null;
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [accessType, setAccessType] = useState("view");

  const handleCopy = async () => {
    const link = `https://crm.yoursoft.ca/files/${item?.id}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast({
      title: "Link Copied!",
      description: "The sharing link has been copied to your clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 rounded-md overflow-hidden">
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">Share "{item.name}"</DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Share this {item.type} with others
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5">
          {/* Share Link */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Share Link</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  value={`https://crm.yoursoft.ca/files/${item.id}`}
                  readOnly
                  className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] bg-[#F8FAFC]"
                />
              </div>
              <Button
                onClick={handleCopy}
                className={cn(
                  "rounded-md h-11 px-4",
                  copied
                    ? "bg-green-500 hover:bg-green-500"
                    : "bg-[#0891B2] hover:bg-[#0891B2]/90"
                )}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </Button>
            </div>
          </div>

          {/* Access Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Access Type</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { id: "view", icon: Eye, label: "View Only" },
                { id: "comment", icon: FileText, label: "Can Comment" },
                { id: "edit", icon: Pencil, label: "Can Edit" },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setAccessType(option.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-md border-2 transition-all",
                    accessType === option.id
                      ? "border-[#22D3EE] bg-[#0891B2]/5"
                      : "border-[rgba(15,23,42,0.06)] hover:border-slate-300"
                  )}
                >
                  <option.icon size={20} className={accessType === option.id ? "text-[#0891B2]" : "text-[#475569]"} />
                  <span className={cn("text-xs font-medium", accessType === option.id ? "text-[#0891B2]" : "text-[#475569]")}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Share with People */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Share with People</Label>
            <div className="relative">
              <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
              <Input
                placeholder="Enter email addresses..."
                className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
              />
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="p-4 rounded-md bg-[#F8FAFC] space-y-3">
            <h4 className="text-sm font-medium text-[#0F172A]">Privacy Settings</h4>
            <div className="space-y-2">
              {[
                { icon: Globe, label: "Anyone with the link", desc: "Public access" },
                { icon: Users, label: "Only people added", desc: "Restricted access" },
                { icon: Lock, label: "Only you", desc: "Private" },
              ].map((option, index) => (
                <label
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-md hover:bg-white cursor-pointer transition-colors"
                >
                  <input type="radio" name="privacy" className="text-[#0891B2]" defaultChecked={index === 0} />
                  <option.icon size={18} className="text-[#475569]" />
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">{option.label}</p>
                    <p className="text-xs text-[#94A3B8]">{option.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 gap-3">
          <Button variant="outline" onClick={onClose} className="rounded-md">
            Cancel
          </Button>
          <Button className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md">
            <Share2 size={16} className="mr-2" />
            Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// MAIN FILE MANAGER COMPONENT
// ============================================

const FileManagerPage = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState("modified");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [folders, setFolders] = useState<FileItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "My Files" }]);
  const [storage, setStorage] = useState<StorageAnalyticsType | null>(null);

  // Dialogs
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareItem, setShareItem] = useState<FileItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteItem, setDeleteItem] = useState<FileItem | null>(null);

  // ── Helper: Convert API response to FileItem ──
  const fileToItem = (f: FileResponse): FileItem => ({
    id: f.id,
    name: f.name,
    type: "file",
    fileType: f.extension?.replace('.', '') || f.mimeType.split('/')[0] || 'file',
    size: f.size,
    sizeFormatted: formatBytes(f.size),
    modified: getRelativeTime(new Date(f.updatedAt)),
    modifiedDate: new Date(f.updatedAt),
    created: new Date(f.createdAt).toLocaleDateString(),
    owner: "You",
    shared: f.isShared,
    starred: f.isStarred,
    tags: f.tags?.map(t => t.name) || [],
    path: f.path,
  });

  const folderToItem = (f: FolderResponse): FileItem => ({
    id: f.id,
    name: f.name,
    type: "folder",
    size: 0,
    sizeFormatted: "—",
    modified: getRelativeTime(new Date(f.updatedAt)),
    modifiedDate: new Date(f.updatedAt),
    created: new Date(f.createdAt).toLocaleDateString(),
    owner: "You",
    shared: f.isShared,
    starred: f.isStarred,
    tags: [],
    path: `/${f.name}`,
    color: "#22D3EE",
    filesCount: f.filesCount,
  });

  // ── Load data from API ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let apiFiles: FileResponse[] = [];
      let apiFolders: FolderResponse[] = [];

      if (activeTab === "recent") {
        apiFiles = await getRecentFiles();
      } else if (activeTab === "starred") {
        apiFiles = await getStarredFiles();
      } else if (activeTab === "trash") {
        apiFiles = await getTrashedFiles();
      } else {
        const [filesRes, foldersRes] = await Promise.all([
          getFiles({ folderId: currentFolderId || undefined, search: searchTerm || undefined }),
          getFolders({ parentId: currentFolderId || undefined, search: searchTerm || undefined }),
        ]);
        apiFiles = filesRes;
        apiFolders = foldersRes;
      }

      setFiles(apiFiles.map(fileToItem));
      setFolders(apiFolders.map(folderToItem));
    } catch (err) {
      console.error("Failed to load files", err);
      // Keep existing data on error
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentFolderId, searchTerm]);

  // Load storage analytics
  const loadStorage = useCallback(async () => {
    try {
      const analytics = await getStorageAnalytics();
      setStorage(analytics);
    } catch (err) {
      console.error("Failed to load storage analytics", err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadStorage();
  }, [loadStorage]);

  // Filtered and sorted items (client-side filtering on top of server-side)
  const filteredFolders = useMemo(() => {
    let result = [...folders];
    return result.sort((a, b) => {
      const modifier = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "name") return a.name.localeCompare(b.name) * modifier;
      if (sortBy === "size") return (a.size - b.size) * modifier;
      return (a.modifiedDate.getTime() - b.modifiedDate.getTime()) * modifier;
    });
  }, [folders, sortBy, sortOrder]);

  const filteredFiles = useMemo(() => {
    let result = [...files];
    return result.sort((a, b) => {
      const modifier = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "name") return a.name.localeCompare(b.name) * modifier;
      if (sortBy === "size") return (a.size - b.size) * modifier;
      return (a.modifiedDate.getTime() - b.modifiedDate.getTime()) * modifier;
    });
  }, [files, sortBy, sortOrder]);

  // Stats
  const stats = useMemo(() => ({
    totalFiles: files.length + folders.length,
    totalSize: storage ? formatBytes(storage.totalUsed) : "—",
    sharedItems: folders.filter((f) => f.shared).length + files.filter((f) => f.shared).length,
    starredItems: folders.filter((f) => f.starred).length + files.filter((f) => f.starred).length,
  }), [folders, files, storage]);

  // Handlers
  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      handleUpload(Array.from(selectedFiles));
    }
    event.target.value = "";
  };

  const handleUpload = async (filesToUpload: File[]) => {
    const newUploadingFiles: UploadingFile[] = filesToUpload.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      progress: 0,
      size: formatBytes(file.size),
      status: "uploading" as const,
    }));

    setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

    toast({
      title: "Upload Started",
      description: `Uploading ${filesToUpload.length} file(s)...`,
    });

    // Upload each file via API
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const uploadId = newUploadingFiles[i].id;
      try {
        await apiUploadFile(
          file,
          { folderId: currentFolderId || undefined },
          (pct) => {
            setUploadingFiles((prev) =>
              prev.map((f) => f.id === uploadId ? { ...f, progress: pct } : f)
            );
          }
        );
        setUploadingFiles((prev) =>
          prev.map((f) => f.id === uploadId ? { ...f, progress: 100, status: "completed" as const } : f)
        );
      } catch (err) {
        console.error("Upload failed", err);
        setUploadingFiles((prev) =>
          prev.map((f) => f.id === uploadId ? { ...f, status: "error" as const } : f)
        );
      }
    }

    // Reload file list
    loadData();
    loadStorage();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleUpload(droppedFiles);
    }
  }, [currentFolderId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleCreateFolder = async (name: string, _color: string) => {
    try {
      await apiCreateFolder(name, currentFolderId);
      toast({
        title: "Folder Created",
        description: `"${name}" has been created successfully.`,
      });
      loadData();
    } catch (err) {
      toast({ title: "Error", description: "Failed to create folder.", variant: "destructive" });
    }
  };

  const handleToggleStar = async (item: FileItem) => {
    try {
      if (item.type === "folder") {
        await toggleFolderStar(item.id);
        setFolders((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, starred: !f.starred } : f))
        );
      } else {
        await toggleFileStar(item.id);
        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, starred: !f.starred } : f))
        );
      }
      toast({
        title: item.starred ? "Removed from Starred" : "Added to Starred",
        description: `"${item.name}" has been ${item.starred ? "removed from" : "added to"} starred items.`,
      });
    } catch (err) {
      toast({ title: "Error", description: "Failed to toggle star.", variant: "destructive" });
    }
  };

  const handleShare = async (item: FileItem) => {
    if (item.type === "file") {
      try {
        await apiCreateShareLink(item.id);
      } catch (err) {
        // ignore — sharing dialog handles display
      }
    }
    setShareItem(item);
    setShowShareDialog(true);
  };

  const handleDeleteConfirm = (item: FileItem) => {
    setDeleteItem(item);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      if (deleteItem.type === "folder") {
        await apiDeleteFolder(deleteItem.id);
        setFolders((prev) => prev.filter((f) => f.id !== deleteItem.id));
      } else {
        await apiDeleteFile(deleteItem.id);
        setFiles((prev) => prev.filter((f) => f.id !== deleteItem.id));
      }
      toast({
        title: "Deleted",
        description: `"${deleteItem.name}" has been moved to trash.`,
      });
      loadStorage();
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
    setShowDeleteConfirm(false);
    setDeleteItem(null);
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const allIds = [...folders, ...files].map((item) => item.id);
    if (selectedItems.length === allIds.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(allIds);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const fileIds = selectedItems.filter(id => files.some(f => f.id === id));
      if (fileIds.length > 0) {
        await bulkDeleteFiles(fileIds);
      }
      // Also delete selected folders one by one
      const folderIds = selectedItems.filter(id => folders.some(f => f.id === id));
      for (const fId of folderIds) {
        await apiDeleteFolder(fId);
      }

      setFolders((prev) => prev.filter((f) => !selectedItems.includes(f.id)));
      setFiles((prev) => prev.filter((f) => !selectedItems.includes(f.id)));

      toast({
        title: "Items Deleted",
        description: `${selectedItems.length} item(s) have been moved to trash.`,
      });
      setSelectedItems([]);
      loadStorage();
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete items.", variant: "destructive" });
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      toast({
        title: "Download Started",
        description: `Downloading "${file.name}"...`,
      });
      await apiDownloadFile(file.id, file.name);
    } catch (err) {
      toast({ title: "Error", description: "Download failed.", variant: "destructive" });
    }
  };

  const handleOpenFolder = (folder: FileItem) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSelectedItems([]);
  };

  const handleNavigateBreadcrumb = (index: number) => {
    const crumb = breadcrumbs[index];
    setCurrentFolderId(crumb.id);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setSelectedItems([]);
  };

  const storageUsed = storage?.totalUsed || 0;
  const storageTotal = storage?.totalLimit || 10737418240;
  const storagePercentage = Math.round((storageUsed / storageTotal) * 100);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      <main
        className={cn(
          "flex-1 transition-all duration-300"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Drag Overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-[#0891B2]/10 backdrop-blur-sm flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="bg-white rounded-3xl p-12 card-shadow border-2 border-dashed border-[#22D3EE] text-center"
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
                  <CloudUpload size={40} className="text-[#0891B2]" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-2">Drop files here</h2>
                <p className="text-[#94A3B8]">Release to upload your files</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[rgba(15,23,42,0.06)]">
          <div className="px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Title & Breadcrumb */}
              <div>
                <div className="hidden sm:flex items-center gap-2 text-sm text-[#94A3B8] mb-1">
                  <span>Dashboard</span>
                  <ChevronRight size={14} />
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.id ?? 'root'}>
                      {index > 0 && <ChevronRight size={14} />}
                      <button
                        onClick={() => handleNavigateBreadcrumb(index)}
                        className={cn(
                          "hover:text-[#0891B2] transition-colors",
                          index === breadcrumbs.length - 1
                            ? "text-[#0891B2] font-medium"
                            : "text-[#94A3B8]"
                        )}
                      >
                        {crumb.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">
                  {breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 1].name : "File Manager"}
                </h1>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-md border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE] hover:text-[#0891B2]"
                  onClick={() => { loadData(); loadStorage(); }}
                >
                  <RefreshCw size={16} className="sm:mr-2" />
                  <span className="hidden sm:inline">Sync</span>
                </Button>

                <div className="relative hidden sm:block">
                  <button className="p-2.5 rounded-md bg-white/5 hover:bg-slate-200 transition-colors relative">
                    <Bell size={20} className="text-[#475569]" />
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-[rgba(15,23,42,0.06)]">
                  <div className="h-10 w-10 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] font-bold ">
                    SA
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-sm font-semibold text-[#0F172A]">SAdmin</p>
                    <p className="text-xs text-[#94A3B8]">Administrator</p>
                  </div>
                  <ChevronDown size={16} className="text-[#475569]" />
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex h-[calc(100vh-65px)] sm:h-[calc(100vh-81px)]">
          {/* Left Sidebar — hidden on mobile */}
          <aside className="hidden md:flex w-72 border-r border-[rgba(15,23,42,0.06)] bg-white p-5 flex-col">
            {/* Upload Button */}
            <Button
              onClick={handleUploadClick}
              className="w-full h-12 bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md  mb-6"
            >
              <Upload size={18} className="mr-2" />
              Upload Files
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
            />

            {/* Quick Actions */}
            <Button
              variant="outline"
              onClick={() => setShowCreateFolder(true)}
              className="w-full h-10 rounded-md border-dashed border-slate-300 text-[#475569] hover:border-[#22D3EE] hover:text-[#0891B2] hover:bg-[#0891B2]/5 mb-6"
            >
              <FolderPlus size={16} className="mr-2" />
              New Folder
            </Button>

            {/* Navigation */}
            <nav className="flex-1 space-y-1">
              {[
                { id: "all", icon: HardDrive, label: "My Storage", count: stats.totalFiles },
                { id: "recent", icon: Clock, label: "Recent", count: null },
                { id: "starred", icon: Star, label: "Starred", count: stats.starredItems },
                { id: "shared", icon: Share2, label: "Shared", count: stats.sharedItems },
                { id: "trash", icon: Trash2, label: "Trash", count: null },
              ].map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={{ x: 4 }}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-md transition-all",
                    activeTab === item.id
                      ? "bg-[#0891B2]/10 text-[#0891B2]"
                      : "text-[#475569] hover:bg-[#F8FAFC]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={18} className={activeTab === item.id ? "text-[#0891B2]" : "text-[#475569]"} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {item.count !== null && (
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-xs font-semibold",
                      activeTab === item.id
                        ? "bg-[#0891B2]/20 text-[#0891B2]"
                        : "bg-white/5 text-[#94A3B8]"
                    )}>
                      {item.count}
                    </span>
                  )}
                </motion.button>
              ))}
            </nav>

            {/* Tags Section */}
            <div className="py-4 border-t border-[rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[#475569] uppercase tracking-wider">Tags</h3>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md">
                  <Plus size={14} className="text-[#475569]" />
                </Button>
              </div>
              <div className="space-y-1">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm">{tag.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Storage Info */}
            <div className="pt-4 border-t border-[rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[#475569] uppercase tracking-wider">Storage</h3>
                <span className="text-xs text-[#0891B2] font-semibold">{storagePercentage}%</span>
              </div>
              <Progress value={storagePercentage} className="h-2 mb-3" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#94A3B8]">{formatBytes(storageUsed)} used</span>
                <span className="text-[#475569]">of {formatBytes(storageTotal)}</span>
              </div>

              {/* Storage Breakdown */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { label: "Documents", value: storage?.breakdown?.documents || 0, color: "#3B82F6" },
                  { label: "Images", value: storage?.breakdown?.images || 0, color: "#8B5CF6" },
                  { label: "Videos", value: storage?.breakdown?.videos || 0, color: "#EC4899" },
                  { label: "Other", value: storage?.breakdown?.other || 0, color: "#6B7280" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-xs text-[#94A3B8]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.label}</span>
                    <span className="ml-auto font-medium">{item.value}%</span>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                className="w-full mt-4 rounded-md border-[#FBBF24]/30 text-[#D97706] hover:bg-[#D97706]/10 hover:border-[#FBBF24]"
              >
                <Zap size={14} className="mr-2" />
                Upgrade Storage
              </Button>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile-only nav tabs + upload */}
            <div className="flex md:hidden items-center gap-2 px-3 py-2 bg-white border-b border-[rgba(15,23,42,0.06)] overflow-x-auto">
              <Button
                onClick={handleUploadClick}
                size="sm"
                className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md flex-shrink-0"
              >
                <Upload size={14} className="mr-1" />
                Upload
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateFolder(true)}
                className="rounded-md border-dashed flex-shrink-0"
              >
                <FolderPlus size={14} className="mr-1" />
                Folder
              </Button>
              <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
              {[
                { id: "all", icon: HardDrive, label: "All" },
                { id: "recent", icon: Clock, label: "Recent" },
                { id: "starred", icon: Star, label: "Starred" },
                { id: "shared", icon: Share2, label: "Shared" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors",
                    activeTab === item.id
                      ? "bg-[#0891B2]/10 text-[#0891B2]"
                      : "text-[#475569] hover:bg-[#F8FAFC]"
                  )}
                >
                  <item.icon size={14} />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Toolbar */}
            <div className="px-3 py-2 sm:px-6 sm:py-4 bg-white border-b border-[rgba(15,23,42,0.06)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                {/* Search */}
                <div className="relative flex-1 sm:max-w-md">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#475569]" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search files and folders..."
                    className="h-11 pl-11 pr-4 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/10"
                    >
                      <X size={14} className="text-[#475569]" />
                    </button>
                  )}
                </div>

                {/* Bulk Actions */}
                <AnimatePresence>
                  {selectedItems.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#0891B2]/10 rounded-md"
                    >
                      <span className="text-sm font-medium text-[#0891B2]">
                        {selectedItems.length} selected
                      </span>
                      <div className="h-4 w-px bg-[#0891B2]/30" />
                      <Button variant="ghost" size="sm" className="h-8 rounded-md text-[#0891B2]">
                        <Download size={14} className="mr-1" />
                        Download
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 rounded-md text-[#0891B2]">
                        <Share2 size={14} className="mr-1" />
                        Share
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={handleBulkDelete}
                      >
                        <Trash2 size={14} className="mr-1" />
                        Delete
                      </Button>
                      <button
                        onClick={() => setSelectedItems([])}
                        className="p-1 rounded-md hover:bg-[#0891B2]/20"
                      >
                        <X size={14} className="text-[#0891B2]" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* View & Sort Controls */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 sm:h-10 rounded-md border-[rgba(15,23,42,0.06)]">
                        <Filter size={16} className="sm:mr-2" />
                        <span className="hidden sm:inline">Filter</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-md">
                      <div className="p-2">
                        <p className="text-xs font-semibold text-[#475569] uppercase mb-2">File Type</p>
                        {["All Files", "Documents", "Images", "Videos", "Audio"].map((type) => (
                          <DropdownMenuItem key={type} className="rounded-md">
                            {type}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Sort */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 sm:h-10 rounded-md border-[rgba(15,23,42,0.06)]">
                        {sortOrder === "asc" ? <SortAsc size={16} /> : <SortDesc size={16} />}
                        <span className="ml-2 capitalize hidden sm:inline">{sortBy}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-md">
                      {[
                        { id: "modified", label: "Date Modified" },
                        { id: "name", label: "Name" },
                        { id: "size", label: "Size" },
                      ].map((option) => (
                        <DropdownMenuItem
                          key={option.id}
                          onClick={() => {
                            if (sortBy === option.id) {
                              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                            } else {
                              setSortBy(option.id);
                              setSortOrder("desc");
                            }
                          }}
                          className="rounded-md justify-between"
                        >
                          {option.label}
                          {sortBy === option.id && (
                            <Check size={14} className="text-[#0891B2]" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* View Toggle */}
                  <div className="flex items-center p-1 bg-white/5 rounded-md">
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
                    <button
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "p-2 rounded-md transition-all",
                        viewMode === "list"
                          ? "bg-white text-[#0891B2] shadow-sm"
                          : "text-[#94A3B8] hover:text-slate-200"
                      )}
                    >
                      <List size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* File Content Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-8">
                <StatCard
                  title="Total Files"
                  value={stats.totalFiles}
                  subtitle="Files & Folders"
                  icon={HardDrive}
                  color="teal"
                  trend={{ value: 12, positive: true }}
                  delay={0}
                />
                <StatCard
                  title="Storage Used"
                  value={stats.totalSize}
                  subtitle={`${storagePercentage}% of ${formatBytes(storageTotal)}`}
                  icon={Cloud}
                  color="gold"
                  delay={0.1}
                />
                <StatCard
                  title="Shared Files"
                  value={stats.sharedItems}
                  subtitle="With team members"
                  icon={Users}
                  color="blue"
                  trend={{ value: 8, positive: true }}
                  delay={0.2}
                />
                <StatCard
                  title="Starred Items"
                  value={stats.starredItems}
                  subtitle="Quick access"
                  icon={Star}
                  color="purple"
                  delay={0.3}
                />
              </div>

              {/* Folders Section */}
              {filteredFolders.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[#0F172A]">Folders</h2>
                    <span className="text-sm text-[#94A3B8]">{filteredFolders.length} folders</span>
                  </div>

                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filteredFolders.map((folder, index) => (
                        <FolderCard
                          key={folder.id}
                          folder={folder}
                          isSelected={selectedItems.includes(folder.id)}
                          onSelect={() => handleSelectItem(folder.id)}
                          onOpen={() => handleOpenFolder(folder)}
                          onStar={() => handleToggleStar(folder)}
                          onShare={() => handleShare(folder)}
                          onRename={() => {
                            toast({ title: "Rename", description: "Rename dialog would open" });
                          }}
                          onDelete={() => handleDeleteConfirm(folder)}
                          viewMode={viewMode}
                          delay={index * 0.05}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredFolders.map((folder, index) => (
                        <FolderCard
                          key={folder.id}
                          folder={folder}
                          isSelected={selectedItems.includes(folder.id)}
                          onSelect={() => handleSelectItem(folder.id)}
                          onOpen={() => handleOpenFolder(folder)}
                          onStar={() => handleToggleStar(folder)}
                          onShare={() => handleShare(folder)}
                          onRename={() => {
                            toast({ title: "Rename", description: "Rename dialog would open" });
                          }}
                          onDelete={() => handleDeleteConfirm(folder)}
                          viewMode={viewMode}
                          delay={index * 0.03}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Files Section */}
              {filteredFiles.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[#0F172A]">Files</h2>
                    <span className="text-sm text-[#94A3B8]">{filteredFiles.length} files</span>
                  </div>

                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filteredFiles.map((file, index) => (
                        <FileCard
                          key={file.id}
                          file={file}
                          isSelected={selectedItems.includes(file.id)}
                          onSelect={() => handleSelectItem(file.id)}
                          onOpen={() => handleDownload(file)}
                          onStar={() => handleToggleStar(file)}
                          onShare={() => handleShare(file)}
                          onDownload={() => handleDownload(file)}
                          onRename={() => {
                            toast({ title: "Rename", description: "Rename dialog would open" });
                          }}
                          onDelete={() => handleDeleteConfirm(file)}
                          viewMode={viewMode}
                          delay={index * 0.05}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredFiles.map((file, index) => (
                        <FileCard
                          key={file.id}
                          file={file}
                          isSelected={selectedItems.includes(file.id)}
                          onSelect={() => handleSelectItem(file.id)}
                          onOpen={() => handleDownload(file)}
                          onStar={() => handleToggleStar(file)}
                          onShare={() => handleShare(file)}
                          onDownload={() => handleDownload(file)}
                          onRename={() => {
                            toast({ title: "Rename", description: "Rename dialog would open" });
                          }}
                          onDelete={() => handleDeleteConfirm(file)}
                          viewMode={viewMode}
                          delay={index * 0.03}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Empty State */}
              {filteredFolders.length === 0 && filteredFiles.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-20"
                >
                  <div className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
                    <Folder size={48} className="text-[#475569]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#0F172A] mb-2">No files found</h3>
                  <p className="text-[#94A3B8] text-center max-w-md mb-6">
                    {searchTerm
                      ? `No files match "${searchTerm}". Try a different search term.`
                      : "This folder is empty. Upload files or create a new folder to get started."}
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleUploadClick}
                      className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
                    >
                      <Upload size={16} className="mr-2" />
                      Upload Files
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateFolder(true)}
                      className="rounded-md"
                    >
                      <FolderPlus size={16} className="mr-2" />
                      New Folder
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Upload Progress */}
      <AnimatePresence>
        {uploadingFiles.length > 0 && (
          <UploadProgress
            files={uploadingFiles}
            onCancel={(id) => {
              setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
            }}
            onClose={() => {
              setUploadingFiles([]);
            }}
          />
        )}
      </AnimatePresence>

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onCreate={handleCreateFolder}
      />

      {/* Share Dialog */}
      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => {
          setShowShareDialog(false);
          setShareItem(null);
        }}
        item={shareItem}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#0F172A]">Delete {deleteItem?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteItem?.name}"? This action can be undone from the trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-[#0F172A] rounded-md"
            >
              <Trash2 size={16} className="mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FileManagerPage;