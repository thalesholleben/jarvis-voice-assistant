# Security Model

## Protected Assets

- `OPENAI_API_KEY`
- `GROQ_API_KEY`
- Browser microphone access
- Provider usage and cost exposure

## Controls Implemented

- API keys stay on the server and are never sent to the browser.
- `.env` and `.env.*` are ignored; `.env.example` is the only committed env file.
- CORS allowlist permits localhost and an optional production origin.
- `/session`, `/tools/web-search`, and `/api/*` have rate limits.
- SDP input is minimally validated before relay.
- Audio upload size is capped at 10 MB.
- Express `x-powered-by` is disabled.
- Helmet is enabled for baseline HTTP security headers.
- `/health` exposes configuration presence only as booleans, never secret values.

## Known Limitations

- No user authentication.
- No billing quota per user.
- No database-backed session storage.
- No distributed rate limiter.
- Content Security Policy is disabled because the frontend is intentionally single-file with inline CSS and JavaScript.
- `workspace/SOUL.md` is public because `/config` returns it to the frontend.

## Public Release Checklist

- Rotate any OpenAI and Groq keys that may have been exposed before publication.
- Publish from a fresh Git history if an old private repository contained secrets, local tooling state, scraped vendor docs, or private prompts.
- Run a secret scan before pushing.
- Keep `.env` local only.
- Review screenshots and demos for visible keys or private prompts.
