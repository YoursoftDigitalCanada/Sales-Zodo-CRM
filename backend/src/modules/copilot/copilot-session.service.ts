// src/modules/copilot/copilot-session.service.ts
// ============================================================================
// COPILOT SESSION MEMORY — Conversational Context Persistence
//
// Stores the last N messages per user+tenant for follow-up questions.
// Uses Redis as primary store (with TTL) and falls back to an
// in-memory Map if Redis is not configured.
//
// Security:
//   - Tenant-scoped: keys include tenantId to prevent cross-tenant leakage
//   - Employee-scoped: each user has their own conversation history
//   - TTL-limited: sessions expire after 30 minutes of inactivity
//   - Content-truncated: messages are capped at 500 chars to limit storage
// ============================================================================

import { getRedisClient } from '../../config/redis';
import { logger } from '../../common/utils/logger';

// ── Types ───────────────────────────────────────────────────────────────

export interface CopilotSessionMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

// ── Configuration ───────────────────────────────────────────────────────

const MAX_MESSAGES = 10;          // Keep last 10 messages per session
const SESSION_TTL_SECONDS = 1800; // 30 minutes
const MAX_CONTENT_LENGTH = 500;   // Truncate message content

// ── Service ─────────────────────────────────────────────────────────────

class CopilotSessionService {

    // In-memory fallback when Redis is unavailable
    private memoryStore = new Map<string, CopilotSessionMessage[]>();
    private memoryTimers = new Map<string, NodeJS.Timeout>();

    // ── Public API ──────────────────────────────────────────────────────

    /**
     * Get conversation history for a user's copilot session.
     */
    async getHistory(tenantId: string, employeeId: string): Promise<CopilotSessionMessage[]> {
        const key = this.buildKey(tenantId, employeeId);
        const redis = getRedisClient();

        if (redis) {
            return this.getFromRedis(redis, key);
        }
        return this.getFromMemory(key);
    }

    /**
     * Append a message to the session history.
     */
    async appendMessage(
        tenantId: string,
        employeeId: string,
        message: CopilotSessionMessage,
    ): Promise<void> {
        const key = this.buildKey(tenantId, employeeId);
        const redis = getRedisClient();

        // Truncate content to limit storage
        const sanitized: CopilotSessionMessage = {
            role: message.role,
            content: message.content.substring(0, MAX_CONTENT_LENGTH),
            timestamp: message.timestamp,
        };

        if (redis) {
            await this.appendToRedis(redis, key, sanitized);
        } else {
            this.appendToMemory(key, sanitized);
        }
    }

    /**
     * Clear session history for a user (e.g., "New conversation" button).
     */
    async clearHistory(tenantId: string, employeeId: string): Promise<void> {
        const key = this.buildKey(tenantId, employeeId);
        const redis = getRedisClient();

        if (redis) {
            await redis.del(key);
            logger.debug('[CopilotSession] Redis history cleared', { key });
        } else {
            this.memoryStore.delete(key);
            const timer = this.memoryTimers.get(key);
            if (timer) {
                clearTimeout(timer);
                this.memoryTimers.delete(key);
            }
            logger.debug('[CopilotSession] Memory history cleared', { key });
        }
    }

    // ── Redis Implementation ────────────────────────────────────────────

    private async getFromRedis(redis: any, key: string): Promise<CopilotSessionMessage[]> {
        try {
            const data = await redis.get(key);
            if (!data) return [];
            return JSON.parse(data) as CopilotSessionMessage[];
        } catch (error: any) {
            logger.error('[CopilotSession] Redis read error', { error: error.message });
            return this.getFromMemory(key); // Fallback
        }
    }

    private async appendToRedis(redis: any, key: string, message: CopilotSessionMessage): Promise<void> {
        try {
            // Get existing history
            const existing = await this.getFromRedis(redis, key);

            // Append and trim to max
            existing.push(message);
            const trimmed = existing.slice(-MAX_MESSAGES);

            // Write back with TTL refresh
            await redis.setex(key, SESSION_TTL_SECONDS, JSON.stringify(trimmed));

            logger.debug('[CopilotSession] Message appended to Redis', {
                key,
                historySize: trimmed.length,
            });
        } catch (error: any) {
            logger.error('[CopilotSession] Redis write error', { error: error.message });
            this.appendToMemory(key, message); // Fallback
        }
    }

    // ── In-Memory Fallback ──────────────────────────────────────────────

    private getFromMemory(key: string): CopilotSessionMessage[] {
        return this.memoryStore.get(key) || [];
    }

    private appendToMemory(key: string, message: CopilotSessionMessage): void {
        const existing = this.memoryStore.get(key) || [];
        existing.push(message);

        // Trim to max
        const trimmed = existing.slice(-MAX_MESSAGES);
        this.memoryStore.set(key, trimmed);

        // Reset TTL timer
        const existingTimer = this.memoryTimers.get(key);
        if (existingTimer) clearTimeout(existingTimer);

        this.memoryTimers.set(key, setTimeout(() => {
            this.memoryStore.delete(key);
            this.memoryTimers.delete(key);
        }, SESSION_TTL_SECONDS * 1000));

        // LRU eviction: if memory store gets too large, evict oldest sessions
        if (this.memoryStore.size > 1000) {
            const firstKey = this.memoryStore.keys().next().value;
            if (firstKey) {
                this.memoryStore.delete(firstKey);
                const timer = this.memoryTimers.get(firstKey);
                if (timer) {
                    clearTimeout(timer);
                    this.memoryTimers.delete(firstKey);
                }
            }
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    private buildKey(tenantId: string, employeeId: string): string {
        return `copilot:session:${tenantId}:${employeeId}`;
    }
}

export const copilotSessionService = new CopilotSessionService();
