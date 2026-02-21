"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.morganStream = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../../config");
const { combine, timestamp, printf, colorize, errors } = winston_1.default.format;
// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        log += ` ${JSON.stringify(metadata)}`;
    }
    if (stack) {
        log += `\n${stack}`;
    }
    return log;
});
// Create transports array
const transports = [
    new winston_1.default.transports.Console({
        format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), logFormat),
    }),
];
// Add file transport in production
if (config_1.config.app.isProduction) {
    transports.push(new winston_1.default.transports.File({
        filename: path_1.default.join(config_1.config.logging.filePath, 'error.log'),
        level: 'error',
        format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), logFormat),
    }), new winston_1.default.transports.File({
        filename: path_1.default.join(config_1.config.logging.filePath, 'combined.log'),
        format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), logFormat),
    }));
}
exports.logger = winston_1.default.createLogger({
    level: config_1.config.logging.level,
    transports,
    exitOnError: false,
});
// Stream for Morgan
exports.morganStream = {
    write: (message) => {
        exports.logger.http(message.trim());
    },
};
//# sourceMappingURL=logger.js.map