import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/** Proxy Cartesia TTS in dev so the API key stays server-side (avoids CORS + wrong voice). */
function cartesiaTtsProxyPlugin(mode: string) {
  return {
    name: "cartesia-tts-proxy",
    configureServer(server: { middlewares: { use: (fn: (req: any, res: any, next: () => void) => void) => void } }) {
      const env = loadEnv(mode, process.cwd(), "");
      const apiKey =
        env.VITE_CARTESIA_API_KEY ||
        env.CARTESIA_API_KEY ||
        process.env.VITE_CARTESIA_API_KEY ||
        process.env.CARTESIA_API_KEY;
      const model = env.VITE_CARTESIA_TTS_MODEL || env.CARTESIA_TTS_MODEL || "sonic-turbo";
      const voiceId = env.VITE_CARTESIA_VOICE_ID || env.CARTESIA_VOICE_ID || "95131c95-525c-463b-893d-803bafdf93c4";
      const speed = Number(env.VITE_CARTESIA_TTS_SPEED || env.CARTESIA_TTS_SPEED || "1.05") || 1.05;

      server.middlewares.use((req: any, res: any, next: () => void) => {
        if (req.url !== "/api/cartesia-tts" || req.method !== "POST") {
          next();
          return;
        }
        let body = "";
        req.setEncoding("utf8");
        req.on("data", (chunk: string) => {
          body += chunk;
        });
        req.on("end", async () => {
          try {
            if (!apiKey?.trim()) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Cartesia API key not set (VITE_CARTESIA_API_KEY or CARTESIA_API_KEY in .env)" }));
              return;
            }
            const parsed = JSON.parse(body || "{}");
            const transcript = (parsed.transcript || "").trim();
            if (!transcript) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "transcript required" }));
              return;
            }
            const cartesiaRes = await fetch("https://api.cartesia.ai/tts/bytes", {
              method: "POST",
              headers: {
                "Cartesia-Version": "2025-04-16",
                "X-API-Key": apiKey.trim(),
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model_id: parsed.model_id || model,
                transcript,
                voice: { mode: "id", id: parsed.voice_id || voiceId },
                output_format: { container: "mp3" },
                language: "en",
                generation_config: { speed: parsed.speed ?? speed, volume: 1 },
              }),
            });
            if (!cartesiaRes.ok) {
              const text = await cartesiaRes.text();
              res.writeHead(cartesiaRes.status, { "Content-Type": "text/plain" });
              res.end(text);
              return;
            }
            const buf = await cartesiaRes.arrayBuffer();
            res.writeHead(200, { "Content-Type": "audio/mpeg" });
            res.end(Buffer.from(buf));
          } catch (e) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: String(e) }));
          }
        });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "127.0.0.1",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // Proxy n8n webhook requests to avoid CORS issues in development
    proxy: {
      "/api/n8n": {
        target: "https://n8n.hempstarai.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/n8n/, ""),
        secure: true,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("Proxy error:", err);
          });
        },
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "development" && cartesiaTtsProxyPlugin(mode),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  publicDir: "public",
}));
