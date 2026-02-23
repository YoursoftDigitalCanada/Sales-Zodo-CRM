import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { getClientById, updateClient } from "@/services/clientService";
import { getTasks, createTask, updateTask } from "@/features/tasks/services/tasks-service";
import { getProjects } from "@/features/projects/services/projects-service";
import { getFiles } from "@/features/files/services/files-service";
import { getEmails } from "@/features/emails/services/emails-service";
import { getInvoices } from "@/features/invoices/services/invoice-service";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { useToast } from "@/hooks/use-toast";
import {
  Bell, Mail, Phone, MapPin, Star, Tag, User, Calendar, Plus, MoreHorizontal,
  Pencil, MessageSquare, FileText, CheckSquare, TrendingUp, FolderOpen,
  Send, ArrowLeft, Loader2, DollarSign, Clock, Users, Download, Trash2, X,
  Image as ImageIcon, File, Files, Clock3, Receipt
} from "lucide-react";

// --- INTERFACES ---
interface Client {
  id: string | number;
  clientName: string;
  clientType: string;
  primaryContactName: string;
  primaryEmail: string;
  phone: string;
  city: string;
  address?: string;
  status: string;
  assignedOwner?: string;
  outstandingBalance?: number;
  lastInteractionDate?: string;
  tags?: string;
  rating?: number;
  totalDeals?: number;
  skype?: string;
  website?: string;
  createdAt?: string;
}

interface Deal {
  id: number;
  title: string;
  description: string;
  amount: number;
  status: 'Won Deal' | 'Lost Deal' | 'In Progress' | 'Pending';
  date: string;
  assignedTo: string[];
}

interface Activity {
  id: number;
  type: 'email' | 'call' | 'meeting' | 'note';
  title: string;
  description: string;
  date: string;
  user: string;
}

interface ClientTask {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
}



const toClientTypeLabel = (clientType?: string) => {
  if (!clientType) return "Business";

  const normalized = clientType.toUpperCase();
  if (normalized === "BUSINESS") return "Business";
  if (normalized === "INDIVIDUAL") return "Individual";

  return clientType;
};

const mapPriority = (p: string): 'High' | 'Medium' | 'Low' => {
  const u = (p || '').toUpperCase();
  if (u === 'HIGH' || u === 'URGENT') return 'High';
  if (u === 'LOW') return 'Low';
  return 'Medium';
};

const toStatusLabel = (status?: string) => {
  if (!status) return "Active";

  const normalized = status.toUpperCase();
  if (normalized === "ACTIVE") return "Active";
  if (normalized === "INACTIVE") return "Inactive";

  return status;
};

const normalizeTags = (tags: unknown): string => {
  if (Array.isArray(tags)) return tags.join(", ");
  return typeof tags === "string" ? tags : "";
};

const formatAssignedOwner = (assignedOwner: unknown): string => {
  if (!assignedOwner) return "";
  if (typeof assignedOwner === "string") return assignedOwner;

  const owner = assignedOwner as {
    firstName?: string;
    lastName?: string;
    user?: { firstName?: string; lastName?: string };
  };

  const firstName = owner.firstName || owner.user?.firstName || "";
  const lastName = owner.lastName || owner.user?.lastName || "";
  return `${firstName} ${lastName}`.trim();
};

const mapClientFromApi = (data: any): Client => {
  const addressParts = [
    data.streetAddress,
    data.suite,
    data.city,
    data.province,
    data.postalCode,
    data.country,
  ].filter(Boolean);

  return {
    id: data.id,
    clientName: data.clientName || "Unnamed Client",
    clientType: toClientTypeLabel(data.clientType),
    primaryContactName: data.contactName || data.primaryContactName || "",
    primaryEmail: data.primaryEmail || "",
    phone: data.primaryPhone || data.phone || "",
    city: data.city || "",
    address: data.address || addressParts.join(", "),
    status: toStatusLabel(data.status),
    assignedOwner: formatAssignedOwner(data.assignedOwner),
    outstandingBalance: Number(data.outstandingBalance || 0),
    lastInteractionDate: data.lastInteractionDate || data.updatedAt || data.createdAt,
    tags: normalizeTags(data.tags),
    rating: Number(data.rating || 4),
    totalDeals: Number(data.totalDeals || data._count?.projects || 0),
    skype: data.skype || "",
    website: data.website || "",
    createdAt: data.createdAt,
  };
};

const ClientDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("deals");

  // State for notes (persisted as internalNotes on Client)
  const [internalNotes, setInternalNotes] = useState("");
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // State for tasks (persisted via Tasks API)
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // State for deals (projects with clientId)
  const [deals, setDeals] = useState<any[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);

  // State for documents (files with clientId)
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // State for emails (emails with clientId)
  const [emails, setEmails] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);

  // State for invoices
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [savingTask, setSavingTask] = useState(false);

  // Fetch client data
  const fetchClient = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getClientById(id!) as any;
      if (data) {
        setClient(mapClientFromApi(data));
        setInternalNotes(data.internalNotes || "");
      }
    } catch (error) {
      console.error("Error fetching client:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // Fetch tasks for this client
  const fetchTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      const data = await getTasks({ clientId: id!, limit: 100 }) as any[];
      setTasks(data.map((t: any) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "No Date",
        completed: t.status === "DONE" || t.status === "COMPLETED",
        priority: mapPriority(t.priority),
      })));
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoadingTasks(false);
    }
  }, [id]);

  // Fetch deals (projects) for this client
  const fetchDeals = useCallback(async () => {
    try {
      setLoadingDeals(true);
      const data = await getProjects({ clientId: id!, limit: 100 });
      setDeals(data);
    } catch (error) {
      console.error("Error fetching deals:", error);
    } finally {
      setLoadingDeals(false);
    }
  }, [id]);

  // Fetch documents (files) for this client
  const fetchDocuments = useCallback(async () => {
    try {
      setLoadingDocs(true);
      const data = await getFiles({ clientId: id!, limit: 100 });
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoadingDocs(false);
    }
  }, [id]);

  // Fetch emails for this client
  const fetchEmails = useCallback(async () => {
    try {
      setLoadingEmails(true);
      const data = await getEmails({ clientId: id!, limit: 50 });
      setEmails(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching emails:", error);
    } finally {
      setLoadingEmails(false);
    }
  }, [id]);

  // Fetch invoices for this client
  const fetchInvoices = useCallback(async () => {
    try {
      setLoadingInvoices(true);
      const data = await getInvoices({ clientId: id! });
      setInvoices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoadingInvoices(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClient();
    fetchTasks();
    fetchDeals();
    fetchDocuments();
    fetchEmails();
    fetchInvoices();
  }, [fetchClient, fetchTasks, fetchDeals, fetchDocuments, fetchEmails, fetchInvoices]);

  // Save note to backend as internalNotes
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      // Append the new note to existing internal notes
      const updated = internalNotes
        ? `${newNote.trim()}\n\n---\n\n${internalNotes}`
        : newNote.trim();
      await updateClient(id!, { internalNotes: updated });
      setInternalNotes(updated);
      setNewNote("");
      toast({ title: "Note Saved", description: "Your note has been saved." });
    } catch (error) {
      console.error("Error saving note:", error);
      toast({ title: "Error", description: "Failed to save note.", variant: "destructive" });
    } finally {
      setSavingNote(false);
    }
  };

  // Toggle task completion via API
  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus = task.completed ? "TODO" : "DONE";
    // Optimistic update
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
    try {
      await updateTask(taskId, { status: newStatus });
    } catch (error) {
      // Revert on failure
      setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: task.completed } : t));
      toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
    }
  };

  // Create task via API
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    setSavingTask(true);
    try {
      await createTask({
        title: newTaskTitle,
        dueDate: newTaskDate || undefined,
        priority: newTaskPriority.toUpperCase(),
        clientId: id,
        status: "TODO",
      });
      setNewTaskTitle("");
      setNewTaskDate("");
      setNewTaskPriority("Medium");
      setIsTaskModalOpen(false);
      toast({ title: "Task Created", description: "Task has been added." });
      fetchTasks(); // refetch from API
    } catch (error) {
      console.error("Error creating task:", error);
      toast({ title: "Error", description: "Failed to create task.", variant: "destructive" });
    } finally {
      setSavingTask(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount || 0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Won Deal': return 'bg-green-100 text-green-700 border-green-200';
      case 'Lost Deal': return 'bg-red-100 text-red-700 border-red-200';
      case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : "CL";

  if (isLoading) {
    return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><Loader2 className="animate-spin text-[#0891B2]" size={40} /></div>;
  }

  if (!client) return null;

  const tabs = [
    { id: 'deals', label: 'Deals', icon: TrendingUp },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'documents', label: 'Documents', icon: FolderOpen },
    { id: 'invoices', label: 'Invoices', icon: Receipt },
    { id: 'mail', label: 'Mail', icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="min-h-screen transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width, 16rem)' }}>
        <header className="sticky top-0 z-30 border-b bg-white px-6 h-16 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/client-list')} className="hover:bg-[#F8FAFC]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem><BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbLink href="/client-list">Clients</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbPage className="font-semibold text-[#0891B2]">{client.clientName}</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2"><Send className="h-4 w-4" /><span className="hidden sm:inline">Email</span></Button>
            <Button className="bg-[#0891B2] hover:bg-[#0891B2]/80 gap-2"><span className="hidden sm:inline">Actions</span><MoreHorizontal className="h-4 w-4" /></Button>
          </div>
        </header>

        <div className="p-4 md:p-6">
          <div className="grid grid-cols-12 gap-4 md:gap-6">

            {/* Left Panel */}
            <div className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-4 md:space-y-6">
              <Card className="overflow-hidden border-none shadow-md">
                <div className=" from-indigo-500 to-purple-600 h-24" />
                <CardContent className="pt-0 -mt-12">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="h-24 w-24 border-4 border-white card-shadow bg-white">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${client.clientName}`} />
                      <AvatarFallback className="bg-indigo-100 text-[#0891B2] text-2xl font-bold">{getInitials(client.clientName)}</AvatarFallback>
                    </Avatar>
                    <h2 className="text-xl font-bold text-[#0F172A] mt-3">{client.clientName}</h2>
                    <p className="text-sm text-[#475569]">{client.clientType}</p>
                    <div className="flex items-center gap-1 mt-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} size={16} className={star <= (client.rating || 4) ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
                      ))}
                      <span className="ml-2 text-xs text-[#475569] font-medium">({client.totalDeals || 12}) Deals</span>
                    </div>
                    <Badge className={`mt-4 px-4 py-1 ${client.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-[#F8FAFC] text-slate-200'}`}>{client.status}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 border-b"><CardTitle className="text-sm font-semibold text-[#0F172A]">Contact Details</CardTitle></CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="flex items-start gap-3 group">
                    <div className="p-2 bg-[#F8FAFC] rounded-md group-hover:bg-[#0891B2]/10 transition-colors"><Mail className="h-4 w-4 text-[#475569] group-hover:text-[#0891B2]" /></div>
                    <div className="min-w-0 flex-1"><p className="text-xs text-[#475569]">Email Address</p><p className="text-sm font-medium text-[#0F172A] truncate" title={client.primaryEmail}>{client.primaryEmail}</p></div>
                  </div>
                  <div className="flex items-start gap-3 group">
                    <div className="p-2 bg-[#F8FAFC] rounded-md group-hover:bg-[#0891B2]/10 transition-colors"><Phone className="h-4 w-4 text-[#475569] group-hover:text-[#0891B2]" /></div>
                    <div><p className="text-xs text-[#475569]">Phone Number</p><p className="text-sm font-medium text-[#0F172A]">{client.phone}</p></div>
                  </div>
                  <div className="flex items-start gap-3 group">
                    <div className="p-2 bg-[#F8FAFC] rounded-md group-hover:bg-[#0891B2]/10 transition-colors"><MapPin className="h-4 w-4 text-[#475569] group-hover:text-[#0891B2]" /></div>
                    <div><p className="text-xs text-[#475569]">Address</p><p className="text-sm font-medium text-[#0F172A]">{client.address || `${client.city || 'Unknown City'}, US`}</p></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-[#0F172A]">Tags</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {client.tags ? client.tags.split(',').map((tag, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-white/5 text-slate-200"><Tag size={12} className="mr-1.5 opacity-50" /> {tag.trim()}</span>
                    )) : <span className="text-sm text-[#475569] italic">No tags assigned</span>}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Tabs */}
            <div className="col-span-12 lg:col-span-8 xl:col-span-9">
              <Card className="h-full border-none shadow-md bg-white">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">

                  <CardHeader className="pb-0 border-b px-0">
                    <div className="px-6 overflow-x-auto scrollbar-hide">
                      <TabsList className="bg-transparent h-auto p-0 gap-6 inline-flex w-max min-w-full justify-start">
                        {tabs.map((tab) => (
                          <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className="px-0 py-4 rounded-none border-b-2 bg-transparent text-sm font-medium text-[#475569]
                              data-[state=active]:border-indigo-600 data-[state=active]:text-[#0891B2] 
                              hover:text-slate-200 transition-colors gap-2"
                          >
                            <tab.icon className="h-4 w-4" />{tab.label}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 flex-1 bg-[#F8FAFC]/30">

                    {/* Deals */}
                    <TabsContent value="deals" className="m-0 space-y-4">
                      {loadingDeals ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="animate-spin text-[#0891B2] mr-2" size={20} />
                          <span className="text-sm text-[#94A3B8]">Loading deals…</span>
                        </div>
                      ) : deals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <div className="w-16 h-16 rounded-full bg-[#0891B2]/10 flex items-center justify-center mb-4">
                            <DollarSign className="h-8 w-8 text-[#0891B2]" />
                          </div>
                          <h3 className="text-lg font-semibold text-[#0F172A] mb-1">No Deals Yet</h3>
                          <p className="text-sm text-[#475569] max-w-sm">Deals associated with this client will appear here once they are created.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {deals.map((deal: any) => {
                            const status = (deal.status || deal.Status || 'IN_PROGRESS').toUpperCase();
                            const statusColor = status === 'COMPLETED' ? 'bg-green-100 text-green-700' : status === 'ON_HOLD' ? 'bg-amber-100 text-amber-700' : status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700';
                            const statusLabel = status === 'IN_PROGRESS' ? 'In Progress' : status === 'ON_HOLD' ? 'On Hold' : status.charAt(0) + status.slice(1).toLowerCase();
                            return (
                              <div key={deal.id || deal.Id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
                                <div className="flex-1">
                                  <h4 className="font-medium text-[#0F172A] text-sm">{deal.name || deal.Name}</h4>
                                  <div className="flex items-center gap-3 mt-1">
                                    {(deal.budget || deal.Budget) && (
                                      <span className="text-xs text-[#475569] flex items-center gap-1">
                                        <DollarSign size={10} />
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(deal.budget || deal.Budget))}
                                      </span>
                                    )}
                                    {(deal.dueDate || deal.DueDate) && (
                                      <span className="text-xs text-[#94A3B8] flex items-center gap-1">
                                        <Calendar size={10} />
                                        {new Date(deal.dueDate || deal.DueDate).toLocaleDateString()}
                                      </span>
                                    )}
                                    {(deal.progress !== undefined || deal.Progress !== undefined) && (
                                      <span className="text-xs text-[#475569]">{deal.progress ?? deal.Progress}%</span>
                                    )}
                                  </div>
                                </div>
                                <Badge className={`${statusColor} text-xs font-medium`}>{statusLabel}</Badge>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    {/* Timeline */}
                    <TabsContent value="timeline" className="m-0 px-2">
                      <ActivityTimeline entityType="Client" entityId={id!} />
                    </TabsContent>

                    {/* Notes */}
                    <TabsContent value="notes" className="m-0 space-y-6">
                      <div className="bg-white p-4 rounded-md border border-[rgba(15,23,42,0.06)] shadow-sm">
                        <label className="text-sm font-medium text-slate-200 mb-2 block">Add a new note</label>
                        <Textarea placeholder="Type your note here..." className="resize-none min-h-[80px]" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                        <div className="flex justify-end mt-3">
                          <Button size="sm" className="bg-[#0891B2] text-white" onClick={handleAddNote} disabled={savingNote || !newNote.trim()}>
                            {savingNote ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            {savingNote ? "Saving..." : "Save Note"}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {!internalNotes ? (
                          <div className="text-center py-10 text-[#94A3B8]">No notes yet. Add one above.</div>
                        ) : internalNotes.split('\n\n---\n\n').map((note, index) => (
                          <div key={index} className="bg-yellow-50/50 p-4 rounded-md border border-yellow-100">
                            <p className="text-[#0F172A] text-sm whitespace-pre-wrap">{note}</p>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    {/* Tasks */}
                    <TabsContent value="tasks" className="m-0 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-[#0F172A]">To-Do List</h3>
                        <Button variant="outline" size="sm" onClick={() => setIsTaskModalOpen(true)} className="bg-white hover:bg-[#F8FAFC]"><Plus className="h-3 w-3 mr-1" /> New Task</Button>
                      </div>
                      {tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mb-3">
                            <CheckSquare className="h-6 w-6 text-orange-500" />
                          </div>
                          <h4 className="text-sm font-semibold text-[#0F172A] mb-1">No Tasks Yet</h4>
                          <p className="text-xs text-[#475569]">Create a task to keep track of to-dos for this client.</p>
                        </div>
                      ) : tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 p-3 bg-white rounded-md hover:shadow-sm transition-shadow">
                          <Checkbox id={`task-${task.id}`} checked={task.completed} onCheckedChange={() => toggleTask(task.id)} />
                          <div className="flex-1">
                            <label htmlFor={`task-${task.id}`} className={`text-sm font-medium cursor-pointer ${task.completed ? 'text-[#94A3B8] line-through' : 'text-[#0F172A]'}`}>{task.title}</label>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${task.priority === 'High' ? 'bg-red-50 text-red-600' : task.priority === 'Medium' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>{task.priority}</span>
                              <span className="text-xs text-[#94A3B8] flex items-center gap-1"><Clock size={10} /> {task.dueDate}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </TabsContent>

                    {/* --- DOCUMENTS TAB --- */}
                    <TabsContent value="documents" className="m-0 space-y-6">
                      {loadingDocs ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="animate-spin text-[#0891B2] mr-2" size={20} />
                          <span className="text-sm text-[#94A3B8]">Loading documents…</span>
                        </div>
                      ) : documents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                            <FolderOpen className="h-8 w-8 text-[#0891B2]" />
                          </div>
                          <h3 className="text-lg font-semibold text-[#0F172A] mb-1">No Documents</h3>
                          <p className="text-sm text-[#475569] max-w-sm">Documents linked to this client will appear here.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {documents.map((doc: any) => {
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
                                <a href={doc.path} target="_blank" rel="noreferrer" className="text-[#0891B2] hover:text-[#0891B2]/80">
                                  <Download size={16} />
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    {/* Mail */}
                    <TabsContent value="mail" className="m-0 space-y-4">
                      {loadingEmails ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="animate-spin text-[#0891B2] mr-2" size={20} />
                          <span className="text-sm text-[#94A3B8]">Loading emails…</span>
                        </div>
                      ) : emails.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mb-3">
                            <Mail className="h-6 w-6 text-purple-500" />
                          </div>
                          <h4 className="text-sm font-semibold text-[#0F172A] mb-1">No Emails</h4>
                          <p className="text-xs text-[#475569]">Emails linked to this client will appear here.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {emails.map((email: any) => (
                            <div key={email.id} className={`flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:shadow-sm transition-shadow ${!email.isRead ? 'border-l-2 border-l-[#0891B2]' : ''}`}>
                              <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Mail className="h-4 w-4 text-purple-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className={`text-sm truncate ${!email.isRead ? 'font-semibold text-[#0F172A]' : 'font-medium text-[#475569]'}`}>{email.subject || '(No Subject)'}</p>
                                  <span className="text-xs text-[#94A3B8] ml-2 whitespace-nowrap">
                                    {email.sentAt ? new Date(email.sentAt).toLocaleDateString() : email.receivedAt ? new Date(email.receivedAt).toLocaleDateString() : ''}
                                  </span>
                                </div>
                                <p className="text-xs text-[#94A3B8] mt-0.5 truncate">
                                  {email.fromName || email.fromAddress || '—'}
                                </p>
                                {email.bodyText && (
                                  <p className="text-xs text-[#64748B] mt-1 line-clamp-2">{email.bodyText.slice(0, 150)}</p>
                                )}
                              </div>
                              {email.isStarred && <Star size={14} className="text-amber-400 fill-amber-400 flex-shrink-0 mt-1" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    {/* Invoices */}
                    <TabsContent value="invoices" className="m-0 space-y-4">
                      {loadingInvoices ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="animate-spin text-[#0891B2] mr-2" size={20} />
                          <span className="text-sm text-[#94A3B8]">Loading invoices…</span>
                        </div>
                      ) : invoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mb-3">
                            <Receipt className="h-6 w-6 text-[#0891B2]" />
                          </div>
                          <h4 className="text-sm font-semibold text-[#0F172A] mb-1">No Invoices</h4>
                          <p className="text-xs text-[#475569]">Invoices for this client will appear here.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4 text-[#0891B2] border-[#0891B2]/30 hover:bg-[#0891B2]/5"
                            onClick={() => navigate('/invoice/create')}
                          >
                            <Plus className="h-4 w-4 mr-1" /> Create Invoice
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {invoices.map((inv: any) => {
                            const status = (inv.status || 'DRAFT').toString();
                            const statusColor =
                              status === 'PAID' ? 'bg-green-100 text-green-700' :
                                status === 'SENT' ? 'bg-blue-100 text-blue-700' :
                                  status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                                    status === 'CANCELLED' ? 'bg-gray-100 text-gray-600' :
                                      'bg-slate-100 text-slate-600';
                            const total = Number(inv.total) || 0;
                            const amountPaid = Number(inv.amountPaid) || 0;
                            const amountDue = Number(inv.amountDue) || (total - amountPaid);
                            return (
                              <div key={inv.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => navigate('/invoice')}>
                                <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                                  <Receipt className="h-4 w-4 text-[#0891B2]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-[#0F172A]">{inv.invoiceNumber || 'N/A'}</p>
                                    <Badge className={`text-[10px] px-2 py-0.5 ${statusColor}`}>{status}</Badge>
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-[#94A3B8]">
                                      {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '—'}
                                    </span>
                                    <div className="text-right">
                                      <span className="text-sm font-bold text-[#0F172A]">
                                        {new Intl.NumberFormat('en-CA', { style: 'currency', currency: inv.currency || 'CAD' }).format(total)}
                                      </span>
                                      {amountDue > 0 && status !== 'PAID' && (
                                        <span className="block text-[10px] text-amber-600">
                                          Due: {new Intl.NumberFormat('en-CA', { style: 'currency', currency: inv.currency || 'CAD' }).format(amountDue)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                  </CardContent>
                </Tabs>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-md card-shadow w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold text-lg">Add New Task</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsTaskModalOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2"><label className="text-sm font-medium text-slate-200">Task Title</label><Input placeholder="Enter task description..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} autoFocus /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium text-slate-200">Due Date</label><Input type="date" value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} /></div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200">Priority</label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value as any)}>
                    <option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 bg-[#F8FAFC] flex justify-end gap-2"><Button variant="outline" onClick={() => setIsTaskModalOpen(false)}>Cancel</Button><Button className="bg-[#0891B2] hover:bg-[#0891B2]/80 text-[#0F172A]" onClick={handleAddTask}>Add Task</Button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetailPage;
