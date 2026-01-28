// N8N Code node: Audio base64 → binary for Cartesia STT (run "Run Once for All Items")
// Input: webhook body with audio.data (base64) and optional audio.format
// Supports: PCM 16kHz mono S16LE → WAV; MP3 → pass-through.
// Output: { json: { ...body }, binary: { data } } for Cartesia STT (Form-Data file)

const item = $input.first();
const body = item.json.body || item.json;
const audio = body?.audio;
if (!audio?.data) return [{ json: { ...body, text: body?.message || '' } }];

const raw = Buffer.from(audio.data, 'base64');
const fmt = (audio.format || '').toLowerCase();

// MP3 (or mpeg/mpga): pass through as-is. Cartesia STT accepts MP3.
if (fmt.includes('mp3') || fmt.includes('mpeg') || fmt.includes('mpga') || fmt.includes('audio/mpeg')) {
  const data = await this.helpers.prepareBinaryData(raw, 'audio.mp3');
  return [{ json: { ...body }, binary: { data } }];
}

// PCM (default): build WAV header, 16kHz mono 16-bit.
const sampleRate = 16000;
const channels = 1;
const bitsPerSample = 16;
const byteRate = sampleRate * channels * (bitsPerSample / 8);
const dataSize = raw.length;
const fileSize = 36 + dataSize;

const header = Buffer.alloc(44);
let offset = 0;
header.write('RIFF', offset); offset += 4;
header.writeUInt32LE(fileSize, offset); offset += 4;
header.write('WAVE', offset); offset += 4;
header.write('fmt ', offset); offset += 4;
header.writeUInt32LE(16, offset); offset += 4;
header.writeUInt16LE(1, offset); offset += 2;
header.writeUInt16LE(channels, offset); offset += 2;
header.writeUInt32LE(sampleRate, offset); offset += 4;
header.writeUInt32LE(byteRate, offset); offset += 4;
header.writeUInt16LE((bitsPerSample / 8) * channels, offset); offset += 2;
header.writeUInt16LE(bitsPerSample, offset); offset += 2;
header.write('data', offset); offset += 4;
header.writeUInt32LE(dataSize, offset);

const wav = Buffer.concat([header, raw]);
const data = await this.helpers.prepareBinaryData(wav, 'audio.wav');

return [{ json: { ...body }, binary: { data } }];
