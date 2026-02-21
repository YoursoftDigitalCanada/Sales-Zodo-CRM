"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toBookingResponseDto = toBookingResponseDto;
function toBookingResponseDto(b) {
    let clientDisplayName;
    if (b.client) {
        clientDisplayName = b.client.clientType === 'COMPANY' ? b.client.companyName || 'Company' : `${b.client.firstName || ''} ${b.client.lastName || ''}`.trim();
    }
    return {
        id: b.id,
        title: b.title,
        description: b.description,
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status,
        location: b.location,
        notes: b.notes,
        client: b.client ? { id: b.client.id, displayName: clientDisplayName } : null,
        assignedTo: b.assignedTo ? { id: b.assignedTo.id, firstName: b.assignedTo.user.firstName, lastName: b.assignedTo.user.lastName } : null,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
    };
}
//# sourceMappingURL=bookings.dto.js.map