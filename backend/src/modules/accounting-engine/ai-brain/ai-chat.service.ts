import { prisma } from '../../../config/database';
import { config } from '../../../config';

export class AiChatService {
  async askAccountant(tenantId: string, query: string): Promise<string> {
    const apiKey = config.ai?.openaiApiKey;
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey });

      // Gather context
      const dashboard = await prisma.dashboardProjection.findUnique({ where: { tenantId } });
      const recentTransactions = await prisma.bookkeepingTransaction.findMany({
        where: { tenantId },
        orderBy: { transactionDate: 'desc' },
        take: 20,
        select: { id: true, transactionDate: true, description: true, amount: true, type: true, status: true, vendorId: true, categoryId: true }
      });
      
      const accounts = await prisma.bookkeepingAccount.findMany({
        where: { tenantId },
        select: { name: true, type: true, currentBalance: true }
      });

      const context = `
Current Financial Dashboard:
${JSON.stringify(dashboard?.data || {}, null, 2)}

Current Chart of Accounts & Balances:
${JSON.stringify(accounts, null, 2)}

Recent Transactions (last 20):
${JSON.stringify(recentTransactions, null, 2)}
      `;

      const prompt = `You are a highly intelligent, professional AI Accountant. You have access to the user's financial ledger, chart of accounts, and real-time dashboard metrics.

Analyze the user's question and provide a helpful, concise answer based ONLY on the context provided. If you don't know the answer or the context doesn't have the data, say so politely.

Format your output in clean Markdown (using tables, bullet points, and bold text where appropriate). Do not use HTML.

Context:
${context}

User Question: ${query}`;

      const response = await openai.chat.completions.create({
        model: config.ai?.openaiModel || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      });

      return response.choices[0].message?.content || 'I could not generate a response.';
    } catch (error) {
      console.error('AI Chat Error:', error);
      throw new Error('Failed to communicate with AI Brain');
    }
  }
}

export const aiChatService = new AiChatService();
