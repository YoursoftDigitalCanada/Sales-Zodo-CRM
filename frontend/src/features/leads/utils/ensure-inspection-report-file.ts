import {
  deleteFile,
  fetchFileBlob,
  getFiles,
  uploadFile,
  type FileResponse,
} from "@/features/files/services/files-service";
import { getLeadById, type LeadEntity } from "@/features/leads/services/leads-service";
import type { InspectionEntity } from "@/features/leads/services/inspections-service";
import { getProjects, type ProjectEntity } from "@/features/projects/services/projects-service";
import type { CompanyProfile } from "@/features/settings/services/settings-service";
import {
  buildInspectionReportSnapshot,
  generateInspectionReportPdf,
  getInspectionReportFileName,
  type InspectionReportSnapshot,
} from "@/features/leads/utils/generate-inspection-report-pdf";

interface LinkedInspectionRecords {
  leadId: string;
  clientId?: string;
  projectId?: string;
}

interface EnsureInspectionReportFileOptions {
  inspection: InspectionEntity;
  companyProfile?: CompanyProfile | null;
  snapshotOverrides?: Partial<InspectionReportSnapshot>;
  reuseExisting?: boolean;
}

export interface EnsureInspectionReportFileResult {
  created: boolean;
  fileId: string;
  fileName: string;
  previewUrl: string;
  linkedRecords: LinkedInspectionRecords;
}

type LeadWithConversion = LeadEntity & {
  convertedToClientId?: string | null;
};

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getProjectTimestamp(project: ProjectEntity): number {
  const candidate = project.updatedAt || project.createdAt || project.startDate || project.estimatedStartDate;
  if (!candidate) return 0;
  const parsed = new Date(candidate).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function pickPrimaryProject(projects: ProjectEntity[]): string | undefined {
  return [...projects]
    .sort((left, right) => getProjectTimestamp(right) - getProjectTimestamp(left))
    .find((project) => readOptionalString(project.id))?.id;
}

function matchesInspectionReportFile(file: FileResponse, fileName: string): boolean {
  return file.name === fileName || file.originalName === fileName;
}

async function findInspectionReportFiles(leadId: string, fileName: string): Promise<FileResponse[]> {
  const files = await getFiles({
    leadId,
    limit: 100,
    search: fileName,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  return files.filter((file) => matchesInspectionReportFile(file, fileName));
}

async function openExistingInspectionReport(
  leadId: string,
  fileName: string,
): Promise<{ file: FileResponse; previewUrl: string } | null> {
  const existingFiles = await findInspectionReportFiles(leadId, fileName);

  for (const file of existingFiles) {
    try {
      const previewUrl = await fetchFileBlob(file.id);
      return { file, previewUrl };
    } catch {
      // Fall through and try the next matching file or regenerate below.
    }
  }

  return null;
}

async function resolveLinkedInspectionRecords(
  inspection: InspectionEntity,
): Promise<LinkedInspectionRecords> {
  const linkedRecords: LinkedInspectionRecords = { leadId: inspection.leadId };

  try {
    const lead = await getLeadById(inspection.leadId) as LeadWithConversion;
    const clientId = readOptionalString(lead.convertedToClientId);
    if (clientId) {
      linkedRecords.clientId = clientId;
    }
  } catch {
    // The report can still be saved against the lead if client lookup fails.
  }

  try {
    const leadProjects = await getProjects({ leadId: inspection.leadId, limit: 100 });
    linkedRecords.projectId = pickPrimaryProject(leadProjects);
  } catch {
    // Fall back to client-level project lookup below if needed.
  }

  if (!linkedRecords.projectId && linkedRecords.clientId) {
    try {
      const clientProjects = await getProjects({ clientId: linkedRecords.clientId, limit: 100 });
      linkedRecords.projectId = pickPrimaryProject(clientProjects);
    } catch {
      // Saving to lead/client is still enough if no job lookup succeeds.
    }
  }

  return linkedRecords;
}

export async function ensureInspectionReportFile(
  options: EnsureInspectionReportFileOptions,
): Promise<EnsureInspectionReportFileResult> {
  const snapshot = buildInspectionReportSnapshot(options.inspection, options.snapshotOverrides);
  const fileName = getInspectionReportFileName(snapshot);

  if (options.reuseExisting) {
    const existingReport = await openExistingInspectionReport(options.inspection.leadId, fileName);
    if (existingReport) {
      return {
        created: false,
        fileId: existingReport.file.id,
        fileName,
        previewUrl: existingReport.previewUrl,
        linkedRecords: { leadId: options.inspection.leadId },
      };
    }
  }

  const [linkedRecords, previousFiles, pdfResult] = await Promise.all([
    resolveLinkedInspectionRecords(options.inspection),
    findInspectionReportFiles(options.inspection.leadId, fileName).catch(() => []),
    generateInspectionReportPdf(snapshot, { companyProfile: options.companyProfile }),
  ]);

  const inspectionPdf = new File([pdfResult.blob], pdfResult.fileName, {
    type: "application/pdf",
  });

  const uploadedFile = await uploadFile(inspectionPdf, linkedRecords);
  const previewUrl = await fetchFileBlob(uploadedFile.id);

  const staleFiles = previousFiles.filter((file) => file.id !== uploadedFile.id);
  if (staleFiles.length > 0) {
    await Promise.allSettled(staleFiles.map((file) => deleteFile(file.id)));
  }

  return {
    created: true,
    fileId: uploadedFile.id,
    fileName: pdfResult.fileName,
    previewUrl,
    linkedRecords,
  };
}
