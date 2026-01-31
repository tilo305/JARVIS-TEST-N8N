#!/usr/bin/env node
/**
 * Pre-start environment check script
 * 
 * Ensures .env file exists and has required variables before starting dev server
 * 
 * Usage: node scripts/check-env.mjs
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const envPath = join(projectRoot, '.env');
const envExamplePath = join(projectRoot, '.env.example');

const REQUIRED_VARS = {
  'VITE_CARTESIA_API_KEY': 'Cartesia API key for TTS (starts with sk_car_)',
};

const OPTIONAL_VARS = {
  'VITE_CARTESIA_VOICE_ID': '95131c95-525c-463b-893d-803bafdf93c4',
  'VITE_CARTESIA_TTS_MODEL': 'sonic-turbo',
  'VITE_CARTESIA_TTS_SPEED': '1.05',
};

function checkEnvFile() {
  const strict = process.env.STRICT_ENV_CHECK === '1';
  console.log('🔍 Checking .env file...\n');
  
  // Check if .env exists
  if (!existsSync(envPath)) {
    console.log('❌ .env file not found!\n');
    console.log('📝 Creating .env file from template...\n');
    
    // Create .env.example if it doesn't exist
    if (!existsSync(envExamplePath)) {
      const exampleContent = `# Cartesia TTS Configuration

# REQUIRED: Your Cartesia API key (get from https://www.cartesia.ai/)
VITE_CARTESIA_API_KEY=your_cartesia_api_key_here

# OPTIONAL: Voice ID (default: 95131c95-525c-463b-893d-803bafdf93c4)
VITE_CARTESIA_VOICE_ID=95131c95-525c-463b-893d-803bafdf93c4

# OPTIONAL: TTS Model (default: sonic-turbo)
VITE_CARTESIA_TTS_MODEL=sonic-turbo

# OPTIONAL: TTS Speed (default: 1.05)
VITE_CARTESIA_TTS_SPEED=1.05
`;
      writeFileSync(envExamplePath, exampleContent, 'utf-8');
      console.log('✅ Created .env.example file');
    }
    
    // Create .env from example or template
    let envContent = '';
    if (existsSync(envExamplePath)) {
      envContent = readFileSync(envExamplePath, 'utf-8');
      console.log('📋 Using .env.example as template');
    } else {
      envContent = `# Cartesia TTS Configuration
VITE_CARTESIA_API_KEY=your_cartesia_api_key_here
VITE_CARTESIA_VOICE_ID=95131c95-525c-463b-893d-803bafdf93c4
VITE_CARTESIA_TTS_MODEL=sonic-turbo
VITE_CARTESIA_TTS_SPEED=1.05
`;
    }
    
    writeFileSync(envPath, envContent, 'utf-8');
    console.log('✅ Created .env file\n');
    console.log('⚠️  IMPORTANT: Edit .env file and add your Cartesia API key!');
    console.log('   Cartesia TTS will be disabled until you add it.\n');
    return true;
  }
  
  console.log('✅ .env file exists\n');
  
  // Read and validate .env
  const envContent = readFileSync(envPath, 'utf-8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  // Check required variables
  let hasErrors = false;
  console.log('🔍 Validating environment variables...\n');
  
  for (const [varName, description] of Object.entries(REQUIRED_VARS)) {
    const value = envVars[varName];
    if (!value || value === 'your_cartesia_api_key_here' || value === '') {
      console.log(`❌ ${varName}: NOT SET or using placeholder`);
      console.log(`   ${description}\n`);
      hasErrors = true;
    } else if (varName === 'VITE_CARTESIA_API_KEY' && !value.startsWith('sk_car_')) {
      console.log(`⚠️  ${varName}: Value doesn't look like a valid Cartesia API key`);
      console.log(`   Expected format: sk_car_...\n`);
    } else {
      console.log(`✅ ${varName}: Set`);
    }
  }
  
  // Check optional variables
  console.log('\n📋 Optional variables:');
  for (const [varName, defaultValue] of Object.entries(OPTIONAL_VARS)) {
    const value = envVars[varName];
    if (value && value !== defaultValue && value !== '') {
      console.log(`✅ ${varName}: ${value} (custom)`);
    } else if (value === defaultValue || !value) {
      console.log(`ℹ️  ${varName}: ${defaultValue} (default)`);
    }
  }
  
  if (hasErrors) {
    if (strict) {
      console.log('\n❌ Environment validation failed!');
      console.log('💡 Fix the issues above and restart the dev server.\n');
      process.exit(1);
    } else {
      console.log('\n⚠️  Environment validation warnings (continuing).');
      console.log('💡 Cartesia TTS will be disabled until you add a valid API key.\n');
    }
  } else {
    console.log('\n✅ Environment validation passed!\n');
  }
  return true;
}

// Run check
const isValid = checkEnvFile();
process.exit(isValid ? 0 : 1);

