import { Request, Response } from 'express';
/**
 * Request logger middleware using Morgan
 */
export declare const requestLogger: (req: Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>, res: import("http").ServerResponse<import("http").IncomingMessage>, callback: (err?: Error) => void) => void;
/**
 * Request ID middleware - adds unique ID to each request
 */
export declare function requestId(req: Request, res: Response, next: Function): void;
/**
 * Request timing middleware
 */
export declare function requestTiming(req: Request, res: Response, next: Function): void;
//# sourceMappingURL=requestLogger.middleware.d.ts.map