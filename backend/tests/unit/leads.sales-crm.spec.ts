import { stripLegacyLeadFields } from '../../src/modules/leads/leads.dto';
import { duplicateDetectionService } from '../../src/modules/leads/duplicate-detection.service';
import { prisma } from '../../src/config/database';

jest.mock('../../src/config/database', () => ({
  prisma: {
    lead: {
      findMany: jest.fn(),
    },
  },
}));

describe('Sales CRM lead hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('strips legacy roofing and insurance fields from standard lead payloads', () => {
    const cleaned = stripLegacyLeadFields({
      firstName: 'Ava',
      lastName: 'Chen',
      companyName: 'Northstar',
      location: 'Toronto',
      productInterest: 'Sales CRM',
      propertyAddress: '123 Legacy Street',
      serviceType: 'Roof Replacement',
      roofAge: '20+',
      currentRoofMaterial: 'Shingles',
      isInsuranceClaim: 'Yes',
      claimNumber: 'CLAIM-1',
      inspectionAppointmentDate: '2026-05-24T10:00:00.000Z',
    });

    expect(cleaned).toMatchObject({
      firstName: 'Ava',
      lastName: 'Chen',
      companyName: 'Northstar',
      location: 'Toronto',
      productInterest: 'Sales CRM',
    });
    expect(cleaned).not.toHaveProperty('propertyAddress');
    expect(cleaned).not.toHaveProperty('serviceType');
    expect(cleaned).not.toHaveProperty('roofAge');
    expect(cleaned).not.toHaveProperty('currentRoofMaterial');
    expect(cleaned).not.toHaveProperty('isInsuranceClaim');
    expect(cleaned).not.toHaveProperty('claimNumber');
    expect(cleaned).not.toHaveProperty('inspectionAppointmentDate');
  });

  it('duplicate detection only queries tenant-scoped phone and email matches', async () => {
    (prisma.lead.findMany as jest.Mock).mockResolvedValue([]);

    await duplicateDetectionService.findDuplicates(
      'tenant-1',
      { phone: '(416) 555-1234', email: 'buyer@example.com' },
    );

    expect(prisma.lead.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        tenantId: 'tenant-1',
        OR: expect.arrayContaining([
          { phone: { not: null } },
          { email: { equals: 'buyer@example.com', mode: 'insensitive' } },
        ]),
      }),
    }));
    expect(JSON.stringify((prisma.lead.findMany as jest.Mock).mock.calls[0][0])).not.toContain('propertyAddress');
  });
});
