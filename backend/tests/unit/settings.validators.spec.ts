import {
  sendTestEmailSchema,
  updateEmailTemplatesSchema,
  updateSecuritySettingsSchema,
  updateSmtpSettingsSchema,
} from '../../src/modules/settings/settings.validators';

describe('settings.validators', () => {
  it('accepts valid SMTP payloads', () => {
    const parsed = updateSmtpSettingsSchema.safeParse({
      body: {
        host: 'smtp.example.com',
        port: 587,
        username: 'mailer@example.com',
        password: 'super-secret',
        encryption: 'STARTTLS',
        senderName: 'Acme CRM',
        senderEmail: 'mailer@example.com',
      },
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects weak password policy values', () => {
    const parsed = updateSecuritySettingsSchema.safeParse({
      body: {
        passwordMinLength: 6,
      },
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects invalid email template identifiers', () => {
    const parsed = updateEmailTemplatesSchema.safeParse({
      body: {
        templates: [
          {
            id: 'PASSWORD_RESET',
            subject: 'Hello',
          },
        ],
      },
    });

    expect(parsed.success).toBe(false);
  });

  it('requires a valid email address for SMTP test messages', () => {
    const parsed = sendTestEmailSchema.safeParse({
      body: {
        toEmail: 'not-an-email',
      },
    });

    expect(parsed.success).toBe(false);
  });
});
