import { prisma } from '../../../config/database';

export class MerchantIntelligenceService {
  
  /**
   * Cleans a raw description into a canonical merchant name
   */
  public cleanMerchantName(rawName: string): string {
    let name = rawName.toUpperCase();
    
    // Remove common business suffixes and special characters
    name = name.replace(/ (LLC|INC|LTD|CORP|CO|BV|GMBH)$/i, '');
    name = name.replace(/[^A-Z0-9 ]/g, ' '); // Strip special chars
    name = name.replace(/\s+/g, ' ').trim(); // Normalize whitespace
    
    return name;
  }

  /**
   * Resolves a raw merchant string to a Canonical BookkeepingMerchant, creating it if necessary.
   */
  public async resolveMerchant(tenantId: string, rawName: string): Promise<{ merchant: any, isNew: boolean }> {
    const cleaned = this.cleanMerchantName(rawName);
    
    if (!cleaned) return { merchant: null, isNew: false };

    // 1. Exact Match on Canonical Name
    let merchant = await prisma.bookkeepingMerchant.findFirst({
      where: { tenantId, canonicalName: cleaned }
    });

    if (merchant) {
      await this.registerSighting(merchant.id, rawName);
      return { merchant, isNew: false };
    }

    // 2. Search in Aliases (Json array)
    // Prisma JSON filtering for string array can be tricky, so we fetch and filter in memory for fuzzy matches 
    // or use raw query. For now, exact match loop or raw query.
    const allMerchants = await prisma.bookkeepingMerchant.findMany({ where: { tenantId } });
    for (const m of allMerchants) {
      const aliases: string[] = Array.isArray(m.aliases) ? m.aliases as string[] : [];
      if (aliases.includes(rawName.toUpperCase()) || aliases.includes(cleaned)) {
        await this.registerSighting(m.id, rawName);
        return { merchant: m, isNew: false };
      }
    }

    // 3. Not found, create new Merchant
    merchant = await prisma.bookkeepingMerchant.create({
      data: {
        tenantId,
        canonicalName: cleaned,
        aliases: [rawName.toUpperCase()],
        timesSeen: 1,
        lastSeen: new Date(),
        confidence: 0.1, // Initial low confidence
      }
    });

    return { merchant, isNew: true };
  }

  /**
   * Registers that a merchant was seen in an import, updating its stats
   */
  private async registerSighting(merchantId: string, rawName: string) {
    const merchant = await prisma.bookkeepingMerchant.findUnique({ where: { id: merchantId } });
    if (!merchant) return;

    let aliases: string[] = Array.isArray(merchant.aliases) ? merchant.aliases as string[] : [];
    const upperRaw = rawName.toUpperCase();
    if (!aliases.includes(upperRaw)) {
      aliases.push(upperRaw);
    }

    await prisma.bookkeepingMerchant.update({
      where: { id: merchantId },
      data: {
        aliases,
        timesSeen: { increment: 1 },
        lastSeen: new Date(),
        confidence: Math.min(1.0, merchant.confidence + 0.05), // Build confidence over time
      }
    });
  }

  /**
   * Updates merchant intelligence after a user manual correction
   */
  public async learnFromCorrection(
    tenantId: string, 
    merchantId: string, 
    categoryId?: string, 
    vendorId?: string,
    taxRule?: string,
    accountId?: string
  ) {
    await prisma.bookkeepingMerchant.update({
      where: { id: merchantId },
      data: {
        ...(categoryId && { defaultCategoryId: categoryId }),
        ...(vendorId && { defaultVendorId: vendorId }),
        ...(taxRule && { defaultTaxRule: taxRule }),
        ...(accountId && { defaultAccountId: accountId }),
        confidence: 0.99 // Manual correction solidifies confidence
      }
    });
  }
}

export const merchantIntelligenceService = new MerchantIntelligenceService();
