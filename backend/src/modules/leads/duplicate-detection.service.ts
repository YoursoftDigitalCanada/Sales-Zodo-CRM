import { prisma } from '../../config/database';
import { LeadStatus, Prisma } from '@prisma/client';
import { logger } from '../../common/utils/logger';
import { activityLogger } from '../../common/services/activity-logger.service';
import { toLeadResponseDto, LeadResponseDto } from './leads.dto';
import { leadsRepository } from './leads.repository';

// ── Types ────────────────────────────────────────────────────────────────

export interface DuplicateMatch {
  leadId: string;
  leadName: string;
  leadNumber?: string;
  status: string;
  matchedFields: string[];       // e.g. ['phone', 'email']
  confidenceScore: number;       // 0–100
  lead: LeadResponseDto;
}

export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  duplicates: DuplicateMatch[];
}

export interface MergeResult {
  mergedLead: LeadResponseDto;
  sourceLeadId: string;
  fieldsMerged: string[];
  relationsRelinked: { activities: number; legacyRecords: number };
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Strip non-digit characters from phone for comparison */
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  // Keep last 10 digits (handles country codes)
  return digits.length >= 10 ? digits.slice(-10) : digits || null;
}

/** Lowercase + trim email */
function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return email.trim().toLowerCase() || null;
}

// Default include for returning full lead data
const duplicateInclude = {
  leadSource: true,
  assignedTo: {
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
      },
    },
  },
  createdBy: {
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  },
  tags: { include: { tag: true } },
  contactedDetails: true,
};

// ── Service ──────────────────────────────────────────────────────────────

export class DuplicateDetectionService {
  /**
 * Find potential duplicate leads based on phone and email.
   * Runs within the same tenant scope.
   */
  async findDuplicates(
    tenantId: string,
    data: { phone?: string | null; email?: string | null },
    excludeLeadId?: string,
  ): Promise<DuplicateCheckResult> {
    const normalizedPhone = normalizePhone(data.phone);
    const normalizedEmail = normalizeEmail(data.email);

    // Nothing to match against
    if (!normalizedPhone && !normalizedEmail) {
      return { hasDuplicates: false, duplicates: [] };
    }

    // Build OR conditions for each matchable field
    const orConditions: Prisma.LeadWhereInput[] = [];

    if (normalizedPhone) {
      orConditions.push({ phone: { not: null } }); // we'll filter in JS for normalized match
    }
    if (normalizedEmail) {
      orConditions.push({
        email: { equals: normalizedEmail, mode: 'insensitive' },
      });
    }
    if (orConditions.length === 0) {
      return { hasDuplicates: false, duplicates: [] };
    }

    // Query candidates
    const candidates = await prisma.lead.findMany({
      where: {
        tenantId,
        ...(excludeLeadId ? { id: { not: excludeLeadId } } : {}),
        status: { notIn: ['DUPLICATE'] }, // ignore already-marked duplicates
        OR: orConditions,
      },
      include: duplicateInclude,
      take: 20, // cap for performance
    });

    // Score each candidate
    const duplicates: DuplicateMatch[] = [];

    for (const candidate of candidates) {
      const matchedFields: string[] = [];
      let score = 0;

      // Phone match (normalized)
      if (normalizedPhone && normalizePhone(candidate.phone) === normalizedPhone) {
        matchedFields.push('phone');
        score += 40;
      }

      // Email match (case-insensitive)
      if (normalizedEmail && normalizeEmail(candidate.email) === normalizedEmail) {
        matchedFields.push('email');
        score += 35;
      }

      if (matchedFields.length > 0) {
        duplicates.push({
          leadId: candidate.id,
          leadName: `${candidate.firstName} ${candidate.lastName}`,
          leadNumber: (candidate as any).leadNumber || undefined,
          status: candidate.status,
          matchedFields,
          confidenceScore: Math.min(score, 100),
          lead: toLeadResponseDto(candidate),
        });
      }
    }

    // Sort by confidence descending
    duplicates.sort((a, b) => b.confidenceScore - a.confidenceScore);

    return {
      hasDuplicates: duplicates.length > 0,
      duplicates,
    };
  }

  /**
   * Merge source lead into target lead.
   * - Copies non-empty fields from source → target (target wins on conflicts)
   * - Re-links child records
   * - Marks source as DUPLICATE with duplicateOfLeadId = targetLeadId
   * - Audit-logs the merge
   */
  async mergeLeads(
    tenantId: string,
    targetLeadId: string,
    sourceLeadId: string,
  ): Promise<MergeResult> {
    const [targetLead, sourceLead] = await Promise.all([
      leadsRepository.findById(targetLeadId, tenantId),
      leadsRepository.findById(sourceLeadId, tenantId),
    ]);

    if (!targetLead) throw new Error('Target lead not found');
    if (!sourceLead) throw new Error('Source lead not found');

    // ── Field merge: copy non-empty source fields into target where target is empty ──
    const mergeableFields = [
      'email', 'phone', 'location', 'companyName', 'jobTitle', 'website',
      'city', 'state', 'zipCode', 'urgencyLevel',
      'preferredContactMethod', 'bestTimeToContact', 'issueDescription',
      'secondaryPhone', 'spouseCoOwnerName', 'isDecisionMaker',
      'budgetRange', 'workTimeline', 'financingNeeded',
      'topPriority', 'isHOA', 'hoaRestrictions', 'notes',
    ] as const;

    const mergedFields: string[] = [];
    const updateData: Record<string, any> = {};

    for (const field of mergeableFields) {
      const targetVal = (targetLead as any)[field];
      const sourceVal = (sourceLead as any)[field];
      if ((!targetVal || targetVal === '') && sourceVal && sourceVal !== '') {
        updateData[field] = sourceVal;
        mergedFields.push(field);
      }
    }

    // Merge potentialValue: take the higher one
    const targetValue = targetLead.potentialValue ? Number(targetLead.potentialValue) : 0;
    const sourceValue = sourceLead.potentialValue ? Number(sourceLead.potentialValue) : 0;
    if (sourceValue > targetValue) {
      updateData.potentialValue = new Prisma.Decimal(sourceValue);
      mergedFields.push('potentialValue');
    }

    // Merge notes by appending
    if (sourceLead.notes && targetLead.notes) {
      updateData.notes = `${targetLead.notes}\n\n--- Merged from ${sourceLead.firstName} ${sourceLead.lastName} ---\n${sourceLead.notes}`;
      if (!mergedFields.includes('notes')) mergedFields.push('notes');
    }

    // ── Transaction: update target + re-link relations + mark source ──
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update target lead with merged fields
      if (Object.keys(updateData).length > 0) {
        await tx.lead.update({
          where: { id: targetLeadId },
          data: updateData,
        });
      }

      // 2. Re-link activities
      const activities = await tx.leadActivity.updateMany({
        where: { leadId: sourceLeadId },
        data: { leadId: targetLeadId },
      });

      // 3. Re-link inspections
      const inspections = await tx.leadInspection.updateMany({
        where: { leadId: sourceLeadId },
        data: { leadId: targetLeadId },
      });

      // 4. Re-link insurance claims
      const claims = await tx.leadInsuranceClaim.updateMany({
        where: { leadId: sourceLeadId },
        data: { leadId: targetLeadId },
      });

      // 5. Mark source as DUPLICATE
      await tx.lead.update({
        where: { id: sourceLeadId },
        data: {
          status: 'DUPLICATE' as LeadStatus,
          closureReason: `Merged into lead ${(targetLead as any).leadNumber || targetLeadId}`,
          duplicateOfLeadId: targetLeadId,
          closedAt: new Date(),
        },
      });

      return {
        activities: activities.count,
        legacyRecords: inspections.count + claims.count,
      };
    });

    // ── Audit logging ──
    const mergedLead = await leadsRepository.findById(targetLeadId, tenantId);
    const dto = toLeadResponseDto(mergedLead!);

    activityLogger.log({
      tenantId,
      entityType: 'Lead',
      entityId: targetLeadId,
      action: 'UPDATE',
      module: 'leads',
      description: `[MERGE] Merged lead ${(sourceLead as any).leadNumber || sourceLeadId} (${sourceLead.firstName} ${sourceLead.lastName}) into this lead`,
      metadata: {
        sourceLeadId,
        sourceLeadName: `${sourceLead.firstName} ${sourceLead.lastName}`,
        fieldsMerged: mergedFields,
        relationsRelinked: result,
      },
    });

    activityLogger.log({
      tenantId,
      entityType: 'Lead',
      entityId: sourceLeadId,
      action: 'UPDATE',
      module: 'leads',
      description: `[MERGE] This lead was merged into ${(targetLead as any).leadNumber || targetLeadId} (${targetLead.firstName} ${targetLead.lastName}) and marked as DUPLICATE`,
      metadata: { targetLeadId },
    });

    // Log activity on the lead timeline
    await prisma.leadActivity.create({
      data: {
        leadId: targetLeadId,
        type: 'MERGED',
        title: 'Lead merged',
        description: `Merged with ${sourceLead.firstName} ${sourceLead.lastName}. Fields merged: ${mergedFields.join(', ') || 'none'}. Re-linked: ${result.activities} activities.`,
        metadata: { sourceLeadId, fieldsMerged: mergedFields, relationsRelinked: result } as any,
      },
    });

    logger.info('[DuplicateDetection] Leads merged', {
      tenantId, targetLeadId, sourceLeadId,
      fieldsMerged: mergedFields.length,
      activitiesRelinked: result.activities,
    });

    return {
      mergedLead: dto,
      sourceLeadId,
      fieldsMerged: mergedFields,
      relationsRelinked: result,
    };
  }
}

export const duplicateDetectionService = new DuplicateDetectionService();
