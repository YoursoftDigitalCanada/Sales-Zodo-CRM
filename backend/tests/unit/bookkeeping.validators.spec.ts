import { createVendorSchema } from '../../src/modules/bookkeeping/bookkeeping.validators';

describe('bookkeeping.validators', () => {
  it('accepts normal Sales CRM vendor details', () => {
    const result = createVendorSchema.parse({
      body: {
        name: 'Test',
        email: 'saintlucifer00210@gmail.com',
        phone: '+1 203 940 3049',
        website: 'www.zodo.ca',
        taxId: '123456778nk',
      },
    });

    expect(result.body).toMatchObject({
      name: 'Test',
      email: 'saintlucifer00210@gmail.com',
      phone: '+1 203 940 3049',
      website: 'www.zodo.ca',
      taxId: '123456778nk',
    });
  });

  it('turns blank optional vendor fields into null', () => {
    const result = createVendorSchema.parse({
      body: {
        name: 'Blank Optional Fields',
        email: '',
        phone: '   ',
        website: '',
        taxId: '',
      },
    });

    expect(result.body).toMatchObject({
      email: null,
      phone: null,
      website: null,
      taxId: null,
    });
  });
});
