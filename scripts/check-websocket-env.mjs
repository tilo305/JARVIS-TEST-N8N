#!/usr/bin/env node

/**
 * Check if websocket-proxy has required environment variables
 * Provides helpful error messages if missing
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const websocketProxyDir = join(process.cwd(), 'websocket-proxy');
const envPath = join(websocketProxyDir, '.env');

function checkEnvFile() {
  if (!existsSync(envPath)) {
    console.error('❌ Missing .env file in websocket-proxy/');
    console.log('\n💡 To fix:');
    console.log('   1. Create websocket-proxy/.env');
    console.log('   2. Add required variables:');
    console.log('      CARTESIA_API_KEY=your_key_here');
    console.log('      N8N_WEBHOOK_URL=your_webhook_url');
    console.log('      PORT=3001');
    console.log('\n   See websocket-proxy/README.md for details\n');
    return false;
  }

  try {
    const envContent = readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    const requiredVars = {
      'CARTESIA_API_KEY': false,
      'N8N_WEBHOOK_URL': false,
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key] = trimmed.split('=');
        if (key && requiredVars.hasOwnProperty(key.trim())) {
          requiredVars[key.trim()] = true;
        }
      }
    }

    const missing = Object.entries(requiredVars)
      .filter(([_, present]) => !present)
      .map(([key]) => key);

    if (missing.length > 0) {
      console.error(`❌ Missing required environment variables in websocket-proxy/.env:`);
      missing.forEach(key => console.error(`   - ${key}`));
      console.log('\n💡 Add these to websocket-proxy/.env and try again\n');
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Error reading websocket-proxy/.env:', error.message);
    return false;
  }
}

if (!checkEnvFile()) {
  process.exit(1);
}
