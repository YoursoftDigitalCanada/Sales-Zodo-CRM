import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { projectsRepository } from './projects.repository';
import { normalizeProjectDto, ProjectQueryDto, toNumber } from './projects.dto';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

const NOT_FOUND_MESSAGES = new Set([
  'PROJECT_NOT_FOUND',
  'PROJECT_TASK_NOT_FOUND',
  'PROJECT_MATERIAL_NOT_FOUND',
  'PROJECT_LABOR_NOT_FOUND',
  'PROJECT_EXPENSE_NOT_FOUND',
  'PROJECT_CREW_ASSIGNMENT_NOT_FOUND',
  'PROJECT_DOCUMENT_NOT_FOUND',
  'PROJECT_PHOTO_NOT_FOUND',
  'PROJECT_NOTE_NOT_FOUND',
  'PROJECT_INSPECTION_NOT_FOUND',
  'PROJECT_CHANGE_ORDER_NOT_FOUND',
  'QUOTE_NOT_FOUND',
]);

function mapProjectError(error: unknown): never {
  if (error instanceof NotFoundError || error instanceof BadRequestError || error instanceof ConflictError) {
    throw error;
  }

  if (error instanceof Error && NOT_FOUND_MESSAGES.has(error.message)) {
    throw new NotFoundError('Requested resource not found', ErrorCodes.RESOURCE_NOT_FOUND);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new ConflictError('A project resource with this unique value already exists', ErrorCodes.RESOURCE_ALREADY_EXISTS);
    }
    if (error.code === 'P2003') {
      throw new BadRequestError('Invalid related resource reference', ErrorCodes.INVALID_INPUT);
    }
  }

  if (error instanceof Error) {
    throw new BadRequestError(error.message, ErrorCodes.INVALID_INPUT);
  }

  throw new BadRequestError('Project operation failed', ErrorCodes.INVALID_INPUT);
}

export class ProjectsService {
  private async guarded<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      mapProjectError(error);
    }
  }

  async create(tenantId: string, data: Record<string, any>, createdById?: string) {
    const dto = normalizeProjectDto(data);
    return this.guarded(() => projectsRepository.create(tenantId, dto, createdById));
  }

  async createFromQuote(tenantId: string, quoteId: string, userId?: string) {
    return this.guarded(() => projectsRepository.createFromQuote(tenantId, quoteId, userId));
  }

  async getById(id: string, tenantId: string) {
    return this.guarded(async () => {
      const project = await projectsRepository.findById(id, tenantId);
      if (!project) {
        throw new NotFoundError('Project not found', ErrorCodes.RESOURCE_NOT_FOUND);
      }
      return project;
    });
  }

  async getMany(tenantId: string, query: ProjectQueryDto) {
    return this.guarded(async () => {
      const { data, total } = await projectsRepository.findMany(tenantId, query);
      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const totalPages = Math.ceil(total / limit);

      return {
        data,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    });
  }

  async getKanban(tenantId: string) {
    return this.guarded(() => projectsRepository.getKanban(tenantId));
  }

  async getCalendar(tenantId: string) {
    return this.guarded(() => projectsRepository.getCalendar(tenantId));
  }

  async getMap(tenantId: string) {
    return this.guarded(() => projectsRepository.getMap(tenantId));
  }

  async getSummaryStats(tenantId: string) {
    return this.guarded(() => projectsRepository.getSummaryStats(tenantId));
  }

  async update(id: string, tenantId: string, data: Record<string, any>) {
    const dto = normalizeProjectDto(data);
    return this.guarded(() => projectsRepository.update(id, tenantId, dto));
  }

  async updateStage(id: string, tenantId: string, stageId: string, changedById?: string, notes?: string) {
    // Fetch current project + stage info before update
    const currentProject = await projectsRepository.findById(id, tenantId);
    const previousStage = (currentProject as any)?.stage;

    const updated = await this.guarded(() => projectsRepository.updateStage(id, tenantId, stageId, changedById, notes));

    // Fetch new stage to get slug/name
    const newStage = await prisma.projectStage.findUnique({ where: { id: stageId } });

    if (newStage) {
      const { eventBus } = await import('../../common/events/event-bus');
      eventBus.emit('project.stageChanged', {
        tenantId,
        projectId: id,
        projectName: (updated as any)?.name || '',
        clientId: (updated as any)?.clientId || undefined,
        clientName: (updated as any)?.client?.clientName || undefined,
        previousStageSlug: previousStage?.slug || undefined,
        previousStageName: previousStage?.name || undefined,
        newStageSlug: newStage.slug,
        newStageName: newStage.name,
        contractValue: (updated as any)?.contractValue ? Number((updated as any).contractValue) : undefined,
        changedById,
        projectManagerId: (updated as any)?.projectManagerId || undefined,
        salesRepId: (updated as any)?.salesRepId || undefined,
      });
    }

    return updated;
  }

  async updateStatus(id: string, tenantId: string, status: string) {
    return this.guarded(() => projectsRepository.updateStatus(id, tenantId, status));
  }

  async assignProjectManager(id: string, tenantId: string, projectManagerId?: string | null) {
    return this.guarded(() => projectsRepository.assignProjectManager(id, tenantId, projectManagerId));
  }

  async delete(id: string, tenantId: string) {
    return this.guarded(async () => {
      await projectsRepository.softDelete(id, tenantId);
    });
  }

  async getFinancials(id: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getFinancials(id, tenantId));
  }

  async getProfitability(id: string, tenantId: string) {
    return this.guarded(async () => {
      const financials = await projectsRepository.getFinancials(id, tenantId);
      const contractValue = toNumber(financials.project?.contractValue);
      const actualCost = financials.materialsCost + financials.laborCost + financials.expensesCost;
      const grossProfit = contractValue - actualCost;
      const profitMargin = contractValue > 0 ? (grossProfit / contractValue) * 100 : 0;

      return {
        project: financials.project,
        contractValue,
        actualCost,
        grossProfit,
        profitMargin,
        estimatedCost: toNumber(financials.project?.estimatedCost),
        invoiced: financials.invoiced,
        paid: financials.paid,
        outstanding: financials.invoiced - financials.paid,
        breakdown: {
          materials: financials.materialsCost,
          labor: financials.laborCost,
          expenses: financials.expensesCost,
        },
      };
    });
  }

  async recalculateFinancials(id: string, tenantId: string) {
    return this.guarded(() => projectsRepository.recalculateFinancials(id, tenantId));
  }

  async getTasks(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getTasks(projectId, tenantId));
  }

  async createTask(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    return this.guarded(() => projectsRepository.createTask(projectId, tenantId, data, userId));
  }

  async updateTask(projectId: string, taskId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(() => projectsRepository.updateTask(projectId, taskId, tenantId, data));
  }

  async completeTask(projectId: string, taskId: string, tenantId: string, userId?: string) {
    return this.guarded(() => projectsRepository.completeTask(projectId, taskId, tenantId, userId));
  }

  async deleteTask(projectId: string, taskId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.deleteTask(projectId, taskId, tenantId));
  }

  async getMaterials(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getMaterials(projectId, tenantId));
  }

  async addMaterial(projectId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(() => projectsRepository.addMaterial(projectId, tenantId, data));
  }

  async updateMaterial(projectId: string, materialId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(() => projectsRepository.updateMaterial(projectId, materialId, tenantId, data));
  }

  async deleteMaterial(projectId: string, materialId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.deleteMaterial(projectId, materialId, tenantId));
  }

  async importMaterialsFromQuote(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.importMaterialsFromQuote(projectId, tenantId));
  }

  async getLabor(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getLabor(projectId, tenantId));
  }

  async addLabor(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    return this.guarded(() => projectsRepository.addLabor(projectId, tenantId, data, userId));
  }

  async updateLabor(projectId: string, laborId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(() => projectsRepository.updateLabor(projectId, laborId, tenantId, data));
  }

  async deleteLabor(projectId: string, laborId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.deleteLabor(projectId, laborId, tenantId));
  }

  async getLaborSummary(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getLaborSummary(projectId, tenantId));
  }

  async getExpenses(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getExpenses(projectId, tenantId));
  }

  async addExpense(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    return this.guarded(() => projectsRepository.addExpense(projectId, tenantId, data, userId));
  }

  async updateExpense(projectId: string, expenseId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(() => projectsRepository.updateExpense(projectId, expenseId, tenantId, data));
  }

  async deleteExpense(projectId: string, expenseId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.deleteExpense(projectId, expenseId, tenantId));
  }

  async getCrewAssignments(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getCrewAssignments(projectId, tenantId));
  }

  async assignCrew(projectId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(() => projectsRepository.assignCrew(projectId, tenantId, data));
  }

  async updateCrewAssignment(projectId: string, assignmentId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(() => projectsRepository.updateCrewAssignment(projectId, assignmentId, tenantId, data));
  }

  async deleteCrewAssignment(projectId: string, assignmentId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.deleteCrewAssignment(projectId, assignmentId, tenantId));
  }

  async getDocuments(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getDocuments(projectId, tenantId));
  }

  async attachDocument(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    return this.guarded(() => projectsRepository.attachDocument(projectId, tenantId, data, userId));
  }

  async removeDocument(projectId: string, docId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.removeDocument(projectId, docId, tenantId));
  }

  async getPhotos(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getPhotos(projectId, tenantId));
  }

  async uploadPhoto(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    return this.guarded(() => projectsRepository.uploadPhoto(projectId, tenantId, data, userId));
  }

  async updatePhoto(projectId: string, photoId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(() => projectsRepository.updatePhoto(projectId, photoId, tenantId, data));
  }

  async deletePhoto(projectId: string, photoId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.deletePhoto(projectId, photoId, tenantId));
  }

  async getNotes(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getNotes(projectId, tenantId));
  }

  async addNote(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    return this.guarded(() => projectsRepository.addNote(projectId, tenantId, data, userId));
  }

  async updateNote(projectId: string, noteId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(() => projectsRepository.updateNote(projectId, noteId, tenantId, data));
  }

  async deleteNote(projectId: string, noteId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.deleteNote(projectId, noteId, tenantId));
  }

  async getCommunications(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getCommunications(projectId, tenantId));
  }

  async logCommunication(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    return this.guarded(() => projectsRepository.logCommunication(projectId, tenantId, data, userId));
  }

  async getInspections(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getInspections(projectId, tenantId));
  }

  async scheduleInspection(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    return this.guarded(() => projectsRepository.scheduleInspection(projectId, tenantId, data, userId));
  }

  async updateInspection(projectId: string, inspId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(() => projectsRepository.updateInspection(projectId, inspId, tenantId, data));
  }

  async recordInspectionResult(projectId: string, inspId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(() => projectsRepository.recordInspectionResult(projectId, inspId, tenantId, data));
  }

  async getChangeOrders(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getChangeOrders(projectId, tenantId));
  }

  async createChangeOrder(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    return this.guarded(() => projectsRepository.createChangeOrder(projectId, tenantId, data, userId));
  }

  async updateChangeOrder(projectId: string, coId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(() => projectsRepository.updateChangeOrder(projectId, coId, tenantId, data));
  }

  async approveChangeOrder(projectId: string, coId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.approveChangeOrder(projectId, coId, tenantId));
  }

  async getWeatherDelays(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getWeatherDelays(projectId, tenantId));
  }

  async addWeatherDelay(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    return this.guarded(() => projectsRepository.addWeatherDelay(projectId, tenantId, data, userId));
  }

  async getTimeline(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getTimeline(projectId, tenantId));
  }

  async getStageHistory(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getStageHistory(projectId, tenantId));
  }
}

export const projectsService = new ProjectsService();
