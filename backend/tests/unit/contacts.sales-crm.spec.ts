const mockContactsRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  linkDeal: jest.fn(),
  delete: jest.fn(),
};

const mockDb = {
  client: { findFirst: jest.fn() },
  project: { findFirst: jest.fn() },
  employee: { findFirst: jest.fn() },
  contact: { findFirst: jest.fn() },
};

jest.mock('../../src/modules/contacts/contacts.repository', () => ({
  contactsRepository: mockContactsRepository,
}));

jest.mock('../../src/config/database', () => ({
  prisma: mockDb,
}));

jest.mock('../../src/modules/settings/settings.manager', () => ({
  settingsManager: { assertUsageWithinPlan: jest.fn() },
}));

jest.mock('../../src/common/events/event-bus', () => ({
  eventBus: { emit: jest.fn() },
}));

jest.mock('../../src/common/services/activity-logger.service', () => ({
  activityLogger: { log: jest.fn() },
}));

jest.mock('@contracts/contact', () => ({
  CANADIAN_PHONE_VALIDATION_MESSAGE: 'Invalid phone',
  EMAIL_VALIDATION_MESSAGE: 'Invalid email',
  PERSON_NAME_VALIDATION_MESSAGE: 'is invalid',
  isValidCanadianPhoneNumber: (value?: string) => !value || /^\+?1?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(value),
  isValidEmailAddress: (value?: string) => Boolean(value && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)),
  isValidPersonName: (value?: string) => !value || /^[A-Za-z .'-]+$/.test(value),
}), { virtual: true });

import { contactsService } from '../../src/modules/contacts/contacts.service';
import { createContactSchema } from '../../src/modules/contacts/contacts.validators';
import { toContactResponseDto } from '../../src/modules/contacts/contacts.dto';

function contactRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contact-1',
    tenantId: 'tenant-1',
    contactName: 'Ava Chen',
    firstName: 'Ava',
    lastName: 'Chen',
    type: 'CLIENT',
    jobTitle: 'VP Sales',
    department: 'Revenue',
    email: 'ava@acme.test',
    officePhone: '+1 (416) 555-1234',
    mobilePhone: null,
    linkedInUrl: null,
    isPrimaryContact: true,
    relationshipStatus: 'Active',
    roleInBuyingProcess: 'Decision Maker',
    seniorityLevel: 'VP',
    buyingAuthorityScore: '5',
    secondaryEmail: null,
    alternatePhone: null,
    preferredContactMethod: 'Email',
    timeZone: 'America/Toronto',
    notes: 'Primary buyer',
    tags: ['champion'],
    assignedToId: 'employee-1',
    assignedTo: {
      id: 'employee-1',
      user: { firstName: 'Sam', lastName: 'Seller', email: 'sam@example.test' },
    },
    companyId: 'client-1',
    company: { id: 'client-1', clientName: 'Acme Software' },
    deals: [
      {
        id: 'contact-deal-1',
        dealId: 'deal-1',
        role: 'Decision Maker',
        isPrimary: true,
        deal: { id: 'deal-1', name: 'Expansion Deal' },
      },
    ],
    lastContactedAt: null,
    totalInteractions: 0,
    lastActivityType: null,
    createdAt: new Date('2026-05-25T00:00:00.000Z'),
    updatedAt: new Date('2026-05-25T00:00:00.000Z'),
    ...overrides,
  } as any;
}

describe('Sales CRM contact hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.client.findFirst.mockResolvedValue({ id: 'client-1' });
    mockDb.project.findFirst.mockResolvedValue({ id: 'deal-1' });
    mockDb.employee.findFirst.mockResolvedValue({ id: 'employee-1' });
    mockDb.contact.findFirst.mockResolvedValue(null);
    mockContactsRepository.create.mockResolvedValue(contactRecord());
    mockContactsRepository.findById.mockResolvedValue(contactRecord());
    mockContactsRepository.update.mockResolvedValue(contactRecord());
  });

  it('validates required Sales CRM contact fields and strips unsupported keys', () => {
    const parsed = createContactSchema.safeParse({
      body: {
        firstName: 'Ava',
        lastName: 'Chen',
        contactName: 'Ava Chen',
        email: 'ava@acme.test',
        officePhone: '+1 (416) 555-1234',
        companyId: '11111111-1111-4111-8111-111111111111',
        roofAge: '20+',
        insuranceClaim: 'CLAIM-1',
      },
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.body.firstName).toBe('Ava');
      expect(parsed.data.body.lastName).toBe('Chen');
      expect(parsed.data.body).not.toHaveProperty('roofAge');
      expect(parsed.data.body).not.toHaveProperty('insuranceClaim');
    }

    expect(createContactSchema.safeParse({
      body: {
        firstName: 'Ava',
        email: 'ava@acme.test',
        officePhone: '+1 (416) 555-1234',
        companyId: '11111111-1111-4111-8111-111111111111',
      },
    }).success).toBe(false);
  });

  it('creates contacts tenant-scoped and validates organization, deal, and owner links', async () => {
    await contactsService.create('tenant-1', {
      firstName: 'Ava',
      lastName: 'Chen',
      email: 'AVA@ACME.TEST',
      officePhone: '+1 (416) 555-1234',
      companyId: 'client-1',
      dealId: 'deal-1',
      assignedToId: 'employee-1',
      roleInBuyingProcess: 'Decision Maker',
    } as any);

    expect(mockDb.client.findFirst).toHaveBeenCalledWith({
      where: { id: 'client-1', tenantId: 'tenant-1' },
      select: { id: true },
    });
    expect(mockDb.project.findFirst).toHaveBeenCalledWith({
      where: { id: 'deal-1', tenantId: 'tenant-1', deletedAt: null },
      select: { id: true },
    });
    expect(mockDb.employee.findFirst).toHaveBeenCalledWith({
      where: { id: 'employee-1', tenantId: 'tenant-1', isActive: true },
      select: { id: true },
    });
    expect(mockContactsRepository.create).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
      contactName: 'Ava Chen',
      email: 'ava@acme.test',
      companyId: 'client-1',
      dealId: 'deal-1',
      assignedToId: 'employee-1',
    }));
  });

  it('rejects cross-tenant organization, deal, and owner links', async () => {
    mockDb.client.findFirst.mockResolvedValueOnce(null);
    await expect(contactsService.create('tenant-1', {
      firstName: 'Ava',
      lastName: 'Chen',
      email: 'ava@acme.test',
      officePhone: '+1 (416) 555-1234',
      companyId: 'other-client',
    } as any)).rejects.toThrow('Linked organization does not belong to this tenant');

    mockDb.client.findFirst.mockResolvedValue({ id: 'client-1' });
    mockDb.project.findFirst.mockResolvedValueOnce(null);
    await expect(contactsService.create('tenant-1', {
      firstName: 'Ava',
      lastName: 'Chen',
      email: 'ava2@acme.test',
      officePhone: '+1 (416) 555-1234',
      companyId: 'client-1',
      dealId: 'other-deal',
    } as any)).rejects.toThrow('Linked deal does not belong to this tenant');

    mockDb.project.findFirst.mockResolvedValue({ id: 'deal-1' });
    mockDb.employee.findFirst.mockResolvedValueOnce(null);
    await expect(contactsService.create('tenant-1', {
      firstName: 'Ava',
      lastName: 'Chen',
      email: 'ava3@acme.test',
      officePhone: '+1 (416) 555-1234',
      companyId: 'client-1',
      assignedToId: 'other-employee',
    } as any)).rejects.toThrow('Assigned owner does not belong to this tenant');
  });

  it('prevents duplicate contact emails within a tenant', async () => {
    mockDb.contact.findFirst.mockResolvedValueOnce({ id: 'existing-contact' });

    await expect(contactsService.create('tenant-1', {
      firstName: 'Ava',
      lastName: 'Chen',
      email: 'ava@acme.test',
      officePhone: '+1 (416) 555-1234',
      companyId: 'client-1',
    } as any)).rejects.toThrow('A contact with this email already exists for this tenant');

    expect(mockDb.contact.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        tenantId: 'tenant-1',
        email: { equals: 'ava@acme.test', mode: 'insensitive' },
      }),
    }));
  });

  it('updates contact relationships only after tenant validation', async () => {
    await contactsService.update('contact-1', 'tenant-1', {
      dealId: 'deal-1',
      assignedToId: 'employee-1',
      email: 'updated@acme.test',
    } as any);

    expect(mockDb.project.findFirst).toHaveBeenCalledWith({
      where: { id: 'deal-1', tenantId: 'tenant-1', deletedAt: null },
      select: { id: true },
    });
    expect(mockDb.contact.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        tenantId: 'tenant-1',
        id: { not: 'contact-1' },
      }),
    }));
    expect(mockContactsRepository.linkDeal).toHaveBeenCalledWith('tenant-1', 'contact-1', 'deal-1', undefined);
  });

  it('returns relationship visibility for organization, owner, and deals', () => {
    const dto = toContactResponseDto(contactRecord());

    expect(dto.company).toEqual({ id: 'client-1', clientName: 'Acme Software' });
    expect(dto.assignedTo?.id).toBe('employee-1');
    expect(dto.deals).toEqual([
      expect.objectContaining({ dealId: 'deal-1', dealName: 'Expansion Deal', role: 'Decision Maker' }),
    ]);
  });
});
