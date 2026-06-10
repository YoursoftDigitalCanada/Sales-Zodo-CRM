import { prisma } from '../../config/database';
import { buildPagination, BookkeepingListResult } from './bookkeeping.dto';

type DelegateName =
  | 'bookkeepingAccount'
  | 'bookkeepingCategory'
  | 'bookkeepingVendor'
  | 'bookkeepingTransaction'
  | 'bookkeepingTransfer'
  | 'bookkeepingJournalEntry'
  | 'bookkeepingReconciliation'
  | 'bookkeepingRecurringRule';

function model(name: DelegateName): any {
  return (prisma as any)[name];
}

function buildSearch(search: unknown, fields: string[]) {
  const term = typeof search === 'string' ? search.trim() : '';
  if (!term) return {};
  return { OR: fields.map((field) => ({ [field]: { contains: term, mode: 'insensitive' } })) };
}

export class BookkeepingRepository {
  list(delegate: DelegateName, tenantId: string, query: Record<string, any> = {}, searchFields: string[] = ['name']): Promise<BookkeepingListResult> {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 50);
    const where: Record<string, any> = {
      tenantId,
      ...buildSearch(query.search, searchFields),
    };
    ['type', 'status', 'accountId', 'categoryId', 'vendorId', 'sourceType'].forEach((key) => {
      if (query[key]) where[key] = query[key];
    });
    if (query.dateFrom || query.dateTo) {
      const dateField = delegate === 'bookkeepingTransaction' ? 'transactionDate' : 'createdAt';
      where[dateField] = {};
      if (query.dateFrom) where[dateField].gte = new Date(query.dateFrom);
      if (query.dateTo) {
        const d = new Date(query.dateTo);
        // Include the entire day by adding almost 24 hours
        d.setUTCHours(23, 59, 59, 999);
        where[dateField].lte = d;
      }
    }
    const sortBy = String(query.sortBy || (delegate === 'bookkeepingTransaction' ? 'transactionDate' : 'createdAt'));
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
    return Promise.all([
      model(delegate).findMany({ where, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
      model(delegate).count({ where }),
    ]).then(([data, total]) => ({ data, meta: buildPagination(page, limit, total) }));
  }

  findById(delegate: DelegateName, id: string, tenantId: string) {
    return model(delegate).findFirst({ where: { id, tenantId } });
  }

  create(delegate: DelegateName, data: Record<string, any>) {
    return model(delegate).create({ data });
  }

  async update(delegate: DelegateName, id: string, tenantId: string, data: Record<string, any>) {
    await model(delegate).update({ where: { id }, data });
    return this.findById(delegate, id, tenantId);
  }

  async deactivate(delegate: DelegateName, id: string, tenantId: string) {
    await model(delegate).update({ where: { id }, data: { isActive: false } });
    return this.findById(delegate, id, tenantId);
  }

  async delete(delegate: DelegateName, id: string) {
    return model(delegate).delete({ where: { id } });
  }
}

export const bookkeepingRepository = new BookkeepingRepository();
