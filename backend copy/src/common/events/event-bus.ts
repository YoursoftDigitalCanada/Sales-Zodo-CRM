import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

// ── Event Type Definitions ──────────────────────────────────────────────

export interface LeadCreatedEvent {
    tenantId: string;
    leadId: string;
    leadName: string;
    ownerId?: string;
    ownerUserId?: string;
    source?: string;
}

export interface LeadStatusChangedEvent {
    tenantId: string;
    leadId: string;
    leadName: string;
    oldStatus: string;
    newStatus: string;
    ownerId?: string;
    ownerUserId?: string;
}

export interface LeadConvertedEvent {
    tenantId: string;
    leadId: string;
    leadName: string;
    clientId: string;
    clientType: string;
    convertedByUserId: string;
    ownerUserId?: string;
}

export interface ClientCreatedEvent {
    tenantId: string;
    clientId: string;
    clientName: string;
    clientType: string;
    ownerUserId?: string;
}

export interface ProjectCreatedEvent {
    tenantId: string;
    projectId: string;
    projectName: string;
    clientId?: string;
    assignedToUserId?: string;
}

export interface InvoiceStatusChangedEvent {
    tenantId: string;
    invoiceId: string;
    invoiceNumber: string;
    oldStatus: string;
    newStatus: string;
    clientId?: string;
    ownerUserId?: string;
}

export interface TaskCompletedEvent {
    tenantId: string;
    taskId: string;
    taskTitle: string;
    completedByUserId: string;
}

// ── Event Map ───────────────────────────────────────────────────────────

export interface CRMEventMap {
    'lead.created': LeadCreatedEvent;
    'lead.statusChanged': LeadStatusChangedEvent;
    'lead.converted': LeadConvertedEvent;
    'client.created': ClientCreatedEvent;
    'project.created': ProjectCreatedEvent;
    'invoice.statusChanged': InvoiceStatusChangedEvent;
    'task.completed': TaskCompletedEvent;
}

export type CRMEventName = keyof CRMEventMap;

// ── Typed Event Bus ─────────────────────────────────────────────────────

class CRMEventBus {
    private emitter = new EventEmitter();

    constructor() {
        // Increase max listeners since multiple automation rules may subscribe
        this.emitter.setMaxListeners(50);
    }

    /**
     * Emit a typed CRM event. Non-blocking (fire-and-forget).
     */
    emit<E extends CRMEventName>(event: E, payload: CRMEventMap[E]): void {
        logger.debug(`[EventBus] Emitting: ${event}`, { event, tenantId: (payload as any).tenantId });
        // Use setImmediate to make event handling non-blocking
        setImmediate(() => {
            this.emitter.emit(event, payload);
        });
    }

    /**
     * Subscribe to a typed CRM event.
     */
    on<E extends CRMEventName>(event: E, handler: (payload: CRMEventMap[E]) => void | Promise<void>): void {
        this.emitter.on(event, async (payload: CRMEventMap[E]) => {
            try {
                await handler(payload);
            } catch (err) {
                logger.error(`[EventBus] Handler error for event "${event}"`, { err, event });
            }
        });
    }

    /**
     * Get count of listeners for an event.
     */
    listenerCount(event: CRMEventName): number {
        return this.emitter.listenerCount(event);
    }
}

// Singleton instance
export const eventBus = new CRMEventBus();
