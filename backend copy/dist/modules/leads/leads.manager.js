"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadsManager = exports.LeadsManager = void 0;
const database_1 = require("../../config/database");
const leads_service_1 = require("./leads.service");
const leads_repository_1 = require("./leads.repository");
const audit_service_1 = require("../audit/audit.service");
const notifications_manager_1 = require("../notifications/notifications.manager");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
const logger_1 = require("../../common/utils/logger");
/**
 * Leads Manager
 * Contains complex business logic and orchestration
 */
class LeadsManager {
    /**
     * Create lead with audit logging and notifications
     */
    async createLead(req, tenantId, data, createdById) {
        const lead = await leads_service_1.leadsService.create(tenantId, data, createdById);
        // Audit log
        await audit_service_1.auditService.logCreate(req, 'leads', 'Lead', lead.id, {
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            status: lead.status,
        });
        // Notify assigned employee if different from creator
        if (data.assignedToId && data.assignedToId !== createdById) {
            const assignee = lead.assignedTo;
            if (assignee) {
                const creatorName = `${req.employee?.user?.firstName || 'Someone'} ${req.employee?.user?.lastName || ''}`.trim();
                await notifications_manager_1.notificationManager.notifyLeadAssigned(assignee.userId, tenantId, lead.id, lead.fullName, creatorName);
            }
        }
        logger_1.logger.info('Lead created', {
            leadId: lead.id,
            tenantId,
            createdBy: createdById,
        });
        return lead;
    }
    /**
     * Update lead with audit logging
     */
    async updateLead(req, id, tenantId, data, employeeId) {
        // Get existing lead for comparison
        const existing = await leads_repository_1.leadsRepository.findById(id, tenantId);
        if (!existing) {
            throw new HttpErrors_1.NotFoundError('Lead not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        const previousAssignee = existing.assignedToId;
        const lead = await leads_service_1.leadsService.update(id, tenantId, data);
        // Audit log
        await audit_service_1.auditService.logUpdate(req, 'leads', 'Lead', lead.id, existing, lead);
        // Notify new assignee if assignment changed
        if (data.assignedToId && data.assignedToId !== previousAssignee) {
            const assignee = lead.assignedTo;
            if (assignee) {
                const updaterName = `${req.employee?.user?.firstName || 'Someone'} ${req.employee?.user?.lastName || ''}`.trim();
                await notifications_manager_1.notificationManager.notifyLeadAssigned(assignee.userId, tenantId, lead.id, lead.fullName, updaterName);
            }
        }
        return lead;
    }
    /**
     * Delete lead with audit logging
     */
    async deleteLead(req, id, tenantId) {
        const lead = await leads_repository_1.leadsRepository.findById(id, tenantId);
        if (!lead) {
            throw new HttpErrors_1.NotFoundError('Lead not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        await leads_service_1.leadsService.delete(id, tenantId);
        // Audit log
        await audit_service_1.auditService.logDelete(req, 'leads', 'Lead', id, {
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
        });
        logger_1.logger.info('Lead deleted', { leadId: id, tenantId });
    }
    /**
     * Update lead status with audit logging
     */
    async updateLeadStatus(req, id, tenantId, status) {
        const existing = await leads_repository_1.leadsRepository.findById(id, tenantId);
        if (!existing) {
            throw new HttpErrors_1.NotFoundError('Lead not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        const oldStatus = existing.status;
        const lead = await leads_service_1.leadsService.updateStatus(id, tenantId, status);
        // Audit log
        await audit_service_1.auditService.logStatusChange(req, 'leads', 'Lead', id, oldStatus, status);
        logger_1.logger.info('Lead status updated', {
            leadId: id,
            tenantId,
            oldStatus,
            newStatus: status,
        });
        return lead;
    }
    /**
     * Assign lead with notifications
     */
    async assignLead(req, id, tenantId, assignedToId, assignerEmployeeId) {
        const existing = await leads_repository_1.leadsRepository.findById(id, tenantId);
        if (!existing) {
            throw new HttpErrors_1.NotFoundError('Lead not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        const lead = await leads_service_1.leadsService.assign(id, tenantId, assignedToId);
        // Audit log
        await audit_service_1.auditService.logUpdate(req, 'leads', 'Lead', id, { assignedToId: existing.assignedToId }, { assignedToId });
        // Notify new assignee
        if (assignedToId && assignedToId !== assignerEmployeeId) {
            const assignee = lead.assignedTo;
            if (assignee) {
                const assignerName = `${req.employee?.user?.firstName || 'Someone'} ${req.employee?.user?.lastName || ''}`.trim();
                await notifications_manager_1.notificationManager.notifyLeadAssigned(assignee.userId, tenantId, lead.id, lead.fullName, assignerName);
            }
        }
        return lead;
    }
    /**
     * Bulk assign leads with notifications
     */
    async bulkAssignLeads(req, leadIds, tenantId, assignedToId, assignerEmployeeId) {
        const count = await leads_service_1.leadsService.bulkAssign(leadIds, tenantId, assignedToId);
        // Audit log
        await audit_service_1.auditService.logWithContext(req, 'UPDATE', 'leads', `Bulk assigned ${count} leads`, {
            entityType: 'Lead',
            newValues: { leadIds, assignedToId },
        });
        // Get assignee info for notification
        if (assignedToId !== assignerEmployeeId) {
            const assignee = await database_1.prisma.employee.findUnique({
                where: { id: assignedToId },
                include: { user: true },
            });
            if (assignee) {
                const assignerName = `${req.employee?.user?.firstName || 'Someone'} ${req.employee?.user?.lastName || ''}`.trim();
                await notifications_manager_1.notificationManager.createNotification({
                    userId: assignee.userId,
                    tenantId,
                    title: 'Leads Assigned',
                    message: `${assignerName} assigned ${count} leads to you.`,
                    type: 'INFO',
                    actionUrl: '/leads?assignedToMe=true',
                    actionLabel: 'View Leads',
                });
            }
        }
        logger_1.logger.info('Bulk lead assignment', {
            count,
            tenantId,
            assignedToId,
        });
        return count;
    }
    /**
     * Convert lead to client
     */
    async convertLeadToClient(req, leadId, tenantId, options) {
        const lead = await leads_repository_1.leadsRepository.findById(leadId, tenantId);
        if (!lead) {
            throw new HttpErrors_1.NotFoundError('Lead not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        if (lead.status === 'WON' && lead.convertedToClientId) {
            throw new HttpErrors_1.BadRequestError('Lead has already been converted', errorCodes_1.ErrorCodes.VALIDATION_FAILED);
        }
        // Create client and optionally contact in a transaction
        const result = await database_1.prisma.$transaction(async (tx) => {
            // Create client
            const client = await tx.client.create({
                data: {
                    tenantId,
                    clientType: options.clientType,
                    companyName: options.clientType === 'COMPANY' ? lead.companyName : null,
                    firstName: options.clientType === 'INDIVIDUAL' ? lead.firstName : null,
                    lastName: options.clientType === 'INDIVIDUAL' ? lead.lastName : null,
                    email: lead.email,
                    phone: lead.phone,
                    website: lead.website,
                    status: 'ACTIVE',
                    assignedToId: lead.assignedToId,
                    notes: lead.notes,
                },
            });
            let contact = null;
            // Create primary contact if requested and it's a company
            if (options.createContact && options.clientType === 'COMPANY') {
                contact = await tx.contact.create({
                    data: {
                        tenantId,
                        clientId: client.id,
                        firstName: lead.firstName,
                        lastName: lead.lastName,
                        email: lead.email,
                        phone: lead.phone,
                        jobTitle: lead.jobTitle,
                        isPrimary: true,
                        isActive: true,
                    },
                });
            }
            // Mark lead as converted
            await tx.lead.update({
                where: { id: leadId },
                data: {
                    status: 'WON',
                    convertedAt: new Date(),
                    convertedToClientId: client.id,
                },
            });
            return { client, contact };
        });
        // Audit log
        await audit_service_1.auditService.logWithContext(req, 'UPDATE', 'leads', `Converted lead to ${options.clientType.toLowerCase()} client`, {
            entityType: 'Lead',
            entityId: leadId,
            oldValues: { status: lead.status },
            newValues: {
                status: 'WON',
                convertedToClientId: result.client.id,
            },
        });
        logger_1.logger.info('Lead converted to client', {
            leadId,
            clientId: result.client.id,
            contactId: result.contact?.id,
            tenantId,
        });
        return {
            clientId: result.client.id,
            contactId: result.contact?.id,
        };
    }
    /**
     * Add activity to lead
     */
    async addActivity(tenantId, leadId, type, title, description, metadata) {
        const lead = await leads_repository_1.leadsRepository.findById(leadId, tenantId);
        if (!lead) {
            throw new HttpErrors_1.NotFoundError('Lead not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        await database_1.prisma.leadActivity.create({
            data: {
                leadId,
                type,
                title,
                description,
                metadata: metadata,
            },
        });
    }
    /**
     * Get lead activities
     */
    async getActivities(tenantId, leadId, limit = 50) {
        const lead = await leads_repository_1.leadsRepository.findById(leadId, tenantId);
        if (!lead) {
            throw new HttpErrors_1.NotFoundError('Lead not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        const activities = await database_1.prisma.leadActivity.findMany({
            where: { leadId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return activities;
    }
    /**
     * Import leads from data
     */
    async importLeads(req, tenantId, leads, createdById) {
        let imported = 0;
        let failed = 0;
        const errors = [];
        for (let i = 0; i < leads.length; i++) {
            try {
                await leads_service_1.leadsService.create(tenantId, leads[i], createdById);
                imported++;
            }
            catch (error) {
                failed++;
                errors.push(`Row ${i + 1}: ${error.message}`);
            }
        }
        // Audit log
        await audit_service_1.auditService.logWithContext(req, 'IMPORT', 'leads', `Imported ${imported} leads (${failed} failed)`, {
            newValues: { imported, failed },
        });
        logger_1.logger.info('Leads import completed', {
            tenantId,
            imported,
            failed,
        });
        return { imported, failed, errors };
    }
    /**
     * Export leads
     */
    async exportLeads(req, tenantId, query) {
        const { data } = await leads_service_1.leadsService.getMany(tenantId, { ...query, limit: 10000 });
        // Audit log
        await audit_service_1.auditService.logWithContext(req, 'EXPORT', 'leads', `Exported ${data.length} leads`, {
            newValues: { count: data.length },
        });
        return data;
    }
}
exports.LeadsManager = LeadsManager;
exports.leadsManager = new LeadsManager();
//# sourceMappingURL=leads.manager.js.map