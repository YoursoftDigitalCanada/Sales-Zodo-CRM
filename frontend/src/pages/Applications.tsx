// src/pages/Applications.tsx

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuCheckboxItem,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isToday, isYesterday, differenceInDays, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import {
  FileText,
  FilePlus,
  FileCheck,
  FileX,
  FileClock,
  FileSearch,
  Files,
  FolderOpen,
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  MoreHorizontal,
  MoreVertical,
  LayoutGrid,
  List,
  Kanban,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  EyeOff,
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
  Calendar as CalendarIcon,
  CalendarDays,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Settings,
  Settings2,
  Tag,
  Tags,
  User,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  UserMinus,
  GraduationCap,
  Award,
  Bookmark,
  BookmarkCheck,
  BookmarkPlus,
  Heart,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  MessageCircle,
  Send,
  Bell,
  BellRing,
  Link as LinkIcon,
  ExternalLink,
  Paperclip,
  Image,
  Video,
  FileIcon,
  File,
  FileUp,
  FileDown,
  Linkedin,
  Github,
  Twitter,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Circle,
  CircleDot,
  Timer,
  Hourglass,
  Zap,
  Sparkles,
  Target,
  Flag,
  Archive,
  ArchiveRestore,
  History,
  RotateCcw,
  Share2,
  Printer,
  SlidersHorizontal,
  Columns,
  GripVertical,
  Move,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelRightClose,
  LayoutDashboard,
  PieChart,
  BarChart3,
  LineChart,
  Activity,
  Workflow,
  GitBranch,
  Merge,
  Split,
  Layers,
  Box,
  Package,
  Inbox,
  SendHorizontal,
  Reply,
  ReplyAll,
  Forward,
  Undo2,
  Redo2,
  Save,
  FolderPlus,
  FolderMinus,
  FolderInput,
  FolderOutput,
  ClipboardList,
  ClipboardCheck,
  ClipboardCopy,
  ListFilter,
  ListOrdered,
  LayoutList,
  Table2,
  Grip,
  Hash,
  AtSign,
  Percent,
  Calculator,
  Binary,
  Code,
  Terminal,
  Database,
  Server,
  Cloud,
  CloudUpload,
  CloudDownload,
  Wifi,
  WifiOff,
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Key,
  Fingerprint,
  Scan,
  QrCode,
  Camera,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

// ============================================
// TYPES & INTERFACES
// ============================================

type ApplicationType = "job" | "client" | "partner" | "vendor" | "grant" | "membership" | "internship" | "contractor";
type ApplicationStatus = "new" | "screening" | "reviewing" | "shortlisted" | "interview" | "assessment" | "offer" | "approved" | "rejected" | "on_hold" | "withdrawn" | "archived";
type Priority = "low" | "medium" | "high" | "urgent" | "critical";
type ViewMode = "grid" | "list" | "kanban" | "timeline";
type SortField = "name" | "date" | "status" | "priority" | "rating" | "score" | "position" | "source";
type SortOrder = "asc" | "desc";

interface Applicant {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobile?: string;
  avatar?: string;
  company?: string;
  position?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  website?: string;
  portfolio?: string;
  dateOfBirth?: Date;
  nationality?: string;
  languages?: string[];
  education?: Education[];
  workHistory?: WorkHistory[];
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: Date;
  endDate?: Date;
  gpa?: number;
  honors?: string;
  current: boolean;
}

interface WorkHistory {
  id: string;
  company: string;
  position: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  current: boolean;
  description?: string;
  achievements?: string[];
}

interface ApplicationDocument {
  id: string;
  name: string;
  type: string;
  category: "resume" | "cover_letter" | "portfolio" | "certificate" | "reference" | "id" | "other";
  size: number;
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
  version: number;
  isVerified: boolean;
}

interface ApplicationNote {
  id: string;
  content: string;
  author: string;
  authorId: string;
  authorAvatar?: string;
  authorRole?: string;
  createdAt: Date;
  updatedAt?: Date;
  isPrivate: boolean;
  isPinned: boolean;
  mentions?: string[];
  attachments?: ApplicationDocument[];
  reactions?: { emoji: string; users: string[] }[];
}

interface ApplicationActivity {
  id: string;
  type: "status_change" | "note_added" | "note_edited" | "document_uploaded" | "document_deleted" | "email_sent" | "email_received" | "call_made" | "call_received" | "interview_scheduled" | "interview_completed" | "interview_cancelled" | "rating_updated" | "score_updated" | "assigned" | "unassigned" | "tagged" | "untagged" | "priority_changed" | "archived" | "restored" | "merged" | "split" | "custom";
  description: string;
  user: string;
  userId: string;
  userAvatar?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  changes?: { field: string; from: any; to: any }[];
}

interface Interview {
  id: string;
  type: "phone" | "video" | "in_person" | "panel" | "technical" | "behavioral" | "final";
  title: string;
  scheduledAt: Date;
  duration: number; // in minutes
  location?: string;
  meetingLink?: string;
  interviewers: { id: string; name: string; avatar?: string; role: string }[];
  status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "rescheduled" | "no_show";
  feedback?: InterviewFeedback[];
  notes?: string;
  recordingUrl?: string;
}

interface InterviewFeedback {
  id: string;
  interviewerId: string;
  interviewerName: string;
  rating: number;
  recommendation: "strong_yes" | "yes" | "neutral" | "no" | "strong_no";
  strengths: string[];
  weaknesses: string[];
  comments: string;
  submittedAt: Date;
}

interface Assessment {
  id: string;
  type: "technical" | "personality" | "cognitive" | "skills" | "custom";
  name: string;
  provider?: string;
  status: "pending" | "in_progress" | "completed" | "expired";
  sentAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
  score?: number;
  maxScore?: number;
  percentile?: number;
  reportUrl?: string;
  details?: Record<string, any>;
}

interface Offer {
  id: string;
  status: "draft" | "pending_approval" | "approved" | "sent" | "viewed" | "accepted" | "declined" | "negotiating" | "expired" | "withdrawn";
  salary: {
    base: number;
    bonus?: number;
    equity?: string;
    currency: string;
  };
  startDate: Date;
  position: string;
  department: string;
  manager: string;
  benefits: string[];
  terms: string;
  expiresAt: Date;
  sentAt?: Date;
  viewedAt?: Date;
  respondedAt?: Date;
  documentUrl?: string;
  signedDocumentUrl?: string;
  negotiationHistory?: { date: Date; note: string; proposedChanges?: Record<string, any> }[];
}

interface EmailThread {
  id: string;
  subject: string;
  messages: EmailMessage[];
  labels: string[];
  isStarred: boolean;
  isRead: boolean;
  lastMessageAt: Date;
}

interface EmailMessage {
  id: string;
  from: { name: string; email: string };
  to: { name: string; email: string }[];
  cc?: { name: string; email: string }[];
  bcc?: { name: string; email: string }[];
  subject: string;
  body: string;
  bodyHtml?: string;
  attachments?: ApplicationDocument[];
  sentAt: Date;
  isIncoming: boolean;
  status: "sent" | "delivered" | "opened" | "clicked" | "bounced" | "failed";
  openedAt?: Date;
  clickedAt?: Date;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  type: "follow_up" | "review" | "call" | "email" | "meeting" | "document" | "custom";
  priority: Priority;
  status: "pending" | "in_progress" | "completed" | "cancelled" | "overdue";
  dueDate: Date;
  assignedTo: string;
  assignedToAvatar?: string;
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
  reminders?: Date[];
}

interface CustomField {
  id: string;
  name: string;
  type: "text" | "number" | "date" | "select" | "multiselect" | "boolean" | "url" | "email" | "phone" | "currency" | "percentage" | "rating" | "file";
  value: any;
  options?: string[];
  isRequired: boolean;
  isVisible: boolean;
  order: number;
}

interface Application {
  id: string;
  referenceNumber: string;
  type: ApplicationType;
  status: ApplicationStatus;
  previousStatus?: ApplicationStatus;
  priority: Priority;
  applicant: Applicant;
  position?: string;
  positionId?: string;
  department?: string;
  departmentId?: string;
  team?: string;
  location?: string;
  workType?: "remote" | "hybrid" | "onsite";
  employmentType?: "full_time" | "part_time" | "contract" | "internship" | "temporary";
  source: string;
  sourceDetails?: string;
  referredBy?: { id: string; name: string; email: string; relationship: string };
  rating: number;
  scores: {
    experience: number;
    skills: number;
    cultural: number;
    technical: number;
    communication: number;
    overall: number;
  };
  documents: ApplicationDocument[];
  notes: ApplicationNote[];
  activities: ApplicationActivity[];
  interviews: Interview[];
  assessments: Assessment[];
  offers: Offer[];
  emailThreads: EmailThread[];
  tasks: Task[];
  tags: string[];
  customFields: CustomField[];
  assignedTo?: string;
  assignedToId?: string;
  assignedToAvatar?: string;
  assignedToEmail?: string;
  collaborators?: { id: string; name: string; avatar?: string; role: string }[];
  submittedAt: Date;
  lastUpdated: Date;
  lastContactedAt?: Date;
  nextFollowUpAt?: Date;
  expectedSalary?: { min: number; max: number; currency: string };
  currentSalary?: { amount: number; currency: string };
  noticePeriod?: string;
  availableFrom?: Date;
  yearsOfExperience?: number;
  skills?: { name: string; level: "beginner" | "intermediate" | "advanced" | "expert"; yearsOfExperience?: number }[];
  certifications?: { name: string; issuer: string; date: Date; expiryDate?: Date; url?: string }[];
  isStarred: boolean;
  isArchived: boolean;
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: Date;
  duplicateOf?: string;
  mergedFrom?: string[];
  gdprConsent: boolean;
  gdprConsentDate?: Date;
  marketingConsent: boolean;
  dataRetentionDate?: Date;
  pipelineStage?: string;
  pipelineStageEnteredAt?: Date;
  daysInCurrentStage?: number;
  totalDaysInPipeline?: number;
  rejectionReason?: string;
  withdrawalReason?: string;
  qualificationQuestions?: { question: string; answer: string; score?: number }[];
  screeningAnswers?: { question: string; answer: string; isDisqualifying?: boolean }[];
  aiSummary?: string;
  aiRecommendation?: string;
  aiMatchScore?: number;
  metadata?: Record<string, any>;
}

interface ApplicationStats {
  total: number;
  new: number;
  screening: number;
  reviewing: number;
  shortlisted: number;
  interview: number;
  assessment: number;
  offer: number;
  approved: number;
  rejected: number;
  onHold: number;
  withdrawn: number;
  archived: number;
  avgProcessingDays: number;
  avgTimeToHire: number;
  conversionRate: number;
  offerAcceptanceRate: number;
  sourceBreakdown: { source: string; count: number; percentage: number }[];
  statusTrend: { date: string; new: number; approved: number; rejected: number }[];
  topSources: { source: string; count: number; conversionRate: number }[];
  pipelineFunnel: { stage: string; count: number; dropoffRate: number }[];
}

interface KanbanColumn {
  id: ApplicationStatus;
  title: string;
  color: string;
  icon: LucideIcon;
  applications: Application[];
  limit?: number;
  isCollapsed?: boolean;
}

interface FilterState {
  search: string;
  types: ApplicationType[];
  statuses: ApplicationStatus[];
  priorities: Priority[];
  sources: string[];
  departments: string[];
  positions: string[];
  assignees: string[];
  tags: string[];
  rating: [number, number];
  score: [number, number];
  dateRange: { from: Date | null; to: Date | null };
  isStarred: boolean | null;
  hasInterview: boolean | null;
  hasOffer: boolean | null;
  isOverdue: boolean | null;
}

interface BulkAction {
  id: string;
  label: string;
  icon: LucideIcon;
  action: (ids: string[]) => void;
  variant?: "default" | "destructive";
  requiresConfirmation?: boolean;
}

interface SavedView {
  id: string;
  name: string;
  description?: string;
  filters: Partial<FilterState>;
  sort: { field: SortField; order: SortOrder };
  viewMode: ViewMode;
  columns?: string[];
  isDefault: boolean;
  isShared: boolean;
  createdBy: string;
  createdAt: Date;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  variables: string[];
  isDefault: boolean;
}

interface Automation {
  id: string;
  name: string;
  trigger: {
    type: "status_change" | "score_threshold" | "days_in_stage" | "tag_added" | "document_uploaded" | "interview_completed" | "custom";
    conditions: Record<string, any>;
  };
  actions: {
    type: "send_email" | "change_status" | "add_tag" | "assign_to" | "create_task" | "notify" | "webhook";
    config: Record<string, any>;
  }[];
  isActive: boolean;
}

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

const applicationTypes: { id: ApplicationType; label: string; icon: LucideIcon; color: string; description: string }[] = [
  { id: "job", label: "Job Application", icon: Briefcase, color: "#3B82F6", description: "Employment application" },
  { id: "internship", label: "Internship", icon: GraduationCap, color: "#8B5CF6", description: "Internship program" },
  { id: "contractor", label: "Contractor", icon: UserCheck, color: "#F59E0B", description: "Contract position" },
  { id: "client", label: "Client Application", icon: Building2, color: "#10B981", description: "Client onboarding" },
  { id: "partner", label: "Partner Application", icon: Users, color: "#EC4899", description: "Partnership request" },
  { id: "vendor", label: "Vendor Application", icon: Package, color: "#F97316", description: "Vendor registration" },
  { id: "grant", label: "Grant Application", icon: Award, color: "#14B8A6", description: "Grant or funding" },
  { id: "membership", label: "Membership", icon: UserPlus, color: "#6366F1", description: "Membership request" },
];

const statusConfig: Record<ApplicationStatus, { label: string; color: string; bgColor: string; icon: LucideIcon; description: string; order: number }> = {
  new: { label: "New", color: "#3B82F6", bgColor: "#EFF6FF", icon: Circle, description: "Just submitted", order: 1 },
  screening: { label: "Screening", color: "#8B5CF6", bgColor: "#F5F3FF", icon: FileSearch, description: "Initial review", order: 2 },
  reviewing: { label: "Reviewing", color: "#F59E0B", bgColor: "#FFFBEB", icon: Eye, description: "Under review", order: 3 },
  shortlisted: { label: "Shortlisted", color: "#10B981", bgColor: "#ECFDF5", icon: BookmarkCheck, description: "Selected for next stage", order: 4 },
  interview: { label: "Interview", color: "#23D3EE", bgColor: "#F0FDFA", icon: CalendarDays, description: "Interview stage", order: 5 },
  assessment: { label: "Assessment", color: "#6366F1", bgColor: "#EEF2FF", icon: ClipboardCheck, description: "Taking assessments", order: 6 },
  offer: { label: "Offer", color: "#EC4899", bgColor: "#FDF2F8", icon: FileCheck, description: "Offer extended", order: 7 },
  approved: { label: "Approved", color: "#22C55E", bgColor: "#F0FDF4", icon: CheckCircle2, description: "Application approved", order: 8 },
  rejected: { label: "Rejected", color: "#EF4444", bgColor: "#FEF2F2", icon: XCircle, description: "Not selected", order: 9 },
  on_hold: { label: "On Hold", color: "#64748B", bgColor: "#F8FAFC", icon: Hourglass, description: "Temporarily paused", order: 10 },
  withdrawn: { label: "Withdrawn", color: "#94A3B8", bgColor: "#F1F5F9", icon: RotateCcw, description: "Applicant withdrew", order: 11 },
  archived: { label: "Archived", color: "#CBD5E1", bgColor: "#F8FAFC", icon: Archive, description: "Archived", order: 12 },
};

const priorityConfig: Record<Priority, { label: string; color: string; bgColor: string; icon: LucideIcon }> = {
  low: { label: "Low", color: "#64748B", bgColor: "#F1F5F9", icon: ChevronDown },
  medium: { label: "Medium", color: "#F59E0B", bgColor: "#FFFBEB", icon: ChevronsUpDown },
  high: { label: "High", color: "#F97316", bgColor: "#FFF7ED", icon: ChevronUp },
  urgent: { label: "Urgent", color: "#EF4444", bgColor: "#FEF2F2", icon: AlertTriangle },
  critical: { label: "Critical", color: "#DC2626", bgColor: "#FEE2E2", icon: AlertCircle },
};

const sources = [
  "LinkedIn",
  "Indeed",
  "Glassdoor",
  "Company Website",
  "Employee Referral",
  "Recruiter",
  "Job Fair",
  "University",
  "Social Media",
  "Direct Application",
  "Headhunter",
  "Agency",
  "Internal Transfer",
  "Rehire",
  "Other",
];

const departments = [
  "Engineering",
  "Product",
  "Design",
  "Marketing",
  "Sales",
  "Customer Success",
  "Human Resources",
  "Finance",
  "Legal",
  "Operations",
  "Data Science",
  "Security",
  "IT",
  "Executive",
];

const defaultColumns = [
  { id: "select", label: "", width: 50, visible: true, sortable: false },
  { id: "starred", label: "", width: 50, visible: true, sortable: false },
  { id: "applicant", label: "Applicant", width: 250, visible: true, sortable: true },
  { id: "position", label: "Position", width: 200, visible: true, sortable: true },
  { id: "type", label: "Type", width: 130, visible: true, sortable: true },
  { id: "status", label: "Status", width: 130, visible: true, sortable: true },
  { id: "priority", label: "Priority", width: 100, visible: true, sortable: true },
  { id: "rating", label: "Rating", width: 150, visible: true, sortable: true },
  { id: "source", label: "Source", width: 120, visible: true, sortable: true },
  { id: "submittedAt", label: "Submitted", width: 120, visible: true, sortable: true },
  { id: "assignedTo", label: "Assigned To", width: 150, visible: true, sortable: true },
  { id: "nextStep", label: "Next Step", width: 150, visible: false, sortable: false },
  { id: "salary", label: "Expected Salary", width: 130, visible: false, sortable: true },
  { id: "experience", label: "Experience", width: 100, visible: false, sortable: true },
  { id: "location", label: "Location", width: 150, visible: false, sortable: true },
  { id: "tags", label: "Tags", width: 200, visible: false, sortable: false },
  { id: "actions", label: "", width: 100, visible: true, sortable: false },
];

// ============================================
// MOCK DATA GENERATION
// ============================================

const generateMockApplications = (): Application[] => {
  const firstNames = ["Alexandra", "Marcus", "Sophia", "James", "Emily", "David", "Rachel", "Michael", "Lisa", "Robert", "Jennifer", "William", "Sarah", "Christopher", "Amanda", "Daniel", "Jessica", "Matthew", "Ashley", "Andrew"];
  const lastNames = ["Chen", "Williams", "Rodriguez", "Thompson", "Nakamura", "Kim", "Green", "Santos", "Wang", "Johnson", "Martinez", "Lee", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas"];
  const companies = ["Tech Innovations Inc.", "Digital Solutions Ltd.", "Creative Agency", "StartupHub", "FinTech Corp", "E-Commerce Plus", "Media Works", "Consulting Group", "HealthTech Solutions", "Energy Corp", "DataDriven Co.", "CloudFirst Systems", "Mobile Apps LLC", "AI Ventures", "Green Energy Inc."];
  const positions = ["Senior Software Engineer", "Product Manager", "UX Designer", "Data Scientist", "Marketing Manager", "Sales Representative", "HR Coordinator", "Financial Analyst", "Customer Success Manager", "DevOps Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer", "QA Engineer", "Technical Lead", "Engineering Manager", "VP of Engineering", "Chief Technology Officer"];
  const locations = ["Toronto, ON", "Vancouver, BC", "Montreal, QC", "Calgary, AB", "Ottawa, ON", "Edmonton, AB", "Winnipeg, MB", "Halifax, NS", "Victoria, BC", "Waterloo, ON"];
  const skills = ["JavaScript", "TypeScript", "React", "Vue.js", "Angular", "Node.js", "Python", "Java", "Go", "Rust", "SQL", "PostgreSQL", "MongoDB", "Redis", "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Figma", "Sketch", "Adobe XD", "Project Management", "Agile", "Scrum", "Data Analysis", "Machine Learning", "Deep Learning", "NLP", "Computer Vision"];

  const applications: Application[] = [];

  for (let i = 0; i < 50; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const statusKeys = Object.keys(statusConfig) as ApplicationStatus[];
    const status = statusKeys[Math.floor(Math.random() * (statusKeys.length - 1))]; // Exclude archived
    const typeKeys = applicationTypes.map(t => t.id);
    const type = typeKeys[Math.floor(Math.random() * typeKeys.length)];
    const priorityKeys = Object.keys(priorityConfig) as Priority[];
    const priority = priorityKeys[Math.floor(Math.random() * priorityKeys.length)];
    const position = positions[Math.floor(Math.random() * positions.length)];
    const department = departments[Math.floor(Math.random() * departments.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const company = companies[Math.floor(Math.random() * companies.length)];
    const submittedDaysAgo = Math.floor(Math.random() * 60);
    const submittedAt = subDays(new Date(), submittedDaysAgo);
    const lastUpdatedDaysAgo = Math.floor(Math.random() * submittedDaysAgo);
    const lastUpdated = subDays(new Date(), lastUpdatedDaysAgo);
    const randomSkills = skills.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 8) + 3);
    const yearsExp = Math.floor(Math.random() * 15) + 1;
    const baseSalary = 60000 + Math.floor(Math.random() * 140000);
    const rating = Math.floor(Math.random() * 3) + 3;
    const overallScore = 50 + Math.floor(Math.random() * 50);

    const applicant: Applicant = {
      id: `applicant_${i + 1}`,
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      phone: `+1 (${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      avatar: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'women' : 'men'}/${(i % 50) + 1}.jpg`,
      company,
      position: positions[Math.floor(Math.random() * positions.length)],
      location,
      city: location.split(", ")[0],
      state: location.split(", ")[1],
      country: "Canada",
      linkedin: `linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
      website: Math.random() > 0.7 ? `${firstName.toLowerCase()}${lastName.toLowerCase()}.dev` : undefined,
      languages: ["English", Math.random() > 0.5 ? "French" : "Spanish"].filter(() => Math.random() > 0.3),
    };

    const documents: ApplicationDocument[] = [
      {
        id: `doc_${i}_resume`,
        name: `${firstName}_${lastName}_Resume.pdf`,
        type: "application/pdf",
        category: "resume",
        size: 180000 + Math.floor(Math.random() * 200000),
        url: "#",
        uploadedAt: submittedAt,
        uploadedBy: applicant.name,
        version: 1,
        isVerified: Math.random() > 0.3,
      },
      {
        id: `doc_${i}_cover`,
        name: `${firstName}_${lastName}_Cover_Letter.pdf`,
        type: "application/pdf",
        category: "cover_letter",
        size: 80000 + Math.floor(Math.random() * 100000),
        url: "#",
        uploadedAt: submittedAt,
        uploadedBy: applicant.name,
        version: 1,
        isVerified: Math.random() > 0.5,
      },
    ];

    if (Math.random() > 0.6) {
      documents.push({
        id: `doc_${i}_portfolio`,
        name: `Portfolio.pdf`,
        type: "application/pdf",
        category: "portfolio",
        size: 500000 + Math.floor(Math.random() * 2000000),
        url: "#",
        uploadedAt: submittedAt,
        uploadedBy: applicant.name,
        version: 1,
        isVerified: false,
      });
    }

    const notes: ApplicationNote[] = [];
    if (Math.random() > 0.3) {
      notes.push({
        id: `note_${i}_1`,
        content: [
          "Strong candidate with relevant experience. Schedule for initial screening.",
          "Impressive portfolio and technical skills. Recommend for technical interview.",
          "Good communication skills demonstrated in initial call. Moving forward.",
          "Background matches role requirements well. Let's proceed with assessment.",
          "Referral from current team member. High priority candidate.",
        ][Math.floor(Math.random() * 5)],
        author: ["Sarah Johnson", "Mike Chen", "Emma Wilson", "John Smith"][Math.floor(Math.random() * 4)],
        authorId: `user_${Math.floor(Math.random() * 4) + 1}`,
        authorAvatar: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'women' : 'men'}/${Math.floor(Math.random() * 30) + 50}.jpg`,
        authorRole: ["HR Manager", "Technical Lead", "Recruiter", "Hiring Manager"][Math.floor(Math.random() * 4)],
        createdAt: subDays(new Date(), Math.floor(Math.random() * submittedDaysAgo)),
        isPrivate: Math.random() > 0.7,
        isPinned: Math.random() > 0.8,
      });
    }

    const activities: ApplicationActivity[] = [
      {
        id: `activity_${i}_1`,
        type: "status_change",
        description: `Application received`,
        user: "System",
        userId: "system",
        timestamp: submittedAt,
      },
    ];

    if (status !== "new") {
      activities.push({
        id: `activity_${i}_2`,
        type: "status_change",
        description: `Status changed to ${statusConfig[status].label}`,
        user: ["Sarah Johnson", "Mike Chen", "Emma Wilson"][Math.floor(Math.random() * 3)],
        userId: `user_${Math.floor(Math.random() * 3) + 1}`,
        timestamp: subDays(new Date(), Math.floor(Math.random() * submittedDaysAgo)),
        changes: [{ field: "status", from: "new", to: status }],
      });
    }

    const interviews: Interview[] = [];
    if (["interview", "assessment", "offer", "approved"].includes(status)) {
      interviews.push({
        id: `interview_${i}_1`,
        type: ["phone", "video", "technical"][Math.floor(Math.random() * 3)] as any,
        title: "Initial Screening Call",
        scheduledAt: status === "interview" ? addDays(new Date(), Math.floor(Math.random() * 7)) : subDays(new Date(), Math.floor(Math.random() * 14)),
        duration: 30,
        meetingLink: "https://meet.google.com/abc-defg-hij",
        interviewers: [
          { id: "user_1", name: "Sarah Johnson", avatar: "https://randomuser.me/api/portraits/women/50.jpg", role: "HR Manager" },
        ],
        status: status === "interview" ? "scheduled" : "completed",
        feedback: status !== "interview" ? [{
          id: `feedback_${i}_1`,
          interviewerId: "user_1",
          interviewerName: "Sarah Johnson",
          rating: 3 + Math.floor(Math.random() * 2),
          recommendation: ["yes", "strong_yes", "neutral"][Math.floor(Math.random() * 3)] as any,
          strengths: randomSkills.slice(0, 2),
          weaknesses: [],
          comments: "Good candidate overall.",
          submittedAt: subDays(new Date(), Math.floor(Math.random() * 7)),
        }] : undefined,
      });
    }

    const assessments: Assessment[] = [];
    if (["assessment", "offer", "approved"].includes(status) && Math.random() > 0.4) {
      assessments.push({
        id: `assessment_${i}_1`,
        type: "technical",
        name: "Technical Skills Assessment",
        provider: "HackerRank",
        status: status === "assessment" ? "pending" : "completed",
        sentAt: subDays(new Date(), Math.floor(Math.random() * 14)),
        completedAt: status !== "assessment" ? subDays(new Date(), Math.floor(Math.random() * 7)) : undefined,
        score: status !== "assessment" ? 70 + Math.floor(Math.random() * 30) : undefined,
        maxScore: 100,
        percentile: status !== "assessment" ? 60 + Math.floor(Math.random() * 35) : undefined,
      });
    }

    const offers: Offer[] = [];
    if (["offer", "approved"].includes(status)) {
      offers.push({
        id: `offer_${i}_1`,
        status: status === "approved" ? "accepted" : "sent",
        salary: {
          base: baseSalary,
          bonus: Math.floor(baseSalary * 0.1),
          currency: "CAD",
        },
        startDate: addDays(new Date(), 30 + Math.floor(Math.random() * 30)),
        position,
        department,
        manager: ["John Smith", "Jane Doe", "Robert Wilson"][Math.floor(Math.random() * 3)],
        benefits: ["Health Insurance", "Dental", "Vision", "401k", "Stock Options", "Remote Work", "Flexible Hours"].slice(0, 3 + Math.floor(Math.random() * 4)),
        terms: "Standard employment terms apply.",
        expiresAt: addDays(new Date(), 7),
        sentAt: subDays(new Date(), Math.floor(Math.random() * 7)),
      });
    }

    const tasks: Task[] = [];
    if (Math.random() > 0.5) {
      tasks.push({
        id: `task_${i}_1`,
        title: ["Follow up with candidate", "Review resume", "Schedule interview", "Send assessment", "Check references"][Math.floor(Math.random() * 5)],
        type: ["follow_up", "review", "call", "email"][Math.floor(Math.random() * 4)] as any,
        priority: priority,
        status: Math.random() > 0.5 ? "pending" : "completed",
        dueDate: addDays(new Date(), Math.floor(Math.random() * 7) - 3),
        assignedTo: ["Sarah Johnson", "Mike Chen", "Emma Wilson"][Math.floor(Math.random() * 3)],
        createdBy: "System",
        createdAt: subDays(new Date(), Math.floor(Math.random() * 14)),
      });
    }

    const assignees = [
      { name: "Sarah Johnson", avatar: "https://randomuser.me/api/portraits/women/50.jpg" },
      { name: "Mike Chen", avatar: "https://randomuser.me/api/portraits/men/51.jpg" },
      { name: "Emma Wilson", avatar: "https://randomuser.me/api/portraits/women/52.jpg" },
      { name: null, avatar: null },
    ];
    const assignee = assignees[Math.floor(Math.random() * assignees.length)];

    applications.push({
      id: `application_${i + 1}`,
      referenceNumber: `APP-2024-${String(i + 1).padStart(5, "0")}`,
      type,
      status,
      priority,
      applicant,
      position,
      positionId: `pos_${Math.floor(Math.random() * 10) + 1}`,
      department,
      departmentId: `dept_${departments.indexOf(department) + 1}`,
      location,
      workType: ["remote", "hybrid", "onsite"][Math.floor(Math.random() * 3)] as any,
      employmentType: type === "internship" ? "internship" : type === "contractor" ? "contract" : "full_time",
      source: sources[Math.floor(Math.random() * sources.length)],
      rating,
      scores: {
        experience: 40 + Math.floor(Math.random() * 60),
        skills: 40 + Math.floor(Math.random() * 60),
        cultural: 40 + Math.floor(Math.random() * 60),
        technical: 40 + Math.floor(Math.random() * 60),
        communication: 40 + Math.floor(Math.random() * 60),
        overall: overallScore,
      },
      documents,
      notes,
      activities,
      interviews,
      assessments,
      offers,
      emailThreads: [],
      tasks,
      tags: randomSkills.slice(0, 3 + Math.floor(Math.random() * 3)),
      customFields: [],
      assignedTo: assignee.name || undefined,
      assignedToAvatar: assignee.avatar || undefined,
      submittedAt,
      lastUpdated,
      expectedSalary: { min: baseSalary - 10000, max: baseSalary + 20000, currency: "CAD" },
      noticePeriod: ["Immediate", "2 Weeks", "1 Month", "2 Months", "3 Months"][Math.floor(Math.random() * 5)],
      yearsOfExperience: yearsExp,
      skills: randomSkills.map(skill => ({
        name: skill,
        level: ["beginner", "intermediate", "advanced", "expert"][Math.floor(Math.random() * 4)] as any,
      })),
      isStarred: Math.random() > 0.8,
      isArchived: false,
      isLocked: false,
      gdprConsent: true,
      gdprConsentDate: submittedAt,
      marketingConsent: Math.random() > 0.3,
      daysInCurrentStage: Math.floor(Math.random() * 14),
      totalDaysInPipeline: submittedDaysAgo,
      aiMatchScore: 60 + Math.floor(Math.random() * 40),
    });
  }

  return applications;
};

const mockApplications = generateMockApplications();

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatCurrency = (amount: number, currency: string = "CAD"): string => {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getRelativeTime = (date: Date): string => {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  const days = differenceInDays(new Date(), date);
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return format(date, "MMM d, yyyy");
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return "#22C55E";
  if (score >= 60) return "#F59E0B";
  if (score >= 40) return "#F97316";
  return "#EF4444";
};

const getScoreLabel = (score: number): string => {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Average";
  return "Below Average";
};

// ============================================
// COMPONENTS
// ============================================

// Stats Card Component
const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  onClick,
  isActive,
  delay = 0,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  color: string;
  trend?: { value: number; label: string };
  onClick?: () => void;
  isActive?: boolean;
  delay?: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative bg-white rounded-2xl p-5 border transition-all overflow-hidden group cursor-pointer",
        isActive 
          ? "border-[#23D3EE] shadow-lg shadow-[#23D3EE]/10 ring-2 ring-[#23D3EE]/20" 
          : "border-slate-200 hover:border-[#23D3EE]/30 hover:shadow-xl hover:shadow-[#23D3EE]/5"
      )}
    >
      <div
        className="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-all"
        style={{ backgroundColor: color }}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-[#0F172A]">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.value >= 0 ? (
                <ArrowUpRight size={14} className="text-green-500" />
              ) : (
                <ArrowDownRight size={14} className="text-red-500" />
              )}
              <span className={cn("text-xs font-semibold", trend.value >= 0 ? "text-green-600" : "text-red-600")}>
                {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-slate-400">{trend.label}</span>
            </div>
          )}
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon size={22} style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
};

// Status Badge Component
const StatusBadge = ({ 
  status, 
  size = "default",
  showIcon = true,
  interactive = false,
  onClick,
}: { 
  status: ApplicationStatus; 
  size?: "xs" | "small" | "default" | "large";
  showIcon?: boolean;
  interactive?: boolean;
  onClick?: () => void;
}) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[10px]",
    small: "px-2 py-0.5 text-xs",
    default: "px-3 py-1 text-sm",
    large: "px-4 py-1.5 text-base",
  };

  const iconSizes = { xs: 10, small: 12, default: 14, large: 16 };

  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full transition-all",
        sizeClasses[size],
        interactive && "cursor-pointer hover:opacity-80"
      )}
      style={{ backgroundColor: config.bgColor, color: config.color }}
    >
      {showIcon && <Icon size={iconSizes[size]} />}
      {config.label}
    </span>
  );
};

// Priority Badge Component
const PriorityBadge = ({ 
  priority, 
  size = "default",
  showLabel = true,
}: { 
  priority: Priority;
  size?: "small" | "default";
  showLabel?: boolean;
}) => {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium rounded",
        size === "small" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
      )}
      style={{ backgroundColor: config.bgColor, color: config.color }}
    >
      <Icon size={size === "small" ? 10 : 12} />
      {showLabel && config.label}
    </span>
  );
};

// Rating Stars Component
const RatingStars = ({ 
  rating, 
  maxRating = 5,
  size = "default",
  onChange, 
  readonly = false,
  showValue = false,
}: { 
  rating: number;
  maxRating?: number;
  size?: "small" | "default" | "large";
  onChange?: (rating: number) => void; 
  readonly?: boolean;
  showValue?: boolean;
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  const starSize = size === "small" ? 14 : size === "large" ? 20 : 16;

  return (
    <div className="flex items-center gap-1">
      <div 
        className="flex items-center gap-0.5"
        onMouseLeave={() => setHoverRating(0)}
      >
        {Array.from({ length: maxRating }, (_, i) => i + 1).map((star) => (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readonly && setHoverRating(star)}
            className={cn(
              "transition-all",
              !readonly && "hover:scale-125 cursor-pointer",
              readonly && "cursor-default"
            )}
          >
            <Star
              size={starSize}
              className={cn(
                "transition-colors",
                (hoverRating || rating) >= star 
                  ? "fill-yellow-400 text-yellow-400" 
                  : "text-slate-200"
              )}
            />
          </button>
        ))}
      </div>
      {showValue && (
        <span className="text-sm text-slate-500 ml-1">({rating}/{maxRating})</span>
      )}
    </div>
  );
};

// Score Circle Component
const ScoreCircle = ({ 
  score, 
  size = "default",
  showLabel = true,
  label,
}: { 
  score: number;
  size?: "small" | "default" | "large";
  showLabel?: boolean;
  label?: string;
}) => {
  const radius = size === "small" ? 16 : size === "large" ? 28 : 22;
  const strokeWidth = size === "small" ? 3 : size === "large" ? 5 : 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);
  const containerSize = (radius + strokeWidth) * 2;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: containerSize, height: containerSize }}>
        <svg className="transform -rotate-90" width={containerSize} height={containerSize}>
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span 
            className={cn(
              "font-bold",
              size === "small" ? "text-xs" : size === "large" ? "text-lg" : "text-sm"
            )}
            style={{ color }}
          >
            {score}
          </span>
        </div>
      </div>
      {showLabel && label && (
        <span className="text-xs text-slate-500">{label}</span>
      )}
    </div>
  );
};

// Score Bar Component
const ScoreBar = ({ 
  label, 
  score, 
  color,
  showPercentage = true,
  animate = true,
}: { 
  label: string; 
  score: number; 
  color?: string;
  showPercentage?: boolean;
  animate?: boolean;
}) => {
  const barColor = color || getScoreColor(score);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        {showPercentage && (
          <span className="font-semibold" style={{ color: barColor }}>{score}%</span>
        )}
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={animate ? { width: 0 } : false}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
        />
      </div>
    </div>
  );
};

// Application Type Badge
const ApplicationTypeBadge = ({ type, size = "default" }: { type: ApplicationType; size?: "small" | "default" }) => {
  const config = applicationTypes.find((t) => t.id === type);
  if (!config) return null;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium rounded",
        size === "small" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
      )}
      style={{ backgroundColor: `${config.color}15`, color: config.color }}
    >
      <Icon size={size === "small" ? 10 : 12} />
      {config.label}
    </span>
  );
};

// Empty State Component
const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
        <Icon size={28} className="text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-[#0F172A] mb-2">{title}</h3>
      <p className="text-slate-500 max-w-md mb-6">{description}</p>
      {action}
    </motion.div>
  );
};

// Loading Skeleton
// Continuing from ApplicationSkeleton...

const ApplicationSkeleton = ({ viewMode }: { viewMode: ViewMode }) => {
  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-slate-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-3 bg-slate-200 rounded w-full" />
              <div className="h-3 bg-slate-200 rounded w-2/3" />
              <div className="flex gap-2">
                <div className="h-6 bg-slate-200 rounded-full w-20" />
                <div className="h-6 bg-slate-200 rounded-full w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <div className="h-4 bg-slate-200 rounded w-1/4 animate-pulse" />
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-slate-50 animate-pulse">
          <div className="w-5 h-5 bg-slate-200 rounded" />
          <div className="w-10 h-10 bg-slate-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-3 bg-slate-200 rounded w-1/4" />
          </div>
          <div className="h-6 bg-slate-200 rounded-full w-20" />
          <div className="h-6 bg-slate-200 rounded-full w-16" />
        </div>
      ))}
    </div>
  );
};

// Filter Panel Component
const FilterPanel = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onClearFilters,
  applications,
}: {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  applications: Application[];
}) => {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const [datePickerOpen, setDatePickerOpen] = useState<"from" | "to" | null>(null);

  const uniqueSources = useMemo(() => [...new Set(applications.map((a) => a.source))], [applications]);
  const uniqueDepartments = useMemo(() => [...new Set(applications.map((a) => a.department).filter(Boolean))], [applications]);
  const uniquePositions = useMemo(() => [...new Set(applications.map((a) => a.position).filter(Boolean))], [applications]);
  const uniqueAssignees = useMemo(() => [...new Set(applications.map((a) => a.assignedTo).filter(Boolean))], [applications]);
  const uniqueTags = useMemo(() => [...new Set(applications.flatMap((a) => a.tags))], [applications]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.types.length > 0) count++;
    if (filters.statuses.length > 0) count++;
    if (filters.priorities.length > 0) count++;
    if (filters.sources.length > 0) count++;
    if (filters.departments.length > 0) count++;
    if (filters.positions.length > 0) count++;
    if (filters.assignees.length > 0) count++;
    if (filters.tags.length > 0) count++;
    if (filters.rating[0] > 0 || filters.rating[1] < 5) count++;
    if (filters.score[0] > 0 || filters.score[1] < 100) count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.isStarred !== null) count++;
    if (filters.hasInterview !== null) count++;
    if (filters.hasOffer !== null) count++;
    if (filters.isOverdue !== null) count++;
    return count;
  }, [filters]);

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleResetFilters = () => {
    const emptyFilters: FilterState = {
      search: "",
      types: [],
      statuses: [],
      priorities: [],
      sources: [],
      departments: [],
      positions: [],
      assignees: [],
      tags: [],
      rating: [0, 5],
      score: [0, 100],
      dateRange: { from: null, to: null },
      isStarred: null,
      hasInterview: null,
      hasOffer: null,
      isOverdue: null,
    };
    setLocalFilters(emptyFilters);
    onClearFilters();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl font-bold text-[#0F172A]">Filters</SheetTitle>
              <SheetDescription>
                {activeFilterCount > 0 ? `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active` : 'Refine your search'}
              </SheetDescription>
            </div>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-slate-500 hover:text-red-500"
              >
                <X size={14} className="mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {/* Application Type */}
            <div>
              <Label className="text-sm font-semibold text-[#0F172A] mb-3 block">Application Type</Label>
              <div className="flex flex-wrap gap-2">
                {applicationTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setLocalFilters((prev) => ({
                        ...prev,
                        types: prev.types.includes(type.id)
                          ? prev.types.filter((t) => t !== type.id)
                          : [...prev.types, type.id],
                      }));
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      localFilters.types.includes(type.id)
                        ? "text-white shadow-md"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                    style={
                      localFilters.types.includes(type.id)
                        ? { backgroundColor: type.color }
                        : undefined
                    }
                  >
                    <type.icon size={14} />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Status */}
            <div>
              <Label className="text-sm font-semibold text-[#0F172A] mb-3 block">Status</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(statusConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setLocalFilters((prev) => ({
                        ...prev,
                        statuses: prev.statuses.includes(key as ApplicationStatus)
                          ? prev.statuses.filter((s) => s !== key)
                          : [...prev.statuses, key as ApplicationStatus],
                      }));
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border",
                      localFilters.statuses.includes(key as ApplicationStatus)
                        ? "border-transparent shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    )}
                    style={
                      localFilters.statuses.includes(key as ApplicationStatus)
                        ? { backgroundColor: config.bgColor, color: config.color, borderColor: config.color }
                        : undefined
                    }
                  >
                    <config.icon size={14} />
                    {config.label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Priority */}
            <div>
              <Label className="text-sm font-semibold text-[#0F172A] mb-3 block">Priority</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(priorityConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setLocalFilters((prev) => ({
                        ...prev,
                        priorities: prev.priorities.includes(key as Priority)
                          ? prev.priorities.filter((p) => p !== key)
                          : [...prev.priorities, key as Priority],
                      }));
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      localFilters.priorities.includes(key as Priority)
                        ? "shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                    style={
                      localFilters.priorities.includes(key as Priority)
                        ? { backgroundColor: config.bgColor, color: config.color }
                        : undefined
                    }
                  >
                    <config.icon size={14} />
                    {config.label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Source */}
            <div>
              <Label className="text-sm font-semibold text-[#0F172A] mb-3 block">Source</Label>
              <div className="flex flex-wrap gap-2">
                {uniqueSources.map((source) => (
                  <button
                    key={source}
                    onClick={() => {
                      setLocalFilters((prev) => ({
                        ...prev,
                        sources: prev.sources.includes(source)
                          ? prev.sources.filter((s) => s !== source)
                          : [...prev.sources, source],
                      }));
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      localFilters.sources.includes(source)
                        ? "bg-[#23D3EE] text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {source}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Department */}
            <div>
              <Label className="text-sm font-semibold text-[#0F172A] mb-3 block">Department</Label>
              <Select
                value={localFilters.departments[0] || ""}
                onValueChange={(value) => {
                  setLocalFilters((prev) => ({
                    ...prev,
                    departments: value ? [value] : [],
                  }));
                }}
              >
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="">All Departments</SelectItem>
                  {uniqueDepartments.map((dept) => (
                    <SelectItem key={dept} value={dept!}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Rating */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold text-[#0F172A]">Rating</Label>
                <span className="text-sm text-slate-500">
                  {localFilters.rating[0]} - {localFilters.rating[1]} stars
                </span>
              </div>
              <Slider
                value={localFilters.rating}
                onValueChange={(value) => {
                  setLocalFilters((prev) => ({
                    ...prev,
                    rating: value as [number, number],
                  }));
                }}
                min={0}
                max={5}
                step={1}
                className="w-full"
              />
            </div>

            <Separator />

            {/* Score */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold text-[#0F172A]">Overall Score</Label>
                <span className="text-sm text-slate-500">
                  {localFilters.score[0]}% - {localFilters.score[1]}%
                </span>
              </div>
              <Slider
                value={localFilters.score}
                onValueChange={(value) => {
                  setLocalFilters((prev) => ({
                    ...prev,
                    score: value as [number, number],
                  }));
                }}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            <Separator />

            {/* Date Range */}
            <div>
              <Label className="text-sm font-semibold text-[#0F172A] mb-3 block">Submitted Date</Label>
              <div className="grid grid-cols-2 gap-3">
                <Popover open={datePickerOpen === "from"} onOpenChange={(open) => setDatePickerOpen(open ? "from" : null)}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal rounded-xl",
                        !localFilters.dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {localFilters.dateRange.from ? format(localFilters.dateRange.from, "MMM d, yyyy") : "From date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                    <Calendar
                      mode="single"
                      selected={localFilters.dateRange.from || undefined}
                      onSelect={(date) => {
                        setLocalFilters((prev) => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, from: date || null },
                        }));
                        setDatePickerOpen(null);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover open={datePickerOpen === "to"} onOpenChange={(open) => setDatePickerOpen(open ? "to" : null)}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal rounded-xl",
                        !localFilters.dateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {localFilters.dateRange.to ? format(localFilters.dateRange.to, "MMM d, yyyy") : "To date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                    <Calendar
                      mode="single"
                      selected={localFilters.dateRange.to || undefined}
                      onSelect={(date) => {
                        setLocalFilters((prev) => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, to: date || null },
                        }));
                        setDatePickerOpen(null);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Separator />

            {/* Quick Filters */}
            <div>
              <Label className="text-sm font-semibold text-[#0F172A] mb-3 block">Quick Filters</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star size={16} className="text-yellow-500" />
                    <span className="text-sm text-slate-600">Starred only</span>
                  </div>
                  <Switch
                    checked={localFilters.isStarred === true}
                    onCheckedChange={(checked) => {
                      setLocalFilters((prev) => ({
                        ...prev,
                        isStarred: checked ? true : null,
                      }));
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className="text-[#23D3EE]" />
                    <span className="text-sm text-slate-600">Has interview scheduled</span>
                  </div>
                  <Switch
                    checked={localFilters.hasInterview === true}
                    onCheckedChange={(checked) => {
                      setLocalFilters((prev) => ({
                        ...prev,
                        hasInterview: checked ? true : null,
                      }));
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck size={16} className="text-green-500" />
                    <span className="text-sm text-slate-600">Has offer</span>
                  </div>
                  <Switch
                    checked={localFilters.hasOffer === true}
                    onCheckedChange={(checked) => {
                      setLocalFilters((prev) => ({
                        ...prev,
                        hasOffer: checked ? true : null,
                      }));
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-500" />
                    <span className="text-sm text-slate-600">Overdue tasks</span>
                  </div>
                  <Switch
                    checked={localFilters.isOverdue === true}
                    onCheckedChange={(checked) => {
                      setLocalFilters((prev) => ({
                        ...prev,
                        isOverdue: checked ? true : null,
                      }));
                    }}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Tags */}
            <div>
              <Label className="text-sm font-semibold text-[#0F172A] mb-3 block">Tags</Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {uniqueTags.slice(0, 20).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setLocalFilters((prev) => ({
                        ...prev,
                        tags: prev.tags.includes(tag)
                          ? prev.tags.filter((t) => t !== tag)
                          : [...prev.tags, tag],
                      }));
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                      localFilters.tags.includes(tag)
                        ? "bg-[#23D3EE] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="p-6 pt-4 border-t border-slate-100">
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyFilters}
              className="flex-1 rounded-xl bg-[#23D3EE] hover:bg-[#14a89a] text-white"
            >
              Apply Filters
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

// Application Card Component (Grid View)
const ApplicationCard = ({
  application,
  isSelected,
  onSelect,
  onView,
  onStatusChange,
  onToggleStar,
  onQuickAction,
  delay = 0,
}: {
  application: Application;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onStatusChange: (status: ApplicationStatus) => void;
  onToggleStar: () => void;
  onQuickAction: (action: string) => void;
  delay?: number;
}) => {
  const typeConfig = applicationTypes.find((t) => t.id === application.type);
  const TypeIcon = typeConfig?.icon || FileText;
  const hasUpcomingInterview = application.interviews.some(
    (i) => i.status === "scheduled" && i.scheduledAt > new Date()
  );
  const hasPendingTasks = application.tasks.some((t) => t.status === "pending" || t.status === "overdue");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className={cn(
        "relative bg-white rounded-2xl border overflow-hidden transition-all group",
        isSelected
          ? "border-[#23D3EE] shadow-lg shadow-[#23D3EE]/10 ring-2 ring-[#23D3EE]/20"
          : "border-slate-200 hover:border-[#23D3EE]/30 hover:shadow-xl hover:shadow-[#23D3EE]/5"
      )}
    >
      {/* Selection checkbox */}
      <div className="absolute top-4 left-4 z-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="data-[state=checked]:bg-[#23D3EE] data-[state=checked]:border-[#23D3EE] bg-white shadow-sm"
        />
      </div>

      {/* AI Match Score */}
      {application.aiMatchScore && (
        <div className="absolute top-4 right-14 z-10">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: `${getScoreColor(application.aiMatchScore)}15`,
                    color: getScoreColor(application.aiMatchScore),
                  }}
                >
                  <Sparkles size={12} />
                  {application.aiMatchScore}%
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>AI Match Score</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Star button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleStar();
        }}
        className="absolute top-4 right-4 z-10 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Star
          size={18}
          className={cn(
            "transition-colors",
            application.isStarred ? "fill-yellow-400 text-yellow-400" : "text-slate-300 hover:text-yellow-400"
          )}
        />
      </button>

      {/* Main content */}
      <div className="p-5 pt-12 cursor-pointer" onClick={onView}>
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar className="h-12 w-12 border-2 border-white shadow-lg">
            <AvatarImage src={application.applicant.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-[#23D3EE] to-[#0F172A] text-white font-semibold">
              {getInitials(application.applicant.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#0F172A] group-hover:text-[#23D3EE] transition-colors truncate">
              {application.applicant.name}
            </h3>
            <p className="text-sm text-slate-500 truncate">{application.position}</p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{application.referenceNumber}</p>
          </div>
        </div>

        {/* Type & Status */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <ApplicationTypeBadge type={application.type} size="small" />
          <StatusBadge status={application.status} size="small" />
          <PriorityBadge priority={application.priority} size="small" />
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Building2 size={14} className="flex-shrink-0" />
            <span className="truncate">{application.applicant.company || "N/A"}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <MapPin size={14} className="flex-shrink-0" />
            <span className="truncate">{application.applicant.location || "N/A"}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Briefcase size={14} className="flex-shrink-0" />
            <span>{application.yearsOfExperience || 0} years exp.</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <DollarSign size={14} className="flex-shrink-0" />
            <span>
              {application.expectedSalary
                ? `${formatCurrency(application.expectedSalary.min)} - ${formatCurrency(application.expectedSalary.max)}`
                : "N/A"}
            </span>
          </div>
        </div>

        {/* Scores */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <RatingStars rating={application.rating} readonly size="small" />
            <Separator orientation="vertical" className="h-4" />
            <ScoreCircle score={application.scores.overall} size="small" />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock size={12} />
            {getRelativeTime(application.submittedAt)}
          </div>
        </div>

        {/* Tags */}
        {application.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {application.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
            {application.tags.length > 4 && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">
                +{application.tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Alerts / Notifications */}
        <div className="flex items-center gap-2">
          {hasUpcomingInterview && (
            <div className="flex items-center gap-1 px-2 py-1 bg-[#23D3EE]/10 text-[#23D3EE] text-xs rounded-lg">
              <CalendarDays size={12} />
              Interview scheduled
            </div>
          )}
          {hasPendingTasks && (
            <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-lg">
              <Clock size={12} />
              Tasks pending
            </div>
          )}
          {application.documents.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg">
              <Paperclip size={12} />
              {application.documents.length}
            </div>
          )}
        </div>
      </div>

      {/* Footer with actions */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        {application.assignedTo ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={application.assignedToAvatar} />
              <AvatarFallback className="text-[10px] bg-slate-200">
                {getInitials(application.assignedTo)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-slate-600">{application.assignedTo}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">Unassigned</span>
        )}

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  onClick={() => onQuickAction("email")}
                >
                  <Mail size={14} className="text-slate-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send Email</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  onClick={() => onQuickAction("schedule")}
                >
                  <CalendarDays size={14} className="text-slate-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Schedule Interview</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                <MoreHorizontal size={14} className="text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              <DropdownMenuItem onClick={onView} className="rounded-lg">
                <Eye size={14} className="mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickAction("edit")} className="rounded-lg">
                <Pencil size={14} className="mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="rounded-lg">
                  <RefreshCw size={14} className="mr-2" /> Change Status
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="rounded-xl max-h-80 overflow-y-auto">
                  {Object.entries(statusConfig)
                    .sort((a, b) => a[1].order - b[1].order)
                    .map(([key, config]) => (
                      <DropdownMenuItem
                        key={key}
                        onClick={() => onStatusChange(key as ApplicationStatus)}
                        className="rounded-lg"
                      >
                        <config.icon size={14} className="mr-2" style={{ color: config.color }} />
                        {config.label}
                        {application.status === key && (
                          <Check size={14} className="ml-auto text-[#23D3EE]" />
                        )}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="rounded-lg">
                  <Flag size={14} className="mr-2" /> Set Priority
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="rounded-xl">
                  {Object.entries(priorityConfig).map(([key, config]) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => onQuickAction(`priority:${key}`)}
                      className="rounded-lg"
                    >
                      <config.icon size={14} className="mr-2" style={{ color: config.color }} />
                      {config.label}
                      {application.priority === key && (
                        <Check size={14} className="ml-auto text-[#23D3EE]" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onQuickAction("assign")} className="rounded-lg">
                <UserPlus size={14} className="mr-2" /> Assign To
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickAction("tag")} className="rounded-lg">
                <Tag size={14} className="mr-2" /> Add Tags
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickAction("note")} className="rounded-lg">
                <MessageSquare size={14} className="mr-2" /> Add Note
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onQuickAction("duplicate")} className="rounded-lg">
                <Copy size={14} className="mr-2" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickAction("archive")} className="rounded-lg">
                <Archive size={14} className="mr-2" /> Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onQuickAction("delete")}
                className="rounded-lg text-red-600 focus:text-red-600"
              >
                <Trash2 size={14} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
};

// Application Table Row Component (List View)
const ApplicationTableRow = ({
  application,
  isSelected,
  onSelect,
  onView,
  onStatusChange,
  onToggleStar,
  onQuickAction,
  columns,
}: {
  application: Application;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onStatusChange: (status: ApplicationStatus) => void;
  onToggleStar: () => void;
  onQuickAction: (action: string) => void;
  columns: typeof defaultColumns;
}) => {
  const typeConfig = applicationTypes.find((t) => t.id === application.type);
  const visibleColumns = columns.filter((c) => c.visible);

  return (
    <TableRow
      className={cn(
        "group hover:bg-slate-50 cursor-pointer transition-colors",
        isSelected && "bg-[#23D3EE]/5"
      )}
    >
      {visibleColumns.map((col) => {
        switch (col.id) {
          case "select":
            return (
              <TableCell key={col.id} className="w-12">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={onSelect}
                  onClick={(e) => e.stopPropagation()}
                  className="data-[state=checked]:bg-[#23D3EE] data-[state=checked]:border-[#23D3EE]"
                />
              </TableCell>
            );
          case "starred":
            return (
              <TableCell key={col.id} className="w-12">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStar();
                  }}
                >
                  <Star
                    size={16}
                    className={cn(
                      "transition-colors",
                      application.isStarred
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-slate-300 hover:text-yellow-400"
                    )}
                  />
                </button>
              </TableCell>
            );
          case "applicant":
            return (
              <TableCell key={col.id} onClick={onView}>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-slate-100">
                    <AvatarImage src={application.applicant.avatar} />
                    <AvatarFallback className="text-sm bg-gradient-to-br from-[#23D3EE] to-[#0F172A] text-white">
                      {getInitials(application.applicant.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[#0F172A] group-hover:text-[#23D3EE] transition-colors">
                        {application.applicant.name}
                      </p>
                      {application.aiMatchScore && application.aiMatchScore >= 80 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Sparkles size={14} className="text-[#23D3EE]" />
                            </TooltipTrigger>
                            <TooltipContent>High AI Match ({application.aiMatchScore}%)</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{application.applicant.email}</p>
                    <p className="text-xs text-slate-400 font-mono">{application.referenceNumber}</p>
                  </div>
                </div>
              </TableCell>
            );
          case "position":
            return (
              <TableCell key={col.id} onClick={onView}>
                <div>
                  <p className="font-medium text-[#0F172A]">{application.position}</p>
                  <p className="text-xs text-slate-500">{application.department}</p>
                </div>
              </TableCell>
            );
          case "type":
            return (
              <TableCell key={col.id}>
                <ApplicationTypeBadge type={application.type} />
              </TableCell>
            );
          case "status":
            return (
              <TableCell key={col.id}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button onClick={(e) => e.stopPropagation()}>
                      <StatusBadge status={application.status} size="small" interactive />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="rounded-xl max-h-80 overflow-y-auto">
                    {Object.entries(statusConfig)
                      .sort((a, b) => a[1].order - b[1].order)
                      .map(([key, config]) => (
                        <DropdownMenuItem
                          key={key}
                          onClick={() => onStatusChange(key as ApplicationStatus)}
                          className="rounded-lg"
                        >
                          <config.icon size={14} className="mr-2" style={{ color: config.color }} />
                          {config.label}
                          {application.status === key && (
                            <Check size={14} className="ml-auto text-[#23D3EE]" />
                          )}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            );
          case "priority":
            return (
              <TableCell key={col.id}>
                <PriorityBadge priority={application.priority} />
              </TableCell>
            );
          case "rating":
            return (
              <TableCell key={col.id}>
                <div className="flex items-center gap-2">
                  <RatingStars rating={application.rating} readonly size="small" />
                  <div className="w-8 h-8">
                    <ScoreCircle score={application.scores.overall} size="small" showLabel={false} />
                  </div>
                </div>
              </TableCell>
            );
          case "source":
            return (
              <TableCell key={col.id}>
                <span className="text-sm text-slate-600">{application.source}</span>
              </TableCell>
            );
          case "submittedAt":
            return (
              <TableCell key={col.id}>
                <div className="text-sm">
                  <p className="text-slate-600">{getRelativeTime(application.submittedAt)}</p>
                  <p className="text-xs text-slate-400">{format(application.submittedAt, "MMM d, yyyy")}</p>
                </div>
              </TableCell>
            );
          case "assignedTo":
            return (
              <TableCell key={col.id}>
                {application.assignedTo ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={application.assignedToAvatar} />
                      <AvatarFallback className="text-[10px] bg-slate-200">
                        {getInitials(application.assignedTo)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-slate-600">{application.assignedTo}</span>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 h-7 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickAction("assign");
                    }}
                  >
                    <UserPlus size={14} className="mr-1" />
                    Assign
                  </Button>
                )}
              </TableCell>
            );
          case "actions":
            return (
              <TableCell key={col.id}>
                <div
                  className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onView}>
                          <Eye size={16} className="text-slate-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View Details</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => onQuickAction("email")}
                        >
                          <Mail size={16} className="text-slate-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Send Email</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                        <MoreVertical size={16} className="text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl">
                      <DropdownMenuItem onClick={onView} className="rounded-lg">
                        <Eye size={14} className="mr-2" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onQuickAction("edit")} className="rounded-lg">
                        <Pencil size={14} className="mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onQuickAction("schedule")} className="rounded-lg">
                        <CalendarDays size={14} className="mr-2" /> Schedule Interview
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onQuickAction("archive")} className="rounded-lg">
                        <Archive size={14} className="mr-2" /> Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onQuickAction("delete")}
                        className="rounded-lg text-red-600"
                      >
                        <Trash2 size={14} className="mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            );
          default:
            return <TableCell key={col.id}>-</TableCell>;
        }
      })}
    </TableRow>
  );
};

// Kanban Card Component
const KanbanCard = ({
  application,
  onView,
  onToggleStar,
  onStatusChange,
}: {
  application: Application;
  onView: () => void;
  onToggleStar: () => void;
  onStatusChange: (status: ApplicationStatus) => void;
}) => {
  const hasUpcomingInterview = application.interviews.some(
    (i) => i.status === "scheduled" && i.scheduledAt > new Date()
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-xl border border-slate-200 p-4 cursor-grab active:cursor-grabbing hover:shadow-lg hover:border-[#23D3EE]/30 transition-all"
      onClick={onView}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-9 w-9 border border-slate-100">
            <AvatarImage src={application.applicant.avatar} />
            <AvatarFallback className="text-xs bg-gradient-to-br from-[#23D3EE] to-[#0F172A] text-white">
              {getInitials(application.applicant.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm text-[#0F172A] line-clamp-1">{application.applicant.name}</p>
            <p className="text-xs text-slate-500 line-clamp-1">{application.position}</p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar();
          }}
          className="flex-shrink-0"
        >
          <Star
            size={14}
            className={cn(
              "transition-colors",
              application.isStarred ? "fill-yellow-400 text-yellow-400" : "text-slate-300 hover:text-yellow-400"
            )}
          />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <PriorityBadge priority={application.priority} size="small" showLabel={false} />
        <span className="text-[10px] text-slate-400 font-mono">{application.referenceNumber}</span>
        {application.aiMatchScore && application.aiMatchScore >= 75 && (
          <div
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{
              backgroundColor: `${getScoreColor(application.aiMatchScore)}15`,
              color: getScoreColor(application.aiMatchScore),
            }}
          >
            <Sparkles size={10} />
            {application.aiMatchScore}%
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <RatingStars rating={application.rating} readonly size="small" />
        <div className="flex items-center gap-1">
          {hasUpcomingInterview && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <CalendarDays size={14} className="text-[#23D3EE]" />
                </TooltipTrigger>
                <TooltipContent>Interview Scheduled</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {application.documents.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-0.5 text-slate-400">
                    <Paperclip size={12} />
                    <span className="text-[10px]">{application.documents.length}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{application.documents.length} Documents</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {hasUpcomingInterview && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-[#23D3EE]">
            <CalendarDays size={12} />
            {format(
              application.interviews.find((i) => i.status === "scheduled")!.scheduledAt,
              "MMM d, h:mm a"
            )}
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        {application.assignedTo ? (
          <Avatar className="h-6 w-6">
            <AvatarImage src={application.assignedToAvatar} />
            <AvatarFallback className="text-[10px] bg-slate-200">
              {getInitials(application.assignedTo)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span className="text-[10px] text-slate-400">Unassigned</span>
        )}
        <span className="text-[10px] text-slate-400">{getRelativeTime(application.submittedAt)}</span>
      </div>
    </motion.div>
  );
};

// Kanban Column Component
const KanbanColumn = ({
  column,
  applications,
  onViewApplication,
  onToggleStar,
  onStatusChange,
  onDragEnd,
}: {
  column: KanbanColumn;
  applications: Application[];
  onViewApplication: (app: Application) => void;
  onToggleStar: (app: Application) => void;
  onStatusChange: (app: Application, status: ApplicationStatus) => void;
  onDragEnd?: (appId: string, newStatus: ApplicationStatus) => void;
}) => {
  const Icon = column.icon;
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "flex-shrink-0 bg-slate-50 rounded-2xl transition-all",
        isCollapsed ? "w-16" : "w-80"
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          "p-4 flex items-center gap-2",
          isCollapsed && "flex-col"
        )}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${column.color}15` }}
        >
          <Icon size={16} style={{ color: column.color }} />
        </div>
        {!isCollapsed && (
          <>
            <h3 className="font-semibold text-[#0F172A] flex-1">{column.title}</h3>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: `${column.color}15`, color: column.color }}
            >
              {applications.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={() => setIsCollapsed(true)}
            >
              <ChevronLeft size={14} className="text-slate-400" />
            </Button>
          </>
        )}
        {isCollapsed && (
          <>
            <span
              className="text-xs font-semibold writing-vertical-lr rotate-180"
              style={{ color: column.color }}
            >
              {column.title}
            </span>
            <span
              className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
              style={{ backgroundColor: `${column.color}15`, color: column.color }}
            >
              {applications.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-lg"
              onClick={() => setIsCollapsed(false)}
            >
              <ChevronRight size={12} className="text-slate-400" />
            </Button>
          </>
        )}
      </div>

      {/* Column Content */}
      {!isCollapsed && (
        <ScrollArea className="h-[calc(100vh-360px)] px-4 pb-4">
          <div className="space-y-3">
            <AnimatePresence>
              {applications.map((app) => (
                <KanbanCard
                  key={app.id}
                  application={app}
                  onView={() => onViewApplication(app)}
                  onToggleStar={() => onToggleStar(app)}
                  onStatusChange={(status) => onStatusChange(app, status)}
                />
              ))}
            </AnimatePresence>
            {applications.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Inbox size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No applications</p>
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

// Application Details Sheet
const ApplicationDetailsSheet = ({
  isOpen,
  onClose,
  application,
  onStatusChange,
  onToggleStar,
  onUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  application: Application | null;
  onStatusChange: (status: ApplicationStatus) => void;
  onToggleStar: () => void;
  onUpdate: (updates: Partial<Application>) => void;
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const { toast } = useToast();

  if (!application) return null;

  const typeConfig = applicationTypes.find((t) => t.id === application.type);
  const TypeIcon = typeConfig?.icon || FileText;

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    toast({
      title: "Note Added",
      description: "Your note has been added successfully.",
    });
    setNewNote("");
    setIsAddingNote(false);
  };

  const upcomingInterview = application.interviews.find(
    (i) => i.status === "scheduled" && i.scheduledAt > new Date()
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl lg:max-w-3xl p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className="p-6 border-b border-slate-100 flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${typeConfig?.color}08, transparent)` }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                <AvatarImage src={application.applicant.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-[#23D3EE] to-[#0F172A] text-white text-xl font-bold">
                  {getInitials(application.applicant.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-[#0F172A]">{application.applicant.name}</h2>
                  <button onClick={onToggleStar}>
                    <Star
                      size={20}
                      className={cn(
                        "transition-colors",
                        application.isStarred
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-slate-300 hover:text-yellow-400"
                      )}
                    />
                  </button>
                  {application.aiMatchScore && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: `${getScoreColor(application.aiMatchScore)}15`,
                              color: getScoreColor(application.aiMatchScore),
                            }}
                          >
                            <Sparkles size={12} />
                            {application.aiMatchScore}% Match
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>AI-calculated match score based on skills and experience</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <p className="text-slate-600 font-medium">{application.position}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400 font-mono">{application.referenceNumber}</span>
                  <span className="text-slate-300">•</span>
                  // Continuing from ApplicationDetailsSheet...

                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: `${typeConfig?.color}15`, color: typeConfig?.color }}
                  >
                    <TypeIcon size={10} />
                    {typeConfig?.label}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-xl h-9 w-9">
                      <Mail size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send Email</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-xl h-9 w-9">
                      <Phone size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Call</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-xl h-9 w-9">
                      <CalendarDays size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Schedule Interview</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-xl h-9 w-9">
                    <MoreHorizontal size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                  <DropdownMenuItem className="rounded-lg">
                    <Pencil size={14} className="mr-2" /> Edit Application
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg">
                    <Copy size={14} className="mr-2" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg">
                    <Share2 size={14} className="mr-2" /> Share
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg">
                    <Printer size={14} className="mr-2" /> Print
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="rounded-lg">
                    <Archive size={14} className="mr-2" /> Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg text-red-600">
                    <Trash2 size={14} className="mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Status and Priority Bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button>
                  <StatusBadge status={application.status} interactive />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-xl max-h-80 overflow-y-auto">
                <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(statusConfig)
                  .sort((a, b) => a[1].order - b[1].order)
                  .map(([key, config]) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => onStatusChange(key as ApplicationStatus)}
                      className="rounded-lg"
                    >
                      <config.icon size={14} className="mr-2" style={{ color: config.color }} />
                      {config.label}
                      {application.status === key && <Check size={14} className="ml-auto text-[#23D3EE]" />}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <PriorityBadge priority={application.priority} />
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-1 text-sm text-slate-500">
              <Clock size={14} />
              <span>Submitted {getRelativeTime(application.submittedAt)}</span>
            </div>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-1 text-sm text-slate-500">
              <Timer size={14} />
              <span>{application.totalDaysInPipeline || 0} days in pipeline</span>
            </div>
          </div>

          {/* Upcoming Interview Alert */}
          {upcomingInterview && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-[#23D3EE]/10 border border-[#23D3EE]/20 rounded-xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#23D3EE]/20 rounded-lg flex items-center justify-center">
                  <CalendarDays size={20} className="text-[#23D3EE]" />
                </div>
                <div>
                  <p className="font-semibold text-[#0F172A]">{upcomingInterview.title}</p>
                  <p className="text-sm text-slate-600">
                    {format(upcomingInterview.scheduledAt, "EEEE, MMMM d 'at' h:mm a")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {upcomingInterview.meetingLink && (
                  <Button size="sm" className="rounded-lg bg-[#23D3EE] hover:bg-[#14a89a]">
                    <Video size={14} className="mr-1" /> Join Meeting
                  </Button>
                )}
                <Button variant="outline" size="sm" className="rounded-lg">
                  Reschedule
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b border-slate-100 flex-shrink-0">
            <TabsList className="h-12 bg-transparent gap-1 p-0">
              {[
                { id: "overview", label: "Overview", icon: LayoutDashboard },
                { id: "documents", label: "Documents", icon: Files, count: application.documents.length },
                { id: "interviews", label: "Interviews", icon: CalendarDays, count: application.interviews.length },
                { id: "assessments", label: "Assessments", icon: ClipboardCheck, count: application.assessments.length },
                { id: "notes", label: "Notes", icon: MessageSquare, count: application.notes.length },
                { id: "activity", label: "Activity", icon: Activity },
                { id: "emails", label: "Emails", icon: Mail, count: application.emailThreads.length },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#23D3EE] data-[state=active]:text-[#23D3EE] rounded-none px-4 gap-2"
                >
                  <tab.icon size={14} />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-full">
                      {tab.count}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            {/* Overview Tab */}
            <TabsContent value="overview" className="p-6 space-y-6 m-0">
              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <ScoreCircle score={application.scores.overall} size="default" showLabel={false} />
                  <p className="text-xs text-slate-500 mt-2">Overall Score</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-[#0F172A]">{application.yearsOfExperience || 0}</p>
                  <p className="text-xs text-slate-500 mt-1">Years Experience</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-[#23D3EE]">
                    {application.expectedSalary ? formatCurrency(application.expectedSalary.min) : "N/A"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Expected Salary</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-[#0F172A]">{application.noticePeriod || "N/A"}</p>
                  <p className="text-xs text-slate-500 mt-1">Notice Period</p>
                </div>
              </div>

              {/* Contact Information */}
              <Card className="rounded-2xl border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                    <User size={16} className="text-[#23D3EE]" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <Mail size={18} className="text-slate-400" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">Email</p>
                      <p className="text-sm font-medium text-[#0F172A] truncate">{application.applicant.email}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto flex-shrink-0">
                      <Copy size={14} className="text-slate-400" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <Phone size={18} className="text-slate-400" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">Phone</p>
                      <p className="text-sm font-medium text-[#0F172A]">{application.applicant.phone || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <MapPin size={18} className="text-slate-400" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">Location</p>
                      <p className="text-sm font-medium text-[#0F172A]">{application.applicant.location || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <Building2 size={18} className="text-slate-400" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">Current Company</p>
                      <p className="text-sm font-medium text-[#0F172A]">{application.applicant.company || "N/A"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Social Links */}
              {(application.applicant.linkedin || application.applicant.website || application.applicant.github) && (
                <Card className="rounded-2xl border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                      <LinkIcon size={16} className="text-[#23D3EE]" />
                      Links & Profiles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {application.applicant.linkedin && (
                        <Button variant="outline" size="sm" className="rounded-lg">
                          <Linkedin size={14} className="mr-2 text-[#0077B5]" />
                          LinkedIn
                          <ExternalLink size={12} className="ml-2 text-slate-400" />
                        </Button>
                      )}
                      {application.applicant.github && (
                        <Button variant="outline" size="sm" className="rounded-lg">
                          <Github size={14} className="mr-2" />
                          GitHub
                          <ExternalLink size={12} className="ml-2 text-slate-400" />
                        </Button>
                      )}
                      {application.applicant.website && (
                        <Button variant="outline" size="sm" className="rounded-lg">
                          <Globe size={14} className="mr-2 text-slate-500" />
                          Website
                          <ExternalLink size={12} className="ml-2 text-slate-400" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Evaluation Scores */}
              <Card className="rounded-2xl border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                    <Target size={16} className="text-[#23D3EE]" />
                    Evaluation Scores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScoreBar label="Experience" score={application.scores.experience} />
                  <ScoreBar label="Technical Skills" score={application.scores.technical} />
                  <ScoreBar label="Skills Match" score={application.scores.skills} />
                  <ScoreBar label="Communication" score={application.scores.communication} />
                  <ScoreBar label="Cultural Fit" score={application.scores.cultural} />
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ScoreCircle score={application.scores.overall} size="large" showLabel={false} />
                      <div>
                        <p className="font-semibold text-[#0F172A]">Overall Score</p>
                        <p className="text-sm text-slate-500">{getScoreLabel(application.scores.overall)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">Rating:</span>
                      <RatingStars
                        rating={application.rating}
                        onChange={(rating) => onUpdate({ rating })}
                        showValue
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Skills */}
              {application.skills && application.skills.length > 0 && (
                <Card className="rounded-2xl border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                      <Zap size={16} className="text-[#23D3EE]" />
                      Skills
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {application.skills.map((skill) => (
                        <TooltipProvider key={skill.name}>
                          <Tooltip>
                            <TooltipTrigger>
                              <span
                                className={cn(
                                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                                  skill.level === "expert"
                                    ? "bg-[#23D3EE]/20 text-[#23D3EE]"
                                    : skill.level === "advanced"
                                    ? "bg-blue-100 text-blue-700"
                                    : skill.level === "intermediate"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                                )}
                              >
                                {skill.name}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="capitalize">{skill.level} level</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tags */}
              <Card className="rounded-2xl border-slate-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                      <Tags size={16} className="text-[#23D3EE]" />
                      Tags
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="rounded-lg text-[#23D3EE]">
                      <Plus size={14} className="mr-1" /> Add Tag
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {application.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full group"
                      >
                        {tag}
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={12} className="text-slate-400 hover:text-red-500" />
                        </button>
                      </span>
                    ))}
                    {application.tags.length === 0 && (
                      <span className="text-sm text-slate-400">No tags added</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Assignment */}
              <Card className="rounded-2xl border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                    <UserCheck size={16} className="text-[#23D3EE]" />
                    Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {application.assignedTo ? (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={application.assignedToAvatar} />
                          <AvatarFallback className="bg-slate-200">
                            {getInitials(application.assignedTo)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-[#0F172A]">{application.assignedTo}</p>
                          <p className="text-xs text-slate-500">Recruiter</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-lg">
                        Reassign
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full rounded-xl">
                      <UserPlus size={16} className="mr-2" />
                      Assign Recruiter
                    </Button>
                  )}

                  {application.collaborators && application.collaborators.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-sm text-slate-500 mb-3">Collaborators</p>
                      <div className="flex items-center gap-2">
                        {application.collaborators.map((collab) => (
                          <TooltipProvider key={collab.id}>
                            <Tooltip>
                              <TooltipTrigger>
                                <Avatar className="h-8 w-8 border-2 border-white">
                                  <AvatarImage src={collab.avatar} />
                                  <AvatarFallback className="text-xs bg-slate-200">
                                    {getInitials(collab.name)}
                                  </AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{collab.name}</p>
                                <p className="text-xs text-slate-400">{collab.role}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                          <Plus size={14} />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Meta Information */}
              <Card className="rounded-2xl border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                    <Info size={16} className="text-[#23D3EE]" />
                    Additional Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">Source</p>
                      <p className="font-medium text-[#0F172A]">{application.source}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Department</p>
                      <p className="font-medium text-[#0F172A]">{application.department || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Work Type</p>
                      <p className="font-medium text-[#0F172A] capitalize">{application.workType || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Employment Type</p>
                      <p className="font-medium text-[#0F172A] capitalize">
                        {application.employmentType?.replace("_", " ") || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Submitted</p>
                      <p className="font-medium text-[#0F172A]">
                        {format(application.submittedAt, "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Last Updated</p>
                      <p className="font-medium text-[#0F172A]">
                        {format(application.lastUpdated, "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="p-6 space-y-4 m-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#0F172A]">
                  Documents ({application.documents.length})
                </h3>
                <Button size="sm" className="rounded-lg bg-[#23D3EE] hover:bg-[#14a89a]">
                  <Upload size={14} className="mr-2" /> Upload
                </Button>
              </div>

              {application.documents.length > 0 ? (
                <div className="space-y-3">
                  {application.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
                    >
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          doc.category === "resume"
                            ? "bg-blue-100"
                            : doc.category === "cover_letter"
                            ? "bg-purple-100"
                            : doc.category === "portfolio"
                            ? "bg-pink-100"
                            : "bg-slate-200"
                        )}
                      >
                        <FileText
                          size={24}
                          className={cn(
                            doc.category === "resume"
                              ? "text-blue-600"
                              : doc.category === "cover_letter"
                              ? "text-purple-600"
                              : doc.category === "portfolio"
                              ? "text-pink-600"
                              : "text-slate-500"
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#0F172A] truncate">{doc.name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="capitalize">{doc.category.replace("_", " ")}</span>
                          <span>•</span>
                          <span>{formatFileSize(doc.size)}</span>
                          <span>•</span>
                          <span>{format(doc.uploadedAt, "MMM d, yyyy")}</span>
                          {doc.isVerified && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 size={12} /> Verified
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                <Eye size={16} className="text-slate-400" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Preview</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                <Download size={16} className="text-slate-400" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Download</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                <Trash2 size={16} className="text-slate-400 hover:text-red-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Files}
                  title="No documents"
                  description="No documents have been uploaded for this application yet."
                  action={
                    <Button className="rounded-xl bg-[#23D3EE] hover:bg-[#14a89a]">
                      <Upload size={16} className="mr-2" /> Upload Document
                    </Button>
                  }
                />
              )}
            </TabsContent>

            {/* Interviews Tab */}
            <TabsContent value="interviews" className="p-6 space-y-4 m-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#0F172A]">
                  Interviews ({application.interviews.length})
                </h3>
                <Button size="sm" className="rounded-lg bg-[#23D3EE] hover:bg-[#14a89a]">
                  <Plus size={14} className="mr-2" /> Schedule Interview
                </Button>
              </div>

              {application.interviews.length > 0 ? (
                <div className="space-y-4">
                  {application.interviews.map((interview) => (
                    <Card key={interview.id} className="rounded-xl border-slate-200 overflow-hidden">
                      <div
                        className={cn(
                          "h-1",
                          interview.status === "scheduled" || interview.status === "confirmed"
                            ? "bg-[#23D3EE]"
                            : interview.status === "completed"
                            ? "bg-green-500"
                            : interview.status === "cancelled"
                            ? "bg-red-500"
                            : "bg-slate-300"
                        )}
                      />
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center",
                                interview.type === "video"
                                  ? "bg-blue-100"
                                  : interview.type === "phone"
                                  ? "bg-green-100"
                                  : interview.type === "technical"
                                  ? "bg-purple-100"
                                  : "bg-slate-100"
                              )}
                            >
                              {interview.type === "video" ? (
                                <Video size={20} className="text-blue-600" />
                              ) : interview.type === "phone" ? (
                                <Phone size={20} className="text-green-600" />
                              ) : interview.type === "technical" ? (
                                <Code size={20} className="text-purple-600" />
                              ) : (
                                <Users size={20} className="text-slate-600" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold text-[#0F172A]">{interview.title}</h4>
                              <p className="text-sm text-slate-500">
                                {format(interview.scheduledAt, "EEEE, MMMM d, yyyy 'at' h:mm a")}
                              </p>
                              <p className="text-xs text-slate-400 mt-1">{interview.duration} minutes</p>
                            </div>
                          </div>
                          <span
                            className={cn(
                              "px-2 py-1 rounded-lg text-xs font-medium capitalize",
                              interview.status === "scheduled" || interview.status === "confirmed"
                                ? "bg-[#23D3EE]/10 text-[#23D3EE]"
                                : interview.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : interview.status === "cancelled"
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {interview.status.replace("_", " ")}
                          </span>
                        </div>

                        {/* Interviewers */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <p className="text-xs text-slate-400 mb-2">Interviewers</p>
                          <div className="flex items-center gap-2">
                            {interview.interviewers.map((interviewer) => (
                              <TooltipProvider key={interviewer.id}>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Avatar className="h-8 w-8 border-2 border-white">
                                      <AvatarImage src={interviewer.avatar} />
                                      <AvatarFallback className="text-xs bg-slate-200">
                                        {getInitials(interviewer.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{interviewer.name}</p>
                                    <p className="text-xs text-slate-400">{interviewer.role}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                          </div>
                        </div>

                        {/* Feedback (if completed) */}
                        {interview.status === "completed" && interview.feedback && interview.feedback.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-xs text-slate-400 mb-2">Feedback</p>
                            {interview.feedback.map((fb) => (
                              <div key={fb.id} className="p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-[#0F172A]">
                                    {fb.interviewerName}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <RatingStars rating={fb.rating} readonly size="small" />
                                    <span
                                      className={cn(
                                        "px-2 py-0.5 rounded text-xs font-medium capitalize",
                                        fb.recommendation === "strong_yes"
                                          ? "bg-green-100 text-green-700"
                                          : fb.recommendation === "yes"
                                          ? "bg-[#23D3EE]/10 text-[#23D3EE]"
                                          : fb.recommendation === "neutral"
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-red-100 text-red-700"
                                      )}
                                    >
                                      {fb.recommendation.replace("_", " ")}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-sm text-slate-600">{fb.comments}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="mt-4 flex items-center gap-2">
                          {interview.meetingLink && interview.status === "scheduled" && (
                            <Button size="sm" className="rounded-lg bg-[#23D3EE] hover:bg-[#14a89a]">
                              <Video size={14} className="mr-1" /> Join
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="rounded-lg">
                            <Pencil size={14} className="mr-1" /> Edit
                          </Button>
                          {interview.status === "scheduled" && (
                            <Button variant="outline" size="sm" className="rounded-lg text-red-600">
                              <X size={14} className="mr-1" /> Cancel
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={CalendarDays}
                  title="No interviews scheduled"
                  description="No interviews have been scheduled for this application yet."
                  action={
                    <Button className="rounded-xl bg-[#23D3EE] hover:bg-[#14a89a]">
                      <Plus size={16} className="mr-2" /> Schedule Interview
                    </Button>
                  }
                />
              )}
            </TabsContent>

            {/* Assessments Tab */}
            <TabsContent value="assessments" className="p-6 space-y-4 m-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#0F172A]">
                  Assessments ({application.assessments.length})
                </h3>
                <Button size="sm" className="rounded-lg bg-[#23D3EE] hover:bg-[#14a89a]">
                  <Plus size={14} className="mr-2" /> Send Assessment
                </Button>
              </div>

              {application.assessments.length > 0 ? (
                <div className="space-y-4">
                  {application.assessments.map((assessment) => (
                    <Card key={assessment.id} className="rounded-xl border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center",
                                assessment.type === "technical"
                                  ? "bg-blue-100"
                                  : assessment.type === "personality"
                                  ? "bg-purple-100"
                                  : assessment.type === "cognitive"
                                  ? "bg-amber-100"
                                  : "bg-slate-100"
                              )}
                            >
                              <ClipboardCheck
                                size={20}
                                className={cn(
                                  assessment.type === "technical"
                                    ? "text-blue-600"
                                    : assessment.type === "personality"
                                    ? "text-purple-600"
                                    : assessment.type === "cognitive"
                                    ? "text-amber-600"
                                    : "text-slate-600"
                                )}
                              />
                            </div>
                            <div>
                              <h4 className="font-semibold text-[#0F172A]">{assessment.name}</h4>
                              {assessment.provider && (
                                <p className="text-sm text-slate-500">via {assessment.provider}</p>
                              )}
                              <p className="text-xs text-slate-400 mt-1">
                                Sent {format(assessment.sentAt, "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          <span
                            className={cn(
                              "px-2 py-1 rounded-lg text-xs font-medium capitalize",
                              assessment.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : assessment.status === "in_progress"
                                ? "bg-blue-100 text-blue-700"
                                : assessment.status === "pending"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                            )}
                          >
                            {assessment.status.replace("_", " ")}
                          </span>
                        </div>

                        {assessment.status === "completed" && assessment.score !== undefined && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-slate-500">Score</p>
                                <p className="text-2xl font-bold" style={{ color: getScoreColor(assessment.score) }}>
                                  {assessment.score}/{assessment.maxScore}
                                </p>
                              </div>
                              {assessment.percentile && (
                                <div className="text-right">
                                  <p className="text-sm text-slate-500">Percentile</p>
                                  <p className="text-2xl font-bold text-[#0F172A]">{assessment.percentile}%</p>
                                </div>
                              )}
                            </div>
                            {assessment.reportUrl && (
                              <Button variant="outline" size="sm" className="mt-3 rounded-lg w-full">
                                <FileText size={14} className="mr-2" /> View Full Report
                              </Button>
                            )}
                          </div>
                        )}

                        {assessment.status === "pending" && (
                          <div className="mt-4 flex items-center gap-2">
                            <Button variant="outline" size="sm" className="rounded-lg">
                              <Send size={14} className="mr-1" /> Resend
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-lg text-red-600">
                              <X size={14} className="mr-1" /> Cancel
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={ClipboardCheck}
                  title="No assessments"
                  description="No assessments have been sent to this candidate yet."
                  action={
                    <Button className="rounded-xl bg-[#23D3EE] hover:bg-[#14a89a]">
                      <Plus size={16} className="mr-2" /> Send Assessment
                    </Button>
                  }
                />
              )}
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="p-6 space-y-4 m-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#0F172A]">Notes ({application.notes.length})</h3>
                <Button
                  size="sm"
                  className="rounded-lg bg-[#23D3EE] hover:bg-[#14a89a]"
                  onClick={() => setIsAddingNote(true)}
                >
                  <Plus size={14} className="mr-2" /> Add Note
                </Button>
              </div>

              {/* Add Note Form */}
              <AnimatePresence>
                {isAddingNote && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-50 rounded-xl p-4 mb-4"
                  >
                    <Textarea
                      placeholder="Write your note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="min-h-[100px] rounded-xl resize-none mb-3"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox id="privateNote" />
                        <Label htmlFor="privateNote" className="text-sm text-slate-600">
                          Private note (only visible to you)
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setIsAddingNote(false)}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-lg bg-[#23D3EE] hover:bg-[#14a89a]"
                          onClick={handleAddNote}
                          disabled={!newNote.trim()}
                        >
                          <Send size={14} className="mr-1" /> Save Note
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {application.notes.length > 0 ? (
                <div className="space-y-4">
                  {application.notes.map((note) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-4 rounded-xl border",
                        note.isPinned ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={note.authorAvatar} />
                            <AvatarFallback className="text-xs bg-slate-200">
                              {getInitials(note.author)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-[#0F172A]">{note.author}</span>
                              {note.authorRole && (
                                <span className="text-xs text-slate-400">{note.authorRole}</span>
                              )}
                              {note.isPrivate && (
                                <span className="flex items-center gap-1 text-xs text-amber-600">
                                  <Lock size={10} /> Private
                                </span>
                              )}
                              {note.isPinned && (
                                <span className="flex items-center gap-1 text-xs text-amber-600">
                                  <Bookmark size={10} /> Pinned
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400">
                              {format(note.createdAt, "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                              <MoreHorizontal size={14} className="text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem className="rounded-lg">
                              <Pencil size={14} className="mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg">
                              <Bookmark size={14} className="mr-2" /> {note.isPinned ? "Unpin" : "Pin"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="rounded-lg text-red-600">
                              <Trash2 size={14} className="mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={MessageSquare}
                  title="No notes"
                  description="No notes have been added to this application yet."
                  action={
                    <Button
                      className="rounded-xl bg-[#23D3EE] hover:bg-[#14a89a]"
                      onClick={() => setIsAddingNote(true)}
                    >
                      <Plus size={16} className="mr-2" /> Add Note
                    </Button>
                  }
                />
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="p-6 m-0">
              <h3 className="font-semibold text-[#0F172A] mb-4">Activity Timeline</h3>
              {application.activities.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" />
                  <div className="space-y-6">
                    {application.activities.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="relative flex items-start gap-4 pl-10"
                      >
                        <div
                          className={cn(
                            "absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white",
                            activity.type === "status_change"
                              ? "bg-blue-100"
                              : activity.type === "note_added"
                              ? "bg-purple-100"
                              : activity.type === "interview_scheduled"
                              ? "bg-[#23D3EE]/20"
                              : activity.type === "document_uploaded"
                              ? "bg-amber-100"
                              : "bg-slate-100"
                          )}
                        >
                          {activity.type === "status_change" ? (
                            <RefreshCw size={14} className="text-blue-600" />
                          ) : activity.type === "note_added" ? (
                            <MessageSquare size={14} className="text-purple-600" />
                          ) : activity.type === "interview_scheduled" ? (
                            <CalendarDays size={14} className="text-[#23D3EE]" />
                          ) : activity.type === "document_uploaded" ? (
                            <Upload size={14} className="text-amber-600" />
                          ) : (
                            <Activity size={14} className="text-slate-600" />
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <p className="text-sm text-[#0F172A]">{activity.description}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                            <span>{activity.user}</span>
                            <span>•</span>
                            <span>{format(activity.timestamp, "MMM d, yyyy 'at' h:mm a")}</span>
                          </div>
                          {activity.changes && activity.changes.length > 0 && (
                            <div className="mt-2 p-2 bg-slate-50 rounded-lg text-xs">
                              {activity.changes.map((change, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="text-slate-500">{change.field}:</span>
                                  <span className="text-red-500 line-through">{String(change.from)}</span>
                                  <ArrowRight size={12} className="text-slate-400" />
                                  <span className="text-green-600">{String(change.to)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={Activity}
                  title="No activity"
                  description="No activity has been recorded for this application yet."
                />
              )}
            </TabsContent>

            {/* Emails Tab */}
            <TabsContent value="emails" className="p-6 space-y-4 m-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#0F172A]">
                  Emails ({application.emailThreads.length})
                </h3>
                <Button size="sm" className="rounded-lg bg-[#23D3EE] hover:bg-[#14a89a]">
                  <Send size={14} className="mr-2" /> Compose Email
                </Button>
              </div>

              {application.emailThreads.length > 0 ? (
                <div className="space-y-3">
                  {application.emailThreads.map((thread) => (
                    <Card
                      key={thread.id}
                      className={cn(
                        "rounded-xl border-slate-200 cursor-pointer hover:border-[#23D3EE]/30 transition-colors",
                        !thread.isRead && "border-l-4 border-l-[#23D3EE]"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {thread.isStarred && <Star size={14} className="fill-yellow-400 text-yellow-400" />}
                              <h4
                                className={cn(
                                  "truncate",
                                  thread.isRead ? "text-slate-600" : "font-semibold text-[#0F172A]"
                                )}
                              >
                                {thread.subject}
                              </h4>
                            </div>
                            <p className="text-sm text-slate-500 truncate">
                              {thread.messages[thread.messages.length - 1]?.body.substring(0, 100)}...
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 ml-4 flex-shrink-0">
                            <span className="text-xs text-slate-400">
                              {getRelativeTime(thread.lastMessageAt)}
                            </span>
                            <div className="flex items-center gap-1">
                              {thread.messages.length > 1 && (
                                <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                                  {thread.messages.length}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Mail}
                  title="No emails"
                  description="No emails have been exchanged with this candidate yet."
                  action={
                    <Button className="rounded-xl bg-[#23D3EE] hover:bg-[#14a89a]">
                      <Send size={16} className="mr-2" /> Compose Email
                    </Button>
                  }
                />
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-xl" onClick={onClose}>
              Close
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-xl">
              <Mail size={16} className="mr-2" /> Send Email
            </Button>
            <Button className="rounded-xl bg-[#23D3EE] hover:bg-[#14a89a]">
              <CalendarDays size={16} className="mr-2" /> Schedule Interview
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// Bulk Actions Bar
const BulkActionsBar = ({
  selectedCount,
  onClearSelection,
  onBulkAction,
}: {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkAction: (action: string) => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="bg-[#0F172A] text-white rounded-2xl px-6 py-3 shadow-2xl flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#23D3EE] rounded-lg flex items-center justify-center font-semibold">
            {selectedCount}
          </div>
          <span className="text-sm">selected</span>
        </div>
        <Separator orientation="vertical" className="h-6 bg-slate-600" />
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg hover:bg-white/10"
                  onClick={() => onBulkAction("email")}
                >
                  <Mail size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send Email</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg hover:bg-white/10"
                  onClick={() => onBulkAction("status")}
                >
                  <RefreshCw size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Change Status</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg hover:bg-white/10"
                  onClick={() => onBulkAction("assign")}
                >
                  <UserPlus size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Assign</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg hover:bg-white/10"
                  onClick={() => onBulkAction("tag")}
                >
                  <Tag size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add Tags</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg hover:bg-white/10"
                  onClick={() => onBulkAction("export")}
                >
                  <Download size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg hover:bg-white/10"
                  onClick={() => onBulkAction("archive")}
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
                  className="h-9 w-9 rounded-lg hover:bg-white/10 text-red-400"
                  onClick={() => onBulkAction("delete")}
                >
                  <Trash2 size={18} />
                </Button>
              </TooltipTrigger>
              // Continuing from BulkActionsBar...

              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Separator orientation="vertical" className="h-6 bg-slate-600" />
        <Button
          variant="ghost"
          size="sm"
          className="rounded-lg hover:bg-white/10 text-slate-300"
          onClick={onClearSelection}
        >
          <X size={16} className="mr-1" /> Clear
        </Button>
      </div>
    </motion.div>
  );
};

// Column Customization Dialog
const ColumnCustomizationDialog = ({
  isOpen,
  onClose,
  columns,
  onColumnsChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  columns: typeof defaultColumns;
  onColumnsChange: (columns: typeof defaultColumns) => void;
}) => {
  const [localColumns, setLocalColumns] = useState(columns);

  const handleToggleColumn = (columnId: string) => {
    setLocalColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const handleApply = () => {
    onColumnsChange(localColumns);
    onClose();
  };

  const handleReset = () => {
    setLocalColumns(defaultColumns);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#0F172A]">Customize Columns</DialogTitle>
          <DialogDescription>
            Select which columns to display in the table view.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {localColumns
                .filter((col) => col.id !== "select" && col.id !== "actions")
                .map((column) => (
                  <div
                    key={column.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical size={16} className="text-slate-400 cursor-grab" />
                      <span className="text-sm font-medium text-[#0F172A]">{column.label}</span>
                    </div>
                    <Switch
                      checked={column.visible}
                      onCheckedChange={() => handleToggleColumn(column.id)}
                    />
                  </div>
                ))}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset} className="rounded-xl">
            Reset to Default
          </Button>
          <Button onClick={handleApply} className="rounded-xl bg-[#23D3EE] hover:bg-[#14a89a]">
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Saved Views Dropdown
const SavedViewsDropdown = ({
  savedViews,
  currentView,
  onSelectView,
  onSaveView,
  onDeleteView,
}: {
  savedViews: SavedView[];
  currentView: string | null;
  onSelectView: (view: SavedView) => void;
  onSaveView: () => void;
  onDeleteView: (viewId: string) => void;
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="rounded-xl gap-2">
          <Bookmark size={16} />
          {currentView ? savedViews.find((v) => v.id === currentView)?.name : "All Applications"}
          <ChevronDown size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 rounded-xl">
        <DropdownMenuLabel>Saved Views</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onSelectView({ id: "", name: "All Applications" } as SavedView)}
          className="rounded-lg"
        >
          <LayoutList size={14} className="mr-2" />
          All Applications
          {!currentView && <Check size={14} className="ml-auto text-[#23D3EE]" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {savedViews.length > 0 ? (
          savedViews.map((view) => (
            <DropdownMenuItem
              key={view.id}
              onClick={() => onSelectView(view)}
              className="rounded-lg group"
            >
              <Bookmark size={14} className="mr-2" />
              <span className="flex-1">{view.name}</span>
              {currentView === view.id && <Check size={14} className="ml-auto text-[#23D3EE]" />}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteView(view.id);
                }}
                className="opacity-0 group-hover:opacity-100 ml-2"
              >
                <X size={14} className="text-slate-400 hover:text-red-500" />
              </button>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="px-2 py-4 text-center text-sm text-slate-400">
            No saved views yet
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSaveView} className="rounded-lg text-[#23D3EE]">
          <Plus size={14} className="mr-2" />
          Save Current View
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Quick Date Filter
const QuickDateFilter = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const options = [
    { id: "all", label: "All Time" },
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" },
    { id: "quarter", label: "This Quarter" },
    { id: "year", label: "This Year" },
  ];

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[140px] rounded-xl">
        <CalendarIcon size={14} className="mr-2 text-slate-400" />
        <SelectValue placeholder="Date Range" />
      </SelectTrigger>
      <SelectContent className="rounded-xl">
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id} className="rounded-lg">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// ============================================
// MAIN APPLICATIONS COMPONENT
// ============================================

const Applications = () => {
  // State Management
  const [applications, setApplications] = useState<Application[]>(mockApplications);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set());
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
  const [columns, setColumns] = useState(defaultColumns);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [quickDateFilter, setQuickDateFilter] = useState("all");
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [currentView, setCurrentView] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    types: [],
    statuses: [],
    priorities: [],
    sources: [],
    departments: [],
    positions: [],
    assignees: [],
    tags: [],
    rating: [0, 5],
    score: [0, 100],
    dateRange: { from: null, to: null },
    isStarred: null,
    hasInterview: null,
    hasOffer: null,
    isOverdue: null,
  });

  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "a" && selectedApplications.size > 0) {
        e.preventDefault();
        setSelectedApplications(new Set(filteredApplications.map((a) => a.id)));
      }
      if (e.key === "Escape") {
        setSelectedApplications(new Set());
        setIsDetailsOpen(false);
        setIsFilterPanelOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedApplications]);

  // Filter applications
  const filteredApplications = useMemo(() => {
    let result = [...applications];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (app) =>
          app.applicant.name.toLowerCase().includes(searchLower) ||
          app.applicant.email.toLowerCase().includes(searchLower) ||
          app.referenceNumber.toLowerCase().includes(searchLower) ||
          app.position?.toLowerCase().includes(searchLower) ||
          app.department?.toLowerCase().includes(searchLower) ||
          app.tags.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    // Type filter
    if (filters.types.length > 0) {
      result = result.filter((app) => filters.types.includes(app.type));
    }

    // Status filter
    if (filters.statuses.length > 0) {
      result = result.filter((app) => filters.statuses.includes(app.status));
    }

    // Quick status filter
    if (statusFilter !== "all") {
      result = result.filter((app) => app.status === statusFilter);
    }

    // Priority filter
    if (filters.priorities.length > 0) {
      result = result.filter((app) => filters.priorities.includes(app.priority));
    }

    // Source filter
    if (filters.sources.length > 0) {
      result = result.filter((app) => filters.sources.includes(app.source));
    }

    // Department filter
    if (filters.departments.length > 0) {
      result = result.filter((app) => app.department && filters.departments.includes(app.department));
    }

    // Assignee filter
    if (filters.assignees.length > 0) {
      result = result.filter((app) => app.assignedTo && filters.assignees.includes(app.assignedTo));
    }

    // Tags filter
    if (filters.tags.length > 0) {
      result = result.filter((app) => filters.tags.some((tag) => app.tags.includes(tag)));
    }

    // Rating filter
    if (filters.rating[0] > 0 || filters.rating[1] < 5) {
      result = result.filter(
        (app) => app.rating >= filters.rating[0] && app.rating <= filters.rating[1]
      );
    }

    // Score filter
    if (filters.score[0] > 0 || filters.score[1] < 100) {
      result = result.filter(
        (app) =>
          app.scores.overall >= filters.score[0] && app.scores.overall <= filters.score[1]
      );
    }

    // Date range filter
    if (filters.dateRange.from || filters.dateRange.to) {
      result = result.filter((app) => {
        const date = app.submittedAt;
        if (filters.dateRange.from && date < filters.dateRange.from) return false;
        if (filters.dateRange.to && date > filters.dateRange.to) return false;
        return true;
      });
    }

    // Quick date filter
    if (quickDateFilter !== "all") {
      const now = new Date();
      result = result.filter((app) => {
        const date = app.submittedAt;
        switch (quickDateFilter) {
          case "today":
            return isToday(date);
          case "yesterday":
            return isYesterday(date);
          case "week":
            return isWithinInterval(date, { start: startOfWeek(now), end: endOfWeek(now) });
          case "month":
            return isWithinInterval(date, { start: startOfMonth(now), end: endOfMonth(now) });
          case "quarter":
            return differenceInDays(now, date) <= 90;
          case "year":
            return differenceInDays(now, date) <= 365;
          default:
            return true;
        }
      });
    }

    // Quick filters
    if (filters.isStarred === true) {
      result = result.filter((app) => app.isStarred);
    }
    if (filters.hasInterview === true) {
      result = result.filter((app) =>
        app.interviews.some((i) => i.status === "scheduled" && i.scheduledAt > new Date())
      );
    }
    if (filters.hasOffer === true) {
      result = result.filter((app) => app.offers.length > 0);
    }
    if (filters.isOverdue === true) {
      result = result.filter((app) =>
        app.tasks.some((t) => t.status === "pending" && t.dueDate < new Date())
      );
    }

    // Exclude archived
    result = result.filter((app) => !app.isArchived);

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.applicant.name.localeCompare(b.applicant.name);
          break;
        case "date":
          comparison = a.submittedAt.getTime() - b.submittedAt.getTime();
          break;
        case "status":
          comparison = statusConfig[a.status].order - statusConfig[b.status].order;
          break;
        case "priority":
          const priorityOrder = { critical: 0, urgent: 1, high: 2, medium: 3, low: 4 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case "rating":
          comparison = a.rating - b.rating;
          break;
        case "score":
          comparison = a.scores.overall - b.scores.overall;
          break;
        case "position":
          comparison = (a.position || "").localeCompare(b.position || "");
          break;
        case "source":
          comparison = a.source.localeCompare(b.source);
          break;
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });

    return result;
  }, [applications, filters, sortField, sortOrder, statusFilter, quickDateFilter]);

  // Calculate stats
  const stats = useMemo<ApplicationStats>(() => {
    const total = applications.filter((a) => !a.isArchived).length;
    const byStatus = applications.reduce((acc, app) => {
      if (!app.isArchived) {
        acc[app.status] = (acc[app.status] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const approved = byStatus.approved || 0;
    const rejected = byStatus.rejected || 0;
    const conversionRate = total > 0 ? (approved / total) * 100 : 0;

    const sourceBreakdown = sources.map((source) => {
      const count = applications.filter((a) => a.source === source && !a.isArchived).length;
      return { source, count, percentage: total > 0 ? (count / total) * 100 : 0 };
    }).filter((s) => s.count > 0).sort((a, b) => b.count - a.count);

    return {
      total,
      new: byStatus.new || 0,
      screening: byStatus.screening || 0,
      reviewing: byStatus.reviewing || 0,
      shortlisted: byStatus.shortlisted || 0,
      interview: byStatus.interview || 0,
      assessment: byStatus.assessment || 0,
      offer: byStatus.offer || 0,
      approved,
      rejected,
      onHold: byStatus.on_hold || 0,
      withdrawn: byStatus.withdrawn || 0,
      archived: applications.filter((a) => a.isArchived).length,
      avgProcessingDays: 12,
      avgTimeToHire: 28,
      conversionRate,
      offerAcceptanceRate: 75,
      sourceBreakdown,
      statusTrend: [],
      topSources: sourceBreakdown.slice(0, 5).map((s) => ({ ...s, conversionRate: Math.random() * 30 + 10 })),
      pipelineFunnel: [],
    };
  }, [applications]);

  // Kanban columns
  const kanbanColumns = useMemo<KanbanColumn[]>(() => {
    const activeStatuses: ApplicationStatus[] = [
      "new",
      "screening",
      "reviewing",
      "shortlisted",
      "interview",
      "assessment",
      "offer",
      "approved",
    ];

    return activeStatuses.map((status) => ({
      id: status,
      title: statusConfig[status].label,
      color: statusConfig[status].color,
      icon: statusConfig[status].icon,
      applications: filteredApplications.filter((app) => app.status === status),
    }));
  }, [filteredApplications]);

  // Handlers
  const handleViewApplication = useCallback((app: Application) => {
    setSelectedApplication(app);
    setIsDetailsOpen(true);
  }, []);

  const handleStatusChange = useCallback(
    (appId: string, newStatus: ApplicationStatus) => {
      setApplications((prev) =>
        prev.map((app) =>
          app.id === appId
            ? {
                ...app,
                previousStatus: app.status,
                status: newStatus,
                lastUpdated: new Date(),
                activities: [
                  {
                    id: `activity_${Date.now()}`,
                    type: "status_change",
                    description: `Status changed from ${statusConfig[app.status].label} to ${statusConfig[newStatus].label}`,
                    user: "Current User",
                    userId: "current_user",
                    timestamp: new Date(),
                    changes: [{ field: "status", from: app.status, to: newStatus }],
                  },
                  ...app.activities,
                ],
              }
            : app
        )
      );
      toast({
        title: "Status Updated",
        description: `Application status changed to ${statusConfig[newStatus].label}`,
      });
    },
    [toast]
  );

  const handleToggleStar = useCallback((appId: string) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === appId ? { ...app, isStarred: !app.isStarred } : app
      )
    );
  }, []);

  const handleSelectApplication = useCallback((appId: string) => {
    setSelectedApplications((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(appId)) {
        newSet.delete(appId);
      } else {
        newSet.add(appId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedApplications.size === filteredApplications.length) {
      setSelectedApplications(new Set());
    } else {
      setSelectedApplications(new Set(filteredApplications.map((a) => a.id)));
    }
  }, [filteredApplications, selectedApplications]);

  const handleClearSelection = useCallback(() => {
    setSelectedApplications(new Set());
  }, []);

  const handleBulkAction = useCallback(
    (action: string) => {
      const count = selectedApplications.size;
      switch (action) {
        case "email":
          toast({
            title: "Email Composer",
            description: `Opening email composer for ${count} recipient${count > 1 ? "s" : ""}...`,
          });
          break;
        case "status":
          toast({
            title: "Change Status",
            description: `Select new status for ${count} application${count > 1 ? "s" : ""}...`,
          });
          break;
        case "assign":
          toast({
            title: "Assign Applications",
            description: `Assign ${count} application${count > 1 ? "s" : ""} to team member...`,
          });
          break;
        case "tag":
          toast({
            title: "Add Tags",
            description: `Add tags to ${count} application${count > 1 ? "s" : ""}...`,
          });
          break;
        case "export":
          toast({
            title: "Export Started",
            description: `Exporting ${count} application${count > 1 ? "s" : ""}...`,
          });
          break;
        case "archive":
          setApplications((prev) =>
            prev.map((app) =>
              selectedApplications.has(app.id) ? { ...app, isArchived: true } : app
            )
          );
          setSelectedApplications(new Set());
          toast({
            title: "Applications Archived",
            description: `${count} application${count > 1 ? "s" : ""} moved to archive.`,
          });
          break;
        case "delete":
          toast({
            title: "Delete Confirmation",
            description: `Are you sure you want to delete ${count} application${count > 1 ? "s" : ""}?`,
            variant: "destructive",
          });
          break;
      }
    },
    [selectedApplications, toast]
  );

  const handleQuickAction = useCallback(
    (appId: string, action: string) => {
      const app = applications.find((a) => a.id === appId);
      if (!app) return;

      switch (action) {
        case "email":
          toast({
            title: "Email Composer",
            description: `Opening email composer for ${app.applicant.name}...`,
          });
          break;
        case "schedule":
          toast({
            title: "Schedule Interview",
            description: `Opening scheduler for ${app.applicant.name}...`,
          });
          break;
        case "edit":
          setSelectedApplication(app);
          setIsDetailsOpen(true);
          break;
        case "assign":
          toast({
            title: "Assign Application",
            description: "Select team member to assign this application...",
          });
          break;
        case "tag":
          toast({
            title: "Add Tags",
            description: "Select tags to add...",
          });
          break;
        case "note":
          setSelectedApplication(app);
          setIsDetailsOpen(true);
          break;
        case "duplicate":
          toast({
            title: "Application Duplicated",
            description: `${app.applicant.name}'s application has been duplicated.`,
          });
          break;
        case "archive":
          handleStatusChange(appId, "archived");
          break;
        case "delete":
          toast({
            title: "Delete Confirmation",
            description: `Are you sure you want to delete ${app.applicant.name}'s application?`,
            variant: "destructive",
          });
          break;
        default:
          if (action.startsWith("priority:")) {
            const newPriority = action.split(":")[1] as Priority;
            setApplications((prev) =>
              prev.map((a) =>
                a.id === appId ? { ...a, priority: newPriority, lastUpdated: new Date() } : a
              )
            );
            toast({
              title: "Priority Updated",
              description: `Priority changed to ${priorityConfig[newPriority].label}`,
            });
          }
      }
    },
    [applications, toast, handleStatusChange]
  );

  const handleUpdateApplication = useCallback((appId: string, updates: Partial<Application>) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === appId ? { ...app, ...updates, lastUpdated: new Date() } : app
      )
    );
  }, []);

  const handleSaveView = useCallback(() => {
    const viewName = prompt("Enter a name for this view:");
    if (viewName) {
      const newView: SavedView = {
        id: `view_${Date.now()}`,
        name: viewName,
        filters: { ...filters },
        sort: { field: sortField, order: sortOrder },
        viewMode,
        isDefault: false,
        isShared: false,
        createdBy: "Current User",
        createdAt: new Date(),
      };
      setSavedViews((prev) => [...prev, newView]);
      setCurrentView(newView.id);
      toast({
        title: "View Saved",
        description: `"${viewName}" has been saved successfully.`,
      });
    }
  }, [filters, sortField, sortOrder, viewMode, toast]);

  const handleSelectView = useCallback((view: SavedView) => {
    if (view.id) {
      setCurrentView(view.id);
      if (view.filters) {
        setFilters((prev) => ({ ...prev, ...view.filters }));
      }
      if (view.sort) {
        setSortField(view.sort.field);
        setSortOrder(view.sort.order);
      }
      if (view.viewMode) {
        setViewMode(view.viewMode);
      }
    } else {
      setCurrentView(null);
    }
  }, []);

  const handleDeleteView = useCallback(
    (viewId: string) => {
      setSavedViews((prev) => prev.filter((v) => v.id !== viewId));
      if (currentView === viewId) {
        setCurrentView(null);
      }
      toast({
        title: "View Deleted",
        description: "The saved view has been deleted.",
      });
    },
    [currentView, toast]
  );

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: "",
      types: [],
      statuses: [],
      priorities: [],
      sources: [],
      departments: [],
      positions: [],
      assignees: [],
      tags: [],
      rating: [0, 5],
      score: [0, 100],
      dateRange: { from: null, to: null },
      isStarred: null,
      hasInterview: null,
      hasOffer: null,
      isOverdue: null,
    });
    setStatusFilter("all");
    setQuickDateFilter("all");
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.types.length > 0) count++;
    if (filters.statuses.length > 0) count++;
    if (filters.priorities.length > 0) count++;
    if (filters.sources.length > 0) count++;
    if (filters.departments.length > 0) count++;
    if (filters.assignees.length > 0) count++;
    if (filters.tags.length > 0) count++;
    if (filters.rating[0] > 0 || filters.rating[1] < 5) count++;
    if (filters.score[0] > 0 || filters.score[1] < 100) count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.isStarred !== null) count++;
    if (filters.hasInterview !== null) count++;
    if (filters.hasOffer !== null) count++;
    if (filters.isOverdue !== null) count++;
    if (statusFilter !== "all") count++;
    if (quickDateFilter !== "all") count++;
    return count;
  }, [filters, statusFilter, quickDateFilter]);

  // Render
  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-[#0F172A]">Applications</h1>
              <p className="text-slate-500 text-sm">
                Manage and track all applications in one place
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="rounded-xl gap-2">
                <Upload size={16} />
                Import
              </Button>
              <Button variant="outline" className="rounded-xl gap-2">
                <Download size={16} />
                Export
              </Button>
              <Button className="rounded-xl gap-2 bg-[#23D3EE] hover:bg-[#14a89a]">
                <Plus size={16} />
                Add Application
              </Button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <StatCard
              title="Total"
              value={stats.total}
              icon={Files}
              color="#0F172A"
              isActive={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
              delay={0}
            />
            <StatCard
              title="New"
              value={stats.new}
              icon={Circle}
              color={statusConfig.new.color}
              isActive={statusFilter === "new"}
              onClick={() => setStatusFilter(statusFilter === "new" ? "all" : "new")}
              delay={0.05}
            />
            <StatCard
              title="Reviewing"
              value={stats.reviewing}
              icon={Eye}
              color={statusConfig.reviewing.color}
              isActive={statusFilter === "reviewing"}
              onClick={() => setStatusFilter(statusFilter === "reviewing" ? "all" : "reviewing")}
              delay={0.1}
            />
            <StatCard
              title="Shortlisted"
              value={stats.shortlisted}
              icon={BookmarkCheck}
              color={statusConfig.shortlisted.color}
              isActive={statusFilter === "shortlisted"}
              onClick={() => setStatusFilter(statusFilter === "shortlisted" ? "all" : "shortlisted")}
              delay={0.15}
            />
            <StatCard
              title="Interview"
              value={stats.interview}
              icon={CalendarDays}
              color={statusConfig.interview.color}
              isActive={statusFilter === "interview"}
              onClick={() => setStatusFilter(statusFilter === "interview" ? "all" : "interview")}
              delay={0.2}
            />
            <StatCard
              title="Offer"
              value={stats.offer}
              icon={FileCheck}
              color={statusConfig.offer.color}
              isActive={statusFilter === "offer"}
              onClick={() => setStatusFilter(statusFilter === "offer" ? "all" : "offer")}
              delay={0.25}
            />
            <StatCard
              title="Approved"
              value={stats.approved}
              icon={CheckCircle2}
              color={statusConfig.approved.color}
              isActive={statusFilter === "approved"}
              onClick={() => setStatusFilter(statusFilter === "approved" ? "all" : "approved")}
              delay={0.3}
            />
            <StatCard
              title="Rejected"
              value={stats.rejected}
              icon={XCircle}
              color={statusConfig.rejected.color}
              isActive={statusFilter === "rejected"}
              onClick={() => setStatusFilter(statusFilter === "rejected" ? "all" : "rejected")}
              delay={0.35}
            />
          </div>
        </motion.header>

        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0"
        >
          <div className="flex items-center gap-3 flex-1">
            {/* Saved Views */}
            <SavedViewsDropdown
              savedViews={savedViews}
              currentView={currentView}
              onSelectView={handleSelectView}
              onSaveView={handleSaveView}
              onDeleteView={handleDeleteView}
            />

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                ref={searchInputRef}
                placeholder="Search applications... (Press / to focus)"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="pl-10 pr-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-[#23D3EE]/20"
              />
              {filters.search && (
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Quick Date Filter */}
            <QuickDateFilter value={quickDateFilter} onChange={setQuickDateFilter} />

            {/* Filter Button */}
            <Button
              variant="outline"
              className={cn(
                "rounded-xl gap-2",
                activeFilterCount > 0 && "border-[#23D3EE] text-[#23D3EE]"
              )}
              onClick={() => setIsFilterPanelOpen(true)}
            >
              <Filter size={16} />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 bg-[#23D3EE] text-white text-xs rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-slate-500 hover:text-red-500"
              >
                <X size={14} className="mr-1" />
                Clear
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl gap-2">
                  <ArrowUpDown size={16} />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {[
                  { field: "date", label: "Date Submitted" },
                  { field: "name", label: "Name" },
                  { field: "status", label: "Status" },
                  { field: "priority", label: "Priority" },
                  { field: "rating", label: "Rating" },
                  // Continuing from Sort dropdown...

                  { field: "score", label: "Score" },
                  { field: "position", label: "Position" },
                  { field: "source", label: "Source" },
                ].map((item) => (
                  <DropdownMenuItem
                    key={item.field}
                    onClick={() => {
                      if (sortField === item.field) {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortField(item.field as SortField);
                        setSortOrder("desc");
                      }
                    }}
                    className="rounded-lg"
                  >
                    {item.label}
                    {sortField === item.field && (
                      <span className="ml-auto">
                        {sortOrder === "asc" ? (
                          <ArrowUp size={14} className="text-[#23D3EE]" />
                        ) : (
                          <ArrowDown size={14} className="text-[#23D3EE]" />
                        )}
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Column Customization (List View Only) */}
            {viewMode === "list" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-xl"
                      onClick={() => setIsColumnDialogOpen(true)}
                    >
                      <Columns size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Customize Columns</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1">
              <TooltipProvider>
                {[
                  { mode: "grid" as ViewMode, icon: LayoutGrid, label: "Grid View" },
                  { mode: "list" as ViewMode, icon: List, label: "List View" },
                  { mode: "kanban" as ViewMode, icon: Kanban, label: "Kanban View" },
                ].map(({ mode, icon: Icon, label }) => (
                  <Tooltip key={mode}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setViewMode(mode)}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          viewMode === mode
                            ? "bg-white text-[#23D3EE] shadow-sm"
                            : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        <Icon size={18} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{label}</TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>

            {/* Refresh */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl"
                    onClick={() => {
                      setIsLoading(true);
                      setTimeout(() => setIsLoading(false), 500);
                    }}
                  >
                    <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </motion.div>

        {/* Results Info */}
        <div className="px-6 py-3 flex items-center justify-between bg-slate-50 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-4">
            {viewMode !== "kanban" && (
              <Checkbox
                checked={
                  selectedApplications.size > 0 &&
                  selectedApplications.size === filteredApplications.length
                }
                onCheckedChange={handleSelectAll}
                className="data-[state=checked]:bg-[#23D3EE] data-[state=checked]:border-[#23D3EE]"
              />
            )}
            <span className="text-sm text-slate-600">
              {filteredApplications.length === applications.filter((a) => !a.isArchived).length
                ? `${filteredApplications.length} applications`
                : `${filteredApplications.length} of ${applications.filter((a) => !a.isArchived).length} applications`}
              {selectedApplications.size > 0 && (
                <span className="text-[#23D3EE] font-medium ml-2">
                  ({selectedApplications.size} selected)
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>
              Sorted by {sortField.charAt(0).toUpperCase() + sortField.slice(1)} ({sortOrder === "asc" ? "A-Z" : "Z-A"})
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="p-6">
              <ApplicationSkeleton viewMode={viewMode} />
            </div>
          ) : filteredApplications.length === 0 ? (
            <EmptyState
              icon={filters.search || activeFilterCount > 0 ? Search : Inbox}
              title={filters.search || activeFilterCount > 0 ? "No results found" : "No applications yet"}
              description={
                filters.search || activeFilterCount > 0
                  ? "Try adjusting your search or filters to find what you're looking for."
                  : "Get started by adding your first application or importing existing data."
              }
              action={
                filters.search || activeFilterCount > 0 ? (
                  <Button variant="outline" className="rounded-xl" onClick={handleClearFilters}>
                    <X size={16} className="mr-2" /> Clear Filters
                  </Button>
                ) : (
                  <Button className="rounded-xl bg-[#23D3EE] hover:bg-[#14a89a]">
                    <Plus size={16} className="mr-2" /> Add Application
                  </Button>
                )
              }
            />
          ) : (
            <>
              {/* Grid View */}
              {viewMode === "grid" && (
                <ScrollArea className="h-full">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
                  >
                    <AnimatePresence>
                      {filteredApplications.map((app, index) => (
                        <ApplicationCard
                          key={app.id}
                          application={app}
                          isSelected={selectedApplications.has(app.id)}
                          onSelect={() => handleSelectApplication(app.id)}
                          onView={() => handleViewApplication(app)}
                          onStatusChange={(status) => handleStatusChange(app.id, status)}
                          onToggleStar={() => handleToggleStar(app.id)}
                          onQuickAction={(action) => handleQuickAction(app.id, action)}
                          delay={index * 0.03}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                </ScrollArea>
              )}

              {/* List View */}
              {viewMode === "list" && (
                <ScrollArea className="h-full">
                  <div className="p-6">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
                    >
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 hover:bg-slate-50">
                            {columns
                              .filter((col) => col.visible)
                              .map((col) => (
                                <TableHead
                                  key={col.id}
                                  className={cn(
                                    "font-semibold text-[#0F172A]",
                                    col.sortable && "cursor-pointer hover:bg-slate-100"
                                  )}
                                  style={{ width: col.width }}
                                  onClick={() => {
                                    if (col.sortable) {
                                      const fieldMap: Record<string, SortField> = {
                                        applicant: "name",
                                        position: "position",
                                        type: "source",
                                        status: "status",
                                        priority: "priority",
                                        rating: "rating",
                                        source: "source",
                                        submittedAt: "date",
                                      };
                                      const field = fieldMap[col.id];
                                      if (field) {
                                        if (sortField === field) {
                                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                        } else {
                                          setSortField(field);
                                          setSortOrder("desc");
                                        }
                                      }
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-1">
                                    {col.label}
                                    {col.sortable && sortField === col.id && (
                                      sortOrder === "asc" ? (
                                        <ArrowUp size={14} className="text-[#23D3EE]" />
                                      ) : (
                                        <ArrowDown size={14} className="text-[#23D3EE]" />
                                      )
                                    )}
                                  </div>
                                </TableHead>
                              ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence>
                            {filteredApplications.map((app) => (
                              <ApplicationTableRow
                                key={app.id}
                                application={app}
                                isSelected={selectedApplications.has(app.id)}
                                onSelect={() => handleSelectApplication(app.id)}
                                onView={() => handleViewApplication(app)}
                                onStatusChange={(status) => handleStatusChange(app.id, status)}
                                onToggleStar={() => handleToggleStar(app.id)}
                                onQuickAction={(action) => handleQuickAction(app.id, action)}
                                columns={columns}
                              />
                            ))}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    </motion.div>
                  </div>
                </ScrollArea>
              )}

              {/* Kanban View */}
              {viewMode === "kanban" && (
                <div className="h-full overflow-x-auto">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-4 p-6 h-full min-w-max"
                  >
                    {kanbanColumns.map((column) => (
                      <KanbanColumn
                        key={column.id}
                        column={column}
                        applications={column.applications}
                        onViewApplication={handleViewApplication}
                        onToggleStar={(app) => handleToggleStar(app.id)}
                        onStatusChange={(app, status) => handleStatusChange(app.id, status)}
                      />
                    ))}
                  </motion.div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {selectedApplications.size > 0 && (
            <BulkActionsBar
              selectedCount={selectedApplications.size}
              onClearSelection={handleClearSelection}
              onBulkAction={handleBulkAction}
            />
          )}
        </AnimatePresence>

        {/* Filter Panel */}
        <FilterPanel
          isOpen={isFilterPanelOpen}
          onClose={() => setIsFilterPanelOpen(false)}
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={handleClearFilters}
          applications={applications}
        />

        {/* Application Details Sheet */}
        <ApplicationDetailsSheet
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedApplication(null);
          }}
          application={selectedApplication}
          onStatusChange={(status) => {
            if (selectedApplication) {
              handleStatusChange(selectedApplication.id, status);
              setSelectedApplication((prev) =>
                prev ? { ...prev, status } : null
              );
            }
          }}
          onToggleStar={() => {
            if (selectedApplication) {
              handleToggleStar(selectedApplication.id);
              setSelectedApplication((prev) =>
                prev ? { ...prev, isStarred: !prev.isStarred } : null
              );
            }
          }}
          onUpdate={(updates) => {
            if (selectedApplication) {
              handleUpdateApplication(selectedApplication.id, updates);
              setSelectedApplication((prev) =>
                prev ? { ...prev, ...updates } : null
              );
            }
          }}
        />

        {/* Column Customization Dialog */}
        <ColumnCustomizationDialog
          isOpen={isColumnDialogOpen}
          onClose={() => setIsColumnDialogOpen(false)}
          columns={columns}
          onColumnsChange={setColumns}
        />
      </main>
    </div>
  );
};

// Missing component for ArrowUpDown
const ArrowUpDown = ({ size, className }: { size: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m21 16-4 4-4-4" />
    <path d="M17 20V4" />
    <path d="m3 8 4-4 4 4" />
    <path d="M7 4v16" />
  </svg>
);

export default Applications;