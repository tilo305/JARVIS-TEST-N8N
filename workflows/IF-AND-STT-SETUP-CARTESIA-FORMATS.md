# IF Node and STT Node Setup — All Cartesia Audio Formats

Cartesia Batch STT accepts: **flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm**.  
The IF node should route “has audio” to STT; the STT node should send that same binary file as the `file` field. No conversion happens in the IF or STT nodes—they only route and upload.

---

## 1. Flow Overview

- **Prepare audio for STT** (Code node) turns JSON base64 into **one** binary property: `binary.audio`, in whichever Cartesia-supported format (WAV, MP3, FLAC, etc.).
- **IF** routes on “does this item have `binary.audio`?” → True → STT, False → text path.
- **STT** sends `binary.audio` as the multipart `file` field. Same bytes, same format, no change.

So “whatever format the IF receives” is the same format STT receives—the IF never changes the data.

---

## 2. IF Node Setup

**Role:** Decide “has audio or not.” When True, pass the **same item** (with `binary.audio`) to STT.

### Parameters

| Setting | Value |
|--------|--------|
| **Condition** | One condition, type **String** |
| **Value 1** | `={{ $binary?.audio ? 'yes' : '' }}` |
| **Value 2** | *(leave empty)* |
| **Operation** | **is not empty** |

### Why this works for all formats

- Your upstream node (“Prepare audio for STT”) always puts the audio in **one** property: `binary.audio`, whether it’s WAV, MP3, FLAC, etc.
- The IF node only checks “is there a binary called `audio`?” It does **not** look at format or content.
- When the condition is True, n8n sends the **whole item** (including `binary.audio`) to the True branch—unchanged. So every Cartesia-acceptable format is passed through as-is.

### Wiring

- **Input:** from **Prepare audio for STT**.
- **True** → **STT**.
- **False** → **Set Transcript (from message)** (or whatever your text-only branch is).

---

## 3. STT Node Setup (Cartesia Batch)

**Role:** Upload the file in `binary.audio` as Cartesia’s `file` field. Again, same format, no conversion.

### Request

| Setting | Value |
|--------|--------|
| **Method** | `POST` |
| **URL** | `https://api.cartesia.ai/stt` |

### Headers

| Name | Value |
|------|--------|
| `Authorization` | `Bearer <your-api-key>` |
| `Cartesia-Version` | `2025-04-16` (or your chosen version) |

### Body (multipart/form-data)

| Form field | Type | Source | Value / notes |
|------------|------|--------|----------------|
| **file** | **File / Binary** | From item | Use the binary property **`audio`** (this is the “Input Data Field Name” / “Binary Property” in n8n). |
| **model** | Form field (text) | Fixed | `ink-whisper` |
| **language** | Form field (text) | Fixed | `en` (or your language) |

Optional:  
`timestamp_granularities[]` = `word` if you want word-level timestamps.

### n8n HTTP Request (or “HTTP Request” node) specifics

1. **Send Body:** Yes  
2. **Body Content Type:** `multipart/form-data`  
3. **Form parameters:**
   - One **File** parameter:
     - **Parameter Name:** `file`
     - **Input Data Field Name** (or “Binary Property”): **`audio`**  
     So the node takes `binary.audio` and sends it as the `file` part.
   - **model:** `ink-whisper`
   - **language:** `en`

Important: the “Input Data Field Name” (or equivalent) must be **`audio`**, so it uses the same property the IF node checks and passes through.

---

## 4. Supported Formats (Cartesia)

Cartesia decodes these automatically when sent as the `file` field:

**Container formats:** flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm  

Your “Prepare audio for STT” node should output one of these (e.g. WAV for PCM, or pass-through for MP3/FLAC/etc.) into `binary.audio`. The IF and STT nodes do not need different settings per format—they only need to use the single property `audio`.

---

## 5. Checklist

- [ ] **Prepare audio for STT** outputs all supported formats into **`binary.audio`** (with correct extension: `audio.wav`, `audio.mp3`, etc.).
- [ ] **IF** condition is `={{ $binary?.audio ? 'yes' : '' }}` **is not empty**; no format-specific logic.
- [ ] **IF True** is connected to **STT**; **IF False** to the text-only branch.
- [ ] **STT** body is `multipart/form-data`, with:
  - `file` = binary from property **`audio`**
  - `model` = `ink-whisper`
  - `language` = `en`
- [ ] STT headers include `Authorization: Bearer <token>` and `Cartesia-Version: 2025-04-16`.

With this setup, whatever Cartesia-acceptable format the IF node receives in `binary.audio` is exactly what gets sent to STT.
