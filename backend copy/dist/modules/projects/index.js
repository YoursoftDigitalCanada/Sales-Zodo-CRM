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
exports.projectsRoutes = exports.projectsRepository = exports.projectsService = exports.projectsController = void 0;
var projects_controller_1 = require("./projects.controller");
Object.defineProperty(exports, "projectsController", { enumerable: true, get: function () { return projects_controller_1.projectsController; } });
var projects_service_1 = require("./projects.service");
Object.defineProperty(exports, "projectsService", { enumerable: true, get: function () { return projects_service_1.projectsService; } });
var projects_repository_1 = require("./projects.repository");
Object.defineProperty(exports, "projectsRepository", { enumerable: true, get: function () { return projects_repository_1.projectsRepository; } });
__exportStar(require("./projects.dto"), exports);
__exportStar(require("./projects.validators"), exports);
var projects_routes_1 = require("./projects.routes");
Object.defineProperty(exports, "projectsRoutes", { enumerable: true, get: function () { return __importDefault(projects_routes_1).default; } });
//# sourceMappingURL=index.js.map