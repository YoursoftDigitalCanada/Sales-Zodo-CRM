import { supportTicketsRepository } from './support-tickets.repository';
import { mailerService } from '../../common/services/mailer.service';
import { TicketStatus, TicketPriority } from '@prisma/client';

// Hardcoded SMTP config for support email notifications
const SUPPORT_SMTP = {
    host: 'smtp.hostinger.com',
    port: 465,
    user: 'support@zodo.ca',
    pass: 'TimnpfSupport@365',
    senderName: 'ZODO CRM Support',
    senderEmail: 'support@zodo.ca',
};

export class SupportTicketsService {
    async createTicket(tenantId: string, data: {
        subject: string;
        description: string;
        priority?: TicketPriority;
        category?: string;
        requesterName: string;
        requesterEmail: string;
    }) {
        const ticket = await supportTicketsRepository.create(tenantId, data);

        // Send email notification to support@zodo.ca
        try {
            await mailerService.sendMailWithConfig(SUPPORT_SMTP, {
                to: 'support@zodo.ca',
                subject: `[${ticket.ticketNumber}] New Support Ticket: ${ticket.subject}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: #0891B2; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                            <h2 style="margin: 0;">🎫 New Support Ticket</h2>
                            <p style="margin: 5px 0 0; opacity: 0.9;">${ticket.ticketNumber}</p>
                        </div>
                        <div style="border: 1px solid #e2e8f0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr><td style="padding: 8px 0; color: #64748b; width: 120px;">Subject:</td><td style="padding: 8px 0; font-weight: 600;">${ticket.subject}</td></tr>
                                <tr><td style="padding: 8px 0; color: #64748b;">Priority:</td><td style="padding: 8px 0;"><span style="background: ${ticket.priority === 'URGENT' ? '#fee2e2' : ticket.priority === 'HIGH' ? '#ffedd5' : '#e0f2fe'}; color: ${ticket.priority === 'URGENT' ? '#dc2626' : ticket.priority === 'HIGH' ? '#ea580c' : '#0284c7'}; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${ticket.priority}</span></td></tr>
                                <tr><td style="padding: 8px 0; color: #64748b;">Category:</td><td style="padding: 8px 0;">${ticket.category}</td></tr>
                                <tr><td style="padding: 8px 0; color: #64748b;">From:</td><td style="padding: 8px 0;">${ticket.requesterName} (${ticket.requesterEmail})</td></tr>
                            </table>
                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
                            <h3 style="color: #0f172a; margin: 0 0 8px;">Description</h3>
                            <p style="color: #475569; line-height: 1.6; white-space: pre-wrap;">${ticket.description}</p>
                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
                            <p style="color: #94a3b8; font-size: 12px;">Manage this ticket in <a href="https://crm.zodo.ca/support/tickets" style="color: #0891B2;">ZODO CRM Support Center</a></p>
                        </div>
                    </div>
                `,
            });
            console.log(`📧 Support ticket email sent for ${ticket.ticketNumber}`);
        } catch (err: any) {
            console.error(`❌ Failed to send support ticket email: ${err.message}`);
        }

        return ticket;
    }

    async getTickets(tenantId: string, query: any) {
        const { data, total } = await supportTicketsRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 50;
        return {
            data,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    async getTicketById(id: string, tenantId: string) {
        const ticket = await supportTicketsRepository.findById(id, tenantId);
        if (!ticket) throw new Error('Ticket not found');
        return ticket;
    }

    async updateStatus(id: string, tenantId: string, status: TicketStatus) {
        return supportTicketsRepository.updateStatus(id, tenantId, status);
    }

    async addMessage(id: string, tenantId: string, data: { sender: string; message: string; isStaff: boolean }) {
        return supportTicketsRepository.addMessage(id, tenantId, data);
    }

    async deleteTicket(id: string, tenantId: string) {
        return supportTicketsRepository.delete(id, tenantId);
    }

    async getStats(tenantId: string) {
        return supportTicketsRepository.getStats(tenantId);
    }
}

export const supportTicketsService = new SupportTicketsService();
