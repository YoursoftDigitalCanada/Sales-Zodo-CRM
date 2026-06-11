import { prisma } from '../../../config/database';
import { logger } from '../../../common/utils/logger';

export interface AppendEventParams {
  tenantId: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: any;
  metadata?: any;
  causationId?: string;
  correlationId?: string;
}

export class EventStoreService {
  /**
   * Appends a new event to an aggregate.
   * Uses optimistic concurrency control based on aggregate version.
   */
  async appendEvent(params: AppendEventParams): Promise<void> {
    const {
      tenantId,
      aggregateId,
      aggregateType,
      eventType,
      payload,
      metadata = {},
      causationId,
      correlationId,
    } = params;

    try {
      await prisma.$transaction(async (tx: any) => {
        // 1. Get or create the aggregate stream
        let aggregate = await tx.accountingAggregate.findUnique({
          where: { id: aggregateId },
        });

        if (!aggregate) {
          aggregate = await tx.accountingAggregate.create({
            data: {
              id: aggregateId,
              tenantId,
              type: aggregateType,
              version: 0,
            },
          });
        }

        const nextVersion = aggregate.version + 1;

        // 2. Append the event
        await tx.accountingEvent.create({
          data: {
            aggregateId,
            aggregateVersion: nextVersion,
            eventType,
            tenantId,
            payload,
            metadata,
            causationId,
            correlationId,
          },
        });

        // 3. Update the aggregate version
        await tx.accountingAggregate.update({
          where: { id: aggregateId },
          data: { version: nextVersion },
        });

      });
    } catch (error: any) {
      if (error.code === 'P2002') { // Unique constraint failure
        logger.error(`Concurrency conflict appending event to aggregate ${aggregateId}`);
        throw new Error('Optimistic concurrency conflict. Please retry.');
      }
      logger.error(`Failed to append event: ${error}`);
      throw error;
    }
  }

  /**
   * Retrieves the event stream for a given aggregate.
   */
  async getEventStream(aggregateId: string, fromVersion = 0): Promise<any[]> {
    return prisma.accountingEvent.findMany({
      where: {
        aggregateId,
        aggregateVersion: { gt: fromVersion },
      },
      orderBy: { aggregateVersion: 'asc' },
    });
  }

  /**
   * Retrieves events across aggregates by type, useful for global projections.
   */
  async getEventsByType(tenantId: string, eventType: string, limit = 1000, afterId?: string): Promise<any[]> {
    return prisma.accountingEvent.findMany({
      where: {
        tenantId,
        eventType,
      },
      take: limit,
      skip: afterId ? 1 : 0,
      cursor: afterId ? { id: afterId } : undefined,
      orderBy: { createdAt: 'asc' },
    });
  }
}

export const eventStoreService = new EventStoreService();
