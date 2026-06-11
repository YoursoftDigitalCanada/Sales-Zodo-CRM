import { prisma } from '../../../config/database';

interface ScoredMatch {
  rawTxId: string;
  matchedRawTxId: string;
  score: number;
  transferType: string;
  classification: 'MATCHED' | 'POSSIBLE_MATCH' | 'UNMATCHED';
  reason: string;
}

export interface MatchResult {
  totalMatched: number;
  totalPossible: number;
  totalUnmatched: number;
  matches: ScoredMatch[];
}

const TRANSFER_TYPES = [
  { type: 'STRIPE_PAYOUT', pattern: /stripe payout|stripe settlement/i },
  { type: 'PAYPAL_SETTLEMENT', pattern: /paypal settlement|pp settlement/i },
  { type: 'PAYROLL', pattern: /payroll|adp|paychex|ceridian|wage|salary/i },
  { type: 'TAX_PAYMENT', pattern: /cra|irs|revenue agency|tax payment|gst payment/i },
  { type: 'LOAN_PAYMENT', pattern: /loan|mortgage|line of credit/i },
  { type: 'OWNER_DRAW', pattern: /owner draw|draws|distribution|dividend/i },
  { type: 'OWNER_CONTRIBUTION', pattern: /owner contribution|capital|shareholder/i },
  { type: 'CREDIT_CARD_PAYMENT', pattern: /payment.*(?:credit|card|visa|master|amex)|credit card payment|card payment|repayment/i },
  { type: 'BANK_TRANSFER', pattern: /transfer|tfr|xfer|e-?transfer|internal|moving funds|own account/i },
  { type: 'CASHBACK', pattern: /cashback|cash back|reward/i },
  { type: 'REFUND', pattern: /refund|return|credit/i }
];

class TransferMatchingService {
  async matchSession(sessionId: string, tenantId: string): Promise<MatchResult> {
    const rawTxs = await prisma.rawTransaction.findMany({
      where: { sessionId, tenantId, duplicateScore: { lt: 95 }, status: { notIn: ['MATCHED', 'NEEDS_REVIEW'] } },
    });

    const matches: ScoredMatch[] = [];

    // Pass 1: Cross-match raw transactions using ±7 day window and partial matching
    for (let i = 0; i < rawTxs.length; i++) {
      const tx1 = rawTxs[i];
      const norm1 = tx1.normalizedData as any;

      for (let j = i + 1; j < rawTxs.length; j++) {
        const tx2 = rawTxs[j];
        const norm2 = tx2.normalizedData as any;

        const score = this.scoreMatch(norm1, norm2, tx1.uploadedFileId, tx2.uploadedFileId);
        if (score >= 60) {
          const classification = score >= 90 ? 'MATCHED' : 'POSSIBLE_MATCH';
          const tType = this.detectTransferType(norm1) || this.detectTransferType(norm2) || 'BANK_TRANSFER';
          matches.push({
            rawTxId: tx1.id,
            matchedRawTxId: tx2.id,
            score,
            transferType: tType,
            classification,
            reason: this.matchReason(norm1, norm2, score),
          });

          if (classification === 'MATCHED') {
            await this.applyMatch(tx1.id, tx2.id, tType, score, 'AUTO');
          } else if (score >= 70 && score < 90) {
            // Send to review queue instead of auto-matching
            await prisma.rawTransaction.update({
              where: { id: tx1.id },
              data: { status: 'NEEDS_REVIEW', transferScore: score, transferType: tType, matchedRawTxId: tx2.id }
            });
            await prisma.rawTransaction.update({
              where: { id: tx2.id },
              data: { status: 'NEEDS_REVIEW', transferScore: score, transferType: tType, matchedRawTxId: tx1.id }
            });
          }
        }
      }
    }

    // Pass 2: Detect isolated transfers (e.g., Stripe Payout, Tax Payment, Owner Draw)
    for (const tx of rawTxs) {
      const tType = this.detectTransferType(tx.normalizedData as any);
      if (tType) {
        await prisma.rawTransaction.update({
          where: { id: tx.id },
          data: { transferType: tType, transferScore: 80, status: 'PENDING' },
        });
      }
    }

    return {
      totalMatched: matches.filter(m => m.classification === 'MATCHED').length,
      totalPossible: matches.filter(m => m.classification === 'POSSIBLE_MATCH').length,
      totalUnmatched: rawTxs.length, // Unmatched is calculated by UI now since they are many-to-many
      matches,
    };
  }

  private scoreMatch(tx1: any, tx2: any, fileId1: string, fileId2: string): number {
    let score = 0;
    if (fileId1 === fileId2) return 0; // Same bank account/file usually means not a transfer

    const amount1 = tx1.type === 'DEBIT' ? -tx1.amount : tx1.amount;
    const amount2 = tx2.type === 'DEBIT' ? -tx2.amount : tx2.amount;
    const amountDiff = Math.abs(amount1 + amount2);

    // ±7 day matching window
    const date1 = new Date(tx1.date);
    const date2 = new Date(tx2.date);
    const daysDiff = Math.abs((date1.getTime() - date2.getTime()) / 86400000);
    if (daysDiff > 7) return 0; // Hard cutoff for > 7 days

    if (daysDiff === 0) score += 40;
    else if (daysDiff <= 3) score += 25;
    else if (daysDiff <= 7) score += 10;

    if (amountDiff < 0.01) score += 40; // Exact match
    else if (amountDiff < 100.00) score += 10; // Partial payment potential
    else score += 0; 

    if (tx1.type !== tx2.type) score += 10; // Must be opposite directions

    const sim = this.descriptionSimilarity(tx1.description, tx2.description);
    if (sim > 0.7) score += 10;

    if (this.detectTransferType(tx1) || this.detectTransferType(tx2)) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  private matchReason(tx1: any, tx2: any, score: number): string {
    const parts: string[] = [];
    if (Math.abs(tx1.amount - tx2.amount) < 0.01) parts.push('exact amount match');
    const daysDiff = Math.abs((new Date(tx1.date).getTime() - new Date(tx2.date).getTime()) / 86400000);
    if (daysDiff <= 7) parts.push(`${Math.round(daysDiff)}d apart`);
    if (tx1.type !== tx2.type) parts.push('opposite debit/credit');
    return parts.join(', ') || `Score: ${score}`;
  }

  detectTransferType(normalized: any): string | null {
    const desc = (normalized.description || '').toString();
    for (const t of TRANSFER_TYPES) {
      if (t.pattern.test(desc)) return t.type;
    }
    return null;
  }

  async applyMatch(rawTxId1: string, rawTxId2: string, transferType: string, score: number, matchType: 'AUTO' | 'MANUAL' | 'AI' = 'AUTO'): Promise<void> {
    const tx1 = await prisma.rawTransaction.findUnique({ where: { id: rawTxId1 } });
    const tx2 = await prisma.rawTransaction.findUnique({ where: { id: rawTxId2 } });
    if (!tx1 || !tx2) return;

    // Use TransferMatch many-to-many model natively
    // We get the BookkeepingTransaction if it exists, otherwise we wait for posting
    const bt1 = await prisma.bookkeepingTransaction.findFirst({ where: { rawTransactionId: rawTxId1 } });
    const bt2 = await prisma.bookkeepingTransaction.findFirst({ where: { rawTransactionId: rawTxId2 } });

    if (bt1 && bt2) {
      const minAmount = Math.min(Number(bt1.amount), Number(bt2.amount));
      
      // Update match status for partial matches
      const updateMatchStatus = async (bt: any, matchedAmt: number) => {
        const totalMatches = await prisma.transferMatch.aggregate({
          where: { OR: [{ sourceTransactionId: bt.id }, { destinationTransactionId: bt.id }] },
          _sum: { matchedAmount: true }
        });
        const currentlyMatched = Number(totalMatches._sum.matchedAmount || 0) + matchedAmt;
        const status = Math.abs(Number(bt.amount) - currentlyMatched) < 0.01 ? 'FULLY_MATCHED' : 'PARTIALLY_MATCHED';
        await prisma.bookkeepingTransaction.update({
          where: { id: bt.id },
          data: { matchStatus: status }
        });
      };

      await prisma.$transaction([
        prisma.transferMatch.create({
          data: {
            tenantId: bt1.tenantId,
            sourceTransactionId: bt1.id,
            destinationTransactionId: bt2.id,
            matchedAmount: minAmount,
            confidence: score,
            matchType
          }
        }),
      ]);

      await updateMatchStatus(bt1, minAmount);
      await updateMatchStatus(bt2, minAmount);
    }

    // Legacy update to RawTransaction for compatibility
    await prisma.$transaction([
      prisma.rawTransaction.update({
        where: { id: rawTxId1 },
        data: { status: 'MATCHED', transferType, transferScore: score, matchedRawTxId: rawTxId2 },
      }),
      prisma.rawTransaction.update({
        where: { id: rawTxId2 },
        data: { status: 'MATCHED', transferType, transferScore: score, matchedRawTxId: rawTxId1 },
      }),
    ]);
  }

  private descriptionSimilarity(a: string, b: string): number {
    const cleanA = (a || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const cleanB = (b || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    if (cleanA === cleanB) return 1;
    if (!cleanA || !cleanB) return 0;
    const wordsA = new Set(cleanA.split(/\s+/));
    const wordsB = new Set(cleanB.split(/\s+/));
    const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    return union > 0 ? intersection / union : 0;
  }

  async confirmMatch(rawTxId: string, matchedRawTxId: string, tenantId: string): Promise<void> {
    await this.applyMatch(rawTxId, matchedRawTxId, 'BANK_TRANSFER', 100, 'MANUAL');
  }

  async rejectMatch(rawTxId: string, tenantId: string): Promise<void> {
    const tx = await prisma.rawTransaction.findFirst({ where: { id: rawTxId, tenantId } });
    if (!tx) throw new Error('Raw transaction not found');
    const updateData: any = { matchedRawTxId: null, transferType: null, transferScore: 0 };
    if (tx.status === 'MATCHED' || tx.status === 'NEEDS_REVIEW') updateData.status = 'PENDING';
    await prisma.rawTransaction.update({ where: { id: rawTxId }, data: updateData });
    
    if (tx.matchedRawTxId) {
      const other = await prisma.rawTransaction.findFirst({ where: { id: tx.matchedRawTxId, tenantId } });
      if (other && other.matchedRawTxId === rawTxId) {
        await prisma.rawTransaction.update({
          where: { id: other.id },
          data: { matchedRawTxId: null, transferType: null, transferScore: 0, status: 'PENDING' },
        });
      }
    }
  }
}

export const transferMatchingService = new TransferMatchingService();
