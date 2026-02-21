import { Request, Response, NextFunction } from 'express';
export declare class EmailsController {
    createTemplate(req: Request, res: Response, next: NextFunction): Promise<void>;
    getTemplates(req: Request, res: Response, next: NextFunction): Promise<void>;
    getTemplateById(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateTemplate(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteTemplate(req: Request, res: Response, next: NextFunction): Promise<void>;
    sendEmail(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const emailsController: EmailsController;
//# sourceMappingURL=emails.controller.d.ts.map