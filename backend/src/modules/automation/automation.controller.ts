import { Request, Response, NextFunction } from 'express';
import { sendCreated, sendNoContent, sendSuccess } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';
import { salesAutomationService } from './sales-automation.service';

export class AutomationController {
  async listRules(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await salesAutomationService.listRules(req.context.tenantId, req.query as any)); } catch (error) { next(error); }
  }

  async createRule(req: Request, res: Response, next: NextFunction) {
    try { sendCreated(res, await salesAutomationService.createRule(req.context.tenantId, sanitizeBody(req.body), req.user?.userId), 'Automation rule created'); } catch (error) { next(error); }
  }

  async getRule(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await salesAutomationService.getRule(req.context.tenantId, req.params.id)); } catch (error) { next(error); }
  }

  async updateRule(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await salesAutomationService.updateRule(req.context.tenantId, req.params.id, sanitizeBody(req.body)), 'Automation rule updated'); } catch (error) { next(error); }
  }

  async deleteRule(req: Request, res: Response, next: NextFunction) {
    try { await salesAutomationService.deleteRule(req.context.tenantId, req.params.id); sendNoContent(res); } catch (error) { next(error); }
  }

  async enableRule(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await salesAutomationService.setRuleActive(req.context.tenantId, req.params.id, true), 'Automation rule enabled'); } catch (error) { next(error); }
  }

  async disableRule(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await salesAutomationService.setRuleActive(req.context.tenantId, req.params.id, false), 'Automation rule disabled'); } catch (error) { next(error); }
  }

  async listRuns(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await salesAutomationService.listRuns(req.context.tenantId, req.query as any)); } catch (error) { next(error); }
  }

  async retryRun(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(
        res,
        await salesAutomationService.retryRun(req.context.tenantId, req.params.id, req.user?.userId),
        'Automation retry queued',
      );
    } catch (error) { next(error); }
  }

  async listReminders(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await salesAutomationService.listReminders(req.context.tenantId, req.query as any)); } catch (error) { next(error); }
  }

  async cancelReminder(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await salesAutomationService.cancelReminder(req.context.tenantId, req.params.id), 'Reminder cancelled'); } catch (error) { next(error); }
  }

  async seedDefaults(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await salesAutomationService.seedDefaults(req.context.tenantId, req.user?.userId), 'Default automation rules seeded'); } catch (error) { next(error); }
  }

  async testTrigger(req: Request, res: Response, next: NextFunction) {
    try {
      const body = sanitizeBody(req.body);
      const result = await salesAutomationService.testTrigger(req.context.tenantId, body, req.user?.userId);
      sendSuccess(res, result, result.executed ? 'Automation trigger executed' : 'Automation trigger dry-run complete');
    } catch (error) { next(error); }
  }
}

export const automationController = new AutomationController();
