"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.decodeToken = decodeToken;
exports.getTokenExpiry = getTokenExpiry;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../../config");
function generateAccessToken(payload) {
    const tokenPayload = { ...payload, type: 'access' };
    const options = {
        expiresIn: config_1.config.jwt.accessExpiry,
        issuer: config_1.config.app.name,
        subject: payload.userId,
    };
    return jsonwebtoken_1.default.sign(tokenPayload, config_1.config.jwt.accessSecret, options);
}
function generateRefreshToken(payload) {
    const tokenPayload = { ...payload, type: 'refresh' };
    const options = {
        expiresIn: config_1.config.jwt.refreshExpiry,
        issuer: config_1.config.app.name,
        subject: payload.userId,
    };
    return jsonwebtoken_1.default.sign(tokenPayload, config_1.config.jwt.refreshSecret, options);
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, config_1.config.jwt.accessSecret);
}
function verifyRefreshToken(token) {
    return jsonwebtoken_1.default.verify(token, config_1.config.jwt.refreshSecret);
}
function decodeToken(token) {
    try {
        return jsonwebtoken_1.default.decode(token);
    }
    catch {
        return null;
    }
}
function getTokenExpiry(token) {
    const decoded = decodeToken(token);
    if (decoded?.exp) {
        return new Date(decoded.exp * 1000);
    }
    return null;
}
//# sourceMappingURL=jwt.js.map