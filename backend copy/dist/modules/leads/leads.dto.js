"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toLeadResponseDto = toLeadResponseDto;
// ============================================================================
// MAPPER
// ============================================================================
function toLeadResponseDto(lead) {
    return {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        fullName: `${lead.firstName} ${lead.lastName}`,
        email: lead.email || undefined,
        phone: lead.phone || undefined,
        location: lead.location || undefined,
        companyName: lead.companyName || undefined,
        jobTitle: lead.jobTitle || undefined,
        website: lead.website || undefined,
        status: lead.status,
        temperature: lead.temperature,
        potentialValue: lead.potentialValue ? Number(lead.potentialValue) : undefined,
        notes: lead.notes || undefined,
        leadSource: lead.leadSource
            ? {
                id: lead.leadSource.id,
                name: lead.leadSource.name,
            }
            : undefined,
        assignedTo: lead.assignedTo
            ? {
                id: lead.assignedTo.id,
                userId: lead.assignedTo.userId,
                user: {
                    firstName: lead.assignedTo.user.firstName,
                    lastName: lead.assignedTo.user.lastName,
                    email: lead.assignedTo.user.email,
                },
            }
            : undefined,
        tags: lead.tags?.map((lt) => ({
            id: lt.tag.id,
            name: lt.tag.name,
            color: lt.tag.color || undefined,
        })) || [],
        createdBy: lead.createdBy
            ? {
                id: lead.createdBy.id,
                user: {
                    firstName: lead.createdBy.user.firstName,
                    lastName: lead.createdBy.user.lastName,
                },
            }
            : undefined,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        convertedAt: lead.convertedAt || undefined,
    };
}
//# sourceMappingURL=leads.dto.js.map