import { Response } from 'express';
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    meta?: PaginationMeta;
    errors?: any[];
}
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}
export declare function sendSuccess<T>(res: Response, data?: T, message?: string, statusCode?: number, meta?: PaginationMeta): Response;
export declare function sendCreated<T>(res: Response, data?: T, message?: string): Response;
export declare function sendNoContent(res: Response): Response;
export declare function sendPaginated<T>(res: Response, data: T[], total: number, page: number, limit: number, message?: string): Response;
export declare function sendError(res: Response, message: string, statusCode?: number, code?: string, errors?: any[]): Response;
//# sourceMappingURL=responseFormatter.d.ts.map