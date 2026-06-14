# API

Base URL in local development: `http://localhost:3000`.

## GET /health

Readiness endpoint for local checks and hosting probes.

Response:

```json
{
  "status": "ok",
  "service": "jarvis-voice-assistant",
  "defaultMode": "pipeline",
  "openaiConfigured": true,
  "groqConfigured": true
}
```

## GET /config

Returns frontend boot configuration.

```json
{
  "instructions": "contents of workspace/SOUL.md",
  "defaultMode": "pipeline"
}
```

`instructions` is public by design because the browser uses it to configure the voice session.

## POST /session

Creates a realtime WebRTC session.

- Request body: SDP offer as `application/sdp`.
- Response body: SDP answer as `application/sdp`.
- Requires `OPENAI_API_KEY`.
- Validates that the SDP body starts with `v=`.
- Applies the session rate limiter.

## POST /api/transcribe

Transcribes audio in pipeline mode.

- Request body: `multipart/form-data` with an `audio` file field.
- Max audio payload: 10 MB.
- Requires `GROQ_API_KEY`.

Success:

```json
{
  "text": "transcribed text"
}
```

## POST /api/chat

Streams a chat completion in pipeline mode.

Request:

```json
{
  "messages": [
    { "role": "user", "content": "What should I do next?" }
  ]
}
```

Response: `text/event-stream`.

SSE events:

```json
{ "type": "content", "content": "text delta" }
{ "type": "tool_start", "tool": "web_search", "query": "query" }
{ "type": "tool_end", "tool": "web_search" }
{ "type": "done" }
{ "type": "error", "message": "error message" }
```

## POST /api/synthesize

Creates MP3 audio from text.

Request:

```json
{
  "text": "Text to speak.",
  "voice": "ash"
}
```

Response: `audio/mpeg`.

The server truncates input text to 2000 characters.

## POST /tools/web-search

Search proxy used by the chat tool loop.

Request:

```json
{
  "query": "current topic"
}
```

Response:

```json
{
  "result": "answer text",
  "usage": {}
}
```
