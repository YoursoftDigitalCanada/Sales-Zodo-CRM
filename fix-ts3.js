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

replaceInFile(
  'api/import-session.service.ts',
  "const { deterministicAccountingEngine as deterministicAccountingService } = await import('../deterministic-engine/deterministic-accounting.service');",
  "const { deterministicAccountingEngine } = await import('../deterministic-engine/deterministic-accounting.service');\n    const deterministicAccountingService = deterministicAccountingEngine;"
);

replaceInFile(
  'queues/workers/posting.worker.ts',
  /const transactionId = await deterministicAccountingService\.createFromRaw\(rawTx\);/g,
  "const transactionId = await deterministicAccountingService.processAndPost(rawTransactionId, tenantId) ? rawTransactionId : null;"
);

console.log("TS Fixes applied!");
