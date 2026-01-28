# Cartesia STT + TTS: Optimal Bidirectional Flow

**Simple flow:** User speaks or types → N8N turns speech into text (STT) → LLM replies → N8N turns reply into speech (TTS) → frontend shows text and plays audio.

---

## 1. The flow (minimal)

```
Webhook (POST, raw body)
    ↓
Has audio? 
    YES → PCM→WAV (Code) → Cartesia STT → transcript
    NO  → use body.message as transcript
    ↓
LLM (transcript → reply text)
    ↓
Cartesia TTS (reply → MP3 binary)
    ↓
Build { message, audio } → Respond to Webhook
```

One request, one response. No streaming, no extra branches except “audio vs text”.

---

## 2. Cartesia STT (speech → text)

| What | Value |
|------|--------|
| **Endpoint** | `POST https://api.cartesia.ai/stt` |
| **Model** | `ink-whisper` |
| **Input** | WAV, 16 kHz, mono, 16‑bit PCM |
| **Auth** | `Authorization: Bearer <api_key>`, `Cartesia-Version: 2025-04-16` |
| **Body** | Form-data: `file` (WAV binary), `model=ink-whisper`, `language=en` |

- Frontend sends PCM base64 in `audio.data`. Use a **Code** node to decode → add WAV header → binary, then send that as `file` to STT.
- STT returns `{ text, ... }`. Use `text` as the user **transcript** for the LLM.

---

## 3. Cartesia TTS (text → speech)

| What | Value |
|------|--------|
| **Endpoint** | `POST https://api.cartesia.ai/tts/bytes` |
| **Model** | `sonic-turbo` (fast) or `sonic-3` (quality) |
| **Output** | MP3 (`output_format: { container: "mp3" }`) |
| **Auth** | Same as STT |

**Body (JSON):**

```json
{
  "model_id": "sonic-turbo",
  "transcript": "<LLM reply text>",
  "voice": { "mode": "id", "id": "f786b574-daa5-4673-aa0c-cbe3e8534c02" },
  "output_format": { "container": "mp3" },
  "language": "en"
}
```

- Configure the HTTP node to return **binary** (response format = File, output field e.g. `data`).
- In a **Code** node: base64-encode that binary and put it in `audio.data` in the webhook response.

---

## 4. What to do with your workflow

1. **Webhook**  
   - POST, **Raw body** on.  
   - Respond = **Using “Respond to Webhook” node**.

2. **Input**  
   - From `body`: `message` (optional text), `audio` (optional) with `audio.data` (base64 PCM).

3. **Branch: audio vs text**  
   - If `body.audio?.data` exists:  
     - Code: base64 PCM → WAV binary.  
     - HTTP: Cartesia STT (form-data `file` = that binary).  
     - Use `text` as **transcript**.  
   - If not: use `body.message` as **transcript**.

4. **LLM**  
   - Input: **transcript**.  
   - Output: **reply text** (e.g. `llmReply`).

5. **Cartesia TTS**  
   - Input: **reply text** as `transcript` in the JSON body above.  
   - Output: MP3 **binary**.

6. **Respond to Webhook**  
   - Return JSON:
     ```json
     {
       "message": "<reply text>",
       "audio": { "data": "<base64 MP3>", "format": "mp3" }
     }
     ```
   - Use a **Code** node before “Respond to Webhook” to build this object (including base64 from TTS binary).

7. **Credentials**  
   - One **Cartesia API** Header Auth credential:  
     `Authorization: Bearer <your_key>`  
   - Use it for both STT and TTS HTTP nodes.

---

## 5. Bidirectional summary

| Direction | Node | In | Out |
|-----------|------|----|-----|
| User → N8N | Webhook | `message`, optional `audio` | — |
| Speech → text | Cartesia STT | WAV (`file`) | `text` → transcript |
| Text → reply | LLM | transcript | reply text |
| Reply → speech | Cartesia TTS | reply text (`transcript`) | MP3 binary |
| N8N → frontend | Respond to Webhook | `message` + `audio.data` (base64) | JSON response |

Frontend: send `message` and/or `audio` → receive `message` + `audio` → display text, decode base64, play audio. That’s the full bidirectional loop.
