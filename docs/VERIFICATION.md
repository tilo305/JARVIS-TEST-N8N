# Verification Checklist – Cartesia + N8N Setup

Use this **after** you’ve implemented the [Cartesia N8N optimal setup](./CARTESIA_N8N_OPTIMAL_SETUP.md) and deployed the workflow.

## 1. Webhook contract

From the project root:

```bash
npm run test:webhook
# or with your URL:
N8N_WEBHOOK_URL="https://your-n8n/webhook/..." npm run test:webhook
# or:
node scripts/test-webhook.mjs "https://your-n8n/webhook/..."
```

- **Pass:** Exits `0`, prints `OK`, `Message: ...`, and optionally `Audio: ...`.
- **Fail:** Exits `1`. Typical causes:
  - **"Response body is empty"** → Webhook not configured to return JSON. Set Respond = **Using 'Respond to Webhook' Node** and add a Respond to Webhook node that returns `{ message, audio? }`.
  - **"Response missing message..."** → Respond to Webhook body must include `message` (or `response` / `text` / `content`).

Do **not** proceed to frontend E2E until this step passes.

## 2. Frontend E2E (manual)

1. **Start the app**
   ```bash
   npm run dev
   ```
2. Open the app (e.g. `http://localhost:8080`).
3. **Text message**
   - Type e.g. `Hello` and send.
   - You should see an assistant reply. If the workflow returns `audio`, a **Play** button appears next to the reply.
4. **Voice message** (if you have STT in the workflow)
   - Use the mic, speak, let VAD stop, then send.
   - You should see a reply (and optionally play button) as above.
5. **Play reply**
   - If the reply has a play button, click it. The N8N/Cartesia TTS audio should play.

## 3. Summary

| Step | Command / Action | Pass condition |
|------|------------------|----------------|
| Webhook | `npm run test:webhook` | Exit 0, `OK` + `Message` |
| Frontend | `npm run dev` → send message | Reply visible, optional play works |

If any step fails, check [CARTESIA_N8N_OPTIMAL_SETUP.md](./CARTESIA_N8N_OPTIMAL_SETUP.md) and your n8n workflow (Webhook, Respond to Webhook, Cartesia STT/TTS, LLM).
