# Respond in text – Chat history for text and voice

The workflow is set up so that **every** request (typed message or mic/audio) activates the webhook and always sends a **text** reply for the chat interface.

## Flow

1. **Webhook** receives the request (text and/or audio).
2. **If** (Has Audio?):
   - **TRUE (mic/audio):** PCM to WAV → STT → **AI Agent** → AI Agent1 → Set textToSpeak → TTS → Build TTS response → **Respond in text** → Respond to Webhook
   - **FALSE (typed only):** Set Transcript (from message) → **AI Agent** → AI Agent1 → Set textToSpeak → TTS → Build TTS response → **Respond in text** → Respond to Webhook

3. **Respond in text**  
   Both branches go through this node. It guarantees the payload has a `message` (and optional `audio`) so the chat UI can:
   - Show the reply text in chat history
   - Play TTS when audio is present

4. **Respond to Webhook**  
   Sends that payload back to the chatbot. The frontend uses `message` for the bubble text and `audio` for playback.

## Summary

| User action              | Webhook? | Path                          | Respond in text? | Text in chat? |
|--------------------------|----------|-------------------------------|------------------|---------------|
| Type message + Send      | ✓        | Set Transcript → AI → …        | ✓                | ✓             |
| Click mic, speak, send   | ✓        | PCM → STT → AI → …            | ✓                | ✓             |

So both “chatbot text send” and “mic button” activate the webhook and both hit **Respond in text**, so the chat history always gets the reply as text (and optional audio).
