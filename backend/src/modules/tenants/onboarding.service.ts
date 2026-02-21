// src/modules/tenants/onboarding.service.ts
// ============================================================================
// TENANT ONBOARDING ENGINE
//
// Seeds default data when a new tenant is created:
//  1. Roles:       Owner (all), Admin (all), Manager (ops), Staff (basic)
//  2. Permissions:  Role→Permission mappings per role tier
//  3. Lead Sources: Website, Referral, Social Media, Cold Call, Email Campaign
//  4. Settings:     TenantSettings with defaults
//  5. Admin User:   Employee record linked to the registering user
//
// Runs as a single Prisma interactive transaction so everything rolls back
// on failure — no partial onboarding.
// ============================================================================

import { Prisma, PrismaClient } from '@prisma/client';
import { PERMISSIONS } from '../../common/constants/permissions';
import { DEFAULT_ENABLED_MODULES } from '../../common/constants/modules.guard';
import { logger } from '../../common/utils/logger';

type TxPrisma = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

// ============================================================================
// ROLE DEFINITIONS — scoped permission sets per tier
// ============================================================================

/**
 * Admin: Full CRM access (everything except tenant-level admin like subscription)
 */
const ADMIN_PERMISSIONS: string[] = Object.values(PERMISSIONS);

/**
 * Manager: Day-to-day operations — CRM modules, reporting, team mgmt
 * Excludes: tenant admin, subscription, audit, user/role management, settings
 */
const MANAGER_PERMISSIONS: string[] = [
    // Dashboard
    PERMISSIONS.DASHBOARD_VIEW,
    // Leads (full)
    PERMISSIONS.LEADS_VIEW, PERMISSIONS.LEADS_CREATE, PERMISSIONS.LEADS_UPDATE,
    PERMISSIONS.LEADS_DELETE, PERMISSIONS.LEADS_ASSIGN, PERMISSIONS.LEADS_CONVERT,
    PERMISSIONS.LEADS_IMPORT, PERMISSIONS.LEADS_EXPORT,
    // Lead Sources
    PERMISSIONS.LEAD_SOURCES_VIEW, PERMISSIONS.LEAD_SOURCES_CREATE,
    PERMISSIONS.LEAD_SOURCES_UPDATE, PERMISSIONS.LEAD_SOURCES_DELETE,
    // Tags
    PERMISSIONS.TAGS_VIEW, PERMISSIONS.TAGS_CREATE, PERMISSIONS.TAGS_UPDATE, PERMISSIONS.TAGS_DELETE,
    // Clients (full)
    PERMISSIONS.CLIENTS_VIEW, PERMISSIONS.CLIENTS_CREATE, PERMISSIONS.CLIENTS_UPDATE,
    PERMISSIONS.CLIENTS_DELETE, PERMISSIONS.CLIENTS_ASSIGN,
    // Contacts
    PERMISSIONS.CONTACTS_VIEW, PERMISSIONS.CONTACTS_CREATE, PERMISSIONS.CONTACTS_UPDATE, PERMISSIONS.CONTACTS_DELETE,
    // Groups
    PERMISSIONS.GROUPS_VIEW, PERMISSIONS.GROUPS_CREATE, PERMISSIONS.GROUPS_UPDATE, PERMISSIONS.GROUPS_DELETE,
    // Tasks (full)
    PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_UPDATE,
    PERMISSIONS.TASKS_DELETE, PERMISSIONS.TASKS_ASSIGN,
    // Projects (full)
    PERMISSIONS.PROJECTS_VIEW, PERMISSIONS.PROJECTS_CREATE, PERMISSIONS.PROJECTS_UPDATE,
    PERMISSIONS.PROJECTS_DELETE, PERMISSIONS.PROJECTS_MANAGE_MEMBERS,
    // Calendar
    PERMISSIONS.CALENDAR_VIEW, PERMISSIONS.CALENDAR_CREATE, PERMISSIONS.CALENDAR_UPDATE, PERMISSIONS.CALENDAR_DELETE,
    // Files
    PERMISSIONS.FILES_VIEW, PERMISSIONS.FILES_CREATE, PERMISSIONS.FILES_UPDATE,
    PERMISSIONS.FILES_DELETE, PERMISSIONS.FILES_DOWNLOAD,
    // Folders
    PERMISSIONS.FOLDERS_VIEW, PERMISSIONS.FOLDERS_CREATE, PERMISSIONS.FOLDERS_UPDATE, PERMISSIONS.FOLDERS_DELETE,
    // Invoices (full)
    PERMISSIONS.INVOICES_VIEW, PERMISSIONS.INVOICES_CREATE, PERMISSIONS.INVOICES_UPDATE,
    PERMISSIONS.INVOICES_DELETE, PERMISSIONS.INVOICES_SEND, PERMISSIONS.INVOICES_MARK_PAID,
    // Expenses (full)
    PERMISSIONS.EXPENSES_VIEW, PERMISSIONS.EXPENSES_CREATE, PERMISSIONS.EXPENSES_UPDATE,
    PERMISSIONS.EXPENSES_DELETE, PERMISSIONS.EXPENSES_APPROVE, PERMISSIONS.EXPENSES_REIMBURSE,
    // Bookings (full)
    PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.BOOKINGS_CREATE, PERMISSIONS.BOOKINGS_UPDATE,
    PERMISSIONS.BOOKINGS_DELETE, PERMISSIONS.BOOKINGS_CONFIRM, PERMISSIONS.BOOKINGS_CANCEL,
    // Products
    PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.PRODUCTS_CREATE, PERMISSIONS.PRODUCTS_UPDATE, PERMISSIONS.PRODUCTS_DELETE,
    // Categories
    PERMISSIONS.CATEGORIES_VIEW, PERMISSIONS.CATEGORIES_CREATE, PERMISSIONS.CATEGORIES_UPDATE, PERMISSIONS.CATEGORIES_DELETE,
    // Orders (full)
    PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_CREATE, PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.ORDERS_DELETE, PERMISSIONS.ORDERS_PROCESS, PERMISSIONS.ORDERS_SHIP, PERMISSIONS.ORDERS_REFUND,
    // Email
    PERMISSIONS.EMAILS_VIEW, PERMISSIONS.EMAILS_CREATE, PERMISSIONS.EMAILS_SEND, PERMISSIONS.EMAILS_DELETE,
    // Chat
    PERMISSIONS.CHAT_VIEW, PERMISSIONS.CHAT_CREATE, PERMISSIONS.CHAT_DELETE,
    // Analytics
    PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.ANALYTICS_EXPORT,
    // Employees (view only — not create/delete)
    PERMISSIONS.EMPLOYEES_VIEW,
    // Notifications
    PERMISSIONS.NOTIFICATIONS_VIEW, PERMISSIONS.NOTIFICATIONS_MANAGE,
    // Roof Estimator
    PERMISSIONS.ROOF_ESTIMATOR_VIEW, PERMISSIONS.ROOF_ESTIMATOR_CREATE, PERMISSIONS.ROOF_ESTIMATOR_DELETE,
];

/**
 * Staff: Basic CRM access — view + create most things, no delete/admin
 */
const STAFF_PERMISSIONS: string[] = [
    // Dashboard
    PERMISSIONS.DASHBOARD_VIEW,
    // Leads (view + create + update only)
    PERMISSIONS.LEADS_VIEW, PERMISSIONS.LEADS_CREATE, PERMISSIONS.LEADS_UPDATE,
    // Lead Sources (view only)
    PERMISSIONS.LEAD_SOURCES_VIEW,
    // Tags (view only)
    PERMISSIONS.TAGS_VIEW,
    // Clients (view + create + update)
    PERMISSIONS.CLIENTS_VIEW, PERMISSIONS.CLIENTS_CREATE, PERMISSIONS.CLIENTS_UPDATE,
    // Contacts (view + create + update)
    PERMISSIONS.CONTACTS_VIEW, PERMISSIONS.CONTACTS_CREATE, PERMISSIONS.CONTACTS_UPDATE,
    // Groups (view)
    PERMISSIONS.GROUPS_VIEW,
    // Tasks (view + create + update)
    PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_UPDATE,
    // Projects (view only)
    PERMISSIONS.PROJECTS_VIEW,
    // Calendar (view + create + update)
    PERMISSIONS.CALENDAR_VIEW, PERMISSIONS.CALENDAR_CREATE, PERMISSIONS.CALENDAR_UPDATE,
    // Files (view + upload + download)
    PERMISSIONS.FILES_VIEW, PERMISSIONS.FILES_CREATE, PERMISSIONS.FILES_DOWNLOAD,
    // Folders (view)
    PERMISSIONS.FOLDERS_VIEW,
    // Invoices (view only)
    PERMISSIONS.INVOICES_VIEW,
    // Expenses (view + create own)
    PERMISSIONS.EXPENSES_VIEW, PERMISSIONS.EXPENSES_CREATE,
    // Bookings (view + create + update)
    PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.BOOKINGS_CREATE, PERMISSIONS.BOOKINGS_UPDATE,
    // Products (view)
    PERMISSIONS.PRODUCTS_VIEW,
    // Categories (view)
    PERMISSIONS.CATEGORIES_VIEW,
    // Orders (view)
    PERMISSIONS.ORDERS_VIEW,
    // Email (view + create + send)
    PERMISSIONS.EMAILS_VIEW, PERMISSIONS.EMAILS_CREATE, PERMISSIONS.EMAILS_SEND,
    // Chat (view + create)
    PERMISSIONS.CHAT_VIEW, PERMISSIONS.CHAT_CREATE,
    // Analytics (view)
    PERMISSIONS.ANALYTICS_VIEW,
    // Notifications (view)
    PERMISSIONS.NOTIFICATIONS_VIEW,
    // Roof Estimator (view + create)
    PERMISSIONS.ROOF_ESTIMATOR_VIEW, PERMISSIONS.ROOF_ESTIMATOR_CREATE,
];

// ============================================================================
// DEFAULT SEED DATA
// ============================================================================

const DEFAULT_LEAD_SOURCES = [
    { name: 'Website', description: 'Leads from website contact forms' },
    { name: 'Referral', description: 'Referred by existing clients or partners' },
    { name: 'Social Media', description: 'Leads from social media channels' },
    { name: 'Cold Call', description: 'Outbound cold call prospecting' },
    { name: 'Email Campaign', description: 'Leads from email marketing campaigns' },
    { name: 'Walk-In', description: 'Walk-in or in-person inquiries' },
    { name: 'Trade Show', description: 'Leads from trade shows and events' },
    { name: 'Google Ads', description: 'Leads from Google Ads campaigns' },
];

const DEFAULT_TAGS = [
    { name: 'Hot Lead', color: '#EF4444' },
    { name: 'VIP', color: '#8B5CF6' },
    { name: 'Follow Up', color: '#F59E0B' },
    { name: 'Returning', color: '#10B981' },
    { name: 'Enterprise', color: '#3B82F6' },
];

// ============================================================================
// ONBOARDING SERVICE
// ============================================================================

export interface OnboardingResult {
    roles: { owner: string; admin: string; manager: string; staff: string };
    leadSourceCount: number;
    tagCount: number;
    settingsCreated: boolean;
}

class OnboardingService {
    /**
     * Seed all default data for a newly created tenant.
     * Must be called INSIDE an existing Prisma interactive transaction.
     *
     * @param tx - Prisma transaction client
     * @param tenantId - The newly created tenant's ID
     * @returns An `OnboardingResult` with created role IDs and counts
     */
    async seedTenant(tx: TxPrisma, tenantId: string): Promise<OnboardingResult> {
        logger.info(`[Onboarding] Seeding tenant ${tenantId} ...`);

        // ── 1. Fetch all permission records from the DB ─────────────────────
        const allPermissions = await tx.permission.findMany();
        const permMap = new Map(allPermissions.map((p) => [p.code, p.id]));

        // ── 2. Create Roles ─────────────────────────────────────────────────
        const ownerRole = await tx.role.create({
            data: {
                name: 'Owner',
                description: 'Full access — tenant owner',
                isSystemRole: true,
                tenantId,
            },
        });

        const adminRole = await tx.role.create({
            data: {
                name: 'Admin',
                description: 'Full CRM access with user and settings management',
                isSystemRole: true,
                tenantId,
            },
        });

        const managerRole = await tx.role.create({
            data: {
                name: 'Manager',
                description: 'Day-to-day operations, team management, reporting',
                isSystemRole: false,
                tenantId,
            },
        });

        const staffRole = await tx.role.create({
            data: {
                name: 'Staff',
                description: 'Basic CRM access — view, create, and update',
                isSystemRole: false,
                isDefault: true, // default role for new employees
                tenantId,
            },
        });

        // ── 3. Assign Permissions to Roles ──────────────────────────────────
        // Owner: ALL permissions
        await this.assignPermissions(tx, ownerRole.id, allPermissions.map((p) => p.id));

        // Admin: ALL permissions 
        await this.assignPermissions(
            tx,
            adminRole.id,
            ADMIN_PERMISSIONS.map((code) => permMap.get(code)).filter(Boolean) as string[]
        );

        // Manager: operations subset
        await this.assignPermissions(
            tx,
            managerRole.id,
            MANAGER_PERMISSIONS.map((code) => permMap.get(code)).filter(Boolean) as string[]
        );

        // Staff: basic subset
        await this.assignPermissions(
            tx,
            staffRole.id,
            STAFF_PERMISSIONS.map((code) => permMap.get(code)).filter(Boolean) as string[]
        );

        // ── 4. Default Lead Sources ─────────────────────────────────────────
        await tx.leadSource.createMany({
            data: DEFAULT_LEAD_SOURCES.map((src) => ({
                tenantId,
                name: src.name,
                description: src.description,
                isActive: true,
            })),
        });

        // ── 5. Default Tags ─────────────────────────────────────────────────
        await tx.tag.createMany({
            data: DEFAULT_TAGS.map((tag) => ({
                tenantId,
                name: tag.name,
                color: tag.color,
            })),
        });

        // ── 6. Default Tenant Settings ──────────────────────────────────────
        await tx.tenantSettings.create({
            data: {
                tenantId,
                timezone: 'America/Toronto',
                currency: 'CAD',
                language: 'en',
                invoicePrefix: 'INV-',
                invoiceNextNumber: 1001,
                notificationSettings: {
                    emailOnNewLead: true,
                    emailOnInvoicePaid: true,
                    emailOnTaskAssigned: true,
                    emailOnBookingConfirmed: true,
                },
                integrations: {},
            },
        });

        // ── 7. Enabled Modules + Business Type — stored in Tenant.settings JSON ──
        await tx.tenant.update({
            where: { id: tenantId },
            data: {
                settings: {
                    enabledModules: [...DEFAULT_ENABLED_MODULES],
                    businessType: 'general',
                },
            },
        });

        // ── 8. Mark onboarding as complete (MUST be last) ───────────────────
        // This flag is the lifecycle gate: set TRUE only after all seed steps
        // succeed. Because we're inside a transaction, if any prior step
        // failed, this line is never reached and the flag stays false.
        await tx.tenant.update({
            where: { id: tenantId },
            data: { onboardingCompleted: true },
        });

        logger.info(`[Onboarding] Tenant ${tenantId} seeded — 4 roles, ${DEFAULT_LEAD_SOURCES.length} lead sources, ${DEFAULT_TAGS.length} tags, onboarding complete`);

        return {
            roles: {
                owner: ownerRole.id,
                admin: adminRole.id,
                manager: managerRole.id,
                staff: staffRole.id,
            },
            leadSourceCount: DEFAULT_LEAD_SOURCES.length,
            tagCount: DEFAULT_TAGS.length,
            settingsCreated: true,
        };
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Bulk-create RolePermission records for a given role.
     */
    private async assignPermissions(tx: TxPrisma, roleId: string, permissionIds: string[]): Promise<void> {
        if (!permissionIds.length) return;

        await tx.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({
                roleId,
                permissionId,
            })),
            skipDuplicates: true,
        });
    }
}

export const onboardingService = new OnboardingService();
