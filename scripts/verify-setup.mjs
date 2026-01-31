#!/usr/bin/env node

/**
 * Comprehensive setup verification script
 * Checks all critical components are in place and working
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const projectRoot = process.cwd();
let errors = [];
let warnings = [];
let passed = [];

function check(name, condition, errorMsg, warningMsg) {
  if (condition) {
    passed.push(`✅ ${name}`);
  } else if (errorMsg) {
    errors.push(`❌ ${name}: ${errorMsg}`);
  } else if (warningMsg) {
    warnings.push(`⚠️  ${name}: ${warningMsg}`);
  }
}

console.log('🔍 Comprehensive Setup Verification\n');
console.log('=' .repeat(50));

// 1. Check critical files
console.log('\n📁 Critical Files:');
check(
  'public/audio-capture-processor.js',
  existsSync(join(projectRoot, 'public', 'audio-capture-processor.js')),
  'Missing AudioWorklet processor file'
);

check(
  'src/utils/audioworklet-diagnostics.ts',
  existsSync(join(projectRoot, 'src', 'utils', 'audioworklet-diagnostics.ts')),
  'Missing AudioWorklet diagnostics utility'
);

check(
  'scripts/kill-ports.mjs',
  existsSync(join(projectRoot, 'scripts', 'kill-ports.mjs')),
  'Missing port cleanup script'
);

check(
  'scripts/check-websocket-env.mjs',
  existsSync(join(projectRoot, 'scripts', 'check-websocket-env.mjs')),
  'Missing environment check script'
);

// 2. Check websocket-proxy
console.log('\n🔌 WebSocket Proxy:');
const websocketProxyDir = join(projectRoot, 'websocket-proxy');
check(
  'websocket-proxy directory',
  existsSync(websocketProxyDir),
  'Missing websocket-proxy directory'
);

check(
  'websocket-proxy/package.json',
  existsSync(join(websocketProxyDir, 'package.json')),
  'Missing websocket-proxy package.json'
);

check(
  'websocket-proxy/.env',
  existsSync(join(websocketProxyDir, '.env')),
  null,
  'Missing .env file (required for WebSocket proxy)'
);

// Check .env has required vars if it exists
if (existsSync(join(websocketProxyDir, '.env'))) {
  try {
    const envContent = readFileSync(join(websocketProxyDir, '.env'), 'utf-8');
    const hasApiKey = envContent.includes('CARTESIA_API_KEY=') && 
                     !envContent.match(/CARTESIA_API_KEY=\s*$/);
    const hasWebhook = envContent.includes('N8N_WEBHOOK_URL=') && 
                      !envContent.match(/N8N_WEBHOOK_URL=\s*$/);
    
    check(
      'CARTESIA_API_KEY in .env',
      hasApiKey,
      'CARTESIA_API_KEY not set in websocket-proxy/.env'
    );
    
    check(
      'N8N_WEBHOOK_URL in .env',
      hasWebhook,
      'N8N_WEBHOOK_URL not set in websocket-proxy/.env'
    );
  } catch (e) {
    warnings.push(`⚠️  Could not read websocket-proxy/.env: ${e.message}`);
  }
}

// 3. Check package.json scripts
console.log('\n📦 Package.json Scripts:');
try {
  const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
  const scripts = packageJson.scripts || {};
  
  check(
    'dev script',
    scripts.dev && scripts.dev.includes('concurrently'),
    'dev script missing or not configured for concurrent execution'
  );
  
  check(
    'vite:dev script',
    scripts['vite:dev'] === 'vite',
    'vite:dev script missing or incorrect'
  );
  
  check(
    'websocket:dev script',
    scripts['websocket:dev'] && scripts['websocket:dev'].includes('websocket-proxy'),
    'websocket:dev script missing or incorrect'
  );
  
  check(
    'concurrently package',
    packageJson.devDependencies && packageJson.devDependencies.concurrently,
    'concurrently not in devDependencies'
  );
} catch (e) {
  errors.push(`❌ Could not read package.json: ${e.message}`);
}

// 4. Check node_modules
console.log('\n📚 Dependencies:');
check(
  'node_modules exists',
  existsSync(join(projectRoot, 'node_modules')),
  'node_modules not found - run npm install'
);

check(
  'websocket-proxy/node_modules exists',
  existsSync(join(websocketProxyDir, 'node_modules')),
  null,
  'websocket-proxy/node_modules not found - run npm install in websocket-proxy'
);

// 5. Check TypeScript config
console.log('\n📝 TypeScript Configuration:');
check(
  'tsconfig.json',
  existsSync(join(projectRoot, 'tsconfig.json')),
  'Missing tsconfig.json'
);

check(
  'vite.config.ts',
  existsSync(join(projectRoot, 'vite.config.ts')),
  'Missing vite.config.ts'
);

// Print results
console.log('\n' + '='.repeat(50));
console.log('\n📊 Verification Results:\n');

if (passed.length > 0) {
  console.log('✅ Passed Checks:');
  passed.forEach(msg => console.log(`   ${msg}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  warnings.forEach(msg => console.log(`   ${msg}`));
}

if (errors.length > 0) {
  console.log('\n❌ Errors:');
  errors.forEach(msg => console.log(`   ${msg}`));
}

console.log('\n' + '='.repeat(50));

// Summary
const total = passed.length + warnings.length + errors.length;
const successRate = ((passed.length / total) * 100).toFixed(1);

console.log(`\n📈 Summary: ${passed.length}/${total} checks passed (${successRate}%)`);

if (errors.length === 0) {
  console.log('\n✅ Setup is ready! You can run: npm run dev');
  process.exit(0);
} else {
  console.log('\n❌ Please fix the errors above before running the dev server');
  process.exit(1);
}
