# AudioWorklet Connection Error Debugging Guide

## Quick Debug Steps

### 1. Check Browser Console
Open the browser console (F12) and look for:
- `🔍 Checking AudioWorklet processor file: /audio-capture-processor.js`
- `📡 File check response:` - Shows if file is accessible
- `📦 Loading AudioWorklet module:` - Shows module loading attempt
- `❌ AudioWorklet addModule failed:` - Shows the actual error

### 2. Run Diagnostic Tool
In the browser console, type:
```javascript
await debugAudioWorklet()
```

This will run comprehensive diagnostics and show:
- ✅/❌ Secure context status
- ✅/❌ AudioWorklet support
- ✅/❌ File accessibility
- Detailed error messages

### 3. Common Issues & Solutions

#### Issue: "Failed to fetch" or "404"
**Problem:** The processor file isn't being served correctly.

**Solutions:**
1. Check that `public/audio-capture-processor.js` exists
2. Verify the dev server is running (`npm run dev`)
3. Try accessing `http://localhost:8080/audio-capture-processor.js` directly in browser
4. Check Vite config has `publicDir: "public"`

#### Issue: "CORS" or "Cross-Origin" error
**Problem:** File is being blocked by CORS policy.

**Solutions:**
1. Ensure file is served from same origin (localhost:8080)
2. Check Vite server configuration
3. Verify no proxy or CDN is interfering

#### Issue: "AudioContext is suspended"
**Problem:** AudioContext needs user interaction to start.

**Solutions:**
1. Click or tap anywhere on the page first
2. The code now auto-resumes, but user gesture is required initially

#### Issue: "AudioWorkletGlobalScope" error
**Problem:** Module registration timing issue.

**Solutions:**
1. The code now waits 100ms after loading (increased from 50ms)
2. Try refreshing the page
3. Check browser console for detailed error

#### Issue: "Not in secure context"
**Problem:** AudioWorklet requires HTTPS or localhost.

**Solutions:**
1. Use `http://localhost:8080` (not `127.0.0.1`)
2. Or use HTTPS
3. Check browser shows secure context in console

### 4. Verify File Location

The processor file should be at:
- **Source:** `public/audio-capture-processor.js`
- **Build:** `dist/audio-capture-processor.js`
- **URL:** `http://localhost:8080/audio-capture-processor.js`

### 5. Test File Access

In browser console:
```javascript
// Test if file is accessible
fetch('/audio-capture-processor.js', { method: 'HEAD' })
  .then(r => console.log('Status:', r.status, r.ok ? '✅' : '❌'))
  .catch(e => console.error('Error:', e));
```

### 6. Check Network Tab

1. Open DevTools → Network tab
2. Filter by "audio-capture-processor"
3. Try to start recording
4. Check if request appears and what status code

### 7. Browser Compatibility

AudioWorklet requires:
- Chrome 66+
- Firefox 76+
- Edge 79+
- Safari 14.5+

Check support:
```javascript
const ctx = new AudioContext();
console.log('AudioWorklet supported:', 'audioWorklet' in ctx);
```

## Enhanced Error Messages

The code now provides detailed logging:
- 🔍 File checking steps
- 📡 Network response details
- 📦 Module loading progress
- ✅ Success confirmations
- ❌ Detailed error information

All errors are logged with full context to help identify the issue.

## Manual Testing

1. Start dev server: `npm run dev`
2. Open browser to `http://localhost:8080`
3. Open console (F12)
4. Click microphone button
5. Watch console for diagnostic messages
6. If error occurs, run `await debugAudioWorklet()` for full diagnostics

## Still Having Issues?

If you're still getting connection errors:

1. **Check the exact error message** in console - it now includes detailed information
2. **Run diagnostics:** `await debugAudioWorklet()` in console
3. **Verify file exists:** Check `public/audio-capture-processor.js` exists
4. **Check server:** Ensure dev server is running on port 8080
5. **Try different browser:** Test in Chrome (best AudioWorklet support)
6. **Check network tab:** See if file request is being made and what response

The enhanced error handling will now show you exactly what's failing and why.
