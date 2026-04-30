import { Prisma, ClientStatus, ContactType, LeadStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';
import { CopilotResponse } from './copilot-intelligence.service';
import {
    CopilotCRMAction,
    CopilotCRMEntityType,
    CopilotCRMUpdateField,
    copilotActionParserService,
} from './copilot-action-parser.service';
import { copilotSessionService } from './copilot-session.service';

type CRMRecordType = 'lead' | 'client' | 'contact';

interface CRMRecordMatch {
    entityType: CRMRecordType;
    id: string;
    displayName: string;
    email?: string | null;
    phone?: string | null;
    status?: string | null;
    owner?: string | null;
    notes?: string | null;
    company?: string | null;
    summaryLines: string[];
    score: number;
}

interface PendingCRMUpdate {
    kind: 'crm_update';
    entityType: CRMRecordType;
    entityId: string;
    displayName: string;
    field: CopilotCRMUpdateField;
    oldValue: string;
    newValue: string;
}

interface PendingCRMUpdateDisambiguation {
    kind: 'crm_update_disambiguation';
    field: CopilotCRMUpdateField;
    newValue: string;
    candidates: CRMRecordMatch[];
}

const ALLOWED_FIELDS = new Set<CopilotCRMUpdateField>(['name', 'email', 'phone', 'status', 'notes']);
const LEAD_STATUS_VALUES = new Set<string>(Object.values(LeadStatus));
const CLIENT_STATUS_VALUES = new Set<string>(Object.values(ClientStatus));
const YES_PATTERN = /^(yes|yep|yeah|confirm|do it|go ahead|proceed|ok|okay|sure)$/i;
const NO_PATTERN = /^(no|nope|cancel|stop|don'?t|do not)$/i;

class CopilotCRMActionService {
    async tryHandle(tenantId: string, employeeId: string, message: string): Promise<CopilotResponse | null> {
        try {
            const pendingResponse = await this.handlePendingConfirmation(tenantId, employeeId, message);
            if (pendingResponse) {
                return pendingResponse;
            }

            const selectedCandidateResponse = await this.handleCandidateSelection(tenantId, employeeId, message);
            if (selectedCandidateResponse) {
                return selectedCandidateResponse;
            }

            if (!this.shouldAttemptAction(message)) {
                return null;
            }

            const action = await copilotActionParserService.parse(message);
            if (action.action === 'unknown') {
                return null;
            }

            if (action.action === 'get_record') {
                return this.handleRead(tenantId, employeeId, action);
            }

            if (action.action === 'update_record') {
                return this.handleUpdateIntent(tenantId, employeeId, action);
            }

            return null;
        } catch (error: any) {
            logger.warn('[CopilotCRMAction] Failed to handle action', {
                tenantId,
                employeeId,
                message,
                error: error.message,
            });

            return {
                answer: error.message || 'I could not complete that CRM action safely.',
                suggestedActions: ['Try again with a clearer request'],
                suggestedFollowUps: ['Show details of Bharti Dhawan', 'Update phone of Bharti to 9876543210'],
            };
        }
    }

    private async handlePendingConfirmation(
        tenantId: string,
        employeeId: string,
        message: string,
    ): Promise<CopilotResponse | null> {
        const state = await copilotSessionService.getState(tenantId, employeeId);
        const pending = state.pendingAction as PendingCRMUpdate | PendingCRMUpdateDisambiguation | undefined;
        if (!pending || (pending.kind !== 'crm_update' && pending.kind !== 'crm_update_disambiguation')) {
            return null;
        }

        if (pending.kind === 'crm_update_disambiguation') {
            return null;
        }

        const trimmed = message.trim();
        if (YES_PATTERN.test(trimmed)) {
            const updated = await this.executeUpdate(tenantId, pending);
            await this.patchSessionState(tenantId, employeeId, { pendingAction: null, lastCandidates: null });

            return {
                answer: [
                    `Updated **${pending.displayName}** successfully.`,
                    '',
                    `• **Field:** ${this.labelField(pending.field)}`,
                    `• **Old value:** ${pending.oldValue || 'Empty'}`,
                    `• **New value:** ${pending.newValue || 'Empty'}`,
                    '',
                    ...this.formatRecord(updated),
                ].join('\n'),
                suggestedActions: [],
                suggestedFollowUps: [],
            };
        }

        if (NO_PATTERN.test(trimmed)) {
            await this.patchSessionState(tenantId, employeeId, { pendingAction: null });
            return {
                answer: `Okay, I cancelled the pending update for **${pending.displayName}**.`,
                suggestedActions: [],
                suggestedFollowUps: [],
            };
        }

        return {
            answer: [
                `I still have a pending update for **${pending.displayName}**.`,
                '',
                `• **Field:** ${this.labelField(pending.field)}`,
                `• **Change:** ${pending.oldValue || 'Empty'} -> ${pending.newValue || 'Empty'}`,
                '',
                'Reply with **yes** to confirm or **no** to cancel.',
            ].join('\n'),
            suggestedActions: [],
            suggestedFollowUps: [],
        };
    }

    private async handleRead(tenantId: string, employeeId: string, action: CopilotCRMAction): Promise<CopilotResponse> {
        const matches = await this.findRecords(tenantId, action.entityType, action.filters);

        if (matches.length === 0) {
            await this.patchSessionState(tenantId, employeeId, { lastCandidates: null });
            return {
                answer: 'I could not find any matching lead, client, or contact for that search.',
                suggestedActions: [],
                suggestedFollowUps: [],
            };
        }

        if (matches.length > 1) {
            await this.patchSessionState(tenantId, employeeId, {
                lastCandidates: matches as unknown as Record<string, unknown>[],
                pendingAction: null,
            });
            return {
                answer: this.formatAmbiguousResults(matches),
                suggestedActions: [],
                suggestedFollowUps: [],
            };
        }

        const [match] = matches;
        await this.patchSessionState(tenantId, employeeId, { lastCandidates: null });
        return {
            answer: this.formatRecord(match).join('\n'),
            suggestedActions: [],
            suggestedFollowUps: [],
        };
    }

    private async handleUpdateIntent(
        tenantId: string,
        employeeId: string,
        action: CopilotCRMAction,
    ): Promise<CopilotResponse> {
        if (!action.update.field || !ALLOWED_FIELDS.has(action.update.field)) {
            return {
                answer: 'I can only update these fields right now: **name, email, phone, status, notes**.',
                suggestedActions: ['Choose a supported field'],
                suggestedFollowUps: ['Update phone of Bharti to 9876543210', 'Update notes of Rakesh to Interested in premium plan'],
            };
        }

        if (!action.update.value.trim()) {
            const recordName = action.filters.name || action.filters.email || action.filters.phone || 'that record';
            const fieldLabel = this.labelField(action.update.field || 'notes').toLowerCase();
            return {
                answer: `What ${fieldLabel} would you like to set for **${recordName}**?`,
                suggestedActions: [],
                suggestedFollowUps: [],
            };
        }

        if (!this.isFieldSupported(action.entityType, action.update.field)) {
            return {
                answer: this.unsupportedFieldMessage(action.entityType, action.update.field),
                suggestedActions: [],
                suggestedFollowUps: [],
            };
        }

        const matches = await this.findRecords(tenantId, action.entityType, action.filters);

        if (matches.length === 0) {
            return {
                answer: 'I could not find a matching record to update.',
                suggestedActions: [],
                suggestedFollowUps: [],
            };
        }

        if (matches.length > 1) {
            await copilotSessionService.setState(tenantId, employeeId, {
                pendingAction: {
                    kind: 'crm_update_disambiguation',
                    field: action.update.field,
                    newValue: action.update.value.trim(),
                    candidates: matches,
                } as unknown as Record<string, unknown>,
                lastCandidates: matches as unknown as Record<string, unknown>[],
            });

            return {
                answer: this.formatAmbiguousResults(matches, true),
                suggestedActions: [],
                suggestedFollowUps: [],
            };
        }

        const [match] = matches;
        if (!this.isFieldSupported(match.entityType, action.update.field)) {
            return {
                answer: this.unsupportedFieldMessage(match.entityType, action.update.field),
                suggestedActions: [],
                suggestedFollowUps: [],
            };
        }

        const pending: PendingCRMUpdate = {
            kind: 'crm_update',
            entityType: match.entityType,
            entityId: match.id,
            displayName: match.displayName,
            field: action.update.field,
            oldValue: this.currentFieldValue(match, action.update.field),
            newValue: action.update.value.trim(),
        };

        await copilotSessionService.setState(tenantId, employeeId, { pendingAction: pending as unknown as Record<string, unknown> });

        return {
            answer: [
                `I found **${match.displayName}** (${this.labelEntity(match.entityType)}).`,
                '',
                `Please confirm this update:`,
                `• **Field:** ${this.labelField(pending.field)}`,
                `• **Old value:** ${pending.oldValue || 'Empty'}`,
                `• **New value:** ${pending.newValue}`,
                '',
                'Reply with **yes** to confirm or **no** to cancel.',
            ].join('\n'),
            suggestedActions: [],
            suggestedFollowUps: [],
        };
    }

    private async handleCandidateSelection(
        tenantId: string,
        employeeId: string,
        message: string,
    ): Promise<CopilotResponse | null> {
        const state = await copilotSessionService.getState(tenantId, employeeId);
        const candidates = (state.lastCandidates || []) as unknown as CRMRecordMatch[];
        if (!candidates.length) return null;

        const selected = this.resolveSelectedCandidate(message, candidates);
        if (!selected) return null;

        const pending = state.pendingAction as PendingCRMUpdateDisambiguation | undefined;
        if (pending?.kind === 'crm_update_disambiguation') {
            if (!this.isFieldSupported(selected.entityType, pending.field)) {
                await this.patchSessionState(tenantId, employeeId, { pendingAction: null, lastCandidates: null });
                return {
                    answer: this.unsupportedFieldMessage(selected.entityType, pending.field),
                    suggestedActions: [],
                    suggestedFollowUps: [],
                };
            }

            const hydrated = await this.getRecordById(tenantId, selected.entityType, selected.id);
            if (!hydrated) {
                await this.patchSessionState(tenantId, employeeId, { pendingAction: null, lastCandidates: null });
                return {
                    answer: 'That record is no longer available. Please search again.',
                    suggestedActions: [],
                    suggestedFollowUps: [],
                };
            }

            const update: PendingCRMUpdate = {
                kind: 'crm_update',
                entityType: hydrated.entityType,
                entityId: hydrated.id,
                displayName: hydrated.displayName,
                field: pending.field,
                oldValue: this.currentFieldValue(hydrated, pending.field),
                newValue: pending.newValue,
            };
            await this.patchSessionState(tenantId, employeeId, {
                pendingAction: update as unknown as Record<string, unknown>,
                lastCandidates: null,
            });

            return {
                answer: [
                    `Okay, I selected **${hydrated.displayName}** (${this.labelEntity(hydrated.entityType)}).`,
                    '',
                    'Please confirm this update:',
                    `• **Field:** ${this.labelField(update.field)}`,
                    `• **Old value:** ${update.oldValue || 'Empty'}`,
                    `• **New value:** ${update.newValue}`,
                    '',
                    'Reply with **yes** to confirm or **no** to cancel.',
                ].join('\n'),
                suggestedActions: [],
                suggestedFollowUps: [],
            };
        }

        const hydrated = await this.getRecordById(tenantId, selected.entityType, selected.id);
        await this.patchSessionState(tenantId, employeeId, { lastCandidates: null });

        if (!hydrated) {
            return {
                answer: 'That record is no longer available. Please search again.',
                suggestedActions: [],
                suggestedFollowUps: [],
            };
        }

        return {
            answer: this.formatRecord(hydrated).join('\n'),
            suggestedActions: [],
            suggestedFollowUps: [],
        };
    }

    private async executeUpdate(tenantId: string, pending: PendingCRMUpdate): Promise<CRMRecordMatch> {
        if (pending.entityType === 'lead') {
            const updated = await prisma.lead.update({
                where: { id_tenantId: { id: pending.entityId, tenantId } },
                data: this.buildLeadUpdate(pending.field, pending.newValue),
                include: {
                    assignedTo: { include: { user: { select: { firstName: true, lastName: true } } } },
                    leadSource: true,
                },
            });

            return this.mapLead(updated);
        }

        if (pending.entityType === 'client') {
            const updated = await prisma.client.update({
                where: { id_tenantId: { id: pending.entityId, tenantId } },
                data: this.buildClientUpdate(pending.field, pending.newValue),
            });

            return this.mapClient(updated);
        }

        const updated = await prisma.contact.update({
            where: { id_tenantId: { id: pending.entityId, tenantId } },
            data: this.buildContactUpdate(pending.field, pending.newValue),
            include: { company: { select: { clientName: true } } },
        });

        return this.mapContact(updated);
    }

    private buildLeadUpdate(field: CopilotCRMUpdateField, value: string): Prisma.LeadUpdateInput {
        switch (field) {
            case 'name': {
                const [firstName, ...rest] = value.trim().split(/\s+/);
                return { firstName, lastName: rest.join(' ') || '' };
            }
            case 'email':
                return { email: value };
            case 'phone':
                return { phone: value };
            case 'status': {
                const normalized = value.trim().toUpperCase();
                if (!LEAD_STATUS_VALUES.has(normalized)) {
                    throw new Error(`Unsupported lead status "${value}". Try one of: ${Array.from(LEAD_STATUS_VALUES).join(', ')}.`);
                }
                return { status: normalized as LeadStatus };
            }
            case 'notes':
                return { notes: value };
            default:
                return {};
        }
    }

    private buildClientUpdate(field: CopilotCRMUpdateField, value: string): Prisma.ClientUpdateInput {
        switch (field) {
            case 'name':
                return { clientName: value };
            case 'email':
                return { primaryEmail: value };
            case 'phone':
                return { primaryPhone: value };
            case 'status': {
                const normalized = value.trim().toUpperCase();
                if (!CLIENT_STATUS_VALUES.has(normalized)) {
                    throw new Error(`Unsupported client status "${value}". Try one of: ${Array.from(CLIENT_STATUS_VALUES).join(', ')}.`);
                }
                return { status: normalized as ClientStatus };
            }
            case 'notes':
                return { internalNotes: value };
            default:
                return {};
        }
    }

    private buildContactUpdate(field: CopilotCRMUpdateField, value: string): Prisma.ContactUpdateInput {
        switch (field) {
            case 'name':
                return { contactName: value };
            case 'email':
                return { email: value };
            case 'phone':
                return { mobilePhone: value };
            default:
                return {};
        }
    }

    private async findRecords(
        tenantId: string,
        entityType: CopilotCRMEntityType,
        filters: { name?: string; email?: string; phone?: string },
    ): Promise<CRMRecordMatch[]> {
        const targets: CRMRecordType[] = entityType === 'unknown'
            ? ['lead', 'client', 'contact']
            : [entityType];

        const matches = (await Promise.all(targets.map((target) => this.findByEntity(target, tenantId, filters))))
            .flat()
            .filter((match) => match.score > 0)
            .sort((a, b) => b.score - a.score);

        const bestScore = matches[0]?.score || 0;
        if (bestScore >= 120) {
            return matches.filter((match) => match.score === bestScore).slice(0, 6);
        }
        if (bestScore >= 95) {
            return matches.filter((match) => match.score >= 95).slice(0, 6);
        }

        return matches.slice(0, 6);
    }

    private async getRecordById(
        tenantId: string,
        entityType: CRMRecordType,
        id: string,
    ): Promise<CRMRecordMatch | null> {
        if (entityType === 'lead') {
            const row = await prisma.lead.findFirst({
                where: { id, tenantId },
                include: {
                    assignedTo: { include: { user: { select: { firstName: true, lastName: true } } } },
                    leadSource: true,
                },
            });
            return row ? this.mapLead(row) : null;
        }

        if (entityType === 'client') {
            const row = await prisma.client.findFirst({ where: { id, tenantId } });
            return row ? this.mapClient(row) : null;
        }

        const row = await prisma.contact.findFirst({
            where: { id, tenantId },
            include: { company: { select: { clientName: true } } },
        });
        return row ? this.mapContact(row) : null;
    }

    private async findByEntity(
        entityType: CRMRecordType,
        tenantId: string,
        filters: { name?: string; email?: string; phone?: string },
    ): Promise<CRMRecordMatch[]> {
        if (entityType === 'lead') {
            let rows = await prisma.lead.findMany({
                where: {
                    tenantId,
                    ...this.buildLeadWhere(filters),
                },
                include: {
                    assignedTo: { include: { user: { select: { firstName: true, lastName: true } } } },
                    leadSource: true,
                },
                take: 6,
            });
            if (rows.length === 0 && filters.name) {
                rows = await prisma.lead.findMany({
                    where: { tenantId },
                    include: {
                        assignedTo: { include: { user: { select: { firstName: true, lastName: true } } } },
                        leadSource: true,
                    },
                    orderBy: { updatedAt: 'desc' },
                    take: 100,
                });
            }
            return rows.map((row) => this.mapLead(row, filters));
        }

        if (entityType === 'client') {
            let rows = await prisma.client.findMany({
                where: {
                    tenantId,
                    ...this.buildClientWhere(filters),
                },
                take: 6,
            });
            if (rows.length === 0 && filters.name) {
                rows = await prisma.client.findMany({
                    where: { tenantId },
                    orderBy: { updatedAt: 'desc' },
                    take: 100,
                });
            }
            return rows.map((row) => this.mapClient(row, filters));
        }

        let rows = await prisma.contact.findMany({
            where: {
                tenantId,
                ...this.buildContactWhere(filters),
            },
            include: { company: { select: { clientName: true } } },
            take: 6,
        });
        if (rows.length === 0 && filters.name) {
            rows = await prisma.contact.findMany({
                where: { tenantId },
                include: { company: { select: { clientName: true } } },
                orderBy: { updatedAt: 'desc' },
                take: 100,
            });
        }
        return rows.map((row) => this.mapContact(row, filters));
    }

    private buildLeadWhere(filters: { name?: string; email?: string; phone?: string }): Prisma.LeadWhereInput {
        if (filters.email) {
            return { email: { contains: filters.email, mode: 'insensitive' } };
        }
        if (filters.phone) {
            return { phone: { contains: filters.phone, mode: 'insensitive' } };
        }

        const name = (filters.name || '').trim();
        const tokens = name.split(/\s+/).filter(Boolean);
        if (!tokens.length) return {};

        return {
            OR: [
                { firstName: { contains: name, mode: 'insensitive' } },
                { lastName: { contains: name, mode: 'insensitive' } },
                { companyName: { contains: name, mode: 'insensitive' } },
                {
                    AND: tokens.map((token) => ({
                        OR: [
                            { firstName: { contains: token, mode: 'insensitive' as const } },
                            { lastName: { contains: token, mode: 'insensitive' as const } },
                            { companyName: { contains: token, mode: 'insensitive' as const } },
                        ],
                    })),
                },
            ],
        };
    }

    private buildClientWhere(filters: { name?: string; email?: string; phone?: string }): Prisma.ClientWhereInput {
        if (filters.email) {
            return { primaryEmail: { contains: filters.email, mode: 'insensitive' } };
        }
        if (filters.phone) {
            return { primaryPhone: { contains: filters.phone, mode: 'insensitive' } };
        }
        if (!filters.name) return {};

        const name = filters.name.trim();
        const tokens = name.split(/\s+/).filter(Boolean);
        return {
            OR: [
                { clientName: { contains: name, mode: 'insensitive' } },
                { companyName: { contains: name, mode: 'insensitive' } },
                { contactName: { contains: name, mode: 'insensitive' } },
                {
                    AND: tokens.map((token) => ({
                        OR: [
                            { clientName: { contains: token, mode: 'insensitive' as const } },
                            { companyName: { contains: token, mode: 'insensitive' as const } },
                            { contactName: { contains: token, mode: 'insensitive' as const } },
                        ],
                    })),
                },
            ],
        };
    }

    private buildContactWhere(filters: { name?: string; email?: string; phone?: string }): Prisma.ContactWhereInput {
        if (filters.email) {
            return { email: { contains: filters.email, mode: 'insensitive' } };
        }
        if (filters.phone) {
            return {
                OR: [
                    { mobilePhone: { contains: filters.phone, mode: 'insensitive' } },
                    { officePhone: { contains: filters.phone, mode: 'insensitive' } },
                ],
            };
        }
        if (!filters.name) return {};

        const name = filters.name.trim();
        const tokens = name.split(/\s+/).filter(Boolean);
        return {
            OR: [
                { contactName: { contains: name, mode: 'insensitive' } },
                {
                    AND: tokens.map((token) => ({
                        contactName: { contains: token, mode: 'insensitive' as const },
                    })),
                },
            ],
        };
    }

    private mapLead(row: any, filters?: { name?: string; email?: string; phone?: string }): CRMRecordMatch {
        const displayName = `${row.firstName || ''} ${row.lastName || ''}`.trim();
        return {
            entityType: 'lead',
            id: row.id,
            displayName,
            email: row.email,
            phone: row.phone,
            status: row.status,
            owner: row.assignedTo ? `${row.assignedTo.user.firstName} ${row.assignedTo.user.lastName}` : 'Unassigned',
            notes: row.notes,
            company: row.companyName,
            score: this.scoreMatch([displayName, row.companyName, row.email, row.phone], filters),
            summaryLines: [
                `• **Email:** ${row.email || 'Not provided'}`,
                `• **Phone:** ${row.phone || 'Not provided'}`,
                `• **Status:** ${row.status || 'Unknown'}`,
                `• **Owner:** ${row.assignedTo ? `${row.assignedTo.user.firstName} ${row.assignedTo.user.lastName}` : 'Unassigned'}`,
                `• **Company:** ${row.companyName || 'Not provided'}`,
                `• **Notes:** ${row.notes || 'None'}`,
            ],
        };
    }

    private mapClient(row: any, filters?: { name?: string; email?: string; phone?: string }): CRMRecordMatch {
        return {
            entityType: 'client',
            id: row.id,
            displayName: row.clientName,
            email: row.primaryEmail,
            phone: row.primaryPhone,
            status: row.status,
            owner: row.assignedOwnerId || null,
            notes: row.internalNotes,
            company: row.companyName,
            score: this.scoreMatch([row.clientName, row.companyName, row.primaryEmail, row.primaryPhone], filters),
            summaryLines: [
                `• **Email:** ${row.primaryEmail || 'Not provided'}`,
                `• **Phone:** ${row.primaryPhone || 'Not provided'}`,
                `• **Status:** ${row.status || 'Unknown'}`,
                `• **Company:** ${row.companyName || 'Not provided'}`,
                `• **Contact:** ${row.contactName || 'Not provided'}`,
                `• **Notes:** ${row.internalNotes || 'None'}`,
            ],
        };
    }

    private mapContact(row: any, filters?: { name?: string; email?: string; phone?: string }): CRMRecordMatch {
        return {
            entityType: 'contact',
            id: row.id,
            displayName: row.contactName,
            email: row.email,
            phone: row.mobilePhone || row.officePhone,
            status: row.type || ContactType.CLIENT,
            owner: null,
            notes: null,
            company: row.company?.clientName || null,
            score: this.scoreMatch([row.contactName, row.email, row.mobilePhone, row.officePhone, row.company?.clientName], filters),
            summaryLines: [
                `• **Email:** ${row.email || 'Not provided'}`,
                `• **Phone:** ${row.mobilePhone || row.officePhone || 'Not provided'}`,
                `• **Type:** ${row.type || 'Unknown'}`,
                `• **Company:** ${row.company?.clientName || 'Not linked'}`,
                `• **Job Title:** ${row.jobTitle || 'Not provided'}`,
            ],
        };
    }

    private scoreMatch(values: Array<string | null | undefined>, filters?: { name?: string; email?: string; phone?: string }): number {
        const search = (filters?.email || filters?.phone || filters?.name || '').toLowerCase().trim();
        if (!search) return 0;

        let score = 0;
        const tokens = search.split(/\s+/).filter(Boolean);
        for (const value of values) {
            const normalized = String(value || '').toLowerCase();
            if (!normalized) continue;
            if (normalized === search) score = Math.max(score, 120);
            else if (normalized.includes(search)) score = Math.max(score, 100);

            const matched = tokens.filter((token) => normalized.includes(token)).length;
            if (tokens.length > 1 && matched === tokens.length) {
                score = Math.max(score, 95);
            } else if (tokens.length === 1 && matched === 1) {
                score = Math.max(score, 55);
            }

            const similarity = this.similarity(normalized, search);
            if (similarity >= 0.82) {
                score = Math.max(score, 88);
            } else if (similarity >= 0.68) {
                score = Math.max(score, 70);
            }
        }

        return score;
    }

    private formatRecord(record: CRMRecordMatch): string[] {
        return [
            `**${record.displayName}** (${this.labelEntity(record.entityType)})`,
            '',
            ...record.summaryLines,
        ];
    }

    private formatAmbiguousResults(matches: CRMRecordMatch[], forUpdate = false): string {
        const intro = forUpdate
            ? 'I found multiple matches for that update. Please be more specific:'
            : 'I found multiple matches. Please tell me which one you want:';

        return [
            intro,
            '',
            ...matches.map((match, index) => `${index + 1}. **${match.displayName}** (${this.labelEntity(match.entityType)})${match.email ? ` — ${match.email}` : ''}${match.phone ? ` — ${match.phone}` : ''}`),
        ].join('\n');
    }

    private labelEntity(entityType: CRMRecordType): string {
        switch (entityType) {
            case 'lead':
                return 'Lead';
            case 'client':
                return 'Client';
            case 'contact':
                return 'Contact';
        }
    }

    private labelField(field: CopilotCRMUpdateField): string {
        switch (field) {
            case 'name':
                return 'Name';
            case 'email':
                return 'Email';
            case 'phone':
                return 'Phone';
            case 'status':
                return 'Status';
            case 'notes':
                return 'Notes';
            default:
                return 'Field';
        }
    }

    private currentFieldValue(record: CRMRecordMatch, field: CopilotCRMUpdateField): string {
        switch (field) {
            case 'name':
                return record.displayName || '';
            case 'email':
                return record.email || '';
            case 'phone':
                return record.phone || '';
            case 'status':
                return record.status || '';
            case 'notes':
                return record.notes || '';
            default:
                return '';
        }
    }

    private isFieldSupported(entityType: CopilotCRMEntityType, field: CopilotCRMUpdateField): boolean {
        if (entityType === 'unknown') return true;
        if (entityType === 'contact' && (field === 'status' || field === 'notes')) return false;
        return true;
    }

    private unsupportedFieldMessage(entityType: CopilotCRMEntityType, field: CopilotCRMUpdateField): string {
        if (entityType === 'contact' && field === 'status') {
            return 'Contacts do not have a CRM status field in this system, so I cannot update status on a contact.';
        }
        if (entityType === 'contact' && field === 'notes') {
            return 'Contacts do not have a notes field in this system, so I cannot update notes on a contact.';
        }
        return `I cannot update **${field}** for that entity right now.`;
    }

    private shouldAttemptAction(message: string): boolean {
        const lower = message.trim().toLowerCase();
        if (!lower) return false;

        if (/\b(change|update|set)\b/.test(lower)) return true;
        if (/\b(tell me about|show details|details of|detail of|find|lookup|get record)\b/.test(lower)) return true;
        if (/\b(lead|client|contact)\b/.test(lower)) return true;
        if (lower.includes('@')) return true;

        return /^[a-z0-9.'+\-\s]{3,80}$/i.test(lower) && !/\b(how|why|what|when|where|which|should|could|would|can)\b/.test(lower);
    }

    private resolveSelectedCandidate(message: string, candidates: CRMRecordMatch[]): CRMRecordMatch | null {
        const trimmed = message.trim();
        if (/^\d+$/.test(trimmed)) {
            const index = Number(trimmed) - 1;
            return candidates[index] || null;
        }

        const normalized = this.normalizeComparable(trimmed
            .replace(/\b(show|details|detail|of|about|tell|me|lead|client|contact)\b/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim());
        if (!normalized) return null;

        const scored = candidates
            .map((candidate) => ({
                candidate,
                score: this.scoreMatch([candidate.displayName, candidate.email, candidate.phone, candidate.company], { name: normalized }),
            }))
            .sort((a, b) => b.score - a.score);

        return scored[0]?.score >= 90 ? scored[0].candidate : null;
    }

    private async patchSessionState(
        tenantId: string,
        employeeId: string,
        patch: { pendingAction?: Record<string, unknown> | null; lastCandidates?: Record<string, unknown>[] | null },
    ): Promise<void> {
        const current = await copilotSessionService.getState(tenantId, employeeId);
        await copilotSessionService.setState(tenantId, employeeId, {
            ...current,
            ...patch,
        });
    }

    private similarity(left: string, right: string): number {
        const a = this.normalizeComparable(left);
        const b = this.normalizeComparable(right);
        if (!a || !b) return 0;
        const distance = this.levenshteinDistance(a, b);
        return 1 - distance / Math.max(a.length, b.length);
    }

    private levenshteinDistance(a: string, b: string): number {
        const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
        for (let j = 1; j <= b.length; j += 1) matrix[0][j] = j;

        for (let i = 1; i <= a.length; i += 1) {
            for (let j = 1; j <= b.length; j += 1) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost,
                );
            }
        }

        return matrix[a.length][b.length];
    }

    private normalizeComparable(value: string): string {
        return value.toLowerCase().replace(/[^a-z0-9@.+\-\s]/g, ' ').replace(/\s+/g, ' ').trim();
    }
}

export const copilotCRMActionService = new CopilotCRMActionService();
