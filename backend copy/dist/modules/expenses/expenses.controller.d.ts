import { Request, Response, NextFunction } from 'express';
export declare class ExpensesController {
    create(req: Request, res: Response, next: NextFunction): Promise<void>;
    getMany(req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    update(req: Request, res: Response, next: NextFunction): Promise<void>;
    approve(req: Request, res: Response, next: NextFunction): Promise<void>;
    delete(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const expensesController: ExpensesController;
//# sourceMappingURL=expenses.controller.d.ts.map