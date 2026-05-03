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
    email?: string;
    phone?: string;
    companyName?: string;
    serviceType?: string;
    propertyAddress?: string;
    leadNumber?: string;
}

export interface LeadStatusChangedEvent {
    tenantId: string;
    leadId: string;
    leadName: string;
    oldStatus: string;
    newStatus: string;
    ownerId?: string;
    ownerUserId?: string;
    email?: string;
    companyName?: string;
}

export interface LeadConvertedEvent {
    tenantId: string;
    leadId: string;
    leadName: string;
    clientId: string;
    contactId?: string;
    dealId?: string;
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

// ── Client Lifecycle Events ─────────────────────────────────────────────

export interface ClientLifecycleChangedEvent {
    tenantId: string;
    clientId: string;
    clientName?: string;
    previousStage: string;
    newStage: string;
    trigger?: string;
}

// ── Project Status Events ───────────────────────────────────────────────

export interface ProjectStatusChangedEvent {
    tenantId: string;
    projectId: string;
    projectName: string;
    previousStatus: string;
    newStatus: string;
    clientId?: string;
}

// ── Invoice Sent Event ──────────────────────────────────────────────────

export interface InvoiceSentEvent {
    tenantId: string;
    invoiceId: string;
    invoiceNumber: string;
    clientId?: string;
    recipientEmail?: string;
}
// ── Calendar Completion Events ──────────────────────────────────────────

export interface CalendarEventCompletedEvent {
    tenantId: string;
    eventId: string;
    title: string;
    eventType: string;
    category?: string;
    leadId?: string;
    clientId?: string;
    createdById?: string;
    createdByUserId?: string;
    description?: string;
}

// ── Quote Events ────────────────────────────────────────────────────────

export interface QuoteCreatedEvent {
    tenantId: string;
    quoteId: string;
    quoteNumber: string;
    clientId?: string;
    leadId?: string;
    total?: number | string;
}

export interface QuoteStatusChangedEvent {
    tenantId: string;
    quoteId: string;
    quoteNumber: string;
    oldStatus: string;
    newStatus: string;
    clientId?: string;
    leadId?: string;
    total: number;
    createdById?: string;
    items: { description: string; quantity: number; unitPrice: number; total: number }[];
}

// ── Estimation & Proposal Workflow Events ───────────────────────────────

export interface LeadQualifiedEvent {
    tenantId: string;
    leadId: string;
    leadName: string;
    estimationMethod: 'PHYSICAL_INSPECTION' | 'AI_ESTIMATION' | 'BOTH';
    propertyAddress?: string;
    ownerId?: string;
    ownerUserId?: string;
}

export interface InspectionCompletedEvent {
    tenantId: string;
    leadId: string;
    inspectionId: string;
    inspectorName?: string;
    totalEstimate?: number;
}

export interface AIEstimateCompletedEvent {
    tenantId: string;
    leadId: string;
    estimateId: string;
    roofAreaSqft?: number;
    totalEstimate?: number;
}

export interface ReportsReadyEvent {
    tenantId: string;
    leadId: string;
    leadName: string;
    estimationMethod: 'PHYSICAL_INSPECTION' | 'AI_ESTIMATION' | 'BOTH';
    inspectionId?: string;
    estimateId?: string;
    ownerId?: string;
    ownerUserId?: string;
}

export interface ProposalSentEvent {
    tenantId: string;
    proposalId: string;
    leadId: string;
    leadName: string;
    leadEmail?: string;
    leadPhone?: string;
    quoteId: string;
    quoteNumber: string;
    proposalPdfUrl?: string;
    aiReportUrl?: string;
    deliveryMethod: 'email' | 'sms' | 'email_sms';
    publicToken: string;
    proposalLink: string;
    total: number;
    salesRepId: string;
    ownerUserId?: string;
    recipientEmail?: string;
}

export interface ProposalViewedEvent {
    tenantId: string;
    proposalId: string;
    leadId: string;
    leadName: string;
    ownerUserId?: string;
    viewCount: number;
}

export interface ProposalAcceptedEvent {
    tenantId: string;
    proposalId: string;
    leadId: string;
    leadName: string;
    quoteId: string;
    quoteNumber: string;
    total: number;
    clientEmail?: string;
    clientPhone?: string;
    signedPdfUrl?: string;
    salesRepId?: string;
    ownerUserId?: string;
}

export interface ProposalDeclinedEvent {
    tenantId: string;
    leadId: string;
    quoteId: string;
    quoteNumber: string;
    ownerUserId?: string;
}

export interface ProposalGeneratedEvent {
    tenantId: string;
    leadId: string;
    leadName: string;
    proposalId: string;
    quoteId: string;
    quoteNumber: string;
    estimateId: string;
    total: number;
    pdfUrl?: string;
    ownerId?: string;
    ownerUserId?: string;
}

export interface DealWonEvent {
    tenantId: string;
    leadId: string;
    leadName: string;
    quoteId?: string;
    total?: number;
    ownerUserId?: string;
    ownerId?: string;
}

// ── Stage 6: Project Stage Changed ──────────────────────────────────────

export interface ProjectStageChangedEvent {
    tenantId: string;
    projectId: string;
    projectName: string;
    clientId?: string;
    clientName?: string;
    previousStageSlug?: string;
    previousStageName?: string;
    newStageSlug: string;
    newStageName: string;
    contractValue?: number;
    changedById?: string;
    projectManagerId?: string;
    salesRepId?: string;
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
    'client.lifecycleChanged': ClientLifecycleChangedEvent;
    'project.statusChanged': ProjectStatusChangedEvent;
    'invoice.sent': InvoiceSentEvent;
    'calendar.completed': CalendarEventCompletedEvent;
    'quote.created': QuoteCreatedEvent;
    'quote.statusChanged': QuoteStatusChangedEvent;
    // Estimation & Proposal Workflow
    'lead.qualified': LeadQualifiedEvent;
    'inspection.completed': InspectionCompletedEvent;
    'ai_estimate.completed': AIEstimateCompletedEvent;
    'reports.ready': ReportsReadyEvent;
    'proposal.generated': ProposalGeneratedEvent;
    'proposal.sent': ProposalSentEvent;
    'proposal.viewed': ProposalViewedEvent;
    'proposal.accepted': ProposalAcceptedEvent;
    'proposal.declined': ProposalDeclinedEvent;
    'deal.won': DealWonEvent;
    // Stage 6: Project Execution
    'project.stageChanged': ProjectStageChangedEvent;
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
