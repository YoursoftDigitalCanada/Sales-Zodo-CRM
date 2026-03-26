import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface EstimateSummaryBranding {
  companyName: string;
  companyLogoUrl?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyAddress?: string | null;
}

interface EstimateSummaryPhoto {
  label: string;
  url: string;
}

export interface EstimateSummaryPdfInput {
  estimateNumber: string;
  createdAt: string;
  branding: EstimateSummaryBranding;
  client: {
    name: string;
    company?: string;
    email?: string;
    phone?: string;
  };
  property: {
    address: string;
    roofAreaSqft: number;
    roofSquares: number;
    pitch: string;
    roofType: string;
    stories: number;
    layers: number;
    shingleType: string;
  };
  pricing: {
    materials: number;
    labor: number;
    equipment: number;
    overheadLabel: string;
    overheadAmount: number;
    profitLabel: string;
    profitAmount: number;
    taxLabel: string;
    taxAmount: number;
    total: number;
    pricePerSquare: number;
  };
  imagery?: {
    orthoUrl?: string;
    obliqueImages?: EstimateSummaryPhoto[];
  };
  notes?: string;
}

export interface EstimateSummaryPdfResult {
  fileName: string;
  blob: Blob;
}

const money = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function loadImageAsBase64(url?: string | null): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:image/")) return url;

  try {
    const response = await fetch(url, { mode: "cors" });
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function getImageFormat(dataUrl: string): "JPEG" | "PNG" | "WEBP" {
  const mimeType = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);/i)?.[1]?.toLowerCase();
  if (mimeType === "png") return "PNG";
  if (mimeType === "webp") return "WEBP";
  return "JPEG";
}

function safeFileName(value: string): string {
  const normalized = value.trim() || "estimate-summary";
  return normalized.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export async function buildEstimateSummaryPdf(input: EstimateSummaryPdfInput): Promise<EstimateSummaryPdfResult> {
  const doc = new jsPDF("p", "mm", "letter");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  const slate = [15, 23, 42] as [number, number, number];
  const muted = [100, 116, 139] as [number, number, number];
  const border = [226, 232, 240] as [number, number, number];
  const blue = [30, 64, 175] as [number, number, number];
  const aqua = [8, 145, 178] as [number, number, number];
  const light = [248, 250, 252] as [number, number, number];

  let y = 16;

  const drawContainedImage = (imageData: string, x: number, yPos: number, maxWidth: number, maxHeight: number) => {
    const props = doc.getImageProperties(imageData);
    const scale = Math.min(maxWidth / props.width, maxHeight / props.height);
    const renderWidth = props.width * scale;
    const renderHeight = props.height * scale;
    const offsetX = x + ((maxWidth - renderWidth) / 2);
    const offsetY = yPos + ((maxHeight - renderHeight) / 2);
    doc.addImage(imageData, getImageFormat(imageData), offsetX, offsetY, renderWidth, renderHeight);
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 18) {
      doc.addPage();
      y = 16;
    }
  };

  const logoData = await loadImageAsBase64(input.branding.companyLogoUrl || null);

  doc.setFillColor(...light);
  doc.roundedRect(margin, y, contentWidth, 28, 4, 4, "F");
  doc.setDrawColor(...border);
  doc.roundedRect(margin, y, contentWidth, 28, 4, 4, "S");

  if (logoData) {
    drawContainedImage(logoData, margin + 4, y + 4, 30, 20);
  }

  doc.setTextColor(...slate);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(input.branding.companyName || "ZODO CRM", logoData ? margin + 38 : margin + 6, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const contactLines = [
    input.branding.companyPhone || "",
    input.branding.companyEmail || "",
    input.branding.companyAddress || "",
  ].filter(Boolean);
  if (contactLines.length > 0) {
    doc.setTextColor(...muted);
    doc.text(contactLines, pageWidth - margin - 2, y + 6, { align: "right" });
  }
  y += 36;

  doc.setFillColor(...blue);
  doc.roundedRect(margin, y, contentWidth, 24, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("ESTIMATE SUMMARY", margin + 6, y + 9);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Estimate #${input.estimateNumber}`, margin + 6, y + 16);
  doc.text(
    new Date(input.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    pageWidth - margin - 6,
    y + 16,
    { align: "right" },
  );
  y += 30;

  doc.setFillColor(...aqua);
  doc.roundedRect(margin, y, contentWidth, 22, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Exact Estimated Amount", margin + 6, y + 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(money(input.pricing.total), pageWidth - margin - 6, y + 14, { align: "right" });
  y += 28;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: {
      fontSize: 8.5,
      textColor: slate,
      cellPadding: 4,
      lineColor: border,
      lineWidth: 0.4,
    },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: "bold" },
      1: { cellWidth: 60 },
      2: { cellWidth: 30, fontStyle: "bold" },
      3: { cellWidth: 60 },
    },
    body: [
      ["Client", input.client.name || "—", "Company", input.client.company || "—"],
      ["Email", input.client.email || "—", "Phone", input.client.phone || "—"],
      ["Property", input.property.address, "Shingle", input.property.shingleType || "—"],
      ["Roof Area", `${input.property.roofAreaSqft.toLocaleString()} sq ft`, "Squares", input.property.roofSquares.toFixed(1)],
      ["Pitch", input.property.pitch || "—", "Roof Type", input.property.roofType || "—"],
      ["Stories", String(input.property.stories || 1), "Layers", String(input.property.layers || 1)],
    ],
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  autoTable(doc, {
    startY: y,
    theme: "striped",
    styles: {
      fontSize: 9,
      textColor: slate,
      cellPadding: 4,
      lineColor: border,
      lineWidth: 0.4,
    },
    headStyles: {
      fillColor: slate,
      textColor: [248, 250, 252],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.65 },
      1: { cellWidth: contentWidth * 0.35, halign: "right" },
    },
    head: [["Cost Breakdown", "Amount"]],
    body: [
      ["Materials", money(input.pricing.materials)],
      ["Labor", money(input.pricing.labor)],
      ["Equipment & Extras", money(input.pricing.equipment)],
      [input.pricing.overheadLabel, money(input.pricing.overheadAmount)],
      [input.pricing.profitLabel, money(input.pricing.profitAmount)],
      [input.pricing.taxLabel, money(input.pricing.taxAmount)],
      ["Price per Square", money(input.pricing.pricePerSquare)],
      ["Total Estimate", money(input.pricing.total)],
    ],
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.row.index === 7) {
        hookData.cell.styles.fontStyle = "bold";
        hookData.cell.styles.fillColor = [239, 246, 255];
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  const orthoUrl = input.imagery?.orthoUrl;
  const obliqueImages = Array.isArray(input.imagery?.obliqueImages) ? input.imagery?.obliqueImages.slice(0, 4) : [];
  if (orthoUrl || obliqueImages.length > 0) {
    ensureSpace(110);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...slate);
    doc.text("Property Imagery", margin, y);
    y += 5;

    if (orthoUrl) {
      const orthoData = await loadImageAsBase64(orthoUrl);
      if (orthoData) {
        doc.setFillColor(...light);
        doc.setDrawColor(...border);
        doc.roundedRect(margin, y, contentWidth, 56, 4, 4, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...muted);
        doc.text("Ortho View", margin + 4, y + 6);
        drawContainedImage(orthoData, margin + 3, y + 9, contentWidth - 6, 44);
        y += 62;
      }
    }

    if (obliqueImages.length > 0) {
      const cardGap = 4;
      const cardWidth = (contentWidth - cardGap) / 2;
      const cardHeight = 38;
      const imageEntries = await Promise.all(obliqueImages.map(async (image) => ({
        label: image.label,
        imageData: await loadImageAsBase64(image.url),
      })));

      imageEntries.forEach((entry, index) => {
        const row = Math.floor(index / 2);
        const col = index % 2;
        const x = margin + (col * (cardWidth + cardGap));
        const yOffset = y + (row * (cardHeight + cardGap));
        doc.setFillColor(...light);
        doc.setDrawColor(...border);
        doc.roundedRect(x, yOffset, cardWidth, cardHeight, 3, 3, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...muted);
        doc.text(entry.label, x + 3, yOffset + 5);
        if (entry.imageData) {
          drawContainedImage(entry.imageData, x + 2, yOffset + 7, cardWidth - 4, cardHeight - 9);
        }
      });

      y += Math.ceil(obliqueImages.length / 2) * (cardHeight + cardGap);
    }
  }

  if (input.notes?.trim()) {
    ensureSpace(26);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...slate);
    doc.text("Notes", margin, y + 3);
    y += 9;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...muted);
    const noteLines = doc.splitTextToSize(input.notes.trim(), contentWidth);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4.2 + 2;
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text(
      `${input.branding.companyName || "ZODO CRM"} • Estimate #${input.estimateNumber}`,
      margin,
      pageHeight - 10,
    );
    doc.text(
      `Page ${page} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: "right" },
    );
  }

  const fileName = `${safeFileName(input.estimateNumber || "estimate-summary")}.pdf`;
  return {
    fileName,
    blob: doc.output("blob") as Blob,
  };
}

