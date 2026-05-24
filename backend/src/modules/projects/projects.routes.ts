import { Router } from 'express';
import { projectsController } from './projects.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { loadDataAccess } from '../../common/middleware/data-access.middleware';
import { requireAccessibleProject } from '../../common/middleware/entity-access.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { requireLegacyRoofingModule } from '../../common/middleware/legacy-roofing-module.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import {
  assignManagerSchema,
  createProjectSchema,
  genericBodySchema,
  nestedAssignmentIdSchema,
  nestedChangeOrderIdSchema,
  nestedDocIdSchema,
  nestedExpenseIdSchema,
  nestedInspectionIdSchema,
  nestedLaborIdSchema,
  nestedMaterialIdSchema,
  nestedNoteIdSchema,
  nestedPhotoIdSchema,
  nestedTaskIdSchema,
  projectIdSchema,
  projectQuerySchema,
  quoteIdSchema,
  stageUpdateSchema,
  statusUpdateSchema,
  updateProjectSchema,
} from './projects.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);
router.use(loadDataAccess);

router.get('/', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectQuerySchema), projectsController.getMany.bind(projectsController));
router.get('/kanban', requirePermission(PERMISSIONS.PROJECTS_VIEW), projectsController.getKanban.bind(projectsController));
router.get('/calendar', requirePermission(PERMISSIONS.PROJECTS_VIEW), projectsController.getCalendar.bind(projectsController));
router.get('/map', requirePermission(PERMISSIONS.PROJECTS_VIEW), projectsController.getMap.bind(projectsController));
router.get('/stats/summary', requirePermission(PERMISSIONS.PROJECTS_VIEW), projectsController.getSummaryStats.bind(projectsController));
router.get('/pipeline/deals/by-stage', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectQuerySchema), projectsController.getDealsByStage.bind(projectsController));

router.post('/', requirePermission(PERMISSIONS.PROJECTS_CREATE), validate(createProjectSchema), projectsController.create.bind(projectsController));
router.post('/pipeline/deals', requirePermission(PERMISSIONS.PROJECTS_CREATE), validate(genericBodySchema), projectsController.createDeal.bind(projectsController));
router.post('/from-quote/:quoteId', requirePermission(PERMISSIONS.PROJECTS_CREATE), validate(quoteIdSchema), projectsController.createFromQuote.bind(projectsController));

router.use('/:id', requireAccessibleProject());

router.get('/:id', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectIdSchema), projectsController.getById.bind(projectsController));
router.get('/:id/deal-detail', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectIdSchema), projectsController.getDealDetail.bind(projectsController));
router.put('/:id', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), validate(updateProjectSchema), projectsController.update.bind(projectsController));
router.put('/:id/deal', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), validate(genericBodySchema), projectsController.updateDeal.bind(projectsController));
router.patch('/:id/deal-stage', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), validate(genericBodySchema), projectsController.moveDealStage.bind(projectsController));
router.patch('/:id/mark-won', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), validate(genericBodySchema), projectsController.markDealWon.bind(projectsController));
router.patch('/:id/mark-lost', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), validate(genericBodySchema), projectsController.markDealLost.bind(projectsController));
router.patch('/:id/stage', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), validate(stageUpdateSchema), projectsController.updateStage.bind(projectsController));
router.patch('/:id/status', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), validate(statusUpdateSchema), projectsController.updateStatus.bind(projectsController));
router.patch('/:id/assign', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), validate(assignManagerSchema), projectsController.assignProjectManager.bind(projectsController));
router.delete('/:id', requirePermission(PERMISSIONS.PROJECTS_DELETE), validate(projectIdSchema), projectsController.delete.bind(projectsController));

router.get('/:id/financials', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectIdSchema), projectsController.getFinancials.bind(projectsController));
router.get('/:id/profitability', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectIdSchema), projectsController.getProfitability.bind(projectsController));
router.post('/:id/recalculate', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), projectsController.recalculateFinancials.bind(projectsController));

router.get('/:id/tasks', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectIdSchema), projectsController.getTasks.bind(projectsController));
router.post('/:id/tasks', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), validate(genericBodySchema), projectsController.createTask.bind(projectsController));
router.put('/:id/tasks/:taskId', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(nestedTaskIdSchema), validate(genericBodySchema), projectsController.updateTask.bind(projectsController));
router.patch('/:id/tasks/:taskId/complete', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(nestedTaskIdSchema), projectsController.completeTask.bind(projectsController));
router.delete('/:id/tasks/:taskId', requirePermission(PERMISSIONS.PROJECTS_DELETE), validate(nestedTaskIdSchema), projectsController.deleteTask.bind(projectsController));

router.get('/:id/materials', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectIdSchema), projectsController.getMaterials.bind(projectsController));
router.post('/:id/materials', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), validate(genericBodySchema), projectsController.addMaterial.bind(projectsController));
router.put('/:id/materials/:materialId', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(nestedMaterialIdSchema), validate(genericBodySchema), projectsController.updateMaterial.bind(projectsController));
router.delete('/:id/materials/:materialId', requirePermission(PERMISSIONS.PROJECTS_DELETE), validate(nestedMaterialIdSchema), projectsController.deleteMaterial.bind(projectsController));
router.post('/:id/materials/from-quote', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), projectsController.importMaterialsFromQuote.bind(projectsController));

router.get('/:id/labor', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectIdSchema), projectsController.getLabor.bind(projectsController));
router.get('/:id/labor/summary', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectIdSchema), projectsController.getLaborSummary.bind(projectsController));
router.post('/:id/labor', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), validate(genericBodySchema), projectsController.addLabor.bind(projectsController));
router.put('/:id/labor/:laborId', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(nestedLaborIdSchema), validate(genericBodySchema), projectsController.updateLabor.bind(projectsController));
router.delete('/:id/labor/:laborId', requirePermission(PERMISSIONS.PROJECTS_DELETE), validate(nestedLaborIdSchema), projectsController.deleteLabor.bind(projectsController));

router.get('/:id/expenses', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectIdSchema), projectsController.getExpenses.bind(projectsController));
router.post('/:id/expenses', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), validate(genericBodySchema), projectsController.addExpense.bind(projectsController));
router.put('/:id/expenses/:expenseId', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(nestedExpenseIdSchema), validate(genericBodySchema), projectsController.updateExpense.bind(projectsController));
router.delete('/:id/expenses/:expenseId', requirePermission(PERMISSIONS.PROJECTS_DELETE), validate(nestedExpenseIdSchema), projectsController.deleteExpense.bind(projectsController));

router.get('/:id/crews', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectIdSchema), projectsController.getCrews.bind(projectsController));
router.post('/:id/crews', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), validate(genericBodySchema), projectsController.assignCrew.bind(projectsController));
router.put('/:id/crews/:assignmentId', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(nestedAssignmentIdSchema), validate(genericBodySchema), projectsController.updateCrew.bind(projectsController));
router.delete('/:id/crews/:assignmentId', requirePermission(PERMISSIONS.PROJECTS_DELETE), validate(nestedAssignmentIdSchema), projectsController.removeCrew.bind(projectsController));

router.get('/:id/documents', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectIdSchema), projectsController.getDocuments.bind(projectsController));
router.post('/:id/documents', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), validate(genericBodySchema), projectsController.attachDocument.bind(projectsController));
router.delete('/:id/documents/:docId', requirePermission(PERMISSIONS.PROJECTS_DELETE), validate(nestedDocIdSchema), projectsController.removeDocument.bind(projectsController));

router.get('/:id/photos', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectIdSchema), projectsController.getPhotos.bind(projectsController));
router.post('/:id/photos', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), validate(genericBodySchema), projectsController.uploadPhoto.bind(projectsController));
router.put('/:id/photos/:photoId', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(nestedPhotoIdSchema), validate(genericBodySchema), projectsController.updatePhoto.bind(projectsController));
router.delete('/:id/photos/:photoId', requirePermission(PERMISSIONS.PROJECTS_DELETE), validate(nestedPhotoIdSchema), projectsController.deletePhoto.bind(projectsController));

router.get('/:id/notes', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectIdSchema), projectsController.getNotes.bind(projectsController));
router.post('/:id/notes', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), validate(genericBodySchema), projectsController.addNote.bind(projectsController));
router.put('/:id/notes/:noteId', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(nestedNoteIdSchema), validate(genericBodySchema), projectsController.updateNote.bind(projectsController));
router.delete('/:id/notes/:noteId', requirePermission(PERMISSIONS.PROJECTS_DELETE), validate(nestedNoteIdSchema), projectsController.deleteNote.bind(projectsController));

router.get('/:id/communications', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectIdSchema), projectsController.getCommunications.bind(projectsController));
router.post('/:id/communications', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), validate(genericBodySchema), projectsController.logCommunication.bind(projectsController));

router.get('/:id/inspections', requireLegacyRoofingModule, requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectIdSchema), projectsController.getInspections.bind(projectsController));
router.post('/:id/inspections', requireLegacyRoofingModule, requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), validate(genericBodySchema), projectsController.scheduleInspection.bind(projectsController));
router.put('/:id/inspections/:inspId', requireLegacyRoofingModule, requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(nestedInspectionIdSchema), validate(genericBodySchema), projectsController.updateInspection.bind(projectsController));
router.patch('/:id/inspections/:inspId/result', requireLegacyRoofingModule, requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(nestedInspectionIdSchema), validate(genericBodySchema), projectsController.recordInspectionResult.bind(projectsController));

router.get('/:id/change-orders', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectIdSchema), projectsController.getChangeOrders.bind(projectsController));
router.post('/:id/change-orders', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), validate(genericBodySchema), projectsController.createChangeOrder.bind(projectsController));
router.put('/:id/change-orders/:coId', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(nestedChangeOrderIdSchema), validate(genericBodySchema), projectsController.updateChangeOrder.bind(projectsController));
router.patch('/:id/change-orders/:coId/approve', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(nestedChangeOrderIdSchema), projectsController.approveChangeOrder.bind(projectsController));

router.get('/:id/weather-delays', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectIdSchema), projectsController.getWeatherDelays.bind(projectsController));
router.post('/:id/weather-delays', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), validate(genericBodySchema), projectsController.addWeatherDelay.bind(projectsController));

router.get('/:id/timeline', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectIdSchema), projectsController.getTimeline.bind(projectsController));
router.get('/:id/stage-history', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectIdSchema), projectsController.getStageHistory.bind(projectsController));

export default router;
