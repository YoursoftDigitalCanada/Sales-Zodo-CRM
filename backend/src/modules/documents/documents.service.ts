import path from 'path';
import { prisma } from '../../config/database';
import { BadRequestError, NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { filesService } from '../files/files.service';
import { foldersService } from '../folders/folders.service';

const db = prisma as any;

const DEFAULT_CATEGORIES = [
  ['Contracts', '#2563EB'],
  ['Proposals', '#7C3AED'],
  ['Invoices', '#16A34A'],
  ['Receipts', '#059669'],
  ['Client Files', '#0891B2'],
  ['Project Files', '#EA580C'],
  ['Reports', '#475569'],
  ['Templates', '#CA8A04'],
  ['Other', '#64748B'],
] as const;

function cleanString(value: unknown, max = 500) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function cleanBool(value: unknown) {
  return value === true || value === 'true' || value === '1';
}

function cleanDate(value: unknown) {
  const raw = cleanString(value, 80);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function fileType(file: any) {
  const ext = String(file.extension || path.extname(file.originalName || file.name || '') || '').replace('.', '').toLowerCase();
  const mime = String(file.mimeType || '');
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (mime.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(ext)) return 'video';
  if (['xls', 'xlsx', 'csv'].includes(ext) || mime.includes('spreadsheet') || mime.includes('excel')) return 'spreadsheet';
  if (['doc', 'docx', 'txt'].includes(ext) || mime.includes('word') || mime.startsWith('text/')) return 'document';
  if (['zip', 'rar', '7z'].includes(ext)) return 'archive';
  return 'other';
}

function toDocument(file: any) {
  const metadata = file.documentMetadata || null;
  return {
    id: file.id,
    fileId: file.id,
    name: file.name,
    originalName: file.originalName,
    mimeType: file.mimeType,
    type: metadata?.documentType || fileType(file),
    size: Number(file.size || 0),
    extension: file.extension,
    folderId: file.folderId,
    folder: file.folder || null,
    category: metadata?.category || null,
    categoryId: metadata?.categoryId || null,
    description: metadata?.description || null,
    version: metadata?.version || 1,
    linkedEntityType: metadata?.linkedEntityType || null,
    linkedEntityId: metadata?.linkedEntityId || null,
    visibleToClient: Boolean(metadata?.visibleToClient),
    requiresSignature: Boolean(metadata?.requiresSignature),
    expiresAt: metadata?.expiresAt || null,
    metadata: metadata?.metadata || {},
    tags: (file.tags || []).map((item: any) => item.tag).filter(Boolean),
    isStarred: file.isStarred,
    isShared: file.isShared,
    shareLink: file.shareLink,
    shareExpiresAt: file.shareExpiresAt,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    deletedAt: file.deletedAt,
  };
}

export class DocumentsService {
  async ensureDefaultCategories(tenantId: string) {
    const existing = await db.documentCategory.findMany({ where: { tenantId } });
    const existingNames = new Set(existing.map((item: any) => item.name.toLowerCase()));
    const missing = DEFAULT_CATEGORIES.filter(([name]) => !existingNames.has(name.toLowerCase()));
    if (missing.length) {
      await db.documentCategory.createMany({
        data: missing.map(([name, color]) => ({ tenantId, name, color, isSystem: true })),
        skipDuplicates: true,
      });
    }
    return db.documentCategory.findMany({ where: { tenantId }, orderBy: [{ isSystem: 'desc' }, { name: 'asc' }] });
  }

  async list(tenantId: string, query: Record<string, unknown>) {
    await this.ensureDefaultCategories(tenantId);
    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.min(Math.max(Number(query.limit || 50), 1), 100);
    const search = cleanString(query.search, 200);
    const categoryId = cleanString(query.categoryId, 80);
    const documentType = cleanString(query.documentType || query.type, 80);
    const folderId = cleanString(query.folderId, 80);
    const linkedEntityType = cleanString(query.linkedEntityType, 80);
    const linkedEntityId = cleanString(query.linkedEntityId, 80);
    const starred = query.starred !== undefined ? cleanBool(query.starred) : null;
    const shared = query.shared !== undefined ? cleanBool(query.shared) : null;

    const where: any = { tenantId, deletedAt: null };
    if (folderId !== null) where.folderId = folderId === 'root' ? null : folderId;
    if (starred !== null) where.isStarred = starred;
    if (shared !== null) where.isShared = shared;
    if (documentType && documentType !== 'all') where.documentMetadata = { ...(where.documentMetadata || {}), documentType };
    if (categoryId && categoryId !== 'all') where.documentMetadata = { ...(where.documentMetadata || {}), categoryId };
    if (linkedEntityType) where.documentMetadata = { ...(where.documentMetadata || {}), linkedEntityType };
    if (linkedEntityId) where.documentMetadata = { ...(where.documentMetadata || {}), linkedEntityId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { originalName: { contains: search, mode: 'insensitive' } },
        { documentMetadata: { description: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const include = {
      folder: { select: { id: true, name: true } },
      tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
      documentMetadata: { include: { category: true } },
    };
    const [files, total] = await Promise.all([
      db.file.findMany({ where, include, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      db.file.count({ where }),
    ]);
    return {
      data: files.map(toDocument),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  async upload(tenantId: string, file: Express.Multer.File, body: Record<string, unknown>) {
    const saved = await filesService.upload(tenantId, file, {
      folderId: cleanString(body.folderId, 80) || undefined,
      projectId: cleanString(body.projectId, 80) || undefined,
      clientId: cleanString(body.clientId, 80) || undefined,
      leadId: cleanString(body.leadId, 80) || undefined,
      quoteId: cleanString(body.quoteId, 80) || undefined,
    });
    await this.upsertMetadata(saved.id, tenantId, body);
    return this.get(saved.id, tenantId);
  }

  async createFolder(tenantId: string, body: Record<string, unknown>) {
    const name = cleanString(body.name, 120);
    if (!name) throw new BadRequestError('Folder name is required', ErrorCodes.VALIDATION_FAILED);
    return foldersService.create(tenantId, {
      name,
      parentId: cleanString(body.parentId, 80),
    });
  }

  async get(id: string, tenantId: string) {
    const file = await db.file.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        folder: { select: { id: true, name: true } },
        tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
        documentMetadata: { include: { category: true } },
      },
    });
    if (!file) throw new NotFoundError('Document not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return toDocument(file);
  }

  async update(id: string, tenantId: string, body: Record<string, unknown>) {
    await this.get(id, tenantId);
    const fileUpdate: any = {};
    const name = cleanString(body.name, 255);
    if (name) fileUpdate.name = name;
    if (body.folderId !== undefined) fileUpdate.folderId = cleanString(body.folderId, 80);
    if (body.isStarred !== undefined) fileUpdate.isStarred = cleanBool(body.isStarred);
    if (Object.keys(fileUpdate).length) await db.file.update({ where: { id_tenantId: { id, tenantId } }, data: fileUpdate });
    await this.upsertMetadata(id, tenantId, body);
    return this.get(id, tenantId);
  }

  async delete(id: string, tenantId: string) {
    await filesService.delete(id, tenantId);
  }

  async share(id: string, tenantId: string, body: Record<string, unknown>) {
    await this.get(id, tenantId);
    await filesService.createShareLink(id, tenantId, Number(body.expiresInHours || 0) || undefined);
    return this.get(id, tenantId);
  }

  async revokeShare(id: string, tenantId: string) {
    await this.get(id, tenantId);
    await filesService.revokeShareLink(id, tenantId);
    return this.get(id, tenantId);
  }

  async link(id: string, tenantId: string, body: Record<string, unknown>) {
    return this.update(id, tenantId, {
      linkedEntityType: body.linkedEntityType,
      linkedEntityId: body.linkedEntityId,
    });
  }

  async unlink(id: string, tenantId: string) {
    return this.update(id, tenantId, { linkedEntityType: null, linkedEntityId: null });
  }

  async categories(tenantId: string) {
    return this.ensureDefaultCategories(tenantId);
  }

  async createCategory(tenantId: string, body: Record<string, unknown>) {
    const name = cleanString(body.name, 80);
    if (!name) throw new BadRequestError('Category name is required', ErrorCodes.VALIDATION_FAILED);
    return db.documentCategory.create({ data: { tenantId, name, color: cleanString(body.color, 30), isSystem: false } });
  }

  async updateCategory(id: string, tenantId: string, body: Record<string, unknown>) {
    const category = await db.documentCategory.findFirst({ where: { id, tenantId } });
    if (!category) throw new NotFoundError('Category not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return db.documentCategory.update({
      where: { id },
      data: { name: cleanString(body.name, 80) || category.name, color: cleanString(body.color, 30) },
    });
  }

  async deleteCategory(id: string, tenantId: string) {
    const category = await db.documentCategory.findFirst({ where: { id, tenantId } });
    if (!category) throw new NotFoundError('Category not found', ErrorCodes.RESOURCE_NOT_FOUND);
    if (category.isSystem) throw new BadRequestError('System categories cannot be deleted', ErrorCodes.VALIDATION_FAILED);
    await db.documentMetadata.updateMany({ where: { tenantId, categoryId: id }, data: { categoryId: null } });
    await db.documentCategory.delete({ where: { id } });
  }

  private async upsertMetadata(fileId: string, tenantId: string, body: Record<string, unknown>) {
    const existing = await db.documentMetadata.findUnique({ where: { fileId } });
    const categoryId = body.categoryId !== undefined ? cleanString(body.categoryId, 80) : existing?.categoryId || null;
    if (categoryId) {
      const category = await db.documentCategory.findFirst({ where: { id: categoryId, tenantId } });
      if (!category) throw new BadRequestError('Category does not belong to this tenant', ErrorCodes.VALIDATION_FAILED);
    }
    const data = {
      tenantId,
      fileId,
      categoryId,
      documentType: body.documentType !== undefined || body.type !== undefined ? cleanString(body.documentType || body.type, 80) : existing?.documentType || null,
      description: body.description !== undefined ? cleanString(body.description, 1000) : existing?.description || null,
      version: body.version !== undefined ? Math.max(Number(body.version || 1), 1) : existing?.version || 1,
      linkedEntityType: body.linkedEntityType !== undefined ? cleanString(body.linkedEntityType, 80) : existing?.linkedEntityType || null,
      linkedEntityId: body.linkedEntityId !== undefined ? cleanString(body.linkedEntityId, 80) : existing?.linkedEntityId || null,
      visibleToClient: body.visibleToClient !== undefined ? cleanBool(body.visibleToClient) : Boolean(existing?.visibleToClient),
      requiresSignature: body.requiresSignature !== undefined ? cleanBool(body.requiresSignature) : Boolean(existing?.requiresSignature),
      expiresAt: body.expiresAt !== undefined ? cleanDate(body.expiresAt) : existing?.expiresAt || null,
      metadata: existing?.metadata || {},
    };
    return db.documentMetadata.upsert({
      where: { fileId },
      create: data,
      update: data,
    });
  }
}

export const documentsService = new DocumentsService();
