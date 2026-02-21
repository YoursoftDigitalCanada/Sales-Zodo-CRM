import { Request, Response, NextFunction } from 'express';
export declare class BookingsController {
    create(req: Request, res: Response, next: NextFunction): Promise<void>;
    getMany(req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    update(req: Request, res: Response, next: NextFunction): Promise<void>;
    confirm(req: Request, res: Response, next: NextFunction): Promise<void>;
    cancel(req: Request, res: Response, next: NextFunction): Promise<void>;
    delete(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const bookingsController: BookingsController;
//# sourceMappingURL=bookings.controller.d.ts.map