# Repository Instructions

JARVIS is a portfolio voice assistant with a Node.js/Express server and a single-file browser frontend.

Primary files:
- `server.js`: API gateway, realtime SDP relay, STT/chat/TTS endpoints, web-search proxy, health endpoint.
- `public/index.html`: WebRTC client, pipeline VAD, audio recording, playback queue, state machine, and cost UI.
- `workspace/SOUL.md`: public demo instructions returned by `/config`.

Validation:
- Run `npm run check` after server changes.
- Run `npm run audit:prod` after dependency changes.
- Start with `npm start` and verify `/health`.

Security:
- Do not commit `.env`, real API keys, scraped provider docs, generated dumps, or local assistant state.
- Keep AI provider calls on the server side.
- Treat `workspace/SOUL.md` as public.
