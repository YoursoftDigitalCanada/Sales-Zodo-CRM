"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsController = exports.SettingsController = void 0;
const settings_service_1 = require("./settings.service");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class SettingsController {
    async get(req, res, next) {
        try {
            const settings = await settings_service_1.settingsService.get(req.user.tenantId);
            (0, responseFormatter_1.sendSuccess)(res, settings);
        }
        catch (e) {
            next(e);
        }
    }
    async update(req, res, next) {
        try {
            const settings = await settings_service_1.settingsService.update(req.user.tenantId, req.body);
            (0, responseFormatter_1.sendSuccess)(res, settings, 'Settings updated');
        }
        catch (e) {
            next(e);
        }
    }
}
exports.SettingsController = SettingsController;
exports.settingsController = new SettingsController();
//# sourceMappingURL=settings.controller.js.map