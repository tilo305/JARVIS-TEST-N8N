import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Load debug tools in development
if (import.meta.env.DEV) {
  import("../debug/index.ts").catch(() => {
    // Debug tools are optional, don't fail if they can't load
  });
}

// Error handling for root rendering
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found. Make sure there's a <div id='root'></div> in your HTML.");
}

try {
  const root = createRoot(rootElement);
  root.render(<App />);
} catch (error) {
  console.error("Failed to render app:", error);
  rootElement.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; font-family: sans-serif;">
      <h1 style="color: #ef4444; margin-bottom: 1rem;">Failed to load application</h1>
      <p style="color: #6b7280; margin-bottom: 1rem;">${error instanceof Error ? error.message : 'Unknown error'}</p>
      <button onclick="window.location.reload()" style="padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.25rem; cursor: pointer;">
        Reload Page
      </button>
    </div>
  `;
}
