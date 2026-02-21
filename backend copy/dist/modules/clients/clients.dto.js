"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toClientResponseDto = toClientResponseDto;
function toClientResponseDto(c) {
    return {
        id: c.id,
        // Basic Information
        clientLogo: c.clientLogo,
        clientName: c.clientName,
        companyName: c.companyName,
        clientType: c.clientType,
        primaryEmail: c.primaryEmail,
        primaryPhone: c.primaryPhone,
        status: c.status,
        assignedOwner: c.assignedOwner ? { id: c.assignedOwner.id, firstName: c.assignedOwner.user.firstName, lastName: c.assignedOwner.user.lastName } : null,
        // Business & Tax Details
        gstHstNumber: c.gstHstNumber,
        pstQstNumber: c.pstQstNumber,
        businessStructure: c.businessStructure,
        corpRegistrationNumber: c.corpRegistrationNumber,
        // Billing Address
        streetAddress: c.streetAddress,
        suite: c.suite,
        city: c.city,
        province: c.province,
        postalCode: c.postalCode,
        country: c.country,
        // Internal Notes
        internalNotes: c.internalNotes,
        // Primary Contact
        contactName: c.contactName,
        position: c.position,
        directPhone: c.directPhone,
        // Financial Settings
        creditLimit: c.creditLimit ? Number(c.creditLimit) : null,
        paymentTerms: c.paymentTerms,
        currency: c.currency,
        // Categorization
        leadSource: c.leadSource,
        clientCategory: c.clientCategory,
        tags: c.tags || [],
        // Metadata
        contactsCount: c._count?.contacts || 0,
        projectsCount: c._count?.projects || 0,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
    };
}
//# sourceMappingURL=clients.dto.js.map