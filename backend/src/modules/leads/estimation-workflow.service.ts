import {
    eventBus,
    LeadQualifiedEvent,
    InspectionCompletedEvent,
    AIEstimateCompletedEvent,
} from '../../common/events/event-bus';
import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';
import { notificationsService } from '../notifications/notifications.service';
import { tasksService } from '../tasks/tasks.service';
import { calendarService } from '../calendar/calendar.service';
import { activityLogger } from '../../common/services/activity-logger.service';

// ── Estimation Workflow Service ─────────────────────────────────────────
//
// Orchestrates the estimation process after a lead is qualified.
// Based on the selected estimation method, triggers:
//   A) Physical inspection workflow
//   B) AI roof estimation workflow
//   C) Both in parallel
//
// When all required reports are ready, emits `reports.ready` which
// triggers downstream proposal auto-generation.
// ────────────────────────────────────────────────────────────────────────

export class EstimationWorkflowService {
    /**
     * Initialize event listeners. Called once at app startup.
     */
    initialize(): void {
        eventBus.on('lead.qualified', (event) => this.handleLeadQualified(event));
        eventBus.on('inspection.completed', (event) => this.handleInspectionCompleted(event));
        eventBus.on('ai_estimate.completed', (event) => this.handleAIEstimateCompleted(event));

        logger.info('[EstimationWorkflow] Initialized — listening for lead.qualified, inspection.completed, ai_estimate.completed');
    }

    // ── Lead Qualified Handler ──────────────────────────────────────────

    private async handleLeadQualified(event: LeadQualifiedEvent): Promise<void> {
        const ctx = { leadId: event.leadId, tenantId: event.tenantId, method: event.estimationMethod };
        logger.info('[EstimationWorkflow] lead.qualified received', ctx);

        try {
            switch (event.estimationMethod) {
                case 'PHYSICAL_INSPECTION':
                    await this.triggerInspection(event);
                    break;
                case 'AI_ESTIMATION':
                    await this.triggerAIEstimation(event);
                    break;
                case 'BOTH':
                    // Run both in parallel, errors are isolated per workflow
                    const results = await Promise.allSettled([
                        this.triggerInspection(event),
                        this.triggerAIEstimation(event),
                    ]);
                    for (const r of results) {
                        if (r.status === 'rejected') {
                            logger.error('[EstimationWorkflow] BOTH — one workflow failed', { ...ctx, err: r.reason });
                        }
                    }
                    break;
                default:
                    logger.warn('[EstimationWorkflow] Unknown estimation method', ctx);
            }
        } catch (err) {
            logger.error('[EstimationWorkflow] handleLeadQualified failed', { ...ctx, err });
        }
    }

    // ── Trigger Physical Inspection ─────────────────────────────────────

    private async triggerInspection(event: LeadQualifiedEvent): Promise<void> {
        const ctx = { leadId: event.leadId, tenantId: event.tenantId };

        // 1. Create Inspection Record
        const inspection = await prisma.leadInspection.create({
            data: {
                leadId: event.leadId,
                tenantId: event.tenantId,
                inspectionType: 'Initial',
                estimateStatus: 'Draft',
            },
        });
        logger.info('[EstimationWorkflow] Inspection record created', { ...ctx, inspectionId: inspection.id });

        // 2. Schedule inspection calendar event (next business day, 2 hours @ 9 AM)
        try {
            const inspectionDate = this.getNextBusinessDay();
            inspectionDate.setHours(9, 0, 0, 0);
            const endTime = new Date(inspectionDate);
            endTime.setHours(11, 0, 0, 0);

            await calendarService.create(event.tenantId, {
                title: `🔍 Roof Inspection — ${event.leadName}`,
                description: [
                    `Physical roof inspection for qualified lead "${event.leadName}".`,
                    event.propertyAddress ? `Address: ${event.propertyAddress}` : '',
                    '',
                    'Checklist:',
                    '• Full roof walkthrough & measurements',
                    '• Photo documentation (min 20 photos)',
                    '• Damage assessment',
                    '• Material condition evaluation',
                    '• Generate inspection report',
                ].filter(Boolean).join('\n'),
                startTime: inspectionDate,
                endTime,
                eventType: 'MEETING',
                priority: 'HIGH',
                category: 'inspection',
                color: '#F59E0B', // amber for inspections
            });

            // Update lead's inspection appointment date
            await prisma.lead.update({
                where: { id: event.leadId },
                data: { inspectionAppointmentDate: inspectionDate },
            });

            logger.info('[EstimationWorkflow] Inspection calendar event created', ctx);
        } catch (err) {
            logger.error('[EstimationWorkflow] Inspection scheduling failed', { ...ctx, err });
        }

        // 3. Create inspection task assigned to lead owner
        try {
            const dueDate = this.getNextBusinessDay();
            dueDate.setDate(dueDate.getDate() + 1); // day after scheduling

            await tasksService.create(event.tenantId, {
                title: `🔍 Complete inspection for: ${event.leadName}`,
                description: [
                    `Perform physical roof inspection for "${event.leadName}".`,
                    event.propertyAddress ? `Property: ${event.propertyAddress}` : '',
                    '',
                    'Deliverables:',
                    '• Upload inspection photos',
                    '• Fill in roof measurements',
                    '• Document damage findings',
                    '• Generate inspection report (PDF)',
                    '• Mark inspection as complete',
                ].filter(Boolean).join('\n'),
                priority: 'HIGH',
                dueDate,
                assignedToId: event.ownerId || null,
            });
            logger.info('[EstimationWorkflow] Inspection task created', ctx);
        } catch (err) {
            logger.error('[EstimationWorkflow] Inspection task creation failed', { ...ctx, err });
        }

        // 4. Notify assigned rep
        if (event.ownerUserId) {
            try {
                await notificationsService.create({
                    title: '🔍 Inspection Scheduled',
                    message: `A physical inspection has been auto-scheduled for lead "${event.leadName}".${event.propertyAddress ? ` Address: ${event.propertyAddress}` : ''} Check your calendar for the appointment.`,
                    type: 'INFO',
                    userId: event.ownerUserId,
                    tenantId: event.tenantId,
                    actionUrl: `/leads/${event.leadId}`,
                    actionLabel: 'View Lead',
                });
            } catch (err) {
                logger.error('[EstimationWorkflow] Inspection notification failed', { ...ctx, err });
            }
        }

        // 5. Audit trail
        activityLogger.log({
            tenantId: event.tenantId,
            entityType: 'Lead',
            entityId: event.leadId,
            action: 'CREATE',
            module: 'estimation',
            description: `Physical inspection workflow triggered for "${event.leadName}"`,
            metadata: { inspectionId: inspection.id, estimationMethod: 'PHYSICAL_INSPECTION' },
        });
    }

    // ── Trigger AI Estimation ───────────────────────────────────────────

    private async triggerAIEstimation(event: LeadQualifiedEvent): Promise<void> {
        const ctx = { leadId: event.leadId, tenantId: event.tenantId };

        if (!event.propertyAddress) {
            logger.warn('[EstimationWorkflow] AI estimation skipped — no property address', ctx);

            // Notify rep to add address
            if (event.ownerUserId) {
                await notificationsService.create({
                    title: '⚠️ AI Estimation Requires Property Address',
                    message: `AI estimation for "${event.leadName}" cannot proceed — no property address on file. Please update the lead with the property address.`,
                    type: 'WARNING',
                    userId: event.ownerUserId,
                    tenantId: event.tenantId,
                    actionUrl: `/leads/${event.leadId}`,
                    actionLabel: 'Update Lead',
                });
            }
            return;
        }

        // 1. Create a RoofEstimate placeholder linked to the lead
        try {
            const estimate = await prisma.roofEstimate.create({
                data: {
                    tenantId: event.tenantId,
                    leadId: event.leadId,
                    address: event.propertyAddress,
                    latitude: 0,   // will be geocoded by estimator service
                    longitude: 0,
                    roofAreaSqft: 0,
                    createdBy: event.ownerId || 'system',
                    notes: `Auto-triggered from lead qualification — ${event.leadName}`,
                },
            });

            logger.info('[EstimationWorkflow] AI estimate record created', { ...ctx, estimateId: estimate.id });

            // Create task for rep to run the AI estimator with this address
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 1);

            await tasksService.create(event.tenantId, {
                title: `🤖 Run AI roof estimate for: ${event.leadName}`,
                description: [
                    `AI roof estimation has been initiated for "${event.leadName}".`,
                    `Address: ${event.propertyAddress}`,
                    '',
                    'Next steps:',
                    '• Open the Roof Estimator module',
                    '• Run AI analysis for the property address',
                    '• Review AI results and adjust if needed',
                    '• Mark estimation as complete',
                ].join('\n'),
                priority: 'HIGH',
                dueDate,
                assignedToId: event.ownerId || null,
            });

            // Notify assigned rep
            if (event.ownerUserId) {
                await notificationsService.create({
                    title: '🤖 AI Estimation Initiated',
                    message: `AI roof estimation has been initiated for "${event.leadName}" at ${event.propertyAddress}. Run the AI estimator to generate the report.`,
                    type: 'INFO',
                    userId: event.ownerUserId,
                    tenantId: event.tenantId,
                    actionUrl: `/roof-estimator`,
                    actionLabel: 'Open Estimator',
                });
            }

            // Audit trail
            activityLogger.log({
                tenantId: event.tenantId,
                entityType: 'Lead',
                entityId: event.leadId,
                action: 'CREATE',
                module: 'estimation',
                description: `AI estimation workflow triggered for "${event.leadName}"`,
                metadata: { estimateId: estimate.id, address: event.propertyAddress, estimationMethod: 'AI_ESTIMATION' },
            });
        } catch (err) {
            logger.error('[EstimationWorkflow] AI estimation trigger failed', { ...ctx, err });
        }
    }

    // ── Inspection Completed Handler ────────────────────────────────────

    private async handleInspectionCompleted(event: InspectionCompletedEvent): Promise<void> {
        const ctx = { leadId: event.leadId, tenantId: event.tenantId, inspectionId: event.inspectionId };
        logger.info('[EstimationWorkflow] inspection.completed received', ctx);

        await this.checkAndEmitReportsReady(event.tenantId, event.leadId);
    }

    // ── AI Estimate Completed Handler ───────────────────────────────────

    private async handleAIEstimateCompleted(event: AIEstimateCompletedEvent): Promise<void> {
        const ctx = { leadId: event.leadId, tenantId: event.tenantId, estimateId: event.estimateId };
        logger.info('[EstimationWorkflow] ai_estimate.completed received', ctx);

        await this.checkAndEmitReportsReady(event.tenantId, event.leadId);
    }

    // ── Reports Readiness Check ─────────────────────────────────────────

    /**
     * Check if all required reports are ready based on the lead's estimation method.
     * When all reports are available, emit `reports.ready`.
     */
    private async checkAndEmitReportsReady(tenantId: string, leadId: string): Promise<void> {
        try {
            const lead = await prisma.lead.findUnique({
                where: { id: leadId },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    estimationMethod: true,
                    assignedToId: true,
                    assignedTo: { select: { userId: true } },
                },
            });

            if (!lead || !lead.estimationMethod) return;

            const method = lead.estimationMethod;
            let inspectionReady = false;
            let aiEstimateReady = false;
            let inspectionId: string | undefined;
            let estimateId: string | undefined;

            // Check inspection status
            if (method === 'PHYSICAL_INSPECTION' || method === 'BOTH') {
                const inspection = await prisma.leadInspection.findFirst({
                    where: { leadId, tenantId, estimateStatus: { in: ['Sent', 'Accepted'] } },
                    orderBy: { createdAt: 'desc' },
                    select: { id: true },
                });
                inspectionReady = !!inspection;
                inspectionId = inspection?.id;
            }

            // Check AI estimate status
            if (method === 'AI_ESTIMATION' || method === 'BOTH') {
                const estimate = await prisma.roofEstimate.findFirst({
                    where: { leadId, tenantId, roofAreaSqft: { gt: 0 } }, // completed estimates have area > 0
                    orderBy: { createdAt: 'desc' },
                    select: { id: true },
                });
                aiEstimateReady = !!estimate;
                estimateId = estimate?.id;
            }

            // Determine if all required reports are ready
            let allReady = false;
            switch (method) {
                case 'PHYSICAL_INSPECTION':
                    allReady = inspectionReady;
                    break;
                case 'AI_ESTIMATION':
                    allReady = aiEstimateReady;
                    break;
                case 'BOTH':
                    allReady = inspectionReady && aiEstimateReady;
                    break;
            }

            if (allReady) {
                const leadName = `${lead.firstName} ${lead.lastName}`;
                logger.info('[EstimationWorkflow] All reports ready — emitting reports.ready', {
                    leadId, tenantId, method,
                });

                eventBus.emit('reports.ready', {
                    tenantId,
                    leadId,
                    leadName,
                    estimationMethod: method,
                    inspectionId,
                    estimateId,
                    ownerId: lead.assignedToId || undefined,
                    ownerUserId: lead.assignedTo?.userId,
                });
            } else {
                logger.debug('[EstimationWorkflow] Reports not yet complete', {
                    leadId, tenantId, method,
                    inspectionReady,
                    aiEstimateReady,
                });
            }
        } catch (err) {
            logger.error('[EstimationWorkflow] checkAndEmitReportsReady failed', { leadId, tenantId, err });
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private getNextBusinessDay(): Date {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        while (d.getDay() === 0 || d.getDay() === 6) {
            d.setDate(d.getDate() + 1);
        }
        return d;
    }
}

export const estimationWorkflowService = new EstimationWorkflowService();
