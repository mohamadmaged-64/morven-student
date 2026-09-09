# Implementation Report — Remove Music from Video (Demucs)

## Summary

Added an end-to-end "إزالة الموسيقى من الفيديو" (remove music from video) tool to the Morven Student app. It uses [Demucs](https://github.com/adefossez/demucs) (htdemucs model) driven through a Python subprocess to separate vocals from music, then remuxes the original video stream with the separated vocals and also produces an audio-only MP3. The API follows the existing media-job pattern (202 + jobId, progress polling, single-consumer download), tracks **real** FFmpeg/Demucs progress (no fake percentages), caps separation concurrency, and works in the Docker/Railway deployment.

## What was delivered

### Backend

- **`POST /api/media/remove-music`** (`backend/src/routes/media.ts:265`, `backend/src/controllers/media.controller.ts:606`)
  Accepts a video as `multipart/form-data` (`file` key, `handleMediaUpload`, `MAX_VIDEO_SIZE_MB`). Returns `202 { jobId }`, or a typed error (`415`/`413`), `503 FFMPEG_NOT_AVAILABLE`, etc.
- **`GET /api/media/jobs/:id/download-audio`** (`backend/src/routes/media.ts:295`, controller `downloadAudio`)  — serves the secondary MP3 output **without** consuming the job's primary download claim, so clients can fetch both outputs. 404 for unknown jobs, 409 while processing.
- Job lifecycle is unchanged and reused: `POST` → poll `GET /api/media/jobs/:id/status` → `GET /api/media/jobs/:id/download` (streams video then deletes the job) → `DELETE /api/media/jobs/:id` to cancel.
- **`MediaService.removeMusic()`** (`backend/src/services/media/media.service.ts:619`) pipeline:
  1. Verify audio track exists (`ffprobe`); fail fast with `400 NO_AUDIO_TRACK`.
  2. Extract audio to WAV (16-bit PCM, 44.1 kHz, stereo) — progress 0.05→0.15.
  3. Run Demucs source separation (heavy step) — progress 0.15→0.75, mapped from real Demucs stdout/stderr stage strings (`Loading`/`Separating`/`Saving`/`complete`), *not* fabricated timing.
  4. Remux original video stream + separated vocals (stream-copy video, AAC 192k audio) — 0.80→0.90.
  5. Encode the separated vocals to MP3 (libmp3lame 192k) — 0.90→0.99.
  6. Verify outputs, delete intermediates, `emit(1)`.
- **`backend/src/services/media/demucs.service.ts`** (new):
  - Spawns `python3 scripts/separate_vocals.py <input.wav> <output_vocals.wav>` directly (`spawn`, no shell, no interpolation).
  - `separationEnv()` always injects `TORCH_HOME` (defaults to `<repo>/.model-cache/torch`, overridable), so the model cache is deterministic in dev and Docker.
  - Bounded semaphore `MAX_CONCURRENT_SEPARATIONS` (default 1) — Demucs is CPU/RAM heavy; queued runs respect `AbortSignal` so a client cancellation leaves the queue instead of hanging.
  - Hard timeout `SEPARATION_TIMEOUT_MS` (default 25 min) → `504 PROCESSING_TIMEOUT`; abort → `CANCELLED`; both SIGKILL the child.
  - stderr captured with a 64 KB bound and used **only** for server-side logging; clients never receive raw Demucs output.
  - `isDemucsAvailable()` probe (`import demucs`) used to decide whether the full pipeline can run.
- **`backend/scripts/separate_vocals.py`** (new): standalone Python entrypoint; loads the htdemucs model, separates to a temp dir, and moves `vocals.wav` to the output path.
- **`backend/scripts/preload-demucs-model.mjs`** (new): build-time model preload for Docker so production containers don't need model-registry access at runtime.
- **Error codes**: added `NO_AUDIO_TRACK` to `MediaErrorCode` (`media.types.ts`); both the probe and the FFmpeg-extraction fast-fail paths (`media.service.ts`) throw it.
- Wired `audioFileName`/`audioOutputPath` through the job record (`media-jobs.service.ts`); sweeping TTL already covers the new outputs.

### Frontend

- **`frontend/src/pages/tools/video/RemoveMusicTool.tsx** (new): Arabic RTL component using the existing `shared.tsx` primitives — upload zone, `ProcessingPanel` with real progress, before/after video preview, separate video + audio download buttons, library save, full error display. No fake progress; downloads audio before calling the consuming video download.
- **`frontend/src/services/mediaApi.ts`**: `removeMusicFromVideo(file, { onProgress, cancelRef })` → returns `{ videoBlob, audioBlob, ... }` by fetching audio (`/download-audio`) **before** the video (`/download`), because the video download deletes the job temp directory. Maps `NO_AUDIO_TRACK` → Arabic.
- **Tool registration**: `frontend/src/data/tools.ts` entry (id `remove-music`, `AudioLines` icon); `frontend/src/pages/tools/VideoTools.tsx` — ToolId union, TOOL_CONFIGS (SVG music icon), and re-export of `RemoveMusicTool`.

### Docker (`backend/Dockerfile`)

- Installs `python3 python3-pip` via apt on `node:22-bookworm`.
- PEP 668 handled with `--break-system-packages`.
- Installs **CPU-only** torch/torchaudio first (`--index-url https://download.pytorch.org/whl/cpu`) so `pip install demucs` keeps the CPU wheels (no CUDA bloat).
- `ENV TORCH_HOME=/app/.model-cache/torch` before the preload step.
- `RUN node scripts/preload-demucs-model.mjs || echo ...` (graceful offline skip), then the existing STT preload.
- `.dockerignore` does not exclude `scripts/`; `.model-cache/` added to `.gitignore`.

### Environment variables (documented in `backend/.env.example`)

| Var | Default | Meaning |
|---|---|---|
| `PYTHON_PATH` | `python3` | Python interpreter for separation |
| `SEPARATION_SCRIPT_PATH` | `<repo>/scripts/separate_vocals.py` | Override script location |
| `TORCH_HOME` | `<repo>/.model-cache/torch` | Demucs/torch model cache |
| `SEPARATION_TIMEOUT_MS` | `1500000` (25 min) | Hard timeout per separation (keep < `MEDIA_JOB_TTL_MINUTES`) |
| `MAX_CONCURRENT_SEPARATIONS` | `1` | Separation concurrency cap |

## Tests

- `backend/tests/remove-music.integration.test.mjs` (new): FFmpeg-gated like `media.integration.test.mjs` (skipped when `FFMPEG_PATH` not set); separate describe block gated on `python3 -c "import demucs"`. Covers: `415` for non-video; `400 NO_AUDIO_TRACK` fast-fail on a generated no-audio MP4; `404` download-audio for unknown jobs; `413` oversized upload; full pipeline (audio served twice non-consuming → video download consumes → 404 → temp dirs swept); progress ends near 1.0.
- Full backend suite: **243 passed, 0 failed** (`npm run build && node --test --test-timeout=600000`), including all Profile/Ranking/Suggestions/Resource DB suites. The new Demucs/FFmpeg integration suites skip locally (no `FFMPEG_PATH`, no usable python on the dev machine) — expected.
- Frontend: **all 218 tests pass**, including new `VideoTools.test.tsx` success/error cases and `mediaApi.test.ts` ordering/error/mapping tests.
- Frontend + backend `npm run build` both pass; `separate_vocals.py` syntax-checked.

## Deployment notes

- Container needs CPU only; model preload is baked into the image (~few hundred MB). If the build runs offline the preload is skipped and the model downloads on first use (requires egress to the PyTorch hub).
- Keep `MAX_CONCURRENT_SEPARATIONS` at 1 on Railway's small CPUs; a single htdemucs separation on CPU can take minutes for short clips and longer for anything big.
- `SEPARATION_TIMEOUT_MS` must stay below `MEDIA_JOB_TTL_MINUTES` (default 30 min) so jobs never outlive their TTL.