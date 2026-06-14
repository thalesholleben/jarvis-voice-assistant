# Repository Instructions

This is a small portfolio project: a browser voice assistant with a Node.js gateway and a single-file frontend.

Key files:
- `server.js`: Express app, provider gateway, `/session`, `/api/*`, `/tools/web-search`, `/health`.
- `public/index.html`: UI, WebRTC client, VAD, pipeline audio flow, cost display.
- `workspace/SOUL.md`: public demo instructions served by `/config`.
- `docs/`: architecture, API, security, and publication notes.

Useful commands:
- `npm install`
- `npm start`
- `npm run dev`
- `npm run check`
- `npm run audit:prod`

Safety rules:
- Never commit `.env`, real API keys, generated provider docs, scraped pages, local assistant state, or private prompts.
- Keep provider credentials on the server side only.
- Treat `workspace/SOUL.md` as public because `/config` returns it to the browser.
- Prefer small, verifiable changes; this repo intentionally has no build step.
