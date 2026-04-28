import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']);
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.dll', '.com', '.vbs',
  '.js', '.jar', '.scr', '.pif', '.hta', '.cpl', '.inf', '.reg',
]);

const storage = multer.diskStorage({
  destination: (req: Request, _file, cb) => {
    const tenantId = (req as Request & { context?: { tenantId?: string } }).context?.tenantId || 'unknown';
    const uploadDir = path.join(process.cwd(), 'uploads', tenantId, 'employees');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname) || '.png';
    cb(null, `${uuidv4()}${extension.toLowerCase()}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new Error('Only PNG, JPG, WEBP, or SVG employee photos are allowed'));
    return;
  }

  cb(null, true);
};

export const uploadEmployeeAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_AVATAR_SIZE,
  },
}).single('avatar');

const documentStorage = multer.diskStorage({
  destination: (req: Request, _file, cb) => {
    const tenantId = (req as Request & { context?: { tenantId?: string } }).context?.tenantId || 'unknown';
    const uploadDir = path.join(process.cwd(), 'uploads', tenantId, 'employees', 'documents');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname) || '';
    cb(null, `${uuidv4()}${extension.toLowerCase()}`);
  },
});

const documentFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const extension = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(extension)) {
    cb(new Error(`File type ${extension} is not allowed for security reasons`));
    return;
  }

  cb(null, true);
};

export const uploadEmployeeDocument = multer({
  storage: documentStorage,
  fileFilter: documentFilter,
  limits: {
    fileSize: MAX_DOCUMENT_SIZE,
  },
}).single('file');
