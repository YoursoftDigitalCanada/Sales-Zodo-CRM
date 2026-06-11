import { config } from '../../../config';
import { prisma } from '../../../config/database';
import { AI_CONFIDENCE_THRESHOLD_AUTO, AI_CONFIDENCE_THRESHOLD_REVIEW } from '../api/bookkeeping.dto';
import { merchantIntelligenceService } from '../merchant-intelligence/merchant.service';

export interface AiJournalEntry {
  account: string;
  debit: number;
  credit: number;
}

export interface AiCategorizationResult {
  transactionType: string;
  merchant: string;
  category: string;
  vendor: string;
  confidence: number;
  taxTreatment: string;
  journal: AiJournalEntry[];
  reason: string;
  requiresReview: boolean;
  version: number;
  possibleTransfer: boolean; // Legacy mapped to transferScore downstream
}

interface NormalizedData {
  date: string;
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  currency: string;
  merchant?: string;
}

class AiCategorizationService {
  async batchCategorize(tenantId: string, transactions: NormalizedData[]): Promise<AiCategorizationResult[]> {
    const finalResults: (AiCategorizationResult | null)[] = new Array(transactions.length).fill(null);

    // 1. Merchant & Historical Learning (Cost Optimization Bypass)
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      if (tx.merchant) {
        const { merchant } = await merchantIntelligenceService.resolveMerchant(tenantId, tx.merchant);
        
        // If merchant has high confidence and defaults, bypass AI
        if (merchant && merchant.confidence >= 0.9 && merchant.defaultCategoryId) {
          const category = await prisma.bookkeepingCategory.findFirst({ where: { id: merchant.defaultCategoryId } });
          const vendor = merchant.defaultVendorId ? await prisma.bookkeepingVendor.findFirst({ where: { id: merchant.defaultVendorId } }) : null;
          
          if (category) {
            finalResults[i] = {
              transactionType: tx.type === 'DEBIT' ? 'EXPENSE' : 'INCOME',
              merchant: merchant.canonicalName,
              category: category.name,
              vendor: vendor?.name || merchant.canonicalName,
              confidence: merchant.confidence,
              taxTreatment: merchant.defaultTaxRule || 'Exempt',
              journal: this.generateSimpleJournal(category.name, tx.amount, tx.type),
              reason: 'Merchant Intelligence Auto-Categorization',
              requiresReview: false,
              version: 1,
              possibleTransfer: false,
            };
            continue;
          }
        }
      }
    }

    // 2. Build Global Accounting Context
    const [categories, vendors, unmatchedTransfers] = await Promise.all([
      prisma.bookkeepingCategory.findMany({ where: { tenantId, isActive: true }, select: { name: true, type: true } }),
      prisma.bookkeepingVendor.findMany({ where: { tenantId, isActive: true }, select: { name: true } }),
      prisma.rawTransaction.findMany({ where: { tenantId, transferScore: { gte: 80 }, status: 'PENDING' }, select: { normalizedData: true } })
    ]);

    const categoryNames = categories.map((c: any) => `${c.name} (${c.type})`).join(', ');
    const vendorNames = vendors.map((v: any) => v.name).slice(0, 100).join(', ');

    // 3. OpenAI for Unknowns
    const apiKey = config.ai?.openaiApiKey;
    const unknownIndices = finalResults.map((res, i) => res === null ? i : -1).filter(i => i !== -1);

    if (apiKey && unknownIndices.length > 0) {
      try {
        const unknowns = unknownIndices.map(i => transactions[i]);
        const aiResults = await this.openAiCategorize(tenantId, unknowns, apiKey, categoryNames, vendorNames);
        unknownIndices.forEach((originalIndex, j) => {
          finalResults[originalIndex] = aiResults[j];
        });
      } catch (error) {
        console.error('OpenAI categorization failed:', error);
      }
    }

    // 4. Fallback for any remaining nulls
    for (let i = 0; i < transactions.length; i++) {
      if (!finalResults[i]) {
        finalResults[i] = this.fallbackCategorize(transactions[i]);
      }
    }

    return finalResults as AiCategorizationResult[];
  }

  private async openAiCategorize(tenantId: string, transactions: NormalizedData[], apiKey: string, categories: string, vendors: string): Promise<AiCategorizationResult[]> {
    const txList = transactions.map((tx, i) => 
      `${i + 1}. Date: ${tx.date}, Desc: "${tx.description}", Amount: ${tx.type === 'DEBIT' ? '-' : '+'}${tx.amount.toFixed(2)}, Curr: ${tx.currency}`
    ).join('\n');

    const systemPrompt = `You are the Autonomous AI Accounting Brain.
Analyze transactions in global context.
Return EXACTLY a JSON array of objects for each transaction.

Format:
[
  {
    "transactionType": "EXPENSE" | "INCOME" | "TRANSFER" | "REFUND" | "EQUITY" | "LIABILITY",
    "merchant": "Canonical Merchant Name",
    "category": "Category Name from Chart of Accounts",
    "vendor": "Vendor Name",
    "confidence": 0.0 to 1.0,
    "taxTreatment": "Tax rule like GST, HST, Exempt",
    "journal": [
      { "account": "Expense Account Name", "debit": 100, "credit": 0 },
      { "account": "Checking", "debit": 0, "credit": 100 }
    ],
    "reason": "Accounting reasoning",
    "requiresReview": true/false
  }
]

CRITICAL:
- Total Debits MUST EQUAL Total Credits in the journal.
- Chart of Accounts available: ${categories}
- Known Vendors: ${vendors}
- Do not output markdown code blocks. Output JSON only.`;

    const model = config.ai?.openaiModel || 'gpt-4o';
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze these ${transactions.length} transactions:\n\n${txList}` },
      ],
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || '[]';
    try {
      const cleaned = content.replace(/```json\n?|```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      return transactions.map((tx, i) => {
        const result = parsed[i];
        if (!result) return this.fallbackCategorize(tx);
        return {
          transactionType: result.transactionType || 'EXPENSE',
          merchant: result.merchant || tx.merchant || 'Unknown',
          category: result.category || 'Uncategorized',
          vendor: result.vendor || 'Unknown',
          confidence: Number(result.confidence) || 0.5,
          taxTreatment: result.taxTreatment || 'Exempt',
          journal: Array.isArray(result.journal) ? result.journal : this.generateSimpleJournal(result.category, tx.amount, tx.type),
          reason: result.reason || 'AI Analysis',
          requiresReview: Boolean(result.requiresReview) || false,
          version: 1,
          possibleTransfer: result.transactionType === 'TRANSFER',
        };
      });
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON output:', parseError);
      return transactions.map(tx => this.fallbackCategorize(tx));
    }
  }

  generateSimpleJournal(category: string, amount: number, type: 'DEBIT' | 'CREDIT'): AiJournalEntry[] {
    if (type === 'DEBIT') {
      return [
        { account: category, debit: amount, credit: 0 },
        { account: 'Checking/Clearing', debit: 0, credit: amount }
      ];
    } else {
      return [
        { account: 'Checking/Clearing', debit: amount, credit: 0 },
        { account: category, debit: 0, credit: amount }
      ];
    }
  }

  fallbackCategorize(tx: NormalizedData): AiCategorizationResult {
    return {
      transactionType: tx.type === 'DEBIT' ? 'EXPENSE' : 'INCOME',
      merchant: tx.merchant || 'Unknown',
      category: 'Uncategorized',
      vendor: 'Unknown',
      confidence: 0.1,
      taxTreatment: 'Exempt',
      journal: this.generateSimpleJournal('Uncategorized', tx.amount, tx.type),
      reason: 'Fallback to basic defaults',
      requiresReview: true,
      version: 1,
      possibleTransfer: false,
    };
  }

  determineStatus(confidence: number): string {
    if (confidence >= AI_CONFIDENCE_THRESHOLD_AUTO) return 'CATEGORIZED';
    if (confidence >= AI_CONFIDENCE_THRESHOLD_REVIEW) return 'NEEDS_REVIEW';
    return 'NEEDS_REVIEW';
  }
}

export const aiCategorizationService = new AiCategorizationService();
