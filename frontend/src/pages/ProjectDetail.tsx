import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import {
    Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { getProjectById, updateProject } from "@/features/projects/services/projects-service";
import { getTasks } from "@/features/tasks/services/tasks-service";
import { getFiles } from "@/features/files/services/files-service";
import {
    ArrowLeft, Calendar, DollarSign, Users, FileText, CheckSquare, Loader2,
    Clock, TrendingUp, Building2, FolderOpen, ListTodo, BarChart3, Pencil
} from "lucide-react";

// Status config
const statusConfig: Record<string, { label: string; color: string }> = {
    PLANNING: { label: "Planning", color: "bg-purple-100 text-purple-700" },
    IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
    ON_HOLD: { label: "On Hold", color: "bg-amber-100 text-amber-700" },
    COMPLETED: { label: "Completed", color: "bg-green-100 text-green-700" },
    CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700" },
};

const ProjectDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [project, setProject] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [files, setFiles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [loadingFiles, setLoadingFiles] = useState(false);

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

    if (isLoading) {
        return (
            <div className="flex h-screen">
                <Sidebar />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="animate-spin text-[#0891B2]" size={36} />
                </main>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex h-screen">
                <Sidebar />
                <main className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-8">
                    <h2 className="text-xl font-semibold text-[#0F172A]">Project Not Found</h2>
                    <p className="text-[#475569]">The project you're looking for doesn't exist or has been deleted.</p>
                    <Button variant="outline" onClick={() => navigate("/projects")}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
                    </Button>
                </main>
            </div>
        );
    }

    const status = project.status || "PLANNING";
    const statusInfo = statusConfig[status] || statusConfig.PLANNING;
    const progress = project.progress ?? 0;
    const membersList = project.members || [];
    const clientName = project.client?.clientName;

    const formatCurrency = (val: any) =>
        val != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: project.currency || "USD" }).format(Number(val)) : "—";

    const formatDate = (val: any) =>
        val ? new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

    return (
        <div className="flex h-screen bg-[#F8FAFC]">
            <Sidebar />
            <main className="flex-1 overflow-auto">
                {/* Header */}
                <div className="border-b border-[rgba(15,23,42,0.06)] bg-white/80 backdrop-blur-sm sticky top-0 z-10 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
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
                                <h1 className="text-xl font-bold text-[#0F172A] mt-1">{project.name}</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge className={`${statusInfo.color} text-xs font-medium px-3 py-1`}>{statusInfo.label}</Badge>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/projects/${id}/edit`)}
                                className="gap-1.5"
                            >
                                <Pencil size={14} /> Edit
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-white border-gray-100">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <TrendingUp className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-[#94A3B8] uppercase tracking-wider font-medium">Progress</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-lg font-bold text-[#0F172A]">{progress}%</p>
                                        <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-blue-500 transition-all"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-gray-100">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                                    <DollarSign className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-[#94A3B8] uppercase tracking-wider font-medium">Budget</p>
                                    <p className="text-lg font-bold text-[#0F172A] mt-0.5">{formatCurrency(project.budget)}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-gray-100">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                                    <Calendar className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-[#94A3B8] uppercase tracking-wider font-medium">Timeline</p>
                                    <p className="text-sm font-semibold text-[#0F172A] mt-0.5">
                                        {formatDate(project.startDate)} — {formatDate(project.endDate)}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-gray-100">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                                    <Users className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-[#94A3B8] uppercase tracking-wider font-medium">Team</p>
                                    <p className="text-lg font-bold text-[#0F172A] mt-0.5">{membersList.length} member{membersList.length !== 1 ? 's' : ''}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content: Info + Tabs */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Left: Project Info */}
                        <div className="space-y-5">
                            {/* Description */}
                            <Card className="bg-white border-gray-100">
                                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-[#0F172A]">Description</CardTitle></CardHeader>
                                <CardContent className="pt-0">
                                    <p className="text-sm text-[#475569] leading-relaxed">{project.description || "No description provided."}</p>
                                </CardContent>
                            </Card>

                            {/* Details */}
                            <Card className="bg-white border-gray-100">
                                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-[#0F172A]">Details</CardTitle></CardHeader>
                                <CardContent className="pt-0 space-y-3">
                                    {project.code && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-[#94A3B8]">Code</span>
                                            <span className="font-medium text-[#0F172A]">{project.code}</span>
                                        </div>
                                    )}
                                    {clientName && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-[#94A3B8] flex items-center gap-1"><Building2 size={12} /> Client</span>
                                            <span className="font-medium text-[#0F172A]">{clientName}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#94A3B8] flex items-center gap-1"><Calendar size={12} /> Start</span>
                                        <span className="font-medium text-[#0F172A]">{formatDate(project.startDate)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#94A3B8] flex items-center gap-1"><Calendar size={12} /> End</span>
                                        <span className="font-medium text-[#0F172A]">{formatDate(project.endDate)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#94A3B8] flex items-center gap-1"><Clock size={12} /> Created</span>
                                        <span className="font-medium text-[#0F172A]">{formatDate(project.createdAt)}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Team Members */}
                            <Card className="bg-white border-gray-100">
                                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-[#0F172A]">Team Members</CardTitle></CardHeader>
                                <CardContent className="pt-0">
                                    {membersList.length === 0 ? (
                                        <p className="text-sm text-[#94A3B8]">No team members assigned.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {membersList.map((m: any) => {
                                                const first = m.employee?.user?.firstName || "";
                                                const last = m.employee?.user?.lastName || "";
                                                const name = `${first} ${last}`.trim() || "Unknown";
                                                const initials = `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase() || "?";
                                                return (
                                                    <div key={m.id || m.employeeId} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs">{initials}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="text-sm font-medium text-[#0F172A]">{name}</p>
                                                            {m.role && <p className="text-xs text-[#94A3B8]">{m.role}</p>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right: Tabs */}
                        <div className="lg:col-span-2">
                            <Card className="bg-white border-gray-100 flex flex-col">
                                <Tabs defaultValue="tasks" className="flex flex-col flex-1">
                                    <CardHeader className="pb-0 border-b">
                                        <TabsList className="bg-transparent h-auto p-0 gap-6 inline-flex w-max justify-start">
                                            <TabsTrigger
                                                value="tasks"
                                                className="px-0 py-4 rounded-none border-b-2 bg-transparent text-sm font-medium text-[#475569] data-[state=active]:border-indigo-600 data-[state=active]:text-[#0891B2] transition-colors gap-2"
                                            >
                                                <ListTodo className="h-4 w-4" /> Tasks ({project._count?.tasks || tasks.length})
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="files"
                                                className="px-0 py-4 rounded-none border-b-2 bg-transparent text-sm font-medium text-[#475569] data-[state=active]:border-indigo-600 data-[state=active]:text-[#0891B2] transition-colors gap-2"
                                            >
                                                <FolderOpen className="h-4 w-4" /> Files ({project._count?.files || files.length})
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="timeline"
                                                className="px-0 py-4 rounded-none border-b-2 bg-transparent text-sm font-medium text-[#475569] data-[state=active]:border-indigo-600 data-[state=active]:text-[#0891B2] transition-colors gap-2"
                                            >
                                                <BarChart3 className="h-4 w-4" /> Activity
                                            </TabsTrigger>
                                        </TabsList>
                                    </CardHeader>
                                    <CardContent className="p-6 flex-1">

                                        {/* Tasks Tab */}
                                        <TabsContent value="tasks" className="m-0 space-y-3">
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
                                                    <p className="text-xs text-[#475569]">Tasks linked to this project will appear here.</p>
                                                </div>
                                            ) : (
                                                tasks.map((task: any) => {
                                                    const isDone = task.status === "DONE" || task.status === "COMPLETED";
                                                    const pri = task.priority || "MEDIUM";
                                                    const priColor = pri === "HIGH" || pri === "URGENT" ? "bg-red-50 text-red-600" : pri === "MEDIUM" ? "bg-orange-50 text-orange-600" : "bg-green-50 text-green-600";
                                                    return (
                                                        <div key={task.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
                                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isDone ? 'bg-green-500' : 'bg-blue-500'}`} />
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-medium truncate ${isDone ? 'text-[#94A3B8] line-through' : 'text-[#0F172A]'}`}>{task.title}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className={`text-xs px-1.5 py-0.5 rounded ${priColor}`}>{pri}</span>
                                                                    {task.dueDate && (
                                                                        <span className="text-xs text-[#94A3B8] flex items-center gap-1">
                                                                            <Clock size={10} /> {new Date(task.dueDate).toLocaleDateString()}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <Badge className={`text-xs ${isDone ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {isDone ? "Done" : task.status || "Open"}
                                                            </Badge>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </TabsContent>

                                        {/* Files Tab */}
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
                                                    <p className="text-xs text-[#475569]">Files attached to this project will appear here.</p>
                                                </div>
                                            ) : (
                                                files.map((doc: any) => {
                                                    const ext = doc.extension || doc.name?.split('.').pop() || '';
                                                    const sizeKb = doc.size ? (Number(doc.size) / 1024).toFixed(1) : '—';
                                                    return (
                                                        <div key={doc.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
                                                            <div className="w-9 h-9 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                                <FileText className="h-4 w-4 text-blue-600" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-[#0F172A] truncate">{doc.originalName || doc.name}</p>
                                                                <p className="text-xs text-[#94A3B8]">{sizeKb} KB · {ext.toUpperCase()} · {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : ''}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </TabsContent>

                                        {/* Activity Timeline Tab */}
                                        <TabsContent value="timeline" className="m-0 px-2">
                                            <ActivityTimeline entityType="Project" entityId={id!} />
                                        </TabsContent>

                                    </CardContent>
                                </Tabs>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProjectDetailPage;
