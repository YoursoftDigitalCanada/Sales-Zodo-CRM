import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const crewService = {

    // ══════════════════════════════════════════════════════════════════
    // DASHBOARD
    // ══════════════════════════════════════════════════════════════════
    async getDashboard(employeeId: string, tenantId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());

        const [todaysJobs, activeClock, weeklyEntries, pendingTasks, totalJobs, unreadNotifications] = await Promise.all([
            prisma.project.findMany({
                where: { tenantId, status: { in: ['ACTIVE', 'PLANNING'] }, members: { some: { employeeId } } },
                include: {
                    client: { select: { clientName: true, primaryPhone: true, streetAddress: true, city: true, province: true } },
                    _count: { select: { tasks: true, timeEntries: true } },
                },
                orderBy: { startDate: 'asc' },
                take: 10,
            }),
            prisma.timeEntry.findFirst({
                where: { employeeId, tenantId, status: 'CLOCKED_IN' },
                include: { project: { select: { name: true } }, task: { select: { title: true } } },
            }),
            prisma.timeEntry.findMany({
                where: { employeeId, tenantId, startTime: { gte: weekStart }, status: { in: ['COMPLETED', 'APPROVED'] } },
                select: { duration: true, billable: true },
            }),
            prisma.task.count({ where: { assignedToId: employeeId, tenantId, status: { in: ['TODO', 'IN_PROGRESS'] } } }),
            prisma.projectMember.count({ where: { employeeId, project: { tenantId, status: 'ACTIVE' } } }),
            prisma.crewNotification.count({ where: { employeeId, tenantId, read: false } }),
        ]);

        const weeklyHours = weeklyEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
        const weeklyBillable = weeklyEntries.filter(e => e.billable).reduce((sum, e) => sum + (e.duration || 0), 0);

        return {
            todaysJobs, activeClock,
            stats: {
                weeklyHours: Math.round(weeklyHours / 60 * 10) / 10,
                weeklyBillableHours: Math.round(weeklyBillable / 60 * 10) / 10,
                pendingTasks, totalActiveJobs: totalJobs, unreadNotifications,
            },
        };
    },

    // ══════════════════════════════════════════════════════════════════
    // MY JOBS
    // ══════════════════════════════════════════════════════════════════
    async getMyJobs(employeeId: string, tenantId: string, status?: string) {
        const where: any = { tenantId, members: { some: { employeeId } } };
        if (status) where.status = status;
        return prisma.project.findMany({
            where,
            include: {
                client: { select: { clientName: true, primaryPhone: true, primaryEmail: true, streetAddress: true, city: true, province: true, postalCode: true } },
                members: { include: { employee: { include: { user: { select: { firstName: true, lastName: true } } } } } },
                _count: { select: { tasks: true, timeEntries: true, files: true, jobNotes: true, jobPhotos: true, jobMessages: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });
    },

    async getJobDetail(projectId: string, employeeId: string, tenantId: string) {
        const project = await prisma.project.findFirst({
            where: { id: projectId, tenantId, members: { some: { employeeId } } },
            include: {
                client: true,
                members: { include: { employee: { include: { user: { select: { firstName: true, lastName: true, avatar: true } } } } } },
                tasks: { where: { OR: [{ assignedToId: employeeId }, { assignedToId: null }] }, orderBy: { dueDate: 'asc' } },
                files: { orderBy: { createdAt: 'desc' }, take: 20 },
                jobNotes: { orderBy: { createdAt: 'desc' }, take: 50, include: { employee: { include: { user: { select: { firstName: true, lastName: true } } } } } },
                jobCompletion: true,
                _count: { select: { tasks: true, timeEntries: true, files: true, jobPhotos: true, jobMessages: true, checklistSubmissions: true } },
            },
        });
        if (!project) throw new Error('Job not found or access denied');
        return project;
    },

    async updateJobStatus(projectId: string, employeeId: string, tenantId: string, data: { status?: string; progress?: number }) {
        const member = await prisma.projectMember.findFirst({ where: { projectId, employeeId } });
        if (!member) throw new Error('Not a member of this job');
        return prisma.project.update({
            where: { id: projectId },
            data: { ...(data.status && { status: data.status as any }), ...(data.progress !== undefined && { progress: data.progress }) },
        });
    },

    async addJobNote(projectId: string, employeeId: string, tenantId: string, data: { content: string; noteType?: string; photos?: string[] }) {
        const member = await prisma.projectMember.findFirst({ where: { projectId, employeeId } });
        if (!member) throw new Error('Not a member of this job');
        return prisma.jobNote.create({
            data: { content: data.content, noteType: data.noteType || 'GENERAL', photos: data.photos || [], projectId, employeeId, tenantId },
            include: { employee: { include: { user: { select: { firstName: true, lastName: true } } } } },
        });
    },

    // ══════════════════════════════════════════════════════════════════
    // TIME TRACKING
    // ══════════════════════════════════════════════════════════════════
    async clockIn(employeeId: string, tenantId: string, data: { projectId?: string; taskId?: string; phase?: string; lat?: number; lng?: number; description?: string }) {
        const existing = await prisma.timeEntry.findFirst({ where: { employeeId, tenantId, status: 'CLOCKED_IN' } });
        if (existing) throw new Error('Already clocked in. Please clock out first.');
        return prisma.timeEntry.create({
            data: {
                startTime: new Date(), status: 'CLOCKED_IN', employeeId, tenantId,
                projectId: data.projectId || null, taskId: data.taskId || null,
                phase: data.phase || null, description: data.description || null,
                clockInLat: data.lat || null, clockInLng: data.lng || null,
            },
            include: { project: { select: { name: true } }, task: { select: { title: true } } },
        });
    },

    async clockOut(employeeId: string, tenantId: string, data: { lat?: number; lng?: number; notes?: string }) {
        const entry = await prisma.timeEntry.findFirst({ where: { employeeId, tenantId, status: 'CLOCKED_IN' } });
        if (!entry) throw new Error('No active clock-in found');
        const endTime = new Date();
        const duration = Math.round((endTime.getTime() - entry.startTime.getTime()) / 60000);
        return prisma.timeEntry.update({
            where: { id: entry.id },
            data: { endTime, duration, status: 'COMPLETED', clockOutLat: data.lat || null, clockOutLng: data.lng || null, notes: data.notes || entry.notes },
            include: { project: { select: { name: true } }, task: { select: { title: true } } },
        });
    },

    async getMyTimeEntries(employeeId: string, tenantId: string, range: 'week' | 'month' = 'week') {
        const now = new Date();
        const start = new Date(now);
        if (range === 'week') { start.setDate(start.getDate() - start.getDay()); } else { start.setDate(1); }
        start.setHours(0, 0, 0, 0);
        return prisma.timeEntry.findMany({
            where: { employeeId, tenantId, startTime: { gte: start } },
            include: { project: { select: { name: true } }, task: { select: { title: true } } },
            orderBy: { startTime: 'desc' },
        });
    },

    async sendLocationPing(employeeId: string, data: { lat: number; lng: number; accuracy?: number; timeEntryId: string }) {
        return prisma.locationPing.create({
            data: { lat: data.lat, lng: data.lng, accuracy: data.accuracy || 0, timeEntryId: data.timeEntryId, employeeId },
        });
    },

    // ══════════════════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ══════════════════════════════════════════════════════════════════
    async getNotifications(employeeId: string, tenantId: string) {
        return prisma.crewNotification.findMany({
            where: { employeeId, tenantId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    },

    async markNotificationRead(id: string, employeeId: string) {
        return prisma.crewNotification.update({ where: { id }, data: { read: true } });
    },

    async markAllNotificationsRead(employeeId: string, tenantId: string) {
        return prisma.crewNotification.updateMany({ where: { employeeId, tenantId, read: false }, data: { read: true } });
    },

    // ══════════════════════════════════════════════════════════════════
    // PHOTOS
    // ══════════════════════════════════════════════════════════════════
    async getJobPhotos(projectId: string, employeeId: string, tenantId: string) {
        return prisma.jobPhoto.findMany({
            where: { projectId, tenantId },
            include: { employee: { include: { user: { select: { firstName: true, lastName: true } } } } },
            orderBy: { takenAt: 'desc' },
        });
    },

    async addJobPhoto(projectId: string, employeeId: string, tenantId: string, data: { url: string; caption?: string; category?: string; phase?: string; lat?: number; lng?: number }) {
        return prisma.jobPhoto.create({
            data: {
                url: data.url, caption: data.caption || null, category: (data.category as any) || 'DURING',
                phase: data.phase || null, gpsLat: data.lat || null, gpsLng: data.lng || null,
                projectId, employeeId, tenantId,
            },
            include: { employee: { include: { user: { select: { firstName: true, lastName: true } } } } },
        });
    },

    async getBeforeAfterPhotos(projectId: string, tenantId: string) {
        const [before, after] = await Promise.all([
            prisma.jobPhoto.findMany({ where: { projectId, tenantId, category: 'BEFORE' }, orderBy: { takenAt: 'asc' } }),
            prisma.jobPhoto.findMany({ where: { projectId, tenantId, category: 'AFTER' }, orderBy: { takenAt: 'asc' } }),
        ]);
        return { before, after };
    },

    async deleteJobPhoto(photoId: string, employeeId: string) {
        const photo = await prisma.jobPhoto.findFirst({ where: { id: photoId, employeeId } });
        if (!photo) throw new Error('Photo not found or not yours');
        return prisma.jobPhoto.delete({ where: { id: photoId } });
    },

    // ══════════════════════════════════════════════════════════════════
    // CHECKLISTS
    // ══════════════════════════════════════════════════════════════════
    async getChecklistTemplates(tenantId: string) {
        return prisma.checklistTemplate.findMany({
            where: { tenantId, isActive: true },
            include: { items: { orderBy: { order: 'asc' } }, _count: { select: { submissions: true } } },
            orderBy: { name: 'asc' },
        });
    },

    async getChecklistTemplate(id: string, tenantId: string) {
        return prisma.checklistTemplate.findFirst({
            where: { id, tenantId },
            include: { items: { orderBy: { order: 'asc' } } },
        });
    },

    async submitChecklist(templateId: string, employeeId: string, tenantId: string, data: { projectId: string; responses: any; photos?: string[] }) {
        return prisma.checklistSubmission.create({
            data: { templateId, employeeId, tenantId, projectId: data.projectId, responses: data.responses, photos: data.photos || [] },
            include: { template: { select: { name: true, category: true } } },
        });
    },

    async getJobChecklists(projectId: string, tenantId: string) {
        return prisma.checklistSubmission.findMany({
            where: { projectId, tenantId },
            include: {
                template: { select: { name: true, category: true } },
                employee: { include: { user: { select: { firstName: true, lastName: true } } } },
            },
            orderBy: { completedAt: 'desc' },
        });
    },

    // ══════════════════════════════════════════════════════════════════
    // CHAT / MESSAGING
    // ══════════════════════════════════════════════════════════════════
    async getJobMessages(projectId: string, tenantId: string) {
        return prisma.jobMessage.findMany({
            where: { projectId, tenantId },
            include: { sender: { include: { user: { select: { firstName: true, lastName: true, avatar: true } } } } },
            orderBy: { createdAt: 'asc' },
            take: 100,
        });
    },

    async sendJobMessage(projectId: string, senderId: string, tenantId: string, data: { content: string; messageType?: string; attachments?: string[] }) {
        const member = await prisma.projectMember.findFirst({ where: { projectId, employeeId: senderId } });
        if (!member) throw new Error('Not a member of this job');
        return prisma.jobMessage.create({
            data: { content: data.content, messageType: data.messageType || 'TEXT', attachments: data.attachments || [], projectId, senderId, tenantId },
            include: { sender: { include: { user: { select: { firstName: true, lastName: true, avatar: true } } } } },
        });
    },

    async markMessagesRead(projectId: string, employeeId: string, tenantId: string) {
        const messages = await prisma.jobMessage.findMany({
            where: { projectId, tenantId, NOT: { senderId: employeeId } },
            select: { id: true, readBy: true },
        });
        const now = new Date().toISOString();
        for (const msg of messages) {
            const readBy = Array.isArray(msg.readBy) ? msg.readBy as any[] : [];
            if (!readBy.find((r: any) => r.employeeId === employeeId)) {
                readBy.push({ employeeId, readAt: now });
                await prisma.jobMessage.update({ where: { id: msg.id }, data: { readBy } });
            }
        }
        return { updated: messages.length };
    },

    // ══════════════════════════════════════════════════════════════════
    // EQUIPMENT & MATERIALS
    // ══════════════════════════════════════════════════════════════════
    async getMyEquipment(employeeId: string, tenantId: string) {
        return prisma.equipment.findMany({ where: { assignedToId: employeeId, tenantId }, orderBy: { name: 'asc' } });
    },

    async reportEquipmentIssue(equipmentId: string, employeeId: string, tenantId: string, data: { notes: string }) {
        const equip = await prisma.equipment.findFirst({ where: { id: equipmentId, assignedToId: employeeId } });
        if (!equip) throw new Error('Equipment not found or not assigned to you');
        return prisma.equipment.update({ where: { id: equipmentId }, data: { status: 'MAINTENANCE', notes: data.notes } });
    },

    async getJobMaterials(projectId: string, tenantId: string) {
        return prisma.materialRequest.findMany({
            where: { projectId, tenantId },
            include: { requestedBy: { include: { user: { select: { firstName: true, lastName: true } } } } },
            orderBy: { createdAt: 'desc' },
        });
    },

    async requestMaterials(projectId: string, employeeId: string, tenantId: string, data: { items: any[]; urgency?: string; notes?: string }) {
        return prisma.materialRequest.create({
            data: { items: data.items, urgency: data.urgency || 'MEDIUM', notes: data.notes || null, projectId, requestedById: employeeId, tenantId },
        });
    },

    async getMyMaterialRequests(employeeId: string, tenantId: string) {
        return prisma.materialRequest.findMany({
            where: { requestedById: employeeId, tenantId },
            include: { project: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
        });
    },

    // ══════════════════════════════════════════════════════════════════
    // SAFETY & INCIDENTS
    // ══════════════════════════════════════════════════════════════════
    async reportIncident(employeeId: string, tenantId: string, data: { projectId: string; type: string; severity: string; description: string; photos?: string[]; location?: string; lat?: number; lng?: number; witnesses?: string[]; actionTaken?: string }) {
        return prisma.incidentReport.create({
            data: {
                type: data.type as any, severity: data.severity, description: data.description,
                photos: data.photos || [], witnesses: data.witnesses || [],
                actionTaken: data.actionTaken || null, location: data.location || null,
                gpsLat: data.lat || null, gpsLng: data.lng || null,
                projectId: data.projectId, reportedById: employeeId, tenantId,
            },
        });
    },

    async getMyIncidents(employeeId: string, tenantId: string) {
        return prisma.incidentReport.findMany({
            where: { reportedById: employeeId, tenantId },
            include: { project: { select: { name: true } } },
            orderBy: { reportedAt: 'desc' },
        });
    },

    async sendEmergency(employeeId: string, tenantId: string, data: { lat?: number; lng?: number; message?: string }) {
        // Create critical notification for all managers/admins
        // For now create an incident report
        return prisma.incidentReport.create({
            data: {
                type: 'INJURY', severity: 'CRITICAL', description: data.message || 'SOS Emergency Alert',
                gpsLat: data.lat || null, gpsLng: data.lng || null,
                projectId: (await prisma.project.findFirst({ where: { tenantId, members: { some: { employeeId } }, status: 'ACTIVE' } }))?.id || '',
                reportedById: employeeId, tenantId,
            },
        });
    },

    // ══════════════════════════════════════════════════════════════════
    // PERFORMANCE STATS
    // ══════════════════════════════════════════════════════════════════
    async getPersonalStats(employeeId: string, tenantId: string) {
        const now = new Date();
        const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [weekEntries, monthEntries, completedJobs, totalTasks, doneTasks, checklistCount, notesCount, incidents] = await Promise.all([
            prisma.timeEntry.findMany({ where: { employeeId, tenantId, startTime: { gte: weekStart }, status: { in: ['COMPLETED', 'APPROVED'] } }, select: { duration: true, billable: true } }),
            prisma.timeEntry.findMany({ where: { employeeId, tenantId, startTime: { gte: monthStart }, status: { in: ['COMPLETED', 'APPROVED'] } }, select: { duration: true } }),
            prisma.projectMember.count({ where: { employeeId, project: { tenantId, status: 'COMPLETED' } } }),
            prisma.task.count({ where: { assignedToId: employeeId, tenantId } }),
            prisma.task.count({ where: { assignedToId: employeeId, tenantId, status: 'DONE' } }),
            prisma.checklistSubmission.count({ where: { employeeId, tenantId } }),
            prisma.jobNote.count({ where: { employeeId, tenantId } }),
            prisma.incidentReport.count({ where: { reportedById: employeeId, tenantId } }),
        ]);

        const weekHrs = weekEntries.reduce((s, e) => s + (e.duration || 0), 0) / 60;
        const monthHrs = monthEntries.reduce((s, e) => s + (e.duration || 0), 0) / 60;
        const overtimeHrs = Math.max(0, weekHrs - 40);

        return {
            hoursThisWeek: Math.round(weekHrs * 10) / 10,
            hoursThisMonth: Math.round(monthHrs * 10) / 10,
            overtimeHours: Math.round(overtimeHrs * 10) / 10,
            jobsCompleted: completedJobs,
            taskCompletion: totalTasks > 0 ? `${Math.round((doneTasks / totalTasks) * 100)}%` : '0%',
            checklistsCompleted: checklistCount,
            notesSubmitted: notesCount,
            incidentsReported: incidents,
        };
    },

    async getWeeklySummary(employeeId: string, tenantId: string) {
        const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0);
        const entries = await prisma.timeEntry.findMany({
            where: { employeeId, tenantId, startTime: { gte: weekStart }, status: { in: ['COMPLETED', 'APPROVED'] } },
            include: { project: { select: { name: true } } },
            orderBy: { startTime: 'asc' },
        });

        // Group by day
        const byDay: Record<string, number> = {};
        for (const e of entries) {
            const day = new Date(e.startTime).toLocaleDateString('en-US', { weekday: 'short' });
            byDay[day] = (byDay[day] || 0) + (e.duration || 0);
        }
        return { entries, byDay: Object.entries(byDay).map(([day, mins]) => ({ day, hours: Math.round(mins / 60 * 10) / 10 })) };
    },

    // ══════════════════════════════════════════════════════════════════
    // LEAVE & AVAILABILITY
    // ══════════════════════════════════════════════════════════════════
    async getLeaveRequests(employeeId: string, tenantId: string) {
        return prisma.leaveRequest.findMany({ where: { employeeId, tenantId }, orderBy: { createdAt: 'desc' } });
    },

    async submitLeaveRequest(employeeId: string, tenantId: string, data: { type: string; startDate: string; endDate: string; reason?: string }) {
        return prisma.leaveRequest.create({
            data: { type: data.type as any, startDate: new Date(data.startDate), endDate: new Date(data.endDate), reason: data.reason || null, employeeId, tenantId },
        });
    },

    async cancelLeaveRequest(id: string, employeeId: string) {
        const req = await prisma.leaveRequest.findFirst({ where: { id, employeeId, status: 'PENDING' } });
        if (!req) throw new Error('Leave request not found or already processed');
        return prisma.leaveRequest.delete({ where: { id } });
    },

    async getAvailability(employeeId: string) {
        return prisma.availability.findMany({ where: { employeeId }, orderBy: { dayOfWeek: 'asc' } });
    },

    async updateAvailability(employeeId: string, data: { dayOfWeek: number; startTime: string; endTime: string; available: boolean }[]) {
        const results = [];
        for (const slot of data) {
            const r = await prisma.availability.upsert({
                where: { employeeId_dayOfWeek: { employeeId, dayOfWeek: slot.dayOfWeek } },
                create: { employeeId, dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime, available: slot.available },
                update: { startTime: slot.startTime, endTime: slot.endTime, available: slot.available },
            });
            results.push(r);
        }
        return results;
    },

    // ══════════════════════════════════════════════════════════════════
    // DOCUMENTS
    // ══════════════════════════════════════════════════════════════════
    async getMyDocuments(employeeId: string, tenantId: string) {
        return prisma.employeeDocument.findMany({ where: { employeeId, tenantId }, orderBy: { createdAt: 'desc' } });
    },

    async getExpiringDocuments(employeeId: string, tenantId: string) {
        const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30);
        return prisma.employeeDocument.findMany({
            where: { employeeId, tenantId, expiryDate: { lte: thirtyDays } },
            orderBy: { expiryDate: 'asc' },
        });
    },

    async uploadDocument(employeeId: string, tenantId: string, data: { name: string; type: string; fileUrl: string; expiryDate?: string }) {
        return prisma.employeeDocument.create({
            data: { name: data.name, type: data.type as any, fileUrl: data.fileUrl, expiryDate: data.expiryDate ? new Date(data.expiryDate) : null, employeeId, tenantId },
        });
    },

    // ══════════════════════════════════════════════════════════════════
    // JOB COMPLETION
    // ══════════════════════════════════════════════════════════════════
    async completeJob(projectId: string, employeeId: string, tenantId: string, data: { completionPhotos?: string[]; clientSignature?: string; clientRating?: number; clientFeedback?: string; completionNotes?: string }) {
        const member = await prisma.projectMember.findFirst({ where: { projectId, employeeId } });
        if (!member) throw new Error('Not a member of this job');
        const [completion] = await Promise.all([
            prisma.jobCompletion.create({
                data: {
                    completionPhotos: data.completionPhotos || [], clientSignature: data.clientSignature || null,
                    clientRating: data.clientRating || null, clientFeedback: data.clientFeedback || null,
                    completionNotes: data.completionNotes || null, projectId, completedById: employeeId, tenantId,
                },
            }),
            prisma.project.update({ where: { id: projectId }, data: { status: 'COMPLETED', progress: 100, actualEndDate: new Date() } }),
        ]);
        return completion;
    },

    async getJobCompletion(projectId: string, tenantId: string) {
        return prisma.jobCompletion.findFirst({
            where: { projectId, tenantId },
            include: { completedBy: { include: { user: { select: { firstName: true, lastName: true } } } } },
        });
    },

    // ══════════════════════════════════════════════════════════════════
    // PROFILE & SCHEDULE (from v1)
    // ══════════════════════════════════════════════════════════════════
    async getMyProfile(employeeId: string, tenantId: string) {
        return prisma.employee.findFirst({
            where: { id: employeeId, tenantId },
            include: { user: { select: { firstName: true, lastName: true, email: true, avatar: true, phone: true } }, role: { select: { name: true } } },
        });
    },

    async getMySchedule(employeeId: string, tenantId: string) {
        const now = new Date();
        const [upcomingJobs, upcomingTasks] = await Promise.all([
            prisma.project.findMany({
                where: { tenantId, status: { in: ['ACTIVE', 'PLANNING'] }, members: { some: { employeeId } } },
                include: { client: { select: { clientName: true, streetAddress: true, city: true } } },
                orderBy: { startDate: 'asc' }, take: 20,
            }),
            prisma.task.findMany({
                where: { assignedToId: employeeId, tenantId, status: { in: ['TODO', 'IN_PROGRESS'] }, dueDate: { gte: now } },
                orderBy: { dueDate: 'asc' }, take: 20,
                include: { project: { select: { name: true } } },
            }),
        ]);
        return { upcomingJobs, upcomingTasks };
    },
};
