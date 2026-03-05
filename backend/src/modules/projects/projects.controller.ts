import { Request, Response, NextFunction } from 'express';
import { projectsService } from './projects.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';

export class ProjectsController {
  private getTenantId(req: Request): string {
    return req.context.tenantId;
  }

  private getUserId(req: Request): string | undefined {
    return req.context.userId || req.user?.userId;
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectsService.create(
        this.getTenantId(req),
        sanitizeBody(req.body),
        this.getUserId(req),
      );
      sendCreated(res, project, 'Project created');
    } catch (error) {
      next(error);
    }
  }

  async createFromQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectsService.createFromQuote(
        this.getTenantId(req),
        req.params.quoteId,
        this.getUserId(req),
      );
      sendCreated(res, project, 'Project created from quote');
    } catch (error) {
      next(error);
    }
  }

  async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await projectsService.getMany(this.getTenantId(req), req.query as any);
      sendSuccess(res, result.data, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getKanban(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.getKanban(this.getTenantId(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getCalendar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.getCalendar(this.getTenantId(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getMap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.getMap(this.getTenantId(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getSummaryStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.getSummaryStats(this.getTenantId(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectsService.getById(req.params.id, this.getTenantId(req));
      sendSuccess(res, project);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectsService.update(req.params.id, this.getTenantId(req), sanitizeBody(req.body));
      sendSuccess(res, project, 'Project updated');
    } catch (error) {
      next(error);
    }
  }

  async updateStage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectsService.updateStage(
        req.params.id,
        this.getTenantId(req),
        req.body.stageId,
        this.getUserId(req),
        req.body.notes,
      );
      sendSuccess(res, project, 'Project stage updated');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectsService.updateStatus(req.params.id, this.getTenantId(req), req.body.status);
      sendSuccess(res, project, 'Project status updated');
    } catch (error) {
      next(error);
    }
  }

  async assignProjectManager(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectsService.assignProjectManager(
        req.params.id,
        this.getTenantId(req),
        req.body.projectManagerId ?? null,
      );
      sendSuccess(res, project, 'Project manager updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectsService.delete(req.params.id, this.getTenantId(req));
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async getFinancials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.getFinancials(req.params.id, this.getTenantId(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getProfitability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.getProfitability(req.params.id, this.getTenantId(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async recalculateFinancials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.recalculateFinancials(req.params.id, this.getTenantId(req));
      sendSuccess(res, data, 'Project financials recalculated');
    } catch (error) {
      next(error);
    }
  }

  async getTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.getTasks(req.params.id, this.getTenantId(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.createTask(
        req.params.id,
        this.getTenantId(req),
        sanitizeBody(req.body),
        this.getUserId(req),
      );
      sendCreated(res, data, 'Task created');
    } catch (error) {
      next(error);
    }
  }

  async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.updateTask(
        req.params.id,
        req.params.taskId,
        this.getTenantId(req),
        sanitizeBody(req.body),
      );
      sendSuccess(res, data, 'Task updated');
    } catch (error) {
      next(error);
    }
  }

  async completeTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.completeTask(
        req.params.id,
        req.params.taskId,
        this.getTenantId(req),
        this.getUserId(req),
      );
      sendSuccess(res, data, 'Task completed');
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectsService.deleteTask(req.params.id, req.params.taskId, this.getTenantId(req));
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async getMaterials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.getMaterials(req.params.id, this.getTenantId(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async addMaterial(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.addMaterial(req.params.id, this.getTenantId(req), sanitizeBody(req.body));
      sendCreated(res, data, 'Material added');
    } catch (error) {
      next(error);
    }
  }

  async updateMaterial(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.updateMaterial(
        req.params.id,
        req.params.materialId,
        this.getTenantId(req),
        sanitizeBody(req.body),
      );
      sendSuccess(res, data, 'Material updated');
    } catch (error) {
      next(error);
    }
  }

  async deleteMaterial(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectsService.deleteMaterial(req.params.id, req.params.materialId, this.getTenantId(req));
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async importMaterialsFromQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.importMaterialsFromQuote(req.params.id, this.getTenantId(req));
      sendSuccess(res, data, 'Materials imported from quote');
    } catch (error) {
      next(error);
    }
  }

  async getLabor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.getLabor(req.params.id, this.getTenantId(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async addLabor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.addLabor(
        req.params.id,
        this.getTenantId(req),
        sanitizeBody(req.body),
        this.getUserId(req),
      );
      sendCreated(res, data, 'Labor entry added');
    } catch (error) {
      next(error);
    }
  }

  async updateLabor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.updateLabor(
        req.params.id,
        req.params.laborId,
        this.getTenantId(req),
        sanitizeBody(req.body),
      );
      sendSuccess(res, data, 'Labor entry updated');
    } catch (error) {
      next(error);
    }
  }

  async deleteLabor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectsService.deleteLabor(req.params.id, req.params.laborId, this.getTenantId(req));
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async getLaborSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.getLaborSummary(req.params.id, this.getTenantId(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getExpenses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.getExpenses(req.params.id, this.getTenantId(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async addExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.addExpense(
        req.params.id,
        this.getTenantId(req),
        sanitizeBody(req.body),
        this.getUserId(req),
      );
      sendCreated(res, data, 'Expense added');
    } catch (error) {
      next(error);
    }
  }

  async updateExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.updateExpense(
        req.params.id,
        req.params.expenseId,
        this.getTenantId(req),
        sanitizeBody(req.body),
      );
      sendSuccess(res, data, 'Expense updated');
    } catch (error) {
      next(error);
    }
  }

  async deleteExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectsService.deleteExpense(req.params.id, req.params.expenseId, this.getTenantId(req));
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async getCrews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.getCrewAssignments(req.params.id, this.getTenantId(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async assignCrew(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.assignCrew(req.params.id, this.getTenantId(req), sanitizeBody(req.body));
      sendCreated(res, data, 'Crew assigned');
    } catch (error) {
      next(error);
    }
  }

  async updateCrew(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.updateCrewAssignment(
        req.params.id,
        req.params.assignmentId,
        this.getTenantId(req),
        sanitizeBody(req.body),
      );
      sendSuccess(res, data, 'Crew assignment updated');
    } catch (error) {
      next(error);
    }
  }

  async removeCrew(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectsService.deleteCrewAssignment(req.params.id, req.params.assignmentId, this.getTenantId(req));
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async getDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.getDocuments(req.params.id, this.getTenantId(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async attachDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.attachDocument(
        req.params.id,
        this.getTenantId(req),
        sanitizeBody(req.body),
        this.getUserId(req),
      );
      sendCreated(res, data, 'Document attached');
    } catch (error) {
      next(error);
    }
  }

  async removeDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectsService.removeDocument(req.params.id, req.params.docId, this.getTenantId(req));
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async getPhotos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.getPhotos(req.params.id, this.getTenantId(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async uploadPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.uploadPhoto(
        req.params.id,
        this.getTenantId(req),
        sanitizeBody(req.body),
        this.getUserId(req),
      );
      sendCreated(res, data, 'Photo uploaded');
    } catch (error) {
      next(error);
    }
  }

  async updatePhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.updatePhoto(
        req.params.id,
        req.params.photoId,
        this.getTenantId(req),
        sanitizeBody(req.body),
      );
      sendSuccess(res, data, 'Photo updated');
    } catch (error) {
      next(error);
    }
  }

  async deletePhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectsService.deletePhoto(req.params.id, req.params.photoId, this.getTenantId(req));
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async getNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.getNotes(req.params.id, this.getTenantId(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async addNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.addNote(
        req.params.id,
        this.getTenantId(req),
        sanitizeBody(req.body),
        this.getUserId(req),
      );
      sendCreated(res, data, 'Note added');
    } catch (error) {
      next(error);
    }
  }

  async updateNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.updateNote(
        req.params.id,
        req.params.noteId,
        this.getTenantId(req),
        sanitizeBody(req.body),
      );
      sendSuccess(res, data, 'Note updated');
    } catch (error) {
      next(error);
    }
  }

  async deleteNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectsService.deleteNote(req.params.id, req.params.noteId, this.getTenantId(req));
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async getCommunications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.getCommunications(req.params.id, this.getTenantId(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async logCommunication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.logCommunication(
        req.params.id,
        this.getTenantId(req),
        sanitizeBody(req.body),
        this.getUserId(req),
      );
      sendCreated(res, data, 'Communication logged');
    } catch (error) {
      next(error);
    }
  }

  async getInspections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.getInspections(req.params.id, this.getTenantId(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async scheduleInspection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.scheduleInspection(
        req.params.id,
        this.getTenantId(req),
        sanitizeBody(req.body),
        this.getUserId(req),
      );
      sendCreated(res, data, 'Inspection scheduled');
    } catch (error) {
      next(error);
    }
  }

  async updateInspection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.updateInspection(
        req.params.id,
        req.params.inspId,
        this.getTenantId(req),
        sanitizeBody(req.body),
      );
      sendSuccess(res, data, 'Inspection updated');
    } catch (error) {
      next(error);
    }
  }

  async recordInspectionResult(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.recordInspectionResult(
        req.params.id,
        req.params.inspId,
        this.getTenantId(req),
        sanitizeBody(req.body),
      );
      sendSuccess(res, data, 'Inspection result recorded');
    } catch (error) {
      next(error);
    }
  }

  async getChangeOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.getChangeOrders(req.params.id, this.getTenantId(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async createChangeOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.createChangeOrder(
        req.params.id,
        this.getTenantId(req),
        sanitizeBody(req.body),
        this.getUserId(req),
      );
      sendCreated(res, data, 'Change order created');
    } catch (error) {
      next(error);
    }
  }

  async updateChangeOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.updateChangeOrder(
        req.params.id,
        req.params.coId,
        this.getTenantId(req),
        sanitizeBody(req.body),
      );
      sendSuccess(res, data, 'Change order updated');
    } catch (error) {
      next(error);
    }
  }

  async approveChangeOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.approveChangeOrder(req.params.id, req.params.coId, this.getTenantId(req));
      sendSuccess(res, data, 'Change order approved');
    } catch (error) {
      next(error);
    }
  }

  async getWeatherDelays(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.getWeatherDelays(req.params.id, this.getTenantId(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async addWeatherDelay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.addWeatherDelay(
        req.params.id,
        this.getTenantId(req),
        sanitizeBody(req.body),
        this.getUserId(req),
      );
      sendCreated(res, data, 'Weather delay logged');
    } catch (error) {
      next(error);
    }
  }

  async getTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.getTimeline(req.params.id, this.getTenantId(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getStageHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await projectsService.getStageHistory(req.params.id, this.getTenantId(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }
}

export const projectsController = new ProjectsController();
