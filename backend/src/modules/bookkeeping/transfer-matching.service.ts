import { prisma } from '../../config/database';

interface ScoredMatch {
  rawTxId: string;
  matchedRawTxId: string;
  score: number;
  classification: 'MATCHED' | 'POSSIBLE_MATCH' | 'UNMATCHED';
  reason: string;
}

export interface MatchResult {
  totalMatched: number;
  totalPossible: number;
  totalUnmatched: number;
  matches: ScoredMatch[];
}

const CREDIT_CARD_PAYMENT_PATTERNS = /payment.*(?:credit|card|visa|master|amex)|credit card payment|card payment|repayment/i;
const INTERNAL_TRANSFER_PATTERNS = /transfer|tfr|xfer|e-?transfer|internal|moving funds|own account/i;

class TransferMatchingService {

  async matchSession(sessionId: string, tenantId: string): Promise<MatchResult> {
    const rawTxs = await prisma.rawTransaction.findMany({
      where: { sessionId, tenantId, status: { in: ['PENDING', 'CATEGORIZED'] }, isDuplicate: false },
    });

    // Also fetch existing unmatched transactions from previous sessions
    const existingUnmatched = await prisma.bookkeepingTransaction.findMany({
      where: { tenantId, isTransfer: false, status: { in: ['POSTED', 'PENDING'] } },
      take: 500,
      orderBy: { transactionDate: 'desc' },
    });

    const matches: ScoredMatch[] = [];
    const matched = new Set<string>();

    // First pass: match raw transactions within the same session
    for (let i = 0; i < rawTxs.length; i++) {
      if (matched.has(rawTxs[i].id)) continue;
      const tx1 = rawTxs[i];
      const norm1 = tx1.normalizedData as any;

      for (let j = i + 1; j < rawTxs.length; j++) {
        if (matched.has(rawTxs[j].id)) continue;
        const tx2 = rawTxs[j];
        const norm2 = tx2.normalizedData as any;

        const score = this.scoreMatch(norm1, norm2, tx1.uploadedFileId, tx2.uploadedFileId);
        if (score >= 50) {
          const classification = score >= 80 ? 'MATCHED' : 'POSSIBLE_MATCH';
          matches.push({
            rawTxId: tx1.id,
            matchedRawTxId: tx2.id,
            score,
            classification,
            reason: this.matchReason(norm1, norm2, score),
          });

          if (classification === 'MATCHED') {
            matched.add(tx1.id);
            matched.add(tx2.id);
            // Auto-mark as matched
            await this.applyMatch(tx1.id, tx2.id);
          }
        }
      }
    }

    // Second pass: check AI-flagged possible transfers
    for (const tx of rawTxs) {
      if (matched.has(tx.id)) continue;
      if (tx.aiPossibleTransfer || this.looksLikeTransfer(tx.normalizedData as any)) {
        // Mark as pending match even if no counterpart found yet
        await prisma.rawTransaction.update({
          where: { id: tx.id },
          data: { status: 'PENDING', isTransfer: true },
        });
      }
    }

    return {
      totalMatched: matches.filter(m => m.classification === 'MATCHED').length,
      totalPossible: matches.filter(m => m.classification === 'POSSIBLE_MATCH').length,
      totalUnmatched: rawTxs.length - matched.size,
      matches,
    };
  }

  private scoreMatch(tx1: any, tx2: any, fileId1: string, fileId2: string): number {
    let score = 0;

    // Must be from different files/accounts to be a transfer
    if (fileId1 === fileId2) return 0;

    // Amount match (one should be negative/debit, other positive/credit)
    const amount1 = tx1.type === 'DEBIT' ? -tx1.amount : tx1.amount;
    const amount2 = tx2.type === 'DEBIT' ? -tx2.amount : tx2.amount;
    const amountDiff = Math.abs(amount1 + amount2);

    if (amountDiff < 0.01) score += 40;
    else if (amountDiff < 1.00) score += 20;
    else if (amountDiff < 5.00) score += 5;
    else return 0; // Amounts don't match at all

    // Date proximity
    const date1 = new Date(tx1.date);
    const date2 = new Date(tx2.date);
    const daysDiff = Math.abs((date1.getTime() - date2.getTime()) / 86400000);
    if (daysDiff === 0) score += 25;
    else if (daysDiff <= 2) score += 20;
    else if (daysDiff <= 5) score += 15;
    else if (daysDiff <= 7) score += 10;
    else if (daysDiff <= 14) score += 3;
    else score -= 10;

    // One must be debit, other credit (for transfer)
    if (tx1.type !== tx2.type) score += 15;

    // Description similarity
    const sim = this.descriptionSimilarity(tx1.description, tx2.description);
    if (sim > 0.7) score += 10;
    else if (sim > 0.4) score += 5;

    // Check if either looks like a transfer/payment
    if (this.looksLikeTransfer(tx1) || this.looksLikeTransfer(tx2)) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  private matchReason(tx1: any, tx2: any, score: number): string {
    const parts: string[] = [];
    if (Math.abs(tx1.amount - tx2.amount) < 0.01) parts.push('exact amount match');
    const daysDiff = Math.abs((new Date(tx1.date).getTime() - new Date(tx2.date).getTime()) / 86400000);
    if (daysDiff <= 2) parts.push(`${daysDiff}d apart`);
    if (this.looksLikeTransfer(tx1)) parts.push('transfer pattern in description');
    if (tx1.type !== tx2.type) parts.push('opposite debit/credit');
    return parts.join(', ') || `Score: ${score}`;
  }

  looksLikeTransfer(normalized: any): boolean {
    const desc = (normalized.description || '').toString();
    return CREDIT_CARD_PAYMENT_PATTERNS.test(desc) || INTERNAL_TRANSFER_PATTERNS.test(desc);
  }

  isCreditCardRepayment(normalized: any, accountSubtype?: string): boolean {
    const desc = (normalized.description || '').toString();
    if (accountSubtype === 'CREDIT_CARD' && normalized.type === 'CREDIT') {
      return CREDIT_CARD_PAYMENT_PATTERNS.test(desc) || /payment|pay/i.test(desc);
    }
    if (accountSubtype !== 'CREDIT_CARD') {
      return CREDIT_CARD_PAYMENT_PATTERNS.test(desc) && normalized.type === 'DEBIT';
    }
    return false;
  }

  private async applyMatch(rawTxId1: string, rawTxId2: string): Promise<void> {
    await prisma.$transaction([
      prisma.rawTransaction.update({
        where: { id: rawTxId1 },
        data: { status: 'MATCHED', isTransfer: true, matchedRawTxId: rawTxId2 },
      }),
      prisma.rawTransaction.update({
        where: { id: rawTxId2 },
        data: { status: 'MATCHED', isTransfer: true, matchedRawTxId: rawTxId1 },
      }),
    ]);
  }

  async confirmMatch(rawTxId: string, matchedRawTxId: string, tenantId: string): Promise<void> {
    const [tx1, tx2] = await Promise.all([
      prisma.rawTransaction.findFirst({ where: { id: rawTxId, tenantId } }),
      prisma.rawTransaction.findFirst({ where: { id: matchedRawTxId, tenantId } }),
    ]);
    if (!tx1 || !tx2) throw new Error('Raw transaction not found');
    await this.applyMatch(rawTxId, matchedRawTxId);
  }

  async rejectMatch(rawTxId: string, tenantId: string): Promise<void> {
    const tx = await prisma.rawTransaction.findFirst({ where: { id: rawTxId, tenantId } });
    if (!tx) throw new Error('Raw transaction not found');
    const updateData: any = { matchedRawTxId: null, isTransfer: false };
    if (tx.status === 'MATCHED') updateData.status = tx.aiConfidence && tx.aiConfidence >= 0.85 ? 'CATEGORIZED' : 'NEEDS_REVIEW';
    await prisma.rawTransaction.update({ where: { id: rawTxId }, data: updateData });
    // Also un-match the counterpart if it was matched to this
    if (tx.matchedRawTxId) {
      const other = await prisma.rawTransaction.findFirst({ where: { id: tx.matchedRawTxId, tenantId } });
      if (other && other.matchedRawTxId === rawTxId) {
        await prisma.rawTransaction.update({
          where: { id: other.id },
          data: { matchedRawTxId: null, isTransfer: false, status: other.aiConfidence && other.aiConfidence >= 0.85 ? 'CATEGORIZED' : 'NEEDS_REVIEW' },
        });
      }
    }
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
}

export const transferMatchingService = new TransferMatchingService();
