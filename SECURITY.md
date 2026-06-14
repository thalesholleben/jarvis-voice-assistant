# Security Policy

## Supported Versions

This is a portfolio prototype. Security fixes target the current `main` branch.

## Reporting A Vulnerability

Open a private report through GitHub Security Advisories if available, or contact the maintainer directly through the profile linked to the repository.

Do not include real API keys, tokens, or private logs in public issues.

## Secret Handling

- `.env` is ignored and must stay local.
- `.env.example` contains placeholders only.
- Provider keys are used only by `server.js`.
- The browser receives configuration and public demo instructions, never provider credentials.

If a key may have been exposed in local files, logs, screenshots, or old private history, rotate it before publishing the repository.
