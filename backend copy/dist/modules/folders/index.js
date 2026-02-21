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
exports.foldersRoutes = exports.foldersRepository = exports.foldersService = exports.foldersController = void 0;
var folders_controller_1 = require("./folders.controller");
Object.defineProperty(exports, "foldersController", { enumerable: true, get: function () { return folders_controller_1.foldersController; } });
var folders_service_1 = require("./folders.service");
Object.defineProperty(exports, "foldersService", { enumerable: true, get: function () { return folders_service_1.foldersService; } });
var folders_repository_1 = require("./folders.repository");
Object.defineProperty(exports, "foldersRepository", { enumerable: true, get: function () { return folders_repository_1.foldersRepository; } });
__exportStar(require("./folders.dto"), exports);
__exportStar(require("./folders.validators"), exports);
var folders_routes_1 = require("./folders.routes");
Object.defineProperty(exports, "foldersRoutes", { enumerable: true, get: function () { return __importDefault(folders_routes_1).default; } });
//# sourceMappingURL=index.js.map