import { filesRepository } from './files.repository';
import { UploadFileDto, UpdateFileDto, FileQueryDto, toFileResponseDto, StorageAnalyticsDto } from './files.dto';
import { NotFoundError, ForbiddenError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { eventBus } from '../../common/events/event-bus';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Default storage limit: 10GB per tenant
const DEFAULT_STORAGE_LIMIT = 10 * 1024 * 1024 * 1024;

export class FilesService {
    // ── UPLOAD ──
    async upload(
        tenantId: string,
        file: Express.Multer.File,
        opts?: { folderId?: string; projectId?: string; clientId?: string; leadId?: string; quoteId?: string },
    ) {
        // Compute checksum
        const fileBuffer = fs.readFileSync(file.path);
        const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        const data: UploadFileDto = {
            name: file.originalname,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            path: file.path,
            extension: path.extname(file.originalname).toLowerCase() || null,
            folderId: opts?.folderId || null,
            projectId: opts?.projectId || null,
            clientId: opts?.clientId || null,
            leadId: opts?.leadId || null,
            quoteId: opts?.quoteId || null,
            checksum,
        };

        const saved = await filesRepository.create(tenantId, data);
        const dto = toFileResponseDto(saved);

        activityLogger.log({
            tenantId, entityType: 'File', entityId: dto.id,
            action: 'CREATE', module: 'files',
            description: `Uploaded file "${dto.name}" (${formatBytes(dto.size)})`,
            metadata: { fileName: dto.name, mimeType: dto.mimeType, size: dto.size, checksum },
        });

        eventBus.emit('file.uploaded', { tenantId, fileId: dto.id, fileName: dto.name, mimeType: dto.mimeType });
        return dto;
    }

    // Legacy create (metadata-only for backwards compat)
    async create(tenantId: string, data: UploadFileDto) {
        const file = await filesRepository.create(tenantId, data);
        return toFileResponseDto(file);
    }

    // ── READ ──
    async getById(id: string, tenantId: string) {
        const file = await filesRepository.findById(id, tenantId);
        if (!file) throw new NotFoundError('File not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toFileResponseDto(file);
    }

    async getMany(tenantId: string, query: FileQueryDto) {
        const { data, total } = await filesRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(toFileResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }

    async getRecent(tenantId: string) {
        const files = await filesRepository.findRecent(tenantId, 30);
        return files.map(toFileResponseDto);
    }

    async getStarred(tenantId: string) {
        const files = await filesRepository.findStarred(tenantId);
        return files.map(toFileResponseDto);
    }

    async getTrash(tenantId: string) {
        const files = await filesRepository.findTrashed(tenantId);
        return files.map(toFileResponseDto);
    }

    // ── DOWNLOAD ──
    async download(id: string, tenantId: string): Promise<{ filePath: string; fileName: string; mimeType: string }> {
        const file = await filesRepository.findById(id, tenantId);
        if (!file) throw new NotFoundError('File not found', ErrorCodes.RESOURCE_NOT_FOUND);

        // Validate file exists on disk
        if (!fs.existsSync(file.path)) {
            throw new NotFoundError('File no longer exists on disk', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        activityLogger.log({
            tenantId, entityType: 'File', entityId: id,
            action: 'UPDATE', module: 'files',
            description: `Downloaded file "${file.name}"`,
        });

        return { filePath: file.path, fileName: file.originalName, mimeType: file.mimeType };
    }

    // ── DOWNLOAD BY SHARE LINK ──
    async downloadByShareLink(shareLink: string): Promise<{ filePath: string; fileName: string; mimeType: string }> {
        const file = await filesRepository.findByShareLink(shareLink);
        if (!file) throw new NotFoundError('Shared file not found or link expired', ErrorCodes.RESOURCE_NOT_FOUND);

        if (!file.isShared) {
            throw new ForbiddenError('Share link is disabled');
        }

        // Check expiry
        if (file.shareExpiresAt && new Date() > file.shareExpiresAt) {
            throw new ForbiddenError('Share link has expired');
        }

        if (!fs.existsSync(file.path)) {
            throw new NotFoundError('File no longer exists', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        return { filePath: file.path, fileName: file.originalName, mimeType: file.mimeType };
    }

    // ── UPDATE ──
    async update(id: string, tenantId: string, data: UpdateFileDto) {
        const existing = await filesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('File not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const file = await filesRepository.update(id, tenantId, data);
        const dto = toFileResponseDto(file);

        activityLogger.log({
            tenantId, entityType: 'File', entityId: dto.id,
            action: 'UPDATE', module: 'files',
            description: `Updated file "${dto.name}"`,
            metadata: { updatedFields: Object.keys(data) },
        });
        return dto;
    }

    // ── STAR ──
    async toggleStar(id: string, tenantId: string) {
        const file = await filesRepository.toggleStar(id, tenantId);
        return toFileResponseDto(file);
    }

    // ── MOVE ──
    async move(id: string, tenantId: string, folderId: string | null) {
        const file = await filesRepository.moveToFolder(id, tenantId, folderId);
        const dto = toFileResponseDto(file);

        activityLogger.log({
            tenantId, entityType: 'File', entityId: id,
            action: 'UPDATE', module: 'files',
            description: `Moved file "${dto.name}" to ${folderId ? `folder` : 'root'}`,
            metadata: { folderId },
        });
        return dto;
    }

    // ── COPY ──
    async copy(id: string, tenantId: string, opts?: { folderId?: string | null; name?: string }) {
        const existing = await filesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('File not found', ErrorCodes.RESOURCE_NOT_FOUND);

        // Copy file on disk
        const ext = path.extname(existing.path);
        const newDir = path.dirname(existing.path);
        const newPath = path.join(newDir, `${crypto.randomUUID()}${ext}`);

        if (fs.existsSync(existing.path)) {
            fs.copyFileSync(existing.path, newPath);
        }

        const copyData: UploadFileDto = {
            name: opts?.name || `Copy of ${existing.name}`,
            originalName: existing.originalName,
            mimeType: existing.mimeType,
            size: Number(existing.size),
            path: newPath,
            extension: existing.extension,
            folderId: opts?.folderId !== undefined ? opts.folderId : existing.folderId,
            checksum: existing.checksum,
        };

        const copied = await filesRepository.create(tenantId, copyData);
        return toFileResponseDto(copied);
    }

    // ── SHARE ──
    async createShareLink(id: string, tenantId: string, expiresInHours?: number) {
        const file = await filesRepository.createShareLink(id, tenantId, expiresInHours);
        const dto = toFileResponseDto(file);

        activityLogger.log({
            tenantId, entityType: 'File', entityId: id,
            action: 'UPDATE', module: 'files',
            description: `Created share link for "${dto.name}"`,
            metadata: { shareLink: dto.shareLink, expiresInHours },
        });
        return dto;
    }

    async revokeShareLink(id: string, tenantId: string) {
        const file = await filesRepository.removeShareLink(id, tenantId);
        return toFileResponseDto(file);
    }

    // ── DELETE / RESTORE ──
    async delete(id: string, tenantId: string) {
        const existing = await filesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('File not found', ErrorCodes.RESOURCE_NOT_FOUND);

        activityLogger.log({
            tenantId, entityType: 'File', entityId: id,
            action: 'DELETE', module: 'files',
            description: `Moved file "${existing.name}" to trash`,
        });

        await filesRepository.softDelete(id, tenantId);
    }

    async restore(id: string, tenantId: string) {
        const file = await filesRepository.restore(id, tenantId);
        const dto = toFileResponseDto(file);

        activityLogger.log({
            tenantId, entityType: 'File', entityId: id,
            action: 'UPDATE', module: 'files',
            description: `Restored file "${dto.name}" from trash`,
        });
        return dto;
    }

    async permanentDelete(id: string, tenantId: string) {
        const existing = await filesRepository.findByIdIncludingDeleted(id, tenantId);
        if (!existing) throw new NotFoundError('File not found', ErrorCodes.RESOURCE_NOT_FOUND);

        // Delete from disk
        try {
            if (fs.existsSync(existing.path)) fs.unlinkSync(existing.path);
        } catch (e) {
            console.warn(`Could not delete file from disk: ${existing.path}`, e);
        }

        activityLogger.log({
            tenantId, entityType: 'File', entityId: id,
            action: 'DELETE', module: 'files',
            description: `Permanently deleted file "${existing.name}"`,
        });

        await filesRepository.permanentDelete(id, tenantId);
    }

    // ── BULK ──
    async bulkDelete(tenantId: string, fileIds: string[]) {
        const result = await filesRepository.bulkSoftDelete(fileIds, tenantId);

        activityLogger.log({
            tenantId, entityType: 'File', entityId: fileIds[0],
            action: 'DELETE', module: 'files',
            description: `Bulk deleted ${result.count} files`,
            metadata: { fileIds },
        });
        return { count: result.count };
    }

    async bulkMove(tenantId: string, fileIds: string[], folderId: string | null) {
        const result = await filesRepository.bulkMove(fileIds, tenantId, folderId);
        return { count: result.count };
    }

    // ── STORAGE ANALYTICS ──
    async getStorageAnalytics(tenantId: string): Promise<StorageAnalyticsDto> {
        const stats = await filesRepository.getStorageStats(tenantId);
        return {
            totalUsed: stats.totalUsed,
            totalLimit: DEFAULT_STORAGE_LIMIT,
            fileCount: stats.fileCount,
            breakdown: stats.breakdown as StorageAnalyticsDto['breakdown'],
        };
    }
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const filesService = new FilesService();
