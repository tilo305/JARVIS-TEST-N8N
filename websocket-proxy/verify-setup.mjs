#!/usr/bin/env node
/**
 * Verification script to check WebSocket proxy setup
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Verifying WebSocket Proxy Setup...\n');

// Check package.json
try {
  const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'));
  console.log('✅ package.json found');
  console.log(`   Name: ${packageJson.name}`);
  console.log(`   Version: ${packageJson.version}`);
  
  // Check required dependencies
  const requiredDeps = ['express', 'ws', 'dotenv', 'node-fetch'];
  const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
  if (missingDeps.length > 0) {
    console.log(`❌ Missing dependencies: ${missingDeps.join(', ')}`);
    console.log('   Run: npm install');
  } else {
    console.log('✅ All required dependencies listed');
  }
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
}

// Check TypeScript config
try {
  const tsconfig = JSON.parse(readFileSync(join(__dirname, 'tsconfig.json'), 'utf-8'));
  console.log('\n✅ tsconfig.json found');
  console.log(`   Target: ${tsconfig.compilerOptions.target}`);
  console.log(`   Module: ${tsconfig.compilerOptions.module}`);
} catch (error) {
  console.log('\n❌ Error reading tsconfig.json:', error.message);
}

// Check source files
const sourceFiles = [
  'src/index.ts',
  'src/cartesia.ts',
  'src/n8n.ts',
  'src/websocket.ts',
  'src/types.ts'
];

console.log('\n📁 Checking source files:');
let allFilesExist = true;
for (const file of sourceFiles) {
  try {
    readFileSync(join(__dirname, file), 'utf-8');
    console.log(`   ✅ ${file}`);
  } catch (error) {
    console.log(`   ❌ ${file} - Not found`);
    allFilesExist = false;
  }
}

// Check .env.example
try {
  readFileSync(join(__dirname, '.env.example'), 'utf-8');
  console.log('\n✅ .env.example found');
} catch (error) {
  console.log('\n⚠️  .env.example not found (optional)');
}

console.log('\n' + '='.repeat(50));
if (allFilesExist) {
  console.log('✅ Setup verification complete!');
  console.log('\nNext steps:');
  console.log('1. Copy .env.example to .env');
  console.log('2. Add your API keys to .env');
  console.log('3. Run: npm install');
  console.log('4. Run: npm run dev');
} else {
  console.log('❌ Some files are missing. Please check the errors above.');
  process.exit(1);
}
