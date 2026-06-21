import { filterStatementRows, summarizeStatementRows } from '../../src/modules/accounting-engine/api/statement-export.service';

const rows = [
  { status: 'CATEGORIZED', duplicateScore: 0, normalizedData: { date: '2026-01-15', description: 'Customer payment', merchant: 'Acme', amount: 1200, type: 'CREDIT' }, aiTransactionType: 'INCOME', aiCategory: 'Sales' },
  { status: 'NEEDS_REVIEW', duplicateScore: 0, normalizedData: { date: '2026-02-10', description: 'Cloud subscription', merchant: 'Software Co', amount: 75, type: 'DEBIT' }, aiTransactionType: 'EXPENSE', aiCategory: 'Software' },
  { status: 'SKIPPED', duplicateScore: 0, normalizedData: { date: '2026-02-12', description: 'Skipped charge', amount: 20, type: 'DEBIT' }, aiTransactionType: 'EXPENSE' },
];

describe('statement exports', () => {
  it('applies the same date, type, and search filters as the statement tabs', () => {
    expect(filterStatementRows(rows, { format: 'csv', mode: 'BANK', month: '02', type: 'EXPENSE', search: 'software' })).toEqual([rows[1]]);
  });

  it('excludes skipped and duplicate rows from statement totals', () => {
    expect(summarizeStatementRows(rows)).toEqual({ rows: 2, charges: 75, credits: 1200, net: -1125, largestCharge: 75 });
  });
});
