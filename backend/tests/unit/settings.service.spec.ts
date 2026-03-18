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
  },
}));

import { mailerService } from '../../src/common/services/mailer.service';
import { settingsRepository } from '../../src/modules/settings/settings.repository';
import { settingsService } from '../../src/modules/settings/settings.service';

const mockedSettingsRepository = settingsRepository as jest.Mocked<typeof settingsRepository>;
const mockedMailerService = mailerService as jest.Mocked<typeof mailerService>;

describe('SettingsService', () => {
  beforeEach(() => {
    mockedSettingsRepository.getSmtpConfig.mockReset();
    mockedMailerService.sendMailWithConfig.mockReset();
  });

  it('refuses to send a test email before SMTP is configured', async () => {
    mockedSettingsRepository.getSmtpConfig.mockResolvedValue({
      host: '',
      port: 587,
      user: '',
      pass: '',
      encryption: 'STARTTLS',
      senderName: '',
      senderEmail: '',
      signature: '',
    });

    await expect(settingsService.sendTestEmail('tenant-1', 'demo@example.com')).rejects.toMatchObject({
      statusCode: 400,
      message: 'SMTP must be configured before sending a test email',
    });
    expect(mockedMailerService.sendMailWithConfig).not.toHaveBeenCalled();
  });

  it('sends a test email with the stored SMTP configuration', async () => {
    mockedSettingsRepository.getSmtpConfig.mockResolvedValue({
      host: 'smtp.example.com',
      port: 587,
      user: 'mailer@example.com',
      pass: 'super-secret',
      encryption: 'STARTTLS',
      senderName: 'Acme CRM',
      senderEmail: '',
      signature: 'Thanks',
    });
    mockedMailerService.sendMailWithConfig.mockResolvedValue(true);

    await expect(settingsService.sendTestEmail('tenant-1', 'demo@example.com')).resolves.toEqual({
      delivered: true,
      recipient: 'demo@example.com',
    });
    expect(mockedMailerService.sendMailWithConfig).toHaveBeenCalledWith(
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
    mockedSettingsRepository.getSmtpConfig.mockResolvedValue({
      host: 'smtp.example.com',
      port: 465,
      user: 'mailer@example.com',
      pass: 'super-secret',
      encryption: 'SSL/TLS',
      senderName: 'Acme CRM',
      senderEmail: 'mailer@example.com',
      signature: '',
    });
    mockedMailerService.sendMailWithConfig.mockResolvedValue(false);

    await expect(settingsService.sendTestEmail('tenant-1', 'demo@example.com')).rejects.toMatchObject({
      statusCode: 400,
      message: 'Unable to send test email with the configured SMTP server',
    });
  });
});
