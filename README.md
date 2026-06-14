# JARVIS Voice Assistant

Portfolio-grade browser voice assistant built with Node.js, Express, WebRTC, streaming chat, speech-to-text, text-to-speech, tool calling, voice activity detection, and local cost tracking.

This project demonstrates how to keep AI provider credentials on the server while exposing a polished browser voice interface. It supports two interaction modes: a low-cost pipeline mode and a realtime WebRTC mode.

## Why This Project Exists

Most voice assistant demos are either a UI mockup or a direct client-side API call. JARVIS is built as a working full-stack prototype with the security boundary in the right place:

- The browser handles microphone capture, realtime UI state, VAD, playback, and interaction.
- The Node.js server owns provider credentials, request validation, rate limits, and API proxying.
- The app can switch between low-cost STT/LLM/TTS and live WebRTC conversation.

## Portfolio Highlights

- WebRTC session relay for realtime voice conversations.
- STT -> LLM -> TTS pipeline for cheaper voice turns.
- Client-side VAD with sensitivity controls and silence debounce.
- SSE streaming chat with tool-call loop for web search.
- Sequential sentence-level TTS playback queue.
- Conversation memory with manual clear and automatic summarization.
- Cost estimation UI for realtime audio, text, STT, TTS, and web search.
- Minimal Express backend with CORS allowlist, rate limiting, security headers, and a health endpoint.

## Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js 18+ |
| Backend | Express |
| Security | helmet, CORS allowlist, express-rate-limit |
| Realtime voice | OpenAI Realtime API over WebRTC |
| Pipeline STT | Groq Whisper |
| Pipeline LLM | OpenAI chat completions with SSE |
| Pipeline TTS | OpenAI speech API |
| Upload parsing | busboy |
| Frontend | Single-file HTML/CSS/JavaScript |

## Architecture

```text
Browser UI
  |-- Realtime mode: SDP offer -> Express relay -> OpenAI Realtime -> SDP answer
  |-- Pipeline mode: audio blob -> Express -> Groq STT -> OpenAI LLM -> OpenAI TTS
  |-- Tool mode: chat tool call -> Express web-search proxy -> OpenAI Responses API
```

The frontend never receives `OPENAI_API_KEY` or `GROQ_API_KEY`.

## Quick Start

```bash
npm install
cp .env.example .env
npm start
```

Open `http://localhost:3000`.

The UI and `/health` route work without provider keys. Voice, transcription, chat, TTS, and web search require real API keys in `.env`.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes for realtime/chat/TTS/search | Server-side OpenAI API key |
| `GROQ_API_KEY` | Yes for pipeline STT | Server-side Groq API key |
| `DEFAULT_MODE` | No | `pipeline` or `realtime`; defaults to `pipeline` |
| `REALTIME_MODEL` | No | Realtime model override |
| `PORT` | No | HTTP port; defaults to `3000` |
| `ALLOWED_ORIGIN` | Production | Extra allowed browser origin |
| `TRUST_PROXY` | Production behind proxy | Set to `true` behind a trusted reverse proxy |

## Scripts

```bash
npm start       # run the server
npm run dev     # run with node --watch
npm run check   # syntax-check server.js
npm run audit:prod
```

## Repository Map

```text
server.js             Express server, API gateway, rate limits, provider calls
public/index.html     Browser UI, WebRTC client, VAD, audio queue, cost UI
workspace/SOUL.md     Public demo instructions loaded by the server
docs/                 Architecture, API, security, and publication notes
AGENTS.md             LLM/agent orientation for this repository
llms.txt              LLM-readable entrypoint for project context
```

## Review Guide For Recruiters

Start with these files:

1. `server.js` - security boundary, realtime relay, streaming chat, STT/TTS endpoints.
2. `public/index.html` - state machine, WebRTC client, VAD, and audio playback queue.
3. `docs/architecture.md` - system design and tradeoffs.
4. `docs/security.md` - what is protected, what is intentionally out of scope.

## Security Notes

This is a portfolio prototype, not a multi-user SaaS. It includes server-side secrets, CORS checks, rate limits, request validation, and basic security headers. It does not include user authentication, billing controls, persistent storage, or distributed rate limiting.

Before publishing or deploying, rotate any keys that may have existed in local `.env` files or old private repository history.

## Recommended GitHub Metadata

Repository description:

```text
Browser voice assistant with WebRTC realtime mode, STT/LLM/TTS pipeline, VAD, web search, and cost tracking.
```

Topics:

```text
voice-ai, realtime-ai, webrtc, speech-to-text, text-to-speech, nodejs, express, openai-api, groq, javascript, portfolio-project
```

## License

MIT.
