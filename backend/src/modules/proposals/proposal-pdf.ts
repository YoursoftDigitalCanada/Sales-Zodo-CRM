/**
 * Proposal PDF Generator — Stage 3C
 *
 * Generates a multi-section PDF proposal document:
 *   1. Cover Page (company branding, prospect/account name, address if provided)
 *   2. Custom Message (if provided)
 *   3. Scope of Services
 *   4. Pricing Section (line items, totals, payment schedule, service terms)
 *   5. Supporting Details Section
 *   6. Terms and Conditions
 *   7. E-Signature Block (Accept / Decline / Sign)
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ProposalPdfData {
    // Company
    companyName: string;
    companyPhone?: string;
    companyEmail?: string;
    companyAddress?: string;

    // Proposal meta
    proposalNumber: string;
    createdAt: string;

    // Lead
    leadName: string;
    propertyAddress: string;

    // Custom message
    customMessage?: string;

    // Scope
    scopeOfWork?: string;

    // Quote data
    quoteNumber: string;
    currency: string;
    items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    total: number;
    paymentScheduleType?: string;
    warrantySelected?: string;
    quoteNotes?: string;

    // AI Estimate data
    roofAreaSqft?: number;
    roofPitch?: string;
    roofType?: string;
    stories?: number;
    ridgeLengthFt?: number;
    valleyLengthFt?: number;
    eaveLengthFt?: number;
    totalEstimate?: number;

    // Terms
    termsAndConditions?: string;
}

function fmtCurrency(value: number, currency = 'CAD'): string {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(value);
}

export function buildGenericProposalScope(clientName = 'the client'): string {
    return [
        `Provide the agreed products, services, and implementation support for ${clientName}.`,
        '',
        'The scope of services includes:',
        '- Discovery and confirmation of business requirements',
        '- Configuration, delivery, or implementation of the approved solution',
        '- Coordination with the client team on timelines, milestones, and responsibilities',
        '- Quality review before handoff',
        '- Client onboarding and knowledge transfer as applicable',
        '- Post-delivery support according to the selected plan or agreement',
    ].join('\n');
}

export function buildGenericProposalTerms(): string {
    return [
        '1. This proposal is valid for 30 days from the date of issue unless otherwise stated.',
        '2. Work will begin after signed acceptance and receipt of any required deposit or initial payment.',
        '3. Deliverables, timelines, and responsibilities are based on the approved scope of services.',
        '4. Any changes to the approved scope after acceptance may require a written change order and additional charges.',
        '5. Client delays, missing information, or third-party dependencies may affect delivery timelines.',
        '6. Payment is due according to the payment schedule specified in this proposal.',
        '7. The client is responsible for timely access to required systems, contacts, approvals, and materials.',
        '8. Any required approvals, access, or compliance requirements must be provided before the affected work begins.',
        '9. Support, onboarding, and service coverage follow the selected package or signed agreement.',
        '10. This proposal supersedes any previous verbal or written estimates for the same scope.',
    ].join('\n');
}

export function resolveProposalScopeText(data: Pick<ProposalPdfData, 'scopeOfWork' | 'leadName'>): string {
    if (typeof data.scopeOfWork === 'string' && data.scopeOfWork.trim().length > 0) {
        return data.scopeOfWork;
    }
    return buildGenericProposalScope(data.leadName || 'the client');
}

function addPageFooter(doc: jsPDF, companyName: string): void {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`${companyName} — Confidential`, 20, pageHeight - 10);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 40, pageHeight - 10);
    }
}

export function generateProposalPdfBuffer(data: ProposalPdfData): {
    buffer: Buffer;
    fileName: string;
} {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 0;

    // ── 1. Cover Page ────────────────────────────────────────────────────

    // Header band
    doc.setFillColor(8, 145, 178); // teal
    doc.rect(0, 0, pageWidth, 80, 'F');

    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(data.companyName.toUpperCase(), pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('SALES PROPOSAL', pageWidth / 2, 50, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Proposal #${data.proposalNumber}`, pageWidth / 2, 65, { align: 'center' });

    // Details below header
    y = 100;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Prepared For:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.leadName, margin, y + 8);
    if (data.propertyAddress) {
        doc.text(data.propertyAddress, margin, y + 16);
    }

    doc.setFont('helvetica', 'bold');
    doc.text('Date:', pageWidth - margin - 60, y);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(data.createdAt).toLocaleDateString('en-CA', {
        year: 'numeric', month: 'long', day: 'numeric',
    }), pageWidth - margin - 60, y + 8);

    if (data.companyPhone || data.companyEmail) {
        y += 35;
        doc.setFont('helvetica', 'bold');
        doc.text('Contact:', margin, y);
        doc.setFont('helvetica', 'normal');
        if (data.companyPhone) doc.text(`Phone: ${data.companyPhone}`, margin, y + 8);
        if (data.companyEmail) doc.text(`Email: ${data.companyEmail}`, margin, y + 16);
    }

    // ── 2. Custom Message ────────────────────────────────────────────────

    if (data.customMessage) {
        doc.addPage();
        y = 30;
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(8, 145, 178);
        doc.text('Message', margin, y);
        y += 12;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        const lines = doc.splitTextToSize(data.customMessage, contentWidth);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 10;
    }

    // ── 3. Scope of Services ─────────────────────────────────────────────

    doc.addPage();
    y = 30;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(8, 145, 178);
    doc.text('Scope of Services', margin, y);
    y += 12;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);

    const scopeText = resolveProposalScopeText(data);

    const scopeLines = doc.splitTextToSize(scopeText, contentWidth);
    doc.text(scopeLines, margin, y);
    y += scopeLines.length * 5 + 10;

    // ── 4. Pricing Section ───────────────────────────────────────────────

    y += 10;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(8, 145, 178);
    doc.text('Pricing', margin, y);
    y += 8;

    // Line items table
    autoTable(doc, {
        startY: y,
        head: [['Description', 'Qty', 'Unit Price', 'Total']],
        body: data.items.map((item) => [
            item.description,
            String(item.quantity),
            fmtCurrency(item.unitPrice, data.currency),
            fmtCurrency(item.total, data.currency),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [8, 145, 178], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
            0: { cellWidth: contentWidth * 0.45 },
            1: { cellWidth: contentWidth * 0.1, halign: 'center' },
            2: { cellWidth: contentWidth * 0.2, halign: 'right' },
            3: { cellWidth: contentWidth * 0.25, halign: 'right' },
        },
        margin: { left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // Totals
    const totalsData = [
        ['Subtotal', fmtCurrency(data.subtotal, data.currency)],
    ];
    if (data.discountAmount > 0) {
        totalsData.push(['Discount', `- ${fmtCurrency(data.discountAmount, data.currency)}`]);
    }
    if (data.taxAmount > 0) {
        totalsData.push(['Tax', fmtCurrency(data.taxAmount, data.currency)]);
    }
    totalsData.push(['Total', fmtCurrency(data.total, data.currency)]);

    autoTable(doc, {
        startY: y,
        body: totalsData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: contentWidth * 0.7, fontStyle: 'bold', halign: 'right' },
            1: { cellWidth: contentWidth * 0.3, halign: 'right' },
        },
        margin: { left: margin, right: margin },
        didParseCell: (hookData) => {
            // Bold the total row
            if (hookData.row.index === totalsData.length - 1) {
                hookData.cell.styles.fontStyle = 'bold';
                hookData.cell.styles.fontSize = 12;
            }
        },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Payment schedule & service terms
    if (data.paymentScheduleType || data.warrantySelected) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 50, 50);

        if (data.paymentScheduleType) {
            const scheduleLabels: Record<string, string> = {
                full_upfront: 'Full Payment Upfront',
                '50_50': '50% Deposit / 50% on Completion',
                milestone: 'Milestone-Based Payments',
                net_30: 'Net 30 Days',
            };
            doc.text(`Payment Schedule: ${scheduleLabels[data.paymentScheduleType] || data.paymentScheduleType}`, margin, y);
            y += 6;
        }
        if (data.warrantySelected) {
            const warrantyLabels: Record<string, string> = {
                standard: 'Standard Warranty (5 Years Workmanship)',
                extended: 'Extended Warranty (10 Years)',
                premium: 'Premium Warranty (Lifetime / 25 Years)',
            };
            doc.text(`Service Coverage: ${warrantyLabels[data.warrantySelected] || data.warrantySelected}`, margin, y);
            y += 6;
        }
    }

    // ── 5. Supporting Details Section ────────────────────────────────────

    if (data.roofAreaSqft && data.roofAreaSqft > 0) {
        doc.addPage();
        y = 30;
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(8, 145, 178);
        doc.text('Supporting Details', margin, y);
        y += 12;

        const measRows: string[][] = [];
        measRows.push(['Estimated Area', `${data.roofAreaSqft.toLocaleString()} sq ft`]);
        if (data.roofPitch) measRows.push(['Configuration', data.roofPitch]);
        if (data.roofType) measRows.push(['Solution Type', data.roofType]);
        if (data.stories) measRows.push(['Stories', String(data.stories)]);
        if (data.ridgeLengthFt) measRows.push(['Primary Length', `${data.ridgeLengthFt.toFixed(1)} ft`]);
        if (data.valleyLengthFt) measRows.push(['Secondary Length', `${data.valleyLengthFt.toFixed(1)} ft`]);
        if (data.eaveLengthFt) measRows.push(['Perimeter Length', `${data.eaveLengthFt.toFixed(1)} ft`]);
        if (data.totalEstimate) measRows.push(['Estimated Total', fmtCurrency(data.totalEstimate, data.currency)]);

        autoTable(doc, {
            startY: y,
            body: measRows,
            theme: 'striped',
            styles: { fontSize: 10, cellPadding: 4 },
            columnStyles: {
                0: { cellWidth: contentWidth * 0.4, fontStyle: 'bold' },
                1: { cellWidth: contentWidth * 0.6 },
            },
            margin: { left: margin, right: margin },
        });

        y = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(130, 130, 130);
        doc.text('* Details are provided for planning context and should be confirmed against the final approved scope.', margin, y);
    }

    // ── 6. Terms and Conditions ──────────────────────────────────────────

    doc.addPage();
    y = 30;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(8, 145, 178);
    doc.text('Terms and Conditions', margin, y);
    y += 12;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);

    const termsText = data.termsAndConditions || buildGenericProposalTerms();

    const termsLines = doc.splitTextToSize(termsText, contentWidth);
    doc.text(termsLines, margin, y);

    // ── 7. E-Signature Block ─────────────────────────────────────────────

    y += termsLines.length * 4.5 + 20;

    // Check if we need a new page
    if (y > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage();
        y = 30;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(8, 145, 178);
    doc.text('Acceptance', margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text('By signing below, I accept this proposal and authorize the work to proceed.', margin, y);
    y += 15;

    // Signature line
    doc.setDrawColor(150);
    doc.line(margin, y, margin + 80, y);
    doc.setFontSize(8);
    doc.text('Client Signature', margin, y + 5);

    doc.line(margin + 100, y, margin + 160, y);
    doc.text('Date', margin + 100, y + 5);

    y += 15;
    doc.line(margin, y, margin + 80, y);
    doc.text('Printed Name', margin, y + 5);

    // ── Add page footers ─────────────────────────────────────────────────
    addPageFooter(doc, data.companyName);

    // ── Output ───────────────────────────────────────────────────────────
    const pdfOutput = doc.output('arraybuffer');
    const buffer = Buffer.from(pdfOutput);
    const safeName = data.proposalNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileName = `Proposal_${safeName}.pdf`;

    return { buffer, fileName };
}
