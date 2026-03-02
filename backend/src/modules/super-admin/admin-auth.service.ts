import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { config } from '../../config';
import { logger } from '../../common/utils/logger';

export class AdminAuthService {
    /**
     * Login with email + password. Returns JWT.
     */
    async login(email: string, password: string, ipAddress?: string) {
        const admin = await prisma.superAdmin.findUnique({ where: { email } });

        if (!admin || !admin.isActive) {
            throw new Error('Invalid credentials');
        }

        const valid = await bcrypt.compare(password, admin.passwordHash);
        if (!valid) {
            // Log failed attempt
            await this.logAction(admin.id, 'LOGIN_FAILED', null, null, { ipAddress });
            throw new Error('Invalid credentials');
        }

        // Update last login
        await prisma.superAdmin.update({
            where: { id: admin.id },
            data: { lastLoginAt: new Date(), lastLoginIp: ipAddress || null },
        });

        const signOptions: SignOptions = {
            expiresIn: config.admin.jwtExpiry as any,
            issuer: config.app.name,
        };

        const token = jwt.sign(
            { adminId: admin.id, email: admin.email, role: admin.role },
            config.admin.jwtSecret,
            signOptions
        );

        await this.logAction(admin.id, 'LOGIN_SUCCESS', null, null, { ipAddress });

        return {
            token,
            admin: {
                id: admin.id,
                email: admin.email,
                firstName: admin.firstName,
                lastName: admin.lastName,
                role: admin.role,
            },
        };
    }

    /**
     * Get admin profile from token payload
     */
    async getProfile(adminId: string) {
        const admin = await prisma.superAdmin.findUnique({
            where: { id: adminId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                twoFactorEnabled: true,
                lastLoginAt: true,
                createdAt: true,
            },
        });

        if (!admin || !admin.isActive) {
            throw new Error('Admin not found');
        }

        return admin;
    }

    /**
     * Log admin actions to audit trail
     */
    async logAction(
        adminId: string,
        action: string,
        targetType?: string | null,
        targetId?: string | null,
        metadata?: Record<string, any> | null,
        ipAddress?: string | null
    ) {
        try {
            await prisma.adminAuditLog.create({
                data: {
                    adminId,
                    action,
                    targetType: targetType || null,
                    targetId: targetId || null,
                    metadata: metadata || undefined,
                    ipAddress: ipAddress || null,
                },
            });
        } catch (e) {
            logger.warn('[AdminAuth] Failed to log audit action', { action, adminId });
        }
    }

    /**
     * Seed initial super admin if none exists
     */
    async seedSuperAdmin() {
        const count = await prisma.superAdmin.count();
        if (count > 0) return;

        const email = process.env.SUPER_ADMIN_EMAIL || 'admin@zodo.ca';
        const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin@2026!';
        const hash = await bcrypt.hash(password, config.bcrypt.rounds);

        await prisma.superAdmin.create({
            data: {
                email,
                passwordHash: hash,
                firstName: 'Super',
                lastName: 'Admin',
                role: 'SUPER_ADMIN',
            },
        });

        logger.info(`[AdminAuth] Seeded super admin: ${email}`);
    }
}

export const adminAuthService = new AdminAuthService();
