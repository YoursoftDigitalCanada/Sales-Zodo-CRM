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
exports.filesRoutes = exports.filesRepository = exports.filesService = exports.filesController = void 0;
var files_controller_1 = require("./files.controller");
Object.defineProperty(exports, "filesController", { enumerable: true, get: function () { return files_controller_1.filesController; } });
var files_service_1 = require("./files.service");
Object.defineProperty(exports, "filesService", { enumerable: true, get: function () { return files_service_1.filesService; } });
var files_repository_1 = require("./files.repository");
Object.defineProperty(exports, "filesRepository", { enumerable: true, get: function () { return files_repository_1.filesRepository; } });
__exportStar(require("./files.dto"), exports);
__exportStar(require("./files.validators"), exports);
var files_routes_1 = require("./files.routes");
Object.defineProperty(exports, "filesRoutes", { enumerable: true, get: function () { return __importDefault(files_routes_1).default; } });
//# sourceMappingURL=index.js.map