import fs from 'fs/promises';
import path from 'path';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import sharp from 'sharp';

import { config } from '../../../config';
import { prisma } from '../../../config/database';
import { NotFoundError } from '../../../common/errors/HttpErrors';
import { settingsRepository } from '../../settings/settings.repository';
import { toCompanyProfileDto } from '../../settings/settings.dto';
import { bookkeepingAuditService } from '../event-store/audit.service';

type StatementMode = 'BANK' | 'CREDIT_CARD';

export interface StatementExportQuery {
  format: 'csv' | 'pdf';
  mode: StatementMode;
  search?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  exactDate?: string;
  month?: string;
  year?: string;
}

function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function normalized(row: any): Record<string, any> {
  return row?.normalizedData && typeof row.normalizedData === 'object' ? row.normalizedData : {};
}

function overrides(row: any): Record<string, any> {
  return row?.manualOverrides && typeof row.manualOverrides === 'object' ? row.manualOverrides : {};
}

function rowType(row: any): string {
  const data = normalized(row);
  return String(overrides(row).transactionType || row.aiTransactionType || (data.type === 'CREDIT' ? 'INCOME' : 'EXPENSE')).toUpperCase();
}

function rowDate(row: any): string {
  return String(normalized(row).date || '').match(/^\d{4}-\d{2}-\d{2}/)?.[0] || '';
}

function rowCategory(row: any): string {
  return String(overrides(row).category || row.aiCategory || 'Uncategorized');
}

function rowVendor(row: any): string {
  const data = normalized(row);
  return String(overrides(row).vendor || row.aiVendor || data.merchant || 'Unknown');
}

export function filterStatementRows(rows: any[], query: StatementExportQuery): any[] {
  const search = String(query.search || '').trim().toLowerCase();
  return rows.filter((row) => {
    const data = normalized(row);
    const manual = overrides(row);
    const date = rowDate(row);
    const searchable = [data.description, data.merchant, data.reference, manual.vendor, row.aiVendor, manual.category, row.aiCategory]
      .filter(Boolean).join(' ').toLowerCase();
    if (search && !searchable.includes(search)) return false;
    if (query.type && query.type !== 'ALL' && rowType(row) !== query.type) return false;
    if (query.dateFrom && (!date || date < query.dateFrom)) return false;
    if (query.dateTo && (!date || date > query.dateTo)) return false;
    if (query.exactDate && date !== query.exactDate) return false;
    if (query.month && query.month !== 'ALL' && date.slice(5, 7) !== query.month) return false;
    if (query.year && query.year !== 'ALL' && date.slice(0, 4) !== query.year) return false;
    return true;
  });
}

export function summarizeStatementRows(rows: any[]) {
  const activeRows = rows.filter((row) => row.status !== 'SKIPPED' && Number(row.duplicateScore || 0) < 95);
  let charges = 0;
  let credits = 0;
  let largestCharge = 0;
  activeRows.forEach((row) => {
    const amount = Math.abs(Number(normalized(row).amount || 0));
    const isCredit = ['INCOME', 'REFUND', 'CASHBACK', 'TRANSFER', 'CREDIT_CARD_PAYMENT'].includes(rowType(row));
    if (isCredit) credits += amount;
    else { charges += amount; largestCharge = Math.max(largestCharge, amount); }
  });
  return { rows: activeRows.length, charges, credits, net: charges - credits, largestCharge };
}

class StatementExportService {
  private async logoDataUrl(logoUrl: string | null): Promise<string | null> {
    const value = String(logoUrl || '').trim();
    if (!value || /^https?:\/\//i.test(value)) return null;
    const relative = value.startsWith('/uploads/') ? value.replace(/^\/uploads\/?/, '') : value.replace(/^\/+/, '');
    try {
      const image = await fs.readFile(path.resolve(config.upload.uploadPath, relative));
      const png = await sharp(image, { density: 192 }).resize({ width: 500, height: 180, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
      return `data:image/png;base64,${png.toString('base64')}`;
    } catch { return null; }
  }

  private dateLabel(value: string): string {
    if (!value) return '-';
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-CA');
  }

  private money(value: number, currency = 'CAD'): string {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(value || 0);
  }

  private async data(sessionId: string, tenantId: string, query: StatementExportQuery) {
    const session = await prisma.importSession.findFirst({ where: { id: sessionId, tenantId }, include: { files: { orderBy: { createdAt: 'asc' } } } });
    if (!session) throw new NotFoundError('Statement import session not found');
    const rows = await prisma.rawTransaction.findMany({
      where: { sessionId, tenantId },
      include: { uploadedFile: { select: { fileName: true, accountId: true, provider: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const filteredRows = filterStatementRows(rows, query);
    const accountIds = Array.from(new Set(session.files.map((file) => file.accountId).filter((id): id is string => Boolean(id))));
    const accounts = accountIds.length
      ? await (prisma as any).bookkeepingAccount.findMany({ where: { tenantId, id: { in: accountIds } }, select: { name: true, code: true, institutionName: true, accountNumberLast4: true } })
      : [];
    const settings = await settingsRepository.ensure(tenantId);
    return { session, rows: filteredRows, accounts, company: toCompanyProfileDto(settings), summary: summarizeStatementRows(filteredRows) };
  }

  async csv(sessionId: string, tenantId: string, query: StatementExportQuery, actorUserId?: string) {
    const report = await this.data(sessionId, tenantId, query);
    const headings = ['Date', 'Description', 'Reference', 'Type', 'Category', 'Vendor', 'Amount', 'Currency', 'Status', 'AI Confidence', 'Duplicate Score', 'Source File'];
    const lines = report.rows.map((row: any) => {
      const data = normalized(row);
      return [rowDate(row), data.description, data.reference, rowType(row), rowCategory(row), rowVendor(row), Math.abs(Number(data.amount || 0)), data.currency || 'CAD', row.status, Math.round(Number(row.aiConfidence || 0) * 100), Number(row.duplicateScore || 0), row.uploadedFile?.fileName].map(csvEscape).join(',');
    });
    await bookkeepingAuditService.log({ tenantId, entityType: 'IMPORT_SESSION', entityId: sessionId, action: 'EXPORT_CSV', userId: actorUserId, metadata: { mode: query.mode, rows: report.rows.length } });
    return [headings.join(','), ...lines].join('\n');
  }

  async pdf(sessionId: string, tenantId: string, query: StatementExportQuery, actorUserId?: string) {
    const report = await this.data(sessionId, tenantId, query);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
    const width = doc.internal.pageSize.getWidth();
    const margin = 12;
    const title = query.mode === 'BANK' ? 'Bank Statement Report' : 'Credit Card Statement Report';
    const logo = await this.logoDataUrl(report.company.logoUrl);
    if (logo) { try { doc.addImage(logo, 'PNG', margin, 9, 38, 15); } catch { /* Keep report available if a legacy logo is malformed. */ } }

    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(15, 23, 42); doc.text(title, logo ? 55 : margin, 17);
    doc.setFontSize(10); doc.text(report.company.companyName || 'Company', width - margin, 12, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(71, 85, 105);
    const companyLines = [report.company.address, [report.company.city, report.company.province, report.company.postalCode].filter(Boolean).join(', '), [report.company.email, report.company.phone].filter(Boolean).join(' · '), report.company.taxId ? `Tax ID: ${report.company.taxId}` : ''].filter(Boolean);
    companyLines.slice(0, 4).forEach((line, index) => doc.text(String(line), width - margin, 17 + index * 4, { align: 'right' }));
    doc.setDrawColor(226, 232, 240); doc.line(margin, 34, width - margin, 34);

    const accountLabel = report.accounts.length ? report.accounts.map((account: any) => [account.institutionName, account.name, account.accountNumberLast4 ? `**** ${account.accountNumberLast4}` : ''].filter(Boolean).join(' ')).join(', ') : 'Auto-detected account';
    doc.setFontSize(8.5); doc.setTextColor(51, 65, 85);
    doc.text(`Session: ${report.session.name || report.session.id}`, margin, 40);
    doc.text(`Account: ${accountLabel}`, margin, 45);
    const dates = report.rows.map((row: any) => rowDate(row)).filter(Boolean).sort();
    doc.text(`Period: ${dates.length ? `${this.dateLabel(dates[0])} - ${this.dateLabel(dates[dates.length - 1])}` : 'No dated rows'}  |  Exported: ${new Date().toLocaleString('en-CA')}`, margin, 50);

    const currency = String(normalized(report.rows[0]).currency || 'CAD');
    const summaryLabels: Array<[string, number]> = query.mode === 'BANK'
      ? [['Money In', report.summary.credits], ['Money Out', report.summary.charges], ['Net Movement', report.summary.credits - report.summary.charges], ['Total Activity', report.summary.credits + report.summary.charges]]
      : [['Card Charges', report.summary.charges], ['Payments & Credits', report.summary.credits], ['Net Card Activity', report.summary.net], ['Largest Charge', report.summary.largestCharge]];
    summaryLabels.forEach(([label, value], index) => {
      const x = margin + index * 62;
      doc.setFillColor(248, 250, 252); doc.roundedRect(x, 55, 56, 14, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139); doc.text(label, x + 3, 60);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(15, 23, 42); doc.text(this.money(value, currency), x + 3, 66);
    });

    autoTable(doc, {
      startY: 74, margin: { left: margin, right: margin, bottom: 14 },
      head: [['Date', 'Description', 'Reference', 'Type', 'Category', 'Vendor', 'Amount', 'Status']],
      body: report.rows.map((row: any) => { const data = normalized(row); return [this.dateLabel(rowDate(row)), data.description || '-', data.reference || '-', rowType(row), rowCategory(row), rowVendor(row), this.money(Math.abs(Number(data.amount || 0)), data.currency || 'CAD'), row.status]; }),
      styles: { font: 'helvetica', fontSize: 7, cellPadding: 2, textColor: [51, 65, 85], overflow: 'linebreak' },
      headStyles: { fillColor: [8, 145, 178], textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 58 }, 2: { cellWidth: 30 }, 3: { cellWidth: 24 }, 4: { cellWidth: 34 }, 5: { cellWidth: 35 }, 6: { cellWidth: 27, halign: 'right' }, 7: { cellWidth: 25 } },
      didDrawPage: () => { const page = doc.getCurrentPageInfo().pageNumber; doc.setFontSize(7); doc.setTextColor(148, 163, 184); doc.text(`${report.company.companyName || 'Company'} | ${title}`, margin, doc.internal.pageSize.getHeight() - 6); doc.text(`Page ${page}`, width - margin, doc.internal.pageSize.getHeight() - 6, { align: 'right' }); },
    });
    await bookkeepingAuditService.log({ tenantId, entityType: 'IMPORT_SESSION', entityId: sessionId, action: 'EXPORT_PDF', userId: actorUserId, metadata: { mode: query.mode, rows: report.rows.length } });
    return Buffer.from(doc.output('arraybuffer'));
  }
}

export const statementExportService = new StatementExportService();
