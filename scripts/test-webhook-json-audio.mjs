#!/usr/bin/env node
/**
 * POST test audio to the N8N webhook using the exact JSON format the frontend sends:
 *   { message, timestamp, audio: { format, sampleRate, channels, data (base64), size } }
 *
 * Reads scripts/test-audio/test-audio.pcm (PCM S16LE 16 kHz mono). Generate it with:
 *   npm run test:audio:generate
 *
 * Usage:
 *   node scripts/test-webhook-json-audio.mjs [WEBHOOK_URL]
 *   node scripts/test-webhook-json-audio.mjs path/to/other.pcm [WEBHOOK_URL]
 *   N8N_WEBHOOK_URL=... node scripts/test-webhook-json-audio.mjs
 *
 * Exits 0 if OK, 1 on failure.
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_WEBHOOK = 'https://n8n.hempstarai.com/webhook/170d9a22-bac0-438c-9755-dc79b961d36e';
const DEFAULT_PCM = join(__dirname, 'test-audio', 'test-audio.pcm');

const args = process.argv.slice(2).filter((a) => a && !a.startsWith('-'));
const pcmPath = args[0] && !args[0].startsWith('http') ? args[0] : DEFAULT_PCM;
const url = args[0] && args[0].startsWith('http')
  ? args[0]
  : (args[1] && args[1].startsWith('http') ? args[1] : null) || process.env.N8N_WEBHOOK_URL || DEFAULT_WEBHOOK;

if (!url.startsWith('http')) {
  console.error('Usage: node scripts/test-webhook-json-audio.mjs [pcm-path] [WEBHOOK_URL]');
  console.error('       npm run test:webhook:json-audio');
  console.error('   or: N8N_WEBHOOK_URL=<url> node scripts/test-webhook-json-audio.mjs');
  process.exit(1);
}

function toBase64(buffer) {
  return buffer.toString('base64');
}

async function main() {
  let pcm;
  try {
    pcm = await readFile(pcmPath);
  } catch (e) {
    console.error('Failed to read PCM file:', pcmPath);
    console.error('Generate it first: npm run test:audio:generate');
    process.exit(1);
  }

  const payload = {
    message: 'Testing 1-2, testing 1-2.',
    timestamp: new Date().toISOString(),
    audio: {
      format: 'pcm_s16le',
      sampleRate: 16000,
      channels: 1,
      data: toBase64(pcm),
      size: pcm.length,
    },
  };

  console.error('POST (JSON, frontend format) to', url);
  console.error('  PCM:', pcmPath, '(' + pcm.length + ' bytes)');
  console.error('  message:', payload.message);

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/plain, */*' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error('Request failed:', e.message);
    process.exit(1);
  }

  const text = await res.text();

  if (!res.ok) {
    console.error('HTTP', res.status, res.statusText);
    if (text) console.error('Body:', text.slice(0, 500));
    process.exit(1);
  }

  if (!text || !text.trim()) {
    console.log('OK (webhook accepted JSON + audio; response empty)');
    console.log('Tip: Configure Respond to Webhook to return JSON { message, audio?, transcript? }.');
    process.exit(0);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error('Response is not JSON. Preview:', text.slice(0, 200));
    process.exit(1);
  }

  const msg = data?.message ?? data?.response ?? data?.text ?? data?.content;
  if (msg != null && typeof msg === 'string') {
    console.log('OK');
    console.log('Message:', msg.slice(0, 200) + (msg.length > 200 ? '...' : ''));
    if (data?.transcript) console.log('Transcript:', data.transcript);
    if (data?.audio?.data) console.log('Audio: base64 length', data.audio.data.length, 'format', data.audio.format ?? '?');
    process.exit(0);
  }

  console.error('Response missing message/response/text/content:', JSON.stringify(data).slice(0, 300));
  process.exit(1);
}

main();
