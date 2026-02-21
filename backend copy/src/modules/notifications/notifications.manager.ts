import { NotificationType } from '@prisma/client';
import { notificationsService } from './notifications.service';
import { NotificationCreateOptions } from './notifications.dto';
import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';

/**
 * Notification Manager
 * High-level notification operations with business logic
 */
export class NotificationsManager {
  /**
   * Create a notification (convenience method)
   */
  async createNotification(
    options: NotificationCreateOptions & { tenantId?: string }
  ): Promise<void> {
    try {
      // Get tenant ID from user if not provided
      let tenantId = options.tenantId;
      
      if (!tenantId) {
        const user = await prisma.user.findUnique({
          where: { id: options.userId },
          select: { tenantId: true },
        });
        tenantId = user?.tenantId || undefined;
      }

      if (!tenantId) {
        logger.warn('Cannot create notification without tenant context', { userId: options.userId });
        return;
      }

      await notificationsService.create({
        userId: options.userId,
        tenantId,
        title: options.title,
        message: options.message,
        type: options.type || 'INFO',
        actionUrl: options.actionUrl,
        actionLabel: options.actionLabel,
        metadata: options.metadata,
      });
    } catch (error) {
      logger.error('Failed to create notification', { error, options });
    }
  }

  /**
   * Notify about lead assignment
   */
  async notifyLeadAssigned(
    assigneeUserId: string,
    tenantId: string,
    leadId: string,
    leadName: string,
    assignedByName: string
  ): Promise<void> {
    await this.createNotification({
      userId: assigneeUserId,
      tenantId,
      title: 'New Lead Assigned',
      message: `${assignedByName} assigned lead "${leadName}" to you.`,
      type: 'INFO',
      actionUrl: `/leads/${leadId}`,
      actionLabel: 'View Lead',
      metadata: { leadId, type: 'lead_assigned' },
    });
  }

  /**
   * Notify about task assignment
   */
  async notifyTaskAssigned(
    assigneeUserId: string,
    tenantId: string,
    taskId: string,
    taskTitle: string,
    assignedByName: string
  ): Promise<void> {
    await this.createNotification({
      userId: assigneeUserId,
      tenantId,
      title: 'New Task Assigned',
      message: `${assignedByName} assigned task "${taskTitle}" to you.`,
      type: 'INFO',
      actionUrl: `/tasks/${taskId}`,
      actionLabel: 'View Task',
      metadata: { taskId, type: 'task_assigned' },
    });
  }

  /**
   * Notify about task due soon
   */
  async notifyTaskDueSoon(
    userId: string,
    tenantId: string,
    taskId: string,
    taskTitle: string,
    dueDate: Date
  ): Promise<void> {
    await this.createNotification({
      userId,
      tenantId,
      title: 'Task Due Soon',
      message: `Task "${taskTitle}" is due on ${dueDate.toLocaleDateString()}.`,
      type: 'WARNING',
      actionUrl: `/tasks/${taskId}`,
      actionLabel: 'View Task',
      metadata: { taskId, dueDate: dueDate.toISOString(), type: 'task_due_soon' },
    });
  }

  /**
   * Notify about expense approval request
   */
  async notifyExpenseApprovalRequest(
    approverUserId: string,
    tenantId: string,
    expenseId: string,
    expenseTitle: string,
    amount: number,
    currency: string,
    submittedByName: string
  ): Promise<void> {
    await this.createNotification({
      userId: approverUserId,
      tenantId,
      title: 'Expense Approval Request',
      message: `${submittedByName} submitted expense "${expenseTitle}" (${currency} ${amount.toFixed(2)}) for approval.`,
      type: 'INFO',
      actionUrl: `/expenses/${expenseId}`,
      actionLabel: 'Review Expense',
      metadata: { expenseId, amount, currency, type: 'expense_approval_request' },
    });
  }

  /**
   * Notify about expense approval/rejection
   */
  async notifyExpenseDecision(
    userId: string,
    tenantId: string,
    expenseId: string,
    expenseTitle: string,
    approved: boolean,
    approverName: string,
    notes?: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      tenantId,
      title: approved ? 'Expense Approved' : 'Expense Rejected',
      message: `Your expense "${expenseTitle}" has been ${approved ? 'approved' : 'rejected'} by ${approverName}.${notes ? ` Note: ${notes}` : ''}`,
      type: approved ? 'SUCCESS' : 'WARNING',
      actionUrl: `/expenses/${expenseId}`,
      actionLabel: 'View Expense',
      metadata: { expenseId, approved, type: 'expense_decision' },
    });
  }

  /**
   * Notify about invoice payment
   */
  async notifyInvoicePaid(
    userId: string,
    tenantId: string,
    invoiceId: string,
    invoiceNumber: string,
    amount: number,
    currency: string,
    clientName: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      tenantId,
      title: 'Invoice Paid',
      message: `Invoice ${invoiceNumber} for ${clientName} (${currency} ${amount.toFixed(2)}) has been paid.`,
      type: 'SUCCESS',
      actionUrl: `/invoices/${invoiceId}`,
      actionLabel: 'View Invoice',
      metadata: { invoiceId, amount, currency, type: 'invoice_paid' },
    });
  }

  /**
   * Notify about invoice overdue
   */
  async notifyInvoiceOverdue(
    userId: string,
    tenantId: string,
    invoiceId: string,
    invoiceNumber: string,
    amount: number,
    currency: string,
    clientName: string,
    daysOverdue: number
  ): Promise<void> {
    await this.createNotification({
      userId,
      tenantId,
      title: 'Invoice Overdue',
      message: `Invoice ${invoiceNumber} for ${clientName} (${currency} ${amount.toFixed(2)}) is ${daysOverdue} days overdue.`,
      type: 'ERROR',
      actionUrl: `/invoices/${invoiceId}`,
      actionLabel: 'View Invoice',
      metadata: { invoiceId, amount, currency, daysOverdue, type: 'invoice_overdue' },
    });
  }

  /**
   * Notify about new booking
   */
  async notifyNewBooking(
    userId: string,
    tenantId: string,
    bookingId: string,
    bookingTitle: string,
    startTime: Date,
    guestName: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      tenantId,
      title: 'New Booking',
      message: `New booking "${bookingTitle}" with ${guestName} on ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}.`,
      type: 'INFO',
      actionUrl: `/bookings/${bookingId}`,
      actionLabel: 'View Booking',
      metadata: { bookingId, startTime: startTime.toISOString(), type: 'new_booking' },
    });
  }

  /**
   * Notify about calendar event reminder
   */
  async notifyEventReminder(
    userId: string,
    tenantId: string,
    eventId: string,
    eventTitle: string,
    startTime: Date,
    minutesBefore: number
  ): Promise<void> {
    await this.createNotification({
      userId,
      tenantId,
      title: 'Event Reminder',
      message: `Reminder: "${eventTitle}" starts in ${minutesBefore} minutes.`,
      type: 'INFO',
      actionUrl: `/calendar?event=${eventId}`,
      actionLabel: 'View Event',
      metadata: { eventId, startTime: startTime.toISOString(), type: 'event_reminder' },
    });
  }

  /**
   * Notify about new chat message
   */
  async notifyNewChatMessage(
    userId: string,
    tenantId: string,
    roomId: string,
    senderName: string,
    messagePreview: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      tenantId,
      title: 'New Message',
      message: `${senderName}: ${messagePreview.substring(0, 100)}${messagePreview.length > 100 ? '...' : ''}`,
      type: 'INFO',
      actionUrl: `/chat/${roomId}`,
      actionLabel: 'Open Chat',
      metadata: { roomId, type: 'new_chat_message' },
    });
  }

  /**
   * Notify about project status change
   */
  async notifyProjectStatusChange(
    userIds: string[],
    tenantId: string,
    projectId: string,
    projectName: string,
    oldStatus: string,
    newStatus: string,
    changedByName: string
  ): Promise<void> {
    for (const userId of userIds) {
      await this.createNotification({
        userId,
        tenantId,
        title: 'Project Status Updated',
        message: `${changedByName} changed project "${projectName}" status from ${oldStatus} to ${newStatus}.`,
        type: 'INFO',
        actionUrl: `/projects/${projectId}`,
        actionLabel: 'View Project',
        metadata: { projectId, oldStatus, newStatus, type: 'project_status_change' },
      });
    }
  }

  /**
   * Notify about system/admin message
   */
  async notifySystem(
    userId: string,
    tenantId: string,
    title: string,
    message: string,
    actionUrl?: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      tenantId,
      title,
      message,
      type: 'SYSTEM',
      actionUrl,
      metadata: { type: 'system' },
    });
  }

  /**
   * Broadcast notification to all users in tenant
   */
  async broadcastToTenant(
    tenantId: string,
    title: string,
    message: string,
    type: NotificationType = 'INFO',
    actionUrl?: string
  ): Promise<number> {
    // Get all active employees in tenant
    const employees = await prisma.employee.findMany({
      where: { tenantId, isActive: true },
      select: { userId: true },
    });

    const userIds = employees.map((e) => e.userId);

    return notificationsService.createForUsers(userIds, tenantId, {
      title,
      message,
      type,
      actionUrl,
      metadata: { type: 'broadcast' },
    });
  }

  /**
   * Notify about account security event
   */
  async notifySecurityEvent(
    userId: string,
    tenantId: string,
    event: 'password_changed' | 'login_new_device' | 'account_locked' | 'suspicious_activity',
    details?: string
  ): Promise<void> {
    const titles: Record<string, string> = {
      password_changed: 'Password Changed',
      login_new_device: 'New Device Login',
      account_locked: 'Account Temporarily Locked',
      suspicious_activity: 'Suspicious Activity Detected',
    };

    const messages: Record<string, string> = {
      password_changed: 'Your password has been successfully changed.',
      login_new_device: 'A new device was used to log into your account.',
      account_locked: 'Your account has been temporarily locked due to multiple failed login attempts.',
      suspicious_activity: 'Suspicious activity was detected on your account.',
    };

    await this.createNotification({
      userId,
      tenantId,
      title: titles[event],
      message: details || messages[event],
      type: event === 'password_changed' ? 'SUCCESS' : 'WARNING',
      actionUrl: '/settings/security',
      actionLabel: 'Review Security',
      metadata: { event, type: 'security' },
    });
  }
}

export const notificationManager = new NotificationsManager();