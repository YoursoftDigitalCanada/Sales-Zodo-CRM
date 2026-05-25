const mockMailboxRepository = {
  getRuntimeConfig: jest.fn(),
  findConfiguredSmtpForTenant: jest.fn(),
  findConfiguredSmtpForTenantByRoleNames: jest.fn(),
};

const mockSettingsRepository = {
  getSmtpConfig: jest.fn(),
};

const mockMailerService = {
  sendMailWithConfigDetailed: jest.fn(),
  sendGlobalMailDetailed: jest.fn(),
};

const mockActivityLogger = {
  log: jest.fn(),
};

jest.mock('../../src/modules/emails/mailbox.repository', () => ({
  mailboxRepository: mockMailboxRepository,
}));

jest.mock('../../src/modules/settings/settings.repository', () => ({
  settingsRepository: mockSettingsRepository,
}));

jest.mock('../../src/common/services/mailer.service', () => ({
  mailerService: mockMailerService,
}));

jest.mock('../../src/common/services/activity-logger.service', () => ({
  activityLogger: mockActivityLogger,
}));

jest.mock('../../src/common/services/request-context.store', () => ({
  requestContextStore: { get: jest.fn(() => null) },
}));

import { tenantMailerService } from '../../src/common/services/tenant-mailer.service';

describe('TenantMailerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMailboxRepository.getRuntimeConfig.mockResolvedValue(null);
    mockMailboxRepository.findConfiguredSmtpForTenant.mockResolvedValue(null);
    mockMailboxRepository.findConfiguredSmtpForTenantByRoleNames.mockResolvedValue(null);
    mockSettingsRepository.getSmtpConfig.mockResolvedValue({
      host: 'smtp.example.com',
      port: 587,
      user: 'sales@example.com',
      pass: 'secret',
      encryption: 'STARTTLS',
      senderName: 'Acme Sales',
      senderEmail: 'sales@example.com',
    });
    mockMailerService.sendMailWithConfigDetailed.mockResolvedValue({ sent: true, messageId: 'msg-1' });
  });

  it('uses tenant SMTP settings, sender branding, reply-to, and logs successful delivery', async () => {
    const result = await tenantMailerService.sendTenantEmail({
      tenantId: 'tenant-1',
      preferredUserId: 'user-1',
      to: 'buyer@example.com',
      subject: 'Proposal PR-1 from your sales team',
      html: '<p>Your proposal is ready.</p>',
      text: 'Your proposal is ready.',
      replyTo: 'owner@example.com',
      relatedEntityType: 'Proposal',
      relatedEntityId: 'proposal-1',
    });

    expect(result).toEqual(expect.objectContaining({
      sent: true,
      messageId: 'msg-1',
      senderName: 'Acme Sales',
      senderEmail: 'sales@example.com',
    }));
    expect(mockMailerService.sendMailWithConfigDetailed).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.com',
        user: 'sales@example.com',
        senderName: 'Acme Sales',
        senderEmail: 'sales@example.com',
      }),
      expect.objectContaining({
        to: 'buyer@example.com',
        subject: 'Proposal PR-1 from your sales team',
        replyTo: 'owner@example.com',
      }),
    );
    expect(mockActivityLogger.log).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      entityType: 'Proposal',
      entityId: 'proposal-1',
      action: 'CREATE',
      module: 'emails',
      description: 'Tenant email sent: Proposal PR-1 from your sales team',
      metadata: expect.objectContaining({
        sent: true,
        messageId: 'msg-1',
        senderEmail: 'sales@example.com',
      }),
    }));
  });

  it('logs failed tenant mail delivery and does not fake success', async () => {
    mockMailerService.sendMailWithConfigDetailed.mockResolvedValueOnce({ sent: false, error: 'smtp rejected' });

    const result = await tenantMailerService.sendTenantEmail({
      tenantId: 'tenant-1',
      to: 'buyer@example.com',
      subject: 'Invoice due today',
      html: '<p>Invoice due today.</p>',
      relatedEntityType: 'Invoice',
      relatedEntityId: 'invoice-1',
    });

    expect(result.sent).toBe(false);
    expect(result.error).toBe('smtp rejected');
    expect(mockActivityLogger.log).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      entityType: 'Invoice',
      entityId: 'invoice-1',
      action: 'UPDATE',
      description: 'Tenant email failed: Invoice due today',
      metadata: expect.objectContaining({ sent: false, error: 'smtp rejected' }),
    }));
  });

  it('falls back personal mailbox sender name to tenant branding', async () => {
    mockSettingsRepository.getSmtpConfig.mockResolvedValue({
      host: 'smtp.example.com',
      port: 587,
      user: 'workspace@example.com',
      pass: 'secret',
      encryption: 'STARTTLS',
      senderName: 'Workspace Brand',
      senderEmail: 'workspace@example.com',
    });
    mockMailboxRepository.getRuntimeConfig.mockResolvedValue({
      tenantId: 'tenant-1',
      smtp: {
        host: 'smtp.person.com',
        port: 587,
        user: 'rep@example.com',
        pass: 'secret',
        encryption: 'STARTTLS',
        senderName: '',
        senderEmail: 'rep@example.com',
      },
    });

    await tenantMailerService.sendTenantEmail({
      tenantId: 'tenant-1',
      preferredUserId: 'user-1',
      to: 'buyer@example.com',
      subject: 'Contract ready for review',
      html: '<p>Contract ready.</p>',
    });

    expect(mockMailerService.sendMailWithConfigDetailed).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.person.com',
        senderName: 'Workspace Brand',
        senderEmail: 'rep@example.com',
      }),
      expect.any(Object),
    );
  });

  it('rejects customer email delivery when the tenant has no configured SMTP sender', async () => {
    mockSettingsRepository.getSmtpConfig.mockResolvedValue({
      host: '',
      port: 587,
      user: '',
      pass: '',
      encryption: 'STARTTLS',
      senderName: '',
      senderEmail: '',
    });
    mockMailboxRepository.getRuntimeConfig.mockResolvedValue(null);
    mockMailboxRepository.findConfiguredSmtpForTenant.mockResolvedValue(null);

    await expect(tenantMailerService.sendTenantEmail({
      tenantId: 'tenant-1',
      to: 'buyer@example.com',
      subject: 'Invoice due today',
      html: '<p>Invoice due today.</p>',
    })).rejects.toThrow('Business email delivery requires a configured mailbox');

    expect(mockMailerService.sendMailWithConfigDetailed).not.toHaveBeenCalled();
    expect(mockActivityLogger.log).not.toHaveBeenCalled();
  });

  it('uses generic Sales CRM-safe proposal copy in the tested template payload', async () => {
    await tenantMailerService.sendTenantEmail({
      tenantId: 'tenant-1',
      to: 'buyer@example.com',
      subject: 'Proposal PR-1 from your sales team',
      html: '<p>Your proposal <strong>PR-1</strong> is ready.</p>',
      text: 'Your proposal PR-1 is ready.',
    });

    const [, payload] = mockMailerService.sendMailWithConfigDetailed.mock.calls[0];
    expect(`${payload.subject} ${payload.html} ${payload.text}`).not.toMatch(/roof|roofing|shingles|underlayment|flashing|decking|inspection|insurance claim/i);
  });
});
