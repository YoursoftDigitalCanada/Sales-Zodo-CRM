import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import { BadRequestError, NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const MAX_RECORDING_CHUNK_BYTES = Number(process.env.RECORDING_MAX_CHUNK_BYTES || 750_000);

function safeSegment(value: string, field: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new BadRequestError(`Invalid ${field}`, ErrorCodes.VALIDATION_FAILED);
  }
  return value;
}

function rootPath() {
  return path.resolve(process.env.RECORDING_STORAGE_PATH || path.join(process.cwd(), 'storage', 'recordings'));
}

function chunkRelativePath(tenantId: string, siteId: string, sessionId: string, sequence: number) {
  const file = `chunk-${String(sequence).padStart(6, '0')}.json.gz`;
  return path.join(
    safeSegment(tenantId, 'tenantId'),
    safeSegment(siteId, 'siteId'),
    safeSegment(sessionId, 'sessionId'),
    file
  );
}

export class RecordingStorageService {
  get maxChunkBytes() {
    return MAX_RECORDING_CHUNK_BYTES;
  }

  async writeChunk(params: {
    tenantId: string;
    siteId: string;
    sessionId: string;
    sequence: number;
    events: unknown[];
  }) {
    const payload = JSON.stringify({ events: params.events });
    const rawBytes = Buffer.byteLength(payload, 'utf8');
    if (rawBytes > MAX_RECORDING_CHUNK_BYTES) {
      throw new BadRequestError('Recording chunk payload is too large', ErrorCodes.VALIDATION_FAILED);
    }
    const compressed = await gzip(Buffer.from(payload));
    const relativePath = chunkRelativePath(params.tenantId, params.siteId, params.sessionId, params.sequence);
    const fullPath = this.resolvePath(relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, compressed);
    return {
      storagePath: relativePath,
      checksum: crypto.createHash('sha256').update(compressed).digest('hex'),
      sizeBytes: compressed.length,
      rawBytes,
    };
  }

  async readChunk(storagePath: string) {
    const fullPath = this.resolvePath(storagePath);
    try {
      const compressed = await fs.readFile(fullPath);
      const decompressed = await gunzip(compressed);
      const parsed = JSON.parse(decompressed.toString('utf8'));
      return Array.isArray(parsed.events) ? parsed.events : [];
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        throw new NotFoundError('Recording chunk file not found', ErrorCodes.RESOURCE_NOT_FOUND);
      }
      throw error;
    }
  }

  async deleteChunk(storagePath: string) {
    const fullPath = this.resolvePath(storagePath);
    await fs.unlink(fullPath).catch((error: any) => {
      if (error?.code !== 'ENOENT') throw error;
    });
  }

  private resolvePath(storagePath: string) {
    const root = rootPath();
    const fullPath = path.resolve(root, storagePath);
    if (!fullPath.startsWith(root + path.sep)) {
      throw new BadRequestError('Invalid recording storage path', ErrorCodes.VALIDATION_FAILED);
    }
    return fullPath;
  }
}

export const recordingStorageService = new RecordingStorageService();
