// src/contexts/CopilotContext.tsx
// ============================================================================
// COPILOT CONTEXT PROVIDER — Automatic Page & Entity Detection
//
// Uses react-router-dom's useLocation + useParams to auto-detect:
//  - module: leads, clients, projects, analytics, tasks, finance, etc.
//  - entityId: extracted from URL (e.g., /client-list/:id → id)
//  - page: list, detail, pipeline, kanban, dashboard, etc.
//
// Consumers call useCopilotContext() to get {module, entityId, page, label}
// ============================================================================

import React, { createContext, useContext, useMemo } from "react";
import { useLocation } from "react-router-dom";

// ── Types ───────────────────────────────────────────────────────────────

export interface CopilotPageContext {
    /** Current CRM module (leads, clients, projects, etc.) */
    module: string;
    /** Entity UUID if on a detail page */
    entityId?: string;
    /** Page type (list, detail, pipeline, etc.) */
    page: string;
    /** Human-readable label for UI display */
    label: string;
}

// ── Route → Context mapping ─────────────────────────────────────────────

interface RoutePattern {
    match: RegExp;
    module: string;
    page: string;
    label: string;
    /** Capture group index for entityId (1-based) */
    entityGroup?: number;
}

const ROUTE_PATTERNS: RoutePattern[] = [
    // Dashboard
    { match: /^\/dashboard$/, module: "dashboard", page: "overview", label: "Dashboard" },

    // Leads
    { match: /^\/pipeline$/, module: "deals", page: "pipeline", label: "Deals Pipeline" },
    { match: /^\/leads\/pipeline$/, module: "leads", page: "pipeline", label: "Lead Pipeline" },
    { match: /^\/leads\/sources$/, module: "leads", page: "sources", label: "Lead Sources" },
    { match: /^\/leads\/([a-f0-9-]+)$/, module: "leads", page: "detail", label: "Lead Detail", entityGroup: 1 },
    { match: /^\/leads$/, module: "leads", page: "list", label: "Leads" },

    // Accounts and contacts
    { match: /^\/accounts$/, module: "accounts", page: "list", label: "Accounts" },
    { match: /^\/client-list\/([a-f0-9-]+)\/edit$/, module: "accounts", page: "edit", label: "Account Edit", entityGroup: 1 },
    { match: /^\/client-list\/([a-f0-9-]+)$/, module: "accounts", page: "detail", label: "Account Detail", entityGroup: 1 },
    { match: /^\/client-list\/add$/, module: "accounts", page: "add", label: "New Account" },
    { match: /^\/client-list$/, module: "accounts", page: "list", label: "Accounts" },
    { match: /^\/contacts$/, module: "contacts", page: "contacts", label: "Contacts" },
    { match: /^\/clients\/groups$/, module: "accounts", page: "groups", label: "Account Segments" },
    { match: /^\/crm$/, module: "clients", page: "crm", label: "CRM" },

    // Deals
    { match: /^\/deals$/, module: "deals", page: "list", label: "Deals" },
    { match: /^\/projects\/add$/, module: "deals", page: "add", label: "New Deal" },
    { match: /^\/projects\/([a-f0-9-]+)\/edit$/, module: "deals", page: "edit", label: "Deal Edit", entityGroup: 1 },
    { match: /^\/projects\/([a-f0-9-]+)$/, module: "deals", page: "detail", label: "Deal Detail", entityGroup: 1 },
    { match: /^\/projects$/, module: "deals", page: "list", label: "Deals" },
    { match: /^\/kanban$/, module: "deals", page: "pipeline", label: "Deals Pipeline" },

    // Tasks
    { match: /^\/tasks$/, module: "tasks", page: "list", label: "Tasks" },
    { match: /^\/time-tracking$/, module: "tasks", page: "time-tracking", label: "Time Tracking" },

    // Finance
    { match: /^\/invoice\/create$/, module: "finance", page: "create-invoice", label: "New Invoice" },
    { match: /^\/invoice\/[^/]+\/edit$/, module: "finance", page: "edit-invoice", label: "Edit Invoice" },
    { match: /^\/invoice\/[^/]+$/, module: "finance", page: "invoice-detail", label: "Invoice Detail" },
    { match: /^\/invoice\/list$/, module: "finance", page: "invoice-list", label: "Invoice List" },
    { match: /^\/invoice$/, module: "finance", page: "invoices", label: "Invoices" },
    { match: /^\/expenses$/, module: "finance", page: "bookkeeping", label: "Bookkeeping" },
    { match: /^\/bookkeeping$/, module: "finance", page: "bookkeeping", label: "Bookkeeping" },
    { match: /^\/proposals$/, module: "finance", page: "proposals", label: "Proposals" },
    { match: /^\/quotes$/, module: "finance", page: "proposals", label: "Proposals" },
    { match: /^\/subscriptions$/, module: "finance", page: "subscriptions", label: "Subscriptions" },

    // Bookings
    { match: /^\/bookings$/, module: "bookings", page: "list", label: "Bookings" },
    { match: /^\/booking-pages$/, module: "bookings", page: "pages", label: "Booking Pages" },
    { match: /^\/services$/, module: "bookings", page: "services", label: "Services" },

    // HR / Employees
    { match: /^\/employees\/departments$/, module: "hr", page: "departments", label: "Departments" },
    { match: /^\/employees\/attendance$/, module: "hr", page: "attendance", label: "Attendance" },
    { match: /^\/employees\/leave-requests$/, module: "hr", page: "leave", label: "Leave Requests" },
    { match: /^\/employees/, module: "hr", page: "list", label: "Employees" },

    // Communication
    { match: /^\/mail$/, module: "communication", page: "mail", label: "Mail" },
    { match: /^\/letterbox$/, module: "communication", page: "mail", label: "Mail" },
    { match: /^\/chats$/, module: "communication", page: "chat", label: "Chat" },
    { match: /^\/calendar$/, module: "communication", page: "calendar", label: "Calendar" },
    { match: /^\/notifications$/, module: "communication", page: "notifications", label: "Notifications" },

    // Files & Documents
    { match: /^\/filemanager$/, module: "files", page: "manager", label: "File Manager" },
    { match: /^\/documents$/, module: "files", page: "documents", label: "Documents" },

    // Analytics
    { match: /^\/analytics/, module: "analytics", page: "overview", label: "Analytics" },

    // E-commerce
    { match: /^\/ecommerce$/, module: "ecommerce", page: "overview", label: "E-Commerce" },

    // Settings
    { match: /^\/settings/, module: "settings", page: "settings", label: "Settings" },

    // AI
    { match: /^\/ai\/sales-assistant$/, module: "ai", page: "sales-assistant", label: "AI Sales Assistant" },
    { match: /^\/ai\/email-generator$/, module: "ai", page: "email-generator", label: "Email Generator" },
];

function resolveContext(pathname: string): CopilotPageContext {
    for (const pattern of ROUTE_PATTERNS) {
        const match = pathname.match(pattern.match);
        if (match) {
            return {
                module: pattern.module,
                page: pattern.page,
                label: pattern.label,
                entityId: pattern.entityGroup ? match[pattern.entityGroup] : undefined,
            };
        }
    }

    // Fallback for unknown routes
    return { module: "general", page: "unknown", label: "Assistant" };
}

// ── Context ─────────────────────────────────────────────────────────────

const CopilotCtx = createContext<CopilotPageContext>({
    module: "general",
    page: "unknown",
    label: "Assistant",
});

export function useCopilotContext(): CopilotPageContext {
    return useContext(CopilotCtx);
}

// ── Provider ────────────────────────────────────────────────────────────

export function CopilotContextProvider({ children }: { children: React.ReactNode }) {
    const location = useLocation();

    const ctx = useMemo(
        () => resolveContext(location.pathname),
        [location.pathname],
    );

    return <CopilotCtx.Provider value={ctx}>{children}</CopilotCtx.Provider>;
}
