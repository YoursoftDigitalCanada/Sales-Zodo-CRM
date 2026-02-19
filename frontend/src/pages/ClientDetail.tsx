import { useEffect, useState } from "react";
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
import api from "@/lib/axios";
import { 
  Bell, Mail, Phone, MapPin, Star, Tag, User, Calendar, Plus, MoreHorizontal, 
  Pencil, MessageSquare, FileText, CheckSquare, TrendingUp, FolderOpen, 
  Send, ArrowLeft, Loader2, DollarSign, Clock, Users, Download, Trash2, X,
  Image as ImageIcon, File, Files, Clock3
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

interface Note {
  id: number;
  content: string;
  date: string;
  author: string;
}

interface Task {
  id: number;
  title: string;
  dueDate: string;
  completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
}

interface Document {
  id: number;
  name: string;
  type: string;
  size: string;
  date: string;
}

// --- MOCK DATA ---
const mockDeals: Deal[] = [
  { id: 1, title: "Website Redesign", description: "Full overhaul of corporate site", amount: 12500.00, status: "In Progress", date: "2 days ago", assignedTo: ["BJ", "CA"] },
  { id: 2, title: "SEO Campaign", description: "Q4 Marketing push", amount: 4500.00, status: "Won Deal", date: "1 week ago", assignedTo: ["RO"] },
];

const mockActivities: Activity[] = [
  { id: 1, type: 'email', title: 'Email sent to client', description: 'Sent proposal document v2', date: '2 hours ago', user: 'Mark Hansen' },
  { id: 2, type: 'call', title: 'Phone call completed', description: 'Discussed project requirements and timeline', date: '1 day ago', user: 'Sarah Wilson' },
];

const initialNotes: Note[] = [
  { id: 1, content: "Client is very interested in the premium support package.", date: "Oct 24, 2025", author: "Mark Hansen" },
];

const initialTasks: Task[] = [
  { id: 1, title: "Send updated invoice", dueDate: "Tomorrow", completed: false, priority: "High" },
  { id: 2, title: "Schedule onboarding call", dueDate: "Next Week", completed: true, priority: "Medium" },
];

const recentFiles: Document[] = [
  { id: 1, name: "Project_Proposal_v2.pdf", type: "PDF", size: "2.4 MB", date: "Just now" },
  { id: 2, name: "Site_Mockup_Final.png", type: "Image", size: "5.1 MB", date: "2 hours ago" },
  { id: 3, name: "Contract_Draft.docx", type: "DOC", size: "1.2 MB", date: "Yesterday" },
];

const toClientTypeLabel = (clientType?: string) => {
  if (!clientType) return "Business";

  const normalized = clientType.toUpperCase();
  if (normalized === "BUSINESS") return "Business";
  if (normalized === "INDIVIDUAL") return "Individual";

  return clientType;
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
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("deals");

  // State for interactivity
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [newNote, setNewNote] = useState("");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"High" | "Medium" | "Low">("Medium");

  useEffect(() => {
    fetchClient();
  }, [id]);

  const fetchClient = async () => {
    try {
      const response = await api.get(`/clients/${id}`);
      const data = response.data?.data || response.data;
      if (data) {
        setClient(mapClientFromApi(data));
      } else {
        setClient({
          id: 1,
          clientName: "Acme Corp",
          clientType: "Enterprise",
          primaryContactName: "John Doe",
          primaryEmail: "john@acme.com",
          phone: "+1 (555) 123-4567",
          city: "New York",
          status: "Active",
          tags: "VIP, Tech",
          rating: 4,
          assignedOwner: "Mark Hansen",
          createdAt: "2025-01-15"
        });
      }
    } catch (error) {
      console.error("Error fetching client:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const note: Note = { id: Date.now(), content: newNote, date: "Just now", author: "You" };
    setNotes([note, ...notes]);
    setNewNote("");
  };

  const toggleTask = (taskId: number) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const task: Task = {
      id: Date.now(),
      title: newTaskTitle,
      dueDate: newTaskDate || "No Date",
      priority: newTaskPriority,
      completed: false
    };
    setTasks([task, ...tasks]);
    setNewTaskTitle("");
    setNewTaskDate("");
    setNewTaskPriority("Medium");
    setIsTaskModalOpen(false);
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
                      <span key={index} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-white/5 text-slate-200"><Tag size={12} className="mr-1.5 opacity-50"/> {tag.trim()}</span>
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
                      {mockDeals.map((deal) => (
                        <div key={deal.id} className="p-4 border border-[rgba(15,23,42,0.06)] rounded-md bg-white hover:border-indigo-200 transition-colors shadow-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex gap-4">
                              <div className="w-10 h-10 rounded-md bg-[#0891B2]/10 flex items-center justify-center text-[#0891B2]"><DollarSign className="h-5 w-5" /></div>
                              <div><h4 className="font-semibold text-[#0F172A]">{deal.title}</h4><p className="text-sm text-[#475569] mt-0.5">{deal.description}</p></div>
                            </div>
                            <div className="flex items-center gap-3 sm:text-right">
                              <div className="flex flex-col items-start sm:items-end">
                                <span className="font-bold text-[#0F172A] text-lg">{formatCurrency(deal.amount)}</span>
                                <Badge variant="outline" className={`mt-1 font-normal ${getStatusColor(deal.status)}`}>{deal.status}</Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </TabsContent>

                    {/* Timeline */}
                    <TabsContent value="timeline" className="m-0 space-y-6 px-2">
                      {mockActivities.map((activity, index) => (
                         <div key={activity.id} className="flex gap-4">
                           <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ring-4 ring-white ${
                              activity.type === 'email' ? 'bg-blue-100 text-[#0891B2]' :
                              activity.type === 'call' ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'
                            }`}>
                              {activity.type === 'email' ? <Mail size={14} /> : activity.type === 'call' ? <Phone size={14} /> : <FileText size={14} />}
                            </div>
                            {index !== mockActivities.length - 1 && <div className="w-0.5 h-full bg-gray-200 my-2" />}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="bg-white p-4 rounded-md border border-[rgba(15,23,42,0.06)] shadow-sm">
                               <div className="flex justify-between items-start mb-1"><h4 className="font-medium text-[#0F172A] text-sm">{activity.title}</h4><span className="text-xs text-[#94A3B8]">{activity.date}</span></div>
                               <p className="text-sm text-[#475569]">{activity.description}</p>
                            </div>
                          </div>
                         </div>
                      ))}
                    </TabsContent>

                    {/* Notes */}
                    <TabsContent value="notes" className="m-0 space-y-6">
                      <div className="bg-white p-4 rounded-md border border-[rgba(15,23,42,0.06)] shadow-sm">
                        <label className="text-sm font-medium text-slate-200 mb-2 block">Add a new note</label>
                        <Textarea placeholder="Type your note here..." className="resize-none min-h-[80px]" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                        <div className="flex justify-end mt-3"><Button size="sm" className="bg-[#0891B2] text-white" onClick={handleAddNote}>Save Note</Button></div>
                      </div>
                      <div className="space-y-4">
                         {notes.map((note) => (
                            <div key={note.id} className="bg-yellow-50/50 p-4 rounded-md border border-yellow-100">
                               <p className="text-[#0F172A] text-sm">{note.content}</p>
                               <div className="mt-2 text-xs text-[#94A3B8]">{note.author} • {note.date}</div>
                            </div>
                         ))}
                      </div>
                    </TabsContent>

                    {/* Tasks */}
                    <TabsContent value="tasks" className="m-0 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-[#0F172A]">To-Do List</h3>
                        <Button variant="outline" size="sm" onClick={() => setIsTaskModalOpen(true)} className="bg-white hover:bg-[#F8FAFC]"><Plus className="h-3 w-3 mr-1"/> New Task</Button>
                      </div>
                      {tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 p-3 bg-white rounded-md hover:shadow-sm transition-shadow">
                          <Checkbox id={`task-${task.id}`} checked={task.completed} onCheckedChange={() => toggleTask(task.id)}/>
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

                    {/* --- DOCUMENTS TAB (REVISED LAYOUT) --- */}
                    <TabsContent value="documents" className="m-0 space-y-6">
                      
                      {/* Top Row: 3 Square Boxes */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        
                        {/* Box 1: Images */}
                        <Card className="aspect-square flex flex-col items-center justify-center p-4 hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all group bg-white border-[rgba(15,23,42,0.06)]">
                          <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-purple-100 transition-colors">
                            <ImageIcon className="h-6 w-6 text-purple-600" />
                          </div>
                          <span className="font-semibold text-[#0F172A]">Images</span>
                          <span className="text-xs text-[#475569] mt-1">12 Files</span>
                        </Card>

                        {/* Box 2: Documents */}
                        <Card className="aspect-square flex flex-col items-center justify-center p-4 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group bg-white border-[rgba(15,23,42,0.06)]">
                          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                            <FileText className="h-6 w-6 text-[#0891B2]" />
                          </div>
                          <span className="font-semibold text-[#0F172A]">Documents</span>
                          <span className="text-xs text-[#475569] mt-1">8 Files</span>
                        </Card>

                        {/* Box 3: All Files */}
                        <Card className="aspect-square flex flex-col items-center justify-center p-4 hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all group bg-white border-[rgba(15,23,42,0.06)]">
                          <div className="w-12 h-12 bg-[#0891B2]/10 rounded-full flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
                            <Files className="h-6 w-6 text-[#0891B2]" />
                          </div>
                          <span className="font-semibold text-[#0F172A]">All Files</span>
                          <span className="text-xs text-[#475569] mt-1">20 Files</span>
                        </Card>

                      </div>

                      {/* Bottom Section: Recent Files (The "Main Box") */}
                      <Card className="bg-white border-[rgba(15,23,42,0.06)] shadow-sm overflow-hidden">
                        <CardHeader className="bg-[#F8FAFC]/50 border-b border-[rgba(15,23,42,0.06)] pb-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Clock3 className="h-4 w-4 text-[#475569]" />
                              <CardTitle className="text-sm font-semibold text-slate-200">Recently Opened Files</CardTitle>
                            </div>
                            <Button variant="ghost" size="sm" className="h-6 text-xs text-[#0891B2] hover:text-indigo-700 hover:bg-[#0891B2]/10">View All</Button>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="divide-y divide-[rgba(15,23,42,0.06)]">
                            {recentFiles.map((file) => (
                              <div key={file.id} className="p-4 hover:bg-[#F8FAFC] transition-colors flex items-center justify-between group cursor-pointer">
                                <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
                                    file.type === 'PDF' ? 'bg-red-50 text-red-600' :
                                    file.type === 'Image' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-[#0891B2]'
                                  }`}>
                                    {file.type === 'Image' ? <ImageIcon size={20}/> : <FileText size={20}/>}
                                  </div>
                                  <div>
                                    <h5 className="text-sm font-medium text-[#0F172A]">{file.name}</h5>
                                    <p className="text-xs text-[#475569]">{file.size} • {file.date}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-[#94A3B8] hover:text-[#0891B2]">
                                    <Download size={16} />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-[#94A3B8] hover:text-red-600">
                                    <Trash2 size={16} />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            {/* Upload Placeholder Row */}
                            <div className="p-4 flex items-center justify-center border-t border-dashed border-[rgba(15,23,42,0.06)] hover:bg-[#F8FAFC] cursor-pointer text-[#94A3B8] hover:text-[#0891B2] transition-colors gap-2">
                              <Plus size={16} />
                              <span className="text-sm font-medium">Upload New File</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                    </TabsContent>
                    
                    {/* Mail */}
                    <TabsContent value="mail" className="m-0"><div className="text-center py-10 text-[#94A3B8]">No recent emails found.</div></TabsContent>

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
