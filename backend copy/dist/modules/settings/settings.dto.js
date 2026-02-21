"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSettingsResponseDto = toSettingsResponseDto;
function toSettingsResponseDto(s) {
    return {
        id: s.id,
        companyName: s.companyName,
        companyLogo: s.companyLogo,
        timezone: s.timezone,
        dateFormat: s.dateFormat,
        currency: s.currency,
        language: s.language,
        emailSettings: s.emailSettings || {},
        notificationSettings: s.notificationSettings || {},
        updatedAt: s.updatedAt,
    };
}
//# sourceMappingURL=settings.dto.js.map