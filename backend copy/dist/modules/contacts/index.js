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
exports.contactsRoutes = exports.contactsRepository = exports.contactsManager = exports.contactsService = exports.contactsController = void 0;
var contacts_controller_1 = require("./contacts.controller");
Object.defineProperty(exports, "contactsController", { enumerable: true, get: function () { return contacts_controller_1.contactsController; } });
var contacts_service_1 = require("./contacts.service");
Object.defineProperty(exports, "contactsService", { enumerable: true, get: function () { return contacts_service_1.contactsService; } });
var contacts_manager_1 = require("./contacts.manager");
Object.defineProperty(exports, "contactsManager", { enumerable: true, get: function () { return contacts_manager_1.contactsManager; } });
var contacts_repository_1 = require("./contacts.repository");
Object.defineProperty(exports, "contactsRepository", { enumerable: true, get: function () { return contacts_repository_1.contactsRepository; } });
__exportStar(require("./contacts.dto"), exports);
__exportStar(require("./contacts.validators"), exports);
var contacts_routes_1 = require("./contacts.routes");
Object.defineProperty(exports, "contactsRoutes", { enumerable: true, get: function () { return __importDefault(contacts_routes_1).default; } });
//# sourceMappingURL=index.js.map