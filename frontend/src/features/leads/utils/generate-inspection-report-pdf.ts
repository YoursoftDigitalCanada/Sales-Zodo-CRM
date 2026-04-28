import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  fetchFileBlob,
  getFileById,
} from "@/features/files/services/files-service";
import type { InspectionEntity } from "@/features/leads/services/inspections-service";
import type { CompanyProfile } from "@/features/settings/services/settings-service";

export interface InspectionReportMeasurements {
  totalSquares: string;
  pitch: string;
  stories: string;
  predominant: string;
  hipRidge: string;
  valley: string;
  eavesRakes: string;
  flashing: string;
  gutters: string;
}

export interface InspectionReportDamageChecks {
  hail: boolean;
  wind: boolean;
  flashing: boolean;
  gutter: boolean;
  deck: boolean;
}

export interface InspectionReportRoofField {
  condition: string;
  hailSize: string;
  hitCount: string;
}

export interface InspectionReportFlashings {
  step: string;
  pipeBoots: string;
}

export interface InspectionReportRidgeHip {
  ridgeCap: string;
  hipShingles: string;
}

export interface InspectionReportGuttersState {
  condition: string;
  downspouts: string;
}

export interface InspectionReportVentilation {
  ridgeVent: boolean;
  soffitVent: boolean;
  boxVents: boolean;
  recommendation: string;
}

export interface InspectionReportDecking {
  condition: string;
  softSpots: string;
  replacementSq: string;
}

export interface InspectionReportSnapshot {
  inspectionId: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  inspectionDate?: string | null;
  inspectorName?: string | null;
  inspectionType?: string | null;
  weatherConditions?: string | null;
  accessMethod?: string | null;
  overallCondition?: string | null;
  overallDamageRating?: string | null;
  estimateStatus?: string | null;
  totalEstimate?: number | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerCompany?: string | null;
  propertyAddress?: string | null;
  insuranceCompany?: string | null;
  claimNumber?: string | null;
  measurementSource?: string | null;
  recommendation?: string | null;
  inspectorNotes?: string | null;
  customerFeedback?: string | null;
  internalNotes?: string | null;
  roofStyle?: string | null;
  ridgeLength?: number | null;
  valleyLength?: number | null;
  eaveLength?: number | null;
  rakeLength?: number | null;
  numberOfLayers?: number | null;
  deckingType?: string | null;
  deckingCondition?: string | null;
  underlaymentType?: string | null;
  ventilationType?: string | null;
  ventilationCount?: number | null;
  flashingCondition?: string | null;
  gutterCondition?: string | null;
  skylightCount?: number | null;
  skylightCondition?: string | null;
  chimneyPresent?: boolean | null;
  chimneyCondition?: string | null;
  soffitFasciaCondition?: string | null;
  dripEdgePresent?: boolean | null;
  dripEdgeCondition?: string | null;
  iceWaterShieldPresent?: boolean | null;
  stormDamageFound?: boolean | null;
  windDamageDetails?: string | null;
  hailDamageDetails?: string | null;
  hailSizeFound?: string | null;
  testSquareResults?: string | null;
  interiorDamageFound?: boolean | null;
  interiorDamageDetails?: string | null;
  photosTakenCount?: number | null;
  proposedMaterial?: string | null;
  shingleBrand?: string | null;
  shingleLine?: string | null;
  shingleColor?: string | null;
  underlaymentChoice?: string | null;
  ridgeCapType?: string | null;
  ventilationPlan?: string | null;
  dripEdgeColor?: string | null;
  warrantyType?: string | null;
  warrantyYears?: number | null;
  materialCost?: number | null;
  laborCost?: number | null;
  tearOffCost?: number | null;
  permitCost?: number | null;
  dumpsterCost?: number | null;
  miscCost?: number | null;
  subtotal?: number | null;
  overheadPercent?: number | null;
  profitPercent?: number | null;
  customerPrice?: number | null;
  depositRequired?: number | null;
  depositCollected?: boolean | null;
  paymentMethod?: string | null;
  tentativeStartDate?: string | null;
  estimatedDuration?: string | null;
  crewSize?: number | null;
  crewLeadName?: string | null;
  materialsOrdered?: boolean | null;
  materialsDeliveryDate?: string | null;
  permitPulled?: boolean | null;
  permitNumber?: string | null;
  dumpsterOrdered?: boolean | null;
  dumpsterDeliveryDate?: string | null;
  measurements: InspectionReportMeasurements;
  damageChecks: InspectionReportDamageChecks;
  roofField: InspectionReportRoofField;
  flashings: InspectionReportFlashings;
  ridgeHip: InspectionReportRidgeHip;
  guttersState: InspectionReportGuttersState;
  ventilation: InspectionReportVentilation;
  decking: InspectionReportDecking;
  photoFileIds: string[];
}

interface LoadedInspectionReportPhoto {
  name: string;
  previewUrl: string;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const FALLBACK_TEXT = "Not recorded";

function formatCurrency(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return FALLBACK_TEXT;
  return currencyFormatter.format(value);
}

function formatDate(value?: string | null): string {
  if (!value) return FALLBACK_TEXT;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null): string {
  if (!value) return FALLBACK_TEXT;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatValue(value?: string | number | null): string {
  if (value == null) return FALLBACK_TEXT;
  const text = String(value).trim();
  return text || FALLBACK_TEXT;
}

function formatBoolean(value: boolean): string {
  return value ? "Yes" : FALLBACK_TEXT;
}

function formatRecommendation(value?: string | null): string {
  if (!value) return FALLBACK_TEXT;
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getInspectionReportFileName(
  snapshot: Pick<InspectionReportSnapshot, "customerName" | "inspectionId">,
): string {
  const safeCustomer = slugify(snapshot.customerName || "");
  const inspectionSuffix = snapshot.inspectionId.slice(0, 8).toLowerCase();

  return safeCustomer
    ? `${safeCustomer}-inspection-report-${inspectionSuffix}.pdf`
    : `inspection-${inspectionSuffix}.pdf`;
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function hasReportValue(value?: string | null): boolean {
  if (value == null) return false;
  const normalized = value.trim();
  return normalized.length > 0 && normalized !== FALLBACK_TEXT;
}

function compactKeyValueRows(
  rows: Array<[string, string, string, string]>,
): Array<[string, string, string, string]> {
  return rows.flatMap(([leftLabel, leftValue, rightLabel, rightValue]) => {
    const normalized: Array<[string, string]> = [];

    if (hasReportValue(leftValue)) {
      normalized.push([leftLabel, leftValue]);
    }

    if (hasReportValue(rightValue)) {
      normalized.push([rightLabel, rightValue]);
    }

    if (normalized.length === 2) {
      return [[normalized[0][0], normalized[0][1], normalized[1][0], normalized[1][1]]];
    }

    if (normalized.length === 1) {
      return [[normalized[0][0], normalized[0][1], "", ""]];
    }

    return [];
  });
}

function getImageFormat(dataUrl: string): "JPEG" | "PNG" | "WEBP" {
  const mimeType = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);/i)?.[1]?.toLowerCase();
  if (mimeType === "png") return "PNG";
  if (mimeType === "webp") return "WEBP";
  return "JPEG";
}

async function loadInspectionPhotos(photoFileIds: string[]): Promise<LoadedInspectionReportPhoto[]> {
  const loadedPhotos = await Promise.all(
    photoFileIds.map(async (fileId, index) => {
      try {
        const [file, previewUrl] = await Promise.all([
          getFileById(fileId),
          fetchFileBlob(fileId),
        ]);

        return {
          name: file.originalName || file.name || `Inspection Photo ${index + 1}`,
          previewUrl,
        } satisfies LoadedInspectionReportPhoto;
      } catch {
        return null;
      }
    }),
  );

  return loadedPhotos.filter((photo): photo is LoadedInspectionReportPhoto => Boolean(photo));
}

function cleanupLoadedPhotos(photos: LoadedInspectionReportPhoto[]) {
  photos.forEach((photo) => {
    URL.revokeObjectURL(photo.previewUrl);
  });
}

function buildCompanyLines(companyProfile?: CompanyProfile | null): string[] {
  if (!companyProfile) return [];

  return [
    companyProfile.companyName?.trim(),
    companyProfile.address?.trim(),
    companyProfile.phone?.trim(),
    companyProfile.email?.trim(),
    companyProfile.domain?.trim(),
  ].filter((value): value is string => Boolean(value));
}

export function buildInspectionReportSnapshot(
  inspection: InspectionEntity,
  overrides: Partial<InspectionReportSnapshot> = {},
): InspectionReportSnapshot {
  const lead = inspection.lead;
  const client = inspection.client;
  const customerName = lead
    ? `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || lead.companyName || "Unknown Customer"
    : client?.clientName || client?.companyName || "Unknown Customer";
  const propertyAddress = lead
    ? [lead.propertyAddress, lead.city, lead.state, lead.zipCode].filter(Boolean).join(", ")
    : [client?.streetAddress, client?.city, client?.province, client?.postalCode].filter(Boolean).join(", ");
  const estimateStatus = overrides.estimateStatus ?? inspection.estimateStatus ?? null;
  const normalizedEstimateStatus = (estimateStatus || "").toLowerCase();

  return {
    inspectionId: inspection.id,
    createdAt: inspection.createdAt,
    updatedAt: inspection.updatedAt,
    inspectionDate: inspection.inspectionDate,
    inspectorName: overrides.inspectorName ?? inspection.inspectorName,
    inspectionType: overrides.inspectionType ?? inspection.inspectionType,
    weatherConditions: overrides.weatherConditions ?? inspection.weatherConditions,
    accessMethod: overrides.accessMethod ?? inspection.accessMethod,
    overallCondition: overrides.overallCondition ?? inspection.overallCondition,
    overallDamageRating: overrides.overallDamageRating ?? inspection.overallDamageRating,
    estimateStatus,
    totalEstimate: overrides.totalEstimate ?? inspection.totalEstimate,
    customerName: overrides.customerName ?? customerName,
    customerEmail: overrides.customerEmail ?? lead?.email ?? client?.primaryEmail ?? null,
    customerPhone: overrides.customerPhone ?? lead?.phone ?? client?.primaryPhone ?? null,
    customerCompany: overrides.customerCompany ?? lead?.companyName ?? client?.companyName ?? null,
    propertyAddress: overrides.propertyAddress ?? propertyAddress,
    insuranceCompany: overrides.insuranceCompany ?? lead?.insuranceCompanyName ?? client?.insuranceCompanyName ?? null,
    claimNumber: overrides.claimNumber ?? lead?.claimNumber ?? null,
    measurementSource: overrides.measurementSource ?? "manual",
    recommendation:
      overrides.recommendation ??
      (typeof inspection.recommendation === "string" && inspection.recommendation.trim().length > 0
        ? inspection.recommendation
        : (normalizedEstimateStatus.includes("replace")
            ? "full_replacement"
            : normalizedEstimateStatus.includes("repair")
              ? "partial_repair"
              : "no_action")),
    inspectorNotes: overrides.inspectorNotes ?? inspection.inspectorNotes,
    customerFeedback: overrides.customerFeedback ?? inspection.customerFeedback,
    internalNotes: overrides.internalNotes ?? inspection.internalNotes,
    roofStyle: overrides.roofStyle ?? inspection.roofStyle,
    ridgeLength: overrides.ridgeLength ?? inspection.ridgeLength,
    valleyLength: overrides.valleyLength ?? inspection.valleyLength,
    eaveLength: overrides.eaveLength ?? inspection.eaveLength,
    rakeLength: overrides.rakeLength ?? inspection.rakeLength,
    numberOfLayers: overrides.numberOfLayers ?? inspection.numberOfLayers,
    deckingType: overrides.deckingType ?? inspection.deckingType,
    deckingCondition: overrides.deckingCondition ?? inspection.deckingCondition,
    underlaymentType: overrides.underlaymentType ?? inspection.underlaymentType,
    ventilationType: overrides.ventilationType ?? inspection.ventilationType,
    ventilationCount: overrides.ventilationCount ?? inspection.ventilationCount,
    flashingCondition: overrides.flashingCondition ?? inspection.flashingCondition,
    gutterCondition: overrides.gutterCondition ?? inspection.gutterCondition,
    skylightCount: overrides.skylightCount ?? inspection.skylightCount,
    skylightCondition: overrides.skylightCondition ?? inspection.skylightCondition,
    chimneyPresent: overrides.chimneyPresent ?? inspection.chimneyPresent,
    chimneyCondition: overrides.chimneyCondition ?? inspection.chimneyCondition,
    soffitFasciaCondition: overrides.soffitFasciaCondition ?? inspection.soffitFasciaCondition,
    dripEdgePresent: overrides.dripEdgePresent ?? inspection.dripEdgePresent,
    dripEdgeCondition: overrides.dripEdgeCondition ?? inspection.dripEdgeCondition,
    iceWaterShieldPresent: overrides.iceWaterShieldPresent ?? inspection.iceWaterShieldPresent,
    stormDamageFound: overrides.stormDamageFound ?? inspection.stormDamageFound,
    windDamageDetails: overrides.windDamageDetails ?? inspection.windDamageDetails,
    hailDamageDetails: overrides.hailDamageDetails ?? inspection.hailDamageDetails,
    hailSizeFound: overrides.hailSizeFound ?? inspection.hailSizeFound,
    testSquareResults: overrides.testSquareResults ?? inspection.testSquareResults,
    interiorDamageFound: overrides.interiorDamageFound ?? inspection.interiorDamageFound,
    interiorDamageDetails: overrides.interiorDamageDetails ?? inspection.interiorDamageDetails,
    photosTakenCount: overrides.photosTakenCount ?? inspection.photosTakenCount,
    proposedMaterial: overrides.proposedMaterial ?? inspection.proposedMaterial,
    shingleBrand: overrides.shingleBrand ?? inspection.shingleBrand,
    shingleLine: overrides.shingleLine ?? inspection.shingleLine,
    shingleColor: overrides.shingleColor ?? inspection.shingleColor,
    underlaymentChoice: overrides.underlaymentChoice ?? inspection.underlaymentChoice,
    ridgeCapType: overrides.ridgeCapType ?? inspection.ridgeCapType,
    ventilationPlan: overrides.ventilationPlan ?? inspection.ventilationPlan,
    dripEdgeColor: overrides.dripEdgeColor ?? inspection.dripEdgeColor,
    warrantyType: overrides.warrantyType ?? inspection.warrantyType,
    warrantyYears: overrides.warrantyYears ?? inspection.warrantyYears,
    materialCost: overrides.materialCost ?? inspection.materialCost,
    laborCost: overrides.laborCost ?? inspection.laborCost,
    tearOffCost: overrides.tearOffCost ?? inspection.tearOffCost,
    permitCost: overrides.permitCost ?? inspection.permitCost,
    dumpsterCost: overrides.dumpsterCost ?? inspection.dumpsterCost,
    miscCost: overrides.miscCost ?? inspection.miscCost,
    subtotal: overrides.subtotal ?? inspection.subtotal,
    overheadPercent: overrides.overheadPercent ?? inspection.overheadPercent,
    profitPercent: overrides.profitPercent ?? inspection.profitPercent,
    customerPrice: overrides.customerPrice ?? inspection.customerPrice,
    depositRequired: overrides.depositRequired ?? inspection.depositRequired,
    depositCollected: overrides.depositCollected ?? inspection.depositCollected,
    paymentMethod: overrides.paymentMethod ?? inspection.paymentMethod,
    tentativeStartDate: overrides.tentativeStartDate ?? inspection.tentativeStartDate,
    estimatedDuration: overrides.estimatedDuration ?? inspection.estimatedDuration,
    crewSize: overrides.crewSize ?? inspection.crewSize,
    crewLeadName: overrides.crewLeadName ?? inspection.crewLeadName,
    materialsOrdered: overrides.materialsOrdered ?? inspection.materialsOrdered,
    materialsDeliveryDate: overrides.materialsDeliveryDate ?? inspection.materialsDeliveryDate,
    permitPulled: overrides.permitPulled ?? inspection.permitPulled,
    permitNumber: overrides.permitNumber ?? inspection.permitNumber,
    dumpsterOrdered: overrides.dumpsterOrdered ?? inspection.dumpsterOrdered,
    dumpsterDeliveryDate: overrides.dumpsterDeliveryDate ?? inspection.dumpsterDeliveryDate,
    measurements: overrides.measurements ?? {
      totalSquares: inspection.totalSquares?.toString() || "",
      pitch: inspection.roofPitch || "",
      stories: "",
      predominant: "",
      hipRidge: inspection.ridgeLength?.toString() || "",
      valley: inspection.valleyLength?.toString() || "",
      eavesRakes: inspection.eaveLength != null || inspection.rakeLength != null
        ? String((inspection.eaveLength || 0) + (inspection.rakeLength || 0))
        : "",
      flashing: "",
      gutters: "",
    },
    damageChecks: overrides.damageChecks ?? {
      hail: Boolean(inspection.hailDamageDetails || inspection.hailSizeFound),
      wind: Boolean(inspection.windDamageDetails),
      flashing: inspection.flashingCondition === "damaged" || inspection.flashingCondition === "replace",
      gutter: inspection.gutterCondition === "damaged" || inspection.gutterCondition === "replace",
      deck: inspection.deckingCondition === "damaged" || inspection.deckingCondition === "replace",
    },
    roofField: overrides.roofField ?? {
      condition: inspection.overallCondition || "good",
      hailSize: inspection.hailSizeFound || "",
      hitCount: inspection.overallDamageRating || "",
    },
    flashings: overrides.flashings ?? {
      step: inspection.flashingCondition || "good",
      pipeBoots: "good",
    },
    ridgeHip: overrides.ridgeHip ?? {
      ridgeCap: "good",
      hipShingles: "good",
    },
    guttersState: overrides.guttersState ?? {
      condition: inspection.gutterCondition || "good",
      downspouts: "good",
    },
    ventilation: overrides.ventilation ?? {
      ridgeVent: inspection.ventilationType?.includes("ridge") || false,
      soffitVent: inspection.ventilationType?.includes("soffit") || false,
      boxVents: inspection.ventilationType?.includes("box") || false,
      recommendation: "",
    },
    decking: overrides.decking ?? {
      condition: inspection.deckingCondition || "Good",
      softSpots: "0",
      replacementSq: "0",
    },
    photoFileIds: overrides.photoFileIds ?? inspection.photoFileIds ?? [],
  };
}

export async function generateInspectionReportPdf(
  snapshot: InspectionReportSnapshot,
  options?: { companyProfile?: CompanyProfile | null },
): Promise<{ blob: Blob; fileName: string }> {
  const doc = new jsPDF("p", "mm", "letter");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const brandBlue = [30, 64, 175] as const;
  const slate = [15, 23, 42] as const;
  const muted = [100, 116, 139] as const;
  const lightBorder = [226, 232, 240] as const;
  const softFill = [248, 250, 252] as const;
  const companyProfile = options?.companyProfile ?? null;
  const companyName = companyProfile?.companyName?.trim() || "ZODO CRM";
  const companyLines = buildCompanyLines(companyProfile);
  const reportDate = formatDateTime(new Date().toISOString());
  const photoIds = snapshot.photoFileIds || [];
  const loadedPhotos = await loadInspectionPhotos(photoIds);
  let y = 14;

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight <= pageHeight - 16) return;
    doc.addPage();
    y = 14;
  };

  const drawContainedImage = (
    imageData: string,
    x: number,
    yPosition: number,
    width: number,
    height: number,
  ) => {
    const imageProps = doc.getImageProperties(imageData);
    const scale = Math.min(width / imageProps.width, height / imageProps.height);
    const renderWidth = imageProps.width * scale;
    const renderHeight = imageProps.height * scale;
    const offsetX = x + ((width - renderWidth) / 2);
    const offsetY = yPosition + ((height - renderHeight) / 2);

    doc.addImage(
      imageData,
      getImageFormat(imageData),
      offsetX,
      offsetY,
      renderWidth,
      renderHeight,
    );
  };

  const drawSectionTitle = (title: string) => {
    ensureSpace(14);
    doc.setFillColor(...brandBlue);
    doc.roundedRect(margin, y, contentWidth, 9, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, margin + 4, y + 5.8);
    y += 12;
  };

  const drawKeyValueTable = (
    title: string,
    rows: Array<[string, string, string, string]>,
  ) => {
    const compactRows = compactKeyValueRows(rows);
    if (compactRows.length === 0) {
      return;
    }

    drawSectionTitle(title);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      body: compactRows,
      theme: "grid",
      styles: {
        fontSize: 8.5,
        textColor: slate,
        lineColor: lightBorder,
        lineWidth: 0.2,
        cellPadding: 2.8,
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
      },
      columnStyles: {
        0: { fillColor: softFill, fontStyle: "bold", cellWidth: 34 },
        1: { cellWidth: 58 },
        2: { fillColor: softFill, fontStyle: "bold", cellWidth: 34 },
        3: { cellWidth: 58 },
      },
    });
    y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 7;
  };

  const drawMultilineBlock = (title: string, value?: string | null) => {
    if (!hasReportValue(value || "")) {
      return;
    }

    drawSectionTitle(title);
    const text = formatValue(value);
    const lines = doc.splitTextToSize(text, contentWidth - 8);
    const blockHeight = Math.max(18, lines.length * 4 + 8);
    ensureSpace(blockHeight + 2);
    doc.setFillColor(...softFill);
    doc.setDrawColor(...lightBorder);
    doc.roundedRect(margin, y, contentWidth, blockHeight, 2, 2, "FD");
    doc.setTextColor(...slate);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(lines, margin + 4, y + 6);
    y += blockHeight + 7;
  };

  const footerLine = [companyName, companyProfile?.address?.trim()]
    .filter(Boolean)
    .join(" • ");

  try {
    const logoData = companyProfile?.logoUrl
      ? await loadImageAsDataUrl(companyProfile.logoUrl)
      : null;
    const wrappedCompanyLines = companyLines.flatMap((line) => {
      const lines = doc.splitTextToSize(line, 72);
      return Array.isArray(lines) ? lines : [String(lines)];
    });
    const logoHeight = logoData ? 14 : 0;
    const companyBlockHeight = wrappedCompanyLines.length > 0
      ? (wrappedCompanyLines.length * 4)
      : 0;
    const brandingBlockHeight = Math.max(logoHeight, companyBlockHeight);

    if (logoData) {
      drawContainedImage(logoData, margin, y, 32, 14);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...muted);
    wrappedCompanyLines.forEach((line, index) => {
      doc.text(line, pageWidth - margin, y + 4 + (index * 4), { align: "right" });
    });

    const titleBaselineY = y + brandingBlockHeight + 8;

    doc.setTextColor(...slate);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("INSPECTION REPORT", margin, titleBaselineY);

    y = titleBaselineY + 8;

    doc.setFillColor(...softFill);
    doc.setDrawColor(...lightBorder);
    doc.roundedRect(margin, y, contentWidth, 16, 2, 2, "FD");

    doc.setTextColor(...slate);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`Inspection #${snapshot.inspectionId.slice(0, 8).toUpperCase()}`, margin + 4, y + 6);
    doc.text(`Generated ${reportDate}`, pageWidth - margin - 4, y + 6, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...muted);
    doc.text(`Inspection date: ${formatDateTime(snapshot.inspectionDate)}`, margin + 4, y + 12);
    doc.text(`Inspector: ${formatValue(snapshot.inspectorName)}`, pageWidth - margin - 4, y + 12, {
      align: "right",
    });

    y += 22;

    drawKeyValueTable("Customer And Property", [
      ["Customer", formatValue(snapshot.customerName), "Phone", formatValue(snapshot.customerPhone)],
      ["Email", formatValue(snapshot.customerEmail), "Company", formatValue(snapshot.customerCompany)],
      ["Property Address", formatValue(snapshot.propertyAddress), "Inspection Type", formatValue(snapshot.inspectionType)],
      ["Insurance", formatValue(snapshot.insuranceCompany), "Claim Number", formatValue(snapshot.claimNumber)],
    ]);

    drawKeyValueTable("Inspection Summary", [
      ["Overall Condition", formatValue(snapshot.overallCondition), "Damage Rating", formatValue(snapshot.overallDamageRating)],
      ["Estimate Status", formatValue(snapshot.estimateStatus), "Recommended Action", formatRecommendation(snapshot.recommendation)],
      ["Weather", formatValue(snapshot.weatherConditions), "Access Method", formatValue(snapshot.accessMethod)],
      ["Total Estimate", formatCurrency(snapshot.totalEstimate), "Measurement Source", formatValue(snapshot.measurementSource)],
    ]);

    drawKeyValueTable("Roof Measurements", [
      ["Total Squares", formatValue(snapshot.measurements.totalSquares), "Pitch", formatValue(snapshot.measurements.pitch)],
      ["Stories", formatValue(snapshot.measurements.stories), "Predominant", formatValue(snapshot.measurements.predominant)],
      ["Hip/Ridge", formatValue(snapshot.measurements.hipRidge), "Valley", formatValue(snapshot.measurements.valley)],
      ["Eaves/Rakes", formatValue(snapshot.measurements.eavesRakes), "Flashing", formatValue(snapshot.measurements.flashing)],
      ["Gutters", formatValue(snapshot.measurements.gutters), "Last Updated", formatDateTime(snapshot.updatedAt)],
    ]);

    drawKeyValueTable("Roof Assessment Details", [
      ["Roof Style", formatValue(snapshot.roofStyle), "Layers", formatValue(snapshot.numberOfLayers)],
      ["Ridge Length", formatValue(snapshot.ridgeLength), "Valley Length", formatValue(snapshot.valleyLength)],
      ["Eave Length", formatValue(snapshot.eaveLength), "Rake Length", formatValue(snapshot.rakeLength)],
      ["Decking Type", formatValue(snapshot.deckingType), "Decking Condition", formatValue(snapshot.deckingCondition)],
      ["Underlayment Type", formatValue(snapshot.underlaymentType), "Underlayment Choice", formatValue(snapshot.underlaymentChoice)],
      ["Ventilation Type", formatValue(snapshot.ventilationType), "Vent Count", formatValue(snapshot.ventilationCount)],
      ["Flashing Condition", formatValue(snapshot.flashingCondition), "Gutter Condition", formatValue(snapshot.gutterCondition)],
      ["Skylight Count", formatValue(snapshot.skylightCount), "Skylight Condition", formatValue(snapshot.skylightCondition)],
      ["Chimney Present", formatBoolean(Boolean(snapshot.chimneyPresent)), "Chimney Condition", formatValue(snapshot.chimneyCondition)],
      ["Soffit/Fascia", formatValue(snapshot.soffitFasciaCondition), "Drip Edge Present", formatBoolean(Boolean(snapshot.dripEdgePresent))],
      ["Drip Edge Condition", formatValue(snapshot.dripEdgeCondition), "Ice/Water Shield", formatBoolean(Boolean(snapshot.iceWaterShieldPresent))],
    ]);

    drawKeyValueTable("Damage Assessment", [
      ["Roof Field", formatValue(snapshot.roofField.condition), "Hail Size", formatValue(snapshot.roofField.hailSize)],
      ["Hit Count / Severity", formatValue(snapshot.roofField.hitCount), "Hail Damage Found", formatBoolean(snapshot.damageChecks.hail)],
      ["Wind Damage Found", formatBoolean(snapshot.damageChecks.wind), "Flashing Damage", formatBoolean(snapshot.damageChecks.flashing)],
      ["Gutter Damage", formatBoolean(snapshot.damageChecks.gutter), "Deck Damage", formatBoolean(snapshot.damageChecks.deck)],
      ["Step Flashing", formatValue(snapshot.flashings.step), "Pipe Boots", formatValue(snapshot.flashings.pipeBoots)],
      ["Ridge Cap", formatValue(snapshot.ridgeHip.ridgeCap), "Hip Shingles", formatValue(snapshot.ridgeHip.hipShingles)],
      ["Gutter Condition", formatValue(snapshot.guttersState.condition), "Downspouts", formatValue(snapshot.guttersState.downspouts)],
      ["Deck Condition", formatValue(snapshot.decking.condition), "Replacement Squares", formatValue(snapshot.decking.replacementSq)],
    ]);

    drawKeyValueTable("Ventilation And Decking", [
      ["Ridge Vent", formatBoolean(snapshot.ventilation.ridgeVent), "Soffit Vent", formatBoolean(snapshot.ventilation.soffitVent)],
      ["Box Vents", formatBoolean(snapshot.ventilation.boxVents), "Soft Spots", formatValue(snapshot.decking.softSpots)],
      ["Ventilation Recommendation", formatValue(snapshot.ventilation.recommendation), "Created", formatDateTime(snapshot.createdAt)],
    ]);

    drawKeyValueTable("Materials And Warranty", [
      ["Proposed Material", formatValue(snapshot.proposedMaterial), "Shingle Brand", formatValue(snapshot.shingleBrand)],
      ["Shingle Line", formatValue(snapshot.shingleLine), "Shingle Color", formatValue(snapshot.shingleColor)],
      ["Ridge Cap", formatValue(snapshot.ridgeCapType), "Drip Edge Color", formatValue(snapshot.dripEdgeColor)],
      ["Ventilation Plan", formatValue(snapshot.ventilationPlan), "Warranty Type", formatValue(snapshot.warrantyType)],
      ["Warranty Years", formatValue(snapshot.warrantyYears), "Photos Attached", formatValue(snapshot.photosTakenCount ?? photoIds.length)],
    ]);

    drawKeyValueTable("Estimate And Pricing", [
      ["Material Cost", formatCurrency(snapshot.materialCost), "Labor Cost", formatCurrency(snapshot.laborCost)],
      ["Tear-Off Cost", formatCurrency(snapshot.tearOffCost), "Permit Cost", formatCurrency(snapshot.permitCost)],
      ["Dumpster Cost", formatCurrency(snapshot.dumpsterCost), "Misc Cost", formatCurrency(snapshot.miscCost)],
      ["Subtotal", formatCurrency(snapshot.subtotal), "Overhead %", formatValue(snapshot.overheadPercent)],
      ["Profit %", formatValue(snapshot.profitPercent), "Customer Price", formatCurrency(snapshot.customerPrice)],
      ["Deposit Required", formatCurrency(snapshot.depositRequired), "Deposit Collected", formatBoolean(Boolean(snapshot.depositCollected))],
      ["Payment Method", formatValue(snapshot.paymentMethod), "Estimate Status", formatValue(snapshot.estimateStatus)],
    ]);

    drawKeyValueTable("Scheduling And Logistics", [
      ["Tentative Start", formatDate(snapshot.tentativeStartDate), "Duration", formatValue(snapshot.estimatedDuration)],
      ["Crew Size", formatValue(snapshot.crewSize), "Crew Lead", formatValue(snapshot.crewLeadName)],
      ["Materials Ordered", formatBoolean(Boolean(snapshot.materialsOrdered)), "Delivery Date", formatDate(snapshot.materialsDeliveryDate)],
      ["Permit Pulled", formatBoolean(Boolean(snapshot.permitPulled)), "Permit Number", formatValue(snapshot.permitNumber)],
      ["Dumpster Ordered", formatBoolean(Boolean(snapshot.dumpsterOrdered)), "Dumpster Delivery", formatDate(snapshot.dumpsterDeliveryDate)],
    ]);

    drawKeyValueTable("Detailed Damage Notes", [
      ["Storm Damage", formatBoolean(Boolean(snapshot.stormDamageFound)), "Interior Damage", formatBoolean(Boolean(snapshot.interiorDamageFound))],
      ["Hail Size", formatValue(snapshot.hailSizeFound), "Test Square", formatValue(snapshot.testSquareResults)],
      ["Wind Notes", formatValue(snapshot.windDamageDetails), "Hail Notes", formatValue(snapshot.hailDamageDetails)],
      ["Interior Damage Details", formatValue(snapshot.interiorDamageDetails), "Updated", formatDateTime(snapshot.updatedAt)],
    ]);

    drawMultilineBlock("Inspector Notes", snapshot.inspectorNotes);
    drawMultilineBlock("Customer Feedback", snapshot.customerFeedback);
    drawMultilineBlock("Internal Notes", snapshot.internalNotes);

    drawSectionTitle("Inspection Photos");

    if (loadedPhotos.length === 0) {
      doc.setFillColor(...softFill);
      doc.setDrawColor(...lightBorder);
      doc.roundedRect(margin, y, contentWidth, 18, 2, 2, "FD");
      doc.setTextColor(...muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("No inspection photos were attached to this inspection.", margin + 4, y + 10);
      y += 25;
    } else {
      const cardGap = 6;
      const cardWidth = (contentWidth - cardGap) / 2;
      const cardHeight = 82;

      for (let index = 0; index < loadedPhotos.length; index += 1) {
        const photo = loadedPhotos[index];
        const isLeftColumn = index % 2 === 0;

        if (isLeftColumn) {
          ensureSpace(cardHeight + 6);
        }

        const x = isLeftColumn ? margin : margin + cardWidth + cardGap;
        const rowY = y;

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...lightBorder);
        doc.roundedRect(x, rowY, cardWidth, cardHeight, 2, 2, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...slate);
        doc.text(photo.name, x + 4, rowY + 6, { maxWidth: cardWidth - 8 });

        const imageData = await loadImageAsDataUrl(photo.previewUrl);
        if (imageData) {
          drawContainedImage(imageData, x + 3, rowY + 9, cardWidth - 6, cardHeight - 12);
        } else {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...muted);
          doc.text("Image unavailable", x + (cardWidth / 2), rowY + (cardHeight / 2), {
            align: "center",
          });
        }

        if (!isLeftColumn || index === loadedPhotos.length - 1) {
          y += cardHeight + 6;
        }
      }
    }

    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(...lightBorder);
      doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...muted);
      doc.text(footerLine || companyName, margin, pageHeight - 8);
      doc.text(`Page ${page} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    }

    const fileName = getInspectionReportFileName(snapshot);

    return {
      blob: doc.output("blob"),
      fileName,
    };
  } finally {
    cleanupLoadedPhotos(loadedPhotos);
  }
}

export function downloadInspectionReportBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
