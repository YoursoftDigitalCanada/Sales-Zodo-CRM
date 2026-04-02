// src/pages/LetterBox.tsx

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NotificationBell } from "@/components/NotificationBell";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  sendEmail as apiSendEmail,
  saveDraft as apiSaveDraft,
  getEmails as apiGetEmails,
  getEmailConfigStatus,
  fetchEmailsNow,
  toggleStar as apiToggleStar,
  toggleImportant as apiToggleImportant,
  setEmailLabels as apiSetEmailLabels,
  snoozeEmail as apiSnoozeEmail,
  updateReadStatus as apiUpdateReadStatus,
  moveToFolder as apiMoveToFolder,
  permanentlyDeleteEmail as apiPermanentlyDeleteEmail,
  getEmailLabels as apiGetEmailLabels,
  createEmailLabel as apiCreateEmailLabel,
  getMailboxSettings as apiGetMailboxSettings,
  updateMailboxSettings as apiUpdateMailboxSettings,
  type MailboxSettings,
  type UpdateMailboxSettingsPayload,
  type EmailResponse,
} from "@/features/emails/services/emails-service";
import { API_ORIGIN } from "@/services/api";
import {
  Bell,
  Search,
  Inbox,
  Send,
  FileText,
  Archive,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Star,
  StarOff,
  Mail,
  MailOpen,
  MailPlus,
  Reply,
  ReplyAll,
  Forward,
  MoreVertical,
  MoreHorizontal,
  Paperclip,
  Image as ImageIcon,
  Link2,
  Smile,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  X,
  Check,
  CheckCheck,
  Clock,
  Calendar,
  Tag,
  Tags,
  Flag,
  AlertCircle,
  Circle,
  CircleDot,
  Folder,
  FolderPlus,
  Settings,
  RefreshCw,
  Filter,
  SlidersHorizontal,
  Download,
  Printer,
  ExternalLink,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Users,
  UserPlus,
  AtSign,
  Hash,
  Sparkles,
  Zap,
  ArrowUpRight,
  ArrowLeft,
  CornerUpLeft,
  CornerUpRight,
  Maximize2,
  Minimize2,
  Move,
  type LucideIcon,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

interface Email {
  id: string;
  from: {
    name: string;
    email: string;
    avatar?: string;
  };
  to: {
    name: string;
    email: string;
  }[];
  cc?: {
    name: string;
    email: string;
  }[];
  bcc?: {
    name: string;
    email: string;
  }[];
  subject: string;
  preview: string;
  body: string;
  date: string;
  time: string;
  sortAt?: number;
  read: boolean;
  starred: boolean;
  important: boolean;
  hasAttachments: boolean;
  attachments?: Attachment[];
  labels: string[];
  folder: string;
  snoozedUntil?: string | null;
  threadId?: string;
  replyTo?: string;
}

interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  url?: string;
}

interface Folder {
  id: string;
  name: string;
  icon: LucideIcon;
  count: number;
  color?: string;
}

interface EmailLabel {
  id: string;
  name: string;
  color: string;
}

// ============================================
// DUMMY DATA
// ============================================

const folders: Folder[] = [
  { id: "inbox", name: "Inbox", icon: Inbox, count: 24 },
  { id: "starred", name: "Starred", icon: Star, count: 8 },
  { id: "important", name: "Important", icon: Flag, count: 5 },
  { id: "sent", name: "Sent", icon: Send, count: 0 },
  { id: "drafts", name: "Drafts", icon: FileText, count: 3 },
  { id: "archive", name: "Archive", icon: Archive, count: 0 },
  { id: "spam", name: "Spam", icon: AlertCircle, count: 2 },
  { id: "trash", name: "Trash", icon: Trash2, count: 0 },
];

const DEFAULT_EMAIL_LABELS: EmailLabel[] = [
  { id: "work", name: "Work", color: "#3B82F6" },
  { id: "personal", name: "Personal", color: "#8B5CF6" },
  { id: "clients", name: "Clients", color: "#22D3EE" },
  { id: "finance", name: "Finance", color: "#22C55E" },
  { id: "urgent", name: "Urgent", color: "#EF4444" },
  { id: "social", name: "Social", color: "#EC4899" },
];

const NEW_LABEL_COLORS = ["#3B82F6", "#8B5CF6", "#22D3EE", "#22C55E", "#EF4444", "#EC4899", "#F59E0B", "#14B8A6"];

const initialEmails: Email[] = [
  {
    id: "email_001",
    from: {
      name: "Sarah Johnson",
      email: "sarah.johnson@company.com",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
    },
    to: [{ name: "You", email: "admin@yoursoft.ca" }],
    subject: "Q4 Marketing Campaign - Final Review Required",
    preview: "Hi team, I've attached the final designs for our Q4 marketing campaign. Please review and provide feedback by EOD...",
    body: `<p>Hi team,</p>
<p>I've attached the final designs for our Q4 marketing campaign. Please review and provide feedback by EOD Friday.</p>
<p>Key highlights:</p>
<ul>
<li>New brand colors implemented</li>
<li>Updated messaging for holiday season</li>
<li>Social media assets included</li>
</ul>
<p>Let me know if you have any questions!</p>
<p>Best regards,<br/>Sarah</p>`,
    date: "Today",
    time: "10:45 AM",
    read: false,
    starred: true,
    important: true,
    hasAttachments: true,
    attachments: [
      { id: "att_1", name: "Q4_Campaign_Final.pdf", size: "2.4 MB", type: "pdf" },
      { id: "att_2", name: "Social_Assets.zip", size: "15.8 MB", type: "zip" },
    ],
    labels: ["work", "urgent"],
    folder: "inbox",
  },
  {
    id: "email_002",
    from: {
      name: "Michael Chen",
      email: "m.chen@techcorp.io",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
    },
    to: [{ name: "You", email: "admin@yoursoft.ca" }],
    subject: "Re: Project Proposal - Next Steps",
    preview: "Thanks for sending over the proposal. I've reviewed it with my team and we have a few questions regarding the timeline...",
    body: `<p>Thanks for sending over the proposal.</p>
<p>I've reviewed it with my team and we have a few questions regarding the timeline and deliverables. Would you be available for a call this week to discuss?</p>
<p>Our main concerns are:</p>
<ol>
<li>Phase 2 timeline seems aggressive</li>
<li>Resource allocation for testing</li>
<li>Integration requirements</li>
</ol>
<p>Let me know your availability.</p>
<p>Cheers,<br/>Michael</p>`,
    date: "Today",
    time: "9:30 AM",
    read: false,
    starred: false,
    important: false,
    hasAttachments: false,
    labels: ["clients"],
    folder: "inbox",
  },
  {
    id: "email_003",
    from: {
      name: "Stripe",
      email: "notifications@stripe.com",
    },
    to: [{ name: "You", email: "admin@yoursoft.ca" }],
    subject: "Your payment of $2,450.00 was successful",
    preview: "Your payment to Acme Corp has been processed successfully. Transaction ID: pi_3NxYz2ABC123...",
    body: `<p>Your payment was successful!</p>
<p><strong>Amount:</strong> $2,450.00<br/>
<strong>To:</strong> Acme Corp<br/>
<strong>Transaction ID:</strong> pi_3NxYz2ABC123</p>
<p>View your receipt in the Stripe Dashboard.</p>`,
    date: "Today",
    time: "8:15 AM",
    read: true,
    starred: false,
    important: false,
    hasAttachments: false,
    labels: ["finance"],
    folder: "inbox",
  },
  {
    id: "email_004",
    from: {
      name: "Emily Davis",
      email: "emily.d@design.co",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100",
    },
    to: [{ name: "You", email: "admin@yoursoft.ca" }],
    subject: "Design System Updates - Version 2.0",
    preview: "Hey! I've just pushed the new design system updates to Figma. The component library now includes all the new...",
    body: `<p>Hey!</p>
<p>I've just pushed the new design system updates to Figma. The component library now includes all the new components we discussed.</p>
<p>New additions:</p>
<ul>
<li>Updated button variants</li>
<li>New card components</li>
<li>Form elements redesign</li>
<li>Dark mode support</li>
</ul>
<p>Check it out and let me know your thoughts!</p>
<p>- Emily</p>`,
    date: "Yesterday",
    time: "4:20 PM",
    read: true,
    starred: true,
    important: false,
    hasAttachments: true,
    attachments: [
      { id: "att_3", name: "DesignSystem_v2.fig", size: "8.2 MB", type: "figma" },
    ],
    labels: ["work"],
    folder: "inbox",
  },
  {
    id: "email_005",
    from: {
      name: "GitHub",
      email: "noreply@github.com",
    },
    to: [{ name: "You", email: "admin@yoursoft.ca" }],
    subject: "[yoursoft/crm] Pull request #142 merged",
    preview: "The pull request 'Feature: Add booking calendar integration' has been merged into main by @sarahjohnson...",
    body: `<p>Pull request merged!</p>
<p><strong>#142 Feature: Add booking calendar integration</strong></p>
<p>Merged by @sarahjohnson into main</p>
<p>Changes: +245 -32</p>`,
    date: "Yesterday",
    time: "2:45 PM",
    read: true,
    starred: false,
    important: false,
    hasAttachments: false,
    labels: ["work"],
    folder: "inbox",
  },
  {
    id: "email_006",
    from: {
      name: "David Wilson",
      email: "david.w@startup.io",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100",
    },
    to: [{ name: "You", email: "admin@yoursoft.ca" }],
    subject: "Partnership Opportunity - Let's Connect!",
    preview: "Hi there! I came across your company and I'm really impressed with what you're building. I'd love to explore...",
    body: `<p>Hi there!</p>
<p>I came across your company and I'm really impressed with what you're building. I'd love to explore potential partnership opportunities.</p>
<p>We're a B2B SaaS startup focusing on customer success tools, and I think there could be great synergies between our products.</p>
<p>Would you be open to a quick 15-minute call next week?</p>
<p>Best,<br/>David Wilson<br/>CEO, Startup.io</p>`,
    date: "Oct 28",
    time: "11:30 AM",
    read: true,
    starred: false,
    important: true,
    hasAttachments: false,
    labels: ["clients"],
    folder: "inbox",
  },
  {
    id: "email_007",
    from: {
      name: "LinkedIn",
      email: "notifications@linkedin.com",
    },
    to: [{ name: "You", email: "admin@yoursoft.ca" }],
    subject: "You have 5 new connection requests",
    preview: "Sarah Johnson, Michael Chen, and 3 others want to connect with you on LinkedIn...",
    body: `<p>You have new connection requests!</p>
<p>Sarah Johnson, Michael Chen, and 3 others want to connect with you.</p>
<p>View and respond to your pending invitations.</p>`,
    date: "Oct 27",
    time: "9:00 AM",
    read: true,
    starred: false,
    important: false,
    hasAttachments: false,
    labels: ["social"],
    folder: "inbox",
  },
  {
    id: "email_008",
    from: {
      name: "You",
      email: "admin@yoursoft.ca",
    },
    to: [{ name: "Team", email: "team@yoursoft.ca" }],
    subject: "Weekly Team Sync - Agenda",
    preview: "Hi team, Here's the agenda for our weekly sync tomorrow at 10 AM...",
    body: `<p>Hi team,</p>
<p>Here's the agenda for our weekly sync tomorrow at 10 AM:</p>
<ol>
<li>Sprint review</li>
<li>Q4 priorities</li>
<li>Resource planning</li>
<li>Open discussion</li>
</ol>
<p>Please come prepared with your updates!</p>`,
    date: "Oct 26",
    time: "5:00 PM",
    read: true,
    starred: false,
    important: false,
    hasAttachments: false,
    labels: ["work"],
    folder: "sent",
  },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getAttachmentIcon = (type: string) => {
  const normalizedType = type.toLowerCase();

  if (normalizedType.includes("pdf")) {
      return "📄";
  }

  if (normalizedType.includes("zip") || normalizedType.includes("compressed")) {
      return "📦";
  }

  if (normalizedType.includes("figma")) {
      return "🎨";
  }

  if (normalizedType.includes("image")) {
      return "🖼️";
  }

  return "📎";
};

const formatFileSize = (size: string | number) => {
  if (typeof size === "string") {
    return size;
  }

  if (!Number.isFinite(size) || size <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const plainTextToHtml = (value: string) => {
  const escaped = escapeHtml(value);
  if (!escaped.trim()) {
    return "";
  }

  return escaped
    .split("\n")
    .map((line) => (line ? line : "<br/>"))
    .join("<br/>");
};

const htmlToPlainText = (value: string) => {
  if (typeof window === "undefined") {
    return value.replace(/<[^>]+>/g, " ");
  }

  const temp = document.createElement("div");
  temp.innerHTML = value;
  return (temp.textContent || temp.innerText || "").replace(/\u00A0/g, " ");
};

const buildAttachmentUrl = (value?: string) => {
  if (!value) return undefined;
  return /^https?:\/\//i.test(value) ? value : `${API_ORIGIN}${value.startsWith("/") ? value : `/${value}`}`;
};

const mapEmailResponseToEmail = (e: EmailResponse): Email => {
  const toArr = Array.isArray(e.toAddresses) ? e.toAddresses : [];
  const ccArr = Array.isArray(e.ccAddresses) ? e.ccAddresses : [];
  const bccArr = Array.isArray(e.bccAddresses) ? e.bccAddresses : [];
  const created = e.sentAt || e.receivedAt || e.createdAt;
  const d = created ? new Date(created) : new Date();
  const isToday = new Date().toDateString() === d.toDateString();

  return {
    id: e.id,
    from: {
      name: e.fromName || e.fromAddress || "Unknown",
      email: e.fromAddress || "",
    },
    to: toArr.map((a: any) => ({ name: a.name || a.email || "", email: a.email || "" })),
    cc: ccArr.length > 0 ? ccArr.map((a: any) => ({ name: a.name || a.email || "", email: a.email || "" })) : undefined,
    bcc: bccArr.length > 0 ? bccArr.map((a: any) => ({ name: a.name || a.email || "", email: a.email || "" })) : undefined,
    subject: e.subject || "(No Subject)",
    preview: e.bodyText ? e.bodyText.slice(0, 120) : (e.bodyHtml ? e.bodyHtml.replace(/<[^>]+>/g, "").slice(0, 120) : ""),
    body: e.bodyHtml || plainTextToHtml(e.bodyText || "") || "",
    date: isToday ? "Today" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
    sortAt: d.getTime(),
    read: e.isRead ?? true,
    starred: e.isStarred ?? false,
    important: e.isImportant ?? false,
    hasAttachments: e.hasAttachments ?? false,
    attachments: Array.isArray(e.attachments)
      ? e.attachments.map((attachment) => ({
          id: attachment.id,
          name: attachment.filename || "Attachment",
          size: formatFileSize(typeof attachment.size === "number" ? attachment.size : Number(attachment.size || 0)),
          type: attachment.mimeType || "file",
          url: buildAttachmentUrl(attachment.path),
        }))
      : [],
    labels: Array.isArray(e.labels) ? e.labels.map((label) => label.id) : [],
    folder: (e.folder || "INBOX").toLowerCase(),
    snoozedUntil: e.snoozedUntil ?? null,
  };
};

const isEmailSnoozed = (email: Pick<Email, "folder" | "snoozedUntil">) => {
  if (email.folder !== "inbox" || !email.snoozedUntil) {
    return false;
  }

  const snoozedUntil = new Date(email.snoozedUntil).getTime();
  return Number.isFinite(snoozedUntil) && snoozedUntil > Date.now();
};

const getTomorrowMorningIso = () => {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return next.toISOString();
};

const getInitialComposeValues = (
  replyTo?: Email,
  forwardEmail?: Email,
  preset?: {
    to?: string;
    cc?: string;
    bcc?: string;
    subject?: string;
    bodyHtml?: string;
  },
) => {
  if (preset) {
    return {
      to: preset.to || "",
      cc: preset.cc || "",
      bcc: preset.bcc || "",
      subject: preset.subject || "",
      bodyHtml: preset.bodyHtml || "",
    };
  }

  const forwardedText = forwardEmail
    ? `\n\n---------- Forwarded message ----------\nFrom: ${forwardEmail.from.name} <${forwardEmail.from.email}>\nDate: ${forwardEmail.date}\nSubject: ${forwardEmail.subject}\n\n${forwardEmail.preview}`
    : "";

  return {
    to: replyTo ? replyTo.from.email : "",
    cc: "",
    bcc: "",
    subject: replyTo ? `Re: ${replyTo.subject}` : forwardEmail ? `Fwd: ${forwardEmail.subject}` : "",
    bodyHtml: forwardedText ? plainTextToHtml(forwardedText) : "",
  };
};

// ============================================
// COMPOSE EMAIL DIALOG
// ============================================

const ComposeEmailDialog = ({
  isOpen,
  onClose,
  replyTo,
  forwardEmail,
  preset,
}: {
  isOpen: boolean;
  onClose: () => void;
  replyTo?: Email;
  forwardEmail?: Email;
  preset?: {
    to?: string;
    cc?: string;
    subject?: string;
    bodyHtml?: string;
  };
}) => {
  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [to, setTo] = useState(replyTo ? replyTo.from.email : "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(
    replyTo ? `Re: ${replyTo.subject}` : forwardEmail ? `Fwd: ${forwardEmail.subject}` : ""
  );
  const [bodyHtml, setBodyHtml] = useState(getInitialComposeValues(replyTo, forwardEmail).bodyHtml);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isEditorFocused, setIsEditorFocused] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const initialValues = getInitialComposeValues(replyTo, forwardEmail, preset);
    setTo(initialValues.to);
    setCc(initialValues.cc || "");
    setBcc(initialValues.bcc || "");
    setSubject(initialValues.subject);
    setBodyHtml(initialValues.bodyHtml);
    setShowCc(Boolean(initialValues.cc));
    setShowBcc(Boolean(initialValues.bcc));
    setAttachments([]);
    setIsMinimized(false);
    setIsEditorFocused(false);

    requestAnimationFrame(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = initialValues.bodyHtml;
      }
    });
  }, [isOpen, replyTo, forwardEmail, preset]);

  const syncEditorState = useCallback(() => {
    setBodyHtml(editorRef.current?.innerHTML || "");
  }, []);

  const applyEditorCommand = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditorState();
  }, [syncEditorState]);

  const handleSend = async () => {
    if (!to.trim() || !subject.trim()) {
      toast({
        title: "Missing Fields",
        description: "Please fill in recipient and subject.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const toAddresses = to.split(/[,;]/).map((email) => email.trim()).filter(Boolean).map((email) => ({ email }));
      const ccAddresses = cc ? cc.split(/[,;]/).map((email) => email.trim()).filter(Boolean).map((email) => ({ email })) : undefined;
      const bccAddresses = bcc ? bcc.split(/[,;]/).map((email) => email.trim()).filter(Boolean).map((email) => ({ email })) : undefined;
      const currentBodyHtml = (editorRef.current?.innerHTML || bodyHtml || "").trim();
      const bodyText = htmlToPlainText(currentBodyHtml).trim();

      await apiSendEmail({
        toAddresses,
        ccAddresses,
        bccAddresses,
        subject,
        bodyHtml: currentBodyHtml,
        bodyText,
        attachments,
      });

      toast({
        title: "Email Sent ✅",
        description: `Your email to ${to} has been sent successfully via SMTP.`,
      });
      onClose();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Failed to send email.";
      toast({
        title: "Email Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = () => {
    const saveDraft = async () => {
      try {
        const toAddresses = to.split(/[,;]/).map((email) => email.trim()).filter(Boolean).map((email) => ({ email }));
        const ccAddresses = cc ? cc.split(/[,;]/).map((email) => email.trim()).filter(Boolean).map((email) => ({ email })) : undefined;
        const bccAddresses = bcc ? bcc.split(/[,;]/).map((email) => email.trim()).filter(Boolean).map((email) => ({ email })) : undefined;
        const currentBodyHtml = (editorRef.current?.innerHTML || bodyHtml || "").trim();
        const bodyText = htmlToPlainText(currentBodyHtml).trim();

        await apiSaveDraft({
          toAddresses,
          ccAddresses,
          bccAddresses,
          subject,
          bodyHtml: currentBodyHtml,
          bodyText,
          attachments,
        });

        toast({
          title: "Draft Saved",
          description: "Your email has been saved to drafts.",
        });
        onClose();
      } catch (err: any) {
        const message = err?.response?.data?.message || err?.message || "Could not save the draft.";
        toast({
          title: "Draft Save Failed",
          description: message,
          variant: "destructive",
        });
      }
    };

    void saveDraft();
  };

  const handleScheduleSend = () => {
    const input = window.prompt("Schedule send for (YYYY-MM-DD HH:MM, 24-hour time)");
    if (!input) return;

    const normalized = input.trim().replace(" ", "T");
    const parsed = new Date(normalized);

    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
      toast({
        title: "Invalid Schedule",
        description: "Enter a future date and time, for example 2026-04-02 09:00.",
        variant: "destructive",
      });
      return;
    }

    const scheduleDraft = async () => {
      try {
        const toAddresses = to.split(/[,;]/).map((email) => email.trim()).filter(Boolean).map((email) => ({ email }));
        const ccAddresses = cc ? cc.split(/[,;]/).map((email) => email.trim()).filter(Boolean).map((email) => ({ email })) : undefined;
        const bccAddresses = bcc ? bcc.split(/[,;]/).map((email) => email.trim()).filter(Boolean).map((email) => ({ email })) : undefined;
        const currentBodyHtml = (editorRef.current?.innerHTML || bodyHtml || "").trim();
        const bodyText = htmlToPlainText(currentBodyHtml).trim();

        await apiSaveDraft({
          toAddresses,
          ccAddresses,
          bccAddresses,
          subject,
          bodyHtml: currentBodyHtml,
          bodyText,
          scheduledFor: parsed.toISOString(),
          attachments,
        });

        toast({
          title: "Email Scheduled",
          description: `Your email is scheduled for ${parsed.toLocaleString()}.`,
        });
        onClose();
      } catch (err: any) {
        const message = err?.response?.data?.message || err?.message || "Could not schedule the email.";
        toast({
          title: "Schedule Failed",
          description: message,
          variant: "destructive",
        });
      }
    };

    void scheduleDraft();
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-0 right-6 w-72 bg-white rounded-t-xl card-shadow border border-[rgba(15,23,42,0.06)] z-50"
      >
        <div
          className="flex items-center justify-between p-3 bg-[#F8FAFC] text-[#0F172A] rounded-t-xl cursor-pointer"
          onClick={() => setIsMinimized(false)}
        >
          <div className="flex items-center gap-2">
            <Edit size={16} />
            <span className="text-sm font-medium">New Message</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
              className="p-1 hover:bg-white/10 rounded"
            >
              <Maximize2 size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 hover:bg-white/10 rounded"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0 rounded-md overflow-hidden max-h-[90vh]">
        <DialogHeader className="sr-only">
          <DialogTitle>{replyTo ? "Reply" : forwardEmail ? "Forward" : "New Message"}</DialogTitle>
          <DialogDescription>Compose and send an email</DialogDescription>
        </DialogHeader>
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#F8FAFC] text-[#0F172A]">
          <h2 className="font-semibold">
            {replyTo ? "Reply" : forwardEmail ? "Forward" : "New Message"}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
            >
              <Minimize2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-4 space-y-3">
          {/* To */}
          <div className="flex items-center gap-3">
            <Label className="w-12 text-sm text-[#94A3B8]">To:</Label>
            <div className="flex-1 flex items-center gap-2">
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@email.com"
                className="flex-1 h-9 border-0 border-b border-[rgba(15,23,42,0.06)] rounded-none px-0 focus-visible:ring-0 focus-visible:border-[#22D3EE]"
              />
              <div className="flex items-center gap-2">
                {!showCc && (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className="text-xs text-[#475569] hover:text-[#0891B2]"
                  >
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    type="button"
                    onClick={() => setShowBcc(true)}
                    className="text-xs text-[#475569] hover:text-[#0891B2]"
                  >
                    Bcc
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Cc */}
          {showCc && (
            <div className="flex items-center gap-3">
              <Label className="w-12 text-sm text-[#94A3B8]">Cc:</Label>
              <div className="flex flex-1 items-center gap-2">
                <Input
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@email.com"
                  className="flex-1 h-9 border-0 border-b border-[rgba(15,23,42,0.06)] rounded-none px-0 focus-visible:ring-0 focus-visible:border-[#22D3EE]"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCc("");
                    setShowCc(false);
                  }}
                  className="text-xs text-[#94A3B8] hover:text-[#475569]"
                  aria-label="Remove cc"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Bcc */}
          {showBcc && (
            <div className="flex items-center gap-3">
              <Label className="w-12 text-sm text-[#94A3B8]">Bcc:</Label>
              <div className="flex flex-1 items-center gap-2">
                <Input
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@email.com"
                  className="flex-1 h-9 border-0 border-b border-[rgba(15,23,42,0.06)] rounded-none px-0 focus-visible:ring-0 focus-visible:border-[#22D3EE]"
                />
                <button
                  type="button"
                  onClick={() => {
                    setBcc("");
                    setShowBcc(false);
                  }}
                  className="text-xs text-[#94A3B8] hover:text-[#475569]"
                  aria-label="Remove bcc"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center gap-3">
            <Label className="w-12 text-sm text-[#94A3B8]">Subject:</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="flex-1 h-9 border-0 border-b border-[rgba(15,23,42,0.06)] rounded-none px-0 focus-visible:ring-0 focus-visible:border-[#22D3EE]"
            />
          </div>

          {/* Body */}
          <div className="pt-2 relative">
            {!isEditorFocused && !htmlToPlainText(bodyHtml).trim() && (
              <span className="pointer-events-none absolute left-0 top-0 text-[#94A3B8]">
                Write your message here...
              </span>
            )}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={syncEditorState}
              onFocus={() => setIsEditorFocused(true)}
              onBlur={() => {
                setIsEditorFocused(false);
                syncEditorState();
              }}
              className="min-h-[288px] w-full border-0 p-0 outline-none text-[#475569] prose prose-sm max-w-none [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_p]:my-0"
            />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[rgba(15,23,42,0.06)]">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#F8FAFC] rounded-md text-sm"
                >
                  <Paperclip size={14} className="text-[#94A3B8]" />
                  <span className="text-[#0F172A]">{file.name}</span>
                  <button
                    onClick={() =>
                      setAttachments((prev) => prev.filter((_, i) => i !== index))
                    }
                    className="text-[#475569] hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[rgba(15,23,42,0.06)] bg-[#F8FAFC]">
          {/* Formatting Toolbar */}
          <div className="flex items-center gap-1">
            <TooltipProvider>
              {[
                { icon: Bold, label: "Bold", command: "bold" },
                { icon: Italic, label: "Italic", command: "italic" },
                { icon: Underline, label: "Underline", command: "underline" },
                { icon: List, label: "Bullet List", command: "insertUnorderedList" },
                { icon: ListOrdered, label: "Numbered List", command: "insertOrderedList" },
              ].map((tool) => (
                <Tooltip key={tool.label}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => applyEditorCommand(tool.command)}
                      className="p-2 rounded-md hover:bg-slate-200 text-[#94A3B8] transition-colors"
                    >
                      <tool.icon size={16} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tool.label}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
              <Separator orientation="vertical" className="h-6 mx-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <label className="p-2 rounded-md hover:bg-slate-200 text-[#94A3B8] transition-colors cursor-pointer">
                    <Paperclip size={16} />
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
                        }
                      }}
                    />
                  </label>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Attach Files</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      const url = window.prompt("Enter a link URL");
                      if (!url) return;
                      applyEditorCommand("createLink", url);
                    }}
                    className="p-2 rounded-md hover:bg-slate-200 text-[#94A3B8] transition-colors"
                  >
                    <Link2 size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Insert Link</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => applyEditorCommand("insertText", "🙂")}
                    className="p-2 rounded-md hover:bg-slate-200 text-[#94A3B8] transition-colors"
                  >
                    <Smile size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Insert Emoji</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              className="rounded-md"
            >
              Save Draft
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md" onClick={handleSend} disabled={isSending}>
                  <Send size={16} className="mr-2" />
                  {isSending ? "Sending..." : "Send"}
                  <ChevronDown size={14} className="ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-md">
                <DropdownMenuItem onClick={handleSend} className="rounded-md" disabled={isSending}>
                  <Send size={14} className="mr-2" />
                  {isSending ? "Sending..." : "Send Now"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleScheduleSend} className="rounded-md">
                  <Clock size={14} className="mr-2" />
                  Schedule Send
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// EMAIL LIST ITEM COMPONENT
// ============================================

const EmailListItem = ({
  email,
  labels,
  isSelected,
  isActive,
  onSelect,
  onClick,
  onStar,
  onMarkRead,
  onArchive,
  onDelete,
}: {
  email: Email;
  labels: EmailLabel[];
  isSelected: boolean;
  isActive: boolean;
  onSelect: () => void;
  onClick: () => void;
  onStar: () => void;
  onMarkRead: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) => {
  const emailLabels = labels.filter((l) => email.labels.includes(l.id));

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-[rgba(15,23,42,0.06)] transition-all group",
        isActive
          ? "bg-[#0891B2]/10 border-l-4 border-l-[#22D3EE]"
          : "hover:bg-[#F8FAFC]",
        !email.read && "bg-blue-50/50"
      )}
      onClick={onClick}
    >
      {/* Checkbox & Star */}
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
        />
        <button
          onClick={onStar}
          className="p-1 rounded-md hover:bg-slate-200 transition-colors"
        >
          {email.starred ? (
            <Star size={16} className="text-[#D97706] fill-[#FBBF24]" />
          ) : (
            <Star size={16} className="text-[#475569] group-hover:text-[#475569]" />
          )}
        </button>
        {email.important && (
          <Flag size={14} className="text-red-500 fill-red-500" />
        )}
      </div>

      {/* Avatar */}
      {email.from.avatar ? (
        <img
          src={email.from.avatar}
          alt={email.from.name}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] text-sm font-bold flex-shrink-0">
          {getInitials(email.from.name)}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn(
            "font-medium truncate",
            !email.read ? "text-[#0F172A] font-semibold" : "text-[#475569]"
          )}>
            {email.from.name}
          </span>
          {!email.read && (
            <span className="w-2 h-2 rounded-full bg-[#0891B2] flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "truncate",
            !email.read ? "text-[#0F172A] font-medium" : "text-[#94A3B8]"
          )}>
            {email.subject}
          </span>
        </div>
        <p className="text-sm text-[#475569] truncate">{email.preview}</p>
      </div>

      {/* Meta */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={cn(
          "text-xs",
          !email.read ? "text-[#0891B2] font-semibold" : "text-[#475569]"
        )}>
          {email.time}
        </span>
        <div className="flex items-center gap-1">
          {email.hasAttachments && (
            <Paperclip size={12} className="text-[#475569]" />
          )}
          {emailLabels.slice(0, 2).map((label) => (
            <span
              key={label.id}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: label.color }}
            />
          ))}
        </div>
      </div>

      {/* Quick Actions (on hover) */}
      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onArchive}
                className="p-1.5 rounded-md hover:bg-slate-200 text-[#475569] transition-colors"
              >
                <Archive size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Archive</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onDelete}
                className="p-1.5 rounded-md hover:bg-red-100 text-[#475569] hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onMarkRead}
                className="p-1.5 rounded-md hover:bg-slate-200 text-[#475569] transition-colors"
              >
                {email.read ? <Mail size={14} /> : <MailOpen size={14} />}
              </button>
            </TooltipTrigger>
            <TooltipContent>{email.read ? "Mark as Unread" : "Mark as Read"}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </motion.div>
  );
};

// ============================================
// EMAIL DETAIL VIEW COMPONENT
// ============================================

const EmailDetailView = ({
  email,
  labels,
  onClose,
  onReply,
  onReplyAll,
  onForward,
  onStar,
  onArchive,
  onDelete,
  onMoveToSpam,
  onDeletePermanently,
  onMarkRead,
  onPrint,
  onDownload,
  onToggleLabel,
  onToggleImportant,
  onSnooze,
}: {
  email: Email;
  labels: EmailLabel[];
  onClose: () => void;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
  onStar: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onMoveToSpam: () => void;
  onDeletePermanently: () => void;
  onMarkRead: () => void;
  onPrint: () => void;
  onDownload: () => void;
  onToggleLabel: (labelId: string) => void;
  onToggleImportant: () => void;
  onSnooze: () => void;
}) => {
  const emailLabels = labels.filter((l) => email.labels.includes(l.id));

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="h-full flex flex-col bg-white"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-md lg:hidden"
          >
            <ArrowLeft size={18} />
          </Button>
          <h2 className="text-lg font-semibold text-[#0F172A] truncate max-w-[400px]">
            {email.subject}
          </h2>
        </div>

        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onArchive}
                  className="h-9 w-9 rounded-md"
                >
                  <Archive size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Archive</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  className="h-9 w-9 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onMarkRead}
                  className="h-9 w-9 rounded-md"
                >
                  {email.read ? <Mail size={18} /> : <MailOpen size={18} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{email.read ? "Mark as Unread" : "Mark as Read"}</TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md">
                  <MoreVertical size={18} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-md">
                <DropdownMenuItem onClick={onPrint} className="rounded-md">
                  <Printer size={14} className="mr-2" />
                  Print
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDownload} className="rounded-md">
                  <Download size={14} className="mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="rounded-md">
                    <Tag size={14} className="mr-2" />
                    Labels
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="rounded-md">
                    {labels.map((label) => (
                      <DropdownMenuItem key={label.id} onClick={() => onToggleLabel(label.id)} className="rounded-md">
                        <span
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: label.color }}
                        />
                        {label.name}
                        {email.labels.includes(label.id) ? <Check size={14} className="ml-auto" /> : null}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onMoveToSpam} className="rounded-md">
                  <AlertCircle size={14} className="mr-2" />
                  {email.folder === "spam" ? "Move to Inbox" : "Move to Spam"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onToggleImportant} className="rounded-md">
                  <Flag size={14} className="mr-2" />
                  {email.important ? "Remove Important" : "Mark as Important"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSnooze} className="rounded-md">
                  <Clock size={14} className="mr-2" />
                  Snooze
                </DropdownMenuItem>
                {email.folder === "trash" ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDeletePermanently} className="rounded-md text-red-600 focus:text-red-600">
                      <Trash2 size={14} className="mr-2" />
                      Delete Permanently
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Sender Info */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            {email.from.avatar ? (
              <img
                src={email.from.avatar}
                alt={email.from.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] font-bold">
                {getInitials(email.from.name)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#0F172A]">{email.from.name}</span>
                <button onClick={onStar}>
                  {email.starred ? (
                    <Star size={16} className="text-[#D97706] fill-[#FBBF24]" />
                  ) : (
                    <Star size={16} className="text-[#475569] hover:text-[#475569]" />
                  )}
                </button>
              </div>
              <p className="text-sm text-[#94A3B8]">{email.from.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-[#475569]">to me</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-xs text-[#475569] hover:text-[#475569]">
                      <ChevronDown size={12} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 rounded-md p-3">
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-[#475569]">From:</span>{" "}
                        <span className="text-[#475569]">{email.from.email}</span>
                      </div>
                      <div>
                        <span className="text-[#475569]">To:</span>{" "}
                        <span className="text-[#475569]">{email.to.map((t) => t.email).join(", ")}</span>
                      </div>
                      {email.cc && email.cc.length > 0 && (
                        <div>
                          <span className="text-[#475569]">Cc:</span>{" "}
                          <span className="text-[#475569]">{email.cc.map((recipient) => recipient.email).join(", ")}</span>
                        </div>
                      )}
                      {email.bcc && email.bcc.length > 0 && (
                        <div>
                          <span className="text-[#475569]">Bcc:</span>{" "}
                          <span className="text-[#475569]">{email.bcc.map((recipient) => recipient.email).join(", ")}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-[#475569]">Date:</span>{" "}
                        <span className="text-[#475569]">{email.date} at {email.time}</span>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm text-[#94A3B8]">{email.date}, {email.time}</span>
            <div className="flex items-center gap-1 mt-2 justify-end">
              {emailLabels.map((label) => (
                <span
                  key={label.id}
                  className="px-2 py-0.5 rounded-md text-xs font-medium text-[#0F172A]"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Email Body */}
        <div
          className="prose prose-sm max-w-none text-[#475569]"
          dangerouslySetInnerHTML={{ __html: email.body }}
        />

        {/* Attachments */}
        {email.hasAttachments && email.attachments && (
          <div className="mt-8 pt-6 border-t border-[rgba(15,23,42,0.06)]">
            <h4 className="text-sm font-semibold text-[#0F172A] mb-3">
              Attachments ({email.attachments.length})
            </h4>
            <div className="flex flex-wrap gap-3">
              {email.attachments.map((attachment) => (
                <motion.div
                  key={attachment.id}
                  whileHover={{ y: -2 }}
                  onClick={() => {
                    if (attachment.url) {
                      window.open(attachment.url, "_blank", "noopener,noreferrer");
                    }
                  }}
                  className="flex items-center gap-3 px-4 py-3 bg-[#F8FAFC] rounded-md border border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-md transition-all cursor-pointer group"
                >
                  <span className="text-2xl">{getAttachmentIcon(attachment.type)}</span>
                  <div>
                    <p className="text-sm font-medium text-[#0F172A] group-hover:text-[#0891B2] transition-colors">
                      {attachment.name}
                    </p>
                    <p className="text-xs text-[#475569]">{attachment.size}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (attachment.url) {
                        window.open(attachment.url, "_blank", "noopener,noreferrer");
                      }
                    }}
                  >
                    <Download size={14} />
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reply Actions */}
      <div className="p-4 border-t border-[rgba(15,23,42,0.06)] bg-[#F8FAFC]">
        <div className="flex items-center gap-3">
          <Button
            onClick={onReply}
            variant="outline"
            className="flex-1 rounded-md border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE] hover:text-[#0891B2]"
          >
            <CornerUpLeft size={16} className="mr-2" />
            Reply
          </Button>
          <Button
            onClick={onReplyAll}
            variant="outline"
            className="flex-1 rounded-md border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE] hover:text-[#0891B2]"
          >
            <ReplyAll size={16} className="mr-2" />
            Reply All
          </Button>
          <Button
            onClick={onForward}
            variant="outline"
            className="flex-1 rounded-md border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE] hover:text-[#0891B2]"
          >
            <CornerUpRight size={16} className="mr-2" />
            Forward
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// MAIN LETTERBOX PAGE COMPONENT
// ============================================

type MailboxFormState = {
  smtpHost: string;
  smtpPort: string;
  smtpUsername: string;
  smtpPassword: string;
  smtpEncryption: "SSL/TLS" | "STARTTLS" | "NONE";
  senderName: string;
  senderEmail: string;
  imapHost: string;
  imapPort: string;
  imapUsername: string;
  imapPassword: string;
  imapEncryption: "SSL/TLS" | "STARTTLS" | "NONE";
};

type DeleteConfirmationState = {
  ids: string[];
  count: number;
} | null;

const EMPTY_MAILBOX_FORM: MailboxFormState = {
  smtpHost: "",
  smtpPort: "587",
  smtpUsername: "",
  smtpPassword: "",
  smtpEncryption: "STARTTLS",
  senderName: "",
  senderEmail: "",
  imapHost: "",
  imapPort: "993",
  imapUsername: "",
  imapPassword: "",
  imapEncryption: "SSL/TLS",
};

function normalizeSmtpEncryption(portValue: string | number, encryption: MailboxFormState["smtpEncryption"]): MailboxFormState["smtpEncryption"] {
  const port = Number(portValue || 0);
  if (port === 465) {
    return "SSL/TLS";
  }
  if (port === 587 || port === 25) {
    return encryption === "NONE" ? "NONE" : "STARTTLS";
  }
  return encryption;
}

function normalizeImapEncryption(portValue: string | number, encryption: MailboxFormState["imapEncryption"]): MailboxFormState["imapEncryption"] {
  const port = Number(portValue || 0);
  if (port === 993) {
    return "SSL/TLS";
  }
  if (port === 143) {
    return encryption === "NONE" ? "NONE" : "STARTTLS";
  }
  return encryption;
}

function mapMailboxSettingsToForm(settings: MailboxSettings | null): MailboxFormState {
  if (!settings) {
    return { ...EMPTY_MAILBOX_FORM };
  }

  const smtpPort = String(settings.smtp.port || 587);
  const imapPort = String(settings.imap.port || 993);

  return {
    smtpHost: settings.smtp.host || "",
    smtpPort,
    smtpUsername: settings.smtp.username || "",
    smtpPassword: settings.smtp.passwordMasked || "",
    smtpEncryption: normalizeSmtpEncryption(smtpPort, settings.smtp.encryption || "STARTTLS"),
    senderName: settings.smtp.senderName || "",
    senderEmail: settings.smtp.senderEmail || "",
    imapHost: settings.imap.host || "",
    imapPort,
    imapUsername: settings.imap.username || "",
    imapPassword: settings.imap.passwordMasked || "",
    imapEncryption: normalizeImapEncryption(imapPort, settings.imap.encryption || "SSL/TLS"),
  };
}

type MailboxSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: MailboxFormState;
  onFormChange: (updater: (current: MailboxFormState) => MailboxFormState) => void;
  onSave: () => void;
  saving: boolean;
};

const MailboxSettingsDialog = ({
  open,
  onOpenChange,
  form,
  onFormChange,
  onSave,
  saving,
}: MailboxSettingsDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>My Mailbox</DialogTitle>
        <DialogDescription>
          Configure the mailbox this employee will use inside Letter Box.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-6 py-2 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A]">SMTP</h3>
            <p className="text-xs text-[#64748B]">Used for sending emails from your own mailbox.</p>
          </div>
          <div className="space-y-2">
            <Label>SMTP Host</Label>
            <Input value={form.smtpHost} onChange={(event) => onFormChange((current) => ({ ...current, smtpHost: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>SMTP Port</Label>
            <Input
              type="number"
              value={form.smtpPort}
              onChange={(event) => onFormChange((current) => ({
                ...current,
                smtpPort: event.target.value,
                smtpEncryption: normalizeSmtpEncryption(event.target.value, current.smtpEncryption),
              }))}
            />
          </div>
          <div className="space-y-2">
            <Label>SMTP Username</Label>
            <Input value={form.smtpUsername} onChange={(event) => onFormChange((current) => ({ ...current, smtpUsername: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>SMTP Password</Label>
            <Input type="password" value={form.smtpPassword} onChange={(event) => onFormChange((current) => ({ ...current, smtpPassword: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>SMTP Encryption</Label>
            <Select value={form.smtpEncryption} onValueChange={(value) => onFormChange((current) => ({ ...current, smtpEncryption: value as MailboxFormState["smtpEncryption"] }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SSL/TLS">SSL/TLS</SelectItem>
                <SelectItem value="STARTTLS">STARTTLS</SelectItem>
                <SelectItem value="NONE">NONE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sender Name</Label>
            <Input value={form.senderName} onChange={(event) => onFormChange((current) => ({ ...current, senderName: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Sender Email</Label>
            <Input value={form.senderEmail} onChange={(event) => onFormChange((current) => ({ ...current, senderEmail: event.target.value }))} />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A]">IMAP</h3>
            <p className="text-xs text-[#64748B]">Used for fetching incoming mail for this employee only.</p>
          </div>
          <div className="space-y-2">
            <Label>IMAP Host</Label>
            <Input value={form.imapHost} onChange={(event) => onFormChange((current) => ({ ...current, imapHost: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>IMAP Port</Label>
            <Input
              type="number"
              value={form.imapPort}
              onChange={(event) => onFormChange((current) => ({
                ...current,
                imapPort: event.target.value,
                imapEncryption: normalizeImapEncryption(event.target.value, current.imapEncryption),
              }))}
            />
          </div>
          <div className="space-y-2">
            <Label>IMAP Username</Label>
            <Input value={form.imapUsername} onChange={(event) => onFormChange((current) => ({ ...current, imapUsername: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>IMAP Password</Label>
            <Input type="password" value={form.imapPassword} onChange={(event) => onFormChange((current) => ({ ...current, imapPassword: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>IMAP Encryption</Label>
            <Select value={form.imapEncryption} onValueChange={(value) => onFormChange((current) => ({ ...current, imapEncryption: value as MailboxFormState["imapEncryption"] }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SSL/TLS">SSL/TLS</SelectItem>
                <SelectItem value="STARTTLS">STARTTLS</SelectItem>
                <SelectItem value="NONE">NONE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save Mailbox"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const LetterBoxPage = () => {
  const { toast } = useToast();

  // State
  const [emails, setEmails] = useState<Email[]>([]);
  const [availableLabels, setAvailableLabels] = useState<EmailLabel[]>(DEFAULT_EMAIL_LABELS);
  const [selectedFolder, setSelectedFolder] = useState("inbox");
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [activeEmail, setActiveEmail] = useState<Email | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortPreference, setSortPreference] = useState<"date" | "sender" | "subject">("date");
  const [unreadFirst, setUnreadFirst] = useState(false);
  const [starredFirst, setStarredFirst] = useState(false);
  const [attachmentsOnly, setAttachmentsOnly] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [replyToEmail, setReplyToEmail] = useState<Email | undefined>(undefined);
  const [forwardEmail, setForwardEmail] = useState<Email | undefined>(undefined);
  const [composePreset, setComposePreset] = useState<{ to?: string; cc?: string; bcc?: string; subject?: string; bodyHtml?: string } | undefined>(undefined);
  const [emailsLoading, setEmailsLoading] = useState(true);
  const [emailConfigured, setEmailConfigured] = useState<{ smtp: boolean; imap: boolean; mailboxAddress: string | null } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMailboxSettings, setShowMailboxSettings] = useState(false);
  const [mailboxSettings, setMailboxSettings] = useState<MailboxSettings | null>(null);
  const [mailboxForm, setMailboxForm] = useState<MailboxFormState>({ ...EMPTY_MAILBOX_FORM });
  const [mailboxSaving, setMailboxSaving] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmationState>(null);
  const autoSyncAttemptedRef = useRef(false);

  const refreshMailboxState = useCallback(async () => {
    try {
      const [status, settings] = await Promise.all([
        getEmailConfigStatus(),
        apiGetMailboxSettings(),
      ]);
      setEmailConfigured({
        smtp: status.smtpConfigured,
        imap: status.imapConfigured,
        mailboxAddress: status.mailboxAddress,
      });
      setMailboxSettings(settings);
      setMailboxForm(mapMailboxSettingsToForm(settings));
    } catch {
      setEmailConfigured({ smtp: false, imap: false, mailboxAddress: null });
      setMailboxSettings(null);
      setMailboxForm({ ...EMPTY_MAILBOX_FORM });
    }
  }, []);

  useEffect(() => {
    void refreshMailboxState();
  }, [refreshMailboxState]);

  const loadLabels = useCallback(async () => {
    try {
      const nextLabels = await apiGetEmailLabels();
      if (Array.isArray(nextLabels) && nextLabels.length > 0) {
        setAvailableLabels(nextLabels.map((label) => ({
          id: label.id,
          name: label.name,
          color: label.color || "#94A3B8",
        })));
      } else {
        setAvailableLabels(DEFAULT_EMAIL_LABELS);
      }
    } catch {
      setAvailableLabels(DEFAULT_EMAIL_LABELS);
    }
  }, []);

  useEffect(() => {
    void loadLabels();
  }, [loadLabels]);

  const patchEmailInState = useCallback((emailId: string, updater: (email: Email) => Email) => {
    setEmails((prev) => prev.map((email) => (email.id === emailId ? updater(email) : email)));
    setActiveEmail((prev) => (prev?.id === emailId ? updater(prev) : prev));
  }, []);

  const mergeEmailResponse = useCallback((response: EmailResponse) => {
    const mapped = mapEmailResponseToEmail(response);

    setEmails((prev) =>
      prev.map((email) =>
        email.id === mapped.id
          ? {
              ...email,
              ...mapped,
              from: { ...email.from, ...mapped.from },
            }
          : email,
      ),
    );

    setActiveEmail((prev) =>
      prev?.id === mapped.id
        ? {
            ...prev,
            ...mapped,
            from: { ...prev.from, ...mapped.from },
          }
        : prev,
    );
  }, []);

  // Fetch emails from API
  const loadEmails = useCallback(async (silent = false) => {
    try {
      if (!silent) setEmailsLoading(true);
      const data = await apiGetEmails();
      const mapped: Email[] = (Array.isArray(data) ? data : []).map((email) => mapEmailResponseToEmail(email as EmailResponse));
      setEmails(mapped);
    } catch (err) {
      console.error('Failed to load emails:', err);
    } finally {
      setEmailsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void loadEmails();
  }, [loadEmails]);

  // Auto-refresh every 30 seconds (silent — no loading spinner)
  useEffect(() => {
    const interval = setInterval(() => {
      void loadEmails(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [loadEmails]);

  // If IMAP is configured but we have no imported emails yet, try one silent sync.
  useEffect(() => {
    if (!emailConfigured?.imap || emailsLoading || emails.length > 0 || autoSyncAttemptedRef.current) {
      return;
    }

    autoSyncAttemptedRef.current = true;
    let cancelled = false;

    const syncMailbox = async () => {
      setIsRefreshing(true);
      try {
        const result = await fetchEmailsNow();
        if (cancelled) return;

        await loadEmails(true);
        if (cancelled || result.fetched <= 0) return;

        toast({
          title: "Mailbox Synced",
          description: `${result.fetched} email(s) imported into Letter Box.`,
        });
      } catch (err) {
        console.error("Initial mailbox sync failed:", err);
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
        }
      }
    };

    void syncMailbox();

    return () => {
      cancelled = true;
    };
  }, [emailConfigured, emailsLoading, emails.length, loadEmails, toast]);

  // Filtered emails
  const filteredEmails = useMemo(() => {
    let result = emails.filter((e) => {
      if (isEmailSnoozed(e)) return false;
      if (selectedFolder === "starred") return e.starred;
      if (selectedFolder === "important") return e.important;
      return e.folder === selectedFolder;
    });

    if (selectedLabelId) {
      result = result.filter((email) => email.labels.includes(selectedLabelId));
    }

    if (attachmentsOnly) {
      result = result.filter((email) => email.hasAttachments);
    }

    if (searchTerm) {
      result = result.filter(
        (e) =>
          e.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.from.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.preview.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return [...result].sort((a, b) => {
      if (unreadFirst && a.read !== b.read) {
        return Number(a.read) - Number(b.read);
      }

      if (starredFirst && a.starred !== b.starred) {
        return Number(b.starred) - Number(a.starred);
      }

      if (sortPreference === "sender") {
        return a.from.name.localeCompare(b.from.name);
      }

      if (sortPreference === "subject") {
        return a.subject.localeCompare(b.subject);
      }

      return (b.sortAt || 0) - (a.sortAt || 0);
    });
  }, [attachmentsOnly, emails, searchTerm, selectedFolder, selectedLabelId, sortPreference, starredFirst, unreadFirst]);

  // Unread count
  const unreadCount = useMemo(() => {
    return emails.filter((e) => !e.read && e.folder === "inbox" && !isEmailSnoozed(e)).length;
  }, [emails]);

  // Folder counts
  const folderCounts = useMemo(() => {
    return folders.map((f) => ({
      ...f,
      count:
        f.id === "inbox"
          ? unreadCount
          : f.id === "starred"
            ? emails.filter((e) => e.starred && !isEmailSnoozed(e)).length
            : f.id === "important"
              ? emails.filter((e) => e.important && !isEmailSnoozed(e)).length
              : emails.filter((e) => e.folder === f.id).length,
    }));
  }, [emails, unreadCount]);

  // Handlers
  const handleSelectEmail = (emailId: string) => {
    setSelectedEmails((prev) =>
      prev.includes(emailId)
        ? prev.filter((id) => id !== emailId)
        : [...prev, emailId]
    );
  };

  const handleSelectAll = () => {
    if (filteredEmails.length === 0 || selectedEmails.length === filteredEmails.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(filteredEmails.map((e) => e.id));
    }
  };

  const handleStarEmail = async (emailId: string) => {
    const email = emails.find((e) => e.id === emailId);
    if (!email) return;

    const newStarred = !email.starred;
    patchEmailInState(emailId, (current) => ({ ...current, starred: newStarred }));
    try {
      const updated = await apiToggleStar(emailId, newStarred);
      mergeEmailResponse(updated);
    } catch {
      patchEmailInState(emailId, (current) => ({ ...current, starred: email.starred }));
    }
  };

  const handleReadStatus = async (emailId: string, isRead: boolean) => {
    const email = emails.find((entry) => entry.id === emailId);
    if (!email) return;

    patchEmailInState(emailId, (current) => ({ ...current, read: isRead }));
    try {
      const updated = await apiUpdateReadStatus(emailId, isRead);
      mergeEmailResponse(updated);
    } catch {
      patchEmailInState(emailId, (current) => ({ ...current, read: email.read }));
    }
  };

  const handleArchiveEmail = async (emailId: string) => {
    const email = emails.find((entry) => entry.id === emailId);
    if (!email) return;

    patchEmailInState(emailId, (current) => ({ ...current, folder: "archive" }));
    if (activeEmail?.id === emailId) {
      setActiveEmail(null);
    }
    try {
      const updated = await apiMoveToFolder(emailId, 'ARCHIVE');
      mergeEmailResponse(updated);
      toast({ title: "Email Archived", description: "The email has been moved to archive." });
    } catch {
      patchEmailInState(emailId, (current) => ({ ...current, folder: email.folder }));
      toast({ title: "Archive Failed", description: "Could not archive the email.", variant: "destructive" });
    }
  };

  const requestDeleteConfirmation = (ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) return;
    setDeleteConfirmation({ ids: uniqueIds, count: uniqueIds.length });
  };

  const handleDeleteEmail = async (emailId: string) => {
    const email = emails.find((entry) => entry.id === emailId);
    if (!email) return;
    const previousActiveEmail = activeEmail;

    if (email.folder === "trash") {
      requestDeleteConfirmation([emailId]);
      return;
    }

    patchEmailInState(emailId, (current) => ({ ...current, folder: "trash" }));
    if (activeEmail?.id === emailId && selectedFolder !== "trash") {
      setActiveEmail(null);
    }

    try {
      const updated = await apiMoveToFolder(emailId, "TRASH");
      mergeEmailResponse(updated);
      toast({
        title: "Moved to Trash",
        description: "The email has been moved to trash.",
      });
    } catch {
      patchEmailInState(emailId, (current) => ({ ...current, folder: email.folder }));
      setActiveEmail(previousActiveEmail);
      toast({
        title: "Delete Failed",
        description: "Could not move the email to trash.",
        variant: "destructive",
      });
    }
  };

  const handleMoveToSpam = async (emailId: string) => {
    const email = emails.find((entry) => entry.id === emailId);
    if (!email) return;

    const targetFolder = email.folder === "spam" ? "inbox" : "spam";
    patchEmailInState(emailId, (current) => ({ ...current, folder: targetFolder }));
    if (activeEmail?.id === emailId && targetFolder !== selectedFolder) {
      setActiveEmail(null);
    }

    try {
      const updated = await apiMoveToFolder(emailId, targetFolder === "spam" ? "SPAM" : "INBOX");
      mergeEmailResponse(updated);
      toast({
        title: targetFolder === "spam" ? "Moved to Spam" : "Moved to Inbox",
        description: targetFolder === "spam"
          ? "The email has been moved to spam."
          : "The email has been removed from spam.",
      });
    } catch {
      patchEmailInState(emailId, (current) => ({ ...current, folder: email.folder }));
      toast({
        title: "Update Failed",
        description: targetFolder === "spam" ? "Could not move the email to spam." : "Could not move the email back to inbox.",
        variant: "destructive",
      });
    }
  };

  const handlePermanentlyDeleteEmail = (emailId: string) => {
    requestDeleteConfirmation([emailId]);
  };

  const confirmDeleteEmails = async () => {
    const ids = deleteConfirmation?.ids || [];
    if (ids.length === 0) return;

    const previousEmails = emails;
    const previousActiveEmail = activeEmail;
    const previousSelectedEmails = selectedEmails;

    setEmails((prev) => prev.filter((email) => !ids.includes(email.id)));
    if (activeEmail && ids.includes(activeEmail.id)) {
      setActiveEmail(null);
    }
    setSelectedEmails((prev) => prev.filter((id) => !ids.includes(id)));
    setDeleteConfirmation(null);

    try {
      await Promise.all(ids.map((id) => apiPermanentlyDeleteEmail(id)));
      toast({
        title: ids.length === 1 ? "Email Deleted" : "Emails Deleted",
        description: ids.length === 1
          ? "The email has been permanently deleted and cannot be recovered."
          : `${ids.length} emails have been permanently deleted and cannot be recovered.`,
      });
    } catch {
      setEmails(previousEmails);
      setActiveEmail(previousActiveEmail);
      setSelectedEmails(previousSelectedEmails);
      toast({
        title: "Delete Failed",
        description: "Could not permanently delete the selected email.",
        variant: "destructive",
      });
      void loadEmails(true);
    }
  };

  const handleBulkAction = async (action: "archive" | "delete" | "read" | "unread" | "spam" | "inbox" | "permanentDelete") => {
    const ids = [...selectedEmails];
    if (ids.length === 0) return;

    if (action === "permanentDelete") {
      requestDeleteConfirmation(ids);
      return;
    }

    if (action === "delete") {
      const selectedEntries = emails.filter((email) => ids.includes(email.id));
      const allInTrash = selectedEntries.length > 0 && selectedEntries.every((email) => email.folder === "trash");

      if (allInTrash) {
        requestDeleteConfirmation(ids);
        return;
      }

      const previousEmails = emails;
      const previousActiveEmail = activeEmail;

      setEmails((prev) => prev.map((email) => (
        ids.includes(email.id)
          ? { ...email, folder: "trash" }
          : email
      )));
      setSelectedEmails([]);
      if (activeEmail && ids.includes(activeEmail.id) && selectedFolder !== "trash") {
        setActiveEmail(null);
      }

      toast({
        title: "Moved to Trash",
        description: `${ids.length} email(s) moved to trash.`,
      });

      try {
        const updatedEmails = await Promise.all(ids.map((id) => apiMoveToFolder(id, "TRASH")));
        updatedEmails.forEach(mergeEmailResponse);
      } catch {
        setEmails(previousEmails);
        setActiveEmail(previousActiveEmail);
        toast({
          title: "Delete Failed",
          description: "Could not move the selected emails to trash.",
          variant: "destructive",
        });
        void loadEmails(true);
      }
      return;
    }

    // Optimistic local update
    setEmails((prev) => prev.map((e) => {
      if (!ids.includes(e.id)) return e;
      switch (action) {
        case "archive":
          return { ...e, folder: "archive" };
        case "spam":
          return { ...e, folder: "spam" };
        case "inbox":
          return { ...e, folder: "inbox" };
        case "read":
          return { ...e, read: true };
        case "unread":
          return { ...e, read: false };
        default:
          return e;
      }
    }));
    setSelectedEmails([]);
    toast({
      title: "Action Completed",
      description: `${ids.length} email(s) updated.`,
    });

    // Persist to backend
    try {
      await Promise.all(ids.map((id) => {
        switch (action) {
          case "archive": return apiMoveToFolder(id, 'ARCHIVE');
          case "spam": return apiMoveToFolder(id, 'SPAM');
          case "inbox": return apiMoveToFolder(id, 'INBOX');
          case "read": return apiUpdateReadStatus(id, true);
          case "unread": return apiUpdateReadStatus(id, false);
        }
      }));
    } catch {
      // If persisting fails, reload to get correct state
      void loadEmails(true);
    }
  };

  const handleBulkStarSelected = async () => {
    const ids = [...selectedEmails];
    if (ids.length === 0) return;

    setEmails((prev) => prev.map((email) => (
      ids.includes(email.id) ? { ...email, starred: true } : email
    )));

    try {
      await Promise.all(ids.map((id) => apiToggleStar(id, true)));
      toast({ title: "Emails Starred", description: `${ids.length} email(s) starred.` });
    } catch {
      void loadEmails(true);
      toast({ title: "Update Failed", description: "Could not star the selected emails.", variant: "destructive" });
    }
  };

  const handleBulkMarkImportant = async () => {
    const ids = [...selectedEmails];
    if (ids.length === 0) return;

    setEmails((prev) => prev.map((email) => (
      ids.includes(email.id) ? { ...email, important: true } : email
    )));

    try {
      await Promise.all(ids.map((id) => apiToggleImportant(id, true)));
      toast({ title: "Emails Updated", description: `${ids.length} email(s) marked as important.` });
    } catch {
      void loadEmails(true);
      toast({ title: "Update Failed", description: "Could not update the selected emails.", variant: "destructive" });
    }
  };

  const handleOpenEmail = async (email: Email) => {
    setActiveEmail(email);
    if (!email.read) {
      patchEmailInState(email.id, (current) => ({ ...current, read: true }));
      try {
        const updated = await apiUpdateReadStatus(email.id, true);
        mergeEmailResponse(updated);
      } catch {
        patchEmailInState(email.id, (current) => ({ ...current, read: email.read }));
      }
    }
  };

  const handleReply = () => {
    if (activeEmail) {
      setComposePreset(undefined);
      setForwardEmail(undefined);
      setReplyToEmail(activeEmail);
      setShowCompose(true);
    }
  };

  const handleReplyAll = () => {
    if (!activeEmail) return;

    const ownAddresses = new Set(
      [emailConfigured?.mailboxAddress, mailboxForm.senderEmail]
        .filter(Boolean)
        .map((email) => String(email).trim().toLowerCase()),
    );

    const toRecipients = [activeEmail.from.email, ...activeEmail.to.map((recipient) => recipient.email)]
      .filter(Boolean)
      .filter((email) => !ownAddresses.has(email.trim().toLowerCase()));
    const uniqueToRecipients = Array.from(new Set(toRecipients));

    const ccRecipients = (activeEmail.cc || [])
      .map((recipient) => recipient.email)
      .filter(Boolean)
      .filter((email) => !ownAddresses.has(email.trim().toLowerCase()) && !uniqueToRecipients.includes(email));

    const quotedReply = plainTextToHtml(
      `\n\nOn ${activeEmail.date} at ${activeEmail.time}, ${activeEmail.from.name} <${activeEmail.from.email}> wrote:\n${htmlToPlainText(activeEmail.body)}`,
    );

    setReplyToEmail(undefined);
    setForwardEmail(undefined);
    setComposePreset({
      to: uniqueToRecipients.join(", "),
      cc: Array.from(new Set(ccRecipients)).join(", "),
      subject: `Re: ${activeEmail.subject}`,
      bodyHtml: quotedReply,
    });
    setShowCompose(true);
  };

  const handleForward = () => {
    if (activeEmail) {
      setComposePreset(undefined);
      setReplyToEmail(undefined);
      setForwardEmail(activeEmail);
      setShowCompose(true);
    }
  };

  const handleToggleImportant = async (emailId: string) => {
    const email = emails.find((entry) => entry.id === emailId);
    if (!email) return;

    const nextImportant = !email.important;
    patchEmailInState(emailId, (current) => ({ ...current, important: nextImportant }));

    try {
      const updated = await apiToggleImportant(emailId, nextImportant);
      mergeEmailResponse(updated);
      toast({
        title: nextImportant ? "Marked Important" : "Importance Removed",
        description: nextImportant ? "The email is now marked as important." : "The email is no longer marked as important.",
      });
    } catch {
      patchEmailInState(emailId, (current) => ({ ...current, important: email.important }));
      toast({ title: "Update Failed", description: "Could not update email importance.", variant: "destructive" });
    }
  };

  const handleToggleLabel = async (emailId: string, labelId: string) => {
    const email = emails.find((entry) => entry.id === emailId);
    if (!email) return;

    const labelIds = email.labels.includes(labelId)
      ? email.labels.filter((id) => id !== labelId)
      : [...email.labels, labelId];

    patchEmailInState(emailId, (current) => ({ ...current, labels: labelIds }));

    try {
      const updated = await apiSetEmailLabels(emailId, labelIds);
      mergeEmailResponse(updated);
    } catch {
      patchEmailInState(emailId, (current) => ({ ...current, labels: email.labels }));
      toast({ title: "Label Update Failed", description: "Could not update email labels.", variant: "destructive" });
    }
  };

  const handleSnoozeEmail = async (emailId: string) => {
    const email = emails.find((entry) => entry.id === emailId);
    if (!email) return;

    const snoozedUntil = getTomorrowMorningIso();
    patchEmailInState(emailId, (current) => ({ ...current, snoozedUntil }));

    if (activeEmail?.id === emailId) {
      setActiveEmail(null);
    }

    try {
      const updated = await apiSnoozeEmail(emailId, snoozedUntil);
      mergeEmailResponse(updated);
      toast({
        title: "Email Snoozed",
        description: "The email will return to your inbox tomorrow morning.",
      });
    } catch {
      patchEmailInState(emailId, (current) => ({ ...current, snoozedUntil: email.snoozedUntil ?? null }));
      toast({ title: "Snooze Failed", description: "Could not snooze the email.", variant: "destructive" });
    }
  };

  const handlePrintEmail = useCallback((email: Email) => {
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!printWindow) {
      toast({ title: "Print Blocked", description: "Please allow pop-ups to print this email.", variant: "destructive" });
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${escapeHtml(email.subject)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            .meta { margin-bottom: 24px; color: #475569; }
            .meta p { margin: 4px 0; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(email.subject)}</h1>
          <div class="meta">
            <p><strong>From:</strong> ${escapeHtml(email.from.name)} &lt;${escapeHtml(email.from.email)}&gt;</p>
            <p><strong>To:</strong> ${escapeHtml(email.to.map((recipient) => recipient.email).join(", "))}</p>
            <p><strong>Date:</strong> ${escapeHtml(`${email.date} ${email.time}`)}</p>
          </div>
          <div>${email.body}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [toast]);

  const handleDownloadEmail = useCallback((email: Email) => {
    const html = `
      <html>
        <head><meta charset="utf-8" /><title>${escapeHtml(email.subject)}</title></head>
        <body>
          <h1>${escapeHtml(email.subject)}</h1>
          <p><strong>From:</strong> ${escapeHtml(email.from.name)} &lt;${escapeHtml(email.from.email)}&gt;</p>
          <p><strong>To:</strong> ${escapeHtml(email.to.map((recipient) => recipient.email).join(", "))}</p>
          <p><strong>Date:</strong> ${escapeHtml(`${email.date} ${email.time}`)}</p>
          <hr />
          <div>${email.body}</div>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${email.subject.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 80) || "email"}.html`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }, []);

  const handleCreateLabel = async () => {
    const name = window.prompt("Enter a new label name");
    if (!name || !name.trim()) return;

    const color = NEW_LABEL_COLORS[availableLabels.length % NEW_LABEL_COLORS.length];

    try {
      const created = await apiCreateEmailLabel({ name: name.trim(), color });
      setAvailableLabels((prev) => [...prev, {
        id: created.id,
        name: created.name,
        color: created.color || color,
      }]);
      toast({ title: "Label Created", description: `${created.name} is now available in Letter Box.` });
    } catch {
      toast({ title: "Label Creation Failed", description: "Could not create the label.", variant: "destructive" });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast({ title: "Refreshing", description: "Fetching new emails from server..." });
    try {
      const result = await fetchEmailsNow();
      await loadEmails(true);
      if (result.fetched > 0) {
        toast({ title: "New Emails", description: `${result.fetched} new email(s) received.` });
      } else {
        toast({ title: "Up to Date", description: "No new emails found." });
      }
    } catch {
      toast({ title: "Refresh Failed", description: "Could not fetch emails.", variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveMailboxSettings = async () => {
    const smtpHost = mailboxForm.smtpHost.trim();
    const smtpUsername = mailboxForm.smtpUsername.trim();
    const senderEmail = mailboxForm.senderEmail.trim();
    const imapHost = mailboxForm.imapHost.trim();
    const imapUsername = mailboxForm.imapUsername.trim();

    if (!smtpHost || !smtpUsername || !senderEmail || !imapHost || !imapUsername) {
      toast({
        title: "Missing Mailbox Fields",
        description: "SMTP and IMAP host, username, and sender email are required.",
        variant: "destructive",
      });
      return;
    }

    setMailboxSaving(true);
    try {
      const smtpPort = Number(mailboxForm.smtpPort || 587);
      const imapPort = Number(mailboxForm.imapPort || 993);
      const payload: UpdateMailboxSettingsPayload = {
        smtp: {
          host: smtpHost,
          port: smtpPort,
          username: smtpUsername,
          password: mailboxForm.smtpPassword,
          encryption: normalizeSmtpEncryption(smtpPort, mailboxForm.smtpEncryption),
          senderName: mailboxForm.senderName.trim(),
          senderEmail,
        },
        imap: {
          host: imapHost,
          port: imapPort,
          username: imapUsername,
          password: mailboxForm.imapPassword,
          encryption: normalizeImapEncryption(imapPort, mailboxForm.imapEncryption),
        },
      };

      const settings = await apiUpdateMailboxSettings(payload);
      setMailboxSettings(settings);
      setMailboxForm(mapMailboxSettingsToForm(settings));
      setEmailConfigured({
        smtp: settings.smtp.configured,
        imap: settings.imap.configured,
        mailboxAddress: settings.mailboxAddress,
      });
      autoSyncAttemptedRef.current = false;
      setShowMailboxSettings(false);
      if (settings.imap.configured) {
        await fetchEmailsNow();
      }
      toast({
        title: "Mailbox Connected",
        description: "Your personal Letter Box settings were saved successfully.",
      });
      await loadEmails(true);
    } catch (err: any) {
      toast({
        title: "Mailbox Save Failed",
        description: err?.response?.data?.message || err?.message || "Could not save mailbox settings.",
        variant: "destructive",
      });
    } finally {
      setMailboxSaving(false);
    }
  };

  // Config guard: show setup prompt if email not configured
  if (emailConfigured && !emailConfigured.smtp && !emailConfigured.imap) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full mx-4"
        >
          <div className="bg-white rounded-2xl card-shadow p-8 text-center">
            <div className="w-16 h-16 bg-[#0891B2]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Settings size={28} className="text-[#0891B2]" />
            </div>
            <h2 className="text-xl font-bold text-[#0F172A] mb-2">Set Up Your Mailbox</h2>
            <p className="text-[#64748B] text-sm mb-6">
              Each employee uses their own mailbox in Letter Box. Connect your personal SMTP and IMAP settings here to send and receive only your own email.
            </p>
            <div className="space-y-3 text-left mb-6">
              <div className="flex items-center gap-3 px-4 py-3 bg-[#FF7B36]/5 rounded-lg border border-[#FF7B36]/20 text-sm text-[#FF7B36]">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>SMTP not configured — cannot send emails</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 bg-[#FF7B36]/5 rounded-lg border border-[#FF7B36]/20 text-sm text-[#FF7B36]">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>IMAP not configured — cannot receive emails</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMailboxSettings(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#0891B2] text-white rounded-xl font-medium text-sm hover:bg-[#0891B2]/90 transition-colors"
            >
              <Settings size={16} />
              Set Up My Mailbox
            </button>
          </div>
        </motion.div>
        <MailboxSettingsDialog
          open={showMailboxSettings}
          onOpenChange={setShowMailboxSettings}
          form={mailboxForm}
          onFormChange={(updater) => setMailboxForm((current) => updater(current))}
          onSave={() => void handleSaveMailboxSettings()}
          saving={mailboxSaving}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">

      <main
        className={cn(
          "flex-1 flex flex-col overflow-hidden transition-all duration-300"
        )}
      >
        {/* Header */}
        <header className="crm-module-header sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[rgba(15,23,42,0.06)]">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Title & Breadcrumb */}
              <div>
                <div className="hidden sm:flex items-center gap-2 text-sm text-[#94A3B8] mb-1">
                  <span>Dashboard</span>
                  <ChevronRight size={14} />
                  <span className="text-[#0891B2] font-medium">Letter Box</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Letter Box</h1>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-3">
                {emailConfigured?.mailboxAddress ? (
                  <Badge variant="outline" className="hidden md:inline-flex border-[rgba(15,23,42,0.08)] bg-white text-[#0F172A]">
                    {emailConfigured.mailboxAddress}
                  </Badge>
                ) : null}

                <Button
                  variant="outline"
                  onClick={() => setShowMailboxSettings(true)}
                  className="hidden sm:inline-flex rounded-md border-[rgba(15,23,42,0.08)] bg-white text-[#0F172A] hover:text-[#0891B2]"
                >
                  <Settings size={16} className="mr-2" />
                  My Mailbox
                </Button>

                <NotificationBell
                  buttonClassName="border-0 bg-white/5 p-2.5 hover:bg-slate-200"
                  iconClassName="text-[#475569]"
                  iconSize={20}
                />

                <div className="flex items-center gap-3 pl-3 border-l border-[rgba(15,23,42,0.06)]">
                  <div className="h-10 w-10 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] font-bold ">
                    SA
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-[#0F172A]">SAdmin</p>
                    <p className="text-xs text-[#94A3B8]">Administrator</p>
                  </div>
                  <ChevronDown size={16} className="text-[#475569]" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Layout */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Folders Sidebar */}
          <aside className="w-64 border-r border-[rgba(15,23,42,0.06)] bg-white p-4 flex flex-col min-h-0 overflow-y-auto">
            {/* Compose Button */}
            <Button
              onClick={() => {
                setReplyToEmail(undefined);
                setForwardEmail(undefined);
                setShowCompose(true);
              }}
              className="w-full h-12 bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md  mb-6"
            >
              <MailPlus size={18} className="mr-2" />
              Compose
            </Button>

            {/* Folders */}
            <nav className="flex-1 space-y-1">
              {folderCounts.map((folder) => (
                <motion.button
                  key={folder.id}
                  whileHover={{ x: 4 }}
                  onClick={() => {
                    setSelectedFolder(folder.id);
                    setActiveEmail(null);
                    setSelectedEmails([]);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-md transition-all",
                    selectedFolder === folder.id
                      ? "bg-[#0891B2]/10 text-[#0891B2]"
                      : "text-[#475569] hover:bg-[#F8FAFC]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <folder.icon
                      size={18}
                      className={selectedFolder === folder.id ? "text-[#0891B2]" : "text-[#475569]"}
                    />
                    <span className="font-medium">{folder.name}</span>
                  </div>
                  {folder.count > 0 && (
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-md text-xs font-semibold",
                        selectedFolder === folder.id
                          ? "bg-[#0891B2] text-white"
                          : folder.id === "inbox" && folder.count > 0
                            ? "bg-[#0891B2] text-white"
                            : "bg-white/5 text-[#94A3B8]"
                      )}
                    >
                      {folder.count}
                    </span>
                  )}
                </motion.button>
              ))}
            </nav>

            {/* Labels */}
            <div className="pt-4 border-t border-[rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[#475569] uppercase tracking-wider">
                  Labels
                </h3>
                <button onClick={() => void handleCreateLabel()} className="p-1 rounded-md hover:bg-white/10">
                  <FolderPlus size={14} className="text-[#475569]" />
                </button>
              </div>
              <div className="space-y-1">
                {availableLabels.map((label) => (
                  <button
                    key={label.id}
                    onClick={() => setSelectedLabelId((current) => current === label.id ? null : label.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                      selectedLabelId === label.id
                        ? "bg-[#0891B2]/10 text-[#0891B2]"
                        : "text-[#475569] hover:bg-[#F8FAFC]",
                    )}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="text-sm">{label.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Storage Info */}
            <div className="pt-4 mt-4 border-t border-[rgba(15,23,42,0.06)]">
              <div className="p-4 rounded-md bg-[#F1F5F9]">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-[#0891B2]" />
                  <span className="text-sm font-semibold text-[#0F172A]">Storage</span>
                </div>
                <p className="text-xs text-[#94A3B8] mb-2">2.4 GB of 15 GB used</p>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#F1F5F9] rounded-full"
                    style={{ width: "16%" }}
                  />
                </div>
              </div>
            </div>
          </aside>

          {/* Email List */}
          <div
            className={cn(
              "flex-1 flex flex-col bg-white border-r border-[rgba(15,23,42,0.06)]",
              activeEmail ? "hidden lg:flex lg:w-[400px] lg:flex-shrink-0" : ""
            )}
          >
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-[rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={
                    selectedEmails.length > 0 &&
                    selectedEmails.length === filteredEmails.length
                  }
                  onCheckedChange={handleSelectAll}
                  className="data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="h-9 w-9 rounded-md"
                >
                  <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                </Button>

                {selectedEmails.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1 pl-2 border-l border-[rgba(15,23,42,0.06)]"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleBulkAction("archive")}
                      className="h-9 w-9 rounded-md"
                    >
                      <Archive size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleBulkAction("delete")}
                      className="h-9 w-9 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md">
                          <MoreHorizontal size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48 rounded-md">
                        <DropdownMenuItem
                          onClick={() => handleBulkAction("read")}
                          className="rounded-md"
                        >
                          <MailOpen size={14} className="mr-2" />
                          Mark as Read
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleBulkAction("unread")}
                          className="rounded-md"
                        >
                          <Mail size={14} className="mr-2" />
                          Mark as Unread
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => void handleBulkStarSelected()} className="rounded-md">
                          <Star size={14} className="mr-2" />
                          Star Selected
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void handleBulkMarkImportant()} className="rounded-md">
                          <Flag size={14} className="mr-2" />
                          Mark Important
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {selectedFolder === "spam" ? (
                          <DropdownMenuItem onClick={() => handleBulkAction("inbox")} className="rounded-md">
                            <Inbox size={14} className="mr-2" />
                            Move to Inbox
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleBulkAction("spam")} className="rounded-md">
                            <AlertCircle size={14} className="mr-2" />
                            Move to Spam
                          </DropdownMenuItem>
                        )}
                        {selectedFolder === "trash" ? (
                          <DropdownMenuItem onClick={() => handleBulkAction("permanentDelete")} className="rounded-md text-red-600 focus:text-red-600">
                            <Trash2 size={14} className="mr-2" />
                            Delete Permanently
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <span className="text-sm text-[#94A3B8] ml-2">
                      {selectedEmails.length} selected
                    </span>
                  </motion.div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search emails..."
                    className="h-9 w-64 pl-9 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/10"
                    >
                      <X size={12} className="text-[#475569]" />
                    </button>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md">
                      <SlidersHorizontal size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-md">
                    <DropdownMenuItem onClick={() => setSortPreference("date")} className="rounded-md">
                      <Clock size={14} className="mr-2" />
                      Sort by Date {sortPreference === "date" ? "✓" : ""}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortPreference("sender")} className="rounded-md">
                      <AtSign size={14} className="mr-2" />
                      Sort by Sender {sortPreference === "sender" ? "✓" : ""}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortPreference("subject")} className="rounded-md">
                      <FileText size={14} className="mr-2" />
                      Sort by Subject {sortPreference === "subject" ? "✓" : ""}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setUnreadFirst((current) => !current)} className="rounded-md">
                      <Mail size={14} className="mr-2" />
                      {unreadFirst ? "Disable Unread First" : "Unread First"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStarredFirst((current) => !current)} className="rounded-md">
                      <Star size={14} className="mr-2" />
                      {starredFirst ? "Disable Starred First" : "Starred First"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setAttachmentsOnly((current) => !current)} className="rounded-md">
                      <Paperclip size={14} className="mr-2" />
                      {attachmentsOnly ? "Show All Emails" : "With Attachments"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Email List */}
            <div className="flex-1 overflow-y-auto">
              {filteredEmails.length > 0 ? (
                <AnimatePresence>
                  {filteredEmails.map((email) => (
                    <EmailListItem
                      key={email.id}
                      email={email}
                      labels={availableLabels}
                      isSelected={selectedEmails.includes(email.id)}
                      isActive={activeEmail?.id === email.id}
                      onSelect={() => handleSelectEmail(email.id)}
                      onClick={() => void handleOpenEmail(email)}
                      onStar={() => handleStarEmail(email.id)}
                      onMarkRead={() => handleReadStatus(email.id, !email.read)}
                      onArchive={() => handleArchiveEmail(email.id)}
                      onDelete={() => handleDeleteEmail(email.id)}
                    />
                  ))}
                </AnimatePresence>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center h-full py-20"
                >
                  <div className="w-20 h-20 rounded-md bg-white/5 flex items-center justify-center mb-4">
                    <Inbox size={40} className="text-[#475569]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
                    {searchTerm ? "No emails found" : "No emails here"}
                  </h3>
                  <p className="text-sm text-[#94A3B8] text-center max-w-xs">
                    {searchTerm
                      ? `No emails match "${searchTerm}". Try a different search.`
                      : `Your ${selectedFolder} is empty.`}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Pagination */}
            {filteredEmails.length > 0 && (
              <div className="flex items-center justify-between p-4 border-t border-[rgba(15,23,42,0.06)]">
                <span className="text-sm text-[#94A3B8]">
                  1-{filteredEmails.length} of {filteredEmails.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md"
                    disabled
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md"
                    disabled
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Email Detail View */}
          <AnimatePresence mode="wait">
            {activeEmail ? (
              <div className="flex-1 bg-white">
                <EmailDetailView
                  email={activeEmail}
                  labels={availableLabels}
                  onClose={() => setActiveEmail(null)}
                  onReply={handleReply}
                  onReplyAll={handleReplyAll}
                  onForward={handleForward}
                  onStar={() => handleStarEmail(activeEmail.id)}
                  onArchive={() => handleArchiveEmail(activeEmail.id)}
                  onDelete={() => handleDeleteEmail(activeEmail.id)}
                  onMoveToSpam={() => handleMoveToSpam(activeEmail.id)}
                  onDeletePermanently={() => handlePermanentlyDeleteEmail(activeEmail.id)}
                  onMarkRead={() => handleReadStatus(activeEmail.id, !activeEmail.read)}
                  onPrint={() => handlePrintEmail(activeEmail)}
                  onDownload={() => handleDownloadEmail(activeEmail)}
                  onToggleLabel={(labelId) => handleToggleLabel(activeEmail.id, labelId)}
                  onToggleImportant={() => handleToggleImportant(activeEmail.id)}
                  onSnooze={() => handleSnoozeEmail(activeEmail.id)}
                />
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hidden lg:flex flex-1 flex-col items-center justify-center bg-[#F8FAFC]"
              >
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-6 rounded-3xl bg-[#F1F5F9] flex items-center justify-center">
                    <Mail size={56} className="text-[#0891B2]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#0F172A] mb-2">
                    Select an email to read
                  </h3>
                  <p className="text-[#94A3B8] max-w-sm">
                    Click on any email from the list to view its contents here.
                  </p>
                  <div className="flex items-center justify-center gap-4 mt-6">
                    <div className="flex items-center gap-2 text-sm text-[#475569]">
                      <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center">
                        <span className="text-xs font-bold">↑↓</span>
                      </div>
                      Navigate
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#475569]">
                      <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center">
                        <span className="text-xs font-bold">R</span>
                      </div>
                      Reply
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#475569]">
                      <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center">
                        <span className="text-xs font-bold">E</span>
                      </div>
                      Archive
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <MailboxSettingsDialog
        open={showMailboxSettings}
        onOpenChange={setShowMailboxSettings}
        form={mailboxForm}
        onFormChange={(updater) => setMailboxForm((current) => updater(current))}
        onSave={() => void handleSaveMailboxSettings()}
        saving={mailboxSaving}
      />

      {/* Compose Email Dialog */}
      <ComposeEmailDialog
        isOpen={showCompose}
        onClose={() => {
          setShowCompose(false);
          setReplyToEmail(undefined);
          setForwardEmail(undefined);
          setComposePreset(undefined);
          void loadEmails();
        }}
        replyTo={replyToEmail}
        forwardEmail={forwardEmail}
        preset={composePreset}
      />

      <AlertDialog open={Boolean(deleteConfirmation)} onOpenChange={(open) => !open && setDeleteConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirmation?.count === 1 ? "Delete this email permanently?" : `Delete ${deleteConfirmation?.count || 0} emails permanently?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmation?.count === 1
                ? "Do you really want to delete this email? It cannot be recovered after this action and will be removed from Inbox, Spam, Trash, and every other folder."
                : `Do you really want to delete these ${deleteConfirmation?.count || 0} emails? They cannot be recovered after this action and will be removed from every folder.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void confirmDeleteEmails();
              }}
              className="bg-[#DC2626] text-white hover:bg-[#B91C1C]"
            >
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LetterBoxPage;
