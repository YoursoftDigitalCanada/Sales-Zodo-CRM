import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type PolygonPoint = { x: number; y: number };

export interface RoofProposalPdfInput {
  proposalNumber: string;
  proposalTitle: string;
  issueDate: string;
  validUntil: string;
  companyName: string;
  client: {
    name: string;
    company?: string;
    email?: string;
    phone?: string;
  };
  property: {
    address: string;
    latitude: number;
    longitude: number;
  };
  metrics: {
    roofAreaSqft: number;
    pixelArea: number;
    pricePerSqft: number;
    totalEstimate: number;
    confidence: number;
    aiModel: string;
    processingTimeSec: number;
    zoom: number;
    imageWidth: number;
    imageHeight: number;
  };
  polygonPoints: PolygonPoint[];
  scopeOfWork?: string;
  internalNotes?: string;
  termsAndConditions?: string;
}

function normalizePolygonPoints(
  points: PolygonPoint[],
  width: number,
  height: number,
): PolygonPoint[] {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return [];
  }

  return points.map((point) => ({
    x: Number((point.x / width).toFixed(6)),
    y: Number((point.y / height).toFixed(6)),
  }));
}

function toMoney(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function safeFileName(value: string): string {
  const normalized = value.trim() || "roof-proposal";
  return normalized.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export function generateRoofProposalPdf(input: RoofProposalPdfInput): string {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let cursorY = 46;

  const companyName = input.companyName.trim() || "Your Roofing Company";
  const clientName = input.client.name.trim() || "Client";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(companyName, margin, cursorY);

  doc.setFontSize(13);
  doc.setTextColor(37, 99, 235);
  doc.text("Roof Estimate Proposal", margin, cursorY + 22);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Proposal #: ${input.proposalNumber}`, pageWidth - margin, cursorY, { align: "right" });
  doc.text(`Issue Date: ${input.issueDate}`, pageWidth - margin, cursorY + 14, { align: "right" });
  doc.text(`Valid Until: ${input.validUntil}`, pageWidth - margin, cursorY + 28, { align: "right" });

  cursorY += 52;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);

  cursorY += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(input.proposalTitle.trim() || "Roofing Proposal", margin, cursorY);

  cursorY += 12;
  autoTable(doc, {
    startY: cursorY,
    theme: "grid",
    styles: {
      fontSize: 9,
      textColor: [51, 65, 85],
      cellPadding: 5,
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    columnStyles: {
      0: { cellWidth: 130, fontStyle: "bold", textColor: [15, 23, 42] },
      1: { cellWidth: 165 },
      2: { cellWidth: 130, fontStyle: "bold", textColor: [15, 23, 42] },
      3: { cellWidth: 165 },
    },
    body: [
      [
        "Client",
        clientName,
        "Client Company",
        input.client.company || "-",
      ],
      [
        "Client Email",
        input.client.email || "-",
        "Client Phone",
        input.client.phone || "-",
      ],
      [
        "Property Address",
        input.property.address,
        "Coordinates",
        `${input.property.latitude.toFixed(6)}, ${input.property.longitude.toFixed(6)}`,
      ],
    ],
  });

  const calculationStartY = (doc as any).lastAutoTable.finalY + 16;
  autoTable(doc, {
    startY: calculationStartY,
    theme: "grid",
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
      fontStyle: "bold",
    },
    head: [["Metric", "Value"]],
    body: [
      ["Roof Area (sq ft)", input.metrics.roofAreaSqft.toFixed(1)],
      ["Polygon Area (px²)", input.metrics.pixelArea.toFixed(1)],
      ["Price per sq ft", toMoney(input.metrics.pricePerSqft)],
      [
        "Calculation",
        `${input.metrics.roofAreaSqft.toFixed(1)} sq ft × ${toMoney(input.metrics.pricePerSqft)}`,
      ],
      ["Estimated Total", toMoney(input.metrics.totalEstimate)],
      ["Detection Confidence", `${input.metrics.confidence.toFixed(1)}%`],
      ["AI Model", input.metrics.aiModel || "manual-polygon"],
      ["Processing Time", `${input.metrics.processingTimeSec.toFixed(1)} s`],
      ["Satellite Zoom", String(input.metrics.zoom)],
      ["Image Size", `${input.metrics.imageWidth} x ${input.metrics.imageHeight} px`],
      ["Polygon Vertices", String(input.polygonPoints.length)],
    ],
  });

  const lineItemStartY = (doc as any).lastAutoTable.finalY + 16;
  autoTable(doc, {
    startY: lineItemStartY,
    theme: "striped",
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
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 240 },
      1: { cellWidth: 70, halign: "right" },
      2: { cellWidth: 70 },
      3: { cellWidth: 90, halign: "right" },
      4: { cellWidth: 95, halign: "right", fontStyle: "bold", textColor: [15, 23, 42] },
    },
    head: [["Line Item", "Quantity", "Unit", "Unit Price", "Total"]],
    body: [
      [
        "Roofing Scope (estimated from satellite + polygon)",
        input.metrics.roofAreaSqft.toFixed(1),
        "sq ft",
        toMoney(input.metrics.pricePerSqft),
        toMoney(input.metrics.totalEstimate),
      ],
    ],
  });

  let textY = (doc as any).lastAutoTable.finalY + 20;
  const textWidth = pageWidth - margin * 2;

  const printParagraph = (title: string, text: string) => {
    if (!text.trim()) return;
    if (textY > 740) {
      doc.addPage();
      textY = 52;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, textY);
    textY += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const wrapped = doc.splitTextToSize(text.trim(), textWidth);
    doc.text(wrapped, margin, textY);
    textY += wrapped.length * 11 + 10;
  };

  printParagraph("Scope of Work", input.scopeOfWork || "");
  printParagraph("Internal Notes", input.internalNotes || "");
  printParagraph("Terms & Conditions", input.termsAndConditions || "");

  const normalized = normalizePolygonPoints(
    input.polygonPoints,
    input.metrics.imageWidth,
    input.metrics.imageHeight,
  );

  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Polygon Coordinates", margin, 44);

  autoTable(doc, {
    startY: 58,
    theme: "grid",
    styles: {
      fontSize: 8,
      textColor: [51, 65, 85],
      cellPadding: 4,
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [248, 250, 252],
      fontStyle: "bold",
    },
    head: [["#", "X (px)", "Y (px)", "X (normalized)", "Y (normalized)"]],
    body: input.polygonPoints.map((point, index) => {
      const normalizedPoint = normalized[index] || { x: 0, y: 0 };
      return [
        String(index + 1),
        point.x.toFixed(2),
        point.y.toFixed(2),
        normalizedPoint.x.toFixed(6),
        normalizedPoint.y.toFixed(6),
      ];
    }),
  });

  const footerY = doc.internal.pageSize.getHeight() - 24;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Generated by Zodo CRM Roof Estimator. Area values are estimate-grade and should be validated on site.",
    margin,
    footerY,
  );

  const filename = safeFileName(`${input.proposalNumber || "roof-proposal"}.pdf`);
  doc.save(filename);
  return filename;
}
