"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsController = exports.AnalyticsController = void 0;
const analytics_service_1 = require("./analytics.service");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class AnalyticsController {
    async getDashboard(req, res, next) {
        try {
            const stats = await analytics_service_1.analyticsService.getDashboardStats(req.user.tenantId);
            (0, responseFormatter_1.sendSuccess)(res, stats);
        }
        catch (e) {
            next(e);
        }
    }
    async getLeadsReport(req, res, next) {
        try {
            const report = await analytics_service_1.analyticsService.getLeadsReport(req.user.tenantId, req.query);
            (0, responseFormatter_1.sendSuccess)(res, report);
        }
        catch (e) {
            next(e);
        }
    }
    async getRevenueReport(req, res, next) {
        try {
            const report = await analytics_service_1.analyticsService.getRevenueReport(req.user.tenantId);
            (0, responseFormatter_1.sendSuccess)(res, report);
        }
        catch (e) {
            next(e);
        }
    }
}
exports.AnalyticsController = AnalyticsController;
exports.analyticsController = new AnalyticsController();
//# sourceMappingURL=analytics.controller.js.map