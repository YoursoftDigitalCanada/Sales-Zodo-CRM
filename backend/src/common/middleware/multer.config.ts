import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

// Blocked file extensions (security)
const BLOCKED_EXTENSIONS = new Set([
    '.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.dll', '.com', '.vbs',
    '.js', '.jar', '.scr', '.pif', '.hta', '.cpl', '.inf', '.reg',
]);

// Max file size: 50MB default
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Tenant-scoped disk storage
const storage = multer.diskStorage({
    destination: (req: Request, _file, cb) => {
        const tenantId = (req as any).context?.tenantId || 'unknown';
        const uploadDir = path.join(process.cwd(), 'uploads', tenantId);
        
        // Create directory if it doesn't exist
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueId = uuidv4();
        const ext = path.extname(file.originalname).toLowerCase();
        const safeName = file.originalname
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .substring(0, 100);
        cb(null, `${uniqueId}-${safeName}`);
    },
});

// File filter — block dangerous extensions
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
        cb(new Error(`File type ${ext} is not allowed for security reasons`));
        return;
    }
    cb(null, true);
};

// Single file upload middleware
export const uploadSingle = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
}).single('file');

// Multiple file upload middleware (max 10 at once)
export const uploadMultiple = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
}).array('files', 10);
