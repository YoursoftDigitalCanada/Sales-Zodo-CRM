import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
    Shield, Plus, Search, CheckCircle2, XCircle, Clock,
    ArrowUpRight, Copy, Trash2, Pencil, Lock, Users,
    MoreHorizontal, Download, ChevronDown, Check, X, Info,
} from "lucide-react";
import {
    rolesTabs, permissionModules, defaultRoles, roleUsers, auditLog,
    type RolesTab, type Role,
} from "./data";

export default function RolesPage() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState<RolesTab>("roles");
    const { toast } = useToast();

    // Roles state
    const [roles, setRoles] = useState(defaultRoles);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [showRoleForm, setShowRoleForm] = useState(false);
    const [newRoleName, setNewRoleName] = useState("");
    const [newRoleDesc, setNewRoleDesc] = useState("");

    // Users state
    const [users, setUsers] = useState(roleUsers);
    const [userSearch, setUserSearch] = useState("");
    const [userRoleFilter, setUserRoleFilter] = useState("all");

    // Permission matrix state
    const [matrixRole, setMatrixRole] = useState(roles[0]?.id || "");

    const filteredUsers = users.filter((u) => {
        if (userRoleFilter !== "all" && u.role !== userRoleFilter) return false;
        if (userSearch && !u.name.toLowerCase().includes(userSearch.toLowerCase()) && !u.email.toLowerCase().includes(userSearch.toLowerCase())) return false;
        return true;
    });

    const currentMatrixRole = roles.find((r) => r.id === matrixRole);

    // Handlers
    const handleCreateRole = () => {
        if (!newRoleName.trim()) {
            toast({ title: "Error", description: "Role name is required.", variant: "destructive" });
            return;
        }
        const newRole: Role = {
            id: `r${Date.now()}`,
            name: newRoleName,
            description: newRoleDesc,
            color: "#0891B2",
            usersCount: 0,
            isSystem: false,
            createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            permissions: Object.fromEntries(permissionModules.map((m) => [m.id, ["view"] as ("view" | "create" | "edit" | "delete")[]])),
        };
        setRoles((prev) => [...prev, newRole]);
        setNewRoleName("");
        setNewRoleDesc("");
        setShowRoleForm(false);
        toast({ title: "Role Created", description: `"${newRoleName}" has been created with default view permissions.` });
    };

    const handleDeleteRole = (role: Role) => {
        if (role.isSystem) {
            toast({ title: "Cannot Delete", description: "System roles cannot be deleted.", variant: "destructive" });
            return;
        }
        setRoles((prev) => prev.filter((r) => r.id !== role.id));
        if (selectedRole?.id === role.id) setSelectedRole(null);
        toast({ title: "Role Deleted", description: `"${role.name}" has been removed.` });
    };

    const handleDuplicateRole = (role: Role) => {
        const dup: Role = {
            ...role,
            id: `r${Date.now()}`,
            name: `${role.name} (Copy)`,
            isSystem: false,
            usersCount: 0,
            createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        };
        setRoles((prev) => [...prev, dup]);
        toast({ title: "Role Duplicated", description: `"${dup.name}" created as a copy of "${role.name}".` });
    };

    const handleTogglePermission = (roleId: string, moduleId: string, perm: "view" | "create" | "edit" | "delete") => {
        setRoles((prev) =>
            prev.map((r) => {
                if (r.id !== roleId) return r;
                const current = r.permissions[moduleId] || [];
                const has = current.includes(perm);
                return {
                    ...r,
                    permissions: {
                        ...r.permissions,
                        [moduleId]: has ? current.filter((p) => p !== perm) : [...current, perm],
                    },
                };
            })
        );
    };

    const handleChangeUserRole = (userId: string, newRole: string) => {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
        toast({ title: "Role Updated", description: `User role changed to "${newRole}".` });
    };

    const handleToggleUserStatus = (userId: string) => {
        setUsers((prev) => prev.map((u) => {
            if (u.id !== userId) return u;
            const next = u.status === "active" ? "suspended" : "active";
            return { ...u, status: next as any };
        }));
        const user = users.find((u) => u.id === userId);
        const action = user?.status === "active" ? "suspended" : "reactivated";
        toast({ title: `User ${action.charAt(0).toUpperCase() + action.slice(1)}`, description: `${user?.name} has been ${action}.` });
    };

    const handleExport = () => {
        toast({ title: "Export Started", description: "Exporting roles and permissions as CSV…" });
    };

    const handleSaveMatrix = () => {
        toast({ title: "Permissions Saved", description: "Permission matrix has been updated successfully." });
    };

    return (
        <div className="flex h-screen bg-[#F8FAFC]">
            <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-[rgba(15,23,42,0.06)] px-6 py-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#0891B2]/10 flex items-center justify-center">
                                <Shield size={20} className="text-[#0891B2]" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-[#0F172A]">Roles & Permissions</h1>
                                <p className="text-sm text-[#475569] mt-0.5">Manage access control and team permissions</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleExport} className="flex items-center gap-2 h-9 px-4 border border-[rgba(15,23,42,0.12)] bg-white text-[#475569] rounded-lg text-sm font-medium hover:bg-[#F8FAFC]">
                                <Download size={14} /> Export
                            </button>
                            <button onClick={() => { setShowRoleForm(true); setActiveTab("roles"); }} className="flex items-center gap-2 h-9 px-4 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90">
                                <Plus size={14} /> New Role
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-1 mt-4 border-b border-[rgba(15,23,42,0.06)] -mb-4 -mx-6 px-6">
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
                                        const totalPerms = Object.values(role.permissions).reduce((s, arr) => s + arr.length, 0);
                                        const maxPerms = permissionModules.length * 4;
                                        return (
                                            <div key={role.id} className="bg-white rounded-lg card-shadow p-5 hover:shadow-md transition-shadow">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} />
                                                        <h4 className="font-semibold text-sm text-[#0F172A]">{role.name}</h4>
                                                        {role.isSystem && <span className="px-1.5 py-0.5 rounded bg-[#0891B2]/10 text-[#0891B2] text-[9px] font-bold uppercase">System</span>}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-[#94A3B8] mb-3">{role.description}</p>

                                                {/* Permission count bar */}
                                                <div className="mb-3">
                                                    <div className="flex justify-between text-[10px] mb-1">
                                                        <span className="text-[#94A3B8]">Permissions</span>
                                                        <span className="text-[#0F172A] font-medium">{totalPerms}/{maxPerms}</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full" style={{ width: `${(totalPerms / maxPerms) * 100}%`, backgroundColor: role.color }} />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between text-[10px] text-[#94A3B8] mb-3">
                                                    <span>{role.usersCount} user{role.usersCount !== 1 ? "s" : ""} assigned</span>
                                                    <span>Created {role.createdAt}</span>
                                                </div>

                                                <div className="flex items-center gap-1.5 pt-3 border-t border-[rgba(15,23,42,0.06)]">
                                                    <button onClick={() => { setSelectedRole(role); setActiveTab("permissions"); setMatrixRole(role.id); }} className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-[#0891B2] bg-[#0891B2]/10 rounded-lg hover:bg-[#0891B2]/20">
                                                        <Lock size={11} /> Permissions
                                                    </button>
                                                    <button onClick={() => handleDuplicateRole(role)} className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-[#475569] border border-[rgba(15,23,42,0.12)] rounded-lg hover:bg-[#F8FAFC]">
                                                        <Copy size={11} /> Duplicate
                                                    </button>
                                                    {!role.isSystem && (
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
                                        <button onClick={handleSaveMatrix} className="flex items-center gap-2 px-4 py-2 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90">
                                            <Check size={14} /> Save Changes
                                        </button>
                                    </div>
                                </div>

                                {currentMatrixRole && (
                                    <div className="bg-white rounded-lg card-shadow overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-[#F8FAFC] border-b border-[rgba(15,23,42,0.08)]">
                                                        <th className="text-left py-3 px-4 text-[#475569] font-semibold w-48">Module</th>
                                                        <th className="text-center py-3 px-4 text-[#475569] font-semibold">View</th>
                                                        <th className="text-center py-3 px-4 text-[#475569] font-semibold">Create</th>
                                                        <th className="text-center py-3 px-4 text-[#475569] font-semibold">Edit</th>
                                                        <th className="text-center py-3 px-4 text-[#475569] font-semibold">Delete</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {permissionModules.map((mod) => {
                                                        const perms = currentMatrixRole.permissions[mod.id] || [];
                                                        return (
                                                            <tr key={mod.id} className="border-b border-[rgba(15,23,42,0.04)] hover:bg-[#F8FAFC]">
                                                                <td className="py-3 px-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <mod.icon size={14} className="text-[#94A3B8]" />
                                                                        <span className="font-medium text-[#0F172A]">{mod.name}</span>
                                                                    </div>
                                                                </td>
                                                                {(["view", "create", "edit", "delete"] as const).map((p) => (
                                                                    <td key={p} className="py-3 px-4 text-center">
                                                                        <button
                                                                            onClick={() => handleTogglePermission(currentMatrixRole.id, mod.id, p)}
                                                                            className={cn(
                                                                                "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                                                                                perms.includes(p)
                                                                                    ? "bg-[#0891B2] text-white"
                                                                                    : "bg-[#F1F5F9] text-[#CBD5E1] hover:bg-[#E2E8F0]"
                                                                            )}
                                                                        >
                                                                            {perms.includes(p) ? <Check size={14} /> : <X size={14} />}
                                                                        </button>
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        {/* Summary */}
                                        <div className="px-4 py-3 bg-[#F8FAFC] border-t border-[rgba(15,23,42,0.06)] flex items-center justify-between text-xs">
                                            <span className="text-[#94A3B8]">
                                                <strong className="text-[#0F172A]">{Object.values(currentMatrixRole.permissions).reduce((s, a) => s + a.length, 0)}</strong> permissions active across <strong className="text-[#0F172A]">{permissionModules.length}</strong> modules
                                            </span>
                                            {currentMatrixRole.isSystem && (
                                                <span className="flex items-center gap-1 text-[#D97706]">
                                                    <Info size={12} /> System role — changes apply globally
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
                                            { perm: "Edit", desc: "Ability to modify existing records and update fields", color: "#D97706" },
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
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-[#F8FAFC] border-b border-[rgba(15,23,42,0.08)]">
                                                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">User</th>
                                                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Department</th>
                                                    <th className="text-center py-3 px-4 text-[#94A3B8] font-medium">Role</th>
                                                    <th className="text-center py-3 px-4 text-[#94A3B8] font-medium">Status</th>
                                                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Last Active</th>
                                                    <th className="text-center py-3 px-4 text-[#94A3B8] font-medium">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredUsers.map((user) => (
                                                    <tr key={user.id} className="border-b border-[rgba(15,23,42,0.04)] hover:bg-[#F8FAFC]">
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-full bg-[#0891B2]/10 flex items-center justify-center text-[10px] font-bold text-[#0891B2]">{user.avatar}</div>
                                                                <div>
                                                                    <p className="font-medium text-[#0F172A]">{user.name}</p>
                                                                    <p className="text-[10px] text-[#94A3B8]">{user.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 text-[#475569]">{user.department}</td>
                                                        <td className="py-3 px-4 text-center">
                                                            <select
                                                                className="h-7 px-2 rounded border border-[rgba(15,23,42,0.12)] bg-[#F8FAFC] text-[10px] text-[#475569] focus:outline-none"
                                                                value={user.role}
                                                                onChange={(e) => handleChangeUserRole(user.id, e.target.value)}
                                                            >
                                                                {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                                                            </select>
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                                                                user.status === "active" ? "bg-[#16A34A]/10 text-[#16A34A]" :
                                                                    user.status === "invited" ? "bg-[#D97706]/10 text-[#D97706]" : "bg-[#DC2626]/10 text-[#DC2626]"
                                                            )}>
                                                                {user.status === "active" ? <CheckCircle2 size={10} /> : user.status === "invited" ? <Clock size={10} /> : <XCircle size={10} />}
                                                                {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-[#94A3B8]">{user.lastActive}</td>
                                                        <td className="py-3 px-4 text-center">
                                                            <button onClick={() => handleToggleUserStatus(user.id)} className={cn("px-2.5 py-1 rounded-lg text-[10px] font-medium",
                                                                user.status === "active" ? "text-[#DC2626] border border-[#DC2626]/20 hover:bg-[#DC2626]/5" : "text-[#16A34A] border border-[#16A34A]/20 hover:bg-[#16A34A]/5"
                                                            )}>
                                                                {user.status === "active" ? "Suspend" : "Activate"}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {filteredUsers.length === 0 && (
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

                                <div className="bg-white rounded-lg card-shadow overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-[#F8FAFC] border-b border-[rgba(15,23,42,0.08)]">
                                                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">User</th>
                                                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Action</th>
                                                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Target</th>
                                                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Details</th>
                                                    <th className="text-right py-3 px-4 text-[#94A3B8] font-medium">Time</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {auditLog.map((entry) => (
                                                    <tr key={entry.id} className="border-b border-[rgba(15,23,42,0.04)] hover:bg-[#F8FAFC]">
                                                        <td className="py-3 px-4 font-medium text-[#0F172A]">{entry.user}</td>
                                                        <td className="py-3 px-4">
                                                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold",
                                                                entry.action.includes("Created") || entry.action.includes("Assigned") || entry.action.includes("Reactivated") || entry.action.includes("Invite") ? "bg-[#16A34A]/10 text-[#16A34A]" :
                                                                    entry.action.includes("Updated") ? "bg-[#D97706]/10 text-[#D97706]" :
                                                                        entry.action.includes("Deleted") || entry.action.includes("Suspended") ? "bg-[#DC2626]/10 text-[#DC2626]" : "bg-[#0891B2]/10 text-[#0891B2]"
                                                            )}>
                                                                {entry.action}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-[#475569] font-medium">{entry.target}</td>
                                                        <td className="py-3 px-4 text-[#94A3B8] max-w-[280px] truncate">{entry.details}</td>
                                                        <td className="py-3 px-4 text-right text-[#94A3B8]">{entry.timestamp}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}

                    </div>
                </main>
            </div>
        </div>
    );
}
