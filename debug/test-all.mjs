/**
 * Test all debug tools from command line
 * Usage: node debug/test-all.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔧 JARVIS Debug Tools - Command Line Test');
console.log('==========================================\n');

console.log('📋 Available Debug Tools:');
console.log('  1. audio-playback-debug.ts - Audio playback debugging');
console.log('  2. webhook-debug.ts - N8N webhook testing');
console.log('  3. tts-debug.ts - Cartesia TTS testing');
console.log('  4. index.ts - Main entry point\n');

console.log('💡 To use these tools:');
console.log('  - In browser: await window.jarvisDebug.master()');
console.log('  - In code: import from "@/debug"');
console.log('  - See debug/README.md for details\n');

// Check if files exist
const files = [
  'debug/audio-playback-debug.ts',
  'debug/webhook-debug.ts',
  'debug/tts-debug.ts',
  'debug/index.ts',
  'debug/README.md',
  'debug/FIXES.md',
];

console.log('✅ Debug files check:');
files.forEach(file => {
  try {
    const content = readFileSync(join(projectRoot, file), 'utf8');
    const lines = content.split('\n').length;
    console.log(`  ✓ ${file} (${lines} lines)`);
  } catch (err) {
    console.log(`  ✗ ${file} - NOT FOUND`);
  }
});

console.log('\n📝 Next Steps:');
console.log('  1. Start dev server: npm run dev');
console.log('  2. Open browser console (F12)');
console.log('  3. Run: await window.jarvisDebug.master()');
console.log('  4. Check console output for issues\n');
