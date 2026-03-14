// PDF Report Generator for Roof Estimates
// Uses jspdf + jspdf-autotable to create branded PDF reports

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportData {
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
  // Materials
  shingleType: string;
  shinglePricePerSq: number;
  underlaymentCost: number;
  iceWaterShieldCost: number;
  ridgeCapCost: number;
  starterStripCost: number;
  flashingCostWizard: number;
  ventCostWizard: number;
  nailsAccessoriesCost: number;
  totalMaterialCost: number;
  otherMaterials?: { name: string; cost: number }[];
  // Labor
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
  // Profit
  overheadPercent: number;
  profitMarginPercent: number;
  taxPercent: number;
  overheadAmount: number;
  profitAmount: number;
  taxAmount: number;
  finalEstimatePrice: number;
  // Meta
  estimateId: string;
  clientName?: string;
  createdAt: string;
}

const fmt = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Load image as base64 data URL
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
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

export async function generateEstimatePDF(data: ReportData): Promise<Blob> {
  const doc = new jsPDF("p", "mm", "letter");
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = 15;

  // Colors
  const teal = [8, 145, 178] as [number, number, number];
  const dark = [15, 23, 42] as [number, number, number];
  const gray = [100, 116, 139] as [number, number, number];
  const lightBg = [248, 250, 252] as [number, number, number];

  // ── Logo ────────────────────────────────────────
  try {
    const logoUrl = `${window.location.origin}/assets/zodo-logo.png`;
    const logoData = await loadImageAsBase64(logoUrl);
    if (logoData) {
      doc.addImage(logoData, "PNG", margin, y, 36, 14);
    }
  } catch { /* skip logo */ }

  // Company info (right side)
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text("ZODO - One Stop Solution", pageW - margin, y + 4, { align: "right" });
  doc.text("crm.zodo.ca", pageW - margin, y + 8, { align: "right" });
  y += 20;

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
  y += 5;
  if (data.clientName) {
    doc.text(`Client: ${data.clientName}`, margin, y);
    y += 5;
  }
  doc.text(`Address: ${data.address}`, margin, y);
  y += 8;

  // ── Satellite image ─────────────────────────────
  if (data.satelliteImageUrl) {
    try {
      const satImg = await loadImageAsBase64(data.satelliteImageUrl);
      if (satImg) {
        const imgW = contentW;
        const imgH = 55;
        doc.setFillColor(...lightBg);
        doc.roundedRect(margin, y, imgW, imgH, 2, 2, "F");
        doc.addImage(satImg, "JPEG", margin + 1, y + 1, imgW - 2, imgH - 2);
        y += imgH + 4;
      }
    } catch { /* skip satellite */ }
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
    ["Waste", `${data.wastePercent}%`],
    ["Confidence", data.confidence ? `${data.confidence.toFixed(0)}%` : "N/A"],
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

  // ── Materials Table ─────────────────────────────
  const matRows: (string | number)[][] = [
    ["Shingles (" + data.shingleType + ")", fmt(data.shinglePricePerSq)],
    ["Underlayment", fmt(data.underlaymentCost)],
    ["Ice & Water Shield", fmt(data.iceWaterShieldCost)],
    ["Ridge Cap", fmt(data.ridgeCapCost)],
    ["Starter Strip", fmt(data.starterStripCost)],
    ["Flashing", fmt(data.flashingCostWizard)],
    ["Vents", fmt(data.ventCostWizard)],
    ["Nails & Accessories", fmt(data.nailsAccessoriesCost)],
  ];
  if (data.otherMaterials?.length) {
    data.otherMaterials.forEach((m) => {
      if (m.name && m.cost) matRows.push([m.name, fmt(m.cost)]);
    });
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Material", "Cost"]],
    body: matRows,
    foot: [["Total Materials", fmt(data.totalMaterialCost)]],
    headStyles: { fillColor: teal, fontSize: 9, fontStyle: "bold" },
    footStyles: { fillColor: [230, 247, 250], textColor: teal, fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: "grid",
    styles: { cellPadding: 3 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Labor Table ─────────────────────────────────
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Labor Detail", "Value"]],
    body: [
      ["Number of Workers", String(data.numberOfLaborers)],
      ["Days Required", String(data.daysRequired)],
      ["Rate per Worker / Day", fmt(data.laborRatePerWorker)],
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

  // Check if we need a new page for the summary
  if (y > 200) {
    doc.addPage();
    y = 20;
  }

  // ── Final Summary Box ───────────────────────────
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

  // ── Footer ──────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(...gray);
  doc.text(
    "This estimate is valid for 30 days from the date of issue. Prices may vary based on material availability and site conditions.",
    pageW / 2, pageH - 12,
    { align: "center" }
  );
  doc.text(
    `Generated by ZODO CRM • crm.zodo.ca • ${dateStr}`,
    pageW / 2, pageH - 7,
    { align: "center" }
  );

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
