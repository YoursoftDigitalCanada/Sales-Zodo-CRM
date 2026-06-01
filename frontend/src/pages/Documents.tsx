import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Download, Eye, File, FileArchive, FileImage, FileSpreadsheet, FileText, FileVideo,
  FolderOpen, Globe, Grid2X2, Link2, List, MoreVertical, Pencil, RefreshCw, Search,
  Share2, Star, StarOff, Trash2, Upload, X, FolderPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type { FolderResponse } from "@/features/files/services/files-service";
import {
  createDocumentFolder,
  deleteDocument,
  downloadDocument,
  fetchDocumentPreviewBlob,
  getDocumentCategories,
  getDocumentFolders,
  getDocumentShareUrl,
  getDocuments,
  revokeDocumentShare,
  shareDocument,
  updateDocument,
  uploadDocument,
  type BusinessDocument,
} from "@/features/documents";

const typeIcons: Record<string, any> = {
  pdf: FileText,
  proposal_pdf: FileText,
  accepted_proposal_pdf: FileText,
  contract_pdf: FileText,
  signed_contract_pdf: FileText,
  invoice_pdf: FileText,
  payment_receipt: FileText,
  expense_receipt: FileText,
  general_attachment: File,
  document: FileText,
  spreadsheet: FileSpreadsheet,
  image: FileImage,
  video: FileVideo,
  archive: FileArchive,
  other: File,
};

const typeStyles: Record<string, string> = {
  pdf: "bg-red-50 text-red-600",
  proposal_pdf: "bg-violet-50 text-violet-600",
  accepted_proposal_pdf: "bg-violet-50 text-violet-700",
  contract_pdf: "bg-blue-50 text-blue-600",
  signed_contract_pdf: "bg-blue-50 text-blue-700",
  invoice_pdf: "bg-emerald-50 text-emerald-600",
  payment_receipt: "bg-green-50 text-green-600",
  expense_receipt: "bg-teal-50 text-teal-600",
  general_attachment: "bg-slate-100 text-slate-600",
  document: "bg-blue-50 text-blue-600",
  spreadsheet: "bg-green-50 text-green-600",
  image: "bg-purple-50 text-purple-600",
  video: "bg-orange-50 text-orange-600",
  archive: "bg-amber-50 text-amber-600",
  other: "bg-slate-100 text-slate-600",
};

const documentTypeOptions = [
  { value: "proposal_pdf", label: "Proposal PDF" },
  { value: "accepted_proposal_pdf", label: "Accepted Proposal PDF" },
  { value: "contract_pdf", label: "Contract PDF" },
  { value: "signed_contract_pdf", label: "Signed Contract PDF" },
  { value: "invoice_pdf", label: "Invoice PDF" },
  { value: "payment_receipt", label: "Payment Receipt" },
  { value: "expense_receipt", label: "Expense Receipt" },
  { value: "general_attachment", label: "General Attachment" },
  { value: "pdf", label: "PDF" },
  { value: "document", label: "Document" },
  { value: "spreadsheet", label: "Spreadsheet" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "archive", label: "Archive" },
  { value: "other", label: "Other" },
];

function getFolderScope(folderId: string) {
  if (folderId === "all") return "all";
  if (folderId === "root") return "root";
  return folderId;
}

function formatFileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function detectDocumentType(file: File | null) {
  if (!file) return "document";
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  const ext = name.includes(".") ? name.split(".").pop() || "" : "";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return "image";
  if (mime.startsWith("video/") || ["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (["xls", "xlsx", "csv"].includes(ext) || mime.includes("spreadsheet") || mime.includes("excel") || mime.includes("csv")) return "spreadsheet";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext) || mime.includes("zip") || mime.includes("compressed")) return "archive";
  if (["doc", "docx", "txt", "rtf", "odt"].includes(ext) || mime.includes("word") || mime.startsWith("text/")) return "document";
  return "other";
}

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [documentType, setDocumentType] = useState("all");
  const [folderId, setFolderId] = useState("root");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<BusinessDocument | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [editDoc, setEditDoc] = useState<BusinessDocument | null>(null);
  const [linkDoc, setLinkDoc] = useState<BusinessDocument | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploadFileValue, setUploadFileValue] = useState<File | null>(null);

  useEffect(() => {
    if (!previewDoc) {
      setPreviewBlobUrl(null);
      setPreviewError(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setPreviewLoading(true);
    setPreviewError(null);

    fetchDocumentPreviewBlob(previewDoc.id)
      .then((url) => {
        objectUrl = url;
        if (!cancelled) setPreviewBlobUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPreviewError("Could not load this document preview. Download the file to open it locally.");
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [previewDoc?.id]);

  const openDownload = async (doc: BusinessDocument) => {
    try {
      await downloadDocument(doc.id, doc.originalName || doc.name);
    } catch {
      toast({
        title: "Download failed",
        description: "Could not download this document. Please try again.",
        variant: "destructive",
      });
    }
  };
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadForm, setUploadForm] = useState({ description: "", categoryId: "", documentType: "document", folderId: "", visibleToClient: false, requiresSignature: false, expiresAt: "" });
  const [folderForm, setFolderForm] = useState({ name: "", parentId: "" });
  const [editForm, setEditForm] = useState({ name: "", description: "", categoryId: "", documentType: "document", version: 1, visibleToClient: false, requiresSignature: false, expiresAt: "" });
  const [linkForm, setLinkForm] = useState({ linkedEntityType: "Client", linkedEntityId: "" });
  const linkedEntityType = searchParams.get("linkedEntityType") || undefined;
  const linkedEntityId = searchParams.get("linkedEntityId") || undefined;
  const documentId = searchParams.get("documentId") || undefined;

  const filters = useMemo(() => ({
    search: search || undefined,
    categoryId: categoryId !== "all" ? categoryId : undefined,
    documentType: documentType !== "all" ? documentType : undefined,
    folderId: folderId !== "all" ? folderId : undefined,
    starred: statusFilter === "starred" ? true : undefined,
    shared: statusFilter === "shared" ? true : undefined,
    linkedEntityType,
    linkedEntityId,
    documentId,
    limit: 100,
  }), [search, categoryId, documentType, folderId, statusFilter, linkedEntityType, linkedEntityId, documentId]);

  const documentsQuery = useQuery({ queryKey: ["documents", filters], queryFn: () => getDocuments(filters) });
  const categoriesQuery = useQuery({ queryKey: ["documents", "categories"], queryFn: getDocumentCategories });
  const foldersQuery = useQuery({ queryKey: ["documents", "folders"], queryFn: () => getDocumentFolders({ limit: 100 }) });

  const documents = documentsQuery.data?.data || [];
  const categories = categoriesQuery.data || [];
  const folders = foldersQuery.data || [];
  const folderScope = getFolderScope(folderId);
  const currentFolder = folderScope !== "all" && folderScope !== "root" ? folders.find((folder) => folder.id === folderScope) : null;
  const foldersVisibleWithFilters = categoryId === "all" && documentType === "all" && statusFilter === "all";
  const visibleFolders = useMemo(() => {
    if (!foldersVisibleWithFilters) return [];
    const normalizedSearch = search.trim().toLowerCase();
    return folders.filter((folder) => {
      const matchesSearch = !normalizedSearch || folder.name.toLowerCase().includes(normalizedSearch);
      if (!matchesSearch) return false;
      if (folderScope === "all") return !folder.parentId;
      if (folderScope === "root") return !folder.parentId;
      return folder.parentId === folderScope;
    });
  }, [folderScope, folders, foldersVisibleWithFilters, search]);
  const hasItems = documents.length > 0 || visibleFolders.length > 0;
  const linkedFilterLabel = linkedEntityType
    ? `${linkedEntityType}${linkedEntityId ? ` ${linkedEntityId}` : ""}`
    : documentId
      ? `Document ${documentId}`
      : null;

  const stats = useMemo(() => ({
    count: documents.length,
    size: documents.reduce((sum, doc) => sum + (doc.size || 0), 0),
    shared: documents.filter((doc) => doc.isShared).length,
    starred: documents.filter((doc) => doc.isStarred).length,
  }), [documents]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["documents"] });
  };

  const currentFolderId = () => {
    const scope = getFolderScope(folderId);
    return scope !== "all" && scope !== "root" ? scope : "";
  };

  const openUploadDialog = () => {
    setUploadForm((prev) => ({ ...prev, folderId: currentFolderId() }));
    setUploadOpen(true);
  };

  const openFolderDialog = () => {
    setFolderForm((prev) => ({ ...prev, parentId: currentFolderId() }));
    setFolderOpen(true);
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFileValue) throw new Error("Choose a file first");
      return uploadDocument(uploadFileValue, uploadForm, setUploadProgress);
    },
    onSuccess: () => {
      toast({ title: "Document uploaded" });
      setUploadOpen(false);
      setUploadFileValue(null);
      setUploadProgress(0);
      setUploadForm({ description: "", categoryId: "", documentType: "document", folderId: "", visibleToClient: false, requiresSignature: false, expiresAt: "" });
      invalidate();
    },
    onError: (error: any) => toast({ title: "Upload failed", description: error?.message || "Try again.", variant: "destructive" }),
  });

  const createFolderMutation = useMutation({
    mutationFn: () => createDocumentFolder({ name: folderForm.name, parentId: folderForm.parentId || null }),
    onSuccess: (folder) => {
      toast({ title: "Folder created", description: folder.name });
      setFolderOpen(false);
      setFolderForm({ name: "", parentId: "" });
      void queryClient.invalidateQueries({ queryKey: ["documents", "folders"] });
      setFolderId(folder.id);
    },
    onError: (error: any) => toast({ title: "Folder creation failed", description: error?.message || "Try again.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => updateDocument(id, data),
    onSuccess: () => { toast({ title: "Document updated" }); setEditDoc(null); invalidate(); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => { toast({ title: "Document moved to trash" }); setDeleteId(null); setSelected(new Set()); invalidate(); },
  });

  const shareMutation = useMutation({
    mutationFn: async (doc: BusinessDocument) => doc.isShared ? revokeDocumentShare(doc.id) : shareDocument(doc.id),
    onSuccess: (doc) => {
      toast({ title: doc.isShared ? "Share link created" : "Share link revoked" });
      invalidate();
    },
  });

  const startEdit = (doc: BusinessDocument) => {
    setEditDoc(doc);
    setEditForm({
      name: doc.name,
      description: doc.description || "",
      categoryId: doc.categoryId || "",
      documentType: doc.type || "document",
      version: doc.version || 1,
      visibleToClient: doc.visibleToClient,
      requiresSignature: doc.requiresSignature,
      expiresAt: doc.expiresAt ? doc.expiresAt.slice(0, 10) : "",
    });
  };

  const IconFor = (doc: BusinessDocument) => typeIcons[doc.type] || typeIcons.other;
  const styleFor = (doc: BusinessDocument) => typeStyles[doc.type] || typeStyles.other;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#0891B2]/10 text-[#0891B2]"><FileText size={22} /></div>
            <div>
              <h1 className="text-2xl font-bold text-[#0F172A]">Documents</h1>
              <p className="text-sm text-[#64748B]">Business document center powered by Files and Folders.</p>
              {linkedFilterLabel ? (
                <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-cyan-100 bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
                  Filtered to {linkedFilterLabel}
                  <button className="text-cyan-900 underline-offset-2 hover:underline" onClick={() => setSearchParams({})}>Clear</button>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => invalidate()}><RefreshCw size={16} className="mr-2" />Refresh</Button>
            <Button variant="outline" onClick={openFolderDialog}><FolderPlus size={16} className="mr-2" />New Folder</Button>
            <Button className="bg-[#0891B2] text-white hover:bg-[#0E7490]" onClick={openUploadDialog}><Upload size={16} className="mr-2" />Upload Document</Button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Documents", stats.count, FileText, "bg-[#0891B2]/10 text-[#0891B2]"],
            ["Storage", formatFileSize(stats.size), FolderOpen, "bg-purple-50 text-purple-600"],
            ["Shared", stats.shared, Share2, "bg-green-50 text-green-600"],
            ["Starred", stats.starred, Star, "bg-amber-50 text-amber-600"],
          ].map(([label, value, Icon, color]) => (
            <div key={String(label)} className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-[#64748B]">{label}</p><p className="mt-1 text-2xl font-semibold text-[#0F172A]">{String(value)}</p></div>
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-md", String(color))}><Icon size={18} /></div>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search documents..." className="pl-10" />
              {search ? <button className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" onClick={() => setSearch("")}><X size={14} /></button> : null}
            </div>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Categories</SelectItem>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {documentTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Folder" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Folders</SelectItem><SelectItem value="root">Root</SelectItem>{folders.map((folder: FolderResponse) => <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="starred">Starred</SelectItem><SelectItem value="shared">Shared</SelectItem></SelectContent>
            </Select>
            <div className="ml-auto flex overflow-hidden rounded-md border">
              <button className={cn("p-2", viewMode === "list" ? "bg-[#0891B2] text-white" : "text-[#64748B]")} onClick={() => setViewMode("list")}><List size={16} /></button>
              <button className={cn("p-2", viewMode === "grid" ? "bg-[#0891B2] text-white" : "text-[#64748B]")} onClick={() => setViewMode("grid")}><Grid2X2 size={16} /></button>
            </div>
          </div>
          {selected.size ? (
            <div className="mt-3 flex items-center gap-3 border-t pt-3 text-sm text-[#475569]">
              <span>{selected.size} selected</span>
              <Button size="sm" variant="outline" onClick={() => selected.forEach((id) => deleteMutation.mutate(id))}><Trash2 size={14} className="mr-2" />Delete selected</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          ) : null}
        </section>

        {currentFolder ? (
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#CFFAFE] bg-[#ECFEFF] px-4 py-3">
            <div className="flex items-center gap-3 text-[#0E7490]">
              <FolderOpen size={18} />
              <div>
                <p className="text-sm font-semibold">{currentFolder.name}</p>
                <p className="text-xs">Showing documents and subfolders inside this folder.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setFolderId(currentFolder.parentId || "root")}>Back to parent</Button>
          </section>
        ) : null}

        {documentsQuery.isLoading || foldersQuery.isLoading ? (
          <div className="rounded-md border bg-white p-12 text-center text-[#64748B]">Loading documents...</div>
        ) : !hasItems ? (
          <div className="rounded-md border border-dashed bg-white p-12 text-center">
            <FolderOpen size={42} className="mx-auto text-[#94A3B8]" />
            <h2 className="mt-4 text-lg font-semibold text-[#0F172A]">{currentFolder ? "This folder is empty" : "No documents found"}</h2>
            <p className="mt-1 text-sm text-[#64748B]">{currentFolder ? "Upload a document here or create a subfolder." : "Upload a contract, proposal, invoice, report, or client file."}</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" onClick={openFolderDialog}><FolderPlus size={16} className="mr-2" />Create Folder</Button>
              <Button className="bg-[#0891B2] text-white hover:bg-[#0E7490]" onClick={openUploadDialog}><Upload size={16} className="mr-2" />Upload Document</Button>
            </div>
          </div>
        ) : viewMode === "list" ? (
          <div className="overflow-hidden rounded-md border border-[rgba(15,23,42,0.06)] bg-white">
            <table className="w-full">
              <thead className="bg-[#F8FAFC] text-left text-xs uppercase tracking-wide text-[#64748B]">
                <tr>
                  <th className="w-10 px-4 py-3"><Checkbox checked={selected.size === documents.length} onCheckedChange={(checked) => setSelected(checked ? new Set(documents.map((doc) => doc.id)) : new Set())} /></th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Automation</th>
                  <th className="px-4 py-3">Folder</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleFolders.map((folder) => (
                  <tr key={`folder-${folder.id}`} className="border-t hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3">
                      <button className="flex max-w-[440px] items-center gap-3 text-left" onClick={() => setFolderId(folder.id)}>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#ECFEFF] text-[#0891B2]"><FolderOpen size={18} /></span>
                        <span className="min-w-0"><span className="block truncate font-medium text-[#0F172A]">{folder.name}</span><span className="text-xs text-[#64748B]">{folder.filesCount || 0} files · {folder.childrenCount || 0} folders</span></span>
                      </button>
                    </td>
                    <td className="px-4 py-3"><Badge variant="secondary">Folder</Badge></td>
                    <td className="px-4 py-3 text-sm text-[#475569]">Manual</td>
                    <td className="px-4 py-3 text-sm text-[#475569]">{folder.parent?.name || "Root"}</td>
                    <td className="px-4 py-3 text-sm text-[#475569]">-</td>
                    <td className="px-4 py-3 text-sm text-[#475569]">{formatDate(folder.updatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setFolderId(folder.id)}>Open</Button>
                    </td>
                  </tr>
                ))}
                {documents.map((doc) => {
                  const Icon = IconFor(doc);
                  return (
                    <tr key={doc.id} className="border-t hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3"><Checkbox checked={selected.has(doc.id)} onCheckedChange={(checked) => { const next = new Set(selected); checked ? next.add(doc.id) : next.delete(doc.id); setSelected(next); }} /></td>
                      <td className="px-4 py-3">
                        <button className="flex max-w-[440px] items-center gap-3 text-left" onClick={() => setPreviewDoc(doc)}>
                          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md", styleFor(doc))}><Icon size={18} /></span>
                          <span className="min-w-0"><span className="block truncate font-medium text-[#0F172A]">{doc.name}</span><span className="text-xs text-[#64748B]">{doc.mimeType}</span></span>
                        </button>
                      </td>
                      <td className="px-4 py-3"><Badge variant="secondary">{doc.category?.name || "Other"}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {doc.linkedEntityType ? <Badge variant="outline">{doc.linkedEntityType}</Badge> : <Badge variant="secondary">Manual</Badge>}
                          {doc.isShared ? <Badge variant="outline" className="gap-1"><Globe size={11} />Shared</Badge> : null}
                          {doc.requiresSignature ? <Badge variant="outline">Signature</Badge> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#475569]">{doc.folder?.name || "Root"}</td>
                      <td className="px-4 py-3 text-sm text-[#475569]">{formatFileSize(doc.size)}</td>
                      <td className="px-4 py-3 text-sm text-[#475569]">{formatDate(doc.updatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <DocumentActions doc={doc} onPreview={setPreviewDoc} onEdit={startEdit} onDownload={openDownload} onShare={(item) => shareMutation.mutate(item)} onDelete={(id) => setDeleteId(id)} onStar={(item) => updateMutation.mutate({ id: item.id, data: { isStarred: !item.isStarred } })} onLink={setLinkDoc} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleFolders.map((folder) => (
              <button key={`folder-${folder.id}`} className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4 text-left transition hover:border-[#22D3EE]/40 hover:shadow-md" onClick={() => setFolderId(folder.id)}>
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#ECFEFF] text-[#0891B2]"><FolderOpen size={22} /></div>
                <p className="mt-4 truncate font-medium text-[#0F172A]">{folder.name}</p>
                <p className="mt-1 text-xs text-[#64748B]">{folder.filesCount || 0} files · {folder.childrenCount || 0} folders</p>
                <div className="mt-3"><Badge variant="secondary">Folder</Badge></div>
              </button>
            ))}
            {documents.map((doc) => {
              const Icon = IconFor(doc);
              return (
                <div key={doc.id} className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4 transition hover:border-[#22D3EE]/40 hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <button className={cn("flex h-12 w-12 items-center justify-center rounded-md", styleFor(doc))} onClick={() => setPreviewDoc(doc)}><Icon size={22} /></button>
                    <DocumentActions doc={doc} onPreview={setPreviewDoc} onEdit={startEdit} onDownload={openDownload} onShare={(item) => shareMutation.mutate(item)} onDelete={(id) => setDeleteId(id)} onStar={(item) => updateMutation.mutate({ id: item.id, data: { isStarred: !item.isStarred } })} onLink={setLinkDoc} />
                  </div>
                  <button className="mt-4 block w-full text-left" onClick={() => setPreviewDoc(doc)}>
                    <p className="truncate font-medium text-[#0F172A]">{doc.name}</p>
                    <p className="mt-1 text-xs text-[#64748B]">{formatFileSize(doc.size)} · {formatDate(doc.updatedAt)}</p>
                  </button>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary">{doc.category?.name || "Other"}</Badge>
                    {doc.linkedEntityType ? <Badge variant="outline">Generated / {doc.linkedEntityType}</Badge> : null}
                    {doc.isShared ? <Badge variant="outline" className="gap-1"><Globe size={11} />Shared</Badge> : null}
                    {doc.isStarred ? <Badge variant="outline" className="gap-1"><Star size={11} />Starred</Badge> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle><DialogDescription>Upload into the existing CRM file storage and add business metadata.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <Input
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                setUploadFileValue(file);
                setUploadForm((prev) => ({ ...prev, documentType: detectDocumentType(file) }));
              }}
            />
            {uploadFileValue ? (
              <div className="rounded-md border border-[#CFFAFE] bg-[#ECFEFF] px-3 py-2 text-sm text-[#0E7490]">
                Detected as <span className="font-semibold">{detectDocumentType(uploadFileValue)}</span> from {uploadFileValue.type || uploadFileValue.name.split(".").pop()?.toUpperCase() || "file"}.
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Category</Label><Select value={uploadForm.categoryId || "none"} onValueChange={(value) => setUploadForm((prev) => ({ ...prev, categoryId: value === "none" ? "" : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No category</SelectItem>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Type</Label><Select value={uploadForm.documentType} onValueChange={(value) => setUploadForm((prev) => ({ ...prev, documentType: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{documentTypeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="sm:col-span-2"><Label>Folder</Label><Select value={uploadForm.folderId || "root"} onValueChange={(value) => setUploadForm((prev) => ({ ...prev, folderId: value === "root" ? "" : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="root">Root</SelectItem>{folders.map((folder) => <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Expires At</Label><Input type="date" value={uploadForm.expiresAt} onChange={(event) => setUploadForm((prev) => ({ ...prev, expiresAt: event.target.value }))} /></div>
              <div className="flex flex-col justify-end gap-2 rounded-md border p-3 text-sm">
                <label className="flex items-center gap-2"><Checkbox checked={uploadForm.visibleToClient} onCheckedChange={(checked) => setUploadForm((prev) => ({ ...prev, visibleToClient: Boolean(checked) }))} />Visible to client</label>
                <label className="flex items-center gap-2"><Checkbox checked={uploadForm.requiresSignature} onCheckedChange={(checked) => setUploadForm((prev) => ({ ...prev, requiresSignature: Boolean(checked) }))} />Requires signature</label>
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={uploadForm.description} onChange={(event) => setUploadForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Add context for the sales or operations team..." /></div>
            {uploadProgress ? <div className="h-2 overflow-hidden rounded bg-[#E2E8F0]"><div className="h-full bg-[#0891B2]" style={{ width: `${uploadProgress}%` }} /></div> : null}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button><Button disabled={!uploadFileValue || uploadMutation.isPending} onClick={() => uploadMutation.mutate()} className="bg-[#0891B2] text-white hover:bg-[#0E7490]">Upload</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
            <DialogDescription>Organize documents using the existing CRM folder system.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Folder Name</Label>
              <Input value={folderForm.name} onChange={(event) => setFolderForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Contracts, Onboarding, Reports..." />
            </div>
            <div>
              <Label>Parent Folder</Label>
              <Select value={folderForm.parentId || "root"} onValueChange={(value) => setFolderForm((prev) => ({ ...prev, parentId: value === "root" ? "" : value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="root">Root</SelectItem>{folders.map((folder) => <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderOpen(false)}>Cancel</Button>
            <Button disabled={!folderForm.name.trim() || createFolderMutation.isPending} onClick={() => createFolderMutation.mutate()} className="bg-[#0891B2] text-white hover:bg-[#0E7490]">Create Folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewDoc)} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader><DialogTitle>{previewDoc?.name}</DialogTitle><DialogDescription>{previewDoc?.category?.name || "Document"} · {previewDoc ? formatFileSize(previewDoc.size) : ""}{previewDoc?.expiresAt ? ` · Expires ${formatDate(previewDoc.expiresAt)}` : ""}</DialogDescription></DialogHeader>
          {previewLoading ? <div className="flex h-[70vh] items-center justify-center text-sm text-[#64748B]">Loading preview...</div> : null}
          {previewError ? <div className="flex h-[70vh] items-center justify-center px-8 text-center text-sm text-[#64748B]">{previewError}</div> : null}
          {previewDoc && previewBlobUrl && !previewLoading && !previewError ? <iframe title={previewDoc.name} src={previewBlobUrl} className="h-[70vh] w-full rounded-md border bg-white" /> : null}
          <DialogFooter><Button variant="outline" onClick={() => previewDoc && openDownload(previewDoc)}><Download size={16} className="mr-2" />Download</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editDoc)} onOpenChange={(open) => !open && setEditDoc(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Edit Metadata</DialogTitle><DialogDescription>Update the document name, category, and business settings.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={editForm.name} onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Category</Label><Select value={editForm.categoryId || "none"} onValueChange={(value) => setEditForm((prev) => ({ ...prev, categoryId: value === "none" ? "" : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No category</SelectItem>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Type</Label><Select value={editForm.documentType} onValueChange={(value) => setEditForm((prev) => ({ ...prev, documentType: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{documentTypeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Version</Label><Input type="number" min={1} value={editForm.version} onChange={(event) => setEditForm((prev) => ({ ...prev, version: Number(event.target.value || 1) }))} /></div>
              <div><Label>Expires At</Label><Input type="date" value={editForm.expiresAt} onChange={(event) => setEditForm((prev) => ({ ...prev, expiresAt: event.target.value }))} /></div>
            </div>
            <div><Label>Description</Label><Textarea value={editForm.description} onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))} /></div>
            <div className="flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><Checkbox checked={editForm.visibleToClient} onCheckedChange={(checked) => setEditForm((prev) => ({ ...prev, visibleToClient: Boolean(checked) }))} />Visible to client</label><label className="flex items-center gap-2"><Checkbox checked={editForm.requiresSignature} onCheckedChange={(checked) => setEditForm((prev) => ({ ...prev, requiresSignature: Boolean(checked) }))} />Requires signature</label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditDoc(null)}>Cancel</Button><Button onClick={() => editDoc && updateMutation.mutate({ id: editDoc.id, data: editForm })} className="bg-[#0891B2] text-white hover:bg-[#0E7490]">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(linkDoc)} onOpenChange={(open) => !open && setLinkDoc(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Link Document</DialogTitle><DialogDescription>Attach this file to a CRM record by type and ID.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Entity Type</Label><Select value={linkForm.linkedEntityType} onValueChange={(value) => setLinkForm((prev) => ({ ...prev, linkedEntityType: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Client">Account / Company</SelectItem><SelectItem value="Contact">Contact</SelectItem><SelectItem value="Lead">Lead</SelectItem><SelectItem value="Deal">Deal</SelectItem><SelectItem value="Proposal">Proposal</SelectItem><SelectItem value="Quote">Quote</SelectItem><SelectItem value="Contract">Contract</SelectItem><SelectItem value="Invoice">Invoice</SelectItem><SelectItem value="Payment">Payment</SelectItem><SelectItem value="Expense">Expense</SelectItem><SelectItem value="BookkeepingTransaction">Bookkeeping Transaction</SelectItem></SelectContent></Select></div>
            <div><Label>Entity ID</Label><Input value={linkForm.linkedEntityId} onChange={(event) => setLinkForm((prev) => ({ ...prev, linkedEntityId: event.target.value }))} placeholder="Paste record ID" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setLinkDoc(null)}>Cancel</Button><Button disabled={!linkForm.linkedEntityId} onClick={() => linkDoc && updateMutation.mutate({ id: linkDoc.id, data: linkForm })} className="bg-[#0891B2] text-white hover:bg-[#0E7490]">Link</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete document?</AlertDialogTitle><AlertDialogDescription>This moves the underlying file to trash.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DocumentActions({ doc, onPreview, onEdit, onDownload, onShare, onDelete, onStar, onLink }: {
  doc: BusinessDocument;
  onPreview: (doc: BusinessDocument) => void;
  onEdit: (doc: BusinessDocument) => void;
  onDownload: (doc: BusinessDocument) => void;
  onShare: (doc: BusinessDocument) => void;
  onDelete: (id: string) => void;
  onStar: (doc: BusinessDocument) => void;
  onLink: (doc: BusinessDocument) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical size={16} /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onPreview(doc)}><Eye size={14} className="mr-2" />Preview</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDownload(doc)}><Download size={14} className="mr-2" />Download</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(doc)}><Pencil size={14} className="mr-2" />Edit metadata</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onStar(doc)}>{doc.isStarred ? <StarOff size={14} className="mr-2" /> : <Star size={14} className="mr-2" />}{doc.isStarred ? "Unstar" : "Star"}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onShare(doc)}><Share2 size={14} className="mr-2" />{doc.isShared ? "Revoke share" : "Create share link"}</DropdownMenuItem>
        {doc.isShared && doc.shareLink ? <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(getDocumentShareUrl(doc.shareLink || ""))}><Link2 size={14} className="mr-2" />Copy share link</DropdownMenuItem> : null}
        <DropdownMenuItem onClick={() => onLink(doc)}><Link2 size={14} className="mr-2" />Link to record</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600" onClick={() => onDelete(doc.id)}><Trash2 size={14} className="mr-2" />Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
