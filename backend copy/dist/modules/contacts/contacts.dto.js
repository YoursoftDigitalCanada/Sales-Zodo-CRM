"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toContactResponseDto = toContactResponseDto;
function toContactResponseDto(c) {
    return {
        id: c.id,
        contactName: c.contactName,
        company: c.company ? { id: c.company.id, clientName: c.company.clientName } : null,
        type: c.type,
        jobTitle: c.jobTitle,
        department: c.department,
        email: c.email,
        officePhone: c.officePhone,
        mobilePhone: c.mobilePhone,
        linkedInUrl: c.linkedInUrl,
        isPrimaryContact: c.isPrimaryContact,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
    };
}
//# sourceMappingURL=contacts.dto.js.map