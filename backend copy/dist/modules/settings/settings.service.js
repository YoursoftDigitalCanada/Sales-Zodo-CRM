"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsService = exports.SettingsService = void 0;
const settings_repository_1 = require("./settings.repository");
const settings_dto_1 = require("./settings.dto");
class SettingsService {
    async get(tenantId) {
        let settings = await settings_repository_1.settingsRepository.findByTenantId(tenantId);
        if (!settings) {
            settings = await settings_repository_1.settingsRepository.upsert(tenantId, {});
        }
        return (0, settings_dto_1.toSettingsResponseDto)(settings);
    }
    async update(tenantId, data) {
        const settings = await settings_repository_1.settingsRepository.upsert(tenantId, data);
        return (0, settings_dto_1.toSettingsResponseDto)(settings);
    }
}
exports.SettingsService = SettingsService;
exports.settingsService = new SettingsService();
//# sourceMappingURL=settings.service.js.map