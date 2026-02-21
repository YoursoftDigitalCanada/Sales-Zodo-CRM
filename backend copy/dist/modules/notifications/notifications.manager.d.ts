import { NotificationType } from '@prisma/client';
import { NotificationCreateOptions } from './notifications.dto';
/**
 * Notification Manager
 * High-level notification operations with business logic
 */
export declare class NotificationsManager {
    /**
     * Create a notification (convenience method)
     */
    createNotification(options: NotificationCreateOptions & {
        tenantId?: string;
    }): Promise<void>;
    /**
     * Notify about lead assignment
     */
    notifyLeadAssigned(assigneeUserId: string, tenantId: string, leadId: string, leadName: string, assignedByName: string): Promise<void>;
    /**
     * Notify about task assignment
     */
    notifyTaskAssigned(assigneeUserId: string, tenantId: string, taskId: string, taskTitle: string, assignedByName: string): Promise<void>;
    /**
     * Notify about task due soon
     */
    notifyTaskDueSoon(userId: string, tenantId: string, taskId: string, taskTitle: string, dueDate: Date): Promise<void>;
    /**
     * Notify about expense approval request
     */
    notifyExpenseApprovalRequest(approverUserId: string, tenantId: string, expenseId: string, expenseTitle: string, amount: number, currency: string, submittedByName: string): Promise<void>;
    /**
     * Notify about expense approval/rejection
     */
    notifyExpenseDecision(userId: string, tenantId: string, expenseId: string, expenseTitle: string, approved: boolean, approverName: string, notes?: string): Promise<void>;
    /**
     * Notify about invoice payment
     */
    notifyInvoicePaid(userId: string, tenantId: string, invoiceId: string, invoiceNumber: string, amount: number, currency: string, clientName: string): Promise<void>;
    /**
     * Notify about invoice overdue
     */
    notifyInvoiceOverdue(userId: string, tenantId: string, invoiceId: string, invoiceNumber: string, amount: number, currency: string, clientName: string, daysOverdue: number): Promise<void>;
    /**
     * Notify about new booking
     */
    notifyNewBooking(userId: string, tenantId: string, bookingId: string, bookingTitle: string, startTime: Date, guestName: string): Promise<void>;
    /**
     * Notify about calendar event reminder
     */
    notifyEventReminder(userId: string, tenantId: string, eventId: string, eventTitle: string, startTime: Date, minutesBefore: number): Promise<void>;
    /**
     * Notify about new chat message
     */
    notifyNewChatMessage(userId: string, tenantId: string, roomId: string, senderName: string, messagePreview: string): Promise<void>;
    /**
     * Notify about project status change
     */
    notifyProjectStatusChange(userIds: string[], tenantId: string, projectId: string, projectName: string, oldStatus: string, newStatus: string, changedByName: string): Promise<void>;
    /**
     * Notify about system/admin message
     */
    notifySystem(userId: string, tenantId: string, title: string, message: string, actionUrl?: string): Promise<void>;
    /**
     * Broadcast notification to all users in tenant
     */
    broadcastToTenant(tenantId: string, title: string, message: string, type?: NotificationType, actionUrl?: string): Promise<number>;
    /**
     * Notify about account security event
     */
    notifySecurityEvent(userId: string, tenantId: string, event: 'password_changed' | 'login_new_device' | 'account_locked' | 'suspicious_activity', details?: string): Promise<void>;
}
export declare const notificationManager: NotificationsManager;
//# sourceMappingURL=notifications.manager.d.ts.map