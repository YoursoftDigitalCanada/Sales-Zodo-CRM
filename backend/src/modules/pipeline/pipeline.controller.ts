import { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../common/utils/responseFormatter";
import { leadsService } from "../leads/leads.service";
import { projectsService } from "../projects/projects.service";

export class PipelineController {
  async transition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.context.tenantId;
      const { entityType, entityId, toStatus } = req.body as {
        entityType: "LEAD" | "PROJECT";
        entityId: string;
        toStatus: string;
      };

      if (entityType === "LEAD") {
        const lead = await leadsService.updateStatus(entityId, tenantId, toStatus as any);
        sendSuccess(res, lead, "Lead pipeline transition completed");
        return;
      }

      const project = await projectsService.updateStatus(entityId, tenantId, toStatus);
      sendSuccess(res, project, "Project pipeline transition completed");
    } catch (error) {
      next(error);
    }
  }
}

export const pipelineController = new PipelineController();

