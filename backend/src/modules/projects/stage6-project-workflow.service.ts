import {
    eventBus,
    ProjectStageChangedEvent,
} from '../../common/events/event-bus';
import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';
import { mailerService } from '../../common/services/mailer.service';
import { smsService } from '../../common/services/sms.service';
import { communicationLogService } from '../communication-logs/communication-log.service';
import { tasksService } from '../tasks/tasks.service';
import { calendarService } from '../calendar/calendar.service';
import { notificationsService } from '../notifications/notifications.service';
import { activityLogger } from '../../common/services/activity-logger.service';
import { autoInvoiceService } from './auto-invoice.service';

// ============================================================================
// STAGE 6 — PROJECT EXECUTION WORKFLOW
//
// Listens to:  project.stageChanged
// Dispatches:  stage-specific automations based on newStageSlug
//
// 7 Kanban Stages:
//   1. contract-signed     → Deposit invoice + tasks + calendar
//   2. materials-ordered   → Cost tracking + delivery task + calendar
//   3. permit-pulled       → Permit expense + complete permit task
//   4. materials-delivered  → Progress invoice + SMS + payment task
//   5. in-progress          → Labor cost calc + progress tracking
//   6. final-inspection     → Inspection task + calendar + notify team
//   7. completed            → Final invoice + warranty + follow-ups
// ============================================================================

export class Stage6ProjectWorkflowService {

    initialize(): void {
        eventBus.on('project.stageChanged', (event) => {
            this.handleStageChanged(event).catch((err) => {
                logger.error('[Stage6] handleStageChanged failed', {
                    err: err.message,
                    projectId: event.projectId,
                    stage: event.newStageSlug,
                });
            });
        });

        logger.info('[Stage6] Project Execution Workflow initialized');
    }

    // ── Main dispatcher ─────────────────────────────────────────────────

    private async handleStageChanged(event: ProjectStageChangedEvent): Promise<void> {
        logger.info('[Stage6] project.stageChanged', {
            projectId: event.projectId,
            from: event.previousStageSlug,
            to: event.newStageSlug,
        });

        // Activity log for all stage changes
        activityLogger.log({
            tenantId: event.tenantId,
            entityType: 'Project',
            entityId: event.projectId,
            action: 'STATUS_CHANGE',
            module: 'stage6-workflow',
            description: `Project stage: ${event.previousStageName || 'None'} → ${event.newStageName}`,
            userId: event.changedById,
            metadata: {
                previousStage: event.previousStageSlug,
                newStage: event.newStageSlug,
                contractValue: event.contractValue,
            },
        });

        // Dispatch to stage-specific handler
        const handlers: Record<string, (e: ProjectStageChangedEvent) => Promise<void>> = {
            'contract-signed': (e) => this.onContractSigned(e),
            'materials-ordered': (e) => this.onMaterialsOrdered(e),
            'permit-pulled': (e) => this.onPermitPulled(e),
            'materials-delivered': (e) => this.onMaterialsDelivered(e),
            'in-progress': (e) => this.onInProgress(e),
            'final-inspection': (e) => this.onFinalInspection(e),
            'completed': (e) => this.onCompleted(e),
        };

        const handler = handlers[event.newStageSlug];
        if (handler) {
            await handler(event);
        } else {
            logger.info('[Stage6] No automation for stage', { stage: event.newStageSlug });
        }
    }

    // ── Stage 1: CONTRACT SIGNED ────────────────────────────────────────

    private async onContractSigned(event: ProjectStageChangedEvent): Promise<void> {
        logger.info('[Stage6:ContractSigned] Running automations', { projectId: event.projectId });

        const results = await Promise.allSettled([
            // Auto 1: Send deposit invoice
            event.clientId && event.contractValue
                ? autoInvoiceService.createDepositInvoice({
                    tenantId: event.tenantId,
                    projectId: event.projectId,
                    projectName: event.projectName,
                    clientId: event.clientId,
                    contractValue: event.contractValue,
                })
                : Promise.resolve(),

            // Auto 2: Activate "Collect deposit" task
            tasksService.create(event.tenantId, {
                title: `Collect deposit payment – ${event.projectName}`,
                description: `Collect 33% deposit for project. Contract value: $${(event.contractValue || 0).toLocaleString()}.`,
                priority: 'URGENT',
                assignedToId: event.salesRepId || event.projectManagerId || undefined,
                dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
                projectId: event.projectId,
            }),

            // Auto 3: Calendar event — deposit due date
            calendarService.create(event.tenantId, {
                title: `Deposit Due – ${event.projectName}`,
                description: `33% deposit payment due for ${event.projectName}.`,
                eventType: 'TASK' as any,
                startTime: new Date(Date.now() + 7 * 86400000).toISOString(),
                endTime: new Date(Date.now() + 7 * 86400000 + 3600000).toISOString(),
                reminderMinutes: 1440, // 1 day reminder
            }),
        ]);

        this.logResults('[Stage6:ContractSigned]', results, ['DepositInvoice', 'CollectDepositTask', 'DepositCalendar']);
    }

    // ── Stage 2: MATERIALS ORDERED ──────────────────────────────────────

    private async onMaterialsOrdered(event: ProjectStageChangedEvent): Promise<void> {
        logger.info('[Stage6:MaterialsOrdered] Running automations', { projectId: event.projectId });

        // Fetch materials to calculate cost
        const materials = await (prisma as any).projectMaterial.findMany({
            where: { projectId: event.projectId, tenantId: event.tenantId },
        });

        const totalMaterialCost = materials.reduce((sum: number, m: any) => sum + Number(m.totalCost || 0), 0);

        const results = await Promise.allSettled([
            // Auto 1: Log material cost to project expense tracker
            totalMaterialCost > 0
                ? autoInvoiceService.logProjectExpense({
                    tenantId: event.tenantId,
                    projectId: event.projectId,
                    category: 'MATERIALS',
                    description: `Material cost for ${event.projectName}`,
                    amount: totalMaterialCost,
                    userId: event.changedById,
                })
                : Promise.resolve(),

            // Auto 2: Create "Confirm delivery date" task
            tasksService.create(event.tenantId, {
                title: `Confirm material delivery date – ${event.projectName}`,
                description: `Verify delivery schedule with supplier.`,
                priority: 'HIGH',
                assignedToId: event.projectManagerId || event.salesRepId || undefined,
                dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
                projectId: event.projectId,
            }),

            // Auto 3: Calendar event — expected delivery
            calendarService.create(event.tenantId, {
                title: `Material Delivery – ${event.projectName}`,
                description: `Expected material delivery for ${event.projectName}.`,
                eventType: 'TASK' as any,
                startTime: new Date(Date.now() + 7 * 86400000).toISOString(),
                endTime: new Date(Date.now() + 7 * 86400000 + 7200000).toISOString(),
                reminderMinutes: 1440,
            }),
        ]);

        this.logResults('[Stage6:MaterialsOrdered]', results, ['MaterialCost', 'ConfirmDeliveryTask', 'DeliveryCalendar']);
    }

    // ── Stage 3: PERMIT PULLED ──────────────────────────────────────────

    private async onPermitPulled(event: ProjectStageChangedEvent): Promise<void> {
        logger.info('[Stage6:PermitPulled] Running automations', { projectId: event.projectId });

        // Check project for permit cost
        const project = await prisma.project.findUnique({
            where: { id: event.projectId },
            select: { permitCost: true },
        });

        const permitCost = project?.permitCost ? Number(project.permitCost) : 0;

        const results = await Promise.allSettled([
            // Auto 1: Log permit fee to expense tracker
            permitCost > 0
                ? autoInvoiceService.logProjectExpense({
                    tenantId: event.tenantId,
                    projectId: event.projectId,
                    category: 'PERMITS',
                    description: `Permit fee for ${event.projectName}`,
                    amount: permitCost,
                    userId: event.changedById,
                })
                : Promise.resolve(),

            // Auto 2: Complete "Pull permit" task
            this.completeTaskByTitle(event.tenantId, event.projectId, 'Pull permit'),
        ]);

        this.logResults('[Stage6:PermitPulled]', results, ['PermitExpense', 'CompletePermitTask']);
    }

    // ── Stage 4: MATERIALS DELIVERED ────────────────────────────────────

    private async onMaterialsDelivered(event: ProjectStageChangedEvent): Promise<void> {
        logger.info('[Stage6:MaterialsDelivered] Running automations', { projectId: event.projectId });

        // Find client for SMS/email
        const client = event.clientId
            ? await prisma.client.findUnique({
                where: { id: event.clientId },
                select: { primaryPhone: true, primaryEmail: true, clientName: true },
            })
            : null;

        const results = await Promise.allSettled([
            // Auto 1: Create progress invoice (33%)
            event.clientId && event.contractValue
                ? autoInvoiceService.createProgressInvoice({
                    tenantId: event.tenantId,
                    projectId: event.projectId,
                    projectName: event.projectName,
                    clientId: event.clientId,
                    contractValue: event.contractValue,
                })
                : Promise.resolve(),

            // Auto 2: Send SMS to client
            client?.primaryPhone
                ? smsService.sendSms({ to: client.primaryPhone, message: `Materials delivered for your roofing project. Progress invoice sent. Thank you! – ZODO Roofing` })
                    .catch((e: any) => logger.warn('[Stage6] SMS failed', { err: e.message }))
                : Promise.resolve(),

            // Auto 3: Create "Collect progress payment" task
            tasksService.create(event.tenantId, {
                title: `Collect progress payment – ${event.projectName}`,
                description: `Collect 33% progress payment. Materials delivered.`,
                priority: 'HIGH',
                assignedToId: event.salesRepId || event.projectManagerId || undefined,
                dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
                projectId: event.projectId,
            }),

            // Auto 4: Calendar event — payment due
            calendarService.create(event.tenantId, {
                title: `Progress Payment Due – ${event.projectName}`,
                description: `Progress payment (33%) due for ${event.projectName}.`,
                eventType: 'TASK' as any,
                startTime: new Date(Date.now() + 14 * 86400000).toISOString(),
                endTime: new Date(Date.now() + 14 * 86400000 + 3600000).toISOString(),
                reminderMinutes: 1440,
            }),

            // Auto 5: Notify accounts team
            this.notifyAdmins(event.tenantId, {
                title: '💰 Progress Invoice Created',
                message: `Progress invoice for ${event.projectName} ($${((event.contractValue || 0) * 0.33).toLocaleString()}) has been sent.`,
                type: 'INFO',
            }),
        ]);

        this.logResults('[Stage6:MaterialsDelivered]', results, ['ProgressInvoice', 'SMS', 'PaymentTask', 'PaymentCalendar', 'NotifyAccounts']);
    }

    // ── Stage 5: IN PROGRESS ────────────────────────────────────────────

    private async onInProgress(event: ProjectStageChangedEvent): Promise<void> {
        logger.info('[Stage6:InProgress] Running automations', { projectId: event.projectId });

        // Calculate labor cost from time entries
        const timeEntries = await prisma.timeEntry.findMany({
            where: { projectId: event.projectId, tenantId: event.tenantId },
            select: { duration: true, hourlyRate: true },
        });

        const laborCost = timeEntries.reduce((sum, te) => {
            const hours = (te.duration || 0) / 60;
            const rate = te.hourlyRate ? Number(te.hourlyRate) : 0;
            return sum + hours * rate;
        }, 0);

        const results = await Promise.allSettled([
            // Auto 1: Log labor cost
            laborCost > 0
                ? autoInvoiceService.logProjectExpense({
                    tenantId: event.tenantId,
                    projectId: event.projectId,
                    category: 'LABOR',
                    description: `Labor cost for ${event.projectName}`,
                    amount: Math.round(laborCost * 100) / 100,
                    userId: event.changedById,
                })
                : Promise.resolve(),

            // Auto 2: Update project status to IN_PROGRESS
            prisma.project.update({
                where: { id: event.projectId },
                data: {
                    status: 'IN_PROGRESS',
                    actualStartDate: new Date(),
                    progress: 50,
                    completionPercentage: 50,
                },
            }),

            // Auto 3: Notify project manager
            event.projectManagerId
                ? this.notifyUser(event.tenantId, event.projectManagerId, {
                    title: '🔨 Project In Progress',
                    message: `${event.projectName} has moved to In Progress.`,
                    type: 'INFO',
                })
                : Promise.resolve(),
        ]);

        this.logResults('[Stage6:InProgress]', results, ['LaborCost', 'StatusUpdate', 'NotifyPM']);
    }

    // ── Stage 6: FINAL INSPECTION ───────────────────────────────────────

    private async onFinalInspection(event: ProjectStageChangedEvent): Promise<void> {
        logger.info('[Stage6:FinalInspection] Running automations', { projectId: event.projectId });

        const inspectionDate = new Date(Date.now() + 3 * 86400000);
        inspectionDate.setHours(10, 0, 0, 0);

        const results = await Promise.allSettled([
            // Auto 1: Create inspection task
            tasksService.create(event.tenantId, {
                title: `Conduct final inspection – ${event.projectName}`,
                description: `Schedule and conduct final inspection with client.`,
                priority: 'HIGH',
                assignedToId: event.projectManagerId || event.salesRepId || undefined,
                dueDate: inspectionDate.toISOString(),
                projectId: event.projectId,
            }),

            // Auto 2: Calendar event — inspection date
            calendarService.create(event.tenantId, {
                title: `Final Inspection – ${event.projectName}`,
                description: `Final inspection for ${event.projectName}.`,
                eventType: 'MEETING' as any,
                startTime: inspectionDate.toISOString(),
                endTime: new Date(inspectionDate.getTime() + 3600000).toISOString(),
                reminderMinutes: 60,
            }),

            // Auto 3: Notify team
            this.notifyAdmins(event.tenantId, {
                title: '🔍 Final Inspection Scheduled',
                message: `Final inspection for ${event.projectName} is scheduled.`,
                type: 'INFO',
            }),

            // Auto 4: Update progress
            prisma.project.update({
                where: { id: event.projectId },
                data: { progress: 90, completionPercentage: 90 },
            }),
        ]);

        this.logResults('[Stage6:FinalInspection]', results, ['InspectionTask', 'InspectionCalendar', 'NotifyTeam', 'ProgressUpdate']);
    }

    // ── Stage 7: COMPLETED ──────────────────────────────────────────────

    private async onCompleted(event: ProjectStageChangedEvent): Promise<void> {
        logger.info('[Stage6:Completed] Running final automations', { projectId: event.projectId });

        const client = event.clientId
            ? await prisma.client.findUnique({
                where: { id: event.clientId },
                select: { primaryEmail: true, clientName: true },
            })
            : null;

        const results = await Promise.allSettled([
            // Final Auto 1: Create final invoice (34%)
            event.clientId && event.contractValue
                ? autoInvoiceService.createFinalInvoice({
                    tenantId: event.tenantId,
                    projectId: event.projectId,
                    projectName: event.projectName,
                    clientId: event.clientId,
                    contractValue: event.contractValue,
                })
                : Promise.resolve(),

            // Final Auto 2: Complete all remaining tasks
            this.completeAllProjectTasks(event.tenantId, event.projectId),

            // Final Auto 3: Mark project as completed
            prisma.project.update({
                where: { id: event.projectId },
                data: {
                    status: 'COMPLETED',
                    isCompleted: true,
                    completedAt: new Date(),
                    actualEndDate: new Date(),
                    progress: 100,
                    completionPercentage: 100,
                },
            }),

            // Final Auto 4: Client completion email
            client?.primaryEmail
                ? this.sendCompletionEmail(client.primaryEmail, client.clientName, event.projectName)
                : Promise.resolve(),

            // Final Auto 5: Schedule future follow-ups
            this.scheduleFollowUps(event),

            // Final Auto 6: Create post-completion tasks
            this.createPostCompletionTasks(event),

            // Final Auto 7: Notify all stakeholders
            this.notifyAdmins(event.tenantId, {
                title: '🎉 Project Completed!',
                message: `${event.projectName} is now complete. Final invoice sent. Revenue: $${(event.contractValue || 0).toLocaleString()}.`,
                type: 'SUCCESS',
            }),
        ]);

        this.logResults('[Stage6:Completed]', results, [
            'FinalInvoice', 'CompleteTasks', 'MarkCompleted', 'ClientEmail',
            'ScheduleFollowUps', 'PostCompletionTasks', 'NotifyStakeholders',
        ]);
    }

    // ── Helper: Complete all remaining project tasks ─────────────────────

    private async completeAllProjectTasks(tenantId: string, projectId: string): Promise<void> {
        await prisma.task.updateMany({
            where: {
                tenantId,
                projectId,
                status: { not: 'COMPLETED' },
            },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
            },
        });

        // Also complete project-specific tasks
        await (prisma as any).projectTask.updateMany({
            where: {
                tenantId,
                projectId,
                status: { not: 'COMPLETED' },
            },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
            },
        });

        logger.info('[Stage6] All project tasks marked complete', { projectId });
    }

    // ── Helper: Complete task by title ───────────────────────────────────

    private async completeTaskByTitle(tenantId: string, projectId: string, titleContains: string): Promise<void> {
        const tasks = await prisma.task.findMany({
            where: {
                tenantId,
                projectId,
                title: { contains: titleContains, mode: 'insensitive' as any },
                status: { not: 'COMPLETED' },
            },
        });

        for (const task of tasks) {
            await prisma.task.update({
                where: { id: task.id },
                data: { status: 'COMPLETED', completedAt: new Date() },
            });
        }

        logger.info('[Stage6] Task completed by title', { titleContains, count: tasks.length });
    }

    // ── Helper: Schedule follow-up events ───────────────────────────────

    private async scheduleFollowUps(event: ProjectStageChangedEvent): Promise<void> {
        const followUps = [
            { title: 'Request Google Review', daysOffset: 7, duration: 30, type: 'CALL' as const },
            { title: 'Client Check-in Call', daysOffset: 30, duration: 30, type: 'CALL' as const },
            { title: 'Annual Inspection Offer', daysOffset: 365, duration: 60, type: 'MEETING' as const },
        ];

        for (const fu of followUps) {
            const startDate = new Date(Date.now() + fu.daysOffset * 86400000);
            startDate.setHours(10, 0, 0, 0);

            await calendarService.create(event.tenantId, {
                title: `${fu.title} – ${event.projectName}`,
                description: `Follow-up for completed project: ${event.projectName}.`,
                eventType: fu.type,
                startTime: startDate.toISOString(),
                endTime: new Date(startDate.getTime() + fu.duration * 60000).toISOString(),
                reminderMinutes: 1440,
            });
        }

        logger.info('[Stage6] Follow-up events scheduled', { projectId: event.projectId, count: followUps.length });
    }

    // ── Helper: Post-completion tasks ───────────────────────────────────

    private async createPostCompletionTasks(event: ProjectStageChangedEvent): Promise<void> {
        const tasks = [
            { title: 'Request Google review', daysOffset: 7, priority: 'MEDIUM' as const },
            { title: 'Submit warranty registration', daysOffset: 10, priority: 'HIGH' as const },
            { title: '30-day check-in call', daysOffset: 30, priority: 'MEDIUM' as const },
        ];

        for (const task of tasks) {
            await tasksService.create(event.tenantId, {
                title: `${task.title} – ${event.projectName}`,
                description: `Post-completion task for ${event.projectName}.`,
                priority: task.priority,
                assignedToId: event.salesRepId || event.projectManagerId || undefined,
                dueDate: new Date(Date.now() + task.daysOffset * 86400000).toISOString(),
                projectId: event.projectId,
            });
        }

        logger.info('[Stage6] Post-completion tasks created', { projectId: event.projectId, count: tasks.length });
    }

    // ── Helper: Send completion email ───────────────────────────────────

    private async sendCompletionEmail(to: string, clientName: string, projectName: string): Promise<void> {
        const firstName = clientName.split(' ')[0];

        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f4f7fa;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#059669 0%,#047857 100%);padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">🏠 Your Roof is Complete!</h1>
            <p style="color:#d1fae5;margin:8px 0 0;font-size:14px;">${projectName}</p>
        </div>
        <div style="padding:40px;">
            <h2 style="color:#1e293b;font-size:20px;margin:0 0 16px;">Hi ${firstName},</h2>
            <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 20px;">
                Great news — your roofing project is now complete! Thank you for choosing ZODO Roofing.
            </p>
            <div style="background:#f0fdf4;border-left:4px solid #059669;border-radius:4px;padding:16px 20px;margin:0 0 24px;">
                <p style="color:#065f46;font-size:14px;font-weight:600;margin:0 0 8px;">What's included:</p>
                <ul style="color:#065f46;font-size:14px;line-height:2;margin:0;padding-left:20px;">
                    <li>Final invoice attached</li>
                    <li>Warranty certificate will follow separately</li>
                    <li>Completion photos on file</li>
                    <li>We'll check in within 30 days</li>
                </ul>
            </div>
            <p style="color:#475569;font-size:14px;line-height:1.7;">
                We'd love to hear about your experience! A request for a Google review will follow shortly.
            </p>
        </div>
        <div style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="color:#94a3b8;font-size:11px;margin:0;">© ${new Date().getFullYear()} ZODO Roofing. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`.trim();

        await mailerService.sendMail({
            to,
            subject: 'Your roof is complete!',
            html,
        });

        logger.info('[Stage6] Completion email sent', { to });
    }

    // ── Helper: Notify admins ───────────────────────────────────────────

    private async notifyAdmins(tenantId: string, opts: {
        title: string;
        message: string;
        type: string;
    }): Promise<void> {
        const admins = await prisma.employee.findMany({
            where: {
                tenantId,
                role: { name: { in: ['Admin', 'Super Admin', 'ADMIN', 'SUPER_ADMIN'] } },
            },
            select: { userId: true },
        });

        for (const admin of admins) {
            await notificationsService.create({
                tenantId,
                userId: admin.userId,
                title: opts.title,
                message: opts.message,
                type: opts.type as any,
            });
        }
    }

    // ── Helper: Notify specific user ────────────────────────────────────

    private async notifyUser(tenantId: string, employeeId: string, opts: {
        title: string;
        message: string;
        type: string;
    }): Promise<void> {
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            select: { userId: true },
        });

        if (employee) {
            await notificationsService.create({
                tenantId,
                userId: employee.userId,
                title: opts.title,
                message: opts.message,
                type: opts.type as any,
            });
        }
    }

    // ── Helper: Log automation results ──────────────────────────────────

    private logResults(prefix: string, results: PromiseSettledResult<any>[], names: string[]): void {
        results.forEach((result, idx) => {
            if (result.status === 'rejected') {
                logger.error(`${prefix} "${names[idx]}" failed`, {
                    error: result.reason?.message || result.reason,
                });
            }
        });

        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        logger.info(`${prefix} Automations completed`, {
            succeeded,
            failed: results.length - succeeded,
            total: results.length,
        });
    }
}

export const stage6ProjectWorkflowService = new Stage6ProjectWorkflowService();
