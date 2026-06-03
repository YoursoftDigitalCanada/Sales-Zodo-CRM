import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { formsService } from './forms.service';

export class FormsController {
  private tenantId(req: Request): string {
    const tenantId = req.context?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Tenant context required.', ErrorCodes.TENANT_NOT_FOUND);
    return tenantId;
  }

  private employeeId(req: Request): string | undefined {
    return req.employee?.id || req.user?.employeeId;
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const form = await formsService.create(this.tenantId(req), req.body, this.employeeId(req));
      res.status(201).json({ success: true, data: form });
    } catch (error) { next(error); }
  }

  async getMany(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await formsService.getMany(this.tenantId(req), req.query as any);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await formsService.getById(this.tenantId(req), req.params.id) });
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await formsService.update(this.tenantId(req), req.params.id, req.body, this.employeeId(req)) });
    } catch (error) { next(error); }
  }

  async duplicate(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json({ success: true, data: await formsService.duplicate(this.tenantId(req), req.params.id, this.employeeId(req)) });
    } catch (error) { next(error); }
  }

  async publish(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await formsService.publish(this.tenantId(req), req.params.id, this.employeeId(req)) });
    } catch (error) { next(error); }
  }

  async archive(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await formsService.archive(this.tenantId(req), req.params.id, this.employeeId(req)) });
    } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await formsService.delete(this.tenantId(req), req.params.id, this.employeeId(req));
      res.status(204).send();
    } catch (error) { next(error); }
  }

  async submissions(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await formsService.listSubmissions(this.tenantId(req), req.params.id, req.query as any);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async submission(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await formsService.getSubmission(this.tenantId(req), req.params.id, req.params.submissionId) });
    } catch (error) { next(error); }
  }

  async deleteSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      await formsService.deleteSubmission(this.tenantId(req), req.params.id, req.params.submissionId);
      res.status(204).send();
    } catch (error) { next(error); }
  }

  async exportSubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const csv = await formsService.exportCsv(this.tenantId(req), req.params.id);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="form-${req.params.id}-submissions.csv"`);
      res.send(csv);
    } catch (error) { next(error); }
  }

  async analytics(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await formsService.analytics(this.tenantId(req), req.params.id) });
    } catch (error) { next(error); }
  }

  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await formsService.summary(this.tenantId(req)) });
    } catch (error) { next(error); }
  }

  async publicForm(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await formsService.publicForm(req.params.publicId) });
    } catch (error) { next(error); }
  }

  async publicView(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await formsService.recordView(req.params.publicId) });
    } catch (error) { next(error); }
  }

  async publicSubmit(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await formsService.submitPublic(req.params.publicId, req.body, {
        ip: req.ip,
        userAgent: req.get('user-agent') || undefined,
        referrerUrl: req.get('referer') || undefined,
        landingPageUrl: req.get('origin') || undefined,
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async embedJs(req: Request, res: Response, next: NextFunction) {
    try {
      await formsService.publicForm(req.params.publicId);
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.send(formsService.embedJs(req.params.publicId));
    } catch (error) { next(error); }
  }
}

export const formsController = new FormsController();
