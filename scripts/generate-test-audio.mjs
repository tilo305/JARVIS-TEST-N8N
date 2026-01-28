#!/usr/bin/env node
/**
 * Generate test audio in the same format the frontend sends to N8N:
 * PCM S16LE, 16 kHz, mono. Says "What can you do for me?" (TTS).
 *
 * Requires: ffmpeg, npx (for @andresaya/edge-tts).
 *
 * Output:
 *   scripts/test-audio/test-audio.pcm  – raw PCM (use with test-webhook-json-audio)
 *
 * Usage:
 *   node scripts/generate-test-audio.mjs
 *   npm run test:audio:generate
 */

import { mkdir, unlink } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'test-audio');
const PCM_PATH = join(OUT_DIR, 'test-audio.pcm');
const TTS_TEXT = 'What can you do for me?';

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    ...opts,
  });
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed with status ${r.status}`);
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // 1. TTS: "What can you do for me?" → MP3 (edge-tts appends .mp3 to -o)
  //    Run from OUT_DIR with simple -o name to avoid path-with-spaces issues.
  const ttsOut = 'tts-temp';
  const mp3Path = join(OUT_DIR, ttsOut + '.mp3');
  console.log('Generating speech:', TTS_TEXT);
  run('npx', ['-y', '@andresaya/edge-tts', 'synthesize', '-t', TTS_TEXT, '-o', ttsOut], {
    cwd: OUT_DIR,
  });

  const fs = await import('node:fs');
  try {
    await fs.promises.access(mp3Path);
  } catch {
    throw new Error(`TTS output not found: ${mp3Path}. edge-tts may have written elsewhere.`);
  }

  // 2. Convert to PCM S16LE 16 kHz mono (frontend format)
  console.log('Converting to PCM S16LE 16 kHz mono...');
  run('ffmpeg', ['-y', '-i', mp3Path, '-f', 's16le', '-ar', '16000', '-ac', '1', PCM_PATH], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });

  // 3. Remove temp MP3
  await unlink(mp3Path).catch(() => {});

  const { size } = await fs.promises.stat(PCM_PATH).then((s) => ({ size: s.size }));

  console.log('');
  console.log('Generated test audio (frontend format: PCM S16LE 16 kHz mono):');
  console.log('  PCM:', PCM_PATH);
  console.log('  Text:', TTS_TEXT);
  console.log('  Size:', size, 'bytes');
  console.log('');
  console.log('Use with: node scripts/test-webhook-json-audio.mjs');
  console.log('  or:     npm run test:webhook:json-audio');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
