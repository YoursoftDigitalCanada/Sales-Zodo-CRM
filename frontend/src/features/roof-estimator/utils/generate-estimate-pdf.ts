// PDF Report Generator for Roof Estimates
// Uses jspdf + jspdf-autotable to create branded PDF reports

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface OtherMaterialPdf {
  name: string;
  qty: number;
  cost: number;
}

interface EstimatePhotoPdf {
  label: string;
  url: string;
}

interface EstimateBrandingPdf {
  companyName?: string | null;
  companyLogoUrl?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
  companyAddress?: string | null;
  companyDomain?: string | null;
}

interface ReportData {
  // Client / Lead
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCompany?: string;
  sourceType?: "client" | "lead" | "manual";

  // Property
  address: string;
  roofAreaSqft: number;
  pitch: string;
  roofType: string;
  stories: number;
  layers: number;
  wastePercent: number;
  measurementSource: string;
  tearOffRequired: boolean;
  confidence: number;
  satelliteImageUrl: string;
  photoUrls?: Array<string | EstimatePhotoPdf>;

  // Materials (qty × unit price)
  shingleType: string;
  shingleQty: number;
  shinglePricePerSq: number;
  underlaymentQty: number;
  underlaymentCost: number;
  iceWaterShieldQty: number;
  iceWaterShieldCost: number;
  ridgeCapQty: number;
  ridgeCapCost: number;
  starterStripQty: number;
  starterStripCost: number;
  flashingQty: number;
  flashingCostWizard: number;
  ventQty: number;
  ventCostWizard: number;
  nailsAccessoriesQty: number;
  nailsAccessoriesCost: number;
  totalMaterialCost: number;
  otherMaterials?: OtherMaterialPdf[];

  // Labor
  laborCostPerSquare: number;
  numberOfLaborers: number;
  daysRequired: number;
  laborRatePerWorker: number;
  totalLaborCost: number;

  // Equipment
  dumpsterCost: number;
  permitCost: number;
  deliveryFee: number;
  equipmentRentalCost: number;
  disposalFee: number;
  totalEquipmentCost: number;

  // Profit / Overhead / Tax
  overheadPercent: number;
  profitMarginPercent: number;
  taxPercent: number;
  overheadAmount: number;
  profitAmount: number;
  taxAmount: number;
  finalEstimatePrice: number;

  // Meta
  estimateId: string;
  createdAt: string;
  notes?: string;
  branding?: EstimateBrandingPdf;
}

const fmt = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const DEFAULT_OBLIQUE_VIEW_LABELS = ["North View", "East View", "South View", "West View"] as const;

// Load image as base64 data URL
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    if (url.startsWith("data:image/")) {
      return url;
    }

    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function normalizeReportPhotos(photos?: Array<string | EstimatePhotoPdf>): EstimatePhotoPdf[] {
  return (Array.isArray(photos) ? photos : [])
    .map((photo, index) => {
      if (typeof photo === "string") {
        const url = photo.trim();
        if (!url) return null;
        return {
          label: DEFAULT_OBLIQUE_VIEW_LABELS[index] || `View ${index + 1}`,
          url,
        } satisfies EstimatePhotoPdf;
      }

      if (!photo || typeof photo !== "object") return null;
      const label = String(photo.label || "").trim();
      const url = String(photo.url || "").trim();
      if (!url) return null;

      return {
        label: label || DEFAULT_OBLIQUE_VIEW_LABELS[index] || `View ${index + 1}`,
        url,
      } satisfies EstimatePhotoPdf;
    })
    .filter((photo): photo is EstimatePhotoPdf => Boolean(photo));
}

function getImageFormat(dataUrl: string): "JPEG" | "PNG" | "WEBP" {
  const mimeType = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);/i)?.[1]?.toLowerCase();
  if (mimeType === "png") return "PNG";
  if (mimeType === "webp") return "WEBP";
  return "JPEG";
}

export async function generateEstimatePDF(data: ReportData): Promise<Blob> {
  const doc = new jsPDF("p", "mm", "letter");
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = 15;

  // Colors
  const teal = [8, 145, 178] as [number, number, number];
  const dark = [15, 23, 42] as [number, number, number];
  const gray = [100, 116, 139] as [number, number, number];
  const lightBg = [248, 250, 252] as [number, number, number];
  const companyName = data.branding?.companyName?.trim() || "ZODO CRM";
  const companyInfoLines = [
    data.branding?.companyEmail?.trim(),
    data.branding?.companyPhone?.trim(),
    data.branding?.companyAddress?.trim(),
    data.branding?.companyDomain?.trim(),
  ].filter((value): value is string => Boolean(value));

  // Helper: check if we need a new page
  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 20) {
      doc.addPage();
      y = 15;
    }
  };

  const drawContainedImage = (imageData: string, x: number, yPos: number, maxWidth: number, maxHeight: number) => {
    const imageProps = doc.getImageProperties(imageData);
    const scale = Math.min(maxWidth / imageProps.width, maxHeight / imageProps.height);
    const renderWidth = imageProps.width * scale;
    const renderHeight = imageProps.height * scale;
    const offsetX = x + ((maxWidth - renderWidth) / 2);
    const offsetY = yPos + ((maxHeight - renderHeight) / 2);

    doc.addImage(imageData, getImageFormat(imageData), offsetX, offsetY, renderWidth, renderHeight);
  };

  const drawImageCard = async (
    label: string,
    imageUrl: string,
    x: number,
    yPos: number,
    width: number,
    height: number,
  ) => {
    doc.setFillColor(...lightBg);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, yPos, width, height, 2, 2, "FD");

    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.setFont("helvetica", "bold");
    doc.text(label, x + 4, yPos + 6);
    doc.setFont("helvetica", "normal");

    const imageData = await loadImageAsBase64(imageUrl);
    if (!imageData) {
      doc.setFontSize(8);
      doc.setTextColor(...gray);
      doc.text("Image unavailable", x + width / 2, yPos + (height / 2), { align: "center" });
      return;
    }

    drawContainedImage(imageData, x + 3, yPos + 9, width - 6, height - 12);
  };

  // ── Logo ────────────────────────────────────────
  try {
    const logoUrl = data.branding?.companyLogoUrl || "";
    const logoData = await loadImageAsBase64(logoUrl);
    if (logoData) {
      drawContainedImage(logoData, margin, y, 36, 14);
    }
  } catch { /* skip logo */ }

  // Company info (right side)
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.setFont("helvetica", "bold");
  doc.text(companyName, pageW - margin, y + 4, { align: "right" });
  doc.setFont("helvetica", "normal");
  companyInfoLines.slice(0, 3).forEach((line, index) => {
    doc.text(line, pageW - margin, y + 8 + (index * 4), { align: "right" });
  });
  y += Math.max(20, 12 + companyInfoLines.slice(0, 3).length * 4);

  // ── Header bar ──────────────────────────────────
  doc.setFillColor(...teal);
  doc.roundedRect(margin, y, contentW, 14, 2, 2, "F");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("ROOF ESTIMATE REPORT", margin + 6, y + 9.5);
  y += 20;

  // ── Estimate info ───────────────────────────────
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  const dateStr = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  doc.text(`Estimate ID: ${data.estimateId.slice(0, 8).toUpperCase()}`, margin, y);
  doc.text(`Date: ${dateStr}`, pageW - margin, y, { align: "right" });
  y += 7;

  // ── Client / Lead Information ───────────────────
  const hasClientInfo = data.clientName || data.clientEmail || data.clientPhone || data.clientCompany;
  if (hasClientInfo) {
    doc.setFillColor(...lightBg);
    doc.roundedRect(margin, y, contentW, 24, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentW, 24, 2, 2, "S");

    doc.setFontSize(10);
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    const sourceLabel = data.sourceType === "lead" ? "Lead" : data.sourceType === "client" ? "Client" : "Contact";
    doc.text(`${sourceLabel} Information`, margin + 4, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    // Left column
    let infoY = y + 12;
    if (data.clientName) {
      doc.setTextColor(...gray);
      doc.text("Name:", margin + 4, infoY);
      doc.setTextColor(...dark);
      doc.setFont("helvetica", "bold");
      doc.text(data.clientName, margin + 20, infoY);
      doc.setFont("helvetica", "normal");
    }
    if (data.clientCompany) {
      doc.setTextColor(...gray);
      doc.text("Company:", margin + 4, infoY + 5);
      doc.setTextColor(...dark);
      doc.text(data.clientCompany, margin + 26, infoY + 5);
    }

    // Right column
    const rightX = margin + contentW / 2;
    if (data.clientEmail) {
      doc.setTextColor(...gray);
      doc.text("Email:", rightX, infoY);
      doc.setTextColor(...dark);
      doc.text(data.clientEmail, rightX + 16, infoY);
    }
    if (data.clientPhone) {
      doc.setTextColor(...gray);
      doc.text("Phone:", rightX, infoY + 5);
      doc.setTextColor(...dark);
      doc.text(data.clientPhone, rightX + 16, infoY + 5);
    }

    y += 28;
  }

  // ── Address ─────────────────────────────────────
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text(`Property Address: `, margin, y);
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.text(data.address, margin + 32, y);
  doc.setFont("helvetica", "normal");
  y += 6;

  // ── EagleView Image Section ─────────────────────
  const obliqueImages = normalizeReportPhotos(data.photoUrls);
  if (data.satelliteImageUrl || obliqueImages.length > 0) {
    ensureSpace(data.satelliteImageUrl && obliqueImages.length > 0 ? 170 : 105);

    doc.setFontSize(10);
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.text("EagleView Imagery", margin, y);
    doc.setFont("helvetica", "normal");
    y += 6;

    if (data.satelliteImageUrl) {
      await drawImageCard("Ortho View", data.satelliteImageUrl, margin, y, contentW, 76);
      y += 82;
    }

    if (obliqueImages.length > 0) {
      const imageGap = 4;
      const cardWidth = (contentW - imageGap) / 2;
      const cardHeight = 48;

      for (let index = 0; index < obliqueImages.length; index += 1) {
        if (index > 0 && index % 4 === 0) {
          y += 2 * (cardHeight + imageGap) + 4;
          ensureSpace(108);
        }

        const row = Math.floor((index % 4) / 2);
        const col = index % 2;
        const x = margin + (col * (cardWidth + imageGap));
        const yOffset = y + (row * (cardHeight + imageGap));
        const image = obliqueImages[index];
        await drawImageCard(image.label, image.url, x, yOffset, cardWidth, cardHeight);
      }

      y += (Math.ceil(Math.min(obliqueImages.length, 4) / 2) * (48 + 4));
    }

    doc.setFontSize(7);
    doc.setTextColor(...gray);
    const srcLabel = data.measurementSource === "eagleview" ? "EagleView" :
      data.measurementSource === "ai_satellite" ? "AI Satellite" :
      data.measurementSource === "ai_segmented" ? "AI Segmented" : "Satellite";
    doc.text(`Source: ${srcLabel} | Confidence: ${data.confidence ? `${data.confidence.toFixed(0)}%` : "N/A"}`, margin, y + 1);
    y += 7;
  }

  // ── Property Details ────────────────────────────
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, y, contentW, 28, 2, 2, "F");
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.text("Property Details", margin + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const roofSq = data.roofAreaSqft / 100;
  const details = [
    ["Roof Area", `${data.roofAreaSqft.toLocaleString()} sq ft`],
    ["Roof Squares", roofSq.toFixed(1)],
    ["Pitch", data.pitch],
    ["Roof Type", data.roofType?.charAt(0).toUpperCase() + data.roofType?.slice(1)],
    ["Stories", String(data.stories)],
    ["Layers", String(data.layers)],
    ["Waste Factor", `${data.wastePercent}%`],
    ["Tear-Off", data.tearOffRequired ? "Yes" : "No"],
  ];

  const colW = contentW / 4;
  details.forEach((d, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const dx = margin + 4 + col * colW;
    const dy = y + 12 + row * 8;
    doc.setTextColor(...gray);
    doc.text(d[0], dx, dy);
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.text(d[1], dx + 24, dy);
    doc.setFont("helvetica", "normal");
  });
  y += 32;

  // ── Materials Table (Qty × Unit Price = Line Total) ──
  ensureSpace(60);

  type MatRow = [string, string, string, string];
  const matRows: MatRow[] = [];

  const addMatRow = (name: string, qty: number, unitPrice: number) => {
    const line = qty * unitPrice;
    if (unitPrice > 0 || qty > 1) {
      matRows.push([name, String(qty), fmt(unitPrice), fmt(line)]);
    }
  };

  addMatRow(`Shingles (${data.shingleType})`, data.shingleQty || 1, data.shinglePricePerSq);
  addMatRow("Underlayment", data.underlaymentQty || 1, data.underlaymentCost);
  addMatRow("Ice & Water Shield", data.iceWaterShieldQty || 1, data.iceWaterShieldCost);
  addMatRow("Ridge Cap", data.ridgeCapQty || 1, data.ridgeCapCost);
  addMatRow("Starter Strip", data.starterStripQty || 1, data.starterStripCost);
  addMatRow("Flashing", data.flashingQty || 1, data.flashingCostWizard);
  addMatRow("Vents", data.ventQty || 1, data.ventCostWizard);
  addMatRow("Nails & Accessories", data.nailsAccessoriesQty || 1, data.nailsAccessoriesCost);

  if (data.otherMaterials?.length) {
    data.otherMaterials.forEach((m) => {
      if (m.name && (m.cost > 0 || m.qty > 1)) {
        matRows.push([m.name, String(m.qty || 1), fmt(m.cost), fmt((m.qty || 1) * m.cost)]);
      }
    });
  }

  // If all prices are 0, show at least the header
  if (matRows.length === 0) {
    matRows.push(["No materials entered", "-", "-", "$0.00"]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Material", "Qty", "Unit Price", "Line Total"]],
    body: matRows,
    foot: [["Total Materials", "", "", fmt(data.totalMaterialCost)]],
    headStyles: { fillColor: teal, fontSize: 9, fontStyle: "bold" },
    footStyles: { fillColor: [230, 247, 250], textColor: teal, fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 35, halign: "right", fontStyle: "bold" },
    },
    theme: "grid",
    styles: { cellPadding: 3 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Labor Table ─────────────────────────────────
  ensureSpace(40);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Labor Detail", "Value"]],
    body: [
      ["Number of Workers", String(data.numberOfLaborers)],
      ["Days Required", String(data.daysRequired)],
      ["Rate per Worker / Day", fmt(data.laborRatePerWorker)],
      ...(data.laborCostPerSquare > 0 ? [["Cost per Square", fmt(data.laborCostPerSquare)]] : []),
    ],
    foot: [["Total Labor", fmt(data.totalLaborCost)]],
    headStyles: { fillColor: teal, fontSize: 9, fontStyle: "bold" },
    footStyles: { fillColor: [230, 247, 250], textColor: teal, fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: "grid",
    styles: { cellPadding: 3 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Equipment Table ─────────────────────────────
  const equipRows = [
    ["Dumpster", fmt(data.dumpsterCost)],
    ["Permit", fmt(data.permitCost)],
    ["Delivery Fee", fmt(data.deliveryFee)],
    ["Equipment Rental", fmt(data.equipmentRentalCost)],
    ["Disposal Fee", fmt(data.disposalFee)],
  ].filter((r) => parseFloat(String(r[1]).replace(/[$,]/g, "")) > 0);

  if (equipRows.length > 0) {
    ensureSpace(40);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Equipment / Extras", "Cost"]],
      body: equipRows,
      foot: [["Total Equipment", fmt(data.totalEquipmentCost)]],
      headStyles: { fillColor: teal, fontSize: 9, fontStyle: "bold" },
      footStyles: { fillColor: [230, 247, 250], textColor: teal, fontSize: 9, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: "grid",
      styles: { cellPadding: 3 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Final Summary Box ───────────────────────────
  ensureSpace(65);
  const subtotal = data.totalMaterialCost + data.totalLaborCost + data.totalEquipmentCost;

  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, y, contentW, 52, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...dark);
  doc.text("ESTIMATE SUMMARY", margin + 4, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const summaryRows = [
    ["Subtotal (Materials + Labor + Extras)", fmt(subtotal)],
    [`Overhead (${data.overheadPercent}%)`, fmt(data.overheadAmount)],
    [`Profit Margin (${data.profitMarginPercent}%)`, fmt(data.profitAmount)],
    [`Tax (${data.taxPercent}%)`, fmt(data.taxAmount)],
  ];

  summaryRows.forEach((r, i) => {
    const ry = y + 14 + i * 6;
    doc.setTextColor(...gray);
    doc.text(r[0], margin + 6, ry);
    doc.setTextColor(...dark);
    doc.text(r[1], pageW - margin - 6, ry, { align: "right" });
  });

  // Divider line
  const divY = y + 38;
  doc.setDrawColor(...teal);
  doc.setLineWidth(0.8);
  doc.line(margin + 4, divY, pageW - margin - 4, divY);

  // Final price
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...teal);
  doc.text("TOTAL ESTIMATE", margin + 6, divY + 8);
  doc.text(fmt(data.finalEstimatePrice), pageW - margin - 6, divY + 8, { align: "right" });
  y += 58;

  // Price per square
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  const pricePer = roofSq > 0 ? data.finalEstimatePrice / roofSq : 0;
  doc.text(`Price per square: ${fmt(pricePer)} | ${roofSq.toFixed(1)} roof squares`, margin + 6, y);
  y += 10;

  // ── Notes ───────────────────────────────────────
  if (data.notes && data.notes.trim()) {
    ensureSpace(25);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    doc.text("Notes", margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    const noteLines = doc.splitTextToSize(data.notes, contentW - 8);
    doc.text(noteLines, margin + 2, y);
    y += noteLines.length * 4 + 6;
  }

  // ── Footer ──────────────────────────────────────
  // Add footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(...gray);
    doc.text(
      "This estimate is valid for 30 days from the date of issue. Prices may vary based on material availability and site conditions.",
      pageW / 2, pageH - 12,
      { align: "center" }
    );
    const footerBrandLine = [
      companyName,
      data.branding?.companyDomain?.trim() || "",
      data.branding?.companyEmail?.trim() || "",
    ].filter(Boolean).join(" • ");
    doc.text(
      `${footerBrandLine || companyName} • ${dateStr}`,
      pageW / 2, pageH - 7,
      { align: "center" }
    );
  }

  return doc.output("blob");
}

export function downloadPDFBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
