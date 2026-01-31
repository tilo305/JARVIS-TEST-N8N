#!/usr/bin/env node
/**
 * Integration test for WebSocket proxy
 * Tests the full flow: connection → text input → response
 */

import WebSocket from 'ws';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const WS_URL = process.env.WS_URL || 'ws://localhost:3001/ws';
const TEST_TIMEOUT = 30000; // 30 seconds

console.log('🧪 Integration Test: WebSocket Proxy\n');
console.log('WebSocket URL:', WS_URL);
console.log('');

let testResults = {
  connected: false,
  conversationStarted: false,
  textSent: false,
  transcriptReceived: false,
  audioReceived: false,
  errors: []
};

let messageCount = 0;
let audioChunkCount = 0;

const ws = new WebSocket(WS_URL);

const testTimeout = setTimeout(() => {
  console.error('\n❌ Test timeout after', TEST_TIMEOUT / 1000, 'seconds');
  console.log('\n📊 Test Results:');
  console.log(JSON.stringify(testResults, null, 2));
  ws.close();
  process.exit(1);
}, TEST_TIMEOUT);

ws.on('open', () => {
  console.log('✅ WebSocket connected');
  testResults.connected = true;
  
  // Send start conversation
  console.log('\n📤 Sending start_conversation...');
  ws.send(JSON.stringify({ type: 'start_conversation' }));
  
  // Wait for conversation to start, then send text
  setTimeout(() => {
    if (testResults.conversationStarted) {
      console.log('\n📤 Sending text input...');
      ws.send(JSON.stringify({
        type: 'text_input',
        text: 'Hello, this is a test. Please respond.'
      }));
      testResults.textSent = true;
    } else {
      console.warn('⚠️ Conversation not started, sending text anyway...');
      ws.send(JSON.stringify({
        type: 'text_input',
        text: 'Hello, this is a test. Please respond.'
      }));
      testResults.textSent = true;
    }
  }, 2000);
});

ws.on('message', (data) => {
  messageCount++;
  try {
    const message = JSON.parse(data.toString());
    
    console.log(`\n📥 Message ${messageCount}:`, {
      type: message.type,
      hasTranscript: !!message.transcript,
      hasAudio: !!message.audio,
      transcriptPreview: message.transcript?.substring(0, 50),
      error: message.error
    });
    
    switch (message.type) {
      case 'conversation_started':
        testResults.conversationStarted = true;
        console.log('✅ Conversation started');
        break;
        
      case 'transcript':
        if (message.transcript) {
          testResults.transcriptReceived = true;
          console.log('✅ Transcript received:', message.transcript.substring(0, 100));
        }
        break;
        
      case 'audio_chunk':
        if (message.audio) {
          audioChunkCount++;
          testResults.audioReceived = true;
          console.log(`✅ Audio chunk ${audioChunkCount} received (${message.audio.data.length} bytes base64)`);
        }
        break;
        
      case 'error':
        testResults.errors.push(message.error || 'Unknown error');
        console.error('❌ Error:', message.error);
        break;
        
      case 'done':
        console.log('✅ Conversation done');
        break;
    }
    
    // If we've received transcript and audio, we can end the test
    if (testResults.transcriptReceived && testResults.audioReceived && audioChunkCount >= 1) {
      console.log('\n✅ Integration test successful!');
      clearTimeout(testTimeout);
      setTimeout(() => {
        ws.close();
        process.exit(0);
      }, 1000);
    }
  } catch (error) {
    console.error('❌ Failed to parse message:', error);
    testResults.errors.push(error.message);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  testResults.errors.push(error.message);
  clearTimeout(testTimeout);
  process.exit(1);
});

ws.on('close', () => {
  console.log('\n🔌 WebSocket closed');
  console.log('\n📊 Final Test Results:');
  console.log(JSON.stringify({
    ...testResults,
    messageCount,
    audioChunkCount
  }, null, 2));
  
  const allPassed = 
    testResults.connected &&
    testResults.textSent &&
    (testResults.transcriptReceived || testResults.audioReceived) &&
    testResults.errors.length === 0;
  
  if (allPassed) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
});
