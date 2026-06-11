import { Queue, Worker, QueueEvents, Job, WorkerOptions } from 'bullmq';
import { getRedisClient } from '../../../config/redis';
import { logger } from '../../../common/utils/logger';

// ─── Queue Configuration ─────────────────────────────────────────────

const connection = getRedisClient() as any;

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: {
    age: 3600, // keep for 1 hour
    count: 1000,
  },
  removeOnFail: {
    age: 24 * 3600 * 7, // keep failures for 7 days
  },
};

// ─── Shared Queue Factory ────────────────────────────────────────────

export class QueueManager {
  private static queues: Map<string, Queue> = new Map();
  private static workers: Map<string, Worker> = new Map();
  private static events: Map<string, QueueEvents> = new Map();

  static getQueue(queueName: string): Queue {
    if (!connection) {
      logger.warn(`Redis not available, unable to initialize queue ${queueName}`);
    }
    
    if (!this.queues.has(queueName)) {
      const q = new Queue(queueName, {
        connection,
        defaultJobOptions,
        prefix: 'queues:accounting',
      });
      this.queues.set(queueName, q);
    }
    return this.queues.get(queueName)!;
  }

  static createWorker(
    queueName: string,
    processor: (job: Job) => Promise<any>,
    options?: Partial<WorkerOptions>
  ): Worker {
    if (!connection) {
      logger.warn(`Redis not available, unable to start worker for ${queueName}`);
    }

    if (!this.workers.has(queueName)) {
      const worker = new Worker(queueName, processor, {
        connection,
        concurrency: 5,
        prefix: 'queues:accounting',
        ...options,
      });

      worker.on('failed', (job, err) => {
        logger.error(`[${queueName}] Job ${job?.id} failed with error: ${err.message}`);
      });

      worker.on('completed', (job) => {
        logger.debug(`[${queueName}] Job ${job.id} completed successfully`);
      });

      this.workers.set(queueName, worker);
    }
    return this.workers.get(queueName)!;
  }
}

// ─── Standardized Event Payload ──────────────────────────────────────

export interface BaseAccountingJob {
  tenantId: string;
  sessionId: string;
  rawTransactionId: string;
  version: number;
  idempotencyKey: string;
}

// ─── Exported Queues ─────────────────────────────────────────────────

export const QUEUES = {
  IMPORT: 'import-csv',
  MERCHANT_INTELLIGENCE: 'merchant-intelligence',
  DUPLICATE_INTELLIGENCE: 'duplicate-intelligence',
  TRANSFER_INTELLIGENCE: 'transfer-intelligence',
  AI_BRAIN: 'ai-brain',
  VALIDATION: 'validation',
  POSTING: 'posting',
  PROJECTION: 'projection'
} as const;

export const importQueue = QueueManager.getQueue(QUEUES.IMPORT);
export const merchantQueue = QueueManager.getQueue(QUEUES.MERCHANT_INTELLIGENCE);
export const duplicateQueue = QueueManager.getQueue(QUEUES.DUPLICATE_INTELLIGENCE);
export const transferQueue = QueueManager.getQueue(QUEUES.TRANSFER_INTELLIGENCE);
export const aiQueue = QueueManager.getQueue(QUEUES.AI_BRAIN);
export const validationQueue = QueueManager.getQueue(QUEUES.VALIDATION);
export const postingQueue = QueueManager.getQueue(QUEUES.POSTING);
export const projectionQueue = QueueManager.getQueue(QUEUES.PROJECTION);
