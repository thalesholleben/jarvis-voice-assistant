# Contributing

This repository is maintained primarily as a portfolio project, but issues and pull requests are welcome.

## Local Setup

```bash
npm install
cp .env.example .env
npm start
```

Use placeholder keys only for static UI checks. Realtime voice, transcription, chat, TTS, and web search require real provider keys.

## Development Rules

- Do not commit `.env`, credentials, generated provider documentation, scraped pages, or local assistant state.
- Keep the frontend dependency-free unless the change clearly justifies a build step.
- Keep provider credentials behind `server.js`; the browser must not receive API keys.
- Run `npm run check` and `npm run audit:prod` before opening a pull request.

## Pull Request Checklist

- The app starts with `npm start`.
- `/health` returns `status: "ok"`.
- Public docs still match the actual routes and scripts.
- No references to local-only tooling or private repository history remain.
