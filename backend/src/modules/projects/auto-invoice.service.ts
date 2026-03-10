import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';
import { invoicesService } from '../invoices/invoices.service';
import { activityLogger } from '../../common/services/activity-logger.service';

// ============================================================================
// AUTO-INVOICE ENGINE — Stage 6
//
// Creates invoices automatically based on project Kanban stage transitions.
// Invoice split: 33% deposit + 33% progress + 34% final = 100%
// ============================================================================

export class AutoInvoiceService {

    // ── Invoice #1: Deposit (33%) on CONTRACT_SIGNED ────────────────────

    async createDepositInvoice(opts: {
        tenantId: string;
        projectId: string;
        projectName: string;
        clientId: string;
        contractValue: number;
    }): Promise<void> {
        const depositPercent = 0.33;
        const depositAmount = Math.round(opts.contractValue * depositPercent * 100) / 100;

        const invoiceNumber = await this.generateInvoiceNumber(opts.tenantId);

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        try {
            await invoicesService.create(opts.tenantId, {
                invoiceNumber,
                clientId: opts.clientId,
                dueDate: dueDate.toISOString() as any,
                notes: `Deposit invoice (33%) for project: ${opts.projectName}. Total contract: $${opts.contractValue.toLocaleString()}.`,
                terms: 'Due upon receipt. Work will commence upon payment.',
                items: [{
                    description: `Deposit (33%) – ${opts.projectName}`,
                    quantity: 1,
                    unitPrice: depositAmount,
                    amount: depositAmount,
                }],
            });

            // Link invoice to project
            await this.linkLatestInvoiceToProject(opts.tenantId, opts.clientId, opts.projectId);

            logger.info('[AutoInvoice] Deposit invoice created', {
                invoiceNumber,
                amount: depositAmount,
                projectId: opts.projectId,
            });
        } catch (err: any) {
            logger.error('[AutoInvoice] Deposit invoice failed', { err: err.message, projectId: opts.projectId });
        }
    }

    // ── Invoice #2: Progress (33%) on MATERIALS_DELIVERED ───────────────

    async createProgressInvoice(opts: {
        tenantId: string;
        projectId: string;
        projectName: string;
        clientId: string;
        contractValue: number;
    }): Promise<void> {
        const progressPercent = 0.33;
        const progressAmount = Math.round(opts.contractValue * progressPercent * 100) / 100;

        const invoiceNumber = await this.generateInvoiceNumber(opts.tenantId);

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);

        try {
            await invoicesService.create(opts.tenantId, {
                invoiceNumber,
                clientId: opts.clientId,
                dueDate: dueDate.toISOString() as any,
                notes: `Progress invoice (33%) for project: ${opts.projectName}. Materials delivered, work to begin.`,
                terms: 'Due within 14 days.',
                items: [{
                    description: `Progress Payment (33%) – ${opts.projectName}`,
                    quantity: 1,
                    unitPrice: progressAmount,
                    amount: progressAmount,
                }],
            });

            await this.linkLatestInvoiceToProject(opts.tenantId, opts.clientId, opts.projectId);

            logger.info('[AutoInvoice] Progress invoice created', {
                invoiceNumber,
                amount: progressAmount,
                projectId: opts.projectId,
            });
        } catch (err: any) {
            logger.error('[AutoInvoice] Progress invoice failed', { err: err.message, projectId: opts.projectId });
        }
    }

    // ── Invoice #3: Final (34%) on COMPLETED ────────────────────────────

    async createFinalInvoice(opts: {
        tenantId: string;
        projectId: string;
        projectName: string;
        clientId: string;
        contractValue: number;
    }): Promise<void> {
        const finalPercent = 0.34;
        const finalAmount = Math.round(opts.contractValue * finalPercent * 100) / 100;

        const invoiceNumber = await this.generateInvoiceNumber(opts.tenantId);

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        try {
            await invoicesService.create(opts.tenantId, {
                invoiceNumber,
                clientId: opts.clientId,
                dueDate: dueDate.toISOString() as any,
                notes: `Final invoice (34%) for project: ${opts.projectName}. Project completed.`,
                terms: 'Due within 30 days of project completion.',
                items: [{
                    description: `Final Payment (34%) – ${opts.projectName}`,
                    quantity: 1,
                    unitPrice: finalAmount,
                    amount: finalAmount,
                }],
            });

            await this.linkLatestInvoiceToProject(opts.tenantId, opts.clientId, opts.projectId);

            logger.info('[AutoInvoice] Final invoice created', {
                invoiceNumber,
                amount: finalAmount,
                projectId: opts.projectId,
            });
        } catch (err: any) {
            logger.error('[AutoInvoice] Final invoice failed', { err: err.message, projectId: opts.projectId });
        }
    }

    // ── Log expense to project cost tracker ──────────────────────────────

    async logProjectExpense(opts: {
        tenantId: string;
        projectId: string;
        category: string;
        description: string;
        amount: number;
        userId?: string;
    }): Promise<void> {
        try {
            await (prisma as any).projectExpense.create({
                data: {
                    tenantId: opts.tenantId,
                    projectId: opts.projectId,
                    category: opts.category,
                    description: opts.description,
                    amount: opts.amount,
                    createdById: opts.userId || null,
                },
            });

            // Recalculate project financials
            await (prisma as any).project.update({
                where: { id: opts.projectId },
                data: {
                    actualCost: {
                        increment: opts.amount,
                    },
                },
            });

            logger.info('[AutoInvoice] Expense logged', {
                projectId: opts.projectId,
                category: opts.category,
                amount: opts.amount,
            });
        } catch (err: any) {
            logger.error('[AutoInvoice] logProjectExpense failed', { err: err.message });
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private async generateInvoiceNumber(tenantId: string): Promise<string> {
        const year = new Date().getFullYear();
        const count = await prisma.invoice.count({ where: { tenantId } });
        return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    private async linkLatestInvoiceToProject(
        tenantId: string,
        clientId: string,
        projectId: string,
    ): Promise<void> {
        try {
            const latestInvoice = await prisma.invoice.findFirst({
                where: { tenantId, clientId },
                orderBy: { createdAt: 'desc' },
            });
            if (latestInvoice && !latestInvoice.projectId) {
                await prisma.invoice.update({
                    where: { id: latestInvoice.id },
                    data: { projectId },
                });
            }
        } catch (err: any) {
            logger.warn('[AutoInvoice] linkInvoiceToProject failed', { err: err.message });
        }
    }
}

export const autoInvoiceService = new AutoInvoiceService();
