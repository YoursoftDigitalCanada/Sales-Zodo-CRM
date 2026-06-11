import { logger } from '../../../../common/utils/logger';

// Import workers to instantiate them and start listening to queues
import './import.worker';
import './merchant.worker';
import './duplicate.worker';
import './transfer.worker';
import './ai.worker';
import './validation.worker';
import './posting.worker';
import './projection.worker';

export function startAccountingWorkers() {
  logger.info('🚀 Accounting Engine Workers started and listening to Redis queues.');
}
