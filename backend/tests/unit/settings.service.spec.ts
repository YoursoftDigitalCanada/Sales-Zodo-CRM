jest.mock('../../src/modules/settings/settings.repository', () => ({
  settingsRepository: {
    ensure: jest.fn(),
    update: jest.fn(),
    updateCompanyLogo: jest.fn(),
    getSmtpConfig: jest.fn(),
  },
}));

jest.mock('../../src/common/services/mailer.service', () => ({
  mailerService: {
    sendMailWithConfig: jest.fn(),
    sendMailWithConfigDetailed: jest.fn(),
  },
}));

jest.mock('../../src/modules/emails/mailbox.repository', () => ({
  mailboxRepository: {
    getRuntimeConfig: jest.fn(),
  },
}));

import { mailboxRepository } from '../../src/modules/emails/mailbox.repository';
import { mailerService } from '../../src/common/services/mailer.service';
import { settingsRepository } from '../../src/modules/settings/settings.repository';
import { settingsService } from '../../src/modules/settings/settings.service';

const mockedSettingsRepository = settingsRepository as jest.Mocked<typeof settingsRepository>;
const mockedMailerService = mailerService as jest.Mocked<typeof mailerService>;
const mockedMailboxRepository = mailboxRepository as jest.Mocked<typeof mailboxRepository>;

describe('SettingsService', () => {
  beforeEach(() => {
    mockedSettingsRepository.getSmtpConfig.mockReset();
    mockedMailerService.sendMailWithConfig.mockReset();
    mockedMailerService.sendMailWithConfigDetailed.mockReset();
    mockedMailboxRepository.getRuntimeConfig.mockReset();
  });

  it('refuses to send a test email before SMTP is configured', async () => {
    mockedMailboxRepository.getRuntimeConfig.mockResolvedValue({
      tenantId: 'tenant-1',
      userId: 'user-1',
      mailboxAddress: null,
      smtp: {
        host: '',
        port: 587,
        user: '',
        pass: '',
        encryption: 'STARTTLS',
        senderName: '',
        senderEmail: '',
      },
      imap: {
        host: '',
        port: 993,
        user: '',
        pass: '',
        encryption: 'SSL/TLS',
      },
    });

    await expect(settingsService.sendTestEmail('user-1', 'demo@example.com')).rejects.toMatchObject({
      statusCode: 400,
      message: 'Configure your personal SMTP mailbox before sending a test email',
    });
    expect(mockedMailerService.sendMailWithConfigDetailed).not.toHaveBeenCalled();
  });

  it('sends a test email with the stored SMTP configuration', async () => {
    mockedMailboxRepository.getRuntimeConfig.mockResolvedValue({
      tenantId: 'tenant-1',
      userId: 'user-1',
      mailboxAddress: 'mailer@example.com',
      smtp: {
        host: 'smtp.example.com',
        port: 587,
        user: 'mailer@example.com',
        pass: 'super-secret',
        encryption: 'STARTTLS',
        senderName: 'Acme CRM',
        senderEmail: '',
      },
      imap: {
        host: 'imap.example.com',
        port: 993,
        user: 'mailer@example.com',
        pass: 'super-secret',
        encryption: 'SSL/TLS',
      },
    });
    mockedMailerService.sendMailWithConfigDetailed.mockResolvedValue({ sent: true });

    await expect(settingsService.sendTestEmail('user-1', 'demo@example.com')).resolves.toEqual({
      delivered: true,
      recipient: 'demo@example.com',
    });
    expect(mockedMailerService.sendMailWithConfigDetailed).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.com',
        user: 'mailer@example.com',
        senderEmail: 'mailer@example.com',
      }),
      expect.objectContaining({
        to: 'demo@example.com',
        subject: expect.stringContaining('test email'),
      })
    );
  });

  it('surfaces SMTP delivery failures clearly', async () => {
    mockedMailboxRepository.getRuntimeConfig.mockResolvedValue({
      tenantId: 'tenant-1',
      userId: 'user-1',
      mailboxAddress: 'mailer@example.com',
      smtp: {
        host: 'smtp.example.com',
        port: 465,
        user: 'mailer@example.com',
        pass: 'super-secret',
        encryption: 'SSL/TLS',
        senderName: 'Acme CRM',
        senderEmail: 'mailer@example.com',
      },
      imap: {
        host: 'imap.example.com',
        port: 993,
        user: 'mailer@example.com',
        pass: 'super-secret',
        encryption: 'SSL/TLS',
      },
    });
    mockedMailerService.sendMailWithConfigDetailed.mockResolvedValue({
      sent: false,
      error: 'Invalid credentials',
    });

    await expect(settingsService.sendTestEmail('user-1', 'demo@example.com')).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('Unable to send test email with your personal SMTP mailbox'),
    });
  });
});
