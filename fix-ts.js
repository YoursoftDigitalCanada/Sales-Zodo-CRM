const fs = require('fs');
const path = require('path');

const fixImportPrisma = (filePath) => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/import prisma from '(.*config\/database)';/g, "import { prisma } from '$1';");
    
    // Some minor type fixes
    content = content.replace(/const warnings = \[\];/g, "const warnings: string[] = [];");
    content = content.replace(/deterministicAccountingEngine/g, "deterministicAccountingService");
    
    // Fix implicit any
    content = content.replace(/tx =>/g, "(tx: any) =>");
    content = content.replace(/async \(tx\) =>/g, "async (tx: any) =>");
    content = content.replace(/dup =>/g, "(dup: any) =>");
    
    // Missing service imports
    content = content.replace(/import \{ merchantService \}/g, "import { bookkeepingMerchantService as merchantService }");
    content = content.replace(/scoreTransferProbability/g, "scoreProbability");

    fs.writeFileSync(filePath, content);
  }
};

const dirs = [
  'api/accounting.command.ts',
  'api/accounting.query.ts',
  'api/import-session.service.ts',
  'event-store/event-store.service.ts',
  'queues/workers/import.worker.ts',
  'queues/workers/merchant.worker.ts',
  'queues/workers/duplicate.worker.ts',
  'queues/workers/transfer.worker.ts',
  'queues/workers/ai.worker.ts',
  'queues/workers/validation.worker.ts',
  'queues/workers/posting.worker.ts',
  'queues/workers/projection.worker.ts'
];

dirs.forEach(f => {
  fixImportPrisma(path.resolve(__dirname, 'backend/src/modules/accounting-engine', f));
});

// Also fix index.ts logger import
const idx = path.resolve(__dirname, 'backend/src/modules/accounting-engine/queues/workers/index.ts');
if (fs.existsSync(idx)) {
  let c = fs.readFileSync(idx, 'utf8');
  c = c.replace(/..\/..\/..\/common\/utils\/logger/, '../../../../common/utils/logger');
  fs.writeFileSync(idx, c);
}

console.log("Worker TS fixes applied.");
