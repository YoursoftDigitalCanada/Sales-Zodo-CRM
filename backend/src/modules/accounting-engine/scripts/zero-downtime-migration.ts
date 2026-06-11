import { prisma } from '../../../config/database';
import { eventStoreService } from '../event-store/event-store.service';
import { merchantQueue } from '../queues/queue-factory';

async function runMigration() {
  console.log('🚀 Starting Zero-Downtime Migration for Accounting Engine');
  
  // 1. Fetch all transactions that don't have events
  const allEvents = await prisma.accountingEvent.findMany({
    select: { aggregateId: true },
    distinct: ['aggregateId']
  });
  const eventIds = new Set(allEvents.map(e => e.aggregateId));

  const transactions = await prisma.bookkeepingTransaction.findMany();
  const toMigrate = transactions.filter(tx => !eventIds.has(tx.id));

  console.log(`Found ${toMigrate.length} legacy transactions requiring migration.`);

  let migratedCount = 0;

  for (const tx of toMigrate) {
    // Generate synthetic Import Event
    await eventStoreService.appendEvent({
      tenantId: tx.tenantId,
      aggregateId: tx.id,
      aggregateType: 'BookkeepingTransaction',
      eventType: 'TransactionImportedEvent',
      payload: {
        source: 'Legacy System Migration',
        originalData: {
          amount: Number(tx.amount),
          currency: tx.currency,
          date: tx.transactionDate.toISOString(),
          description: tx.description,
          type: tx.type
        }
      },
      correlationId: `mig-import-${tx.id}`
    });

    // Generate synthetic Posted Event if it's already posted
    if (tx.status === 'POSTED' || tx.status === 'RECONCILED' || tx.isReconciled) {
      await eventStoreService.appendEvent({
        tenantId: tx.tenantId,
        aggregateId: tx.id,
        aggregateType: 'BookkeepingTransaction',
        eventType: 'TransactionPostedEvent',
        payload: {
          reason: 'Retroactively marked as posted during V2 migration',
          status: tx.status,
          isReconciled: tx.isReconciled
        },
        correlationId: `mig-posted-${tx.id}`
      });
    }

    // Optionally: Enqueue for retroactive merchant & duplicate intelligence
    // Only if it's not reconciled and lacks category/merchant context
    if (!tx.isReconciled && !tx.merchantId) {
      await merchantQueue.add('retroactive-merchant', {
        tenantId: tx.tenantId,
        sessionId: `mig-${Date.now()}`,
        rawTransactionId: tx.id, // using tx.id as proxy for raw id
        version: 2,
        idempotencyKey: `mig-merchant-${tx.id}`
      });
    }

    migratedCount++;
    if (migratedCount % 100 === 0) {
      console.log(`✅ Migrated ${migratedCount}/${toMigrate.length} transactions...`);
    }
  }

  console.log(`🎉 Migration Complete! Successfully migrated ${migratedCount} transactions.`);
}

runMigration()
  .catch(e => console.error('Migration failed:', e))
  .finally(() => process.exit(0));
