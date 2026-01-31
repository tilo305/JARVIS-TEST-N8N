#!/usr/bin/env node
/**
 * Test health endpoint
 */

import fetch from 'node-fetch';

const HEALTH_URL = process.env.HEALTH_URL || 'http://localhost:3001/health';

console.log('🧪 Testing health endpoint...');
console.log('URL:', HEALTH_URL);

fetch(HEALTH_URL)
  .then(async (res) => {
    if (!res.ok) {
      console.error('❌ Health check failed:', res.status, res.statusText);
      process.exit(1);
    }
    
    const data = await res.json();
    console.log('✅ Health check passed:', data);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Health check error:', error.message);
    process.exit(1);
  });
