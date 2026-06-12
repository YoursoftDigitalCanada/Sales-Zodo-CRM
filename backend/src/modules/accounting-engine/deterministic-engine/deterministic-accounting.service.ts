import { prisma } from '../../../config/database';
import { aiCategorizationService } from '../ai-brain/ai-categorization.service';
import { bookkeepingService } from '../ledger/bookkeeping.service';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

class DeterministicAccountingEngine {
  
  /**
   * Safety Layer: Validates the AI suggested journal before allowing it to post
   */
  public async validateJournal(tenantId: string, aiJournal: any[]): Promise<ValidationResult> {
    if (!aiJournal || !Array.isArray(aiJournal) || aiJournal.length < 2) {
      return { isValid: false, errors: ['Journal must contain at least two lines'] };
    }

    let totalDebits = 0;
    let totalCredits = 0;
    const errors: string[] = [];

    // 1. Double Entry Validation (Debits == Credits)
    for (const line of aiJournal) {
      totalDebits += Number(line.debit) || 0;
      totalCredits += Number(line.credit) || 0;
    }

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      errors.push(`Double entry unbalanced: Debits (${totalDebits}) != Credits (${totalCredits})`);
    }

    // 2. Chart of Accounts Validation
    // Check if the suggested accounts actually exist or can be cleanly resolved
    for (const line of aiJournal) {
      if (!line.account) {
        errors.push('Missing account name in journal line');
        continue;
      }
      
      const accountExists = await prisma.bookkeepingAccount.findFirst({
        where: { tenantId, name: { contains: line.account, mode: 'insensitive' } }
      });
      
      // If we don't have a direct account match, we can either create it (if allowed) or flag for review.
      // We will flag it for review to ensure strict chart of accounts control.
      if (!accountExists) {
        // As a fallback check if it maps to a category
        const categoryExists = await prisma.bookkeepingCategory.findFirst({
          where: { tenantId, name: { contains: line.account, mode: 'insensitive' } }
        });
        
        if (!categoryExists && line.account !== 'Checking/Clearing') {
          errors.push(`Account/Category "${line.account}" not found in Chart of Accounts`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Finalizes a raw transaction by running it through the safety layer
   * Returns true if it successfully posted to the ledger, false if it was sent to review
   */
  public async processAndPost(rawTxId: string, tenantId: string, actorUserId?: string): Promise<boolean> {
    const rawTx = await prisma.rawTransaction.findFirst({
      where: { id: rawTxId, tenantId },
      include: { uploadedFile: { select: { accountId: true, provider: true } } },
    });
    if (!rawTx) throw new Error('Transaction not found');

    if (rawTx.status === 'FINALIZED' && rawTx.transactionId) return true;

    const overrides = (rawTx.manualOverrides as Record<string, any>) || {};
    const hasManualReview = Boolean(overrides.category || overrides.vendor || overrides.transactionType);

    if ((rawTx.requiresReview && !hasManualReview) || rawTx.duplicateScore >= 95) {
      // Sent explicitly to review or is a strict duplicate
      await prisma.rawTransaction.update({
        where: { id: rawTxId },
        data: { status: 'NEEDS_REVIEW' }
      });
      return false;
    }

    const norm = rawTx.normalizedData as any;
    let txType = String(overrides.transactionType || rawTx.aiTransactionType || (norm.type === 'CREDIT' ? 'INCOME' : 'EXPENSE')).toUpperCase();
    if (rawTx.transferType) {
      if (['STRIPE_PAYOUT', 'PAYPAL_SETTLEMENT', 'BANK_TRANSFER'].includes(rawTx.transferType)) {
        txType = 'TRANSFER';
      } else {
        txType = rawTx.transferType; // CASHBACK, REFUND, OWNER_DRAW, PAYROLL, etc.
      }
    }

    const categoryType = txType === 'INCOME' || txType === 'REFUND' ? 'INCOME' : 'EXPENSE';
    const requestedCategory = String(overrides.category || rawTx.aiCategory || '').trim();
    const categoryName = requestedCategory && requestedCategory.toLowerCase() !== 'uncategorized'
      ? requestedCategory
      : `Uncategorized ${categoryType === 'INCOME' ? 'Income' : 'Expense'}`;
    let category = await prisma.bookkeepingCategory.findFirst({
      where: { tenantId, name: { equals: categoryName, mode: 'insensitive' }, type: categoryType },
    });
    if (!category) {
      category = await prisma.bookkeepingCategory.create({
        data: { tenantId, name: categoryName, type: categoryType, isSystem: false, isActive: true },
      });
    }

    const vendorName = String(overrides.vendor || rawTx.aiVendor || '').trim();
    let vendor = null;
    if (vendorName && !['unknown', 'n/a', 'none'].includes(vendorName.toLowerCase())) {
      vendor = await prisma.bookkeepingVendor.findFirst({
        where: { tenantId, name: { equals: vendorName, mode: 'insensitive' } },
      });
      if (!vendor) {
        vendor = await prisma.bookkeepingVendor.create({
          data: { tenantId, name: vendorName, isActive: true },
        });
      }
    }

    const accountId = rawTx.uploadedFile?.accountId || null;
    if (!accountId) {
      await prisma.rawTransaction.update({
        where: { id: rawTxId },
        data: { status: 'NEEDS_REVIEW', requiresReview: true, validationStatus: ['Statement account is missing'] },
      });
      return false;
    }

    const aiJournal = Array.isArray(rawTx.aiJournal) && (rawTx.aiJournal as any[]).length >= 2
      ? rawTx.aiJournal as any[]
      : aiCategorizationService.generateSimpleJournal(categoryName, Math.abs(Number(norm.amount)), norm.type);
    const validation = await this.validateJournal(tenantId, aiJournal);
    if (!validation.isValid) {
      await prisma.rawTransaction.update({
        where: { id: rawTxId },
        data: {
          status: 'NEEDS_REVIEW',
          validationStatus: validation.errors,
          requiresReview: true,
        },
      });
      return false;
    }

    const bkTx = await bookkeepingService.createTransaction(tenantId, {
      accountId,
      categoryId: category.id,
      vendorId: vendor?.id || null,
      transactionDate: norm.date,
      amount: Math.abs(Number(norm.amount)),
      type: txType,
      currency: norm.currency || 'CAD',
      description: norm.description,
      reference: norm.reference || null,
      status: 'POSTED',
      sourceType: 'CSV_IMPORT',
      sourceId: rawTxId,
      metadata: {
        syncStatus: 'synced',
        importSessionId: rawTx.sessionId,
        uploadedFileId: rawTx.uploadedFileId,
        rawTransactionId: rawTxId,
        provider: rawTx.uploadedFile?.provider || null,
        aiConfidence: rawTx.aiConfidence,
        aiReason: rawTx.aiReason,
        taxTreatment: rawTx.taxTreatment,
      },
    }, actorUserId);

    await prisma.$transaction([
      prisma.bookkeepingTransaction.update({
        where: { id: bkTx.id },
        data: {
          hash: rawTx.hash,
          confidenceScore: rawTx.aiConfidence,
          importSessionId: rawTx.sessionId,
          uploadedFileId: rawTx.uploadedFileId,
          rawTransactionId: rawTxId,
          isTransfer: rawTx.transferScore >= 80,
        },
      }),
      prisma.rawTransaction.update({
        where: { id: rawTxId },
        data: {
          status: 'FINALIZED',
          transactionId: bkTx.id,
          requiresReview: false,
          validationStatus: { passed: true },
        },
      }),
    ]);

    return true;
  }
}

export const deterministicAccountingEngine = new DeterministicAccountingEngine();
