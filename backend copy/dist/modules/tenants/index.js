"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantsRoutes = exports.tenantsRepository = exports.tenantsService = exports.tenantsController = void 0;
var tenants_controller_1 = require("./tenants.controller");
Object.defineProperty(exports, "tenantsController", { enumerable: true, get: function () { return tenants_controller_1.tenantsController; } });
var tenants_service_1 = require("./tenants.service");
Object.defineProperty(exports, "tenantsService", { enumerable: true, get: function () { return tenants_service_1.tenantsService; } });
var tenants_repository_1 = require("./tenants.repository");
Object.defineProperty(exports, "tenantsRepository", { enumerable: true, get: function () { return tenants_repository_1.tenantsRepository; } });
__exportStar(require("./tenants.dto"), exports);
__exportStar(require("./tenants.validators"), exports);
var tenants_routes_1 = require("./tenants.routes");
Object.defineProperty(exports, "tenantsRoutes", { enumerable: true, get: function () { return __importDefault(tenants_routes_1).default; } });
//# sourceMappingURL=index.js.map