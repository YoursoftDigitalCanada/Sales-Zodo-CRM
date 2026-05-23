import {
  buildGenericProposalScope,
  buildGenericProposalTerms,
  generateProposalPdfBuffer,
  resolveProposalScopeText,
} from '../../src/modules/proposals/proposal-pdf';

const forbiddenSalesDefaults = [
  'roof',
  'roofing',
  'shingles',
  'underlayment',
  'flashing',
  'decking',
  'inspection',
  'insurance claim',
];

function expectNoForbiddenTerms(text: string) {
  const lower = text.toLowerCase();
  for (const term of forbiddenSalesDefaults) {
    expect(lower).not.toContain(term);
  }
}

function baseProposalData(overrides: Record<string, any> = {}) {
  return {
    companyName: 'Acme Software',
    proposalNumber: 'PR-2026-0001',
    createdAt: '2026-05-24T00:00:00.000Z',
    leadName: 'Example Customer',
    propertyAddress: '',
    quoteNumber: 'QT-2026-0001',
    currency: 'CAD',
    items: [
      { description: 'CRM implementation package', quantity: 1, unitPrice: 2500, total: 2500 },
    ],
    subtotal: 2500,
    taxAmount: 0,
    discountAmount: 0,
    total: 2500,
    ...overrides,
  };
}

describe('proposal PDF Sales CRM defaults', () => {
  it('generic default proposal scope and terms contain no roofing terms', () => {
    expectNoForbiddenTerms(buildGenericProposalScope('Example Customer'));
    expectNoForbiddenTerms(buildGenericProposalTerms());
  });

  it('missing scope uses generic Sales CRM-safe text', () => {
    const scope = resolveProposalScopeText({ leadName: 'Example Customer' });

    expect(scope).toContain('scope of services');
    expect(scope).toContain('implementation support');
    expectNoForbiddenTerms(scope);
  });

  it('custom scope is preserved exactly, including tenant-entered wording', () => {
    const customScope = 'Install specialized roofing workflow exactly as requested by this tenant.';

    expect(resolveProposalScopeText({ leadName: 'Example Customer', scopeOfWork: customScope })).toBe(customScope);
  });

  it('generated proposal PDF default content contains no roofing terms', () => {
    const { buffer, fileName } = generateProposalPdfBuffer(baseProposalData());
    const pdfText = buffer.toString('latin1');

    expect(fileName).toBe('Proposal_PR-2026-0001.pdf');
    expect(pdfText).toContain('SALES PROPOSAL');
    expect(pdfText).toContain('scope of services');
    expectNoForbiddenTerms(pdfText);
  });
});
