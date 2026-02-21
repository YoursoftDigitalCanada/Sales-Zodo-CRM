import { Request, Response, NextFunction } from 'express';
export declare class FilesController {
    upload(req: Request, res: Response, next: NextFunction): Promise<void>;
    getMany(req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    update(req: Request, res: Response, next: NextFunction): Promise<void>;
    delete(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const filesController: FilesController;
//# sourceMappingURL=files.controller.d.ts.map