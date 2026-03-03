import { Router, Request, Response, NextFunction } from 'express';
import { crewService } from './crew.service';

const router = Router();

function ok(res: Response, data: any, msg = 'OK') { res.json({ success: true, data, message: msg }); }
function empId(req: Request): string { const id = (req as any).employee?.id || (req as any).user?.employeeId; if (!id) throw new Error('Employee context not found'); return id; }
function tid(req: Request): string { const id = (req as any).tenantId || (req as any).user?.tenantId; if (!id) throw new Error('Tenant context not found'); return id; }

// ── Dashboard ─────────────────────────────────────────────────────
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.getDashboard(empId(req), tid(req)), 'Dashboard loaded'); } catch (e) { next(e); }
});

// ── Jobs ──────────────────────────────────────────────────────────
router.get('/jobs', async (req: Request, res: Response, next: NextFunction) => {
    try { const d = await crewService.getMyJobs(empId(req), tid(req), req.query.status as string | undefined); ok(res, d, `${d.length} jobs`); } catch (e) { next(e); }
});

router.get('/jobs/:id', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.getJobDetail(req.params.id, empId(req), tid(req))); } catch (e: any) { res.status(404).json({ success: false, message: e.message }); }
});

router.put('/jobs/:id/status', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.updateJobStatus(req.params.id, empId(req), tid(req), req.body), 'Status updated'); } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
});

router.post('/jobs/:id/notes', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.addJobNote(req.params.id, empId(req), tid(req), req.body), 'Note added'); } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
});

// ── Time Tracking ─────────────────────────────────────────────────
router.post('/time/clock-in', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.clockIn(empId(req), tid(req), req.body), 'Clocked in'); } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
});

router.post('/time/clock-out', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.clockOut(empId(req), tid(req), req.body), 'Clocked out'); } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
});

router.get('/time/entries', async (req: Request, res: Response, next: NextFunction) => {
    try { const d = await crewService.getMyTimeEntries(empId(req), tid(req), (req.query.range as any) || 'week'); ok(res, d, `${d.length} entries`); } catch (e) { next(e); }
});

router.post('/time/location-ping', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.sendLocationPing(empId(req), req.body), 'Ping recorded'); } catch (e) { next(e); }
});

// ── Notifications ─────────────────────────────────────────────────
router.get('/notifications', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.getNotifications(empId(req), tid(req))); } catch (e) { next(e); }
});

router.put('/notifications/:id/read', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.markNotificationRead(req.params.id, empId(req)), 'Marked read'); } catch (e) { next(e); }
});

router.put('/notifications/read-all', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.markAllNotificationsRead(empId(req), tid(req)), 'All read'); } catch (e) { next(e); }
});

// ── Photos ────────────────────────────────────────────────────────
router.get('/jobs/:id/photos', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.getJobPhotos(req.params.id, empId(req), tid(req))); } catch (e) { next(e); }
});

router.post('/jobs/:id/photos', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.addJobPhoto(req.params.id, empId(req), tid(req), req.body), 'Photo added'); } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
});

router.get('/jobs/:id/photos/before-after', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.getBeforeAfterPhotos(req.params.id, tid(req))); } catch (e) { next(e); }
});

router.delete('/photos/:id', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.deleteJobPhoto(req.params.id, empId(req)), 'Photo deleted'); } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
});

// ── Checklists ────────────────────────────────────────────────────
router.get('/checklists', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.getChecklistTemplates(tid(req))); } catch (e) { next(e); }
});

router.get('/checklists/:id', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.getChecklistTemplate(req.params.id, tid(req))); } catch (e) { next(e); }
});

router.post('/checklists/:id/submit', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.submitChecklist(req.params.id, empId(req), tid(req), req.body), 'Checklist submitted'); } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
});

router.get('/jobs/:id/checklists', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.getJobChecklists(req.params.id, tid(req))); } catch (e) { next(e); }
});

// ── Chat / Messages ───────────────────────────────────────────────
router.get('/jobs/:id/messages', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.getJobMessages(req.params.id, tid(req))); } catch (e) { next(e); }
});

router.post('/jobs/:id/messages', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.sendJobMessage(req.params.id, empId(req), tid(req), req.body), 'Message sent'); } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
});

router.put('/jobs/:id/messages/read', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.markMessagesRead(req.params.id, empId(req), tid(req)), 'Messages read'); } catch (e) { next(e); }
});

// ── Equipment ─────────────────────────────────────────────────────
router.get('/equipment', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.getMyEquipment(empId(req), tid(req))); } catch (e) { next(e); }
});

router.post('/equipment/:id/report-issue', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.reportEquipmentIssue(req.params.id, empId(req), tid(req), req.body), 'Issue reported'); } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
});

// ── Materials ─────────────────────────────────────────────────────
router.get('/jobs/:id/materials', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.getJobMaterials(req.params.id, tid(req))); } catch (e) { next(e); }
});

router.post('/jobs/:id/materials/request', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.requestMaterials(req.params.id, empId(req), tid(req), req.body), 'Requested'); } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
});

router.get('/materials/requests', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.getMyMaterialRequests(empId(req), tid(req))); } catch (e) { next(e); }
});

// ── Safety / Incidents ────────────────────────────────────────────
router.post('/safety/incident', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.reportIncident(empId(req), tid(req), req.body), 'Incident reported'); } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
});

router.get('/safety/incidents', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.getMyIncidents(empId(req), tid(req))); } catch (e) { next(e); }
});

router.post('/safety/emergency', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.sendEmergency(empId(req), tid(req), req.body), 'Emergency alert sent'); } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
});

// ── Performance Stats ─────────────────────────────────────────────
router.get('/stats/personal', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.getPersonalStats(empId(req), tid(req))); } catch (e) { next(e); }
});

router.get('/stats/weekly-summary', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.getWeeklySummary(empId(req), tid(req))); } catch (e) { next(e); }
});

// ── Leave & Availability ──────────────────────────────────────────
router.get('/leave/requests', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.getLeaveRequests(empId(req), tid(req))); } catch (e) { next(e); }
});

router.post('/leave/request', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.submitLeaveRequest(empId(req), tid(req), req.body), 'Leave requested'); } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
});

router.put('/leave/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.cancelLeaveRequest(req.params.id, empId(req)), 'Cancelled'); } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
});

router.get('/availability', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.getAvailability(empId(req))); } catch (e) { next(e); }
});

router.put('/availability', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.updateAvailability(empId(req), req.body), 'Updated'); } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
});

// ── Documents ─────────────────────────────────────────────────────
router.get('/documents', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.getMyDocuments(empId(req), tid(req))); } catch (e) { next(e); }
});

router.get('/documents/expiring', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.getExpiringDocuments(empId(req), tid(req))); } catch (e) { next(e); }
});

router.post('/documents/upload', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.uploadDocument(empId(req), tid(req), req.body), 'Uploaded'); } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
});

// ── Job Completion ────────────────────────────────────────────────
router.post('/jobs/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.completeJob(req.params.id, empId(req), tid(req), req.body), 'Job completed'); } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
});

router.get('/jobs/:id/completion', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.getJobCompletion(req.params.id, tid(req))); } catch (e) { next(e); }
});

// ── Profile & Schedule ────────────────────────────────────────────
router.get('/profile', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.getMyProfile(empId(req), tid(req))); } catch (e) { next(e); }
});

router.get('/schedule', async (req: Request, res: Response, next: NextFunction) => {
    try { ok(res, await crewService.getMySchedule(empId(req), tid(req))); } catch (e) { next(e); }
});

export default router;
