import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const crewService = {

    // ── Dashboard ─────────────────────────────────────────────────────
    async getDashboard(employeeId: string, tenantId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());

        const [todaysJobs, activeClock, weeklyEntries, pendingTasks, totalJobs] = await Promise.all([
            // Today's jobs (projects I'm a member of, that are active)
            prisma.project.findMany({
                where: {
                    tenantId,
                    status: { in: ['ACTIVE', 'PLANNING'] },
                    members: { some: { employeeId } },
                },
                include: {
                    client: { select: { clientName: true, primaryPhone: true, streetAddress: true, city: true, province: true } },
                    _count: { select: { tasks: true, timeEntries: true } },
                },
                orderBy: { startDate: 'asc' },
                take: 10,
            }),
            // Active clock-in
            prisma.timeEntry.findFirst({
                where: { employeeId, tenantId, status: 'CLOCKED_IN' },
                include: { project: { select: { name: true } }, task: { select: { title: true } } },
            }),
            // Weekly hours
            prisma.timeEntry.findMany({
                where: { employeeId, tenantId, startTime: { gte: weekStart }, status: { in: ['COMPLETED', 'APPROVED'] } },
                select: { duration: true, billable: true },
            }),
            // Pending tasks assigned to me
            prisma.task.count({
                where: { assignedToId: employeeId, tenantId, status: { in: ['TODO', 'IN_PROGRESS'] } },
            }),
            // Total active jobs
            prisma.projectMember.count({
                where: { employeeId, project: { tenantId, status: 'ACTIVE' } },
            }),
        ]);

        const weeklyHours = weeklyEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
        const weeklyBillable = weeklyEntries.filter(e => e.billable).reduce((sum, e) => sum + (e.duration || 0), 0);

        return {
            todaysJobs,
            activeClock,
            stats: {
                weeklyHours: Math.round(weeklyHours / 60 * 10) / 10,
                weeklyBillableHours: Math.round(weeklyBillable / 60 * 10) / 10,
                pendingTasks,
                totalActiveJobs: totalJobs,
            },
        };
    },

    // ── My Jobs ───────────────────────────────────────────────────────
    async getMyJobs(employeeId: string, tenantId: string, status?: string) {
        const where: any = {
            tenantId,
            members: { some: { employeeId } },
        };
        if (status) where.status = status;

        return prisma.project.findMany({
            where,
            include: {
                client: { select: { clientName: true, primaryPhone: true, primaryEmail: true, streetAddress: true, city: true, province: true, postalCode: true } },
                members: { include: { employee: { include: { user: { select: { firstName: true, lastName: true } } } } } },
                _count: { select: { tasks: true, timeEntries: true, files: true, jobNotes: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });
    },

    // ── Job Detail ────────────────────────────────────────────────────
    async getJobDetail(projectId: string, employeeId: string, tenantId: string) {
        const project = await prisma.project.findFirst({
            where: { id: projectId, tenantId, members: { some: { employeeId } } },
            include: {
                client: true,
                members: { include: { employee: { include: { user: { select: { firstName: true, lastName: true, avatar: true } } } } } },
                tasks: {
                    where: { OR: [{ assignedToId: employeeId }, { assignedToId: null }] },
                    orderBy: { dueDate: 'asc' },
                },
                files: { orderBy: { createdAt: 'desc' }, take: 20 },
                jobNotes: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                    include: { employee: { include: { user: { select: { firstName: true, lastName: true } } } } },
                },
                _count: { select: { tasks: true, timeEntries: true, files: true } },
            },
        });
        if (!project) throw new Error('Job not found or access denied');
        return project;
    },

    // ── Update Job Status/Progress ────────────────────────────────────
    async updateJobStatus(projectId: string, employeeId: string, tenantId: string, data: { status?: string; progress?: number }) {
        // Verify membership
        const member = await prisma.projectMember.findFirst({ where: { projectId, employeeId } });
        if (!member) throw new Error('Not a member of this job');

        return prisma.project.update({
            where: { id: projectId },
            data: {
                ...(data.status && { status: data.status as any }),
                ...(data.progress !== undefined && { progress: data.progress }),
            },
        });
    },

    // ── Add Job Note ──────────────────────────────────────────────────
    async addJobNote(projectId: string, employeeId: string, tenantId: string, data: { content: string; noteType?: string; photos?: string[] }) {
        const member = await prisma.projectMember.findFirst({ where: { projectId, employeeId } });
        if (!member) throw new Error('Not a member of this job');

        return prisma.jobNote.create({
            data: {
                content: data.content,
                noteType: data.noteType || 'GENERAL',
                photos: data.photos || [],
                projectId,
                employeeId,
                tenantId,
            },
            include: { employee: { include: { user: { select: { firstName: true, lastName: true } } } } },
        });
    },

    // ── Clock In ──────────────────────────────────────────────────────
    async clockIn(employeeId: string, tenantId: string, data: { projectId?: string; taskId?: string; phase?: string; lat?: number; lng?: number; description?: string }) {
        // Check for existing active clock-in
        const existing = await prisma.timeEntry.findFirst({ where: { employeeId, tenantId, status: 'CLOCKED_IN' } });
        if (existing) throw new Error('Already clocked in. Please clock out first.');

        return prisma.timeEntry.create({
            data: {
                startTime: new Date(),
                status: 'CLOCKED_IN',
                employeeId,
                tenantId,
                projectId: data.projectId || null,
                taskId: data.taskId || null,
                phase: data.phase || null,
                description: data.description || null,
                clockInLat: data.lat || null,
                clockInLng: data.lng || null,
            },
            include: { project: { select: { name: true } }, task: { select: { title: true } } },
        });
    },

    // ── Clock Out ─────────────────────────────────────────────────────
    async clockOut(employeeId: string, tenantId: string, data: { lat?: number; lng?: number; notes?: string }) {
        const entry = await prisma.timeEntry.findFirst({ where: { employeeId, tenantId, status: 'CLOCKED_IN' } });
        if (!entry) throw new Error('No active clock-in found');

        const endTime = new Date();
        const duration = Math.round((endTime.getTime() - entry.startTime.getTime()) / 60000); // minutes

        return prisma.timeEntry.update({
            where: { id: entry.id },
            data: {
                endTime,
                duration,
                status: 'COMPLETED',
                clockOutLat: data.lat || null,
                clockOutLng: data.lng || null,
                notes: data.notes || entry.notes,
            },
            include: { project: { select: { name: true } }, task: { select: { title: true } } },
        });
    },

    // ── My Time Entries ───────────────────────────────────────────────
    async getMyTimeEntries(employeeId: string, tenantId: string, range: 'week' | 'month' = 'week') {
        const now = new Date();
        const start = new Date(now);
        if (range === 'week') {
            start.setDate(start.getDate() - start.getDay());
        } else {
            start.setDate(1);
        }
        start.setHours(0, 0, 0, 0);

        return prisma.timeEntry.findMany({
            where: { employeeId, tenantId, startTime: { gte: start } },
            include: {
                project: { select: { name: true } },
                task: { select: { title: true } },
            },
            orderBy: { startTime: 'desc' },
        });
    },

    // ── My Profile ────────────────────────────────────────────────────
    async getMyProfile(employeeId: string, tenantId: string) {
        return prisma.employee.findFirst({
            where: { id: employeeId, tenantId },
            include: {
                user: { select: { firstName: true, lastName: true, email: true, avatar: true, phone: true } },
                role: { select: { name: true } },
            },
        });
    },

    // ── My Schedule (upcoming jobs + tasks) ───────────────────────────
    async getMySchedule(employeeId: string, tenantId: string) {
        const now = new Date();
        const [upcomingJobs, upcomingTasks] = await Promise.all([
            prisma.project.findMany({
                where: { tenantId, status: { in: ['ACTIVE', 'PLANNING'] }, members: { some: { employeeId } } },
                include: {
                    client: { select: { clientName: true, streetAddress: true, city: true } },
                },
                orderBy: { startDate: 'asc' },
                take: 20,
            }),
            prisma.task.findMany({
                where: { assignedToId: employeeId, tenantId, status: { in: ['TODO', 'IN_PROGRESS'] }, dueDate: { gte: now } },
                orderBy: { dueDate: 'asc' },
                take: 20,
                include: { project: { select: { name: true } } },
            }),
        ]);
        return { upcomingJobs, upcomingTasks };
    },
};
