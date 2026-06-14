# Public GitHub Publication

This project should be published as a clean portfolio repository, not by making the old private repository public.

## Why Use Fresh History

The previous private history included local assistant state, scraped/reference files, and a remote named for a different project. Even if those files are deleted in the latest commit, they still exist in Git history.

Use a new public repository with a clean first commit, or push an orphan branch to a new empty repository.

## Before Publishing

1. Rotate provider keys that may have existed in old `.env` files, logs, screenshots, or private history.
2. Confirm `.env` is not tracked.
3. Run `npm run check`.
4. Run `npm run audit:prod`.
5. Run a secret scan.
6. Confirm no references remain to local-only assistant tooling.

## Recommended Repository Metadata

Description:

```text
Browser voice assistant with WebRTC realtime mode, STT/LLM/TTS pipeline, VAD, web search, and cost tracking.
```

Topics:

```text
voice-ai, realtime-ai, webrtc, speech-to-text, text-to-speech, nodejs, express, openai-api, groq, javascript, portfolio-project
```

## Clean Publish Option

From the prepared working tree:

```bash
git switch --orphan public-main
git add .
git commit -m "chore: prepare public portfolio release"
git remote remove origin
git remote add origin https://github.com/<user>/<new-public-repo>.git
git push -u origin public-main:main
```

Only do this after verifying the branch contains the cleaned file set.
