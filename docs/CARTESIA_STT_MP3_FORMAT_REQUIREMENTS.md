# Cartesia STT MP3 Format Requirements

## Summary

Based on comprehensive research of [docs.cartesia.ai](https://docs.cartesia.ai), **Cartesia STT accepts MP3 files without specific encoding requirements**. The API auto-detects the format and decodes it automatically.

## Key Findings

### 1. Supported Formats

Cartesia STT Batch API accepts these container formats:
- **flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm**

**Source:** [Cartesia STT Batch API Documentation](https://docs.cartesia.ai/api-reference/stt/transcribe)

### 2. MP3 Format Details

**No specific encoding parameters required** - Cartesia auto-detects and decodes MP3 files automatically.

However, for optimal speech recognition, the frontend should encode MP3 with:
- **Channels:** 1 (mono) - standard for speech
- **Sample Rate:** 16000 Hz - recommended for speech recognition
- **Bitrate:** 128 kbps - standard quality, good balance of size and quality

### 3. API Endpoint

**Batch STT:**
- **Endpoint:** `POST https://api.cartesia.ai/stt`
- **Content-Type:** `multipart/form-data`
- **Form field:** `file` (the MP3 file)
- **Model:** `ink-whisper` (recommended)
- **Language:** ISO 639-1 code (e.g., `en`)

### 4. Implementation

The frontend should:
1. Record audio using AudioWorklet (48kHz Float32)
2. Resample to 16kHz
3. Convert to PCM S16LE
4. Encode to MP3 using lamejs:
   ```javascript
   const mp3encoder = new lamejs.Mp3Encoder(1, 16000, 128);
   // 1 = mono channel
   // 16000 = sample rate (Hz)
   // 128 = bitrate (kbps)
   ```
5. Send MP3 as `file` in `multipart/form-data` to N8N webhook
6. N8N forwards the MP3 binary to Cartesia STT

### 5. Why MP3?

- **Smaller file size** than WAV (better for network transfer)
- **Widely supported** by Cartesia STT
- **Browser compatible** for playback
- **Standard format** for speech applications

### 6. Alternative: Raw PCM (Streaming Only)

For **streaming STT** (WebSocket), Cartesia uses raw PCM:
- **Encoding:** `pcm_s16le` (recommended)
- **Sample Rate:** 16000 Hz (recommended)

But for **batch STT** (webhook-based N8N flow), **MP3 file upload is the recommended approach**.

## References

- [Cartesia STT Batch API](https://docs.cartesia.ai/api-reference/stt/transcribe)
- [Cartesia STT Models](https://docs.cartesia.ai/build-with-cartesia/stt-models)
- [Cartesia STT Audio Formats Documentation](./CARTESIA_STT_AUDIO_FORMATS.md)
