// N8N Code node: build { message, audio } for Respond to Webhook
// The chat UI uses the "message" field for the bubble text and adds it to chat history.
// Input: item from TTS HTTP Request (binary.data = MP3) and upstream LLM reply (e.g. json.textToSpeak, json.llmReply, json.message)
// Output: single item with json = { message, audio?: { data, format: "mp3" } }

const item = $input.first();
const reply = item.json?.textToSpeak ?? item.json?.llmReply ?? item.json?.message ?? item.json?.text ?? '';
const binary = item.binary?.data;

if (!reply) return [{ json: { message: 'No reply.', audio: null } }];

const out = { message: reply };
if (binary) {
  const buffer = await this.helpers.getBinaryDataBuffer(0, 'data');
  const base64 = Buffer.from(buffer).toString('base64');
  out.audio = { data: base64, format: 'mp3' };
}

return [{ json: out }];
