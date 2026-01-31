#!/usr/bin/env node
/**
 * Test script to verify WebSocket proxy service
 */

import WebSocket from 'ws';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const WS_URL = process.env.WS_URL || 'ws://localhost:3001/ws';
const TEST_SESSION_ID = 'test-session-' + Date.now();

console.log('🧪 Testing WebSocket Proxy Connection...\n');
console.log('WebSocket URL:', WS_URL);
console.log('Session ID:', TEST_SESSION_ID);
console.log('');

let messageCount = 0;
let errorCount = 0;

const ws = new WebSocket(`${WS_URL}?sessionId=${TEST_SESSION_ID}`);

ws.on('open', () => {
  console.log('✅ WebSocket connected');
  
  // Send start conversation message
  ws.send(JSON.stringify({
    type: 'start_conversation'
  }));
  
  // Wait a bit, then send test text
  setTimeout(() => {
    console.log('\n📤 Sending test text input...');
    ws.send(JSON.stringify({
      type: 'text_input',
      text: 'Hello, this is a test message.'
    }));
  }, 1000);
  
  // Close after test
  setTimeout(() => {
    console.log('\n✅ Test complete, closing connection...');
    ws.close();
    process.exit(0);
  }, 10000);
});

ws.on('message', (data) => {
  messageCount++;
  try {
    const message = JSON.parse(data.toString());
    console.log(`\n📥 Message ${messageCount}:`, {
      type: message.type,
      conversationId: message.conversationId?.substring(0, 20) + '...',
      hasTranscript: !!message.transcript,
      hasAudio: !!message.audio,
      transcript: message.transcript?.substring(0, 50) + (message.transcript?.length > 50 ? '...' : ''),
      error: message.error
    });
    
    if (message.type === 'error') {
      errorCount++;
      console.error('❌ Error received:', message.error);
    }
  } catch (error) {
    console.error('❌ Failed to parse message:', error);
    errorCount++;
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  errorCount++;
  process.exit(1);
});

ws.on('close', () => {
  console.log('\n🔌 WebSocket closed');
  console.log(`\n📊 Test Results:`);
  console.log(`   Messages received: ${messageCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  if (errorCount === 0 && messageCount > 0) {
    console.log('✅ Test passed!');
    process.exit(0);
  } else {
    console.log('❌ Test failed!');
    process.exit(1);
  }
});

// Timeout after 15 seconds
setTimeout(() => {
  console.error('\n❌ Test timeout');
  ws.close();
  process.exit(1);
}, 15000);
