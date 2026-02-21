"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePaginationParams = parsePaginationParams;
exports.getPaginationMeta = getPaginationMeta;
function parsePaginationParams(params) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;
    const result = {
        skip,
        take: limit,
    };
    if (params.sortBy) {
        result.orderBy = {
            [params.sortBy]: params.sortOrder || 'desc',
        };
    }
    return result;
}
function getPaginationMeta(total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    return {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
    };
}
//# sourceMappingURL=pagination.js.map