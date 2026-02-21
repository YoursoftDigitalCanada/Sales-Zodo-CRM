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
exports.clientsRoutes = exports.clientsRepository = exports.clientsManager = exports.clientsService = exports.clientsController = void 0;
var clients_controller_1 = require("./clients.controller");
Object.defineProperty(exports, "clientsController", { enumerable: true, get: function () { return clients_controller_1.clientsController; } });
var clients_service_1 = require("./clients.service");
Object.defineProperty(exports, "clientsService", { enumerable: true, get: function () { return clients_service_1.clientsService; } });
var clients_manager_1 = require("./clients.manager");
Object.defineProperty(exports, "clientsManager", { enumerable: true, get: function () { return clients_manager_1.clientsManager; } });
var clients_repository_1 = require("./clients.repository");
Object.defineProperty(exports, "clientsRepository", { enumerable: true, get: function () { return clients_repository_1.clientsRepository; } });
__exportStar(require("./clients.dto"), exports);
__exportStar(require("./clients.validators"), exports);
var clients_routes_1 = require("./clients.routes");
Object.defineProperty(exports, "clientsRoutes", { enumerable: true, get: function () { return __importDefault(clients_routes_1).default; } });
//# sourceMappingURL=index.js.map