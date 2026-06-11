import { importQueue } from '../queues/queue-factory';
import { logger } from '../../../common/utils/logger';
import { eventStoreService } from '../event-store/event-store.service';
import { prisma } from '../../../config/database';
import { randomUUID } from 'crypto';

export class AccountingCommandDispatcher {
  
  /**
   * Command: Start a new CSV Import Session
   * Creates the session in the DB, uploads the file records, and queues the Import Worker.
   */
  async startImportSession(tenantId: string, files: any[], userId?: string): Promise<string> {
    const sessionId = randomUUID();
    
    // 1. Transactionally create session and files
    await prisma.$transaction(async (tx: any) => {
      await tx.importSession.create({
        data: {
          id: sessionId,
          tenantId,
          status: 'PROCESSING',
          source: 'FILE_UPLOAD',
          totalFiles: files.length,
          uploadedBy: userId,
        }
      });

      // Assuming files are already written to S3/Disk, we register them
      for (const file of files) {
        await tx.uploadedFile.create({
          data: {
            tenantId,
            sessionId,
            fileName: file.filename,
            originalName: file.originalname,
            checksum: file.hash || randomUUID(), // Require real hash in production
            status: 'PENDING',
          }
        });
      }
    });

    // 2. Append Event
    await eventStoreService.appendEvent({
      tenantId,
      aggregateId: sessionId,
      aggregateType: 'IMPORT_SESSION',
      eventType: 'ImportSessionStarted',
      payload: { filesCount: files.length, source: 'FILE_UPLOAD', userId },
    });

    // 3. Dispatch to Queue
    await importQueue.add('process-session', {
      tenantId,
      sessionId,
      version: 1,
      idempotencyKey: `start-import-${sessionId}`
    });

    logger.info(`Started Import Session ${sessionId} for tenant ${tenantId}`);
    return sessionId;
  }

  /**
   * Command: Manual Transaction Review
   * Accepts user overrides for a transaction and pushes to the validation queue.
   */
  async reviewTransaction(tenantId: string, transactionId: string, overrides: any, userId?: string): Promise<void> {
    await eventStoreService.appendEvent({
      tenantId,
      aggregateId: transactionId,
      aggregateType: 'TRANSACTION',
      eventType: 'TransactionReviewedByUser',
      payload: { overrides, userId },
    });

    // Trigger validation worker to re-evaluate with overrides
    // ...
  }
}

export const accountingCommands = new AccountingCommandDispatcher();
