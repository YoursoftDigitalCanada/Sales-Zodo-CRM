import { config } from '../../config';
import { prisma } from '../../config/database';
import { AI_CONFIDENCE_THRESHOLD_AUTO, AI_CONFIDENCE_THRESHOLD_REVIEW } from './bookkeeping.dto';

export interface AiCategorizationResult {
  category: string;
  vendor: string;
  confidence: number;
  transactionType: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'REFUND';
  reason: string;
  possibleTransfer: boolean;
}

interface NormalizedData {
  date: string;
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  currency: string;
  merchant?: string;
}

const KEYWORD_CATEGORIES: Record<string, RegExp> = {
  'Transportation': /uber|lyft|taxi|cab|transit|parking|gas|fuel|shell|esso|petro/i,
  'Meals & Entertainment': /starbucks|tim horton|mcdonald|restaurant|cafe|coffee|doordash|skip.?the.?dish|ubereats|food/i,
  'Shopping': /amazon|walmart|costco|best buy|target|dollarama|ikea|home depot/i,
  'Software & Technology': /google|microsoft|adobe|apple|shopify|aws|azure|github|slack|zoom|notion|figma|canva/i,
  'Telecommunications': /rogers|bell|telus|shaw|fido|koodo|virgin|freedom/i,
  'Insurance': /insurance|manulife|sunlife|great.?west|intact/i,
  'Subscriptions': /netflix|spotify|hulu|disney|subscription|monthly|recurring/i,
  'Office Expenses': /office|staples|supplies|paper|ink|toner/i,
  'Marketing & Advertising': /facebook.?ads|google.?ads|meta.?ads|advertising|marketing|promo/i,
  'Rent & Utilities': /rent|hydro|electric|water|gas bill|utility|enbridge/i,
  'Banking & Fees': /service charge|bank fee|nsi|nsf|overdraft|interest charge|monthly fee/i,
  'Travel': /hotel|airbnb|booking\.com|expedia|airline|air canada|westjet|flight/i,
  'Professional Services': /legal|lawyer|accountant|consulting|advisory|professional/i,
  'Payroll': /payroll|salary|wages|employee|adp|ceridian/i,
};

const TRANSFER_PATTERNS = /transfer|payment.*(?:credit|card|visa|master)|pay.*bill|e-?transfer|etransfer|internal|tfr|xfer/i;
const REFUND_PATTERNS = /refund|return|reversal|chargeback|credit adjustment|rebate/i;

class AiCategorizationService {

  async categorize(tenantId: string, normalizedData: NormalizedData): Promise<AiCategorizationResult> {
    const results = await this.batchCategorize(tenantId, [normalizedData]);
    return results[0];
  }

  async batchCategorize(tenantId: string, transactions: NormalizedData[]): Promise<AiCategorizationResult[]> {
    // Try OpenAI first
    const apiKey = config.ai?.openaiApiKey;
    if (apiKey && transactions.length > 0) {
      try {
        return await this.openAiCategorize(tenantId, transactions, apiKey);
      } catch (error) {
        console.error('OpenAI categorization failed, falling back to keyword matching:', error);
      }
    }

    // Fallback to keyword matching
    return transactions.map(tx => this.keywordCategorize(tx));
  }

  private async openAiCategorize(tenantId: string, transactions: NormalizedData[], apiKey: string): Promise<AiCategorizationResult[]> {
    // Fetch existing categories and vendors for context
    const [categories, vendors] = await Promise.all([
      prisma.bookkeepingCategory.findMany({ where: { tenantId, isActive: true }, select: { name: true, type: true } }),
      prisma.bookkeepingVendor.findMany({ where: { tenantId, isActive: true }, select: { name: true } }),
    ]);

    const categoryNames = categories.map((c: any) => `${c.name} (${c.type})`).join(', ');
    const vendorNames = vendors.map((v: any) => v.name).slice(0, 50).join(', ');

    const txList = transactions.map((tx, i) => 
      `${i + 1}. Date: ${tx.date}, Description: "${tx.description}", Amount: ${tx.type === 'DEBIT' ? '-' : '+'}$${tx.amount.toFixed(2)}, Currency: ${tx.currency}${tx.merchant ? `, Merchant: ${tx.merchant}` : ''}`
    ).join('\n');

    const systemPrompt = `You are an expert bookkeeping AI for a Canadian business. Categorize bank and credit card transactions accurately.

For EACH transaction, return a JSON array with objects containing:
- "category": one of the existing categories or suggest a new descriptive one
- "vendor": the merchant/company name (cleaned, proper case)
- "confidence": 0.0-1.0 how confident you are
- "transactionType": "EXPENSE" | "INCOME" | "TRANSFER" | "REFUND"
- "reason": brief 5-10 word explanation
- "possibleTransfer": true if this looks like a transfer between accounts, credit card payment, or internal movement

Rules:
- Credit card payments to own credit card = TRANSFER (possibleTransfer: true)
- Bank-to-bank transfers between own accounts = TRANSFER (possibleTransfer: true)
- E-transfers to self = TRANSFER (possibleTransfer: true)
- Refunds/returns = REFUND
- Debits are usually EXPENSE, credits are usually INCOME unless they are transfers/refunds
- Use existing categories when possible
- confidence should be lower (0.3-0.6) for ambiguous descriptions

Existing categories: ${categoryNames || 'None yet'}
Existing vendors: ${vendorNames || 'None yet'}

Return ONLY a valid JSON array with exactly ${transactions.length} objects. No markdown, no explanation.`;

    const model = config.ai?.openaiModel || 'gpt-4o-mini';
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Categorize these ${transactions.length} transactions:\n\n${txList}` },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || '[]';
    try {
      // Strip markdown code fences if present
      const cleaned = content.replace(/```json\n?|```\n?/g, '').trim();
      const parsed: AiCategorizationResult[] = JSON.parse(cleaned);
      
      // Validate and fill in missing fields
      return transactions.map((tx, i) => {
        const result = parsed[i];
        if (!result || typeof result !== 'object') return this.keywordCategorize(tx);
        return {
          category: result.category || 'Uncategorized',
          vendor: result.vendor || tx.merchant || 'Unknown',
          confidence: typeof result.confidence === 'number' ? Math.min(1, Math.max(0, result.confidence)) : 0.5,
          transactionType: (['EXPENSE', 'INCOME', 'TRANSFER', 'REFUND'].includes(result.transactionType) ? result.transactionType : (tx.type === 'DEBIT' ? 'EXPENSE' : 'INCOME')) as any,
          reason: result.reason || 'AI categorized',
          possibleTransfer: Boolean(result.possibleTransfer),
        };
      });
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      return transactions.map(tx => this.keywordCategorize(tx));
    }
  }

  keywordCategorize(tx: NormalizedData): AiCategorizationResult {
    const desc = tx.description;

    // Check for transfers first
    if (TRANSFER_PATTERNS.test(desc)) {
      return {
        category: 'Internal Transfer',
        vendor: tx.merchant || 'Internal',
        confidence: 0.75,
        transactionType: 'TRANSFER',
        reason: 'Description matches transfer pattern',
        possibleTransfer: true,
      };
    }

    // Check for refunds
    if (REFUND_PATTERNS.test(desc)) {
      return {
        category: 'Refunds',
        vendor: tx.merchant || 'Unknown',
        confidence: 0.80,
        transactionType: 'REFUND',
        reason: 'Description matches refund pattern',
        possibleTransfer: false,
      };
    }

    // Match categories
    for (const [category, pattern] of Object.entries(KEYWORD_CATEGORIES)) {
      if (pattern.test(desc)) {
        return {
          category,
          vendor: tx.merchant || 'Unknown',
          confidence: 0.70,
          transactionType: tx.type === 'DEBIT' ? 'EXPENSE' : 'INCOME',
          reason: `Keyword match: ${category}`,
          possibleTransfer: false,
        };
      }
    }

    // Fallback
    return {
      category: 'Uncategorized',
      vendor: tx.merchant || 'Unknown',
      confidence: 0.30,
      transactionType: tx.type === 'DEBIT' ? 'EXPENSE' : 'INCOME',
      reason: 'No keyword match found',
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
