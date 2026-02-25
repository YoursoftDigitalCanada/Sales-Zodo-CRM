/**
 * Server-side Roof Estimate Proposal PDF Generator
 *
 * Generates a PDF buffer that can be attached to emails.
 * Uses jsPDF + jspdf-autotable (same libraries as the frontend).
 *
 * Note: This is a data-only PDF (no satellite image overlay)
 * because canvas rendering is not available in Node.js.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface RoofEstimatePdfData {
    // Company
    companyName: string;

    // Recipient
    recipientName: string;
    recipientType: 'client' | 'lead';
    recipientCompany?: string;
    recipientEmail?: string;
    recipientPhone?: string;

    // Property
    address: string;
    latitude: number;
    longitude: number;

    // Estimate data
    roofAreaSqft: number;
    pricePerSqft: number;
    manualAdjustment: number;
    totalEstimate: number;
    confidence: number;
    aiModel: string;
    processingTimeSec: number;
    snowMode: boolean;

    // Metadata
    estimateId: string;
    createdAt: string;
    notes?: string;
}

function toMoney(value: number): string {
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);
}

function safeFileName(value: string): string {
    const normalized = (value || 'roof-estimate').trim();
    return normalized.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function addFooter(doc: jsPDF, pageNumber: number, totalPages: number): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setDrawColor(226, 232, 240);
    doc.line(36, pageHeight - 28, pageWidth - 36, pageHeight - 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${pageNumber} of ${totalPages}`, 40, pageHeight - 15);

    doc.setTextColor(30, 64, 175);
    doc.setFont('helvetica', 'bold');
    doc.text('Powered By Zodo', pageWidth - 40, pageHeight - 15, { align: 'right' });
}

/**
 * Generate a Roof Estimate PDF as a Buffer (for email attachment).
 */
export function generateRoofEstimatePdfBuffer(data: RoofEstimatePdfData): {
    buffer: Buffer;
    fileName: string;
} {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    let cursorY = 46;

    const companyName = data.companyName || 'Zodo Roofing';
    const adjustedArea = Math.round(data.roofAreaSqft * (1 + data.manualAdjustment / 100));

    // ── Header ─────────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.text(companyName, margin, cursorY);

    doc.setFontSize(13);
    doc.setTextColor(37, 99, 235);
    doc.text('Roof Estimate Report', margin, cursorY + 22);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const refId = `EST-${data.estimateId.slice(0, 8).toUpperCase()}`;
    doc.text(`Ref #: ${refId}`, pageWidth - margin, cursorY, { align: 'right' });

    const createdDate = new Date(data.createdAt);
    const dateStr = Number.isFinite(createdDate.getTime())
        ? createdDate.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'N/A';
    doc.text(`Date: ${dateStr}`, pageWidth - margin, cursorY + 14, { align: 'right' });

    cursorY += 52;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);

    // ── Recipient & Property Info ──────────────────────────────────────────
    cursorY += 18;
    autoTable(doc, {
        startY: cursorY,
        theme: 'grid',
        styles: {
            fontSize: 9,
            textColor: [51, 65, 85],
            cellPadding: 5,
            lineColor: [226, 232, 240],
            lineWidth: 0.5,
        },
        columnStyles: {
            0: { cellWidth: 130, fontStyle: 'bold', textColor: [15, 23, 42] },
            1: { cellWidth: 165 },
            2: { cellWidth: 130, fontStyle: 'bold', textColor: [15, 23, 42] },
            3: { cellWidth: 165 },
        },
        body: [
            [
                data.recipientType === 'lead' ? 'Lead' : 'Client',
                data.recipientName || '-',
                'Company',
                data.recipientCompany || '-',
            ],
            [
                'Email',
                data.recipientEmail || '-',
                'Phone',
                data.recipientPhone || '-',
            ],
            [
                'Property Address',
                data.address,
                'Coordinates',
                `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`,
            ],
        ],
    });

    // ── Roof Metrics ──────────────────────────────────────────────────────
    const metricsStartY = (doc as any).lastAutoTable.finalY + 16;
    autoTable(doc, {
        startY: metricsStartY,
        theme: 'grid',
        styles: {
            fontSize: 9,
            textColor: [51, 65, 85],
            cellPadding: 5,
            lineColor: [226, 232, 240],
            lineWidth: 0.5,
        },
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: [248, 250, 252],
            fontStyle: 'bold',
        },
        head: [['Metric', 'Value']],
        body: [
            ['AI-Detected Roof Area', `${data.roofAreaSqft.toFixed(1)} sq ft`],
            ['Manual Adjustment', `${data.manualAdjustment >= 0 ? '+' : ''}${data.manualAdjustment}%`],
            ['Adjusted Roof Area', `${adjustedArea.toFixed(1)} sq ft`],
            ['Price per sq ft', toMoney(data.pricePerSqft)],
            ['Snow Load Mode', data.snowMode ? 'Enabled' : 'Disabled'],
            ['Detection Confidence', `${data.confidence.toFixed(1)}%`],
            ['AI Model', data.aiModel || 'yolov8n-seg-cpu'],
            ['Processing Time', `${data.processingTimeSec.toFixed(1)} s`],
        ],
    });

    // ── Line Item / Total ─────────────────────────────────────────────────
    const lineItemStartY = (doc as any).lastAutoTable.finalY + 16;
    autoTable(doc, {
        startY: lineItemStartY,
        theme: 'striped',
        styles: {
            fontSize: 9,
            textColor: [51, 65, 85],
            cellPadding: 5,
            lineColor: [226, 232, 240],
            lineWidth: 0.5,
        },
        headStyles: {
            fillColor: [37, 99, 235],
            textColor: [248, 250, 252],
            fontStyle: 'bold',
        },
        columnStyles: {
            0: { cellWidth: 240 },
            1: { cellWidth: 80, halign: 'right' },
            2: { cellWidth: 90, halign: 'right' },
            3: { cellWidth: 95, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] },
        },
        head: [['Description', 'Area (sq ft)', 'Rate ($/sq ft)', 'Total']],
        body: [
            [
                'Roof Estimate (AI satellite measurement)',
                adjustedArea.toFixed(1),
                toMoney(data.pricePerSqft),
                toMoney(data.totalEstimate),
            ],
        ],
    });

    // ── Grand Total ───────────────────────────────────────────────────────
    let totalY = (doc as any).lastAutoTable.finalY + 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(8, 145, 178);
    doc.text(`ESTIMATED TOTAL: ${toMoney(data.totalEstimate)}`, pageWidth - margin, totalY, { align: 'right' });

    // ── Notes ─────────────────────────────────────────────────────────────
    if (data.notes) {
        totalY += 28;
        if (totalY > 700) {
            doc.addPage();
            totalY = 52;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text('Notes', margin, totalY);
        totalY += 12;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        const textWidth = pageWidth - margin * 2;
        const wrapped = doc.splitTextToSize(data.notes, textWidth);
        doc.text(wrapped, margin, totalY);
    }

    // ── Disclaimer ────────────────────────────────────────────────────────
    const disclaimerY = (totalY || (doc as any).lastAutoTable.finalY) + 40;
    if (disclaimerY < 700) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        const disclaimer = 'This estimate is based on AI-powered satellite imagery analysis. Actual measurements may vary. A detailed on-site inspection is recommended before finalizing the scope of work.';
        const wrapped = doc.splitTextToSize(disclaimer, pageWidth - margin * 2);
        doc.text(wrapped, margin, disclaimerY);
    }

    // ── Footer on all pages ───────────────────────────────────────────────
    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);
        addFooter(doc, page, totalPages);
    }

    // ── Output as Buffer ──────────────────────────────────────────────────
    const arrayBuffer = doc.output('arraybuffer');
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `${safeFileName(refId)}_Roof-Estimate.pdf`;

    return { buffer, fileName };
}
