# Deployment notes — Morven Student

Morven Student is split across two platforms:

- **Frontend** (static SPA): Vercel.
- **Backend** (Express + Socket.IO): Railway.

The production request path is:

```
browser → Vercel edge → Railway ingress → Express app
```

## HTTP API proxying (Vercel → Railway)

`vercel.json` rewrites same-origin requests on the browser's own deployment domain
to the Railway backend:

- `/api/*`        → `https://BACKEND_URL/api/*`
- `/socket.io/*`  → `https://BACKEND_URL/socket.io/*`
- `/uploads/*`    → `https://BACKEND_URL/uploads/*`

The backend URL is currently hardcoded in `vercel.json`
(`https://backend-production-cd587.up.railway.app`). Vercel does not support
environment-variable interpolation inside `vercel.json` rewrite destinations, so
if the Railway project is renamed or the production domain changes, update the
destination in `vercel.json` (all three rewrite groups) and redeploy the
frontend. Keep the frontend referring to the backend through the same-origin
proxy: this is what keeps the auth `httpOnly` refresh cookie and CSRF
double-submit cookie first-party and avoids mixed-content from an `http` backend.

## socket.io routing

Three rewrite rules for `/socket.io` (bare, trailing-slash, and `/socket.io/:path*`)
are required because socket.io-client connects to `/socket.io/` and the engine handshake
uses `GET /socket.io/?EIO=4&transport=polling`. All three must exist or websocket/polling
upgrades fail behind the edge.

## Reverse-proxy trust (Express `trust proxy`)

Express must know how many trusted reverse-proxy hops sit in front of it so the
rate limiters see the real client IP instead of the Vercel/railway edge IP.

With the chain `Vercel edge → Railway ingress → app`, the correct value is **2**
hops, which is the default. It can be overridden per environment:

| Variable           | Effect                                               |
| ------------------ | ---------------------------------------------------- |
| `TRUST_PROXY_HOPS` | Number of trusted proxy hops (default `2`)           |
| `TRUST_PROXY=false`| Disable trust entirely (e.g. local direct dev)       |

If the number of proxies in front of the backend changes (e.g. an extra CDN hop),
adjust `TRUST_PROXY_HOPS` accordingly; a wrong value makes the rate limiter group
all users under the edge IP (could over-block) or key on the wrong hop.

## Railway deployment

- `backend/.railway/railway.json` declares the Dockerfile build, a `/health`
  Health Domain path, and a 1-replica policy.
- The `backend/Dockerfile` binds port `3001` (`ENV PORT=3001`) and defines a
  `HEALTHCHECK` against `/health`.
- Env vars required at runtime: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
  and optionally `CORS_ORIGINS`, `TRUST_PROXY_HOPS`, `MEDIA_TEMP_DIR`,
  `MEDIA_WORK_ROOT`, `COOKIE_SAMESITE`, `AUTH_RATE_LIMIT_MAX`, `REFRESH_RATE_LIMIT_MAX`.
- Media/upload files are written relative to `dist/temp` (ephemeral) and
  `uploads/` unless a persistent volume is mounted and `MEDIA_TEMP_DIR`/
  `MEDIA_WORK_ROOT` are set. Configure a volume for durable media in production.
- `numReplicas: 1` is intentional: presence, focusing, and in-memory media jobs
  are process-local. Scaling beyond one replica fragments those live-update
  features unless a shared store is introduced.

## Upload storage and access control

- **Public** media (avatars, group images) live in `uploads/` and are served by
  the public `/uploads` static mount.
- **Study resource files** live in `uploads/resources/`, are blocked from the
  public static mount (`/uploads/resources` returns 404), and are only served
  through the authenticated `/api/resources/:resourceId/files/:fileId/download`
  endpoint. `uploadResource` applies a strict MIME/extension allowlist to prevent
  stored XSS (HTML/SVG/executables are rejected).
