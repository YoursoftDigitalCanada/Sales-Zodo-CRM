import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import { config } from '../../config';

const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']);

const storage = multer.diskStorage({
  destination: (req: Request, _file, cb) => {
    const tenantId = (req as Request & { context?: { tenantId?: string } }).context?.tenantId || 'unknown';
    const uploadDir = path.resolve(config.upload.uploadPath, tenantId, 'settings');
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
    cb(new Error('Only PNG, JPG, WEBP, or SVG logos are allowed'));
    return;
  }

  cb(null, true);
};

export const uploadCompanyLogo = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_LOGO_SIZE,
  },
}).single('logo');
