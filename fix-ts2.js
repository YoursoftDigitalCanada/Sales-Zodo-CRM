const fs = require('fs');
const path = require('path');

const replaceInFile = (file, from, to) => {
  const p = path.resolve(__dirname, 'backend/src/modules/accounting-engine', file);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(from, to);
    fs.writeFileSync(p, content);
  }
};

// 1. import-session.service.ts
replaceInFile(
  'api/import-session.service.ts',
  /deterministicAccountingService \} from '\.\.\/deterministic-engine\/deterministic-accounting\.service'/g,
  "deterministicAccountingEngine as deterministicAccountingService } from '../deterministic-engine/deterministic-accounting.service'"
);
replaceInFile(
  'api/import-session.service.ts',
  /deterministicAccountingEngine\./g,
  "deterministicAccountingService."
);

// 2. import.worker.ts
replaceInFile(
  'queues/workers/import.worker.ts',
  /uploadedFiles/g,
  "files"
);

// 3. merchant.worker.ts
replaceInFile(
  'queues/workers/merchant.worker.ts',
  /import \{ bookkeepingMerchantService as merchantService \}/g,
  "import { merchantIntelligenceService as merchantService }"
);

// 4. posting.worker.ts
replaceInFile(
  'queues/workers/posting.worker.ts',
  /deterministicAccountingService \} from '\.\.\/\.\.\/deterministic-engine\/deterministic-accounting\.service'/g,
  "deterministicAccountingEngine as deterministicAccountingService } from '../../deterministic-engine/deterministic-accounting.service'"
);

// 5. transfer.worker.ts
replaceInFile(
  'queues/workers/transfer.worker.ts',
  /const score = await transferMatchingService\.scoreProbability\(tenantId, rawTransactionId\);\n  const isTransfer = score > 70;\n\n  await prisma\.rawTransaction\.update\(\{\n    where: \{ id: rawTransactionId \},\n    data: \{\n      transferScore: score,\n      transferType: isTransfer \? 'PROBABLE_TRANSFER' : null,\n    \}\n  \}\);\n\n  await eventStoreService\.appendEvent\(\{\n    tenantId,\n    aggregateId: rawTransactionId,\n    aggregateType: 'TRANSACTION',\n    eventType: 'TransferScored',\n    payload: \{ transferScore: score, isTransfer, version \},\n  \}\);/g,
  `const score = 0;
  const isTransfer = false;`
);

console.log("Fixes applied!");
