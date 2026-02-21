export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly isOperational: boolean;
    readonly details?: Record<string, any>;
    constructor(message: string, statusCode?: number, code?: string, isOperational?: boolean, details?: Record<string, any>);
}
//# sourceMappingURL=AppError.d.ts.map