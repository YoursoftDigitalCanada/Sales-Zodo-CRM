import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface QuoteContractPdfItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface QuoteContractPdfInput {
    companyName: string;
    companyEmail?: string;
    companyPhone?: string;
    companyAddress?: string;
    quoteNumber: string;
    issueDate: string;
    signedAt?: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    clientAddress?: string;
    propertyAddress?: string;
    jobType?: string;
    scopeOfWork?: string;
    currency: string;
    items: QuoteContractPdfItem[];
    subtotal: number;
    taxRate?: number;
    taxAmount: number;
    discountAmount: number;
    total: number;
    notes?: string;
    terms?: string;
    signedBy?: string;
    signatureType?: string;
    signatureData?: string;
}

const formatCurrency = (value: number, currency: string) =>
    new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(value);

const safeName = (value: string) =>
    value.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '') || 'signed-contract';

export function generateQuoteContractPdfBuffer(input: QuoteContractPdfInput): { buffer: Buffer; fileName: string } {
    const doc = new jsPDF();
    const marginX = 14;
    let y = 18;

    doc.setFontSize(18);
    doc.text(input.companyName || 'ZODO', marginX, y);
    y += 8;

    doc.setFontSize(10);
    const companyLines = [input.companyEmail, input.companyPhone, input.companyAddress].filter(Boolean) as string[];
    for (const line of companyLines) {
        doc.text(line, marginX, y);
        y += 5;
    }

    doc.setFontSize(16);
    doc.text('Signed Estimate Contract', 145, 18, { align: 'right' });
    doc.setFontSize(10);
    doc.text(`Estimate: ${input.quoteNumber}`, 145, 25, { align: 'right' });
    doc.text(`Issued: ${input.issueDate}`, 145, 30, { align: 'right' });
    if (input.signedAt) {
        doc.text(`Signed: ${input.signedAt}`, 145, 35, { align: 'right' });
    }

    y = Math.max(y + 6, 44);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, y, 196, y);
    y += 10;

    doc.setFontSize(12);
    doc.text('Client Details', marginX, y);
    doc.text('Project Details', 110, y);
    y += 6;

    doc.setFontSize(10);
    const clientLines = [
        input.clientName,
        input.clientEmail,
        input.clientPhone,
        input.clientAddress,
    ].filter(Boolean) as string[];
    const projectLines = [
        input.propertyAddress,
        input.jobType ? `Job Type: ${input.jobType}` : undefined,
    ].filter(Boolean) as string[];

    const clientStartY = y;
    for (const line of clientLines) {
        doc.text(line, marginX, y);
        y += 5;
    }

    let rightY = clientStartY;
    for (const line of projectLines) {
        doc.text(line, 110, rightY);
        rightY += 5;
    }
    y = Math.max(y, rightY) + 6;

    if (input.scopeOfWork) {
        doc.setFontSize(12);
        doc.text('Scope of Work', marginX, y);
        y += 6;
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(input.scopeOfWork, 182);
        doc.text(lines, marginX, y);
        y += lines.length * 5 + 4;
    }

    autoTable(doc, {
        startY: y,
        head: [['Description', 'Qty', 'Rate', 'Amount']],
        body: input.items.map((item) => [
            item.description,
            String(item.quantity),
            formatCurrency(item.unitPrice, input.currency),
            formatCurrency(item.total, input.currency),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105] },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: marginX, right: 14 },
    });

    y = ((doc as any).lastAutoTable?.finalY || y) + 8;

    const totalsX = 128;
    doc.setFontSize(10);
    doc.text('Subtotal', totalsX, y);
    doc.text(formatCurrency(input.subtotal, input.currency), 196, y, { align: 'right' });
    y += 6;
    if (input.taxAmount > 0) {
        doc.text(`Tax${input.taxRate ? ` (${input.taxRate}%)` : ''}`, totalsX, y);
        doc.text(formatCurrency(input.taxAmount, input.currency), 196, y, { align: 'right' });
        y += 6;
    }
    if (input.discountAmount > 0) {
        doc.text('Discount', totalsX, y);
        doc.text(`-${formatCurrency(input.discountAmount, input.currency)}`, 196, y, { align: 'right' });
        y += 6;
    }
    doc.setFontSize(12);
    doc.text('Total', totalsX, y);
    doc.text(formatCurrency(input.total, input.currency), 196, y, { align: 'right' });
    y += 10;

    if (input.notes) {
        doc.setFontSize(12);
        doc.text('Notes', marginX, y);
        y += 6;
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(input.notes, 182);
        doc.text(lines, marginX, y);
        y += lines.length * 5 + 4;
    }

    if (input.terms) {
        doc.setFontSize(12);
        doc.text('Terms & Conditions', marginX, y);
        y += 6;
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(input.terms, 182);
        doc.text(lines, marginX, y);
        y += lines.length * 5 + 8;
    }

    if (y > 230) {
        doc.addPage();
        y = 20;
    }

    doc.setFontSize(12);
    doc.text('Signature', marginX, y);
    y += 6;

    doc.roundedRect(marginX, y, 90, 24, 2, 2);
    if (input.signatureType === 'drawn' && input.signatureData?.startsWith('data:image')) {
        try {
            doc.addImage(input.signatureData, 'PNG', marginX + 3, y + 3, 60, 16);
        } catch {
            // Ignore image parse failures and fall back to signer name below.
        }
    } else if (input.signedBy) {
        doc.setFont('times', 'italic');
        doc.setFontSize(16);
        doc.text(input.signedBy, marginX + 4, y + 15);
        doc.setFont('helvetica', 'normal');
    }

    doc.setFontSize(10);
    doc.text(`Signed by: ${input.signedBy || 'Client'}`, 110, y + 8);
    doc.text(`Date: ${input.signedAt || input.issueDate}`, 110, y + 15);

    const buffer = Buffer.from(doc.output('arraybuffer'));
    const fileName = `${safeName(input.quoteNumber)}-signed-contract.pdf`;
    return { buffer, fileName };
}
