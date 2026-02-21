import { Request, Response, NextFunction } from 'express';
export declare class GroupsController {
    create(req: Request, res: Response, next: NextFunction): Promise<void>;
    getMany(req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    update(req: Request, res: Response, next: NextFunction): Promise<void>;
    addMembers(req: Request, res: Response, next: NextFunction): Promise<void>;
    removeMembers(req: Request, res: Response, next: NextFunction): Promise<void>;
    delete(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const groupsController: GroupsController;
//# sourceMappingURL=groups.controller.d.ts.map