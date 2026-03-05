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
    ): Promise<ResolvedCopilotContext> {
        const resolvedModule = module || 'general';

        // Always fetch tenant AI context — the backbone of all intelligence
        const aiContext = await tenantAIContextService.buildContext(tenantId);

        // If no entity, return context-only
        if (!entityId) {
            return { module: resolvedModule, aiContext };
        }

        // Hydrate entity data based on module
        let entityData: Record<string, any> | undefined;

        try {
            entityData = await this.hydrateEntity(resolvedModule, entityId, tenantId);
        } catch (err: any) {
            // Entity not found or access denied — log and continue with context-only
            logger.warn('[Copilot] Entity hydration failed', {
                module: resolvedModule,
                entityId,
                tenantId,
                error: err.message,
            });
        }

        return {
            module: resolvedModule,
            entityId,
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
}

export const contextResolverService = new ContextResolverService();
