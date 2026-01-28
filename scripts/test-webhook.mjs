#!/usr/bin/env node
/**
 * Test script for JARVIS N8N webhook.
 * POSTs { message: "Hello" } (or multipart with audio when --audio) and validates response.
 *
 * Usage:
 *   node scripts/test-webhook.mjs [WEBHOOK_URL]
 *   node scripts/test-webhook.mjs --audio [WEBHOOK_URL]
 *   node scripts/test-webhook.mjs --audio path/to/audio.wav [WEBHOOK_URL]
 *   N8N_WEBHOOK_URL=... node scripts/test-webhook.mjs
 *
 * --audio: send multipart/form-data with message, timestamp, and file (audio).
 *   If no path given, uses a minimal generated WAV (0.2s silence). Otherwise uses the given file.
 *   Webhook: https://n8n.hempstarai.com/webhook-test/170d9a22-bac0-438c-9755-dc79b961d36e
 *
 * Exits 0 if OK, 1 on failure.
 */

const DEFAULT_WEBHOOK =
  'https://n8n.hempstarai.com/webhook-test/170d9a22-bac0-438c-9755-dc79b961d36e';

const args = process.argv.slice(2);
const audioIdx = args.indexOf('--audio');
const useAudio = audioIdx !== -1;
let audioPath = null;
if (useAudio && args[audioIdx + 1] && !args[audioIdx + 1].startsWith('http')) {
  audioPath = args[audioIdx + 1];
}
const urlArg = useAudio
  ? (audioPath ? args[audioIdx + 2] : args[audioIdx + 1])
  : args[0];
const url = urlArg || process.env.N8N_WEBHOOK_URL || DEFAULT_WEBHOOK;

if (!url.startsWith('http')) {
  console.error('Usage: node scripts/test-webhook.mjs [WEBHOOK_URL]');
  console.error('       node scripts/test-webhook.mjs --audio [path] [WEBHOOK_URL]');
  console.error('   or: N8N_WEBHOOK_URL=<url> node scripts/test-webhook.mjs');
  process.exit(1);
}

/** Build a minimal WAV (0.2s silence, 16kHz mono 16-bit). */
function buildMinimalWav() {
  const sampleRate = 16000;
  const channels = 1;
  const bitsPerSample = 16;
  const durationSec = 0.2;
  const numSamples = Math.floor(sampleRate * channels * durationSec);
  const dataSize = numSamples * (bitsPerSample / 8);
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const fileSize = 36 + dataSize;

  const header = Buffer.alloc(44);
  let o = 0;
  header.write('RIFF', o); o += 4;
  header.writeUInt32LE(fileSize, o); o += 4;
  header.write('WAVE', o); o += 4;
  header.write('fmt ', o); o += 4;
  header.writeUInt32LE(16, o); o += 4;
  header.writeUInt16LE(1, o); o += 2;
  header.writeUInt16LE(channels, o); o += 2;
  header.writeUInt32LE(sampleRate, o); o += 4;
  header.writeUInt32LE(byteRate, o); o += 4;
  header.writeUInt16LE((bitsPerSample / 8) * channels, o); o += 2;
  header.writeUInt16LE(bitsPerSample, o); o += 2;
  header.write('data', o); o += 4;
  header.writeUInt32LE(dataSize, o);

  const pcm = Buffer.alloc(dataSize);
  return Buffer.concat([header, pcm]);
}

async function main() {
  const timestamp = new Date().toISOString();
  let res;

  if (useAudio) {
    let wavBuffer;
    let filename = 'audio.wav';
    let mime = 'audio/wav';
    if (audioPath) {
      const fs = await import('node:fs/promises');
      wavBuffer = await fs.readFile(audioPath);
      const base = audioPath.replace(/\\/g, '/').split('/').pop();
      if (base) filename = base;
      if (filename.toLowerCase().endsWith('.webm')) mime = 'audio/webm';
      else if (filename.toLowerCase().endsWith('.mp3')) mime = 'audio/mpeg';
    } else {
      wavBuffer = buildMinimalWav();
    }
    const form = new FormData();
    form.append('message', 'Hello (audio test)');
    form.append('timestamp', timestamp);
    form.append('file', new Blob([wavBuffer], { type: mime }), filename);

    console.error('POST (multipart) to', url, 'with file:', filename);
    try {
      res = await fetch(url, { method: 'POST', body: form });
    } catch (e) {
      console.error('Request failed:', e.message);
      process.exit(1);
    }
  } else {
    const payload = { message: 'Hello', timestamp };
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error('Request failed:', e.message);
      process.exit(1);
    }
  }

  if (!res.ok) {
    console.error(`HTTP ${res.status} ${res.statusText}`);
    const text = await res.text();
    if (text) console.error('Body:', text.slice(0, 500));
    process.exit(1);
  }

  const raw = await res.text();
  const emptyBody = !raw || !raw.trim();

  if (emptyBody) {
    if (useAudio) {
      console.log('OK (webhook accepted multipart + audio; response empty)');
      console.log('Tip: Configure Respond to Webhook to return JSON { message, audio? } for full validation.');
      process.exit(0);
    }
    console.error('Response body is empty. Configure the workflow to return JSON { message, audio? }.');
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error('Response is not JSON. Preview:', raw.slice(0, 200));
    process.exit(1);
  }

  const msg = data?.message ?? data?.response ?? data?.text ?? data?.content;
  if (msg == null || typeof msg !== 'string') {
    console.error('Response missing message/response/text/content:', JSON.stringify(data).slice(0, 300));
    process.exit(1);
  }

  console.log('OK');
  console.log('Message:', msg.slice(0, 120) + (msg.length > 120 ? '...' : ''));
  if (data?.audio) {
    const a = data.audio;
    const hasData = typeof a?.data === 'string' && a.data.length > 0;
    console.log('Audio:', hasData ? `base64 length ${a.data.length}, format ${a.format ?? '?'}` : 'present but no data');
  }

  process.exit(0);
}

main();
