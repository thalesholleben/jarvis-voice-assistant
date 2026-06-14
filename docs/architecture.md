# Architecture

JARVIS has two voice modes that share the same browser UI and Express server.

## Components

```text
Browser
  public/index.html
  - microphone permission and capture
  - WebRTC client
  - client-side VAD
  - local conversation memory
  - TTS playback queue
  - usage and cost display

Server
  server.js
  - static file hosting
  - CORS allowlist
  - rate limiting
  - provider API gateway
  - realtime SDP relay
  - STT, chat, TTS, and web-search endpoints

Prompt
  workspace/SOUL.md
  - public demo behavior instructions
  - served to the browser by GET /config
```

## Realtime Mode

```text
Browser -> POST /session with SDP offer -> server.js -> OpenAI Realtime API
Browser <- SDP answer -------------------- server.js <- OpenAI Realtime API

After the handshake, voice audio flows through WebRTC between the browser and
the realtime provider. The server only handles the session setup and keeps the
API key private.
```

This mode prioritizes latency and natural turn-taking.

## Pipeline Mode

```text
Browser microphone
  -> client-side VAD
  -> MediaRecorder audio blob
  -> POST /api/transcribe
  -> Groq Whisper transcription
  -> POST /api/chat with conversation history
  -> OpenAI streamed chat response
  -> sentence chunks
  -> POST /api/synthesize
  -> MP3 playback queue
```

This mode prioritizes cost control and inspectable application logic.

## Tool Calling

`POST /api/chat` exposes a `web_search` tool to the model. When the model calls the tool, the server performs the search through `POST /tools/web-search`, appends the tool result to the conversation, and continues streaming the answer.

## Tradeoffs

- The single-file frontend makes the project easy to run and inspect, but it is not ideal for a large product.
- Conversation memory is stored in the browser, not a database.
- Rate limiting is in memory, which is acceptable for a demo but not for distributed production deployments.
- Security headers are enabled, but CSP is intentionally disabled because the current frontend uses inline CSS and JavaScript.
