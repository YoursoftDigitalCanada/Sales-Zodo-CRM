import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type PolygonPoint = { x: number; y: number };

type RecipientType = "client" | "lead";

export interface RoofProposalPdfInput {
  proposalNumber: string;
  proposalTitle: string;
  issueDate: string;
  validUntil: string;
  companyName: string;
  recipient: {
    type: RecipientType;
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
  satelliteImageUrl?: string;
  polygonPoints: PolygonPoint[];
  scopeOfWork?: string;
  internalNotes?: string;
  termsAndConditions?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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

function calculateFeetPerPixel(latitude: number, zoom: number): number {
  const safeLatitude = clamp(latitude, -85, 85);
  const safeZoom = clamp(zoom, 1, 23);
  const metersPerPixel =
    (156543.03392 * Math.cos((safeLatitude * Math.PI) / 180)) /
    2 ** safeZoom;

  return metersPerPixel * 3.28084;
}

function calculateEdgeLengthsFeet(
  points: PolygonPoint[],
  latitude: number,
  zoom: number,
): number[] {
  if (!Array.isArray(points) || points.length < 2) return [];

  const feetPerPixel = calculateFeetPerPixel(latitude, zoom);
  return points.map((point, index) => {
    const nextPoint = points[(index + 1) % points.length];
    const edgeLengthPixels = Math.hypot(nextPoint.x - point.x, nextPoint.y - point.y);
    return Number((edgeLengthPixels * feetPerPixel).toFixed(1));
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load satellite image for PDF."));
    image.src = url;
  });
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

async function buildAnnotatedRoofImageDataUrl(params: {
  imageUrl: string;
  polygonPoints: PolygonPoint[];
  imageWidth: number;
  imageHeight: number;
  centerLat: number;
  zoom: number;
}): Promise<string> {
  const {
    imageUrl,
    polygonPoints,
    imageWidth,
    imageHeight,
    centerLat,
    zoom,
  } = params;

  const image = await loadImage(imageUrl);
  const baseWidth = Math.max(1, Math.round(imageWidth || image.naturalWidth || 1024));
  const baseHeight = Math.max(1, Math.round(imageHeight || image.naturalHeight || 1024));

  const renderWidth = clamp(image.naturalWidth || baseWidth, 900, 1700);
  const renderHeight = Math.round(renderWidth * (baseHeight / baseWidth));

  const scaleX = renderWidth / baseWidth;
  const scaleY = renderHeight / baseHeight;

  const canvas = document.createElement("canvas");
  canvas.width = renderWidth;
  canvas.height = renderHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create image canvas for PDF.");
  }

  context.drawImage(image, 0, 0, renderWidth, renderHeight);

  if (polygonPoints.length >= 3) {
    const renderPoints = polygonPoints.map((point) => ({
      x: point.x * scaleX,
      y: point.y * scaleY,
    }));

    context.beginPath();
    context.moveTo(renderPoints[0].x, renderPoints[0].y);
    for (let index = 1; index < renderPoints.length; index += 1) {
      context.lineTo(renderPoints[index].x, renderPoints[index].y);
    }
    context.closePath();

    context.fillStyle = "rgba(220, 38, 38, 0.28)";
    context.fill();
    context.strokeStyle = "rgba(239, 68, 68, 0.95)";
    context.lineWidth = Math.max(2, Math.round(renderWidth * 0.003));
    context.stroke();

    const edgeLengthsFeet = calculateEdgeLengthsFeet(polygonPoints, centerLat, zoom);

    context.font = `${Math.max(14, Math.round(renderWidth * 0.015))}px sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";

    renderPoints.forEach((point, index) => {
      const nextPoint = renderPoints[(index + 1) % renderPoints.length];
      const midX = (point.x + nextPoint.x) / 2;
      const midY = (point.y + nextPoint.y) / 2;
      const labelText = `${edgeLengthsFeet[index]?.toFixed(1) || "0.0"} ft`;

      const paddingX = 12;
      const labelWidth = Math.max(72, context.measureText(labelText).width + paddingX * 2);
      const labelHeight = 24;
      const labelX = clamp(midX - labelWidth / 2, 8, renderWidth - labelWidth - 8);
      const labelY = clamp(midY - labelHeight / 2, 8, renderHeight - labelHeight - 8);

      context.fillStyle = "rgba(15, 23, 42, 0.84)";
      drawRoundedRect(context, labelX, labelY, labelWidth, labelHeight, 7);
      context.fill();

      context.fillStyle = "#f8fafc";
      context.fillText(labelText, labelX + labelWidth / 2, labelY + labelHeight / 2 + 0.5);
    });

    renderPoints.forEach((point) => {
      context.beginPath();
      context.arc(point.x, point.y, 7.5, 0, Math.PI * 2);
      context.fillStyle = "#2563eb";
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = "#ffffff";
      context.stroke();
    });
  }

  context.fillStyle = "rgba(15, 23, 42, 0.85)";
  drawRoundedRect(context, 14, 14, 270, 30, 8);
  context.fill();
  context.font = `${Math.max(13, Math.round(renderWidth * 0.013))}px sans-serif`;
  context.fillStyle = "#e2e8f0";
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText("Measured Roof Polygon Overlay", 26, 29);

  return canvas.toDataURL("image/jpeg", 0.92);
}

function addFooter(
  doc: jsPDF,
  pageNumber: number,
  totalPages: number,
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setDrawColor(226, 232, 240);
  doc.line(36, pageHeight - 28, pageWidth - 36, pageHeight - 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Page ${pageNumber} of ${totalPages}`, 40, pageHeight - 15);

  doc.setTextColor(30, 64, 175);
  doc.setFont("helvetica", "bold");
  doc.text("Powered By Zodo", pageWidth - 40, pageHeight - 15, { align: "right" });
}

export async function generateRoofProposalPdf(input: RoofProposalPdfInput): Promise<string> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let cursorY = 46;

  const companyName = input.companyName.trim() || "Your Roofing Company";
  const recipientName = input.recipient.name.trim() || "Recipient";
  const recipientLabel = input.recipient.type === "lead" ? "Lead" : "Client";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
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
        recipientLabel,
        recipientName,
        `${recipientLabel} Company`,
        input.recipient.company || "-",
      ],
      [
        `${recipientLabel} Email`,
        input.recipient.email || "-",
        `${recipientLabel} Phone`,
        input.recipient.phone || "-",
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
      ["Polygon Area (px squared)", input.metrics.pixelArea.toFixed(1)],
      ["Price per sq ft", toMoney(input.metrics.pricePerSqft)],
      [
        "Calculation",
        `${input.metrics.roofAreaSqft.toFixed(1)} sq ft x ${toMoney(input.metrics.pricePerSqft)}`,
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

  let textY = (doc as any).lastAutoTable.finalY + 18;
  const textWidth = pageWidth - margin * 2;

  const printParagraph = (title: string, text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    if (textY > 700) {
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
    const wrapped = doc.splitTextToSize(cleanText, textWidth);
    doc.text(wrapped, margin, textY);
    textY += wrapped.length * 11 + 10;
  };

  printParagraph("Scope of Work", input.scopeOfWork || "");
  printParagraph("Internal Notes", input.internalNotes || "");
  printParagraph("Terms & Conditions", input.termsAndConditions || "");

  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Roof Measurement Overlay", margin, 44);

  let overlayFailureMessage = "";
  let overlayDataUrl = "";

  if (input.satelliteImageUrl) {
    try {
      overlayDataUrl = await buildAnnotatedRoofImageDataUrl({
        imageUrl: input.satelliteImageUrl,
        polygonPoints: input.polygonPoints,
        imageWidth: input.metrics.imageWidth,
        imageHeight: input.metrics.imageHeight,
        centerLat: input.property.latitude,
        zoom: input.metrics.zoom,
      });
    } catch (error: any) {
      overlayFailureMessage =
        error?.message ||
        "Unable to render overlay image in PDF (possible image CORS restriction).";
    }
  } else {
    overlayFailureMessage = "No satellite image URL was provided for the overlay.";
  }

  const imageBoxWidth = pageWidth - margin * 2;
  const imageAspectRatio =
    input.metrics.imageWidth > 0 && input.metrics.imageHeight > 0
      ? input.metrics.imageHeight / input.metrics.imageWidth
      : 1;
  const imageBoxHeight = Math.min(470, Math.round(imageBoxWidth * imageAspectRatio));

  if (overlayDataUrl) {
    doc.addImage(overlayDataUrl, "JPEG", margin, 58, imageBoxWidth, imageBoxHeight, undefined, "FAST");
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(220, 38, 38);
    doc.text(overlayFailureMessage, margin, 78);
  }

  const edgeRows = calculateEdgeLengthsFeet(
    input.polygonPoints,
    input.property.latitude,
    input.metrics.zoom,
  ).map((length, index) => [`Edge ${index + 1}`, `${length.toFixed(1)} ft`]);

  const edgeTableStartY = overlayDataUrl ? 58 + imageBoxHeight + 12 : 98;
  autoTable(doc, {
    startY: edgeTableStartY,
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
    head: [["Edge Segment", "Length"]],
    body: edgeRows.length > 0 ? edgeRows : [["N/A", "0.0 ft"]],
  });

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

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    addFooter(doc, page, totalPages);
  }

  const filename = safeFileName(`${input.proposalNumber || "roof-proposal"}.pdf`);
  doc.save(filename);
  return filename;
}
