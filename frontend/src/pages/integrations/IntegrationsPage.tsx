// src/pages/integrations/IntegrationsPage.tsx

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useWhatsAppIntegration } from "@/features/whatsapp/use-whatsapp-integration";
import {
    Search, Plus, ChevronDown, ChevronRight, ExternalLink,
    CheckCircle2, AlertTriangle, XCircle, X, Copy, Eye, EyeOff,
    RefreshCw, Trash2, Pause, Play, Settings, Plug, Webhook,
    Key, Clock, ArrowUpRight, MoreVertical, Zap, Shield,
    Activity, BarChart3, MessageSquare, PhoneCall,
} from "lucide-react";
import {
    integrations, categories, webhooks, apiKeys, syncEvents,
    type Integration, type IntegrationCategory, type WebhookItem, type APIKeyItem,
} from "./data";

// ============================================
// TABS
// ============================================

type TabId = "marketplace" | "connected" | "webhooks" | "api-keys" | "activity";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "marketplace", label: "Marketplace", icon: Plug },
    { id: "connected", label: "Connected", icon: CheckCircle2 },
    { id: "webhooks", label: "Webhooks", icon: Webhook },
    { id: "api-keys", label: "API Keys", icon: Key },
    { id: "activity", label: "Activity Log", icon: Activity },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function IntegrationsPage() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<TabId>("marketplace");
    const [activeCategory, setActiveCategory] = useState<IntegrationCategory>("All");
    const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
    const [localIntegrations, setLocalIntegrations] = useState(integrations);
    const [localWebhooks, setLocalWebhooks] = useState(webhooks);
    const [localApiKeys, setLocalApiKeys] = useState(apiKeys);
    const [showApiKeyValue, setShowApiKeyValue] = useState<Record<string, boolean>>({});
    const [showAddWebhook, setShowAddWebhook] = useState(false);
    const [newWebhookUrl, setNewWebhookUrl] = useState("");
    const [showGenerateKey, setShowGenerateKey] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const { toast } = useToast();
    const { access: whatsappAccess, connections: whatsappConnections, isConnected: isWhatsAppConnected, plan } = useWhatsAppIntegration();

    // ============================================
    // COMPUTED
    // ============================================

    const connectedIntegrations = localIntegrations.filter((i) => i.status === "connected");
    const totalEventsToday = connectedIntegrations.reduce((sum, i) => sum + (i.eventsToday || 0), 0);

    const filteredIntegrations = useMemo(() => {
        let list = activeTab === "connected"
            ? localIntegrations.filter((i) => i.status === "connected")
            : localIntegrations;
        if (activeCategory !== "All") list = list.filter((i) => i.category === activeCategory);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
        }
        return list;
    }, [localIntegrations, activeTab, activeCategory, searchQuery]);

    const showWhatsAppCard = useMemo(() => {
        const matchesTab = activeTab === "marketplace" || (activeTab === "connected" && isWhatsAppConnected);
        const matchesCategory = activeCategory === "All" || activeCategory === "Communication";
        const normalizedQuery = searchQuery.trim().toLowerCase();
        const matchesSearch =
            normalizedQuery.length === 0 ||
            ["whatsapp", "meta", "twilio", "business chat"].some((term) => term.includes(normalizedQuery));

        return matchesTab && matchesCategory && matchesSearch;
    }, [activeTab, activeCategory, isWhatsAppConnected, searchQuery]);

    // ============================================
    // HANDLERS
    // ============================================

    const handleConnect = (integration: Integration) => {
        setLocalIntegrations((prev) =>
            prev.map((i) => i.id === integration.id
                ? { ...i, status: "connected" as const, connectedAt: "Just now", lastSync: "Just now", syncStatus: "synced" as const, eventsToday: 0 }
                : i)
        );
        toast({ title: `${integration.name} Connected`, description: `Successfully connected to ${integration.name}. Sync will begin shortly.` });
        setSelectedIntegration(null);
    };

    const handleDisconnect = (integration: Integration) => {
        setLocalIntegrations((prev) =>
            prev.map((i) => i.id === integration.id
                ? { ...i, status: "available" as const, connectedAt: undefined, lastSync: undefined, syncStatus: undefined, eventsToday: undefined }
                : i)
        );
        toast({ title: `${integration.name} Disconnected`, description: `${integration.name} has been disconnected from your workspace.` });
        setSelectedIntegration(null);
    };

    const handleSync = (integration: Integration) => {
        setLocalIntegrations((prev) =>
            prev.map((i) => i.id === integration.id ? { ...i, syncStatus: "syncing" as const } : i)
        );
        toast({ title: "Syncing...", description: `Syncing data with ${integration.name}...` });
        setTimeout(() => {
            setLocalIntegrations((prev) =>
                prev.map((i) => i.id === integration.id ? { ...i, syncStatus: "synced" as const, lastSync: "Just now" } : i)
            );
        }, 2000);
    };

    const handleToggleWebhook = (wh: WebhookItem) => {
        setLocalWebhooks((prev) =>
            prev.map((w) => w.id === wh.id ? { ...w, status: w.status === "active" ? "paused" as const : "active" as const } : w)
        );
        toast({ title: wh.status === "active" ? "Webhook Paused" : "Webhook Activated", description: `Webhook ${wh.url.slice(0, 40)}...` });
    };

    const handleDeleteWebhook = (wh: WebhookItem) => {
        setLocalWebhooks((prev) => prev.filter((w) => w.id !== wh.id));
        toast({ title: "Webhook Deleted", description: "The webhook endpoint has been removed." });
    };

    const handleTestWebhook = (wh: WebhookItem) => {
        toast({ title: "Test Payload Sent", description: `A test event was sent to ${wh.url.slice(0, 40)}...` });
    };

    const handleAddWebhook = () => {
        if (!newWebhookUrl.trim()) return;
        const newWh: WebhookItem = {
            id: `wh-${Date.now()}`, url: newWebhookUrl,
            events: ["lead.created"], status: "active", lastTriggered: "Never", successRate: "—",
        };
        setLocalWebhooks((prev) => [newWh, ...prev]);
        setNewWebhookUrl("");
        setShowAddWebhook(false);
        toast({ title: "Webhook Created", description: "New webhook endpoint has been registered." });
    };

    const handleCopyKey = (key: APIKeyItem) => {
        navigator.clipboard.writeText(`${key.prefix}${"•".repeat(24)}`);
        toast({ title: "Copied", description: `${key.name} copied to clipboard.` });
    };

    const handleRevokeKey = (key: APIKeyItem) => {
        setLocalApiKeys((prev) =>
            prev.map((k) => k.id === key.id ? { ...k, status: "revoked" as const } : k)
        );
        toast({ title: "Key Revoked", description: `${key.name} has been permanently revoked.` });
    };

    const handleGenerateKey = () => {
        if (!newKeyName.trim()) return;
        const newKey: APIKeyItem = {
            id: `key-${Date.now()}`, name: newKeyName,
            prefix: "zodo_live_", created: "Just now", lastUsed: "Never", status: "active",
        };
        setLocalApiKeys((prev) => [newKey, ...prev]);
        setNewKeyName("");
        setShowGenerateKey(false);
        toast({ title: "API Key Generated", description: `${newKeyName} is ready to use. Copy it now — you won't see it again.` });
    };

    // ============================================
    // STATUS HELPERS
    // ============================================

    const SyncBadge = ({ status }: { status?: string }) => {
        if (!status) return null;
        const config: Record<string, { bg: string; text: string; label: string }> = {
            synced: { bg: "bg-[#16A34A]/10", text: "text-[#16A34A]", label: "Synced" },
            syncing: { bg: "bg-[#0891B2]/10", text: "text-[#0891B2]", label: "Syncing..." },
            error: { bg: "bg-[#DC2626]/10", text: "text-[#DC2626]", label: "Error" },
        };
        const c = config[status] || config.synced;
        return <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider", c.bg, c.text)}>{c.label}</span>;
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const config: Record<string, { bg: string; text: string; label: string }> = {
            connected: { bg: "bg-[#16A34A]/10", text: "text-[#16A34A]", label: "Connected" },
            available: { bg: "bg-[#0891B2]/10", text: "text-[#0891B2]", label: "Available" },
            coming_soon: { bg: "bg-[#94A3B8]/10", text: "text-[#94A3B8]", label: "Coming Soon" },
        };
        const c = config[status] || config.available;
        return <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider", c.bg, c.text)}>{c.label}</span>;
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="flex h-screen bg-[#F8FAFC]">

            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-[rgba(15,23,42,0.06)] px-6 py-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#0891B2]/10 flex items-center justify-center">
                                <Plug size={20} className="text-[#0891B2]" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Integrations</h1>
                                <p className="text-sm text-[#475569] mt-0.5">
                                    {connectedIntegrations.length} connected · {totalEventsToday.toLocaleString()} events today
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                                <input
                                    type="text"
                                    placeholder="Search integrations..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-56 h-9 pl-9 pr-3 rounded-lg bg-[#F8FAFC] border border-[rgba(15,23,42,0.08)] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20"
                                />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Tabs */}
                <div className="bg-white border-b border-[rgba(15,23,42,0.06)] px-6 flex-shrink-0">
                    <div className="flex items-center gap-1 -mb-px">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all",
                                    activeTab === tab.id
                                        ? "border-[#0891B2] text-[#0891B2]"
                                        : "border-transparent text-[#475569] hover:text-[#0F172A] hover:border-[rgba(15,23,42,0.1)]"
                                )}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                                {tab.id === "connected" && (
                                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#0891B2]/10 text-[#0891B2] text-[10px] font-bold">
                                        {connectedIntegrations.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <main className="flex-1 p-6 overflow-auto">
                    <div className="max-w-6xl mx-auto space-y-6 page-enter">

                        {/* ========== MARKETPLACE / CONNECTED TAB ========== */}
                        {(activeTab === "marketplace" || activeTab === "connected") && (
                            <>
                                {/* Stats Bar */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: "Connected", value: connectedIntegrations.length, icon: CheckCircle2, color: "text-[#16A34A]", bg: "bg-[#16A34A]/8" },
                                        { label: "Available", value: localIntegrations.filter((i) => i.status === "available").length, icon: Plug, color: "text-[#0891B2]", bg: "bg-[#0891B2]/8" },
                                        { label: "Events Today", value: totalEventsToday.toLocaleString(), icon: Zap, color: "text-[#D97706]", bg: "bg-[#D97706]/8" },
                                        { label: "Uptime", value: "99.9%", icon: Shield, color: "text-[#7C3AED]", bg: "bg-[#7C3AED]/8" },
                                    ].map((stat) => (
                                        <div key={stat.label} className="bg-white rounded-lg card-shadow p-4 flex items-center gap-3">
                                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.bg)}>
                                                <stat.icon size={18} className={stat.color} />
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold text-[#0F172A]">{stat.value}</p>
                                                <p className="text-xs text-[#94A3B8]">{stat.label}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Category Filter (marketplace only) */}
                                {activeTab === "marketplace" && (
                                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
                                        {categories.map((cat) => (
                                            <button
                                                key={cat}
                                                onClick={() => setActiveCategory(cat)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                                                    activeCategory === cat
                                                        ? "bg-[#0891B2] text-white"
                                                        : "bg-white border border-[rgba(15,23,42,0.08)] text-[#475569] hover:bg-[#F8FAFC]"
                                                )}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Integration Cards Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {showWhatsAppCard && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(135deg,#ECFDF5_0%,#FFFFFF_45%,#ECFEFF_100%)] p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DCFCE7]">
                                                        <MessageSquare size={20} className="text-[#16A34A]" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-semibold text-sm text-[#0F172A]">WhatsApp Business</h4>
                                                            <span className="rounded bg-[#16A34A]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#16A34A]">
                                                                Featured
                                                            </span>
                                                        </div>
                                                        <p className="mt-0.5 text-[11px] text-[#64748B]">
                                                            Your own Meta or Twilio number inside CRM chat
                                                        </p>
                                                    </div>
                                                </div>
                                                <span
                                                    className={cn(
                                                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                                                        isWhatsAppConnected
                                                            ? "bg-[#16A34A]/10 text-[#16A34A]"
                                                            : whatsappAccess.enabled
                                                                ? "bg-[#0891B2]/10 text-[#0891B2]"
                                                                : "bg-[#94A3B8]/10 text-[#94A3B8]"
                                                    )}
                                                >
                                                    {isWhatsAppConnected ? "Connected" : whatsappAccess.enabled ? "Available" : "Plan locked"}
                                                </span>
                                            </div>

                                            <p className="mt-4 text-xs leading-6 text-[#475569]">
                                                Connect your own WhatsApp Business API, message leads and clients from CRM, and keep provider billing under your Meta or Twilio account.
                                            </p>

                                            <div className="mt-4 grid grid-cols-2 gap-3">
                                                <div className="rounded-xl border border-[rgba(15,23,42,0.06)] bg-white/80 p-3">
                                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Plan</p>
                                                    <p className="mt-1 text-sm font-medium capitalize text-[#0F172A]">{plan}</p>
                                                </div>
                                                <div className="rounded-xl border border-[rgba(15,23,42,0.06)] bg-white/80 p-3">
                                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Numbers</p>
                                                    <p className="mt-1 text-sm font-medium text-[#0F172A]">
                                                        {whatsappAccess.enabled ? `${whatsappConnections.length}/${whatsappAccess.maxNumbers}` : "0/0"}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex items-center gap-2 text-[11px] text-[#64748B]">
                                                <PhoneCall size={12} className="text-[#16A34A]" />
                                                <span>Meta + Twilio provider support</span>
                                            </div>

                                            <button
                                                onClick={() => navigate("/integrations/whatsapp")}
                                                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#15803D]"
                                            >
                                                {isWhatsAppConnected ? "Manage WhatsApp" : "Open WhatsApp"}
                                                <ArrowUpRight size={14} />
                                            </button>
                                        </motion.div>
                                    )}
                                    {filteredIntegrations.map((integration, index) => (
                                        <motion.div
                                            key={integration.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.03 * index }}
                                            className="bg-white rounded-lg card-shadow p-5 group hover:shadow-md transition-all cursor-pointer"
                                            onClick={() => setSelectedIntegration(integration)}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", integration.bgColor)}>
                                                        <integration.icon size={20} className={integration.color} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-semibold text-sm text-[#0F172A]">{integration.name}</h4>
                                                            {integration.popular && (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#D97706]/10 text-[#D97706] uppercase">Popular</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <StatusBadge status={integration.status} />
                                            </div>

                                            <p className="text-xs text-[#475569] mb-3 line-clamp-2">{integration.description}</p>

                                            {integration.status === "connected" && (
                                                <div className="flex items-center justify-between pt-3 border-t border-[rgba(15,23,42,0.06)]">
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={12} className="text-[#94A3B8]" />
                                                        <span className="text-[11px] text-[#94A3B8]">{integration.lastSync}</span>
                                                    </div>
                                                    <SyncBadge status={integration.syncStatus} />
                                                </div>
                                            )}

                                            {integration.status === "available" && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleConnect(integration); }}
                                                    className="w-full mt-1 px-3 py-2 bg-[#0891B2] text-white rounded-lg text-xs font-medium hover:bg-[#0891B2]/90 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    Connect
                                                </button>
                                            )}

                                            {integration.status === "coming_soon" && (
                                                <div className="mt-1 px-3 py-2 bg-[#F1F5F9] text-[#94A3B8] rounded-lg text-xs font-medium text-center">
                                                    Coming Soon
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>

                                {filteredIntegrations.length === 0 && !showWhatsAppCard && (
                                    <div className="text-center py-12">
                                        <Plug size={40} className="text-[#94A3B8] mx-auto mb-3" />
                                        <p className="text-sm text-[#475569]">No integrations found</p>
                                        <p className="text-xs text-[#94A3B8] mt-1">Try a different search or category</p>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ========== WEBHOOKS TAB ========== */}
                        {activeTab === "webhooks" && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-[#0F172A]">Webhook Endpoints</h3>
                                        <p className="text-sm text-[#475569] mt-0.5">Receive real-time event notifications at your endpoints</p>
                                    </div>
                                    <button
                                        onClick={() => setShowAddWebhook(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90 transition-colors"
                                    >
                                        <Plus size={16} /> Add Webhook
                                    </button>
                                </div>

                                {/* Add Webhook Form */}
                                <AnimatePresence>
                                    {showAddWebhook && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                            className="bg-white rounded-lg card-shadow p-5 overflow-hidden">
                                            <h4 className="font-semibold text-sm text-[#0F172A] mb-3">New Webhook Endpoint</h4>
                                            <div className="flex gap-3">
                                                <input type="text" placeholder="https://your-api.com/webhook" value={newWebhookUrl} onChange={(e) => setNewWebhookUrl(e.target.value)}
                                                    className="flex-1 h-10 px-4 rounded-lg border border-[rgba(15,23,42,0.12)] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20" />
                                                <button onClick={handleAddWebhook} className="px-5 py-2 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90">Create</button>
                                                <button onClick={() => setShowAddWebhook(false)} className="px-3 py-2 text-[#475569] hover:bg-[#F8FAFC] rounded-lg text-sm">Cancel</button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Webhook List */}
                                <div className="bg-white rounded-lg card-shadow divide-y divide-[rgba(15,23,42,0.06)]">
                                    {localWebhooks.map((wh) => (
                                        <div key={wh.id} className="p-5">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={cn("w-2 h-2 rounded-full",
                                                            wh.status === "active" ? "bg-[#16A34A]" : wh.status === "paused" ? "bg-[#D97706]" : "bg-[#DC2626]"
                                                        )} />
                                                        <code className="text-sm text-[#0F172A] font-mono truncate">{wh.url}</code>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-1.5">
                                                        <span className="text-xs text-[#94A3B8]">Events: {wh.events.join(", ")}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 ml-4">
                                                    <button onClick={() => handleTestWebhook(wh)} className="px-3 py-1.5 text-xs font-medium text-[#0891B2] bg-[#0891B2]/10 rounded-lg hover:bg-[#0891B2]/15 transition-colors">Test</button>
                                                    <button onClick={() => handleToggleWebhook(wh)} className="p-1.5 text-[#475569] hover:bg-[#F8FAFC] rounded-lg transition-colors">
                                                        {wh.status === "active" ? <Pause size={14} /> : <Play size={14} />}
                                                    </button>
                                                    <button onClick={() => handleDeleteWebhook(wh)} className="p-1.5 text-[#DC2626]/60 hover:bg-[#DC2626]/10 rounded-lg transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-[11px] text-[#94A3B8] mt-2">
                                                <span>Last triggered: {wh.lastTriggered}</span>
                                                <span>Success rate: {wh.successRate}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ========== API KEYS TAB ========== */}
                        {activeTab === "api-keys" && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-[#0F172A]">API Keys</h3>
                                        <p className="text-sm text-[#475569] mt-0.5">Manage API keys for programmatic access</p>
                                    </div>
                                    <button onClick={() => setShowGenerateKey(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90 transition-colors">
                                        <Plus size={16} /> Generate Key
                                    </button>
                                </div>

                                {/* Generate Key Form */}
                                <AnimatePresence>
                                    {showGenerateKey && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                            className="bg-white rounded-lg card-shadow p-5 overflow-hidden">
                                            <h4 className="font-semibold text-sm text-[#0F172A] mb-3">Generate New API Key</h4>
                                            <div className="flex gap-3">
                                                <input type="text" placeholder="Key name (e.g., Production API)" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)}
                                                    className="flex-1 h-10 px-4 rounded-lg border border-[rgba(15,23,42,0.12)] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20" />
                                                <button onClick={handleGenerateKey} className="px-5 py-2 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90">Generate</button>
                                                <button onClick={() => setShowGenerateKey(false)} className="px-3 py-2 text-[#475569] hover:bg-[#F8FAFC] rounded-lg text-sm">Cancel</button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* API Keys List */}
                                <div className="bg-white rounded-lg card-shadow divide-y divide-[rgba(15,23,42,0.06)]">
                                    {localApiKeys.map((key) => (
                                        <div key={key.id} className="p-5 flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Key size={14} className={key.status === "active" ? "text-[#0891B2]" : "text-[#94A3B8]"} />
                                                    <span className="font-medium text-sm text-[#0F172A]">{key.name}</span>
                                                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase",
                                                        key.status === "active" ? "bg-[#16A34A]/10 text-[#16A34A]" : "bg-[#94A3B8]/10 text-[#94A3B8]"
                                                    )}>{key.status}</span>
                                                </div>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <code className="text-xs text-[#475569] font-mono bg-[#F1F5F9] px-2 py-0.5 rounded">
                                                        {key.prefix}{showApiKeyValue[key.id] ? "sk_a8f3e2b1c9d7f0e4" : "••••••••••••••••••"}
                                                    </code>
                                                    <button onClick={() => setShowApiKeyValue((p) => ({ ...p, [key.id]: !p[key.id] }))}
                                                        className="p-1 text-[#94A3B8] hover:text-[#475569]">
                                                        {showApiKeyValue[key.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-4 text-[11px] text-[#94A3B8] mt-1.5">
                                                    <span>Created: {key.created}</span>
                                                    <span>Last used: {key.lastUsed}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleCopyKey(key)}
                                                    className="p-2 text-[#475569] hover:bg-[#F8FAFC] rounded-lg transition-colors" title="Copy">
                                                    <Copy size={14} />
                                                </button>
                                                {key.status === "active" && (
                                                    <button onClick={() => handleRevokeKey(key)}
                                                        className="px-3 py-1.5 text-xs font-medium text-[#DC2626] bg-[#DC2626]/10 rounded-lg hover:bg-[#DC2626]/15 transition-colors">
                                                        Revoke
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* API Docs Link */}
                                <div className="bg-white rounded-lg card-shadow p-5 flex items-center justify-between">
                                    <div>
                                        <h4 className="font-semibold text-sm text-[#0F172A]">API Documentation</h4>
                                        <p className="text-xs text-[#475569] mt-0.5">Full REST API reference with examples and SDKs</p>
                                    </div>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-[#F8FAFC] border border-[rgba(15,23,42,0.08)] text-[#0F172A] rounded-lg text-sm font-medium hover:bg-[#F1F5F9] transition-colors">
                                        <ExternalLink size={14} /> View Docs
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ========== ACTIVITY LOG TAB ========== */}
                        {activeTab === "activity" && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-[#0F172A]">Integration Activity</h3>
                                    <p className="text-sm text-[#475569] mt-0.5">Real-time log of all integration events and sync operations</p>
                                </div>

                                <div className="bg-white rounded-lg card-shadow divide-y divide-[rgba(15,23,42,0.06)]">
                                    {syncEvents.map((event, index) => (
                                        <motion.div
                                            key={event.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.03 * index }}
                                            className="px-5 py-3.5 flex items-center gap-4"
                                        >
                                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                                event.status === "success" ? "bg-[#16A34A]/10" : event.status === "warning" ? "bg-[#D97706]/10" : "bg-[#DC2626]/10"
                                            )}>
                                                {event.status === "success" ? <CheckCircle2 size={16} className="text-[#16A34A]" /> :
                                                    event.status === "warning" ? <AlertTriangle size={16} className="text-[#D97706]" /> :
                                                        <XCircle size={16} className="text-[#DC2626]" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-[#0891B2] bg-[#0891B2]/10 px-1.5 py-0.5 rounded">{event.integration}</span>
                                                    <span className="text-sm font-medium text-[#0F172A]">{event.event}</span>
                                                </div>
                                                <p className="text-xs text-[#475569] mt-0.5 truncate">{event.details}</p>
                                            </div>
                                            <span className="text-xs text-[#94A3B8] whitespace-nowrap flex-shrink-0">{event.time}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* ========== INTEGRATION DETAIL MODAL ========== */}
            <AnimatePresence>
                {selectedIntegration && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setSelectedIntegration(null)} />
                        <motion.div initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }}
                            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(15,23,42,0.06)]">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", selectedIntegration.bgColor)}>
                                        <selectedIntegration.icon size={20} className={selectedIntegration.color} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-[#0F172A]">{selectedIntegration.name}</h3>
                                        <StatusBadge status={selectedIntegration.status} />
                                    </div>
                                </div>
                                <button onClick={() => setSelectedIntegration(null)} className="p-2 hover:bg-[#F8FAFC] rounded-lg"><X size={18} /></button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-auto p-6 space-y-6">
                                <p className="text-sm text-[#475569]">{selectedIntegration.description}</p>

                                <div>
                                    <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Category</h4>
                                    <span className="px-3 py-1 rounded-full bg-[#F1F5F9] text-xs font-medium text-[#475569]">{selectedIntegration.category}</span>
                                </div>

                                {selectedIntegration.status === "connected" && (
                                    <>
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Connection Details</h4>
                                            <div className="bg-[#F8FAFC] rounded-lg p-4 space-y-2">
                                                <div className="flex justify-between text-sm"><span className="text-[#475569]">Connected</span><span className="text-[#0F172A] font-medium">{selectedIntegration.connectedAt}</span></div>
                                                <div className="flex justify-between text-sm"><span className="text-[#475569]">Last sync</span><span className="text-[#0F172A] font-medium">{selectedIntegration.lastSync}</span></div>
                                                <div className="flex justify-between text-sm"><span className="text-[#475569]">Events today</span><span className="text-[#0F172A] font-medium">{selectedIntegration.eventsToday}</span></div>
                                                <div className="flex justify-between text-sm items-center"><span className="text-[#475569]">Status</span><SyncBadge status={selectedIntegration.syncStatus} /></div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Actions</h4>
                                            <div className="space-y-2">
                                                <button onClick={() => handleSync(selectedIntegration)}
                                                    className="w-full flex items-center gap-2 px-4 py-2.5 bg-[#F8FAFC] border border-[rgba(15,23,42,0.08)] rounded-lg text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9] transition-colors">
                                                    <RefreshCw size={14} /> Force Sync Now
                                                </button>
                                                <button className="w-full flex items-center gap-2 px-4 py-2.5 bg-[#F8FAFC] border border-[rgba(15,23,42,0.08)] rounded-lg text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9] transition-colors">
                                                    <Settings size={14} /> Configure Settings
                                                </button>
                                                <button onClick={() => handleDisconnect(selectedIntegration)}
                                                    className="w-full flex items-center gap-2 px-4 py-2.5 bg-[#DC2626]/5 border border-[#DC2626]/15 rounded-lg text-sm font-medium text-[#DC2626] hover:bg-[#DC2626]/10 transition-colors">
                                                    <XCircle size={14} /> Disconnect
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {selectedIntegration.status === "available" && (
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Setup</h4>
                                        <p className="text-sm text-[#475569]">Click the button below to authorize ZODO CRM to connect with {selectedIntegration.name}. You'll be redirected to grant permissions.</p>
                                        <button onClick={() => handleConnect(selectedIntegration)}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90 transition-colors">
                                            <Plug size={16} /> Connect {selectedIntegration.name}
                                        </button>
                                    </div>
                                )}

                                {selectedIntegration.status === "coming_soon" && (
                                    <div className="bg-[#F8FAFC] rounded-lg p-5 text-center">
                                        <p className="text-sm text-[#475569] mb-3">This integration is under development. Get notified when it launches.</p>
                                        <button onClick={() => { toast({ title: "You're on the list!", description: `We'll notify you when ${selectedIntegration.name} is available.` }); setSelectedIntegration(null); }}
                                            className="px-4 py-2 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90 transition-colors">
                                            Notify Me
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
