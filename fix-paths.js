const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Fix external consumers
const externalFixes = [
  { file: 'src/modules/automation/sales-automation.service.ts', from: '../bookkeeping/bookkeeping.service', to: '../accounting-engine' },
  { file: 'src/modules/billing/billing.service.ts', from: '../bookkeeping/bookkeeping.service', to: '../accounting-engine' },
  { file: 'src/modules/expenses/expenses.service.ts', from: '../bookkeeping/bookkeeping.service', to: '../accounting-engine' },
  { file: 'src/modules/invoices/invoices.service.ts', from: '../bookkeeping/bookkeeping.service', to: '../accounting-engine' },
  { file: 'src/routes/index.ts', from: '../modules/accounting-engine/bookkeeping.routes', to: '../modules/accounting-engine/api/bookkeeping.routes' }
];

externalFixes.forEach(f => {
  const p = path.resolve(__dirname, 'backend', f.file);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(f.from, f.to);
    fs.writeFileSync(p, content);
  }
});

// 2. Fix internal paths in accounting-engine
function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walk(dirPath, callback);
    } else if (dirPath.endsWith('.ts')) {
      callback(dirPath);
    }
  });
}

const engineDir = path.resolve(__dirname, 'backend/src/modules/accounting-engine');

walk(engineDir, (filePath) => {
  // Ignore index.ts
  if (filePath.endsWith('index.ts')) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // Fix up-level imports from '../../...' to '../../../...' since they moved one level deeper
  content = content.replace(/from '\.\.\/\.\.\//g, "from '../../../");

  // Fix sibling imports across domains
  const siblingMap = {
    './bookkeeping.dto': '../api/bookkeeping.dto',
    './bookkeeping.service': '../ledger/bookkeeping.service',
    './merchant.service': '../merchant-intelligence/merchant.service',
    './transfer-matching.service': '../transfer-intelligence/transfer-matching.service',
    './ai-categorization.service': '../ai-brain/ai-categorization.service',
    './deterministic-accounting.service': '../deterministic-engine/deterministic-accounting.service',
    './audit.service': '../event-store/audit.service'
  };

  for (const [from, to] of Object.entries(siblingMap)) {
    content = content.replace(new RegExp(`from '${from}'`, 'g'), `from '${to}'`);
  }

  fs.writeFileSync(filePath, content);
});

console.log("Paths updated successfully.");
