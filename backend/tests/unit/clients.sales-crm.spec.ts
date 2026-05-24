const mockClientsRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockDb = {
  employee: { findFirst: jest.fn() },
  contact: { create: jest.fn() },
};

jest.mock('../../src/modules/clients/clients.repository', () => ({
  clientsRepository: mockClientsRepository,
}));

jest.mock('../../src/config/database', () => ({
  prisma: mockDb,
}));

jest.mock('../../src/common/events/event-bus', () => ({
  eventBus: { emit: jest.fn() },
}));

jest.mock('../../src/common/services/activity-logger.service', () => ({
  activityLogger: { log: jest.fn() },
}));

jest.mock('../../src/common/services/client-lifecycle.service', () => ({
  clientLifecycleService: { progressTo: jest.fn() },
}));

jest.mock('@contracts/contact', () => ({
  CANADIAN_PHONE_VALIDATION_MESSAGE: 'Invalid phone',
  CANADIAN_POSTAL_CODE_VALIDATION_MESSAGE: 'Invalid postal code',
  EMAIL_VALIDATION_MESSAGE: 'Invalid email',
  PERSON_NAME_VALIDATION_MESSAGE: 'is invalid',
  isValidCanadianPhoneNumber: (value?: string) => !value || /^\+?1?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(value),
  isValidCanadianPostalCode: (value?: string) => !value || /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(value),
  isValidEmailAddress: (value?: string) => Boolean(value && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)),
  isValidPersonName: (value?: string) => !value || /^[A-Za-z .'-]+$/.test(value),
}), { virtual: true });

import { clientsService } from '../../src/modules/clients/clients.service';
import { createClientSchema, updateClientSchema } from '../../src/modules/clients/clients.validators';
import { stripLegacyClientFields, toClientResponseDto } from '../../src/modules/clients/clients.dto';

function clientRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'client-1',
    tenantId: 'tenant-1',
    clientLogo: null,
    clientName: 'Acme Software',
    companyName: 'Acme Software',
    clientType: 'BUSINESS',
    primaryEmail: 'buyer@acme.test',
    primaryPhone: '+1 (416) 555-1234',
    status: 'PROSPECT',
    lifecycleStage: 'PROSPECT',
    assignedOwner: null,
    website: 'acme.test',
    noOfEmployees: '11-50',
    annualRevenue: 100000,
    exchangeRate: 1,
    industry: 'Technology',
    territory: 'Canada',
    organizationAddress: '123 King St W',
    gstHstNumber: null,
    pstQstNumber: null,
    businessStructure: null,
    corpRegistrationNumber: null,
    streetAddress: '123 King St W',
    suite: null,
    city: 'Toronto',
    province: 'Ontario',
    postalCode: 'M5V 2T6',
    country: 'Canada',
    internalNotes: 'Important account',
    contactName: 'Ava Chen',
    position: 'VP Sales',
    directPhone: null,
    creditLimit: 0,
    paymentTerms: '30 days',
    currency: 'CAD',
    leadSource: 'Website',
    clientCategory: 'Prospect',
    tags: ['enterprise'],
    preferredContactMethod: 'Email',
    bestTimeToContact: 'Morning',
    secondaryPhone: null,
    budgetRange: '50k+',
    urgencyLevel: 'High',
    doNotContact: false,
    nextFollowUp: null,
    language: 'English',
    createdAt: new Date('2026-05-25T00:00:00.000Z'),
    updatedAt: new Date('2026-05-25T00:00:00.000Z'),
    _count: { contacts: 1, projects: 1, invoices: 1, quotes: 1, files: 1 },
    ...overrides,
  } as any;
}

describe('Sales CRM organization hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.employee.findFirst.mockResolvedValue({ id: 'employee-1' });
    mockDb.contact.create.mockResolvedValue({ id: 'contact-1' });
    mockClientsRepository.create.mockResolvedValue(clientRecord());
    mockClientsRepository.findById.mockResolvedValue(clientRecord());
    mockClientsRepository.update.mockResolvedValue(clientRecord({ lifecycleStage: 'ACTIVE' }));
  });

  it('strips legacy property, roofing, and claim fields from organization payloads', () => {
    const cleaned = stripLegacyClientFields({
      clientName: 'Acme Software',
      primaryEmail: 'buyer@acme.test',
      primaryPhone: '+1 (416) 555-1234',
      industry: 'Technology',
      propertyType: 'Commercial',
      serviceType: 'Roof Replacement',
      currentRoofMaterial: 'Shingles',
      roofAge: '20+',
      insuranceCompanyName: 'Legacy Insurer',
      isInsuranceClaim: 'Yes',
      isHomeowner: 'Yes',
      roofPitch: '6/12',
    });

    expect(cleaned).toMatchObject({
      clientName: 'Acme Software',
      primaryEmail: 'buyer@acme.test',
      primaryPhone: '+1 (416) 555-1234',
      industry: 'Technology',
    });
    expect(cleaned).not.toHaveProperty('propertyType');
    expect(cleaned).not.toHaveProperty('serviceType');
    expect(cleaned).not.toHaveProperty('currentRoofMaterial');
    expect(cleaned).not.toHaveProperty('roofAge');
    expect(cleaned).not.toHaveProperty('insuranceCompanyName');
    expect(cleaned).not.toHaveProperty('isInsuranceClaim');
    expect(cleaned).not.toHaveProperty('isHomeowner');
    expect(cleaned).not.toHaveProperty('roofPitch');
  });

  it('validates required Sales CRM organization fields and strips unsupported request keys', () => {
    const parsed = createClientSchema.safeParse({
      body: {
        clientName: 'Acme Software',
        primaryEmail: 'buyer@acme.test',
        primaryPhone: '+1 (416) 555-1234',
        clientType: 'BUSINESS',
        lifecycleStage: 'PROSPECT',
        industry: 'Technology',
        propertyType: 'Commercial',
        roofAge: '20+',
      },
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.body.lifecycleStage).toBe('PROSPECT');
      expect(parsed.data.body).not.toHaveProperty('propertyType');
      expect(parsed.data.body).not.toHaveProperty('roofAge');
    }

    expect(createClientSchema.safeParse({
      body: { primaryEmail: 'buyer@acme.test', primaryPhone: '+1 (416) 555-1234' },
    }).success).toBe(false);
  });

  it('creates organizations tenant-scoped and never sends legacy fields to the repository', async () => {
    await clientsService.create('tenant-1', {
      clientName: 'Acme Software',
      primaryEmail: 'buyer@acme.test',
      primaryPhone: '+1 (416) 555-1234',
      assignedOwner: 'employee-1',
      contactName: 'Ava Chen',
      propertyType: 'Commercial',
      roofAge: '20+',
      insuranceCompanyName: 'Legacy Insurer',
    } as any, 'user-1');

    expect(mockDb.employee.findFirst).toHaveBeenCalledWith({
      where: { id: 'employee-1', tenantId: 'tenant-1', isActive: true },
      select: { id: true },
    });
    expect(mockClientsRepository.create).toHaveBeenCalledWith(
      'tenant-1',
      expect.not.objectContaining({
        propertyType: expect.anything(),
        roofAge: expect.anything(),
        insuranceCompanyName: expect.anything(),
      }),
    );
    expect(mockDb.contact.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 'tenant-1', companyId: 'client-1', contactName: 'Ava Chen' }),
    }));
  });

  it('rejects cross-tenant account managers before create/update', async () => {
    mockDb.employee.findFirst.mockResolvedValueOnce(null);

    await expect(clientsService.create('tenant-1', {
      clientName: 'Acme Software',
      primaryEmail: 'buyer@acme.test',
      primaryPhone: '+1 (416) 555-1234',
      assignedOwner: 'other-tenant-employee',
    } as any)).rejects.toThrow('Assigned owner does not belong to this tenant');
  });

  it('updates lifecycle/status without accepting legacy organization fields', async () => {
    const parsed = updateClientSchema.safeParse({
      body: { lifecycleStage: 'ACTIVE', status: 'ACTIVE', isInsuranceClaim: 'Yes' },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.body).not.toHaveProperty('isInsuranceClaim');
    }

    await clientsService.update('client-1', 'tenant-1', {
      lifecycleStage: 'ACTIVE',
      status: 'ACTIVE',
      isInsuranceClaim: 'Yes',
    } as any);

    expect(mockClientsRepository.findById).toHaveBeenCalledWith('client-1', 'tenant-1');
    expect(mockClientsRepository.update).toHaveBeenCalledWith(
      'client-1',
      'tenant-1',
      expect.not.objectContaining({ isInsuranceClaim: expect.anything() }),
    );
  });

  it('does not expose legacy fields in organization API responses', () => {
    const dto = toClientResponseDto(clientRecord({
      propertyType: 'Commercial',
      roofAge: '20+',
      insuranceCompanyName: 'Legacy Insurer',
      isInsuranceClaim: 'Yes',
    }));

    expect(dto.lifecycleStage).toBe('PROSPECT');
    expect(dto).not.toHaveProperty('propertyType');
    expect(dto).not.toHaveProperty('roofAge');
    expect(dto).not.toHaveProperty('insuranceCompanyName');
    expect(dto).not.toHaveProperty('isInsuranceClaim');
  });
});
