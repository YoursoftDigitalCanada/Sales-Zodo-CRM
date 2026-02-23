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

export interface InvoiceCreatedEvent {
    tenantId: string;
    invoiceId: string;
    invoiceNumber: string;
    clientId?: string;
    amount?: number | string;
}

export interface InvoiceUpdatedEvent {
    tenantId: string;
    invoiceId: string;
    invoiceNumber: string;
    clientId?: string;
    updatedFields: string[];
}

export interface PaymentReceivedEvent {
    tenantId: string;
    invoiceId: string;
    invoiceNumber: string;
    clientId?: string;
    amount?: number | string;
    paidByUserId?: string;
}

export interface BookingCreatedEvent {
    tenantId: string;
    bookingId: string;
    clientId?: string;
    serviceType?: string;
}

export interface BookingConfirmedEvent {
    tenantId: string;
    bookingId: string;
    clientId?: string;
}

export interface BookingCancelledEvent {
    tenantId: string;
    bookingId: string;
    clientId?: string;
}

export interface ExpenseCreatedEvent {
    tenantId: string;
    expenseId: string;
    amount?: number | string;
    category?: string;
    submittedById?: string;
}

export interface ExpenseApprovedEvent {
    tenantId: string;
    expenseId: string;
    amount?: number | string;
    approvedById: string;
}

export interface ClientUpdatedEvent {
    tenantId: string;
    clientId: string;
    clientName: string;
    updatedFields: string[];
}

export interface ClientDeletedEvent {
    tenantId: string;
    clientId: string;
    clientName: string;
}

// ── New Domain Events (MP4/MP6) ─────────────────────────────────────────

export interface ContactCreatedEvent {
    tenantId: string;
    contactId: string;
    contactName: string;
    companyId?: string;
}

export interface ContactUpdatedEvent {
    tenantId: string;
    contactId: string;
    contactName: string;
    updatedFields: string[];
}

export interface ContactDeletedEvent {
    tenantId: string;
    contactId: string;
    contactName: string;
}

export interface CalendarEventCreatedEvent {
    tenantId: string;
    eventId: string;
    title: string;
    startDate?: string;
}

export interface EmployeeCreatedEvent {
    tenantId: string;
    employeeId: string;
    employeeName: string;
    department?: string;
}

export interface ApplicationStatusChangedEvent {
    tenantId: string;
    applicationId: string;
    oldStatus: string;
    newStatus: string;
    candidateId?: string;
    jobId?: string;
}

export interface OrderStatusChangedEvent {
    tenantId: string;
    orderId: string;
    orderNumber: string;
    oldStatus: string;
    newStatus: string;
}

export interface FileUploadedEvent {
    tenantId: string;
    fileId: string;
    fileName: string;
    mimeType?: string;
}

export interface GroupCreatedEvent {
    tenantId: string;
    groupId: string;
    groupName: string;
}

export interface GroupUpdatedEvent {
    tenantId: string;
    groupId: string;
    groupName: string;
    updatedFields: string[];
}

export interface LifecycleAtRiskEvent {
    tenantId: string;
    clientId: string;
    clientName: string;
    previousStage: string;
    inactivityDays: number;
}

// ── Service Events ──────────────────────────────────────────────────────

export interface ServiceCreatedEvent {
    tenantId: string;
    serviceId: string;
    serviceName: string;
    category?: string;
}

export interface ServiceUpdatedEvent {
    tenantId: string;
    serviceId: string;
    serviceName: string;
    updatedFields: string[];
}

export interface ServiceDeletedEvent {
    tenantId: string;
    serviceId: string;
    serviceName: string;
}

export interface ServiceSelectedEvent {
    tenantId: string;
    serviceId: string;
    serviceName: string;
    clientId?: string;
    bookingId?: string;
    projectId?: string;
}

// ── Event Map ───────────────────────────────────────────────────────────

export interface CRMEventMap {
    'lead.created': LeadCreatedEvent;
    'lead.statusChanged': LeadStatusChangedEvent;
    'lead.converted': LeadConvertedEvent;
    'client.created': ClientCreatedEvent;
    'client.updated': ClientUpdatedEvent;
    'client.deleted': ClientDeletedEvent;
    'project.created': ProjectCreatedEvent;
    'invoice.created': InvoiceCreatedEvent;
    'invoice.updated': InvoiceUpdatedEvent;
    'invoice.statusChanged': InvoiceStatusChangedEvent;
    'payment.received': PaymentReceivedEvent;
    'booking.created': BookingCreatedEvent;
    'booking.confirmed': BookingConfirmedEvent;
    'booking.cancelled': BookingCancelledEvent;
    'expense.created': ExpenseCreatedEvent;
    'expense.approved': ExpenseApprovedEvent;
    'task.completed': TaskCompletedEvent;
    // New events (MP4/MP6)
    'contact.created': ContactCreatedEvent;
    'contact.updated': ContactUpdatedEvent;
    'contact.deleted': ContactDeletedEvent;
    'calendar.created': CalendarEventCreatedEvent;
    'employee.created': EmployeeCreatedEvent;
    'application.statusChanged': ApplicationStatusChangedEvent;
    'order.statusChanged': OrderStatusChangedEvent;
    'file.uploaded': FileUploadedEvent;
    'group.created': GroupCreatedEvent;
    'group.updated': GroupUpdatedEvent;
    'lifecycle.atRisk': LifecycleAtRiskEvent;
    'service.created': ServiceCreatedEvent;
    'service.updated': ServiceUpdatedEvent;
    'service.deleted': ServiceDeletedEvent;
    'service.selected': ServiceSelectedEvent;
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
