import { Request, Response, NextFunction } from 'express';
import { AuditAction } from '@prisma/client';
import { sendSuccess } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';
import { BadRequestError } from '../../common/errors/HttpErrors';
import { auditService } from '../audit/audit.service';
import { settingsService } from './settings.service';

export class SettingsController {
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await settingsService.get(req.context.tenantId);
      sendSuccess(res, settings);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await settingsService.update(req.context.tenantId, sanitizeBody(req.body));
      await auditService.logWithContext(req, AuditAction.UPDATE, 'settings', 'Updated workspace settings');
      sendSuccess(res, settings, 'Settings updated');
    } catch (error) {
      next(error);
    }
  }

  async getGeneral(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const general = await settingsService.getGeneral(req.context.tenantId);
      sendSuccess(res, general);
    } catch (error) {
      next(error);
    }
  }

  async updateGeneral(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const general = await settingsService.updateGeneral(req.context.tenantId, sanitizeBody(req.body));
      await auditService.logWithContext(req, AuditAction.UPDATE, 'settings', 'Updated general workspace settings');
      sendSuccess(res, general, 'General settings updated');
    } catch (error) {
      next(error);
    }
  }

  async getCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const company = await settingsService.getCompany(req.context.tenantId);
      sendSuccess(res, company);
    } catch (error) {
      next(error);
    }
  }

  async getCompanyBranding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const company = await settingsService.getCompany(req.context.tenantId);
      sendSuccess(res, company);
    } catch (error) {
      next(error);
    }
  }

  async updateCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const company = await settingsService.updateCompany(req.context.tenantId, sanitizeBody(req.body));
      await auditService.logWithContext(req, AuditAction.UPDATE, 'settings', 'Updated company profile');
      sendSuccess(res, company, 'Company profile updated');
    } catch (error) {
      next(error);
    }
  }

  async uploadCompanyLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = (req as Request & { file?: Express.Multer.File }).file;

      if (!file) {
        throw new BadRequestError('Logo file is required');
      }

      const publicPath = `/uploads/${req.context.tenantId}/settings/${file.filename}`;
      const company = await settingsService.updateCompanyLogo(req.context.tenantId, publicPath);
      await auditService.logWithContext(req, AuditAction.UPDATE, 'settings', 'Updated company logo');
      sendSuccess(res, company, 'Company logo uploaded');
    } catch (error) {
      next(error);
    }
  }

  async getBilling(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const billing = await settingsService.getBilling(req.context.tenantId);
      sendSuccess(res, billing);
    } catch (error) {
      next(error);
    }
  }

  async getBillingInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoices = await settingsService.getBillingInvoices(req.context.tenantId);
      sendSuccess(res, invoices);
    } catch (error) {
      next(error);
    }
  }

  async updateBilling(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const billing = await settingsService.updateBilling(req.context.tenantId, sanitizeBody(req.body));
      await auditService.logWithContext(req, AuditAction.UPDATE, 'settings', 'Updated workspace billing plan');
      sendSuccess(res, billing, 'Billing plan updated');
    } catch (error) {
      next(error);
    }
  }

  async cancelBilling(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const billing = await settingsService.cancelBillingSubscription(req.context.tenantId);
      await auditService.logWithContext(req, AuditAction.UPDATE, 'settings', 'Cancelled workspace subscription renewal');
      sendSuccess(res, billing, 'Subscription renewal cancelled');
    } catch (error) {
      next(error);
    }
  }

  async reactivateBilling(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const billing = await settingsService.reactivateBillingSubscription(req.context.tenantId);
      await auditService.logWithContext(req, AuditAction.UPDATE, 'settings', 'Reactivated workspace subscription renewal');
      sendSuccess(res, billing, 'Subscription reactivated');
    } catch (error) {
      next(error);
    }
  }

  async getEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const emailSettings = await settingsService.getEmailSettings(req.context.tenantId, req.context.userId);
      sendSuccess(res, emailSettings);
    } catch (error) {
      next(error);
    }
  }

  async updateSmtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const emailSettings = await settingsService.updateSmtpSettings(req.context.tenantId, req.context.userId, sanitizeBody(req.body));
      await auditService.logWithContext(req, AuditAction.UPDATE, 'settings', 'Updated SMTP settings');
      sendSuccess(res, emailSettings, 'SMTP settings updated');
    } catch (error) {
      next(error);
    }
  }

  async uploadEmailSignatureAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const kind = req.params.kind;
      if (kind !== 'logo' && kind !== 'signature') {
        throw new BadRequestError('Signature asset type must be logo or signature');
      }

      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file) {
        throw new BadRequestError('Signature image file is required');
      }

      const publicPath = `/uploads/${req.context.tenantId}/settings/${file.filename}`;
      const emailSettings = await settingsService.updateSignatureAsset(
        req.context.tenantId,
        req.context.userId,
        kind,
        publicPath,
      );
      await auditService.logWithContext(req, AuditAction.UPDATE, 'settings', `Updated email signature ${kind}`);
      sendSuccess(res, emailSettings, `Email signature ${kind} uploaded`);
    } catch (error) {
      next(error);
    }
  }

  async removeEmailSignatureAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const kind = req.params.kind;
      if (kind !== 'logo' && kind !== 'signature') {
        throw new BadRequestError('Signature asset type must be logo or signature');
      }

      const emailSettings = await settingsService.updateSignatureAsset(
        req.context.tenantId,
        req.context.userId,
        kind,
        null,
      );
      await auditService.logWithContext(req, AuditAction.UPDATE, 'settings', `Removed email signature ${kind}`);
      sendSuccess(res, emailSettings, `Email signature ${kind} removed`);
    } catch (error) {
      next(error);
    }
  }

  async updateImap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const emailSettings = await settingsService.updateImapSettings(req.context.tenantId, req.context.userId, sanitizeBody(req.body));
      await auditService.logWithContext(req, AuditAction.UPDATE, 'settings', 'Updated IMAP settings');
      sendSuccess(res, emailSettings, 'IMAP settings updated');
    } catch (error) {
      next(error);
    }
  }

  async updateTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const emailSettings = await settingsService.update(req.context.tenantId, { templates: sanitizeBody(req.body).templates });
      await auditService.logWithContext(req, AuditAction.UPDATE, 'settings', 'Updated email templates');
      sendSuccess(res, emailSettings.email, 'Email templates updated');
    } catch (error) {
      next(error);
    }
  }

  async sendTestEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.sendTestEmail(req.context.userId, sanitizeBody(req.body).toEmail);
      sendSuccess(res, result, 'Test email sent');
    } catch (error) {
      next(error);
    }
  }

  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notifications = await settingsService.getNotifications(req.context.tenantId);
      sendSuccess(res, notifications);
    } catch (error) {
      next(error);
    }
  }

  async updateNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notifications = await settingsService.updateNotifications(req.context.tenantId, sanitizeBody(req.body));
      await auditService.logWithContext(req, AuditAction.UPDATE, 'settings', 'Updated notification settings');
      sendSuccess(res, notifications, 'Notification settings updated');
    } catch (error) {
      next(error);
    }
  }

  async getSecurity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const security = await settingsService.getSecurity(req.context.tenantId);
      sendSuccess(res, security);
    } catch (error) {
      next(error);
    }
  }

  async updateSecurity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const security = await settingsService.updateSecurity(req.context.tenantId, sanitizeBody(req.body));
      await auditService.logWithContext(req, AuditAction.UPDATE, 'settings', 'Updated security settings');
      sendSuccess(res, security, 'Security settings updated');
    } catch (error) {
      next(error);
    }
  }
}

export const settingsController = new SettingsController();
