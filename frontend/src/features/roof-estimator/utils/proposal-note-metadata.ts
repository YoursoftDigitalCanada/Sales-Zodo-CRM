export type NormalizedPolygonPoint = { x: number; y: number };
export type ProposalRecipientType = "client" | "lead";

export interface ProposalNoteMetadata {
  proposalNumber: string;
  proposalTitle: string;
  issueDate: string;
  validUntil: string;
  companyName: string;
  recipientType: ProposalRecipientType;
  recipientName: string;
  recipientCompany?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  scopeOfWork?: string;
  termsAndConditions?: string;
}

export interface ParsedEstimateNotes {
  plainNotes: string;
  polygonNormalized: NormalizedPolygonPoint[];
  proposalMeta: ProposalNoteMetadata | null;
}

const POLYGON_TAG = "polygon_normalized=";
const PROPOSAL_META_TAG = "proposal_meta=";
const DEFAULT_MAX_NOTES_LENGTH = 1900;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toCompactLine(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n+/g, " ").trim();
}

function truncate(value: string, maxLength: number): string {
  if (maxLength <= 0) return "";
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength).trim();
}

function sanitizeMetadata(meta: ProposalNoteMetadata): ProposalNoteMetadata {
  return {
    proposalNumber: truncate(toCompactLine(meta.proposalNumber || ""), 80),
    proposalTitle: truncate(toCompactLine(meta.proposalTitle || ""), 140),
    issueDate: truncate(toCompactLine(meta.issueDate || ""), 20),
    validUntil: truncate(toCompactLine(meta.validUntil || ""), 20),
    companyName: truncate(toCompactLine(meta.companyName || ""), 120),
    recipientType: meta.recipientType === "lead" ? "lead" : "client",
    recipientName: truncate(toCompactLine(meta.recipientName || ""), 120),
    recipientCompany: truncate(toCompactLine(meta.recipientCompany || ""), 120) || undefined,
    recipientEmail: truncate(toCompactLine(meta.recipientEmail || ""), 180) || undefined,
    recipientPhone: truncate(toCompactLine(meta.recipientPhone || ""), 60) || undefined,
    scopeOfWork: truncate(toCompactLine(meta.scopeOfWork || ""), 380) || undefined,
    termsAndConditions: truncate(toCompactLine(meta.termsAndConditions || ""), 380) || undefined,
  };
}

function normalizePolygon(points: NormalizedPolygonPoint[]): NormalizedPolygonPoint[] {
  return (points || [])
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .map((point) => ({
      x: Number(clamp(point.x, 0, 1).toFixed(6)),
      y: Number(clamp(point.y, 0, 1).toFixed(6)),
    }));
}

function composeLines(params: {
  plainNotes: string;
  polygonNormalized: NormalizedPolygonPoint[];
  proposalMeta: ProposalNoteMetadata | null;
}): string {
  const lines: string[] = [];
  if (params.plainNotes) {
    lines.push(params.plainNotes);
  }
  if (params.polygonNormalized.length >= 3) {
    lines.push(`${POLYGON_TAG}${JSON.stringify(params.polygonNormalized)}`);
  }
  if (params.proposalMeta) {
    lines.push(`${PROPOSAL_META_TAG}${JSON.stringify(params.proposalMeta)}`);
  }
  return lines.join("\n");
}

export function buildEstimateNotesWithMetadata(params: {
  plainNotes?: string;
  polygonNormalized?: NormalizedPolygonPoint[];
  proposalMeta?: ProposalNoteMetadata | null;
  maxLength?: number;
}): string | undefined {
  const maxLength = params.maxLength ?? DEFAULT_MAX_NOTES_LENGTH;
  const normalizedPlainNotes = truncate(toCompactLine(params.plainNotes || ""), 1000);
  const normalizedPolygon = normalizePolygon(params.polygonNormalized || []);
  const normalizedMeta = params.proposalMeta ? sanitizeMetadata(params.proposalMeta) : null;

  let composed = composeLines({
    plainNotes: normalizedPlainNotes,
    polygonNormalized: normalizedPolygon,
    proposalMeta: normalizedMeta,
  });

  if (composed.length <= maxLength) {
    return composed || undefined;
  }

  let reducedMeta: ProposalNoteMetadata | null = normalizedMeta
    ? { ...normalizedMeta }
    : null;

  if (reducedMeta) {
    reducedMeta.scopeOfWork = undefined;
    composed = composeLines({
      plainNotes: normalizedPlainNotes,
      polygonNormalized: normalizedPolygon,
      proposalMeta: reducedMeta,
    });
  }

  if (composed.length > maxLength && reducedMeta) {
    reducedMeta.termsAndConditions = undefined;
    composed = composeLines({
      plainNotes: normalizedPlainNotes,
      polygonNormalized: normalizedPolygon,
      proposalMeta: reducedMeta,
    });
  }

  if (composed.length > maxLength) {
    const metaOnly = composeLines({
      plainNotes: "",
      polygonNormalized: normalizedPolygon,
      proposalMeta: reducedMeta,
    });
    const availableForPlain = Math.max(0, maxLength - metaOnly.length - (metaOnly ? 1 : 0));
    const reducedPlainNotes = truncate(normalizedPlainNotes, availableForPlain);
    composed = composeLines({
      plainNotes: reducedPlainNotes,
      polygonNormalized: normalizedPolygon,
      proposalMeta: reducedMeta,
    });
  }

  if (composed.length > maxLength) {
    composed = composeLines({
      plainNotes: "",
      polygonNormalized: normalizedPolygon,
      proposalMeta: null,
    });
  }

  if (composed.length > maxLength) {
    composed = truncate(composed, maxLength);
  }

  return composed || undefined;
}

export function parseEstimateNotes(notes: string | null | undefined): ParsedEstimateNotes {
  if (!notes) {
    return { plainNotes: "", polygonNormalized: [], proposalMeta: null };
  }

  const lines = notes.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const plainNotes: string[] = [];
  let polygonNormalized: NormalizedPolygonPoint[] = [];
  let proposalMeta: ProposalNoteMetadata | null = null;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith(POLYGON_TAG)) {
      const payload = trimmed.slice(POLYGON_TAG.length);
      try {
        const parsed = JSON.parse(payload);
        if (Array.isArray(parsed)) {
          polygonNormalized = normalizePolygon(
            parsed.map((point) => ({
              x: Number((point as any)?.x),
              y: Number((point as any)?.y),
            })),
          );
        }
      } catch {
        // Ignore malformed metadata and keep parsing plain notes.
      }
      return;
    }

    if (trimmed.startsWith(PROPOSAL_META_TAG)) {
      const payload = trimmed.slice(PROPOSAL_META_TAG.length);
      try {
        const parsed = JSON.parse(payload) as ProposalNoteMetadata;
        if (parsed && typeof parsed === "object") {
          proposalMeta = sanitizeMetadata(parsed);
        }
      } catch {
        // Ignore malformed metadata and keep parsing plain notes.
      }
      return;
    }

    plainNotes.push(line);
  });

  return {
    plainNotes: plainNotes.join("\n").trim(),
    polygonNormalized,
    proposalMeta,
  };
}

export function denormalizePolygonPoints(
  points: NormalizedPolygonPoint[],
  width: number,
  height: number,
): Array<{ x: number; y: number }> {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return [];
  }

  return normalizePolygon(points).map((point) => ({
    x: Number((point.x * width).toFixed(2)),
    y: Number((point.y * height).toFixed(2)),
  }));
}
