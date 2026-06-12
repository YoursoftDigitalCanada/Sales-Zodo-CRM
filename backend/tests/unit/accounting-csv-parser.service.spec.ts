import { csvParserService } from '../../src/modules/accounting-engine/api/csv-parser.service';

describe('CsvParserService', () => {
  it('parses BOM-prefixed Canadian credit-card exports', () => {
    const csv = [
      '\uFEFFAccount Type,Account Number,Transaction Date,Cheque Number,Description 1,Description 2,CAD$,USD$',
      'MasterCard,5526125501392533,1/3/2025,,UBER CANADA/UBERTRIP TORONTO,,-16.74,',
      'MasterCard,5526125501392533,1/4/2025,,CUSTOMER REFUND,,25.00,',
    ].join('\n');

    const parsed = csvParserService.parse(csv, 'download-transactions.csv');

    expect(parsed.headers[0]).toBe('Account Type');
    expect(parsed.provider).toBe('CREDIT_CARD');
    expect(parsed.normalized).toEqual([
      expect.objectContaining({
        date: '2025-01-03',
        amount: 16.74,
        type: 'DEBIT',
        accountType: 'MasterCard',
        accountNumber: '2533',
      }),
      expect.objectContaining({
        date: '2025-01-04',
        amount: 25,
        type: 'CREDIT',
      }),
    ]);
  });
});
