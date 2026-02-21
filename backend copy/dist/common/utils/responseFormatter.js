"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendCreated = sendCreated;
exports.sendNoContent = sendNoContent;
exports.sendPaginated = sendPaginated;
exports.sendError = sendError;
function sendSuccess(res, data, message, statusCode = 200, meta) {
    const response = {
        success: true,
        message,
        data,
        meta,
    };
    return res.status(statusCode).json(response);
}
function sendCreated(res, data, message = 'Created successfully') {
    return sendSuccess(res, data, message, 201);
}
function sendNoContent(res) {
    return res.status(204).send();
}
function sendPaginated(res, data, total, page, limit, message) {
    const totalPages = Math.ceil(total / limit);
    const meta = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
    };
    return sendSuccess(res, data, message, 200, meta);
}
function sendError(res, message, statusCode = 500, code, errors) {
    const response = {
        success: false,
        message,
        errors,
    };
    if (code) {
        response.code = code;
    }
    return res.status(statusCode).json(response);
}
//# sourceMappingURL=responseFormatter.js.map