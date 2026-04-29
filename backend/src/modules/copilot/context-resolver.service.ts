// src/modules/copilot/context-resolver.service.ts
// ============================================================================
// CONTEXT RESOLVER SERVICE — Entity Hydration Layer
//
// Transforms lightweight frontend context { module, entityId } into
// full entity data + tenant AI context for intelligence routing.
//
// All queries are strictly tenant-scoped via tenantId.
// ============================================================================

import { tenantAIContextService } from '../analytics/ai-context.service';
import { leadsService } from '../leads/leads.service';
import { clientsService } from '../clients/clients.service';
import { projectsService } from '../projects/projects.service';
import { TenantAIContext } from '../analytics/ai-context.dto';
import { logger } from '../../common/utils/logger';
import { prisma } from '../../config/database';

// ── Resolved Context DTO ────────────────────────────────────────────────

export interface ResolvedCopilotContext {
    /** Which module the user is on */
    module: string;

    /** Entity ID (if on a detail page) */
    entityId?: string;

    /** Hydrated entity data (shape depends on module) */
    entityData?: Record<string, any>;

    /** Full tenant AI context (always present) */
    aiContext: TenantAIContext;
}

// ── Service ─────────────────────────────────────────────────────────────

class ContextResolverService {
    private inferModuleFromMessage(message?: string): string | undefined {
        if (!message) return undefined;
        const lower = message.toLowerCase();

        if (/\blead\b/.test(lower)) return 'leads';
        if (/\bclient\b|\bcustomer\b|\bcontact\b/.test(lower)) return 'clients';
        if (/\bproject\b|\bjob\b/.test(lower)) return 'projects';
        if (/\binvoice\b|\bbill\b|\bquote\b|\bestimate\b|\bproposal\b/.test(lower)) return 'finance';

        return undefined;
    }

    private extractEntitySearchText(message?: string): string {
        if (!message) return '';

        let normalized = ` ${message.toLowerCase()} `;
        const phrasesToRemove = [
            'can you',
            'could you',
            'please',
            'tell me',
            'show me',
            'give me',
            'the detail of',
            'details of',
            'detail of',
            'detail',
            'details',
            'information',
            'info',
            'about',
            'for',
            'regarding',
            'record',
            'lead',
            'client',
            'customer',
            'contact',
            'project',
            'job',
            'invoice',
            'bill',
            'quote',
            'estimate',
            'proposal',
        ];

        for (const phrase of phrasesToRemove) {
            normalized = normalized.replace(new RegExp(`\\b${phrase.replace(/\s+/g, '\\s+')}\\b`, 'gi'), ' ');
        }

        normalized = normalized.replace(/[^a-z0-9@.\- ]+/gi, ' ');
        return normalized.replace(/\s+/g, ' ').trim();
    }

    private scoreCandidate(haystacks: Array<string | null | undefined>, searchText: string, searchTokens: string[]): number {
        const values = haystacks
            .map((value) => String(value || '').trim().toLowerCase())
            .filter(Boolean);
        if (!values.length) return 0;

        let score = 0;
        for (const value of values) {
            if (searchText && value === searchText) score = Math.max(score, 120);
            else if (searchText && value.includes(searchText)) score = Math.max(score, 90);

            const matchedTokens = searchTokens.filter((token) => value.includes(token)).length;
            if (matchedTokens > 0) {
                score = Math.max(score, matchedTokens * 20);
                if (matchedTokens === searchTokens.length && searchTokens.length > 1) {
                    score = Math.max(score, 80);
                }
            }
        }

        return score;
    }

    private async resolveEntityFromMessage(
        tenantId: string,
        module: string,
        message?: string,
    ): Promise<{ module: string; entityId?: string } | null> {
        const searchText = this.extractEntitySearchText(message);
        if (!searchText) return null;

        const searchTokens = searchText.split(' ').filter((token) => token.length >= 2);
        if (!searchTokens.length) return null;

        const requestedModule = this.inferModuleFromMessage(message) || module;
        const modulesToSearch = requestedModule === 'general' || requestedModule === 'dashboard' || requestedModule === 'analytics'
            ? ['leads', 'clients', 'projects', 'finance']
            : [requestedModule];

        let bestMatch: { module: string; entityId: string; score: number } | null = null;

        for (const candidateModule of modulesToSearch) {
            const match = await this.searchModuleEntity(candidateModule, tenantId, searchText, searchTokens);
            if (match && (!bestMatch || match.score > bestMatch.score)) {
                bestMatch = match;
            }
        }

        return bestMatch ? { module: bestMatch.module, entityId: bestMatch.entityId } : null;
    }

    private async searchModuleEntity(
        module: string,
        tenantId: string,
        searchText: string,
        searchTokens: string[],
    ): Promise<{ module: string; entityId: string; score: number } | null> {
        if (module === 'leads') {
            const rows = await prisma.lead.findMany({
                where: {
                    tenantId,
                    OR: [
                        { firstName: { contains: searchText, mode: 'insensitive' } },
                        { lastName: { contains: searchText, mode: 'insensitive' } },
                        { companyName: { contains: searchText, mode: 'insensitive' } },
                        { email: { contains: searchText, mode: 'insensitive' } },
                    ],
                },
                select: { id: true, firstName: true, lastName: true, companyName: true, email: true },
                take: 8,
            });

            let best: { module: string; entityId: string; score: number } | null = null;
            for (const row of rows) {
                const score = this.scoreCandidate(
                    [row.firstName, row.lastName, `${row.firstName || ''} ${row.lastName || ''}`.trim(), row.companyName, row.email],
                    searchText,
                    searchTokens,
                );
                if (score > 0 && (!best || score > best.score)) {
                    best = { module: 'leads', entityId: row.id, score };
                }
            }
            return best;
        }

        if (module === 'clients') {
            const rows = await prisma.client.findMany({
                where: {
                    tenantId,
                    OR: [
                        { clientName: { contains: searchText, mode: 'insensitive' } },
                        { companyName: { contains: searchText, mode: 'insensitive' } },
                        { primaryEmail: { contains: searchText, mode: 'insensitive' } },
                        { contactName: { contains: searchText, mode: 'insensitive' } },
                    ],
                },
                select: { id: true, clientName: true, companyName: true, primaryEmail: true, contactName: true },
                take: 8,
            });

            let best: { module: string; entityId: string; score: number } | null = null;
            for (const row of rows) {
                const score = this.scoreCandidate([row.clientName, row.companyName, row.primaryEmail, row.contactName], searchText, searchTokens);
                if (score > 0 && (!best || score > best.score)) {
                    best = { module: 'clients', entityId: row.id, score };
                }
            }
            return best;
        }

        if (module === 'projects') {
            const rows = await prisma.project.findMany({
                where: {
                    tenantId,
                    OR: [
                        { name: { contains: searchText, mode: 'insensitive' } },
                        { projectNumber: { contains: searchText, mode: 'insensitive' } },
                        { client: { clientName: { contains: searchText, mode: 'insensitive' } } },
                    ],
                },
                select: {
                    id: true,
                    name: true,
                    projectNumber: true,
                    client: { select: { clientName: true } },
                },
                take: 8,
            });

            let best: { module: string; entityId: string; score: number } | null = null;
            for (const row of rows) {
                const score = this.scoreCandidate([row.name, row.projectNumber, row.client?.clientName], searchText, searchTokens);
                if (score > 0 && (!best || score > best.score)) {
                    best = { module: 'projects', entityId: row.id, score };
                }
            }
            return best;
        }

        if (module === 'finance') {
            const quotes = await prisma.quote.findMany({
                where: {
                    tenantId,
                    OR: [
                        { quoteNumber: { contains: searchText, mode: 'insensitive' } },
                        { client: { clientName: { contains: searchText, mode: 'insensitive' } } },
                        { lead: { firstName: { contains: searchText, mode: 'insensitive' } } },
                        { lead: { lastName: { contains: searchText, mode: 'insensitive' } } },
                    ],
                },
                select: {
                    id: true,
                    quoteNumber: true,
                    client: { select: { clientName: true } },
                    lead: { select: { firstName: true, lastName: true } },
                },
                take: 6,
            });

            const invoices = await prisma.invoice.findMany({
                where: {
                    tenantId,
                    OR: [
                        { invoiceNumber: { contains: searchText, mode: 'insensitive' } },
                        { client: { clientName: { contains: searchText, mode: 'insensitive' } } },
                    ],
                },
                select: {
                    id: true,
                    invoiceNumber: true,
                    client: { select: { clientName: true } },
                },
                take: 6,
            });

            let best: { module: string; entityId: string; score: number } | null = null;
            for (const row of quotes) {
                const score = this.scoreCandidate(
                    [row.quoteNumber, row.client?.clientName, `${row.lead?.firstName || ''} ${row.lead?.lastName || ''}`.trim()],
                    searchText,
                    searchTokens,
                );
                if (score > 0 && (!best || score > best.score)) {
                    best = { module: 'finance', entityId: row.id, score };
                }
            }
            for (const row of invoices) {
                const score = this.scoreCandidate([row.invoiceNumber, row.client?.clientName], searchText, searchTokens);
                if (score > 0 && (!best || score > best.score)) {
                    best = { module: 'finance', entityId: row.id, score };
                }
            }
            return best;
        }

        return null;
    }

    /**
     * Resolve frontend context into full entity data + AI context.
     *
     * Flow:
     *   1. Always build tenant AI context (dashboard metrics, insights)
     *   2. If entityId is provided, hydrate the specific entity
     *   3. Return combined context for intelligence routing
     */
    async resolve(
        tenantId: string,
        module?: string,
        entityId?: string,
        message?: string,
    ): Promise<ResolvedCopilotContext> {
        let resolvedModule = module || 'general';

        // Always fetch tenant AI context — the backbone of all intelligence
        const aiContext = await tenantAIContextService.buildContext(tenantId);

        let resolvedEntityId = entityId;
        if (!resolvedEntityId && message) {
            const inferred = await this.resolveEntityFromMessage(tenantId, resolvedModule, message);
            if (inferred?.entityId) {
                resolvedModule = inferred.module;
                resolvedEntityId = inferred.entityId;
            }
        }

        // If no entity, return context-only
        if (!resolvedEntityId) {
            return { module: resolvedModule, aiContext };
        }

        // Hydrate entity data based on module
        let entityData: Record<string, any> | undefined;

        try {
            entityData = await this.hydrateEntity(resolvedModule, resolvedEntityId, tenantId);
        } catch (err: any) {
            // Entity not found or access denied — log and continue with context-only
            logger.warn('[Copilot] Entity hydration failed', {
                module: resolvedModule,
                entityId: resolvedEntityId,
                tenantId,
                error: err.message,
            });
        }

        return {
            module: resolvedModule,
            entityId: resolvedEntityId,
            entityData,
            aiContext,
        };
    }

    /**
     * Hydrate a specific entity based on module type.
     * Returns a flat, AI-friendly data object.
     */
    private async hydrateEntity(
        module: string,
        entityId: string,
        tenantId: string,
    ): Promise<Record<string, any> | undefined> {
        switch (module) {
            case 'leads':
                return this.hydrateLead(entityId, tenantId);

            case 'clients':
                return this.hydrateClient(entityId, tenantId);

            case 'projects':
                return this.hydrateProject(entityId, tenantId);

            case 'finance':
                return this.hydrateFinance(entityId, tenantId);

            default:
                // No entity hydration needed for this module
                return undefined;
        }
    }

    // ── Entity Hydrators ────────────────────────────────────────────────

    private async hydrateLead(id: string, tenantId: string): Promise<Record<string, any>> {
        const lead = await leadsService.getById(id, tenantId);
        return {
            type: 'lead',
            id: lead.id,
            name: lead.fullName,
            email: lead.email,
            company: lead.companyName,
            status: lead.status,
            temperature: lead.temperature,
            value: lead.potentialValue,
            source: lead.leadSource?.name,
            assignedTo: lead.assignedTo
                ? `${lead.assignedTo.user.firstName} ${lead.assignedTo.user.lastName}`
                : 'Unassigned',
            createdAt: lead.createdAt,
            notes: lead.notes,
        };
    }

    private async hydrateClient(id: string, tenantId: string): Promise<Record<string, any>> {
        const client = await clientsService.getById(id, tenantId);
        return {
            type: 'client',
            id: client.id,
            name: client.clientName,
            email: client.primaryEmail,
            phone: client.primaryPhone,
            company: client.companyName,
            status: client.status,
            contactsCount: client.contactsCount,
            projectsCount: client.projectsCount,
            createdAt: client.createdAt,
        };
    }

    private async hydrateProject(id: string, tenantId: string): Promise<Record<string, any>> {
        const project = await projectsService.getById(id, tenantId);
        return {
            type: 'project',
            id: project.id,
            name: project.name,
            status: project.status,
            startDate: project.startDate,
            endDate: project.endDate,
            budget: project.budget,
            progress: project.progress,
            client: project.client?.clientName || null,
            tasksCount: project._count?.projectTasks ?? 0,
        };
    }

    private async hydrateFinance(id: string, tenantId: string): Promise<Record<string, any> | undefined> {
        const invoice = await prisma.invoice.findFirst({
            where: { id, tenantId },
            select: {
                id: true,
                invoiceNumber: true,
                total: true,
                amountPaid: true,
                amountDue: true,
                status: true,
                dueDate: true,
                client: { select: { clientName: true } },
            },
        });

        if (invoice) {
            return {
                type: 'invoice',
                id: invoice.id,
                name: invoice.invoiceNumber,
                client: invoice.client?.clientName || null,
                total: invoice.total,
                amountPaid: invoice.amountPaid,
                amountDue: invoice.amountDue,
                status: invoice.status,
                dueDate: invoice.dueDate,
            };
        }

        const quote = await prisma.quote.findFirst({
            where: { id, tenantId },
            select: {
                id: true,
                quoteNumber: true,
                total: true,
                status: true,
                validUntil: true,
                client: { select: { clientName: true } },
                lead: { select: { firstName: true, lastName: true } },
            },
        });

        if (!quote) return undefined;

        return {
            type: 'quote',
            id: quote.id,
            name: quote.quoteNumber,
            client: quote.client?.clientName || `${quote.lead?.firstName || ''} ${quote.lead?.lastName || ''}`.trim() || null,
            total: quote.total,
            status: quote.status,
            validUntil: quote.validUntil,
        };
    }
}

export const contextResolverService = new ContextResolverService();
