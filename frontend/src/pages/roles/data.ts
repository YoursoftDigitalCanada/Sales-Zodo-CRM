import {
    Shield, Users, Lock, Eye, Pencil, Trash2, Plus,
    Settings, BarChart3, Mail, Calendar, Briefcase,
    FileText, Database, Globe, Zap,
    type LucideIcon,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

export type RolesTab = "roles" | "permissions" | "users" | "audit";

export interface RolesTabItem {
    id: RolesTab;
    label: string;
    icon: LucideIcon;
}

export interface PermissionModule {
    id: string;
    name: string;
    icon: LucideIcon;
    permissions: Permission[];
}

export interface Permission {
    id: string;
    name: string;
    description: string;
}

export interface Role {
    id: string;
    name: string;
    description: string;
    color: string;
    usersCount: number;
    isSystem: boolean;
    permissions: Record<string, ("view" | "create" | "edit" | "delete")[]>;
    createdAt: string;
}

export interface RoleUser {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: string;
    department: string;
    lastActive: string;
    status: "active" | "invited" | "suspended";
}

export interface AuditEntry {
    id: string;
    user: string;
    action: string;
    target: string;
    timestamp: string;
    details: string;
}

// ============================================
// DATA
// ============================================

export const rolesTabs: RolesTabItem[] = [
    { id: "roles", label: "Roles", icon: Shield },
    { id: "permissions", label: "Permission Matrix", icon: Lock },
    { id: "users", label: "User Assignments", icon: Users },
    { id: "audit", label: "Audit Log", icon: FileText },
];

export const permissionModules: PermissionModule[] = [
    {
        id: "contacts", name: "Contacts", icon: Users,
        permissions: [
            { id: "contacts_view", name: "View", description: "View contact records" },
            { id: "contacts_create", name: "Create", description: "Create new contacts" },
            { id: "contacts_edit", name: "Edit", description: "Edit existing contacts" },
            { id: "contacts_delete", name: "Delete", description: "Delete contacts" },
        ],
    },
    {
        id: "deals", name: "Deals", icon: Briefcase,
        permissions: [
            { id: "deals_view", name: "View", description: "View deals and pipeline" },
            { id: "deals_create", name: "Create", description: "Create new deals" },
            { id: "deals_edit", name: "Edit", description: "Edit deal details" },
            { id: "deals_delete", name: "Delete", description: "Delete deals" },
        ],
    },
    {
        id: "reports", name: "Reports", icon: BarChart3,
        permissions: [
            { id: "reports_view", name: "View", description: "Access reports" },
            { id: "reports_create", name: "Create", description: "Create custom reports" },
            { id: "reports_edit", name: "Edit", description: "Edit report configurations" },
            { id: "reports_delete", name: "Delete", description: "Delete reports" },
        ],
    },
    {
        id: "email", name: "Email", icon: Mail,
        permissions: [
            { id: "email_view", name: "View", description: "View email communications" },
            { id: "email_create", name: "Create", description: "Send emails" },
            { id: "email_edit", name: "Edit", description: "Edit email templates" },
            { id: "email_delete", name: "Delete", description: "Delete email records" },
        ],
    },
    {
        id: "calendar", name: "Calendar", icon: Calendar,
        permissions: [
            { id: "calendar_view", name: "View", description: "View calendar events" },
            { id: "calendar_create", name: "Create", description: "Create events" },
            { id: "calendar_edit", name: "Edit", description: "Edit events" },
            { id: "calendar_delete", name: "Delete", description: "Delete events" },
        ],
    },
    {
        id: "settings", name: "Settings", icon: Settings,
        permissions: [
            { id: "settings_view", name: "View", description: "View settings" },
            { id: "settings_create", name: "Create", description: "Create configurations" },
            { id: "settings_edit", name: "Edit", description: "Modify settings" },
            { id: "settings_delete", name: "Delete", description: "Delete configurations" },
        ],
    },
    {
        id: "integrations", name: "Integrations", icon: Globe,
        permissions: [
            { id: "integrations_view", name: "View", description: "View integrations" },
            { id: "integrations_create", name: "Create", description: "Connect integrations" },
            { id: "integrations_edit", name: "Edit", description: "Configure integrations" },
            { id: "integrations_delete", name: "Delete", description: "Disconnect integrations" },
        ],
    },
    {
        id: "automation", name: "Automation", icon: Zap,
        permissions: [
            { id: "automation_view", name: "View", description: "View automations" },
            { id: "automation_create", name: "Create", description: "Create workflows" },
            { id: "automation_edit", name: "Edit", description: "Edit workflows" },
            { id: "automation_delete", name: "Delete", description: "Delete workflows" },
        ],
    },
    {
        id: "data", name: "Data Management", icon: Database,
        permissions: [
            { id: "data_view", name: "View", description: "View data exports" },
            { id: "data_create", name: "Create", description: "Import data" },
            { id: "data_edit", name: "Edit", description: "Bulk edit records" },
            { id: "data_delete", name: "Delete", description: "Bulk delete / purge data" },
        ],
    },
];

export const defaultRoles: Role[] = [
    {
        id: "r1", name: "Super Admin", description: "Full system access with all permissions", color: "#DC2626", usersCount: 2, isSystem: true, createdAt: "Jan 1, 2025",
        permissions: Object.fromEntries(permissionModules.map((m) => [m.id, ["view", "create", "edit", "delete"] as ("view" | "create" | "edit" | "delete")[]])),
    },
    {
        id: "r2", name: "Admin", description: "Administrative access excluding system settings", color: "#D97706", usersCount: 4, isSystem: true, createdAt: "Jan 1, 2025",
        permissions: {
            contacts: ["view", "create", "edit", "delete"], deals: ["view", "create", "edit", "delete"],
            reports: ["view", "create", "edit"], email: ["view", "create", "edit", "delete"],
            calendar: ["view", "create", "edit", "delete"], settings: ["view", "edit"],
            integrations: ["view", "create", "edit"], automation: ["view", "create", "edit"],
            data: ["view", "create", "edit"],
        },
    },
    {
        id: "r3", name: "Sales Manager", description: "Manage sales team, deals, and pipeline", color: "#0891B2", usersCount: 6, isSystem: false, createdAt: "Feb 12, 2025",
        permissions: {
            contacts: ["view", "create", "edit"], deals: ["view", "create", "edit", "delete"],
            reports: ["view", "create"], email: ["view", "create"],
            calendar: ["view", "create", "edit"], settings: ["view"],
            integrations: ["view"], automation: ["view", "create"],
            data: ["view"],
        },
    },
    {
        id: "r4", name: "Sales Rep", description: "Standard sales representative access", color: "#16A34A", usersCount: 12, isSystem: false, createdAt: "Mar 5, 2025",
        permissions: {
            contacts: ["view", "create", "edit"], deals: ["view", "create", "edit"],
            reports: ["view"], email: ["view", "create"],
            calendar: ["view", "create", "edit"], settings: [],
            integrations: [], automation: ["view"],
            data: ["view"],
        },
    },
    {
        id: "r5", name: "Marketing", description: "Marketing team with campaign and analytics access", color: "#7C3AED", usersCount: 5, isSystem: false, createdAt: "Apr 10, 2025",
        permissions: {
            contacts: ["view"], deals: ["view"],
            reports: ["view", "create"], email: ["view", "create", "edit"],
            calendar: ["view", "create"], settings: [],
            integrations: ["view"], automation: ["view", "create", "edit"],
            data: ["view"],
        },
    },
    {
        id: "r6", name: "Viewer", description: "Read-only access across the platform", color: "#94A3B8", usersCount: 8, isSystem: true, createdAt: "Jan 1, 2025",
        permissions: {
            contacts: ["view"], deals: ["view"],
            reports: ["view"], email: ["view"],
            calendar: ["view"], settings: ["view"],
            integrations: ["view"], automation: ["view"],
            data: ["view"],
        },
    },
];

export const roleUsers: RoleUser[] = [
    { id: "u1", name: "Alex Johnson", email: "alex@zodo.ca", avatar: "AJ", role: "Super Admin", department: "Engineering", lastActive: "2 min ago", status: "active" },
    { id: "u2", name: "Sarah Chen", email: "sarah@zodo.ca", avatar: "SC", role: "Admin", department: "Operations", lastActive: "15 min ago", status: "active" },
    { id: "u3", name: "Mike Rodriguez", email: "mike@zodo.ca", avatar: "MR", role: "Sales Manager", department: "Sales", lastActive: "1 hr ago", status: "active" },
    { id: "u4", name: "Emily Davis", email: "emily@zodo.ca", avatar: "ED", role: "Sales Rep", department: "Sales", lastActive: "30 min ago", status: "active" },
    { id: "u5", name: "Lisa Park", email: "lisa@zodo.ca", avatar: "LP", role: "Sales Rep", department: "Sales", lastActive: "45 min ago", status: "active" },
    { id: "u6", name: "James Wilson", email: "james@zodo.ca", avatar: "JW", role: "Marketing", department: "Marketing", lastActive: "3 hrs ago", status: "active" },
    { id: "u7", name: "Nina Patel", email: "nina@zodo.ca", avatar: "NP", role: "Viewer", department: "Finance", lastActive: "1 day ago", status: "active" },
    { id: "u8", name: "Tom Baker", email: "tom@zodo.ca", avatar: "TB", role: "Sales Rep", department: "Sales", lastActive: "Never", status: "invited" },
    { id: "u9", name: "Rachel Kim", email: "rachel@zodo.ca", avatar: "RK", role: "Admin", department: "Operations", lastActive: "5 days ago", status: "suspended" },
    { id: "u10", name: "David Lee", email: "david@zodo.ca", avatar: "DL", role: "Sales Manager", department: "Sales", lastActive: "20 min ago", status: "active" },
];

export const auditLog: AuditEntry[] = [
    { id: "a1", user: "Alex Johnson", action: "Updated Role", target: "Sales Manager", timestamp: "2 min ago", details: "Added 'delete' permission for Deals module" },
    { id: "a2", user: "Sarah Chen", action: "Assigned Role", target: "Tom Baker", timestamp: "1 hr ago", details: "Assigned 'Sales Rep' role to new user" },
    { id: "a3", user: "Alex Johnson", action: "Created Role", target: "Marketing", timestamp: "3 hrs ago", details: "Created new custom role with marketing permissions" },
    { id: "a4", user: "Sarah Chen", action: "Suspended User", target: "Rachel Kim", timestamp: "1 day ago", details: "Suspended account pending security review" },
    { id: "a5", user: "Alex Johnson", action: "Updated Permissions", target: "Viewer", timestamp: "2 days ago", details: "Removed 'Settings' view permission" },
    { id: "a6", user: "Mike Rodriguez", action: "Invite Sent", target: "Tom Baker", timestamp: "2 days ago", details: "Invited user with Sales Rep role" },
    { id: "a7", user: "Alex Johnson", action: "Deleted Role", target: "Intern", timestamp: "5 days ago", details: "Removed unused custom role" },
    { id: "a8", user: "Sarah Chen", action: "Reactivated User", target: "David Lee", timestamp: "1 week ago", details: "Restored account access after leave" },
];
