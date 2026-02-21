import { Request, Response, NextFunction } from 'express';
export declare class TagsController {
    create(req: Request, res: Response, next: NextFunction): Promise<void>;
    getMany(req: Request, res: Response, next: NextFunction): Promise<void>;
    getAll(req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    update(req: Request, res: Response, next: NextFunction): Promise<void>;
    delete(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const tagsController: TagsController;
//# sourceMappingURL=tags.controller.d.ts.map