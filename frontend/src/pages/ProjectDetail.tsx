import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
import {
    Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { getProjectById } from "@/features/projects/services/projects-service";
import { getTasks, createTask } from "@/features/tasks/services/tasks-service";
import { getEmployees } from "@/features/users/services/users-service";
import { getFiles } from "@/features/files/services/files-service";
import {
    ArrowLeft, Calendar, DollarSign, Users, FileText, CheckSquare, Loader2,
    Clock, TrendingUp, Building2, FolderOpen, ListTodo, BarChart3, Pencil,
    Hash, Download, Briefcase, Target, Timer, Plus, AlertTriangle
} from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

// Status config
const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    DRAFT: { label: "Draft", color: "text-slate-700", bg: "bg-slate-100" },
    PENDING: { label: "Pending", color: "text-amber-700", bg: "bg-amber-100" },
    APPROVED: { label: "Approved", color: "text-blue-700", bg: "bg-blue-100" },
    SCHEDULED: { label: "Scheduled", color: "text-indigo-700", bg: "bg-indigo-100" },
    ACTIVE: { label: "Active", color: "text-[#0891B2]", bg: "bg-[#0891B2]/10" },
    PLANNING: { label: "Planning", color: "text-purple-700", bg: "bg-purple-100" },
    NOT_STARTED: { label: "Not Started", color: "text-slate-700", bg: "bg-slate-100" },
    IN_PROGRESS: { label: "In Progress", color: "text-blue-700", bg: "bg-blue-100" },
    ON_HOLD: { label: "On Hold", color: "text-amber-700", bg: "bg-amber-100" },
    COMPLETED: { label: "Completed", color: "text-green-700", bg: "bg-green-100" },
    CANCELLED: { label: "Cancelled", color: "text-red-700", bg: "bg-red-100" },
    WARRANTY_WORK: { label: "Warranty Work", color: "text-violet-700", bg: "bg-violet-100" },
};

const getProgressColor = (v: number) =>
    v >= 75 ? "bg-emerald-500" : v >= 50 ? "bg-blue-500" : v >= 25 ? "bg-amber-500" : "bg-slate-400";

const getInitials = (first?: string, last?: string) =>
    `${(first || "")[0] || ""}${(last || "")[0] || ""}`.toUpperCase() || "?";

const ProjectDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [project, setProject] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [files, setFiles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [loadingFiles, setLoadingFiles] = useState(false);

    // Add Task dialog state
    const [showAddTask, setShowAddTask] = useState(false);
    const [creatingTask, setCreatingTask] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [newTask, setNewTask] = useState({
        title: "",
        description: "",
        priority: "MEDIUM",
        status: "TODO",
        dueDate: "",
        assignedToId: "none",
    });

    const fetchProject = useCallback(async () => {
        if (!id) return;
        try {
            setIsLoading(true);
            const data = await getProjectById(id);
            setProject(data);
        } catch (error) {
            console.error("Error fetching project:", error);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    const fetchTasks = useCallback(async () => {
        if (!id) return;
        try {
            setLoadingTasks(true);
            const data = await getTasks({ projectId: id, limit: 100 }) as any[];
            setTasks(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        } finally {
            setLoadingTasks(false);
        }
    }, [id]);

    const fetchFiles = useCallback(async () => {
        if (!id) return;
        try {
            setLoadingFiles(true);
            const data = await getFiles({ projectId: id, limit: 100 });
            setFiles(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching files:", error);
        } finally {
            setLoadingFiles(false);
        }
    }, [id]);

    useEffect(() => {
        fetchProject();
        fetchTasks();
        fetchFiles();
    }, [fetchProject, fetchTasks, fetchFiles]);

    useEffect(() => {
        getEmployees().then((data: any[]) => setEmployees(data || [])).catch(() => { });
    }, []);

    const handleCreateTask = async () => {
        if (!newTask.title.trim()) return;
        setCreatingTask(true);
        try {
            await createTask({
                title: newTask.title.trim(),
                description: newTask.description.trim() || null,
                priority: newTask.priority,
                status: newTask.status,
                dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null,
                assignedToId: newTask.assignedToId && newTask.assignedToId !== "none" ? newTask.assignedToId : null,
                projectId: id,
            });
            toast({ title: "Task Created", description: `"${newTask.title}" has been added to this project.` });
            setShowAddTask(false);
            setNewTask({ title: "", description: "", priority: "MEDIUM", status: "TODO", dueDate: "", assignedToId: "none" });
            fetchTasks();
        } catch (error) {
            console.error("Error creating task:", error);
            toast({ title: "Error", description: "Failed to create task.", variant: "destructive" });
        } finally {
            setCreatingTask(false);
        }
    };

    // --- Loading State ---
    if (isLoading) {
        return (
            <div className="flex h-screen bg-[#F8FAFC]">
                <main className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="animate-spin text-[#0891B2]" size={36} />
                        <p className="text-sm text-[#94A3B8]">Loading project…</p>
                    </div>
                </main>
            </div>
        );
    }

    // --- Not Found ---
    if (!project) {
        return (
            <div className="flex h-screen bg-[#F8FAFC]">
                <main className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-8">
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-2">
                        <Briefcase className="h-8 w-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-[#0F172A]">Project Not Found</h2>
                    <p className="text-[#475569] max-w-sm">The project you're looking for doesn't exist or has been deleted.</p>
                    <Button variant="outline" onClick={() => navigate("/projects")} className="mt-2">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
                    </Button>
                </main>
            </div>
        );
    }

    // --- Derived Values ---
    const status = project.status || "PLANNING";
    const statusInfo = statusConfig[status] || statusConfig.PLANNING;
    const progress = project.completionPercentage ?? project.progress ?? 0;
    const membersList = project.members || project.teamMembers || [];
    const clientName = project.client?.clientName;
    const tasksCount = project._count?.projectTasks || project._count?.tasks || project.tasksCount || tasks.length;
    const filesCount = project._count?.projectDocuments || project._count?.files || project.filesCount || files.length;

    const doneTasks = tasks.filter((t: any) => t.status === "DONE" || t.status === "COMPLETED").length;
    const openTasks = tasks.length - doneTasks;

    const formatCurrency = (val: any) =>
        val != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: project.currency || "USD" }).format(Number(val)) : "—";

    const formatDate = (val: any) =>
        val ? new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

    // Calculate days remaining
    const daysRemaining = project.endDate
        ? Math.ceil((new Date(project.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    return (
        <div className="flex h-screen bg-[#F8FAFC]">
            <main className="flex-1 overflow-auto">
                {/* ========== HEADER ========== */}
                <div className="border-b border-[rgba(15,23,42,0.06)] bg-white/80 backdrop-blur-sm sticky top-0 z-10 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost" size="icon"
                                onClick={() => navigate("/projects")}
                                className="rounded-full hover:bg-slate-100"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <Breadcrumb>
                                    <BreadcrumbList>
                                        <BreadcrumbItem><BreadcrumbLink href="/projects">Projects</BreadcrumbLink></BreadcrumbItem>
                                        <BreadcrumbSeparator />
                                        <BreadcrumbItem><BreadcrumbPage>{project.name}</BreadcrumbPage></BreadcrumbItem>
                                    </BreadcrumbList>
                                </Breadcrumb>
                                <div className="flex items-center gap-3 mt-1">
                                    <h1 className="text-xl font-bold text-[#0F172A]">{project.name}</h1>
                                    {project.code && (
                                        <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{project.code}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge className={`${statusInfo.bg} ${statusInfo.color} text-xs font-medium px-3 py-1`}>{statusInfo.label}</Badge>
                            <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${id}/edit`)} className="gap-1.5">
                                <Pencil size={14} /> Edit Project
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-[1400px] mx-auto">

                    {/* ========== STATS ROW ========== */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Progress */}
                        <Card className="bg-white border-gray-100 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs text-[#94A3B8] uppercase tracking-wider font-medium">Progress</p>
                                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                                        <TrendingUp className="h-4 w-4 text-blue-600" />
                                    </div>
                                </div>
                                <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">{progress}%</p>
                                <div className="w-full h-2 rounded-full bg-gray-100 mt-2 overflow-hidden">
                                    <div className={`h-full rounded-full ${getProgressColor(progress)} transition-all duration-500`} style={{ width: `${progress}%` }} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Budget */}
                        <Card className="bg-white border-gray-100 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs text-[#94A3B8] uppercase tracking-wider font-medium">Budget</p>
                                    <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                                        <DollarSign className="h-4 w-4 text-green-600" />
                                    </div>
                                </div>
                                <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">{formatCurrency(project.budget)}</p>
                                <p className="text-xs text-[#94A3B8] mt-1">{project.currency || "USD"}</p>
                            </CardContent>
                        </Card>

                        {/* Timeline */}
                        <Card className="bg-white border-gray-100 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs text-[#94A3B8] uppercase tracking-wider font-medium">Due Date</p>
                                    <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                                        <Calendar className="h-4 w-4 text-purple-600" />
                                    </div>
                                </div>
                                <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">{project.endDate ? new Date(project.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</p>
                                {daysRemaining !== null && (
                                    <p className={`text-xs mt-1 ${daysRemaining < 0 ? 'text-red-500' : daysRemaining <= 7 ? 'text-amber-500' : 'text-[#94A3B8]'}`}>
                                        {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days remaining`}
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Tasks */}
                        <Card className="bg-white border-gray-100 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs text-[#94A3B8] uppercase tracking-wider font-medium">Tasks</p>
                                    <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                                        <CheckSquare className="h-4 w-4 text-amber-600" />
                                    </div>
                                </div>
                                <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">{doneTasks}/{tasks.length || tasksCount}</p>
                                <p className="text-xs text-[#94A3B8] mt-1">{openTasks} open</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ========== MAIN CONTENT ========== */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* ===== LEFT SIDEBAR ===== */}
                        <div className="space-y-5">

                            {/* Description */}
                            <Card className="bg-white border-gray-100 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                                        <FileText size={14} className="text-[#0891B2]" /> Description
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">
                                        {project.description || "No description provided."}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Project Details */}
                            <Card className="bg-white border-gray-100 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                                        <Briefcase size={14} className="text-[#0891B2]" /> Project Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0 space-y-3">
                                    {project.code && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-[#94A3B8] flex items-center gap-1.5"><Hash size={12} /> Code</span>
                                            <span className="font-mono text-xs bg-slate-50 px-2 py-0.5 rounded text-[#0F172A]">{project.code}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[#94A3B8] flex items-center gap-1.5"><Target size={12} /> Status</span>
                                        <Badge className={`${statusInfo.bg} ${statusInfo.color} text-xs`}>{statusInfo.label}</Badge>
                                    </div>
                                    {clientName && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-[#94A3B8] flex items-center gap-1.5"><Building2 size={12} /> Client</span>
                                            <span className="font-medium text-[#0F172A]">{clientName}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[#94A3B8] flex items-center gap-1.5"><Calendar size={12} /> Start Date</span>
                                        <span className="font-medium text-[#0F172A]">{formatDate(project.startDate || project.estimatedStartDate || project.actualStartDate)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[#94A3B8] flex items-center gap-1.5"><Calendar size={12} /> Due Date</span>
                                        <span className="font-medium text-[#0F172A]">{formatDate(project.endDate || project.estimatedEndDate || project.actualEndDate)}</span>
                                    </div>
                                    {project.actualEndDate && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-[#94A3B8] flex items-center gap-1.5"><Calendar size={12} /> Actual End</span>
                                            <span className="font-medium text-[#0F172A]">{formatDate(project.actualEndDate)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[#94A3B8] flex items-center gap-1.5"><DollarSign size={12} /> Budget</span>
                                        <span className="font-medium text-[#0F172A]">{formatCurrency(project.budget)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[#94A3B8] flex items-center gap-1.5"><TrendingUp size={12} /> Progress</span>
                                        <span className="font-medium text-[#0F172A]">{progress}%</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[#94A3B8] flex items-center gap-1.5"><Clock size={12} /> Created</span>
                                        <span className="font-medium text-[#0F172A]">{formatDate(project.createdAt)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[#94A3B8] flex items-center gap-1.5"><Timer size={12} /> Updated</span>
                                        <span className="font-medium text-[#0F172A]">{formatDate(project.updatedAt)}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Team Members */}
                            <Card className="bg-white border-gray-100 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                                        <Users size={14} className="text-[#0891B2]" /> Team Members
                                        <span className="text-xs text-[#94A3B8] font-normal ml-auto">{membersList.length} member{membersList.length !== 1 ? "s" : ""}</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    {membersList.length === 0 ? (
                                        <div className="flex flex-col items-center py-6 text-center">
                                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                                                <Users size={16} className="text-[#94A3B8]" />
                                            </div>
                                            <p className="text-sm text-[#94A3B8]">No team members assigned</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {membersList.map((m: any) => {
                                                const first = m.employee?.user?.firstName || "";
                                                const last = m.employee?.user?.lastName || "";
                                                const name = `${first} ${last}`.trim() || "Unknown";
                                                const initials = getInitials(first, last);
                                                return (
                                                    <div key={m.id || m.employeeId} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                                                        <Avatar className="h-9 w-9">
                                                            <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-cyan-100 text-indigo-600 text-xs font-semibold">{initials}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-[#0F172A] truncate">{name}</p>
                                                            <p className="text-xs text-[#94A3B8]">{m.role || "Team Member"}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* ===== RIGHT — TABS ===== */}
                        <div className="lg:col-span-2">
                            <Card className="bg-white border-gray-100 shadow-sm flex flex-col min-h-[500px]">
                                <Tabs defaultValue="tasks" className="flex flex-col flex-1">
                                    <CardHeader className="pb-0 border-b border-gray-100">
                                        <div className="overflow-x-auto scrollbar-hide">
                                            <TabsList className="bg-transparent h-auto p-0 gap-6 inline-flex w-max justify-start">
                                                {[
                                                    { value: "tasks", icon: ListTodo, label: "Tasks", count: tasksCount },
                                                    { value: "files", icon: FolderOpen, label: "Files", count: filesCount },
                                                    { value: "timeline", icon: BarChart3, label: "Activity" },
                                                ].map((tab) => (
                                                    <TabsTrigger
                                                        key={tab.value}
                                                        value={tab.value}
                                                        className="px-0 py-4 rounded-none border-b-2 bg-transparent text-sm font-medium text-[#475569]
                              data-[state=active]:border-[#0891B2] data-[state=active]:text-[#0891B2]
                              hover:text-slate-700 transition-colors gap-2"
                                                    >
                                                        <tab.icon className="h-4 w-4" />
                                                        {tab.label}
                                                        {tab.count !== undefined && (
                                                            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{tab.count}</span>
                                                        )}
                                                    </TabsTrigger>
                                                ))}
                                            </TabsList>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="p-6 flex-1">

                                        {/* === TASKS TAB === */}
                                        <TabsContent value="tasks" className="m-0 space-y-3">
                                            {/* Add Task Button */}
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs text-[#94A3B8]">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</p>
                                                <Button
                                                    size="sm"
                                                    onClick={() => setShowAddTask(true)}
                                                    className="gap-1.5 bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-lg"
                                                >
                                                    <Plus size={14} /> Add Task
                                                </Button>
                                            </div>

                                            {loadingTasks ? (
                                                <div className="flex items-center justify-center py-12">
                                                    <Loader2 className="animate-spin text-[#0891B2] mr-2" size={20} />
                                                    <span className="text-sm text-[#94A3B8]">Loading tasks…</span>
                                                </div>
                                            ) : tasks.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-14 text-center">
                                                    <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mb-3">
                                                        <CheckSquare className="h-6 w-6 text-orange-500" />
                                                    </div>
                                                    <h4 className="text-sm font-semibold text-[#0F172A] mb-1">No Tasks Yet</h4>
                                                    <p className="text-xs text-[#475569] max-w-xs mb-3">Create a task to get started. Tasks will also appear in the main Tasks module.</p>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setShowAddTask(true)}
                                                        className="gap-1.5"
                                                    >
                                                        <Plus size={14} /> Create First Task
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Summary Bar */}
                                                    <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg mb-4">
                                                        <span className="text-xs text-[#475569]"><span className="font-semibold text-[#0F172A]">{doneTasks}</span> completed</span>
                                                        <span className="text-xs text-[#475569]"><span className="font-semibold text-[#0F172A]">{openTasks}</span> open</span>
                                                        <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                                                            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: tasks.length > 0 ? `${(doneTasks / tasks.length) * 100}%` : '0%' }} />
                                                        </div>
                                                        <span className="text-xs font-medium text-[#0F172A]">{tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0}%</span>
                                                    </div>
                                                    {tasks.map((task: any) => {
                                                        const isDone = task.status === "DONE" || task.status === "COMPLETED";
                                                        const pri = (task.priority || "MEDIUM").toUpperCase();
                                                        const priColor = pri === "HIGH" || pri === "URGENT" || pri === "CRITICAL"
                                                            ? "bg-red-50 text-red-600"
                                                            : pri === "MEDIUM" ? "bg-orange-50 text-orange-600" : "bg-green-50 text-green-600";
                                                        return (
                                                            <div key={task.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
                                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isDone ? "bg-green-500" : "bg-blue-500"}`} />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={`text-sm font-medium truncate ${isDone ? "text-[#94A3B8] line-through" : "text-[#0F172A]"}`}>{task.title}</p>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${priColor}`}>{pri}</span>
                                                                        {task.dueDate && (
                                                                            <span className="text-xs text-[#94A3B8] flex items-center gap-1">
                                                                                <Clock size={10} /> {new Date(task.dueDate).toLocaleDateString()}
                                                                            </span>
                                                                        )}
                                                                        {task.assignee && (
                                                                            <span className="text-xs text-[#475569]">→ {task.assignee?.user?.firstName || task.assignee?.name || ""}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <Badge className={`text-xs ${isDone ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                                                                    {isDone ? "Done" : (task.status || "Open").replace(/_/g, " ")}
                                                                </Badge>
                                                            </div>
                                                        );
                                                    })}
                                                </>
                                            )}
                                        </TabsContent>

                                        {/* === FILES TAB === */}
                                        <TabsContent value="files" className="m-0 space-y-3">
                                            {loadingFiles ? (
                                                <div className="flex items-center justify-center py-12">
                                                    <Loader2 className="animate-spin text-[#0891B2] mr-2" size={20} />
                                                    <span className="text-sm text-[#94A3B8]">Loading files…</span>
                                                </div>
                                            ) : files.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-14 text-center">
                                                    <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                                                        <FolderOpen className="h-6 w-6 text-[#0891B2]" />
                                                    </div>
                                                    <h4 className="text-sm font-semibold text-[#0F172A] mb-1">No Files</h4>
                                                    <p className="text-xs text-[#475569] max-w-xs">Files attached to this project will appear here.</p>
                                                </div>
                                            ) : (
                                                files.map((doc: any) => {
                                                    const ext = doc.extension || doc.name?.split(".").pop() || "";
                                                    const sizeKb = doc.size ? (Number(doc.size) / 1024).toFixed(1) : "—";
                                                    return (
                                                        <div key={doc.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
                                                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                                <FileText className="h-5 w-5 text-blue-600" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-[#0F172A] truncate">{doc.originalName || doc.name}</p>
                                                                <p className="text-xs text-[#94A3B8]">
                                                                    {sizeKb} KB · {ext.toUpperCase()} · {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : ""}
                                                                </p>
                                                            </div>
                                                            <a href={doc.path} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-slate-50 text-[#0891B2] hover:text-[#0891B2]/80 transition-colors">
                                                                <Download size={16} />
                                                            </a>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </TabsContent>

                                        {/* === ACTIVITY TAB === */}
                                        <TabsContent value="timeline" className="m-0 px-2">
                                            <ActivityTimeline entityType="Project" entityId={id!} />
                                        </TabsContent>

                                    </CardContent>
                                </Tabs>
                            </Card>
                        </div>
                    </div>
                </div>
                {/* ========== ADD TASK DIALOG ========== */}
                <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
                    <DialogContent className="sm:max-w-[520px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[#0891B2]/10 flex items-center justify-center">
                                    <CheckSquare size={16} className="text-[#0891B2]" />
                                </div>
                                Add Task to Project
                            </DialogTitle>
                            <DialogDescription>
                                This task will be linked to <span className="font-medium text-[#0F172A]">{project.name}</span> and will also appear in the Tasks module.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            {/* Title */}
                            <div className="space-y-1.5">
                                <Label htmlFor="task-title" className="text-sm font-medium">Title *</Label>
                                <Input
                                    id="task-title"
                                    placeholder="e.g. Design homepage mockup"
                                    value={newTask.title}
                                    onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
                                    className="rounded-lg"
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <Label htmlFor="task-desc" className="text-sm font-medium">Description</Label>
                                <textarea
                                    id="task-desc"
                                    rows={3}
                                    placeholder="Optional task description…"
                                    value={newTask.description}
                                    onChange={(e) => setNewTask((prev) => ({ ...prev, description: e.target.value }))}
                                    className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                                />
                            </div>

                            {/* Priority & Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium">Priority</Label>
                                    <Select
                                        value={newTask.priority}
                                        onValueChange={(v) => setNewTask((prev) => ({ ...prev, priority: v }))}
                                    >
                                        <SelectTrigger className="rounded-lg">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="LOW">Low</SelectItem>
                                            <SelectItem value="MEDIUM">Medium</SelectItem>
                                            <SelectItem value="HIGH">High</SelectItem>
                                            <SelectItem value="URGENT">Urgent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium">Status</Label>
                                    <Select
                                        value={newTask.status}
                                        onValueChange={(v) => setNewTask((prev) => ({ ...prev, status: v }))}
                                    >
                                        <SelectTrigger className="rounded-lg">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="TODO">To Do</SelectItem>
                                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                            <SelectItem value="REVIEW">Review</SelectItem>
                                            <SelectItem value="DONE">Done</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Due Date & Assignee */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="task-due" className="text-sm font-medium">Due Date</Label>
                                    <Input
                                        id="task-due"
                                        type="date"
                                        value={newTask.dueDate}
                                        onChange={(e) => setNewTask((prev) => ({ ...prev, dueDate: e.target.value }))}
                                        className="rounded-lg"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium">Assign To</Label>
                                    <Select
                                        value={newTask.assignedToId}
                                        onValueChange={(v) => setNewTask((prev) => ({ ...prev, assignedToId: v }))}
                                    >
                                        <SelectTrigger className="rounded-lg">
                                            <SelectValue placeholder="Unassigned" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Unassigned</SelectItem>
                                            {employees.map((emp: any) => {
                                                const userId = emp.user?.id || emp.id;
                                                const name = `${emp.user?.firstName || emp.firstName || ""} ${emp.user?.lastName || emp.lastName || ""}`.trim();
                                                if (!userId || !name) return null;
                                                return (
                                                    <SelectItem key={userId} value={String(userId)}>
                                                        {name}
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => setShowAddTask(false)} className="rounded-lg">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateTask}
                                disabled={creatingTask || !newTask.title.trim()}
                                className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-lg gap-1.5"
                            >
                                {creatingTask ? (
                                    <><Loader2 size={14} className="animate-spin" /> Creating…</>
                                ) : (
                                    <><Plus size={14} /> Create Task</>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
};

export default ProjectDetailPage;
