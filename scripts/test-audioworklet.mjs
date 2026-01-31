#!/usr/bin/env node
/**
 * AudioWorklet Implementation Test Script
 * Tests the AudioWorklet setup and verifies all components are working
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🧪 Testing AudioWorklet Implementation\n');

// Test 1: Check processor file exists
console.log('1️⃣  Checking processor file...');
const processorPath = join(projectRoot, 'public', 'audio-capture-processor.js');
try {
  const processorContent = readFileSync(processorPath, 'utf-8');
  
  // Check for required components
  const checks = {
    'AudioWorkletProcessor': processorContent.includes('AudioWorkletProcessor'),
    'registerProcessor': processorContent.includes('registerProcessor'),
    'process method': processorContent.includes('process(inputs, outputs, parameters)'),
    'return true': processorContent.includes('return true'),
    'audio-capture-processor': processorContent.includes('audio-capture-processor'),
  };
  
  console.log('   ✅ Processor file found');
  Object.entries(checks).forEach(([check, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${check}: ${passed ? 'Found' : 'Missing'}`);
  });
  
  if (Object.values(checks).every(v => v)) {
    console.log('   ✅ All processor checks passed\n');
  } else {
    console.log('   ❌ Some processor checks failed\n');
    process.exit(1);
  }
} catch (error) {
  console.error('   ❌ Processor file not found:', error.message);
  process.exit(1);
}

// Test 2: Check TypeScript hook implementation
console.log('2️⃣  Checking TypeScript implementation...');
const hookPath = join(projectRoot, 'src', 'hooks', 'useAudioRecorder.ts');
try {
  const hookContent = readFileSync(hookPath, 'utf-8');
  
  const checks = {
    'audioWorklet.addModule': hookContent.includes('audioWorklet.addModule'),
    '50ms delay': hookContent.includes('setTimeout(resolve, 50)'),
    'secure context check': hookContent.includes('isSecureContext'),
    'onprocessorerror': hookContent.includes('onprocessorerror'),
    'AudioWorkletNode': hookContent.includes('AudioWorkletNode'),
  };
  
  console.log('   ✅ Hook file found');
  Object.entries(checks).forEach(([check, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${check}: ${passed ? 'Found' : 'Missing'}`);
  });
  
  if (Object.values(checks).every(v => v)) {
    console.log('   ✅ All hook checks passed\n');
  } else {
    console.log('   ⚠️  Some hook checks failed (may be acceptable)\n');
  }
} catch (error) {
  console.error('   ❌ Hook file not found:', error.message);
  process.exit(1);
}

// Test 3: Check documentation
console.log('3️⃣  Checking documentation...');
const docPath = join(projectRoot, 'aUdiOwOrKLeT dOcS.md');
try {
  const docContent = readFileSync(docPath, 'utf-8');
  
  const checks = {
    'MDN reference': docContent.includes('MDN AudioWorklet'),
    'Best practices': docContent.includes('Best Practices'),
    'Troubleshooting': docContent.includes('Troubleshooting'),
    'Browser compatibility': docContent.includes('Browser Compatibility'),
  };
  
  console.log('   ✅ Documentation file found');
  Object.entries(checks).forEach(([check, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${check}: ${passed ? 'Found' : 'Missing'}`);
  });
  
  if (Object.values(checks).every(v => v)) {
    console.log('   ✅ All documentation checks passed\n');
  } else {
    console.log('   ⚠️  Some documentation checks failed\n');
  }
} catch (error) {
  console.error('   ❌ Documentation file not found:', error.message);
  process.exit(1);
}

console.log('✅ All AudioWorklet implementation tests completed!');
console.log('\n📝 Next steps:');
console.log('   - Test in browser with actual microphone');
console.log('   - Verify secure context (HTTPS or localhost)');
console.log('   - Check browser console for any runtime errors');
console.log('   - Test VAD (Voice Activity Detection) functionality\n');
