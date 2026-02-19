// src/pages/LetterBox.tsx

import React, { useState, useMemo } from "react";
import { Sidebar } from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
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
  subject: string;
  preview: string;
  body: string;
  date: string;
  time: string;
  read: boolean;
  starred: boolean;
  important: boolean;
  hasAttachments: boolean;
  attachments?: Attachment[];
  labels: string[];
  folder: string;
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

const labels: EmailLabel[] = [
  { id: "work", name: "Work", color: "#3B82F6" },
  { id: "personal", name: "Personal", color: "#8B5CF6" },
  { id: "clients", name: "Clients", color: "#22D3EE" },
  { id: "finance", name: "Finance", color: "#22C55E" },
  { id: "urgent", name: "Urgent", color: "#EF4444" },
  { id: "social", name: "Social", color: "#EC4899" },
];

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
  switch (type) {
    case "pdf":
      return "📄";
    case "zip":
      return "📦";
    case "figma":
      return "🎨";
    case "image":
      return "🖼️";
    default:
      return "📎";
  }
};

const formatFileSize = (size: string) => size;

// ============================================
// COMPOSE EMAIL DIALOG
// ============================================

const ComposeEmailDialog = ({
  isOpen,
  onClose,
  replyTo,
  forwardEmail,
}: {
  isOpen: boolean;
  onClose: () => void;
  replyTo?: Email;
  forwardEmail?: Email;
}) => {
  const { toast } = useToast();
  const [to, setTo] = useState(replyTo ? replyTo.from.email : "");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(
    replyTo ? `Re: ${replyTo.subject}` : forwardEmail ? `Fwd: ${forwardEmail.subject}` : ""
  );
  const [body, setBody] = useState(
    forwardEmail
      ? `\n\n---------- Forwarded message ----------\nFrom: ${forwardEmail.from.name} <${forwardEmail.from.email}>\nDate: ${forwardEmail.date}\nSubject: ${forwardEmail.subject}\n\n${forwardEmail.preview}`
      : ""
  );
  const [showCc, setShowCc] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleSend = () => {
    if (!to || !subject) {
      toast({
        title: "Missing Fields",
        description: "Please fill in recipient and subject.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Email Sent",
      description: `Your email to ${to} has been sent successfully.`,
    });
    onClose();
  };

  const handleSaveDraft = () => {
    toast({
      title: "Draft Saved",
      description: "Your email has been saved to drafts.",
    });
    onClose();
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
              {!showCc && (
                <button
                  onClick={() => setShowCc(true)}
                  className="text-xs text-[#475569] hover:text-[#0891B2]"
                >
                  Cc/Bcc
                </button>
              )}
            </div>
          </div>

          {/* Cc */}
          {showCc && (
            <div className="flex items-center gap-3">
              <Label className="w-12 text-sm text-[#94A3B8]">Cc:</Label>
              <Input
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@email.com"
                className="flex-1 h-9 border-0 border-b border-[rgba(15,23,42,0.06)] rounded-none px-0 focus-visible:ring-0 focus-visible:border-[#22D3EE]"
              />
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
          <div className="pt-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here..."
              rows={12}
              className="w-full border-0 resize-none focus-visible:ring-0 p-0"
            />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[rgba(15,23,42,0.06)]">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-md text-sm"
                >
                  <Paperclip size={14} className="text-[#94A3B8]" />
                  <span className="text-slate-200">{file.name}</span>
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
                { icon: Bold, label: "Bold" },
                { icon: Italic, label: "Italic" },
                { icon: Underline, label: "Underline" },
                { icon: List, label: "Bullet List" },
                { icon: ListOrdered, label: "Numbered List" },
              ].map((tool) => (
                <Tooltip key={tool.label}>
                  <TooltipTrigger asChild>
                    <button className="p-2 rounded-md hover:bg-slate-200 text-[#94A3B8] transition-colors">
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
                  <button className="p-2 rounded-md hover:bg-slate-200 text-[#94A3B8] transition-colors">
                    <Link2 size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Insert Link</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="p-2 rounded-md hover:bg-slate-200 text-[#94A3B8] transition-colors">
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
                <Button className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md">
                  <Send size={16} className="mr-2" />
                  Send
                  <ChevronDown size={14} className="ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-md">
                <DropdownMenuItem onClick={handleSend} className="rounded-md">
                  <Send size={14} className="mr-2" />
                  Send Now
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-md">
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
  onClose,
  onReply,
  onForward,
  onStar,
  onArchive,
  onDelete,
  onMarkRead,
}: {
  email: Email;
  onClose: () => void;
  onReply: () => void;
  onForward: () => void;
  onStar: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onMarkRead: () => void;
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
                <DropdownMenuItem className="rounded-md">
                  <Printer size={14} className="mr-2" />
                  Print
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-md">
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
                      <DropdownMenuItem key={label.id} className="rounded-md">
                        <span
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: label.color }}
                        />
                        {label.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="rounded-md">
                  <Flag size={14} className="mr-2" />
                  Mark as Important
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-md">
                  <Clock size={14} className="mr-2" />
                  Snooze
                </DropdownMenuItem>
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

const LetterBoxPage = () => {
  const { toast } = useToast();

  // State
  const [collapsed, setCollapsed] = useState(false);
  const [emails, setEmails] = useState<Email[]>(initialEmails);
  const [selectedFolder, setSelectedFolder] = useState("inbox");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [activeEmail, setActiveEmail] = useState<Email | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [replyToEmail, setReplyToEmail] = useState<Email | undefined>(undefined);
  const [forwardEmail, setForwardEmail] = useState<Email | undefined>(undefined);

  // Filtered emails
  const filteredEmails = useMemo(() => {
    let result = emails.filter((e) => {
      if (selectedFolder === "starred") return e.starred;
      if (selectedFolder === "important") return e.important;
      return e.folder === selectedFolder;
    });

    if (searchTerm) {
      result = result.filter(
        (e) =>
          e.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.from.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.preview.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result;
  }, [emails, selectedFolder, searchTerm]);

  // Unread count
  const unreadCount = useMemo(() => {
    return emails.filter((e) => !e.read && e.folder === "inbox").length;
  }, [emails]);

  // Folder counts
  const folderCounts = useMemo(() => {
    return folders.map((f) => ({
      ...f,
      count:
        f.id === "inbox"
          ? unreadCount
          : f.id === "starred"
          ? emails.filter((e) => e.starred).length
          : f.id === "important"
          ? emails.filter((e) => e.important).length
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
    if (selectedEmails.length === filteredEmails.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(filteredEmails.map((e) => e.id));
    }
  };

  const handleStarEmail = (emailId: string) => {
    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, starred: !e.starred } : e))
    );
  };

  const handleMarkRead = (emailId: string) => {
    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, read: !e.read } : e))
    );
  };

  const handleArchiveEmail = (emailId: string) => {
    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, folder: "archive" } : e))
    );
    if (activeEmail?.id === emailId) {
      setActiveEmail(null);
    }
    toast({
      title: "Email Archived",
      description: "The email has been moved to archive.",
    });
  };

  const handleDeleteEmail = (emailId: string) => {
    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, folder: "trash" } : e))
    );
    if (activeEmail?.id === emailId) {
      setActiveEmail(null);
    }
    toast({
      title: "Email Deleted",
      description: "The email has been moved to trash.",
    });
  };

  const handleBulkAction = (action: "archive" | "delete" | "read" | "unread") => {
    setEmails((prev) =>
      prev.map((e) => {
        if (selectedEmails.includes(e.id)) {
          switch (action) {
            case "archive":
              return { ...e, folder: "archive" };
            case "delete":
              return { ...e, folder: "trash" };
            case "read":
              return { ...e, read: true };
            case "unread":
              return { ...e, read: false };
            default:
              return e;
          }
        }
        return e;
      })
    );
    setSelectedEmails([]);
    toast({
      title: "Action Completed",
      description: `${selectedEmails.length} email(s) updated.`,
    });
  };

  const handleOpenEmail = (email: Email) => {
    setActiveEmail(email);
    if (!email.read) {
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? { ...e, read: true } : e))
      );
    }
  };

  const handleReply = () => {
    if (activeEmail) {
      setReplyToEmail(activeEmail);
      setShowCompose(true);
    }
  };

  const handleForward = () => {
    if (activeEmail) {
      setForwardEmail(activeEmail);
      setShowCompose(true);
    }
  };

  const handleRefresh = () => {
    toast({
      title: "Refreshing",
      description: "Checking for new emails...",
    });
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <main
        className={cn(
          "flex-1 transition-all duration-300",
          collapsed ? "ml-0" : "ml-30"
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[rgba(15,23,42,0.06)]">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Title & Breadcrumb */}
              <div>
                <div className="flex items-center gap-2 text-sm text-[#94A3B8] mb-1">
                  <span>Dashboard</span>
                  <ChevronRight size={14} />
                  <span className="text-[#0891B2] font-medium">Letter Box</span>
                </div>
                <h1 className="text-2xl font-bold text-[#0F172A]">Letter Box</h1>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button className="p-2.5 rounded-md bg-white/5 hover:bg-slate-200 transition-colors relative">
                    <Bell size={20} className="text-[#475569]" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 rounded-full text-[#0F172A] text-xs font-bold flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </div>

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
        <div className="flex h-[calc(100vh-89px)]">
          {/* Folders Sidebar */}
          <aside className="w-64 border-r border-[rgba(15,23,42,0.06)] bg-white p-4 flex flex-col">
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
                <button className="p-1 rounded-md hover:bg-white/10">
                  <FolderPlus size={14} className="text-[#475569]" />
                </button>
              </div>
              <div className="space-y-1">
                {labels.map((label) => (
                  <button
                    key={label.id}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[#475569] hover:bg-[#F8FAFC] transition-colors"
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
                  className="h-9 w-9 rounded-md"
                >
                  <RefreshCw size={16} />
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
                        <DropdownMenuItem className="rounded-md">
                          <Star size={14} className="mr-2" />
                          Star Selected
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-md">
                          <Flag size={14} className="mr-2" />
                          Mark Important
                        </DropdownMenuItem>
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
                    <DropdownMenuItem className="rounded-md">
                      <Clock size={14} className="mr-2" />
                      Sort by Date
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-md">
                      <AtSign size={14} className="mr-2" />
                      Sort by Sender
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-md">
                      <FileText size={14} className="mr-2" />
                      Sort by Subject
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="rounded-md">
                      <Mail size={14} className="mr-2" />
                      Unread First
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-md">
                      <Star size={14} className="mr-2" />
                      Starred First
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-md">
                      <Paperclip size={14} className="mr-2" />
                      With Attachments
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
                      isSelected={selectedEmails.includes(email.id)}
                      isActive={activeEmail?.id === email.id}
                      onSelect={() => handleSelectEmail(email.id)}
                      onClick={() => handleOpenEmail(email)}
                      onStar={() => handleStarEmail(email.id)}
                      onMarkRead={() => handleMarkRead(email.id)}
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
                  onClose={() => setActiveEmail(null)}
                  onReply={handleReply}
                  onForward={handleForward}
                  onStar={() => handleStarEmail(activeEmail.id)}
                  onArchive={() => handleArchiveEmail(activeEmail.id)}
                  onDelete={() => handleDeleteEmail(activeEmail.id)}
                  onMarkRead={() => handleMarkRead(activeEmail.id)}
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

      {/* Compose Email Dialog */}
      <ComposeEmailDialog
        isOpen={showCompose}
        onClose={() => {
          setShowCompose(false);
          setReplyToEmail(undefined);
          setForwardEmail(undefined);
        }}
        replyTo={replyToEmail}
        forwardEmail={forwardEmail}
      />
    </div>
  );
};

export default LetterBoxPage;