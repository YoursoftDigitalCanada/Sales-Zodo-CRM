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
exports.emailsRoutes = exports.emailsRepository = exports.emailsService = exports.emailsController = void 0;
var emails_controller_1 = require("./emails.controller");
Object.defineProperty(exports, "emailsController", { enumerable: true, get: function () { return emails_controller_1.emailsController; } });
var emails_service_1 = require("./emails.service");
Object.defineProperty(exports, "emailsService", { enumerable: true, get: function () { return emails_service_1.emailsService; } });
var emails_repository_1 = require("./emails.repository");
Object.defineProperty(exports, "emailsRepository", { enumerable: true, get: function () { return emails_repository_1.emailsRepository; } });
__exportStar(require("./emails.dto"), exports);
__exportStar(require("./emails.validators"), exports);
var emails_routes_1 = require("./emails.routes");
Object.defineProperty(exports, "emailsRoutes", { enumerable: true, get: function () { return __importDefault(emails_routes_1).default; } });
//# sourceMappingURL=index.js.map