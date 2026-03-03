import { Router, Request, Response, NextFunction } from 'express';
import { crewService } from './crew.service';

const router = Router();

function sendSuccess(res: Response, data: any, message?: string) {
    res.json({ success: true, data, message: message || 'OK' });
}

// Helper to get employeeId from the auth token
function getEmployeeId(req: Request): string {
    const empId = (req as any).employee?.id || (req as any).user?.employeeId;
    if (!empId) throw new Error('Employee context not found');
    return empId;
}

function getTenantId(req: Request): string {
    const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
    if (!tenantId) throw new Error('Tenant context not found');
    return tenantId;
}

// ── Dashboard ─────────────────────────────────────────────────────
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await crewService.getDashboard(getEmployeeId(req), getTenantId(req));
        sendSuccess(res, data, 'Dashboard loaded');
    } catch (error) { next(error); }
});

// ── My Jobs ───────────────────────────────────────────────────────
router.get('/jobs', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await crewService.getMyJobs(getEmployeeId(req), getTenantId(req), req.query.status as string | undefined);
        sendSuccess(res, data, `Found ${data.length} jobs`);
    } catch (error) { next(error); }
});

// ── Job Detail ────────────────────────────────────────────────────
router.get('/jobs/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await crewService.getJobDetail(req.params.id, getEmployeeId(req), getTenantId(req));
        sendSuccess(res, data);
    } catch (error: any) {
        res.status(404).json({ success: false, message: error.message });
    }
});

// ── Update Job Status ─────────────────────────────────────────────
router.put('/jobs/:id/status', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await crewService.updateJobStatus(req.params.id, getEmployeeId(req), getTenantId(req), req.body);
        sendSuccess(res, data, 'Job status updated');
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// ── Add Job Note ──────────────────────────────────────────────────
router.post('/jobs/:id/notes', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await crewService.addJobNote(req.params.id, getEmployeeId(req), getTenantId(req), req.body);
        sendSuccess(res, data, 'Note added');
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// ── Clock In ──────────────────────────────────────────────────────
router.post('/time/clock-in', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await crewService.clockIn(getEmployeeId(req), getTenantId(req), req.body);
        sendSuccess(res, data, 'Clocked in successfully');
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// ── Clock Out ─────────────────────────────────────────────────────
router.post('/time/clock-out', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await crewService.clockOut(getEmployeeId(req), getTenantId(req), req.body);
        sendSuccess(res, data, 'Clocked out successfully');
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// ── My Time Entries ───────────────────────────────────────────────
router.get('/time/entries', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const range = (req.query.range as 'week' | 'month') || 'week';
        const data = await crewService.getMyTimeEntries(getEmployeeId(req), getTenantId(req), range);
        sendSuccess(res, data, `Found ${data.length} entries`);
    } catch (error) { next(error); }
});

// ── My Profile ──────────────────────────────────────────────────
router.get('/profile', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await crewService.getMyProfile(getEmployeeId(req), getTenantId(req));
        sendSuccess(res, data);
    } catch (error) { next(error); }
});

// ── My Schedule ─────────────────────────────────────────────────
router.get('/schedule', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await crewService.getMySchedule(getEmployeeId(req), getTenantId(req));
        sendSuccess(res, data);
    } catch (error) { next(error); }
});

export default router;
