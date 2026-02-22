// src/modules/copilot/llm-adapter.service.ts
// ============================================================================
// LLM ADAPTER SERVICE — Provider-Agnostic Natural Language Generation
//
// KEY RULE: LLM = formatter, NOT data source.
//
// The LLM NEVER queries the database. It only receives:
//   - A system prompt with role/constraints
//   - The user's message
//   - Pre-sanitized context summaries (strings, not raw data)
//
// This adapter is designed to be provider-agnostic. Currently uses OpenAI,
// but can be swapped to Anthropic, Gemini, or local models by changing
// the implementation without touching any other service.
//
// Graceful degradation: If no API key is configured, all calls fall back
// to the deterministic intelligence engine automatically.
// ============================================================================

import { config } from '../../config';
import { logger } from '../../common/utils/logger';

// ── Types ───────────────────────────────────────────────────────────────

export interface LLMGenerateOptions {
    /** System prompt that constrains the LLM's behavior */
    systemPrompt: string;
    /** The user's actual message */
    userMessage: string;
    /** Pre-sanitized context (stringified entity/tenant summary) */
    contextSummary?: string;
    /** Conversation history for session continuity */
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    /** Max output tokens (default: 800) */
    maxTokens?: number;
    /** Temperature (default: 0.7) */
    temperature?: number;
}

export interface LLMGenerateResult {
    text: string;
    tokensUsed: number;
    model: string;
}

// ── System Prompts ──────────────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<string, string> = {
    email: `You are an expert business email writer embedded in a CRM system.
Write professional, concise emails based on the context provided.
- Use the entity data to personalize the email
- Keep the tone professional but warm
- Include a clear subject line at the start
- Format: Subject: [subject]\n\n[body]
- Do NOT invent facts not in the provided context
- Keep emails under 200 words`,

    summary: `You are a concise business analyst embedded in a CRM system.
Summarize the provided data clearly and actionably.
- Use bullet points for key metrics
- Highlight risks and opportunities
- Keep summaries under 150 words
- Do NOT invent data not provided in the context`,

    explanation: `You are a helpful CRM assistant that explains business metrics simply.
- Use plain language, avoid jargon
- Provide context for why metrics matter
- Suggest actionable next steps
- Keep explanations under 200 words`,

    general: `You are a helpful AI assistant embedded in a CRM system called ZODO.
You help users with business tasks based on their CRM data.
- Be concise and actionable
- Use the provided context to ground your response
- Do NOT make up data not in the context
- If asked to do something outside your capabilities, say so clearly
- Format responses with markdown (bold, bullets) for readability`,
};

// ── Adapter ─────────────────────────────────────────────────────────────

class LLMAdapterService {
    private apiKey: string | undefined;
    private model: string;

    constructor() {
        this.apiKey = config.ai.openaiApiKey;
        this.model = config.ai.openaiModel;
    }

    /** Whether the LLM adapter has a valid API key configured */
    isAvailable(): boolean {
        return !!this.apiKey;
    }

    /** Get a system prompt for the given intent category */
    getSystemPrompt(category: 'email' | 'summary' | 'explanation' | 'general'): string {
        return SYSTEM_PROMPTS[category] || SYSTEM_PROMPTS.general;
    }

    /**
     * Generate natural language using the LLM.
     *
     * The LLM receives ONLY:
     *   - System prompt (hardcoded, not user-controlled)
     *   - User message
     *   - Pre-sanitized context summary string
     *   - Conversation history (truncated)
     *
     * Returns null on any failure (caller falls back to deterministic).
     */
    async generate(options: LLMGenerateOptions): Promise<LLMGenerateResult | null> {
        if (!this.apiKey) {
            logger.debug('[LLM] No API key configured, skipping LLM generation');
            return null;
        }

        try {
            // Build messages array
            const messages: Array<{ role: string; content: string }> = [
                { role: 'system', content: options.systemPrompt },
            ];

            // Add context as a system-level injection (not user-editable)
            if (options.contextSummary) {
                messages.push({
                    role: 'system',
                    content: `Here is the current CRM context data (factual, do not contradict):\n\n${options.contextSummary}`,
                });
            }

            // Add conversation history (last 6 messages max)
            if (options.history && options.history.length > 0) {
                const recentHistory = options.history.slice(-6);
                for (const msg of recentHistory) {
                    messages.push({ role: msg.role, content: msg.content });
                }
            }

            // Add the current user message
            messages.push({ role: 'user', content: options.userMessage });

            // Call OpenAI-compatible API
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    max_tokens: options.maxTokens || 800,
                    temperature: options.temperature || 0.7,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                logger.error('[LLM] API error', {
                    status: response.status,
                    body: errorBody.substring(0, 200),
                });
                return null;
            }

            const data = await response.json() as any;
            const choice = data.choices?.[0];

            if (!choice?.message?.content) {
                logger.warn('[LLM] Empty response from API');
                return null;
            }

            const tokensUsed = data.usage?.total_tokens || 0;

            logger.info('[LLM] Generation complete', {
                model: this.model,
                tokensUsed,
                responseLength: choice.message.content.length,
            });

            return {
                text: choice.message.content.trim(),
                tokensUsed,
                model: this.model,
            };
        } catch (error: any) {
            logger.error('[LLM] Generation failed', {
                error: error.message,
            });
            return null;
        }
    }
}

export const llmAdapterService = new LLMAdapterService();
