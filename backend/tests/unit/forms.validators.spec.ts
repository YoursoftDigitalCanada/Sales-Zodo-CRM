import { createFormSchema, publicSubmissionSchema } from '../../src/modules/forms/forms.validators';

describe('forms.validators', () => {
  it('accepts a Sales CRM form with mapped lead fields', () => {
    const result = createFormSchema.parse({
      body: {
        name: 'Website Contact Form',
        thankYouMessage: 'Thanks. Our team will follow up shortly.',
        duplicateHandling: 'FLAG_DUPLICATE',
        notificationEmails: ['sales@example.com'],
        fields: [
          {
            id: 'full_name',
            type: 'text',
            label: 'Full Name',
            internalName: 'full_name',
            required: true,
            crmMapping: 'fullName',
            width: 'FULL',
            order: 0,
          },
          {
            id: 'email',
            type: 'email',
            label: 'Email',
            internalName: 'email',
            required: true,
            crmMapping: 'email',
            width: 'HALF',
            order: 1,
          },
          {
            id: 'source_interest',
            type: 'dropdown',
            label: 'Interest',
            internalName: 'source_interest',
            options: [
              { label: 'Demo', value: 'demo' },
              { label: 'Pricing', value: 'pricing' },
            ],
            order: 2,
          },
        ],
      },
    });

    expect(result.body.fields?.[0]).toMatchObject({
      type: 'text',
      crmMapping: 'fullName',
    });
  });

  it('rejects non-Sales CRM field types', () => {
    expect(() => createFormSchema.parse({
      body: {
        name: 'Bad Form',
        fields: [
          {
            id: 'industry_specific',
            type: 'inspection',
            label: 'Inspection',
            internalName: 'inspection',
          },
        ],
      },
    })).toThrow();
  });

  it('accepts public submissions with tracking and honeypot fields', () => {
    const result = publicSubmissionSchema.parse({
      body: {
        data: {
          full_name: 'Jane Customer',
          email: 'jane@example.com',
        },
        tracking: {
          utm_source: 'google',
          landingPageUrl: 'https://example.com/contact',
        },
        honeypot: '',
      },
    });

    expect(result.body.data).toMatchObject({
      full_name: 'Jane Customer',
      email: 'jane@example.com',
    });
    expect(result.body.tracking).toMatchObject({
      utm_source: 'google',
    });
  });
});
