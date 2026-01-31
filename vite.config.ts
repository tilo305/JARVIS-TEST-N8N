import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 8080,
    open: true, // Automatically open browser when dev server starts
    hmr: {
      overlay: false,
    },
    watch: {
      // Reduce file watching overhead on Windows
      usePolling: false,
      interval: 1000,
      // Exclude large directories from watching
      ignored: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.git/**",
        "**/debug/**",
        "**/workflows/**",
        "**/websocket-proxy/node_modules/**",
        "**/websocket-proxy/dist/**",
      ],
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // Exclude problematic packages from pre-bundling
    exclude: ['lamejs'],
    // Force re-optimization if needed
    force: false,
  },
  publicDir: "public",
  // Improve build performance
  build: {
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 1000,
  },
});
