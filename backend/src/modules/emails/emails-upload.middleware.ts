import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import { config } from '../../config';

const BLOCKED_EXTENSIONS = new Set([
    '.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.dll', '.com', '.vbs',
    '.js', '.jar', '.scr', '.pif', '.hta', '.cpl', '.inf', '.reg',
]);

const storage = multer.diskStorage({
    destination: (req: Request, _file, cb) => {
        const tenantId = (req as any).context?.tenantId || 'unknown';
        const uploadDir = path.resolve(config.upload.uploadPath, tenantId, 'emails');

        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueId = uuidv4();
        const ext = path.extname(file.originalname).toLowerCase();
        const safeName = (file.originalname || 'attachment')
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .substring(0, 100);
        cb(null, `${uniqueId}-${safeName || `attachment${ext}`}`);
    },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
        cb(new Error(`File type ${ext} is not allowed for security reasons`));
        return;
    }

    cb(null, true);
};

export const uploadEmailAttachments = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: Math.max(config.upload.maxFileSize, 50 * 1024 * 1024),
        files: 10,
    },
}).array('attachments', 10);
