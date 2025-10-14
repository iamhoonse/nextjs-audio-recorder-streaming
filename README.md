# Next.js Audio Recorder Streaming

Real-time audio recording with HTTP streaming using MediaRecorder API and Next.js.

## Features

This project demonstrates **two different approaches** for streaming audio from the browser to the server:

### Method 1: Individual POST Requests (Recommended for Development)
- ✅ Works in all modern browsers
- ✅ Simple and reliable implementation
- ✅ No special server setup required
- Uses separate HTTP POST for each audio chunk

### Method 2: ReadableStream Body (Advanced)
- ✅ True HTTP streaming with single connection
- ✅ Lower overhead
- ⚠️ Requires Chrome 95+ or compatible browser
- ⚠️ Requires HTTP/2 (HTTPS)
- Uses Fetch API with ReadableStream request body

## Quick Start

### Option A: Standard Development (HTTP/1.1)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

**Method 1** (Individual POST) will work perfectly. **Method 2** (ReadableStream) will show an error because HTTP/2 is not available.

### Option B: Docker with HTTP/2 Support (Recommended for Testing Method 2)

#### Prerequisites
- Docker and Docker Compose installed
- OpenSSL (for generating SSL certificates)

#### Setup

1. **Generate SSL certificates:**
   ```bash
   ./generate-ssl-cert.sh
   ```

2. **Start the Docker services:**
   ```bash
   docker-compose up
   ```

3. **Access the application:**
   - Open [https://localhost](https://localhost) in your browser
   - You'll see a security warning (expected for self-signed certificates)
   - Click "Advanced" → "Proceed to localhost"

4. **Test both methods:**
   - Method 1 works as usual
   - Method 2 now works with HTTP/2!

#### Docker Architecture

```
Browser (HTTPS/HTTP2)
    ↓
NGINX (Port 443, SSL/TLS termination, HTTP/2)
    ↓
Next.js App (Port 3000, HTTP/1.1)
```

## Project Structure

```
.
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── audio-stream/route.ts          # Method 1: Individual POST handler
│   │   │   └── audio-stream-readable/route.ts # Method 2: ReadableStream handler
│   │   └── page.tsx                            # Main page with both methods
│   └── components/
│       ├── AudioRecorder.tsx                   # Method 1: Individual POST
│       └── AudioRecorderStream.tsx             # Method 2: ReadableStream
├── nginx/
│   ├── nginx.conf                              # NGINX config with HTTP/2
│   └── ssl/                                    # SSL certificates (generated)
├── Dockerfile                                  # Next.js container
├── docker-compose.yml                          # Docker orchestration
└── generate-ssl-cert.sh                        # SSL cert generation script
```

## How It Works

### Method 1: Individual POST Requests

1. MediaRecorder captures audio in 1-second chunks
2. Each chunk is sent via separate `fetch()` POST request
3. Server receives and processes each chunk independently
4. Works with standard HTTP/1.1

**src/components/AudioRecorder.tsx:72**
```typescript
const response = await fetch('/api/audio-stream', {
  method: 'POST',
  body: formData, // Each chunk sent separately
});
```

### Method 2: ReadableStream Body

1. MediaRecorder captures audio in 1-second chunks
2. Chunks are enqueued into a ReadableStream
3. Single `fetch()` request with stream as body
4. Server reads from stream continuously
5. Requires HTTP/2 (HTTPS)

**src/components/AudioRecorderStream.tsx:100**
```typescript
const readableStream = new ReadableStream({
  start(controller) {
    // MediaRecorder chunks are enqueued here
    controller.enqueue(audioChunkData);
  }
});

fetch('/api/audio-stream-readable', {
  method: 'POST',
  body: readableStream, // Single request, continuous stream
  duplex: 'half',
});
```

## Troubleshooting

### ERR_ALPN_NEGOTIATION_FAILED

This error occurs when trying Method 2 without HTTP/2 support.

**Solution:** Use Docker setup (`docker-compose up`) and access via `https://localhost`

### Certificate Error in Browser

When using Docker, you'll see "Your connection is not private" because we use self-signed certificates.

**Solution:** Click "Advanced" → "Proceed to localhost (unsafe)" - this is safe for local development.

### Method 2 Not Working in Docker

Make sure:
1. SSL certificates are generated: `./generate-ssl-cert.sh`
2. Docker containers are running: `docker-compose up`
3. Accessing via HTTPS: `https://localhost` (not `http://`)
4. Using Chrome 95+ or compatible browser

### Port Already in Use

If port 3000, 80, or 443 is already in use:

```bash
# Stop Docker containers
docker-compose down

# Or change ports in docker-compose.yml
```

## Technical Details

### Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Method 1 (Individual POST) | ✅ All versions | ✅ All versions | ✅ All versions | ✅ All versions |
| Method 2 (ReadableStream) | ✅ 95+ | ❌ Not yet | ❌ Not yet | ✅ 95+ |

### Server Implementation

Audio chunks are saved in the `uploads/` directory:
- Method 1: `uploads/session_*/chunk_*.webm`
- Method 2: `uploads/session_*/chunk_*.webm` + `full_audio.webm`

You can modify the server handlers to:
- Stream to Speech-to-Text APIs
- Process audio in real-time
- Forward to other services
- Save in different formats

## Production Deployment

### Vercel / Netlify (HTTP/2 Native)

Both methods work automatically in production on platforms that support HTTP/2:

```bash
npm run build
# Deploy to Vercel
```

### Custom Server

Ensure your reverse proxy (NGINX, Caddy, etc.) has:
- HTTP/2 enabled
- SSL/TLS configured
- Request buffering disabled for `/api/audio-stream-readable`

## Learn More

- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Fetch Streaming Uploads](https://web.dev/articles/fetch-upload-streaming)
- [Next.js Documentation](https://nextjs.org/docs)
- [HTTP/2 Overview](https://developers.google.com/web/fundamentals/performance/http2)

## License

MIT
