#!/usr/bin/env node
/**
 * Setup script to create .env files from .env.example
 * This script helps you set up environment variables for both frontend and backend
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = __dirname;

console.log('🔧 Setting up environment files...\n');

// Frontend .env
const frontendEnvExample = join(projectRoot, '.env.example');
const frontendEnv = join(projectRoot, '.env');

if (!existsSync(frontendEnv)) {
  if (existsSync(frontendEnvExample)) {
    copyFileSync(frontendEnvExample, frontendEnv);
    console.log('✅ Created frontend .env file from .env.example');
  } else {
    const defaultFrontendEnv = `# Frontend Environment Variables
VITE_CARTESIA_API_KEY=your_cartesia_api_key_here
VITE_CARTESIA_VOICE_ID=95131c95-525c-463b-893d-803bafdf93c4
VITE_CARTESIA_TTS_MODEL=sonic-turbo
VITE_CARTESIA_TTS_SPEED=1.05
VITE_WEBSOCKET_PROXY_URL=ws://localhost:3001/ws
`;
    writeFileSync(frontendEnv, defaultFrontendEnv);
    console.log('✅ Created frontend .env file with defaults');
  }
} else {
  console.log('ℹ️  Frontend .env already exists, skipping');
}

// Backend .env (websocket-proxy)
const backendEnvExample = join(projectRoot, 'websocket-proxy', '.env.example');
const backendEnv = join(projectRoot, 'websocket-proxy', '.env');

if (!existsSync(backendEnv)) {
  if (existsSync(backendEnvExample)) {
    copyFileSync(backendEnvExample, backendEnv);
    console.log('✅ Created websocket-proxy .env file from .env.example');
  } else {
    const defaultBackendEnv = `# WebSocket Proxy Service Environment Variables
CARTESIA_API_KEY=your_cartesia_api_key_here
CARTESIA_VOICE_ID=95131c95-525c-463b-893d-803bafdf93c4
CARTESIA_TTS_MODEL=sonic-turbo
N8N_WEBHOOK_URL=https://n8n.hempstarai.com/webhook/170d9a22-bac0-438c-9755-dc79b961d36e
PORT=3001
`;
    writeFileSync(backendEnv, defaultBackendEnv);
    console.log('✅ Created websocket-proxy .env file with defaults');
  }
} else {
  console.log('ℹ️  websocket-proxy .env already exists, skipping');
}

console.log('\n📝 Next steps:');
console.log('1. Edit .env in the root directory and add your VITE_CARTESIA_API_KEY');
console.log('2. Edit websocket-proxy/.env and add:');
console.log('   - CARTESIA_API_KEY (same as frontend)');
console.log('   - N8N_WEBHOOK_URL (if different from default)');
console.log('\n✅ Environment files ready!');
