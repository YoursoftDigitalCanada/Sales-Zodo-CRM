import {
    MessageSquare, Mail, Calendar, CreditCard, Cloud, Github,
    FileText, Phone, Video, BarChart3, ShoppingCart, Database,
    Zap, Globe, Shield, Bell, Webhook, Key, Plug, Sparkles,
    Receipt, Users, Target, FolderKanban, Clock, Headphones,
    type LucideIcon,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

export type IntegrationStatus = "connected" | "available" | "coming_soon";
export type IntegrationCategory = "All" | "Communication" | "CRM & Sales" | "Marketing" | "Finance" | "Productivity" | "Developer" | "AI & Analytics" | "Storage";

export interface Integration {
    id: string;
    name: string;
    description: string;
    icon: LucideIcon;
    category: IntegrationCategory;
    status: IntegrationStatus;
    color: string;
    bgColor: string;
    popular?: boolean;
    lastSync?: string;
    syncStatus?: "synced" | "syncing" | "error";
    connectedAt?: string;
    eventsToday?: number;
}

export interface WebhookItem {
    id: string;
    url: string;
    events: string[];
    status: "active" | "paused" | "failed";
    lastTriggered: string;
    successRate: string;
}

export interface APIKeyItem {
    id: string;
    name: string;
    prefix: string;
    created: string;
    lastUsed: string;
    status: "active" | "revoked";
}

export interface SyncEvent {
    id: string;
    integration: string;
    event: string;
    status: "success" | "error" | "warning";
    time: string;
    details: string;
}

// ============================================
// DATA
// ============================================

export const categories: IntegrationCategory[] = [
    "All", "Communication", "CRM & Sales", "Marketing", "Finance", "Productivity", "Developer", "AI & Analytics", "Storage"
];

export const integrations: Integration[] = [
    // Communication
    { id: "slack", name: "Slack", description: "Send notifications and updates to Slack channels", icon: MessageSquare, category: "Communication", status: "connected", color: "text-[#E01E5A]", bgColor: "bg-[#E01E5A]/10", popular: true, lastSync: "2 min ago", syncStatus: "synced", connectedAt: "Jan 15, 2026", eventsToday: 48 },
    { id: "teams", name: "Microsoft Teams", description: "Collaborate with your team via Teams integration", icon: Users, category: "Communication", status: "available", color: "text-[#6264A7]", bgColor: "bg-[#6264A7]/10", popular: true },
    { id: "twilio", name: "Twilio", description: "SMS and voice notifications for leads and clients", icon: Phone, category: "Communication", status: "available", color: "text-[#F22F46]", bgColor: "bg-[#F22F46]/10" },
    { id: "zoom", name: "Zoom", description: "Schedule and join meetings directly from CRM", icon: Video, category: "Communication", status: "connected", color: "text-[#2D8CFF]", bgColor: "bg-[#2D8CFF]/10", lastSync: "5 min ago", syncStatus: "synced", connectedAt: "Feb 1, 2026", eventsToday: 12 },

    // CRM & Sales
    { id: "salesforce", name: "Salesforce", description: "Bidirectional sync with Salesforce CRM", icon: Cloud, category: "CRM & Sales", status: "available", color: "text-[#00A1E0]", bgColor: "bg-[#00A1E0]/10", popular: true },
    { id: "hubspot", name: "HubSpot", description: "Import contacts and deals from HubSpot", icon: Target, category: "CRM & Sales", status: "available", color: "text-[#FF7A59]", bgColor: "bg-[#FF7A59]/10", popular: true },
    { id: "pipedrive", name: "Pipedrive", description: "Sync pipeline stages and deal data", icon: FolderKanban, category: "CRM & Sales", status: "coming_soon", color: "text-[#017737]", bgColor: "bg-[#017737]/10" },

    // Marketing
    { id: "mailchimp", name: "Mailchimp", description: "Sync contacts and automate email campaigns", icon: Mail, category: "Marketing", status: "connected", color: "text-[#FFE01B]", bgColor: "bg-[#FFE01B]/10", lastSync: "15 min ago", syncStatus: "synced", connectedAt: "Jan 20, 2026", eventsToday: 230 },
    { id: "sendgrid", name: "SendGrid", description: "Transactional and marketing email delivery", icon: Mail, category: "Marketing", status: "available", color: "text-[#1A82E2]", bgColor: "bg-[#1A82E2]/10" },
    { id: "google-ads", name: "Google Ads", description: "Track ad campaigns and lead attribution", icon: Globe, category: "Marketing", status: "coming_soon", color: "text-[#4285F4]", bgColor: "bg-[#4285F4]/10" },

    // Finance
    { id: "stripe", name: "Stripe", description: "Collect payments and manage subscriptions", icon: CreditCard, category: "Finance", status: "connected", color: "text-[#635BFF]", bgColor: "bg-[#635BFF]/10", popular: true, lastSync: "1 min ago", syncStatus: "synced", connectedAt: "Dec 10, 2025", eventsToday: 34 },
    { id: "quickbooks", name: "QuickBooks", description: "Sync invoices and financial data", icon: Receipt, category: "Finance", status: "available", color: "text-[#2CA01C]", bgColor: "bg-[#2CA01C]/10" },
    { id: "paypal", name: "PayPal", description: "Accept PayPal payments on invoices", icon: CreditCard, category: "Finance", status: "available", color: "text-[#003087]", bgColor: "bg-[#003087]/10" },

    // Productivity
    { id: "google-cal", name: "Google Calendar", description: "Bidirectional calendar sync", icon: Calendar, category: "Productivity", status: "connected", color: "text-[#4285F4]", bgColor: "bg-[#4285F4]/10", popular: true, lastSync: "just now", syncStatus: "syncing", connectedAt: "Jan 5, 2026", eventsToday: 8 },
    { id: "notion", name: "Notion", description: "Sync projects and docs with Notion workspace", icon: FileText, category: "Productivity", status: "available", color: "text-[#000000]", bgColor: "bg-[#000000]/10" },
    { id: "zapier", name: "Zapier", description: "Connect with 5,000+ apps via automated workflows", icon: Zap, category: "Productivity", status: "connected", color: "text-[#FF4F00]", bgColor: "bg-[#FF4F00]/10", popular: true, lastSync: "3 min ago", syncStatus: "synced", connectedAt: "Jan 8, 2026", eventsToday: 156 },
    { id: "clockify", name: "Clockify", description: "Sync time tracking and timesheets", icon: Clock, category: "Productivity", status: "coming_soon", color: "text-[#03A9F4]", bgColor: "bg-[#03A9F4]/10" },

    // Developer
    { id: "github", name: "GitHub", description: "Link repositories, track issues and PRs", icon: Github, category: "Developer", status: "connected", color: "text-[#333333]", bgColor: "bg-[#333333]/10", lastSync: "10 min ago", syncStatus: "synced", connectedAt: "Jan 12, 2026", eventsToday: 22 },
    { id: "jira", name: "Jira", description: "Sync tasks and sprints with Jira projects", icon: FolderKanban, category: "Developer", status: "available", color: "text-[#0052CC]", bgColor: "bg-[#0052CC]/10" },
    { id: "webhooks", name: "Custom Webhooks", description: "Send real-time event data to any endpoint", icon: Webhook, category: "Developer", status: "connected", color: "text-[#0891B2]", bgColor: "bg-[#0891B2]/10", lastSync: "1 min ago", syncStatus: "synced", connectedAt: "Dec 1, 2025", eventsToday: 512 },

    // AI & Analytics
    { id: "openai", name: "OpenAI", description: "Power AI features with GPT models", icon: Sparkles, category: "AI & Analytics", status: "connected", color: "text-[#10A37F]", bgColor: "bg-[#10A37F]/10", popular: true, lastSync: "just now", syncStatus: "synced", connectedAt: "Nov 20, 2025", eventsToday: 340 },
    { id: "google-analytics", name: "Google Analytics", description: "Track website traffic and conversion funnels", icon: BarChart3, category: "AI & Analytics", status: "available", color: "text-[#E37400]", bgColor: "bg-[#E37400]/10" },
    { id: "mixpanel", name: "Mixpanel", description: "Product analytics and user behavior tracking", icon: BarChart3, category: "AI & Analytics", status: "coming_soon", color: "text-[#7856FF]", bgColor: "bg-[#7856FF]/10" },

    // Storage
    { id: "google-drive", name: "Google Drive", description: "Store and share files from Google Drive", icon: Cloud, category: "Storage", status: "connected", color: "text-[#4285F4]", bgColor: "bg-[#4285F4]/10", lastSync: "8 min ago", syncStatus: "synced", connectedAt: "Jan 3, 2026", eventsToday: 18 },
    { id: "dropbox", name: "Dropbox", description: "Sync documents and attachments via Dropbox", icon: Database, category: "Storage", status: "available", color: "text-[#0061FF]", bgColor: "bg-[#0061FF]/10" },
    { id: "aws-s3", name: "AWS S3", description: "Enterprise file storage and backup", icon: Shield, category: "Storage", status: "coming_soon", color: "text-[#FF9900]", bgColor: "bg-[#FF9900]/10" },
];

export const webhooks: WebhookItem[] = [
    { id: "wh1", url: "https://api.myapp.com/webhooks/crm", events: ["lead.created", "lead.updated", "deal.won"], status: "active", lastTriggered: "2 min ago", successRate: "99.8%" },
    { id: "wh2", url: "https://hooks.slack.com/services/T00/B00/xxx", events: ["invoice.paid", "invoice.overdue"], status: "active", lastTriggered: "1 hour ago", successRate: "100%" },
    { id: "wh3", url: "https://n8n.mycompany.com/webhook/crm-sync", events: ["contact.created", "contact.updated"], status: "paused", lastTriggered: "3 days ago", successRate: "97.2%" },
    { id: "wh4", url: "https://api.analytics.io/ingest/events", events: ["page.viewed", "feature.used"], status: "active", lastTriggered: "30 sec ago", successRate: "99.5%" },
];

export const apiKeys: APIKeyItem[] = [
    { id: "key1", name: "Production API Key", prefix: "zodo_live_", created: "Dec 1, 2025", lastUsed: "Just now", status: "active" },
    { id: "key2", name: "Development Key", prefix: "zodo_test_", created: "Jan 5, 2026", lastUsed: "2 hours ago", status: "active" },
    { id: "key3", name: "Legacy Integration Key", prefix: "zodo_live_", created: "Oct 15, 2025", lastUsed: "Dec 20, 2025", status: "revoked" },
];

export const syncEvents: SyncEvent[] = [
    { id: "e1", integration: "Slack", event: "Notification sent", status: "success", time: "2 min ago", details: "New lead notification → #sales channel" },
    { id: "e2", integration: "Stripe", event: "Payment synced", status: "success", time: "5 min ago", details: "Invoice #INV-2024-089 — $4,500.00 received" },
    { id: "e3", integration: "Google Calendar", event: "Event created", status: "success", time: "8 min ago", details: "Client meeting with TechStart Inc. synced" },
    { id: "e4", integration: "Zapier", event: "Workflow triggered", status: "success", time: "10 min ago", details: "Lead → Mailchimp list automation completed" },
    { id: "e5", integration: "Mailchimp", event: "Contact synced", status: "warning", time: "15 min ago", details: "3 contacts had missing email addresses" },
    { id: "e6", integration: "GitHub", event: "Issue linked", status: "success", time: "22 min ago", details: "Task #T-456 linked to GitHub issue #123" },
    { id: "e7", integration: "OpenAI", event: "API call", status: "success", time: "25 min ago", details: "AI summary generated for lead analysis" },
    { id: "e8", integration: "Webhooks", event: "Payload delivered", status: "error", time: "30 min ago", details: "Endpoint timeout: api.analytics.io — retrying" },
    { id: "e9", integration: "Google Drive", event: "File uploaded", status: "success", time: "45 min ago", details: "Proposal_v3.pdf synced to shared folder" },
    { id: "e10", integration: "Zoom", event: "Meeting recorded", status: "success", time: "1 hour ago", details: "Recording saved and linked to project" },
];
