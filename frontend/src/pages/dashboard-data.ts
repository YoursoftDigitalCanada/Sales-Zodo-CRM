import {
    FolderKanban, DollarSign, Users, Calendar, CheckCircle2,
    MessageSquare, Clock, AlertTriangle, FileText, Target,
    TrendingUp, ArrowUpRight, ArrowDownRight, Briefcase,
    type LucideIcon,
} from "lucide-react";

// ============================================
// LEADS
// ============================================
export interface LeadItem {
    id: string; name: string; company: string; value: number;
    status: "hot" | "warm" | "cold" | "stalled";
    daysInStage: number; source: string; assignee: string;
}

export const pendingLeads: LeadItem[] = [
    { id: "l1", name: "Sarah Mitchell", company: "TechVault Inc.", value: 45000, status: "hot", daysInStage: 2, source: "Website", assignee: "MR" },
    { id: "l2", name: "James Rodriguez", company: "CloudNine Solutions", value: 78000, status: "hot", daysInStage: 1, source: "LinkedIn", assignee: "ED" },
    { id: "l3", name: "Emily Park", company: "DataStream Corp", value: 32000, status: "stalled", daysInStage: 12, source: "Referral", assignee: "LP" },
    { id: "l4", name: "David Chen", company: "NexGen Labs", value: 55000, status: "stalled", daysInStage: 8, source: "Event", assignee: "MR" },
    { id: "l5", name: "Lisa Wang", company: "FinEdge Capital", value: 120000, status: "warm", daysInStage: 4, source: "Cold Call", assignee: "JW" },
    { id: "l6", name: "Tom Baker", company: "GreenLeaf Co.", value: 28000, status: "cold", daysInStage: 15, source: "Website", assignee: "ED" },
];

// ============================================
// INVOICES
// ============================================
export interface InvoiceItem {
    id: string; client: string; amount: number; dueDate: string;
    status: "overdue" | "pending" | "paid" | "draft";
    daysOverdue?: number; invoiceNo: string;
}

export const invoiceItems: InvoiceItem[] = [
    { id: "i1", client: "TechStart Inc.", amount: 12500, dueDate: "Feb 10, 2026", status: "overdue", daysOverdue: 11, invoiceNo: "INV-2041" },
    { id: "i2", client: "CloudNine Solutions", amount: 8750, dueDate: "Feb 15, 2026", status: "overdue", daysOverdue: 6, invoiceNo: "INV-2042" },
    { id: "i3", client: "NexGen Labs", amount: 34000, dueDate: "Feb 25, 2026", status: "pending", invoiceNo: "INV-2043" },
    { id: "i4", client: "DataStream Corp", amount: 15200, dueDate: "Mar 1, 2026", status: "pending", invoiceNo: "INV-2044" },
    { id: "i5", client: "FinEdge Capital", amount: 46000, dueDate: "Mar 5, 2026", status: "draft", invoiceNo: "INV-2045" },
];

// ============================================
// PROJECTS
// ============================================
export interface ProjectItem {
    id: string; name: string; client: string; progress: number;
    status: "on-track" | "at-risk" | "delayed" | "completed";
    deadline: string; team: string[]; budget: number; spent: number;
}

export const projectItems: ProjectItem[] = [
    { id: "p1", name: "E-commerce Platform", client: "TechStart Inc.", progress: 72, status: "on-track", deadline: "Mar 15, 2026", team: ["JS", "AM", "KR"], budget: 85000, spent: 61200 },
    { id: "p2", name: "Mobile Banking App", client: "FinEdge Capital", progress: 45, status: "at-risk", deadline: "Feb 28, 2026", team: ["DR", "PK", "MJ"], budget: 120000, spent: 78000 },
    { id: "p3", name: "CRM Integration", client: "CloudNine Solutions", progress: 88, status: "on-track", deadline: "Mar 1, 2026", team: ["TM", "SC"], budget: 42000, spent: 36960 },
    { id: "p4", name: "Website Redesign", client: "GreenLeaf Co.", progress: 30, status: "delayed", deadline: "Feb 20, 2026", team: ["JS", "SL"], budget: 35000, spent: 18500 },
    { id: "p5", name: "Data Analytics Suite", client: "DataStream Corp", progress: 100, status: "completed", deadline: "Feb 10, 2026", team: ["AM", "KR", "PK"], budget: 65000, spent: 62100 },
];

// ============================================
// AI ALERTS
// ============================================
export interface SmartAlert {
    id: string; type: "warning" | "danger" | "info" | "success";
    title: string; message: string; action: string; actionPath: string;
}

export const smartAlerts: SmartAlert[] = [
    { id: "a1", type: "danger", title: "2 Invoices Overdue", message: "$21,250 in overdue payments need immediate attention", action: "View Invoices", actionPath: "/invoices" },
    { id: "a2", type: "warning", title: "2 Leads Stalled", message: "Emily Park and David Chen haven't progressed in 8+ days", action: "Follow Up", actionPath: "/leads" },
    { id: "a3", type: "warning", title: "Project At Risk", message: "Mobile Banking App is behind schedule — deadline in 7 days", action: "View Project", actionPath: "/projects" },
    { id: "a4", type: "info", title: "2 Hot Leads", message: "Sarah Mitchell ($45K) and James Rodriguez ($78K) ready to close", action: "View Pipeline", actionPath: "/leads" },
];
