import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { leadSourceSyncService } from './lead-source-sync.service';

export class LeadSourceWebhooksController {
  /**
   * POST /api/v1/webhooks/leads/:sourceId
   * Ingest webhook payload and create tenant-scoped leads.
   */
  async receive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sourceId = req.params.sourceId;
      if (!sourceId || typeof sourceId !== 'string') {
        throw new BadRequestError('Invalid lead source ID', ErrorCodes.INVALID_INPUT);
      }

      const querySecret = typeof req.query.secret === 'string' ? req.query.secret : undefined;
      const result = await leadSourceSyncService.ingestWebhook(
        sourceId,
        req.body,
        req.headers as Record<string, string | string[] | undefined>,
        querySecret
      );

      res.status(202).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const leadSourceWebhooksController = new LeadSourceWebhooksController();
