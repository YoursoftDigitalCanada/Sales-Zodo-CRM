"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCalendarEventResponseDto = toCalendarEventResponseDto;
function toCalendarEventResponseDto(e) {
    return {
        id: e.id,
        eventTitle: e.eventTitle,
        description: e.description,
        isAllDay: e.isAllDay,
        startDate: e.startDate,
        startTime: e.startTime,
        endDate: e.endDate,
        endTime: e.endTime,
        category: e.category,
        color: e.color,
        location: e.location,
        meetingLink: e.meetingLink,
        priority: e.priority,
        attendees: (e.attendees || []).map((a) => ({ id: a.employee.id, firstName: a.employee.user.firstName, lastName: a.employee.user.lastName })),
        isPrivate: e.isPrivate,
        notes: e.notes,
        createdBy: e.createdBy ? { id: e.createdBy.id, firstName: e.createdBy.user.firstName, lastName: e.createdBy.user.lastName } : null,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
    };
}
//# sourceMappingURL=calendar.dto.js.map