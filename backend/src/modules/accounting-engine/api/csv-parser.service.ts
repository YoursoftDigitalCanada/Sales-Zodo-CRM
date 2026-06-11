import { createHash } from 'crypto';

export type ProviderType = 'BANK' | 'CREDIT_CARD' | 'STRIPE' | 'PAYPAL' | 'MANUAL' | 'UNKNOWN';

export interface NormalizedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  currency: string;
  reference?: string;
  balance?: number;
  merchant?: string;
  accountType?: string;
  accountNumber?: string;
  originalRow: Record<string, any>;
}

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, any>[];
  provider: ProviderType;
  normalized: NormalizedTransaction[];
}

const COLUMN_ALIASES: Record<string, string[]> = {
  date: ['Transaction Date', 'Date', 'date', 'transaction_date', 'Trans Date', 'Posted Date', 'Posting Date', 'created', 'Txn Date'],
  description: ['Description 1', 'Description', 'description', 'Merchant', 'merchant', 'Name', 'Payee', 'Item Title', 'Subject', 'Memo'],
  description2: ['Description 2', 'description_2', 'Additional Info', 'Notes'],
  amountCad: ['CAD$', 'CAD', 'cad', 'Amount', 'amount', 'Transaction Amount', 'Debit Amount', 'Amount (CAD)'],
  amountUsd: ['USD$', 'USD', 'usd', 'Amount (USD)'],
  debit: ['Debit', 'debit', 'Withdrawals', 'Money Out'],
  credit: ['Credit', 'credit', 'Deposits', 'Money In'],
  reference: ['Reference', 'reference', 'Cheque Number', 'cheque_number', 'Check Number', 'Transaction ID', 'id', 'Ref'],
  balance: ['Balance', 'balance', 'Running Balance', 'Closing Balance'],
  accountType: ['Account Type', 'account_type', 'Card Type'],
  accountNumber: ['Account Number', 'account_number', 'Card Number', 'Last 4 Digits'],
  currency: ['Currency', 'currency', 'Currency Code'],
  gross: ['Gross', 'gross'],
};

class CsvParserService {
  parse(content: string, fileName: string): ParsedCSV {
    const rows = this.parseCSVContent(content);
    if (!rows.length) return { headers: [], rows: [], provider: 'UNKNOWN', normalized: [] };
    const headers = Object.keys(rows[0]);
    const provider = this.detectProvider(headers, rows, fileName);
    const normalized = rows.map(row => this.normalizeRow(row, headers, provider)).filter(Boolean) as NormalizedTransaction[];
    return { headers, rows, provider, normalized };
  }

  private parseCSVContent(content: string): Record<string, any>[] {
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const delimiter = this.detectDelimiter(lines[0]);
    const headers = this.parseCSVLine(lines[0], delimiter);
    return lines.slice(1).map(line => {
      const values = this.parseCSVLine(line, delimiter);
      const row: Record<string, any> = {};
      headers.forEach((h, i) => { row[h] = values[i] || ''; });
      return row;
    }).filter(row => Object.values(row).some(v => v !== ''));
  }

  private parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  private detectDelimiter(firstLine: string): string {
    const commas = (firstLine.match(/,/g) || []).length;
    const tabs = (firstLine.match(/\t/g) || []).length;
    const semicolons = (firstLine.match(/;/g) || []).length;
    if (tabs > commas && tabs > semicolons) return '\t';
    if (semicolons > commas) return ';';
    return ',';
  }

  detectProvider(headers: string[], rows: Record<string, any>[], fileName: string): ProviderType {
    const headerStr = headers.join(' ').toLowerCase();
    const fileNameLower = fileName.toLowerCase();

    if (fileNameLower.includes('stripe') || headerStr.includes('stripe') || headerStr.includes('payout')) return 'STRIPE';
    if (fileNameLower.includes('paypal') || headerStr.includes('paypal') || headers.includes('Gross')) return 'PAYPAL';

    if (headerStr.includes('credit limit') || headerStr.includes('card number') ||
        headers.some(h => /credit|mastercard|visa|amex/i.test(h))) return 'CREDIT_CARD';

    const accountTypeCol = this.findColumn(headers, 'accountType');
    if (accountTypeCol) {
      const types = rows.slice(0, 10).map(r => (r[accountTypeCol] || '').toLowerCase());
      if (types.some(t => /credit|mastercard|visa|amex/i.test(t))) return 'CREDIT_CARD';
    }

    if (headerStr.includes('account') || headerStr.includes('balance') || headerStr.includes('cheque')) return 'BANK';
    return 'UNKNOWN';
  }

  private findColumn(headers: string[], field: string): string | null {
    const aliases = COLUMN_ALIASES[field] || [];
    for (const alias of aliases) {
      const found = headers.find(h => h === alias || h.toLowerCase() === alias.toLowerCase());
      if (found) return found;
    }
    return null;
  }

  private normalizeRow(row: Record<string, any>, headers: string[], provider: ProviderType): NormalizedTransaction | null {
    const dateCol = this.findColumn(headers, 'date');
    const descCol = this.findColumn(headers, 'description');
    const desc2Col = this.findColumn(headers, 'description2');
    const amountCol = this.findColumn(headers, 'amountCad') || this.findColumn(headers, 'gross');
    const debitCol = this.findColumn(headers, 'debit');
    const creditCol = this.findColumn(headers, 'credit');
    const refCol = this.findColumn(headers, 'reference');
    const balanceCol = this.findColumn(headers, 'balance');
    const accTypeCol = this.findColumn(headers, 'accountType');
    const accNumCol = this.findColumn(headers, 'accountNumber');
    const currencyCol = this.findColumn(headers, 'currency');

    const rawDate = dateCol ? row[dateCol] : null;
    if (!rawDate) return null;
    const parsedDate = this.parseDate(rawDate);
    if (!parsedDate) return null;

    let description = descCol ? (row[descCol] || '').trim() : '';
    if (desc2Col && row[desc2Col]) description += ' ' + (row[desc2Col] || '').trim();
    description = description.trim();
    if (!description) return null;

    let amount: number;
    let type: 'DEBIT' | 'CREDIT';

    if (debitCol && creditCol) {
      const debitVal = this.parseMoney(row[debitCol]);
      const creditVal = this.parseMoney(row[creditCol]);
      if (debitVal > 0) { amount = debitVal; type = 'DEBIT'; }
      else if (creditVal > 0) { amount = creditVal; type = 'CREDIT'; }
      else return null;
    } else if (amountCol) {
      const rawAmount = this.parseMoney(row[amountCol]);
      if (rawAmount === 0) return null;
      amount = Math.abs(rawAmount);
      type = rawAmount < 0 ? 'DEBIT' : 'CREDIT';
    } else {
      return null;
    }

    const currency = currencyCol ? (row[currencyCol] || 'CAD').toUpperCase() : 'CAD';
    const reference = refCol ? (row[refCol] || '').trim() : undefined;
    const balance = balanceCol ? this.parseMoney(row[balanceCol]) : undefined;
    const accountType = accTypeCol ? (row[accTypeCol] || '').trim() : undefined;
    const accountNumber = accNumCol ? this.cleanAccountNumber(row[accNumCol]) : undefined;
    const merchant = this.extractMerchant(description);

    return {
      date: parsedDate,
      description,
      amount,
      type,
      currency,
      reference: reference || undefined,
      balance: balance || undefined,
      merchant: merchant || undefined,
      accountType: accountType || undefined,
      accountNumber: accountNumber || undefined,
      originalRow: { ...row },
    };
  }

  private parseDate(value: string): string | null {
    if (!value || typeof value !== 'string') return null;
    const cleaned = value.trim();

    // YYYY-MM-DD
    const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const d = new Date(`${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}T00:00:00Z`);
      return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    }

    // MM/DD/YYYY or MM/DD/YY or DD/MM/YYYY
    const slashMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (slashMatch) {
      let [, p1, p2, p3] = slashMatch;
      let year = parseInt(p3);
      if (year < 100) year += year < 50 ? 2000 : 1900;
      const month = parseInt(p1);
      const day = parseInt(p2);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const d = new Date(Date.UTC(year, month - 1, day));
        return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
      }
    }

    // Fallback: try native Date
    const fallback = new Date(cleaned);
    return isNaN(fallback.getTime()) ? null : fallback.toISOString().slice(0, 10);
  }

  private parseMoney(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    const cleaned = String(value).replace(/[^\d.\-+]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  private cleanAccountNumber(raw: any): string {
    const str = String(raw || '').trim();
    // Handle Excel scientific notation
    if (/\d\.\d+E\+\d+/i.test(str)) {
      try { return BigInt(parseFloat(str)).toString(); } catch { /* fallback */ }
    }
    return str.replace(/[^\d*]/g, '').slice(-4) || str;
  }

  private extractMerchant(description: string): string | null {
    const brands: Record<string, RegExp> = {
      'Amazon': /amazon/i, 'Uber': /uber/i, 'Google': /google/i,
      'Apple': /apple\.com|itunes/i, 'Netflix': /netflix/i, 'Spotify': /spotify/i,
      'Starbucks': /starbucks/i, 'Tim Hortons': /tim horton/i, 'Rogers': /rogers/i,
      'Bell': /\bbell\b/i, 'Telus': /telus/i, 'Shaw': /shaw\b/i,
      'Shopify': /shopify/i, 'Microsoft': /microsoft/i, 'Adobe': /adobe/i,
      'PayPal': /paypal/i, 'Stripe': /stripe/i,
    };
    for (const [brand, regex] of Object.entries(brands)) {
      if (regex.test(description)) return brand;
    }
    // Heuristic: first 3 meaningful words
    const words = description.split(/\s+/).filter(w => !/^[\d*#]+$/.test(w)).slice(0, 3);
    return words.length ? words.join(' ') : null;
  }

  generateHash(normalized: NormalizedTransaction, accountId: string): string {
    const input = `${normalized.date}|${normalized.amount.toFixed(2)}|${this.normalizeDescription(normalized.description)}|${accountId}`;
    return createHash('sha256').update(input).digest('hex');
  }

  private normalizeDescription(desc: string): string {
    return desc.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
  }
}

export const csvParserService = new CsvParserService();
