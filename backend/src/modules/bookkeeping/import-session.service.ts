import { createHash } from 'crypto';
import { prisma } from '../../config/database';
import { csvParserService } from './csv-parser.service';
import { aiCategorizationService } from './ai-categorization.service';
import { transferMatchingService } from './transfer-matching.service';
import { bookkeepingAuditService } from './audit.service';
import { bookkeepingService } from './bookkeeping.service';
import { toNumber } from './bookkeeping.dto';

const db = () => prisma as any;

interface ProcessResult {
  totalRows: number;
  processed: number;
  duplicates: number;
  errors: string[];
}

interface FinalizeResult {
  totalCreated: number;
  totalSkipped: number;
  totalTransfers: number;
  journalEntriesCreated: number;
}

class ImportSessionService {

  // ─── Session Lifecycle ──────────────────────────────────────────────

  async createSession(tenantId: string, name?: string, actorUserId?: string) {
    const session = await prisma.importSession.create({
      data: {
        tenantId,
        name: name || `Import ${new Date().toISOString().slice(0, 10)}`,
        status: 'DRAFT',
        createdById: actorUserId || undefined,
      },
    });

    await bookkeepingAuditService.log({
      tenantId,
      entityType: 'IMPORT_SESSION',
      entityId: session.id,
      action: 'CREATE',
      afterValue: { name: session.name, status: session.status },
      userId: actorUserId,
    });

    return session;
  }

  async getSession(id: string, tenantId: string) {
    const session = await prisma.importSession.findFirst({
      where: { id, tenantId },
      include: {
        files: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!session) throw new Error('Import session not found');

    // Compute stats
    const stats = await prisma.rawTransaction.groupBy({
      by: ['status'],
      where: { sessionId: id, tenantId },
      _count: true,
    });

    const statusCounts: Record<string, number> = {};
    for (const s of stats) statusCounts[s.status] = (s as any)._count;

    return { ...session, statusCounts };
  }

  async listSessions(tenantId: string, query: { page?: number; limit?: number; status?: string } = {}) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      prisma.importSession.findMany({
        where,
        include: { files: { select: { id: true, fileName: true, status: true, rowCount: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.importSession.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
    };
  }

  async cancelSession(id: string, tenantId: string, actorUserId?: string) {
    const session = await prisma.importSession.findFirst({ where: { id, tenantId } });
    if (!session) throw new Error('Import session not found');
    if (session.status === 'FINALIZED') throw new Error('Cannot cancel a finalized session');

    await prisma.importSession.update({ where: { id }, data: { status: 'CANCELLED' } });

    await bookkeepingAuditService.log({
      tenantId,
      entityType: 'IMPORT_SESSION',
      entityId: id,
      action: 'CANCEL',
      beforeValue: { status: session.status },
      afterValue: { status: 'CANCELLED' },
      userId: actorUserId,
    });
  }

  // ─── File Upload ────────────────────────────────────────────────────

  async uploadFile(
    sessionId: string,
    tenantId: string,
    fileContent: string,
    fileName: string,
    accountId?: string,
    actorUserId?: string,
  ) {
    const session = await prisma.importSession.findFirst({ where: { id: sessionId, tenantId } });
    if (!session) throw new Error('Import session not found');
    if (['FINALIZED', 'CANCELLED'].includes(session.status)) throw new Error('Session is closed');

    // Generate checksum for duplicate file detection
    const checksum = createHash('sha256').update(fileContent).digest('hex');

    // Check if this exact file was already uploaded
    const existingFile = await prisma.uploadedFile.findFirst({ where: { tenantId, checksum } });
    if (existingFile) throw new Error(`This file has already been uploaded (in session ${existingFile.sessionId})`);

    // Parse the CSV
    const parsed = csvParserService.parse(fileContent, fileName);
    if (!parsed.normalized.length) throw new Error('No valid transactions found in CSV file');

    // Determine or create account
    let resolvedAccountId = accountId;
    if (!resolvedAccountId) {
      // Try to auto-detect from CSV data
      const firstRow = parsed.normalized[0];
      const accountName = this.buildAccountName(firstRow, parsed.provider, fileName);
      const accountType = parsed.provider === 'CREDIT_CARD' ? 'LIABILITY' : 'ASSET';
      const subtype = parsed.provider === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'CHECKING';

      let account = await db().bookkeepingAccount.findFirst({ where: { tenantId, name: accountName } });
      if (!account) {
        account = await db().bookkeepingAccount.create({
          data: {
            tenantId,
            name: accountName,
            type: accountType,
            subtype,
            isBankAccount: accountType === 'ASSET',
            isSystem: false,
            openingBalance: 0,
            currentBalance: 0,
          },
        });
      }
      resolvedAccountId = account.id;
    }

    // Detect statement date range
    const dates = parsed.normalized.map(n => new Date(n.date)).filter(d => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
    const statementStart = dates.length ? dates[0] : null;
    const statementEnd = dates.length ? dates[dates.length - 1] : null;

    // Create the uploaded file record
    const uploadedFile = await prisma.uploadedFile.create({
      data: {
        tenantId,
        sessionId,
        accountId: resolvedAccountId,
        fileName,
        originalName: fileName,
        provider: parsed.provider,
        statementStart,
        statementEnd,
        checksum,
        rowCount: parsed.normalized.length,
        status: 'PENDING',
        metadata: { headers: parsed.headers },
      },
    });

    // Update session file count
    await prisma.importSession.update({
      where: { id: sessionId },
      data: { totalFiles: { increment: 1 } },
    });

    await bookkeepingAuditService.log({
      tenantId,
      entityType: 'UPLOADED_FILE',
      entityId: uploadedFile.id,
      action: 'UPLOAD',
      afterValue: { fileName, provider: parsed.provider, rowCount: parsed.normalized.length, accountId: resolvedAccountId },
      userId: actorUserId,
    });

    return { uploadedFile, parsed };
  }

  // ─── File Processing ────────────────────────────────────────────────

  async processFile(uploadedFileId: string, tenantId: string, actorUserId?: string): Promise<ProcessResult> {
    const file = await prisma.uploadedFile.findFirst({ where: { id: uploadedFileId, tenantId } });
    if (!file) throw new Error('Uploaded file not found');
    if (file.status === 'PROCESSED') throw new Error('File already processed');

    await prisma.uploadedFile.update({ where: { id: uploadedFileId }, data: { status: 'PROCESSING' } });

    const errors: string[] = [];
    let processed = 0;
    let duplicates = 0;

    try {
      // Fetch the raw transactions already created for this file (from upload step)
      // Or re-parse if needed — but we create raw txs here since upload just stores metadata
      const session = await prisma.importSession.findFirst({ where: { id: file.sessionId, tenantId } });
      if (!session) throw new Error('Session not found');

      // Get the parsed data from the file — we need to re-read since we only stored metadata
      // For now, fetch existing raw transactions, or if none exist, they need to be created from processAllFiles
      const existingRawTxs = await prisma.rawTransaction.findMany({
        where: { uploadedFileId, tenantId },
      });

      if (!existingRawTxs.length) {
        // This shouldn't happen in normal flow, but handle it
        await prisma.uploadedFile.update({ where: { id: uploadedFileId }, data: { status: 'ERROR', errorMessage: 'No raw transactions found. Re-upload the file.' } });
        return { totalRows: 0, processed: 0, duplicates: 0, errors: ['No raw transactions to process'] };
      }

      // AI categorize in batches of 20
      const batchSize = 20;
      for (let i = 0; i < existingRawTxs.length; i += batchSize) {
        const batch = existingRawTxs.slice(i, i + batchSize);
        const normalizedBatch = batch.map((r: any) => r.normalizedData as any);

        try {
          const aiResults = await aiCategorizationService.batchCategorize(tenantId, normalizedBatch);

          for (let j = 0; j < batch.length; j++) {
            const rawTx = batch[j];
            const aiResult = aiResults[j];
            const status = aiCategorizationService.determineStatus(aiResult.confidence);

            await prisma.rawTransaction.update({
              where: { id: rawTx.id },
              data: {
                aiCategory: aiResult.category,
                aiVendor: aiResult.vendor,
                aiConfidence: aiResult.confidence,
                aiTransactionType: aiResult.transactionType,
                aiReason: aiResult.reason,
                aiPossibleTransfer: aiResult.possibleTransfer,
                status: rawTx.isDuplicate ? 'SKIPPED' : status,
              },
            });

            await bookkeepingAuditService.log({
              tenantId,
              entityType: 'RAW_TRANSACTION',
              entityId: rawTx.id,
              action: 'AI_CATEGORIZE',
              aiResponse: aiResult,
              userId: actorUserId,
            });

            processed++;
          }
        } catch (batchError: any) {
          errors.push(`Batch ${Math.floor(i / batchSize) + 1} failed: ${batchError.message}`);
          // Mark as needs review
          for (const rawTx of batch) {
            if (!rawTx.isDuplicate) {
              await prisma.rawTransaction.update({
                where: { id: rawTx.id },
                data: { status: 'NEEDS_REVIEW', aiReason: 'AI categorization failed' },
              });
            }
            processed++;
          }
        }
      }

      duplicates = existingRawTxs.filter((r: any) => r.isDuplicate).length;

      // Update file status
      await prisma.uploadedFile.update({
        where: { id: uploadedFileId },
        data: { status: 'PROCESSED', processedCount: processed, duplicateCount: duplicates },
      });

    } catch (error: any) {
      await prisma.uploadedFile.update({
        where: { id: uploadedFileId },
        data: { status: 'ERROR', errorMessage: error.message },
      });
      errors.push(error.message);
    }

    return { totalRows: file.rowCount, processed, duplicates, errors };
  }

  async processSession(sessionId: string, tenantId: string, actorUserId?: string) {
    const session = await prisma.importSession.findFirst({ where: { id: sessionId, tenantId } });
    if (!session) throw new Error('Import session not found');

    await prisma.importSession.update({ where: { id: sessionId }, data: { status: 'PROCESSING' } });

    // Process all pending files
    const pendingFiles = await prisma.uploadedFile.findMany({
      where: { sessionId, tenantId, status: { in: ['PENDING'] } },
    });

    const results: ProcessResult[] = [];
    for (const file of pendingFiles) {
      const result = await this.processFile(file.id, tenantId, actorUserId);
      results.push(result);
    }

    // Run transfer matching across the entire session
    const matchResult = await transferMatchingService.matchSession(sessionId, tenantId);

    // Update session status and counts
    const totalRaw = await prisma.rawTransaction.count({ where: { sessionId, tenantId } });
    const totalDupes = await prisma.rawTransaction.count({ where: { sessionId, tenantId, isDuplicate: true } });

    await prisma.importSession.update({
      where: { id: sessionId },
      data: {
        status: 'REVIEW',
        totalRawTx: totalRaw,
        totalDupes: totalDupes,
      },
    });

    return { fileResults: results, matchResult };
  }

  // ─── Upload + Create Raw Transactions ───────────────────────────────

  async uploadAndCreateRawTransactions(
    sessionId: string,
    tenantId: string,
    fileContent: string,
    fileName: string,
    accountId?: string,
    actorUserId?: string,
  ) {
    const { uploadedFile, parsed } = await this.uploadFile(sessionId, tenantId, fileContent, fileName, accountId, actorUserId);

    // Create raw transactions for each normalized row
    let duplicateCount = 0;
    const rawTxData: any[] = [];

    for (const normalized of parsed.normalized) {
      const hash = csvParserService.generateHash(normalized, uploadedFile.accountId || '');

      // Check for duplicates against existing finalized transactions
      const existingTx = await db().bookkeepingTransaction.findFirst({
        where: { tenantId, hash },
      });

      // Also check for duplicates within this session
      const existingRaw = await prisma.rawTransaction.findFirst({
        where: { tenantId, hash, sessionId },
      });

      const isDuplicate = Boolean(existingTx || existingRaw);
      if (isDuplicate) duplicateCount++;

      rawTxData.push({
        tenantId,
        sessionId,
        uploadedFileId: uploadedFile.id,
        originalRow: normalized.originalRow,
        normalizedData: {
          date: normalized.date,
          description: normalized.description,
          amount: normalized.amount,
          type: normalized.type,
          currency: normalized.currency,
          reference: normalized.reference,
          balance: normalized.balance,
          merchant: normalized.merchant,
          accountType: normalized.accountType,
          accountNumber: normalized.accountNumber,
        },
        hash,
        isDuplicate,
        duplicateOfId: existingTx?.id || undefined,
        status: isDuplicate ? 'SKIPPED' : 'PENDING',
      });
    }

    // Bulk create raw transactions
    await prisma.rawTransaction.createMany({ data: rawTxData });

    // Update file with duplicate count
    await prisma.uploadedFile.update({
      where: { id: uploadedFile.id },
      data: { duplicateCount },
    });

    // Update session totals
    await prisma.importSession.update({
      where: { id: sessionId },
      data: {
        totalRawTx: { increment: rawTxData.length },
        totalDupes: { increment: duplicateCount },
      },
    });

    return {
      uploadedFile,
      totalRows: parsed.normalized.length,
      duplicates: duplicateCount,
      provider: parsed.provider,
    };
  }

  // ─── Finalization ───────────────────────────────────────────────────

  async finalizeSession(sessionId: string, tenantId: string, actorUserId?: string): Promise<FinalizeResult> {
    const session = await prisma.importSession.findFirst({ where: { id: sessionId, tenantId } });
    if (!session) throw new Error('Import session not found');
    if (session.status === 'FINALIZED') throw new Error('Session already finalized');
    if (session.status === 'CANCELLED') throw new Error('Cannot finalize a cancelled session');

    // Ensure bookkeeping is set up
    await bookkeepingService.setupIfEmpty(tenantId);

    let totalCreated = 0;
    let totalSkipped = 0;
    let totalTransfers = 0;
    let journalEntriesCreated = 0;

    // Get all non-skipped, non-duplicate raw transactions
    const rawTxs = await prisma.rawTransaction.findMany({
      where: {
        sessionId,
        tenantId,
        isDuplicate: false,
        status: { in: ['CATEGORIZED', 'MATCHED', 'NEEDS_REVIEW', 'PENDING'] },
      },
      include: { uploadedFile: { select: { accountId: true } } },
    });

    // Process matched transfer pairs
    const processedIds = new Set<string>();

    for (const rawTx of rawTxs) {
      if (processedIds.has(rawTx.id)) continue;

      const normalized = rawTx.normalizedData as any;
      const accountId = rawTx.uploadedFile?.accountId;

      // Handle matched transfers as pairs
      if (rawTx.isTransfer && rawTx.matchedRawTxId) {
        const matched = rawTxs.find((r: any) => r.id === rawTx.matchedRawTxId);
        if (matched && !processedIds.has(matched.id)) {
          const matchedNorm = matched.normalizedData as any;
          const matchedAccountId = matched.uploadedFile?.accountId;

          if (accountId && matchedAccountId && accountId !== matchedAccountId) {
            // Determine which is the source (debit) and destination (credit)
            const isSource = normalized.type === 'DEBIT';
            const fromAccountId = isSource ? accountId : matchedAccountId;
            const toAccountId = isSource ? matchedAccountId : accountId;
            const amount = normalized.amount;

            try {
              await bookkeepingService.createTransfer(tenantId, {
                fromAccountId,
                toAccountId,
                amount,
                currency: normalized.currency || 'CAD',
                transferDate: normalized.date,
                reference: normalized.reference,
                notes: `Auto-matched transfer: ${normalized.description}`,
              }, actorUserId);

              totalTransfers++;
              processedIds.add(rawTx.id);
              processedIds.add(matched.id);

              // Mark both as finalized
              await prisma.rawTransaction.updateMany({
                where: { id: { in: [rawTx.id, matched.id] } },
                data: { status: 'FINALIZED' },
              });

              continue;
            } catch (err) {
              console.error('Failed to create transfer:', err);
              // Fall through to create as regular transactions
            }
          }
        }
      }

      // Create regular transaction
      if (!accountId) {
        totalSkipped++;
        await prisma.rawTransaction.update({ where: { id: rawTx.id }, data: { status: 'SKIPPED' } });
        continue;
      }

      try {
        // Resolve or create category
        let categoryId: string | undefined;
        const categoryName = (rawTx.manualOverrides as any)?.category || rawTx.aiCategory;
        if (categoryName && categoryName !== 'Uncategorized' && categoryName !== 'Internal Transfer') {
          const txType = rawTx.aiTransactionType === 'INCOME' ? 'INCOME' : 'EXPENSE';
          let category = await db().bookkeepingCategory.findFirst({
            where: { tenantId, name: categoryName },
          });
          if (!category) {
            category = await db().bookkeepingCategory.create({
              data: { tenantId, name: categoryName, type: txType, isSystem: false },
            });
          }
          categoryId = category.id;
        }

        // Resolve or create vendor
        let vendorId: string | undefined;
        const vendorName = (rawTx.manualOverrides as any)?.vendor || rawTx.aiVendor;
        if (vendorName && vendorName !== 'Unknown' && vendorName !== 'Internal') {
          let vendor = await db().bookkeepingVendor.findFirst({
            where: { tenantId, name: vendorName },
          });
          if (!vendor) {
            vendor = await db().bookkeepingVendor.create({
              data: { tenantId, name: vendorName, isActive: true },
            });
          }
          vendorId = vendor.id;
        }

        // Determine transaction type
        const transactionType = (rawTx.manualOverrides as any)?.transactionType ||
          rawTx.aiTransactionType ||
          (normalized.type === 'DEBIT' ? 'EXPENSE' : 'INCOME');

        // Create the real transaction
        const tx = await bookkeepingService.createTransaction(tenantId, {
          accountId,
          categoryId,
          vendorId,
          type: transactionType,
          description: normalized.description,
          amount: normalized.amount,
          currency: normalized.currency || 'CAD',
          transactionDate: normalized.date,
          reference: normalized.reference,
          status: 'POSTED',
          sourceType: 'CSV_IMPORT',
          sourceId: rawTx.id,
          hash: rawTx.hash,
          confidenceScore: rawTx.aiConfidence,
          isTransfer: rawTx.isTransfer,
          importSessionId: sessionId,
          uploadedFileId: rawTx.uploadedFileId,
          rawTransactionId: rawTx.id,
          skipSourceIdempotency: true,
        }, actorUserId);

        // Link raw transaction to created transaction
        await prisma.rawTransaction.update({
          where: { id: rawTx.id },
          data: { status: 'FINALIZED', transactionId: tx.id },
        });

        totalCreated++;
        processedIds.add(rawTx.id);
      } catch (err: any) {
        console.error(`Failed to create transaction for raw tx ${rawTx.id}:`, err);
        totalSkipped++;
        await prisma.rawTransaction.update({
          where: { id: rawTx.id },
          data: { status: 'SKIPPED' },
        });
      }
    }

    // Update session
    await prisma.importSession.update({
      where: { id: sessionId },
      data: {
        status: 'FINALIZED',
        completedAt: new Date(),
        totalCreated,
        totalSkipped,
      },
    });

    await bookkeepingAuditService.log({
      tenantId,
      entityType: 'IMPORT_SESSION',
      entityId: sessionId,
      action: 'FINALIZE',
      afterValue: { totalCreated, totalSkipped, totalTransfers, journalEntriesCreated },
      userId: actorUserId,
    });

    return { totalCreated, totalSkipped, totalTransfers, journalEntriesCreated };
  }

  // ─── Raw Transaction Queries ────────────────────────────────────────

  async listRawTransactions(sessionId: string, tenantId: string, query: {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  } = {}) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 200);
    const skip = (page - 1) * limit;

    const where: any = { sessionId, tenantId };
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      prisma.rawTransaction.findMany({
        where,
        include: { uploadedFile: { select: { fileName: true, accountId: true, provider: true } } },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.rawTransaction.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
    };
  }

  async updateRawTransaction(rawTxId: string, tenantId: string, updates: {
    category?: string;
    vendor?: string;
    transactionType?: string;
    isTransfer?: boolean;
    status?: string;
  }) {
    const rawTx = await prisma.rawTransaction.findFirst({ where: { id: rawTxId, tenantId } });
    if (!rawTx) throw new Error('Raw transaction not found');
    if (rawTx.status === 'FINALIZED') throw new Error('Cannot update a finalized transaction');

    const manualOverrides = { ...(rawTx.manualOverrides as any || {}), ...updates };
    const updateData: any = { manualOverrides };

    if (updates.isTransfer !== undefined) updateData.isTransfer = updates.isTransfer;
    if (updates.status) updateData.status = updates.status;

    // If user manually categorizes, mark as CATEGORIZED
    if (updates.category || updates.vendor || updates.transactionType) {
      if (!['MATCHED', 'FINALIZED', 'SKIPPED'].includes(rawTx.status)) {
        updateData.status = 'CATEGORIZED';
      }
    }

    await bookkeepingAuditService.log({
      tenantId,
      entityType: 'RAW_TRANSACTION',
      entityId: rawTxId,
      action: 'MANUAL_OVERRIDE',
      beforeValue: rawTx.manualOverrides,
      afterValue: manualOverrides,
    });

    return prisma.rawTransaction.update({ where: { id: rawTxId }, data: updateData });
  }

  async getReviewQueue(sessionId: string, tenantId: string, query: { page?: number; limit?: number } = {}) {
    return this.listRawTransactions(sessionId, tenantId, { ...query, status: 'NEEDS_REVIEW' });
  }

  async getDuplicates(sessionId: string, tenantId: string, query: { page?: number; limit?: number } = {}) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 200);
    const skip = (page - 1) * limit;

    const where = { sessionId, tenantId, isDuplicate: true };
    const [data, total] = await Promise.all([
      prisma.rawTransaction.findMany({
        where,
        include: { uploadedFile: { select: { fileName: true } } },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.rawTransaction.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
    };
  }

  async getMatches(sessionId: string, tenantId: string) {
    const matched = await prisma.rawTransaction.findMany({
      where: { sessionId, tenantId, isTransfer: true },
      include: { uploadedFile: { select: { fileName: true, accountId: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Group into pairs
    const pairs: any[] = [];
    const seen = new Set<string>();
    for (const tx of matched) {
      if (seen.has(tx.id)) continue;
      seen.add(tx.id);
      if (tx.matchedRawTxId) {
        const partner = matched.find((m: any) => m.id === tx.matchedRawTxId);
        if (partner) {
          seen.add(partner.id);
          pairs.push({ tx1: tx, tx2: partner, status: tx.status });
        } else {
          pairs.push({ tx1: tx, tx2: null, status: 'PENDING_MATCH' });
        }
      } else {
        pairs.push({ tx1: tx, tx2: null, status: 'PENDING_MATCH' });
      }
    }

    return { pairs, totalMatched: pairs.filter(p => p.tx2).length, totalPending: pairs.filter(p => !p.tx2).length };
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  private buildAccountName(normalized: any, provider: string, fileName: string): string {
    const parts: string[] = [];

    if (provider === 'CREDIT_CARD') {
      const type = normalized.accountType || 'Credit Card';
      const last4 = normalized.accountNumber;
      parts.push(type);
      if (last4) parts.push(`*${last4}`);
    } else {
      const baseName = fileName.replace(/\.(csv|CSV)$/, '').replace(/[_-]/g, ' ').trim();
      if (baseName.length > 3 && baseName.length < 50) {
        parts.push(baseName);
      } else {
        parts.push('Bank Account');
        if (normalized.accountNumber) parts.push(`*${normalized.accountNumber}`);
      }
    }

    return parts.join(' ') || 'Imported Account';
  }
}

export const importSessionService = new ImportSessionService();
