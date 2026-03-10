import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';

// ============================================================================
// DEFAULT KANBAN STAGES — Stage 6
//
// Seeds 7 default project Kanban stages per tenant (idempotent).
// Called during automation bootstrap.
// ============================================================================

const DEFAULT_STAGES = [
    { name: 'Contract Signed', slug: 'contract-signed', color: '#10B981', icon: '📝', order: 1 },
    { name: 'Materials Ordered', slug: 'materials-ordered', color: '#3B82F6', icon: '📦', order: 2 },
    { name: 'Permit Pulled', slug: 'permit-pulled', color: '#8B5CF6', icon: '📋', order: 3 },
    { name: 'Materials Delivered', slug: 'materials-delivered', color: '#F59E0B', icon: '🚚', order: 4 },
    { name: 'In Progress', slug: 'in-progress', color: '#EF4444', icon: '🔨', order: 5 },
    { name: 'Final Inspection', slug: 'final-inspection', color: '#06B6D4', icon: '🔍', order: 6 },
    { name: 'Completed', slug: 'completed', color: '#059669', icon: '✅', order: 7, isCompleted: true },
];

export async function seedProjectStages(): Promise<void> {
    try {
        const tenants = await prisma.tenant.findMany({ select: { id: true } });

        for (const tenant of tenants) {
            // Check if stages already exist for this tenant
            const existingCount = await prisma.projectStage.count({
                where: { tenantId: tenant.id },
            });

            if (existingCount >= 7) {
                continue; // Already seeded, skip
            }

            for (const stage of DEFAULT_STAGES) {
                await prisma.projectStage.upsert({
                    where: {
                        tenantId_slug: {
                            tenantId: tenant.id,
                            slug: stage.slug,
                        },
                    },
                    create: {
                        tenantId: tenant.id,
                        name: stage.name,
                        slug: stage.slug,
                        color: stage.color,
                        icon: stage.icon,
                        order: stage.order,
                        isCompleted: stage.isCompleted || false,
                    },
                    update: {}, // No-op if exists
                });
            }

            logger.info('[StageSeeder] Default Kanban stages seeded', { tenantId: tenant.id });
        }
    } catch (err: any) {
        logger.error('[StageSeeder] Failed to seed stages', { err: err.message });
    }
}
