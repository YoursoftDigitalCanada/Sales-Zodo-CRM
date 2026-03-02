import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';

interface AdminTokenPayload {
    adminId: string;
    email: string;
    role: string;
}

// Extend Express Request
declare global {
    namespace Express {
        interface Request {
            admin?: AdminTokenPayload;
        }
    }
}

/**
 * Admin authentication middleware — completely separate from CRM auth.
 * Uses ADMIN_JWT_SECRET (or falls back to JWT_ACCESS_SECRET).
 * Only SuperAdmin accounts can pass this middleware.
 */
export function adminAuthenticate(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: 'Admin authentication required' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = jwt.verify(token, config.admin.jwtSecret) as AdminTokenPayload;

        if (!payload.adminId || !['SUPER_ADMIN', 'MANAGER'].includes(payload.role)) {
            res.status(403).json({ success: false, message: 'Insufficient admin privileges' });
            return;
        }

        req.admin = payload;
        next();
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({ success: false, message: 'Admin token expired' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid admin token' });
        }
    }
}
