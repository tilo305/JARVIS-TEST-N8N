# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Configuration

Create a `.env` file in the project root (copy from `.env.example`). Supported variables:

| Variable | Purpose |
|--------|--------|
| `VITE_N8N_WEBHOOK_URL` | Override the default N8N webhook. If unset, the app uses the built-in default. |
| `VITE_CARTESIA_API_KEY` | Cartesia API key for the "still here" prompt TTS. If set, that line uses the same Cartesia voice as N8N; otherwise the app uses browser TTS. |
| `VITE_CARTESIA_TTS_MODEL` | Cartesia TTS model (e.g. `sonic-3`). Default: `sonic-3`. |
| `VITE_CARTESIA_VOICE_ID` | Cartesia voice ID. Default: `95131c95-525c-463b-893d-803bafdf93c4`. |

Example `.env` for Cartesia "still here" TTS (use your own API key):

```
VITE_CARTESIA_API_KEY=your_cartesia_api_key_here
VITE_CARTESIA_TTS_MODEL=sonic-3
VITE_CARTESIA_VOICE_ID=95131c95-525c-463b-893d-803bafdf93c4
```

- **Default webhook:** `https://n8n.hempstarai.com/webhook-test/170d9a22-bac0-438c-9755-dc79b961d36e`

**Using webhook-test:** The test URL only works when the n8n workflow is in test mode. In n8n, open the workflow, click **Execute workflow**, then send a message or run `npm run test:webhook` within a short window. For always-on use, switch to the **Production** webhook URL (`/webhook/...`) and activate the workflow.

### Testing the webhook

```sh
npm run test:webhook        # text-only POST
npm run test:webhook:audio  # multipart POST with audio (minimal WAV) to same URL
```

Use the same webhook URL in your n8n workflow and in the app to test voice (STT/TTS) flows.

### Agentic design patterns

The app and n8n workflows implement ideas from *Agentic Design Patterns: A Hands-On Guide to Building Intelligent Systems*:

- **Routing:** The frontend sends optional `intent` (`booker` | `info` | `general`) in the webhook body so n8n can branch by intent. See **docs/AGENTIC-PATTERNS-IN-JARVIS-N8N.md** for the full pattern map.
- **Prompt chaining:** See **workflows/AGENTIC-PROMPT-CHAINING.md** for a 2-step (summarize → reply) workflow sketch.
- **Parallelization:** See **workflows/AGENTIC-PARALLELIZATION.md** for parallel branches + merge + synthesize in n8n.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
