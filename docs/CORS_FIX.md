# Fixing CORS Issues with n8n Webhook

## Problem

When running the frontend on `http://localhost:8080` and trying to connect to an n8n webhook at `https://n8n.hempstarai.com`, you may encounter CORS (Cross-Origin Resource Sharing) errors:

```
Access to fetch at 'https://n8n.hempstarai.com/webhook/...' from origin 'http://localhost:8080' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solutions

### Option 1: Configure CORS on n8n Server (Recommended for Production)

If you have access to the n8n server configuration, add CORS headers:

**For n8n self-hosted:**
1. Configure n8n to allow CORS by setting environment variables:
   ```bash
   N8N_CORS_ORIGIN=http://localhost:8080,https://your-production-domain.com
   ```

2. Or configure in n8n settings if available in your version.

**For n8n cloud:**
- CORS configuration may be limited. Contact n8n support or use Option 2.

### Option 2: Use a Development Proxy (Recommended for Local Development)

Create a Vite proxy to forward requests through your dev server:

**1. Update `vite.config.ts`:**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/n8n': {
        target: 'https://n8n.hempstarai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/n8n/, ''),
        secure: true,
      },
    },
  },
});
```

**2. Update `src/lib/config.ts` to use proxy in development:**

```typescript
const isDevelopment = import.meta.env.DEV;
const webhookPath = '/webhook-test/170d9a22-bac0-438c-9755-dc79b961d36e';

export const config = {
  n8nWebhookUrl: isDevelopment
    ? `/api/n8n${webhookPath}`  // Use proxy in dev
    : (trimmed || defaultWebhook),  // Use direct URL in production
} as const;
```

### Option 3: Use Browser Extension (Development Only)

Install a CORS browser extension (e.g., "CORS Unblock" or "Allow CORS") for local development only. **Never use this in production.**

### Option 4: Deploy Frontend to Same Domain

If possible, serve the frontend from the same domain as n8n (e.g., `https://n8n.hempstarai.com/app`), which eliminates CORS issues.

## Testing the Fix

After implementing a solution:

1. **Check connection status:**
   - The ChatHeader should show "Connected" status
   - No CORS errors in browser console

2. **Test sending a message:**
   - Send a text message
   - Verify response appears
   - Check browser console for errors

3. **Test with audio:**
   - Click microphone button
   - Speak and send
   - Verify audio is processed

## Current Status

The application now:
- ✅ Detects CORS errors and shows helpful error messages
- ✅ Handles CORS gracefully in connection checks
- ✅ Provides clear error feedback to users

## Next Steps

Choose one of the solutions above based on your setup:
- **Local development:** Use Option 2 (Vite proxy)
- **Production:** Use Option 1 (Configure n8n CORS)
- **Quick test:** Use Option 3 (Browser extension) temporarily
