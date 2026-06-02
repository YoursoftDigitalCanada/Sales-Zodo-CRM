import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useToast } from "@/hooks/use-toast";
import {
    Shield, Plus, Search, CheckCircle2, XCircle, Clock,
    Copy, Trash2, Lock, Users,
    Download, Check, X, Info, Loader2,
} from "lucide-react";
import {
    rolesTabs,
    type RolesTab,
} from "./data";
import {
    fetchRoles, createRole, updateRole, deleteRole,
    fetchAllPermissions, assignPermissionsToRole,
    fetchEmployees, updateEmployee,
    type ApiRole, type ApiPermission, type ApiEmployee,
} from "./roles-api";

// ============================================
// HELPERS
// ============================================

/** Group permissions by module */
function groupByModule(permissions: ApiPermission[]): Record<string, ApiPermission[]> {
    const map: Record<string, ApiPermission[]> = {};
    for (const p of permissions) {
        if (!map[p.module]) map[p.module] = [];
        map[p.module].push(p);
    }
    return map;
}

/** Get module icon color based on module name */
const MODULE_COLORS: Record<string, string> = {
    leads: "#0891B2", clients: "#16A34A", projects: "#7C3AED", invoices: "#D97706",
    employees: "#DC2626", roles: "#0891B2", calendar: "#16A34A", tasks: "#7C3AED",
    emails: "#D97706", analytics: "#0891B2", settings: "#94A3B8", bookkeeping: "#16A34A",
};

const SALES_CRM_PERMISSION_MODULES = [
    "dashboard",
    "leads",
    "lead-sources",
    "contacts",
    "clients",
    "projects",
    "quotes",
    "contracts",
    "invoices",
    "bookkeeping",
    "tasks",
    "calendar",
    "emails",
    "files",
    "folders",
    "automation",
    "analytics",
    "notifications",
    "tags",
    "employees",
    "users",
    "roles",
    "settings",
    "audit",
    "support",
] as const;

const MODULE_LABELS: Record<string, string> = {
    dashboard: "Dashboard",
    leads: "Leads",
    "lead-sources": "Lead Sources",
    contacts: "Contacts",
    clients: "Organizations",
    projects: "Deals",
    quotes: "Proposals",
    contracts: "Contracts",
    invoices: "Invoices & Payments",
    bookkeeping: "Bookkeeping",
    tasks: "Tasks & Activities",
    calendar: "Calendar",
    emails: "Email & Mail",
    files: "Documents",
    folders: "Document Folders",
    automation: "Automation",
    analytics: "Sales Analytics",
    notifications: "Notifications",
    tags: "Tags",
    employees: "Team Members",
    users: "User Accounts",
    roles: "Roles & Permissions",
    settings: "Settings",
    audit: "Audit Log",
    support: "Support",
};

const CRUD_ACTIONS = ["view", "create", "update", "delete"] as const;

const ROLE_COLORS: Record<string, string> = {
    Owner: "#DC2626", Admin: "#D97706", Manager: "#0891B2", Staff: "#16A34A", Viewer: "#94A3B8",
};

/** Build permission map from role's permissions array: { module: [action1, action2] } */
function buildPermMap(role: ApiRole, allPerms: ApiPermission[]): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    const rolePermCodes = new Set((role.permissions || []).map((p) => p.code));
    for (const p of allPerms) {
        if (!result[p.module]) result[p.module] = [];
        if (rolePermCodes.has(p.code)) {
            result[p.module].push(p.action);
        }
    }
    return result;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function RolesPage() {
    const { toast } = useToast();
    const { isMobile } = useIsMobile();
    const [activeTab, setActiveTab] = useState<RolesTab>("roles");
    const [loading, setLoading] = useState(true);

    // Data from backend
    const [roles, setRoles] = useState<ApiRole[]>([]);
    const [allPermissions, setAllPermissions] = useState<ApiPermission[]>([]);
    const [employees, setEmployees] = useState<ApiEmployee[]>([]);

    // UI state
    const [showRoleForm, setShowRoleForm] = useState(false);
    const [newRoleName, setNewRoleName] = useState("");
    const [newRoleDesc, setNewRoleDesc] = useState("");
    const [matrixRole, setMatrixRole] = useState("");
    const [savingMatrix, setSavingMatrix] = useState(false);
    const [userSearch, setUserSearch] = useState("");
    const [userRoleFilter, setUserRoleFilter] = useState("all");

    // Permission state for matrix editing
    const [editedPerms, setEditedPerms] = useState<Record<string, string[]>>({});

    // ============================================
    // DATA FETCHING
    // ============================================

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [rolesData, permsData, empsData] = await Promise.all([
                fetchRoles(),
                fetchAllPermissions(),
                fetchEmployees().catch(() => []),
            ]);
            setRoles(rolesData);
            setAllPermissions(permsData);
            setEmployees(empsData);
            if (rolesData.length > 0 && !matrixRole) {
                setMatrixRole(rolesData[0].id);
            }
        } catch (err) {
            console.error("Failed to load roles data:", err);
            toast({ title: "Error", description: "Failed to load roles data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { loadData(); }, [loadData]);

    // When matrixRole changes, rebuild editedPerms
    useEffect(() => {
        const role = roles.find((r) => r.id === matrixRole);
        if (role && allPermissions.length > 0) {
            setEditedPerms(buildPermMap(role, allPermissions));
        }
    }, [matrixRole, roles, allPermissions]);

    // ============================================
    // HANDLERS
    // ============================================

    const handleCreateRole = async () => {
        if (!newRoleName.trim()) {
            toast({ title: "Error", description: "Role name is required.", variant: "destructive" });
            return;
        }
        try {
            // Create with default view permissions
            const viewPermIds = allPermissions
                .filter((p) => SALES_CRM_PERMISSION_MODULES.includes(p.module as typeof SALES_CRM_PERMISSION_MODULES[number]) && p.action === "view")
                .map((p) => p.id);
            await createRole({ name: newRoleName.trim(), description: newRoleDesc.trim() || undefined, permissionIds: viewPermIds });
            setNewRoleName("");
            setNewRoleDesc("");
            setShowRoleForm(false);
            toast({ title: "Role Created", description: `"${newRoleName}" has been created.` });
            await loadData();
        } catch (err: any) {
            toast({ title: "Error", description: err?.response?.data?.message || "Failed to create role.", variant: "destructive" });
        }
    };

    const handleDeleteRole = async (role: ApiRole) => {
        if (role.isSystemRole) {
            toast({ title: "Cannot Delete", description: "System roles cannot be deleted.", variant: "destructive" });
            return;
        }
        try {
            await deleteRole(role.id);
            toast({ title: "Role Deleted", description: `"${role.name}" has been removed.` });
            await loadData();
        } catch (err: any) {
            toast({ title: "Error", description: err?.response?.data?.message || "Failed to delete role.", variant: "destructive" });
        }
    };

    const handleDuplicateRole = async (role: ApiRole) => {
        try {
            const permIds = (role.permissions || []).map((p) => p.id);
            await createRole({ name: `${role.name} (Copy)`, description: role.description || undefined, permissionIds: permIds });
            toast({ title: "Role Duplicated", description: `Copy of "${role.name}" created.` });
            await loadData();
        } catch (err: any) {
            toast({ title: "Error", description: err?.response?.data?.message || "Failed to duplicate role.", variant: "destructive" });
        }
    };

    const handleTogglePermission = (moduleId: string, action: string) => {
        setEditedPerms((prev) => {
            const current = prev[moduleId] || [];
            const has = current.includes(action);
            return {
                ...prev,
                [moduleId]: has ? current.filter((a) => a !== action) : [...current, action],
            };
        });
    };

    const handleSaveMatrix = async () => {
        setSavingMatrix(true);
        try {
            // Convert editedPerms {module: [actions]} back to permissionIds
            const permIds: string[] = [];
            for (const [mod, actions] of Object.entries(editedPerms)) {
                for (const action of actions) {
                    const perm = allPermissions.find((p) => p.module === mod && p.action === action);
                    if (perm) permIds.push(perm.id);
                }
            }
            await updateRole(matrixRole, { permissionIds: permIds });
            toast({ title: "Permissions Saved", description: "Permission matrix updated successfully." });
            await loadData();
        } catch (err: any) {
            toast({ title: "Error", description: err?.response?.data?.message || "Failed to save permissions.", variant: "destructive" });
        } finally {
            setSavingMatrix(false);
        }
    };

    const handleChangeUserRole = async (employeeId: string, roleId: string) => {
        try {
            await updateEmployee(employeeId, { roleId });
            toast({ title: "Role Updated", description: "Employee role has been changed." });
            await loadData();
        } catch (err: any) {
            toast({ title: "Error", description: err?.response?.data?.message || "Failed to update role.", variant: "destructive" });
        }
    };

    const handleToggleUserStatus = async (employeeId: string) => {
        const emp = employees.find((e) => e.id === employeeId);
        if (!emp) return;
        try {
            await updateEmployee(employeeId, { isActive: !emp.isActive });
            const action = emp.isActive ? "suspended" : "activated";
            toast({ title: `Employee ${action.charAt(0).toUpperCase() + action.slice(1)}`, description: `${emp.user?.firstName} ${emp.user?.lastName} has been ${action}.` });
            await loadData();
        } catch (err: any) {
            toast({ title: "Error", description: err?.response?.data?.message || "Failed to update status.", variant: "destructive" });
        }
    };

    const handleExport = () => {
        toast({ title: "Export Started", description: "Exporting roles and permissions as CSV…" });
    };

    // ============================================
    // DERIVED DATA
    // ============================================

    const moduleGroups = groupByModule(allPermissions);
    const moduleNames = SALES_CRM_PERMISSION_MODULES.filter((moduleName) => Boolean(moduleGroups[moduleName]));
    const visiblePermissionCount = moduleNames.reduce(
        (total, moduleName) => total + CRUD_ACTIONS.filter((action) => (editedPerms[moduleName] || []).includes(action)).length,
        0,
    );
    const currentMatrixRole = roles.find((r) => r.id === matrixRole);

    const filteredEmployees = employees.filter((e) => {
        if (userRoleFilter !== "all" && e.role?.name !== userRoleFilter) return false;
        if (userSearch) {
            const q = userSearch.toLowerCase();
            const name = `${e.user?.firstName || ""} ${e.user?.lastName || ""}`.toLowerCase();
            const email = (e.user?.email || "").toLowerCase();
            if (!name.includes(q) && !email.includes(q)) return false;
        }
        return true;
    });

    // ============================================
    // RENDER
    // ============================================

    if (loading) {
        return (
            <div className="flex min-h-screen bg-[#F8FAFC] items-center justify-center">
                <div className="flex items-center gap-3 text-[#94A3B8]">
                    <Loader2 size={24} className="animate-spin" />
                    <span className="text-sm font-medium">Loading roles…</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#F8FAFC]">
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Header */}
                <header className="crm-module-header bg-white border-b border-[rgba(15,23,42,0.06)] px-6 py-4 flex-shrink-0">
                    <div className="crm-toolbar-row">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#0891B2]/10 flex items-center justify-center">
                                <Shield size={20} className="text-[#0891B2]" />
                            </div>
                            <div className="crm-toolbar-meta">
                                <h1 className="crm-toolbar-title">Roles & Permissions</h1>
                                <p className="crm-toolbar-copy">Manage access control and team permissions</p>
                            </div>
                        </div>
                        <div className="crm-toolbar-actions">
                            <button onClick={handleExport} className="crm-toolbar-button crm-toolbar-button-secondary">
                                <Download size={14} /> Export
                            </button>
                            <button onClick={() => { setShowRoleForm(true); setActiveTab("roles"); }} className="crm-toolbar-button crm-toolbar-button-primary">
                                <Plus size={14} /> New Role
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="mt-4 flex items-center gap-1 overflow-x-auto border-b border-[rgba(15,23,42,0.06)] -mb-4 -mx-6 px-6">
                        {rolesTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                                    activeTab === tab.id
                                        ? "border-[#0891B2] text-[#0891B2]"
                                        : "border-transparent text-[#475569] hover:text-[#0F172A]"
                                )}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 p-6 overflow-auto">
                    <div className="max-w-7xl mx-auto space-y-6 page-enter">

                        {/* ====================== ROLES ====================== */}
                        {activeTab === "roles" && (
                            <>
                                {/* Create Role Form */}
                                {showRoleForm && (
                                    <div className="bg-white rounded-lg card-shadow p-6">
                                        <h3 className="font-semibold text-[#0F172A] mb-4">Create New Role</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-medium text-[#475569] mb-1 block">Role Name *</label>
                                                <input className="w-full h-9 px-3 rounded-lg border border-[rgba(15,23,42,0.12)] bg-[#F8FAFC] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20" placeholder="e.g. Account Executive" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-[#475569] mb-1 block">Description</label>
                                                <input className="w-full h-9 px-3 rounded-lg border border-[rgba(15,23,42,0.12)] bg-[#F8FAFC] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20" placeholder="Brief role description" value={newRoleDesc} onChange={(e) => setNewRoleDesc(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-4">
                                            <button onClick={handleCreateRole} className="flex items-center gap-2 px-4 py-2 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90">
                                                <Plus size={14} /> Create Role
                                            </button>
                                            <button onClick={() => setShowRoleForm(false)} className="px-4 py-2 border border-[rgba(15,23,42,0.12)] text-[#475569] rounded-lg text-sm font-medium hover:bg-[#F8FAFC]">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Role Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {roles.map((role) => {
                                        const permCount = (role.permissions || []).length;
                                        const maxPerms = allPermissions.length;
                                        const color = ROLE_COLORS[role.name] || "#0891B2";
                                        const usersCount = role.employeesCount || 0;
                                        return (
                                            <div key={role.id} className="bg-white rounded-lg card-shadow p-5 hover:shadow-md transition-shadow">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                                                        <h4 className="font-semibold text-sm text-[#0F172A]">{role.name}</h4>
                                                        {role.isSystemRole && <span className="px-1.5 py-0.5 rounded bg-[#0891B2]/10 text-[#0891B2] text-[9px] font-bold uppercase">System</span>}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-[#94A3B8] mb-3">{role.description || "No description"}</p>

                                                {/* Permission count bar */}
                                                <div className="mb-3">
                                                    <div className="flex justify-between text-[10px] mb-1">
                                                        <span className="text-[#94A3B8]">Permissions</span>
                                                        <span className="text-[#0F172A] font-medium">{permCount}/{maxPerms}</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full" style={{ width: `${maxPerms > 0 ? (permCount / maxPerms) * 100 : 0}%`, backgroundColor: color }} />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between text-[10px] text-[#94A3B8] mb-3">
                                                    <span>{usersCount} user{usersCount !== 1 ? "s" : ""} assigned</span>
                                                    <span>Created {new Date(role.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                                </div>

                                                <div className="flex items-center gap-1.5 pt-3 border-t border-[rgba(15,23,42,0.06)]">
                                                    <button onClick={() => { setMatrixRole(role.id); setActiveTab("permissions"); }} className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-[#0891B2] bg-[#0891B2]/10 rounded-lg hover:bg-[#0891B2]/20">
                                                        <Lock size={11} /> Permissions
                                                    </button>
                                                    <button onClick={() => handleDuplicateRole(role)} className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-[#475569] border border-[rgba(15,23,42,0.12)] rounded-lg hover:bg-[#F8FAFC]">
                                                        <Copy size={11} /> Duplicate
                                                    </button>
                                                    {!role.isSystemRole && (
                                                        <button onClick={() => handleDeleteRole(role)} className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-[#DC2626] border border-[#DC2626]/20 rounded-lg hover:bg-[#DC2626]/5 ml-auto">
                                                            <Trash2 size={11} /> Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {/* ====================== PERMISSION MATRIX ====================== */}
                        {activeTab === "permissions" && (
                            <>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-[#0F172A]">Permission Matrix</h3>
                                        <p className="text-xs text-[#94A3B8] mt-0.5">Configure granular CRUD permissions for each module</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select className="h-9 px-3 rounded-lg border border-[rgba(15,23,42,0.12)] bg-[#F8FAFC] text-sm text-[#475569] focus:outline-none" value={matrixRole} onChange={(e) => setMatrixRole(e.target.value)}>
                                            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                        <button onClick={handleSaveMatrix} disabled={savingMatrix} className="flex items-center gap-2 px-4 py-2 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90 disabled:opacity-50">
                                            {savingMatrix ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save Changes
                                        </button>
                                    </div>
                                </div>

                                {currentMatrixRole && (
                                    <div className="bg-white rounded-lg card-shadow overflow-hidden">
                                        {isMobile ? (
                                            <div className="space-y-3 p-4">
                                                {moduleNames.map((mod) => {
                                                    const perms = editedPerms[mod] || [];
                                                    return (
                                                        <div key={mod} className="rounded-2xl border border-[rgba(15,23,42,0.06)] p-4">
                                                            <div className="mb-3 flex items-center gap-2">
                                                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: MODULE_COLORS[mod] || "#94A3B8" }} />
                                                                <span className="font-medium text-[#0F172A]">{MODULE_LABELS[mod] || mod.replace(/-/g, " ")}</span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {CRUD_ACTIONS.map((action) => (
                                                                    <button
                                                                        key={action}
                                                                        disabled={!moduleGroups[mod]?.some((permission) => permission.action === action)}
                                                                        onClick={() => handleTogglePermission(mod, action)}
                                                                        className={cn(
                                                                            "flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-medium capitalize",
                                                                            !moduleGroups[mod]?.some((permission) => permission.action === action) && "cursor-not-allowed opacity-40",
                                                                            perms.includes(action)
                                                                                ? "border-[#0891B2]/20 bg-[#0891B2] text-white"
                                                                                : "border-[rgba(15,23,42,0.08)] bg-[#F8FAFC] text-[#475569]"
                                                                        )}
                                                                    >
                                                                        <span>{action === "update" ? "edit" : action}</span>
                                                                        {perms.includes(action) ? <Check size={13} /> : <X size={13} />}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                        ) : (
                                            <div className="responsive-table overflow-x-auto">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="bg-[#F8FAFC] border-b border-[rgba(15,23,42,0.08)]">
                                                            <th className="text-left py-3 px-4 text-[#475569] font-semibold w-48">Module</th>
                                                            <th className="text-center py-3 px-4 text-[#475569] font-semibold">View</th>
                                                            <th className="text-center py-3 px-4 text-[#475569] font-semibold">Create</th>
                                                            <th className="text-center py-3 px-4 text-[#475569] font-semibold">Edit / Update</th>
                                                            <th className="text-center py-3 px-4 text-[#475569] font-semibold">Delete</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {moduleNames.map((mod) => {
                                                            const perms = editedPerms[mod] || [];
                                                            return (
                                                                <tr key={mod} className="border-b border-[rgba(15,23,42,0.04)] hover:bg-[#F8FAFC]">
                                                                    <td className="py-3 px-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MODULE_COLORS[mod] || "#94A3B8" }} />
                                                                            <span className="font-medium text-[#0F172A]">{MODULE_LABELS[mod] || mod.replace(/-/g, " ")}</span>
                                                                        </div>
                                                                    </td>
                                                                    {CRUD_ACTIONS.map((action) => (
                                                                        <td key={action} className="py-3 px-4 text-center">
                                                                            <button
                                                                                disabled={!moduleGroups[mod]?.some((permission) => permission.action === action)}
                                                                                onClick={() => handleTogglePermission(mod, action)}
                                                                                className={cn(
                                                                                    "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                                                                                    !moduleGroups[mod]?.some((permission) => permission.action === action) && "cursor-not-allowed opacity-40",
                                                                                    perms.includes(action)
                                                                                        ? "bg-[#0891B2] text-white"
                                                                                        : "bg-[#F1F5F9] text-[#CBD5E1] hover:bg-[#E2E8F0]"
                                                                                )}
                                                                            >
                                                                                {perms.includes(action) ? <Check size={14} /> : <X size={14} />}
                                                                            </button>
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                        <div className="px-4 py-3 bg-[#F8FAFC] border-t border-[rgba(15,23,42,0.06)] flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                                            <span className="text-[#94A3B8]">
                                                <strong className="text-[#0F172A]">{visiblePermissionCount}</strong> permissions active across <strong className="text-[#0F172A]">{moduleNames.length}</strong> Sales CRM modules
                                            </span>
                                            {currentMatrixRole.isSystemRole && (
                                                <span className="flex items-center gap-1 text-[#D97706]">
                                                    <Info size={12} /> Default role — review changes carefully
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Permission Legend */}
                                <div className="bg-white rounded-lg card-shadow p-5">
                                    <h4 className="font-semibold text-sm text-[#0F172A] mb-3">Permission Levels</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {[
                                            { perm: "View", desc: "Read-only access to view records & data in the module", color: "#0891B2" },
                                            { perm: "Create", desc: "Ability to create new records, entries, or configurations", color: "#16A34A" },
                                            { perm: "Edit / Update", desc: "Ability to modify existing records and update fields", color: "#D97706" },
                                            { perm: "Delete", desc: "Ability to permanently remove records (most restrictive)", color: "#DC2626" },
                                        ].map((item) => (
                                            <div key={item.perm} className="p-3 rounded-lg border border-[rgba(15,23,42,0.06)]">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                                    <span className="text-xs font-semibold text-[#0F172A]">{item.perm}</span>
                                                </div>
                                                <p className="text-[10px] text-[#94A3B8]">{item.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ====================== USER ASSIGNMENTS ====================== */}
                        {activeTab === "users" && (
                            <>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-[#0F172A]">User Assignments</h3>
                                        <p className="text-xs text-[#94A3B8] mt-0.5">Manage role assignments and user access</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                                            <input className="h-9 pl-9 pr-3 rounded-lg border border-[rgba(15,23,42,0.12)] bg-[#F8FAFC] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 w-52" placeholder="Search users…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                                        </div>
                                        <select className="h-9 px-3 rounded-lg border border-[rgba(15,23,42,0.12)] bg-[#F8FAFC] text-xs text-[#475569] focus:outline-none" value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)}>
                                            <option value="all">All Roles</option>
                                            {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg card-shadow overflow-hidden">
                                    {isMobile ? (
                                        <div className="space-y-3 p-4">
                                            {filteredEmployees.map((emp) => {
                                                const initials = `${(emp.user?.firstName || "?")[0]}${(emp.user?.lastName || "?")[0]}`.toUpperCase();
                                                const status = emp.isActive ? "active" : "suspended";
                                                return (
                                                    <div key={emp.id} className="rounded-2xl border border-[rgba(15,23,42,0.06)] p-4">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0891B2]/10 text-[10px] font-bold text-[#0891B2]">{initials}</div>
                                                                <div>
                                                                    <p className="font-medium text-[#0F172A]">{emp.user?.firstName} {emp.user?.lastName}</p>
                                                                    <p className="text-xs text-[#94A3B8]">{emp.user?.email}</p>
                                                                </div>
                                                            </div>
                                                            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold",
                                                                status === "active" ? "bg-[#16A34A]/10 text-[#16A34A]" : "bg-[#DC2626]/10 text-[#DC2626]"
                                                            )}>
                                                                {status === "active" ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                                            </span>
                                                        </div>
                                                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                                                            <div className="rounded-xl bg-[#F8FAFC] p-3">
                                                                <p className="text-[#94A3B8]">Department</p>
                                                                <p className="mt-1 font-medium text-[#0F172A]">{emp.department || emp.position || "—"}</p>
                                                            </div>
                                                            <div className="rounded-xl bg-[#F8FAFC] p-3">
                                                                <p className="text-[#94A3B8]">Last Login</p>
                                                                <p className="mt-1 font-medium text-[#0F172A]">{emp.user?.lastLoginAt ? new Date(emp.user.lastLoginAt).toLocaleDateString() : "Never"}</p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 space-y-2">
                                                            <select
                                                                className="h-10 w-full rounded-xl border border-[rgba(15,23,42,0.12)] bg-[#F8FAFC] px-3 text-sm text-[#475569] focus:outline-none"
                                                                value={emp.role?.id || ""}
                                                                onChange={(e) => handleChangeUserRole(emp.id, e.target.value)}
                                                            >
                                                                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                            </select>
                                                            <button onClick={() => handleToggleUserStatus(emp.id)} className={cn("w-full rounded-xl px-3 py-2 text-sm font-medium",
                                                                emp.isActive ? "text-[#DC2626] border border-[#DC2626]/20 hover:bg-[#DC2626]/5" : "text-[#16A34A] border border-[#16A34A]/20 hover:bg-[#16A34A]/5"
                                                            )}>
                                                                {emp.isActive ? "Suspend" : "Activate"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                    <div className="responsive-table overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-[#F8FAFC] border-b border-[rgba(15,23,42,0.08)]">
                                                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">User</th>
                                                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Department</th>
                                                    <th className="text-center py-3 px-4 text-[#94A3B8] font-medium">Role</th>
                                                    <th className="text-center py-3 px-4 text-[#94A3B8] font-medium">Status</th>
                                                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Last Login</th>
                                                    <th className="text-center py-3 px-4 text-[#94A3B8] font-medium">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredEmployees.map((emp) => {
                                                    const initials = `${(emp.user?.firstName || "?")[0]}${(emp.user?.lastName || "?")[0]}`.toUpperCase();
                                                    const status = emp.isActive ? "active" : "suspended";
                                                    return (
                                                        <tr key={emp.id} className="border-b border-[rgba(15,23,42,0.04)] hover:bg-[#F8FAFC]">
                                                            <td className="py-3 px-4">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-8 h-8 rounded-full bg-[#0891B2]/10 flex items-center justify-center text-[10px] font-bold text-[#0891B2]">{initials}</div>
                                                                    <div>
                                                                        <p className="font-medium text-[#0F172A]">{emp.user?.firstName} {emp.user?.lastName}</p>
                                                                        <p className="text-[10px] text-[#94A3B8]">{emp.user?.email}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 text-[#475569]">{emp.department || emp.position || "—"}</td>
                                                            <td className="py-3 px-4 text-center">
                                                                <select
                                                                    className="h-7 px-2 rounded border border-[rgba(15,23,42,0.12)] bg-[#F8FAFC] text-[10px] text-[#475569] focus:outline-none"
                                                                    value={emp.role?.id || ""}
                                                                    onChange={(e) => handleChangeUserRole(emp.id, e.target.value)}
                                                                >
                                                                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                                </select>
                                                            </td>
                                                            <td className="py-3 px-4 text-center">
                                                                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                                                                    status === "active" ? "bg-[#16A34A]/10 text-[#16A34A]" : "bg-[#DC2626]/10 text-[#DC2626]"
                                                                )}>
                                                                    {status === "active" ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-[#94A3B8]">
                                                                {emp.user?.lastLoginAt ? new Date(emp.user.lastLoginAt).toLocaleDateString() : "Never"}
                                                            </td>
                                                            <td className="py-3 px-4 text-center">
                                                                <button onClick={() => handleToggleUserStatus(emp.id)} className={cn("px-2.5 py-1 rounded-lg text-[10px] font-medium",
                                                                    emp.isActive ? "text-[#DC2626] border border-[#DC2626]/20 hover:bg-[#DC2626]/5" : "text-[#16A34A] border border-[#16A34A]/20 hover:bg-[#16A34A]/5"
                                                                )}>
                                                                    {emp.isActive ? "Suspend" : "Activate"}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    )}
                                    {filteredEmployees.length === 0 && (
                                        <p className="text-center text-sm text-[#94A3B8] py-8">No users match your search criteria.</p>
                                    )}
                                </div>
                            </>
                        )}

                        {/* ====================== AUDIT LOG ====================== */}
                        {activeTab === "audit" && (
                            <>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-[#0F172A]">Permission Audit Log</h3>
                                        <p className="text-xs text-[#94A3B8] mt-0.5">Track all role and permission changes</p>
                                    </div>
                                    <button onClick={handleExport} className="flex items-center gap-2 h-9 px-4 border border-[rgba(15,23,42,0.12)] bg-white text-[#475569] rounded-lg text-sm font-medium hover:bg-[#F8FAFC]">
                                        <Download size={14} /> Export Log
                                    </button>
                                </div>

                                <div className="bg-white rounded-lg card-shadow p-8 text-center">
                                    <Info size={32} className="mx-auto text-[#94A3B8] mb-3" />
                                    <h4 className="text-sm font-semibold text-[#0F172A] mb-1">Audit Log</h4>
                                    <p className="text-xs text-[#94A3B8]">Permission change history is tracked via the Activity Log system. Check the activity logs for role and permission change history.</p>
                                </div>
                            </>
                        )}

                    </div>
                </main>
            </div>
        </div>
    );
}
