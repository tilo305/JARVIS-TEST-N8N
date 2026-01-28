// N8N Code node: PCM S16LE (base64) → MP3 binary (run "Run Once for All Items")
// Input: webhook body with audio.data (base64) and optional audio.format
// Output: { json: { ...body }, binary: { data } } — MP3 in binary.data for STT / downstream
//
// Uses lamejs. Requires "Enable modules in Code node" (self-hosted).
// See: https://docs.n8n.io/code/code-node/ (External libraries, File system and HTTP)
// Built-in: $input, this.helpers.prepareBinaryData — https://docs.n8n.io/code/builtin/

const lamejs = require('lamejs');

const item = $input.first();
const body = item.json.body || item.json;
const audio = body?.audio;
if (!audio?.data) return [{ json: { ...body, text: body?.message || '' } }];

const raw = Buffer.from(audio.data, 'base64');
const fmt = (audio.format || '').toLowerCase();

// MP3 (or mpeg/mpga): pass through as-is.
if (fmt.includes('mp3') || fmt.includes('mpeg') || fmt.includes('mpga') || fmt.includes('audio/mpeg')) {
  const data = await this.helpers.prepareBinaryData(raw, 'audio.mp3');
  return [{ json: { ...body }, binary: { data } }];
}

// PCM S16LE 16 kHz mono → MP3 via lamejs
const sampleRate = 16000;
const channels = 1;
const kbps = 128;
const encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
const sampleBlockSize = 1152;
const numSamples = Math.floor(raw.length / 2);
const mp3Chunks = [];

for (let i = 0; i < numSamples; i += sampleBlockSize) {
  const end = Math.min(i + sampleBlockSize, numSamples);
  const chunk = new Int16Array(end - i);
  for (let j = 0; j < chunk.length; j++) chunk[j] = raw.readInt16LE((i + j) * 2);
  const mp3buf = encoder.encodeBuffer(chunk);
  if (mp3buf.length > 0) mp3Chunks.push(Buffer.from(mp3buf));
}

const flush = encoder.flush();
if (flush.length > 0) mp3Chunks.push(Buffer.from(flush));

const mp3 = Buffer.concat(mp3Chunks);
const data = await this.helpers.prepareBinaryData(mp3, 'audio.mp3');

return [{ json: { ...body }, binary: { data } }];
