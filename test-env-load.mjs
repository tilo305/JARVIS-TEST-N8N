#!/usr/bin/env node
/**
 * Test script to verify Vite can load .env file correctly
 * This simulates what Vite does when loading environment variables
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = __dirname;
const envPath = join(projectRoot, '.env');

console.log('🧪 Testing .env file loading for Vite...\n');

if (!existsSync(envPath)) {
  console.error('❌ .env file not found at:', envPath);
  process.exit(1);
}

console.log('✅ .env file exists\n');

// Read and parse .env file
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

console.log('📋 Environment variables found:\n');

// Check for VITE_ prefixed variables (required for Vite)
const viteVars = Object.keys(envVars).filter(key => key.startsWith('VITE_'));
const nonViteVars = Object.keys(envVars).filter(key => !key.startsWith('VITE_'));

if (viteVars.length > 0) {
  console.log('✅ VITE_ prefixed variables (will be loaded by Vite):');
  viteVars.forEach(key => {
    const value = envVars[key];
    const masked = key.includes('API_KEY') ? value.substring(0, 10) + '...' : value;
    console.log(`   ${key}=${masked}`);
  });
  console.log('');
} else {
  console.log('❌ No VITE_ prefixed variables found!');
  console.log('   Vite will NOT load any variables from .env\n');
}

if (nonViteVars.length > 0) {
  console.log('⚠️  Non-VITE_ variables (will NOT be loaded by Vite):');
  nonViteVars.forEach(key => {
    console.log(`   ${key}=${envVars[key]}`);
  });
  console.log('');
}

// Required variables for frontend
const requiredVars = [
  'VITE_CARTESIA_API_KEY',
  'VITE_WEBSOCKET_PROXY_URL'
];

console.log('🔍 Checking required variables:\n');
let allPresent = true;

requiredVars.forEach(varName => {
  if (envVars[varName]) {
    const value = envVars[varName];
    const masked = varName.includes('API_KEY') ? value.substring(0, 10) + '...' : value;
    console.log(`✅ ${varName}=${masked}`);
  } else {
    console.log(`❌ ${varName} - MISSING`);
    allPresent = false;
  }
});

console.log('');

if (allPresent && viteVars.length > 0) {
  console.log('✅ All checks passed! Vite will load the .env file correctly.');
  process.exit(0);
} else {
  console.log('❌ Some issues found. Fix the .env file and try again.');
  process.exit(1);
}
