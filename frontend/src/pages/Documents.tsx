// src/pages/Documents.tsx
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  FileText, Search, Plus, X, Eye, Pencil, Trash2, MoreVertical, RefreshCw,
  Sparkles, Download, Upload, FolderOpen, File, FileSpreadsheet, FileImage,
  FileVideo, FileArchive, FilePdf, Star, StarOff, Share2, Copy, Link2,
  Clock, User, HardDrive, LayoutGrid, List, Filter, SortAsc,
  CheckCircle2, AlertTriangle, Zap, TrendingUp, FolderPlus, Tag,
  ChevronRight, ChevronLeft, Globe, Lock,
  type LucideIcon,
} from "lucide-react";

// ============================================
// TYPES
// ============================================
interface Document {
  id: string; name: string; type: "pdf" | "doc" | "spreadsheet" | "image" | "video" | "archive" | "other";
  size: number; category: string; tags: string[];
  uploadedBy: string; uploadedAt: string; updatedAt: string;
  starred: boolean; shared: boolean; version: number;
  description?: string; linkedEntity?: { type: string; name: string };
}

interface Folder {
  id: string; name: string; count: number; icon: LucideIcon; color: string;
}

// ============================================
// CONSTANTS & MOCK DATA
// ============================================
const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

const fileIcons: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  pdf: { icon: FileText, color: "text-red-600", bg: "bg-red-100" },
  doc: { icon: FileText, color: "text-blue-600", bg: "bg-blue-100" },
  spreadsheet: { icon: FileSpreadsheet, color: "text-green-600", bg: "bg-green-100" },
  image: { icon: FileImage, color: "text-purple-600", bg: "bg-purple-100" },
  video: { icon: FileVideo, color: "text-orange-600", bg: "bg-orange-100" },
  archive: { icon: FileArchive, color: "text-amber-600", bg: "bg-amber-100" },
  other: { icon: File, color: "text-[#475569]", bg: "bg-[#F1F5F9]" },
};

const mockFolders: Folder[] = [
  { id: "f1", name: "Contracts", count: 12, icon: FileText, color: "text-[#0891B2]" },
  { id: "f2", name: "Proposals", count: 8, icon: FileText, color: "text-purple-600" },
  { id: "f3", name: "Invoices", count: 24, icon: FileSpreadsheet, color: "text-green-600" },
  { id: "f4", name: "Marketing", count: 15, icon: FileImage, color: "text-orange-600" },
  { id: "f5", name: "Reports", count: 6, icon: FileText, color: "text-blue-600" },
  { id: "f6", name: "Templates", count: 10, icon: FolderOpen, color: "text-amber-600" },
];

const mockDocuments: Document[] = [
  { id: "d1", name: "Master Service Agreement - Maple Leaf Digital.pdf", type: "pdf", size: 2450000, category: "Contracts",
    tags: ["contract", "active"], uploadedBy: "Admin", uploadedAt: daysAgo(2), updatedAt: daysAgo(1),
    starred: true, shared: true, version: 3, description: "Master service agreement for Maple Leaf website redesign project.",
    linkedEntity: { type: "Client", name: "Maple Leaf Digital" } },
  { id: "d2", name: "Q1 2026 Revenue Report.xlsx", type: "spreadsheet", size: 1240000, category: "Reports",
    tags: ["report", "finance", "q1"], uploadedBy: "Sarah Chen", uploadedAt: daysAgo(5), updatedAt: daysAgo(3),
    starred: true, shared: false, version: 2, description: "Quarterly revenue breakdown with projections." },
  { id: "d3", name: "Website Redesign Proposal - NLS.pdf", type: "pdf", size: 3890000, category: "Proposals",
    tags: ["proposal", "design"], uploadedBy: "Admin", uploadedAt: daysAgo(7), updatedAt: daysAgo(7),
    starred: false, shared: true, version: 1, linkedEntity: { type: "Client", name: "Northern Lights Studios" } },
  { id: "d4", name: "Brand Guidelines 2026.pdf", type: "pdf", size: 8920000, category: "Marketing",
    tags: ["brand", "design"], uploadedBy: "Design Team", uploadedAt: daysAgo(10), updatedAt: daysAgo(8),
    starred: false, shared: true, version: 4 },
  { id: "d5", name: "Employee Handbook v5.docx", type: "doc", size: 1560000, category: "Templates",
    tags: ["hr", "template"], uploadedBy: "Admin", uploadedAt: daysAgo(15), updatedAt: daysAgo(5),
    starred: false, shared: false, version: 5 },
  { id: "d6", name: "Client Meeting Recording - Feb.mp4", type: "video", size: 45000000, category: "Marketing",
    tags: ["meeting", "recording"], uploadedBy: "Admin", uploadedAt: daysAgo(3), updatedAt: daysAgo(3),
    starred: false, shared: true, version: 1 },
  { id: "d7", name: "Project Invoice - PCV Holdings.pdf", type: "pdf", size: 980000, category: "Invoices",
    tags: ["invoice", "paid"], uploadedBy: "Admin", uploadedAt: daysAgo(8), updatedAt: daysAgo(6),
    starred: false, shared: false, version: 1, linkedEntity: { type: "Client", name: "PCV Holdings" } },
  { id: "d8", name: "CRM Data Export - Dec 2025.csv", type: "spreadsheet", size: 4560000, category: "Reports",
    tags: ["export", "data"], uploadedBy: "System", uploadedAt: daysAgo(20), updatedAt: daysAgo(20),
    starred: false, shared: false, version: 1 },
  { id: "d9", name: "Product Screenshots Pack.zip", type: "archive", size: 28000000, category: "Marketing",
    tags: ["screenshots", "product"], uploadedBy: "Design Team", uploadedAt: daysAgo(4), updatedAt: daysAgo(4),
    starred: false, shared: true, version: 1 },
  { id: "d10", name: "NDA Template.docx", type: "doc", size: 320000, category: "Templates",
    tags: ["legal", "template", "nda"], uploadedBy: "Legal", uploadedAt: daysAgo(30), updatedAt: daysAgo(12),
    starred: true, shared: false, version: 2 },
];

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
};

const formatDate = (d: string) => new Date(d).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
const timeAgo = (d: string) => {
  const diff = (now.getTime() - new Date(d).getTime()) / 86400000;
  if (diff < 1) return "Today";
  if (diff < 2) return "Yesterday";
  return `${Math.floor(diff)}d ago`;
};

// ============================================
// MAIN COMPONENT
// ============================================
const DocumentsPage = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState(mockDocuments);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // Upload form
  const [uploadForm, setUploadForm] = useState({ name: "", description: "", category: "Contracts", tags: "" });

  // Stats
  const stats = useMemo(() => ({
    totalFiles: documents.length,
    totalSize: documents.reduce((s, d) => s + d.size, 0),
    sharedFiles: documents.filter(d => d.shared).length,
    starredFiles: documents.filter(d => d.starred).length,
  }), [documents]);

  // AI insights
  const aiInsights = useMemo(() => {
    const insights: { icon: LucideIcon; text: string; type: string }[] = [];
    const largeFiles = documents.filter(d => d.size > 10000000).length;
    if (largeFiles > 0) insights.push({ icon: HardDrive, text: `${largeFiles} large file${largeFiles > 1 ? 's' : ''} (>10MB) — consider archiving.`, type: "info" });
    const oldFiles = documents.filter(d => (now.getTime() - new Date(d.updatedAt).getTime()) > 2592000000).length;
    if (oldFiles > 0) insights.push({ icon: Clock, text: `${oldFiles} file${oldFiles > 1 ? 's' : ''} not updated in 30+ days.`, type: "warning" });
    const contractCount = documents.filter(d => d.category === "Contracts").length;
    if (contractCount > 0) insights.push({ icon: FileText, text: `${contractCount} active contract${contractCount > 1 ? 's' : ''} on file.`, type: "success" });
    return insights;
  }, [documents]);

  // Filtered
  const filtered = useMemo(() => {
    let result = [...documents];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(q) || d.tags.some(t => t.includes(q)));
    }
    if (categoryFilter !== "all") result = result.filter(d => d.category === categoryFilter);
    if (typeFilter !== "all") result = result.filter(d => d.type === typeFilter);
    return result;
  }, [documents, searchQuery, categoryFilter, typeFilter]);

  // Handlers
  const handleUpload = () => {
    const newDoc: Document = {
      id: `d-${Date.now()}`, name: uploadForm.name || "Untitled Document", type: "pdf",
      size: Math.floor(Math.random() * 5000000) + 500000, category: uploadForm.category,
      tags: uploadForm.tags.split(",").map(t => t.trim()).filter(Boolean),
      uploadedBy: "Admin", uploadedAt: now.toISOString(), updatedAt: now.toISOString(),
      starred: false, shared: false, version: 1, description: uploadForm.description,
    };
    setDocuments(prev => [newDoc, ...prev]);
    setIsUploadOpen(false);
    setUploadForm({ name: "", description: "", category: "Contracts", tags: "" });
    toast({ title: "Document Uploaded", description: `${newDoc.name} has been uploaded.` });
  };

  const toggleStar = (id: string) => setDocuments(prev => prev.map(d => d.id === id ? { ...d, starred: !d.starred } : d));
  const toggleShare = (id: string) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, shared: !d.shared } : d));
    toast({ title: "Sharing Updated" });
  };
  const handleDelete = () => {
    if (!deleteId) return;
    setDocuments(prev => prev.filter(d => d.id !== deleteId));
    setDeleteId(null); setIsDetailOpen(false);
    toast({ title: "Document Deleted" });
  };
  const bulkDelete = () => {
    setDocuments(prev => prev.filter(d => !selectedIds.has(d.id)));
    toast({ title: `${selectedIds.size} documents deleted` });
    setSelectedIds(new Set());
  };
  const handleDownload = (doc: Document) => toast({ title: "Downloading", description: `${doc.name} download started.` });
  const handleCopyLink = (doc: Document) => {
    navigator.clipboard?.writeText(`https://crm.zodo.ca/documents/${doc.id}`);
    toast({ title: "Link Copied" });
  };

  const allCategories = ["all", ...Array.from(new Set(mockDocuments.map(d => d.category)))];

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-[1400px] mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-[#0891B2]/10 flex items-center justify-center"><FileText size={20} className="text-[#0891B2]" /></div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Documents</h1>
                <p className="text-sm text-[#94A3B8]">{stats.totalFiles} files · {formatFileSize(stats.totalSize)} total</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="rounded-md border-[rgba(15,23,42,0.06)]"
                onClick={() => { setDocuments([...mockDocuments]); toast({ title: "Refreshed" }); }}>
                <RefreshCw size={16} className="mr-2" />Refresh
              </Button>
              <Button size="sm" className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md" onClick={() => setIsUploadOpen(true)}>
                <Upload size={16} className="mr-2" />Upload
              </Button>
            </div>
          </motion.div>

          {/* AI Insights */}
          {aiInsights.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-[#0891B2]/10 to-purple-500/10 rounded-full">
                  <Sparkles size={12} className="text-[#0891B2]" /><span className="text-xs font-semibold text-[#0891B2]">AI Insights</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {aiInsights.map((ins, i) => {
                  const InsIcon = ins.icon;
                  return (
                    <div key={i} className={cn("p-3 rounded-md border flex items-center gap-3",
                      ins.type === "info" && "bg-blue-50 border-blue-200",
                      ins.type === "warning" && "bg-amber-50 border-amber-200",
                      ins.type === "success" && "bg-green-50 border-green-200")}>
                      <InsIcon size={16} className={cn(ins.type === "info" && "text-blue-600", ins.type === "warning" && "text-amber-600", ins.type === "success" && "text-green-600")} />
                      <p className="text-xs text-[#475569]">{ins.text}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {[
              { label: "Total Files", value: stats.totalFiles, icon: FileText, color: "text-[#0891B2]", bg: "bg-[#0891B2]/10" },
              { label: "Storage Used", value: formatFileSize(stats.totalSize), icon: HardDrive, color: "text-purple-600", bg: "bg-purple-100" },
              { label: "Shared Files", value: stats.sharedFiles, icon: Share2, color: "text-green-600", bg: "bg-green-100" },
              { label: "Starred", value: stats.starredFiles, icon: Star, color: "text-amber-600", bg: "bg-amber-100" },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-md p-4 border border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div><p className="text-xs text-[#94A3B8]">{s.label}</p><p className="text-xl sm:text-2xl font-bold text-[#0F172A]">{s.value}</p></div>
                  <div className={cn("w-10 h-10 rounded-md flex items-center justify-center", s.bg)}><s.icon size={18} className={s.color} /></div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Folders Quick Access */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
            <p className="text-sm font-semibold text-[#0F172A] mb-3">Quick Access Folders</p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {mockFolders.map(folder => {
                const FolderIcon = folder.icon;
                return (
                  <motion.button key={folder.id} whileHover={{ y: -2 }}
                    onClick={() => setCategoryFilter(folder.name)}
                    className={cn("bg-white rounded-md p-3 border border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow transition-all text-left",
                      categoryFilter === folder.name && "border-[#0891B2] bg-[#0891B2]/5")}>
                    <FolderOpen size={20} className={folder.color} />
                    <p className="text-sm font-medium text-[#0F172A] mt-2">{folder.name}</p>
                    <p className="text-xs text-[#94A3B8]">{folder.count} files</p>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Toolbar */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-4 mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search documents..." className="pl-10 rounded-md border-[rgba(15,23,42,0.06)] h-10" />
                {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"><X size={14} /></button>}
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px] rounded-md border-[rgba(15,23,42,0.06)] h-10"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>{allCategories.map(c => <SelectItem key={c} value={c} className="capitalize">{c === "all" ? "All Categories" : c}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[130px] rounded-md border-[rgba(15,23,42,0.06)] h-10"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem><SelectItem value="doc">Documents</SelectItem>
                  <SelectItem value="spreadsheet">Spreadsheets</SelectItem><SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem><SelectItem value="archive">Archives</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex border border-[rgba(15,23,42,0.06)] rounded-md overflow-hidden">
                <button onClick={() => setViewMode("list")} className={cn("p-2.5 transition-colors", viewMode === "list" ? "bg-[#0891B2] text-white" : "text-[#475569] hover:bg-[#F8FAFC]")}><List size={16} /></button>
                <button onClick={() => setViewMode("grid")} className={cn("p-2.5 transition-colors", viewMode === "grid" ? "bg-[#0891B2] text-white" : "text-[#475569] hover:bg-[#F8FAFC]")}><LayoutGrid size={16} /></button>
              </div>
            </div>
            {/* Bulk */}
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 mt-3 pt-3 border-t border-[rgba(15,23,42,0.06)]">
                  <span className="text-sm text-[#475569]">{selectedIds.size} selected</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs rounded-md" onClick={() => { selectedIds.forEach(id => handleDownload(documents.find(d => d.id === id)!)); setSelectedIds(new Set()); }}>
                    <Download size={14} className="mr-1" />Download
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs rounded-md text-red-600 border-red-200" onClick={bulkDelete}>
                    <Trash2 size={14} className="mr-1" />Delete
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs rounded-md" onClick={() => setSelectedIds(new Set())}>Clear</Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Content */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-16 text-center">
              <FolderOpen size={48} className="text-[#94A3B8] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No documents found</h3>
              <p className="text-[#94A3B8] mb-4">Upload your first document to get started</p>
              <Button className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md" onClick={() => setIsUploadOpen(true)}>
                <Upload size={16} className="mr-2" />Upload Document
              </Button>
            </div>
          ) : viewMode === "list" ? (
            <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[rgba(15,23,42,0.06)]">
                    <th className="py-3 px-4 text-left w-8">
                      <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0}
                        onCheckedChange={(c) => setSelectedIds(c ? new Set(filtered.map(d => d.id)) : new Set())}
                        className="border-slate-300 data-[state=checked]:bg-[#0891B2]" />
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider">Name</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider">Category</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider">Size</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider">Modified</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filtered.map(doc => {
                      const fi = fileIcons[doc.type] || fileIcons.other;
                      const FileIcon = fi.icon;
                      return (
                        <motion.tr key={doc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="border-b border-[rgba(15,23,42,0.06)] hover:bg-[#F8FAFC] transition-colors group cursor-pointer"
                          onClick={() => { setCurrentDoc(doc); setIsDetailOpen(true); }}>
                          <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                            <Checkbox checked={selectedIds.has(doc.id)}
                              onCheckedChange={(c) => { const s = new Set(selectedIds); c ? s.add(doc.id) : s.delete(doc.id); setSelectedIds(s); }}
                              className="border-slate-300 data-[state=checked]:bg-[#0891B2]" />
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-10 h-10 rounded-md flex items-center justify-center shrink-0", fi.bg)}><FileIcon size={18} className={fi.color} /></div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#0F172A] truncate max-w-[300px] group-hover:text-[#0891B2] transition-colors">{doc.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {doc.starred && <Star size={10} className="text-amber-500 fill-amber-500" />}
                                  {doc.shared && <Globe size={10} className="text-green-500" />}
                                  <span className="text-xs text-[#94A3B8]">{doc.uploadedBy}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4"><Badge variant="secondary" className="text-[10px] rounded-md">{doc.category}</Badge></td>
                          <td className="py-3 px-4 text-sm text-[#475569]">{formatFileSize(doc.size)}</td>
                          <td className="py-3 px-4 text-sm text-[#475569]">{timeAgo(doc.updatedAt)}</td>
                          <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => toggleStar(doc.id)} className="p-1.5 rounded-md hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all">
                                {doc.starred ? <Star size={14} className="text-amber-500 fill-amber-500" /> : <StarOff size={14} className="text-[#94A3B8]" />}
                              </button>
                              <button onClick={() => handleDownload(doc)} className="p-1.5 rounded-md hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all">
                                <Download size={14} className="text-[#94A3B8]" />
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1.5 rounded-md hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"><MoreVertical size={14} className="text-[#94A3B8]" /></button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 rounded-md">
                                  <DropdownMenuItem onClick={() => { setCurrentDoc(doc); setIsDetailOpen(true); }} className="rounded-md"><Eye size={14} className="mr-2" />View Details</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDownload(doc)} className="rounded-md"><Download size={14} className="mr-2" />Download</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCopyLink(doc)} className="rounded-md"><Link2 size={14} className="mr-2" />Copy Link</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => toggleShare(doc.id)} className="rounded-md"><Share2 size={14} className="mr-2" />{doc.shared ? "Unshare" : "Share"}</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setDeleteId(doc.id)} className="rounded-md text-red-600"><Trash2 size={14} className="mr-2" />Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence>
                {filtered.map(doc => {
                  const fi = fileIcons[doc.type] || fileIcons.other;
                  const FileIcon = fi.icon;
                  return (
                    <motion.div key={doc.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-4 hover:border-[#22D3EE]/30 hover:shadow-lg transition-all cursor-pointer group"
                      onClick={() => { setCurrentDoc(doc); setIsDetailOpen(true); }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className={cn("w-12 h-12 rounded-md flex items-center justify-center", fi.bg)}><FileIcon size={22} className={fi.color} /></div>
                        <div className="flex items-center gap-1">
                          {doc.starred && <Star size={14} className="text-amber-500 fill-amber-500" />}
                          {doc.shared && <Globe size={14} className="text-green-500" />}
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-[#0F172A] truncate group-hover:text-[#0891B2] transition-colors">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-[10px] rounded-md">{doc.category}</Badge>
                        <span className="text-xs text-[#94A3B8]">{formatFileSize(doc.size)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgba(15,23,42,0.06)]">
                        <span className="text-xs text-[#94A3B8] flex items-center gap-1"><User size={10} />{doc.uploadedBy}</span>
                        <span className="text-xs text-[#94A3B8]">{timeAgo(doc.updatedAt)}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 rounded-md overflow-hidden">
          <div className="p-6 border-b border-[rgba(15,23,42,0.06)]">
            <DialogHeader><DialogTitle className="text-xl font-bold text-[#0F172A]">Upload Document</DialogTitle>
              <DialogDescription className="text-[#94A3B8]">Add a new document to your CRM.</DialogDescription></DialogHeader>
          </div>
          <div className="p-6 space-y-4">
            {/* Drop zone */}
            <div className="border-2 border-dashed border-[rgba(15,23,42,0.1)] rounded-md p-8 text-center hover:border-[#0891B2]/30 transition-colors cursor-pointer">
              <Upload size={32} className="text-[#94A3B8] mx-auto mb-3" />
              <p className="text-sm font-medium text-[#0F172A]">Drop files here or click to browse</p>
              <p className="text-xs text-[#94A3B8] mt-1">Supports PDF, DOCX, XLSX, PNG, JPG, MP4, ZIP</p>
            </div>
            <div><Label className="text-xs text-[#475569]">Document Name *</Label>
              <Input value={uploadForm.name} onChange={e => setUploadForm(p => ({ ...p, name: e.target.value }))} placeholder="Enter file name" className="mt-1 rounded-md" /></div>
            <div><Label className="text-xs text-[#475569]">Description</Label>
              <Textarea value={uploadForm.description} onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description..." className="mt-1 rounded-md h-20" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs text-[#475569]">Category</Label>
                <Select value={uploadForm.category} onValueChange={v => setUploadForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="mt-1 rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>{mockFolders.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label className="text-xs text-[#475569]">Tags (comma separated)</Label>
                <Input value={uploadForm.tags} onChange={e => setUploadForm(p => ({ ...p, tags: e.target.value }))} placeholder="contract, active" className="mt-1 rounded-md" /></div>
            </div>
          </div>
          <DialogFooter className="p-6 pt-0 gap-3">
            <Button variant="outline" onClick={() => setIsUploadOpen(false)} className="rounded-md">Cancel</Button>
            <Button onClick={handleUpload} disabled={!uploadForm.name} className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"><Upload size={16} className="mr-2" />Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 rounded-md overflow-hidden">
          {currentDoc && (() => {
            const fi = fileIcons[currentDoc.type] || fileIcons.other; const FileIcon = fi.icon;
            return (<>
              <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-gradient-to-r from-[#0891B2]/5 to-transparent">
                <div className="flex items-center gap-4">
                  <div className={cn("w-14 h-14 rounded-md flex items-center justify-center", fi.bg)}><FileIcon size={28} className={fi.color} /></div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-[#0F172A] truncate">{currentDoc.name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge variant="secondary" className="text-xs">{currentDoc.category}</Badge>
                      <span className="text-xs text-[#94A3B8]">{formatFileSize(currentDoc.size)}</span>
                      <span className="text-xs text-[#94A3B8]">v{currentDoc.version}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {currentDoc.description && <div><p className="text-xs text-[#94A3B8] mb-1">Description</p><p className="text-sm text-[#475569]">{currentDoc.description}</p></div>}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-xs text-[#94A3B8]">Uploaded By</p><p className="text-[#0F172A] font-medium">{currentDoc.uploadedBy}</p></div>
                  <div><p className="text-xs text-[#94A3B8]">Upload Date</p><p className="text-[#0F172A]">{formatDate(currentDoc.uploadedAt)}</p></div>
                  <div><p className="text-xs text-[#94A3B8]">Last Modified</p><p className="text-[#0F172A]">{formatDate(currentDoc.updatedAt)}</p></div>
                  <div><p className="text-xs text-[#94A3B8]">Access</p><p className="text-[#0F172A] flex items-center gap-1">{currentDoc.shared ? <><Globe size={12} className="text-green-500" /> Shared</> : <><Lock size={12} className="text-[#94A3B8]" /> Private</>}</p></div>
                </div>
                {currentDoc.linkedEntity && (
                  <div className="p-3 bg-[#F8FAFC] rounded-md"><p className="text-xs text-[#94A3B8]">Linked To</p>
                    <p className="text-sm text-[#0891B2] font-medium">{currentDoc.linkedEntity.type}: {currentDoc.linkedEntity.name}</p></div>
                )}
                {currentDoc.tags.length > 0 && (
                  <div><p className="text-xs text-[#94A3B8] mb-1">Tags</p><div className="flex flex-wrap gap-1">{currentDoc.tags.map(t => <Badge key={t} variant="secondary" className="text-xs rounded-md">#{t}</Badge>)}</div></div>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" className="rounded-md flex-1" onClick={() => handleDownload(currentDoc)}><Download size={14} className="mr-2" />Download</Button>
                  <Button variant="outline" size="sm" className="rounded-md flex-1" onClick={() => { toggleShare(currentDoc.id); setCurrentDoc(p => p ? { ...p, shared: !p.shared } : null); }}>
                    <Share2 size={14} className="mr-2" />{currentDoc.shared ? "Unshare" : "Share"}
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-md" onClick={() => handleCopyLink(currentDoc)}><Link2 size={14} /></Button>
                  <Button variant="outline" size="sm" className="rounded-md text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setDeleteId(currentDoc.id); setIsDetailOpen(false); }}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </>); })()}
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-md"><AlertDialogHeader><AlertDialogTitle>Delete Document</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 rounded-md">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DocumentsPage;
