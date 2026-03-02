import os from 'os';
import { prisma } from '../../config/database';

export class AdminSystemService {
    /**
     * Get system health metrics
     */
    async getSystemHealth() {
        const startTime = Date.now();

        // DB query to measure latency
        await prisma.$queryRaw`SELECT 1`;
        const dbLatencyMs = Date.now() - startTime;

        // OS metrics
        const uptimeSeconds = os.uptime();
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const cpus = os.cpus();
        const loadAvg = os.loadavg();

        // DB size (PostgreSQL)
        let dbSizeMB = 0;
        try {
            const result: any[] = await prisma.$queryRaw`
                SELECT pg_database_size(current_database()) as size
            `;
            dbSizeMB = Math.round((Number(result[0]?.size || 0) / (1024 * 1024)) * 100) / 100;
        } catch {
            dbSizeMB = -1;
        }

        // Count various stats
        const [
            totalTenants,
            totalUsers,
            totalLeads,
            totalClients,
            totalInvoices,
            auditLogCount,
            recentErrors,
        ] = await Promise.all([
            prisma.tenant.count(),
            prisma.user.count(),
            prisma.lead.count(),
            prisma.client.count(),
            prisma.invoice.count(),
            prisma.auditLog.count(),
            prisma.auditLog.count({
                where: {
                    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                },
            }),
        ]);

        return {
            server: {
                uptime: formatUptime(uptimeSeconds),
                uptimeSeconds,
                platform: os.platform(),
                hostname: os.hostname(),
                nodeVersion: process.version,
                cpuCores: cpus.length,
                loadAverage: {
                    '1min': Math.round(loadAvg[0] * 100) / 100,
                    '5min': Math.round(loadAvg[1] * 100) / 100,
                    '15min': Math.round(loadAvg[2] * 100) / 100,
                },
            },
            memory: {
                total: formatBytes(totalMemory),
                used: formatBytes(usedMemory),
                free: formatBytes(freeMemory),
                usagePercent: Math.round((usedMemory / totalMemory) * 100),
            },
            database: {
                latencyMs: dbLatencyMs,
                sizeMB: dbSizeMB,
                status: dbLatencyMs < 500 ? 'healthy' : 'degraded',
            },
            apiPerformance: {
                responseTimeMs: dbLatencyMs, // Approximation from DB
                status: dbLatencyMs < 200 ? 'excellent' : dbLatencyMs < 500 ? 'good' : 'slow',
            },
            records: {
                totalTenants,
                totalUsers,
                totalLeads,
                totalClients,
                totalInvoices,
                auditLogs: auditLogCount,
            },
            errors: {
                last24Hours: recentErrors,
            },
        };
    }
}

function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
}

function formatBytes(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
}

export const adminSystemService = new AdminSystemService();
