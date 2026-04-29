import { llmAdapterService } from './llm-adapter.service';
import { logger } from '../../common/utils/logger';

export type CopilotCRMEntityType = 'lead' | 'client' | 'contact' | 'unknown';
export type CopilotCRMActionType = 'get_record' | 'update_record' | 'unknown';
export type CopilotCRMUpdateField = 'name' | 'email' | 'phone' | 'status' | 'notes' | '';

export interface CopilotCRMAction {
    type: 'action';
    action: CopilotCRMActionType;
    entityType: CopilotCRMEntityType;
    filters: {
        name?: string;
        email?: string;
        phone?: string;
    };
    update: {
        field: CopilotCRMUpdateField;
        value: string;
    };
    needsConfirmation: boolean;
}

const EMPTY_ACTION: CopilotCRMAction = {
    type: 'action',
    action: 'unknown',
    entityType: 'unknown',
    filters: {},
    update: { field: '', value: '' },
    needsConfirmation: false,
};

class CopilotActionParserService {
    async parse(message: string): Promise<CopilotCRMAction> {
        const trimmed = message.trim();
        if (!trimmed) return EMPTY_ACTION;

        const llmAction = await this.parseWithLLM(trimmed);
        if (llmAction && llmAction.action !== 'unknown') {
            return llmAction;
        }

        return this.parseWithRules(trimmed);
    }

    private async parseWithLLM(message: string): Promise<CopilotCRMAction | null> {
        if (!llmAdapterService.isAvailable()) {
            return null;
        }

        const result = await llmAdapterService.generate({
            systemPrompt: `You are a CRM AI assistant.
Convert the user's message into CRM action JSON.

Supported actions:
- get_record
- update_record

Return ONLY compact JSON with this exact shape:
{
  "type": "action",
  "action": "get_record | update_record | unknown",
  "entityType": "lead | client | contact | unknown",
  "filters": {
    "name": "",
    "email": "",
    "phone": ""
  },
  "update": {
    "field": "name | email | phone | status | notes |",
    "value": ""
  },
  "needsConfirmation": true
}

Rules:
- For lookup questions like "tell me about Bharti Dhawan", use get_record.
- For updates like "change phone of Bharti to 9876543210", use update_record.
- If the message is just a person's name, treat it as get_record with filters.name.
- If you are unsure, set action to unknown.
- Never add prose, markdown, or code fences.`,
            userMessage: message,
            maxTokens: 220,
            temperature: 0,
        });

        if (!result?.text) return null;

        try {
            const parsed = JSON.parse(result.text) as Partial<CopilotCRMAction>;
            return this.normalizeParsedAction(parsed);
        } catch (error: any) {
            logger.warn('[CopilotActionParser] LLM JSON parse failed', {
                error: error.message,
                preview: result.text.substring(0, 200),
            });
            return null;
        }
    }

    private parseWithRules(message: string): CopilotCRMAction {
        const updateMatch = message.match(
            /^(?:please\s+)?(?:change|update|set)\s+(name|email|phone|status|notes)\s+(?:of|for)\s+(?:(lead|client|contact)\s+)?(.+?)\s+to\s+(.+)$/i,
        );

        if (updateMatch) {
            const [, fieldRaw, entityRaw, identifierRaw, valueRaw] = updateMatch;
            return {
                type: 'action',
                action: 'update_record',
                entityType: this.normalizeEntityType(entityRaw),
                filters: this.buildFilters(identifierRaw),
                update: {
                    field: this.normalizeField(fieldRaw),
                    value: valueRaw.trim(),
                },
                needsConfirmation: true,
            };
        }

        const readMatch = message.match(
            /^(?:please\s+)?(?:tell me about|show(?: me)?|show details of|show me details of|details of|detail of|find|get)\s+(?:(lead|client|contact)\s+)?(.+)$/i,
        );

        if (readMatch) {
            const [, entityRaw, identifierRaw] = readMatch;
            return {
                type: 'action',
                action: 'get_record',
                entityType: this.normalizeEntityType(entityRaw),
                filters: this.buildFilters(identifierRaw),
                update: { field: '', value: '' },
                needsConfirmation: false,
            };
        }

        if (this.looksLikeDirectLookup(message)) {
            return {
                type: 'action',
                action: 'get_record',
                entityType: 'unknown',
                filters: this.buildFilters(message),
                update: { field: '', value: '' },
                needsConfirmation: false,
            };
        }

        return EMPTY_ACTION;
    }

    private normalizeParsedAction(input: Partial<CopilotCRMAction> | null | undefined): CopilotCRMAction {
        if (!input) return EMPTY_ACTION;

        return {
            type: 'action',
            action: input.action === 'get_record' || input.action === 'update_record' ? input.action : 'unknown',
            entityType: this.normalizeEntityType(input.entityType),
            filters: {
                name: input.filters?.name?.trim() || undefined,
                email: input.filters?.email?.trim() || undefined,
                phone: input.filters?.phone?.trim() || undefined,
            },
            update: {
                field: this.normalizeField(input.update?.field),
                value: input.update?.value?.trim() || '',
            },
            needsConfirmation: input.action === 'update_record',
        };
    }

    private normalizeEntityType(value?: string): CopilotCRMEntityType {
        switch ((value || '').trim().toLowerCase()) {
            case 'lead':
                return 'lead';
            case 'client':
                return 'client';
            case 'contact':
                return 'contact';
            default:
                return 'unknown';
        }
    }

    private normalizeField(value?: string): CopilotCRMUpdateField {
        const lower = (value || '').trim().toLowerCase();
        if (lower === 'name' || lower === 'email' || lower === 'phone' || lower === 'status' || lower === 'notes') {
            return lower;
        }
        return '';
    }

    private buildFilters(identifier: string): CopilotCRMAction['filters'] {
        const value = identifier.trim();
        if (!value) return {};
        if (value.includes('@')) return { email: value };
        if (/^\+?[0-9()\-\s]{7,}$/.test(value)) return { phone: value };
        return { name: value };
    }

    private looksLikeDirectLookup(message: string): boolean {
        const normalized = message.trim();
        if (normalized.length < 3 || normalized.length > 80) return false;
        if (/[?.!]/.test(normalized)) return false;
        if (/\b(change|update|set|delete|remove|create|add)\b/i.test(normalized)) return false;
        return /^[a-z0-9@.+'\-\s]+$/i.test(normalized);
    }
}

export const copilotActionParserService = new CopilotActionParserService();
