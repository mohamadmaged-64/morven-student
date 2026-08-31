import type { CorsOptions } from "cors";

const LOCAL_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:3000",
];

const ALLOWED_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
];

const ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "Accept",
  "X-Requested-With",
  "X-CSRF-Token",
];

/**
 * Single source of truth for which request origins are permitted.
 * - Local dev origins (exact match, always).
 * - Any origin from CORS_ORIGINS (comma-separated, exact match) when provided.
 * - Any *.vercel.app or *.railway.app hostname (production deploy domains).
 *
 * Origins are compared EXACTLY (never prefix/substring) so a spoofed origin
 * like `http://localhost:5173.evil.com` can never pass the allowlist.
 */
function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;

  const normalize = (o: string): string => o.replace(/\/+$/, "");

  const envOrigins =
    process.env.CORS_ORIGINS?.split(",").map((o) => normalize(o.trim())).filter(Boolean) ?? [];

  if ([...LOCAL_ORIGINS.map(normalize), ...envOrigins].includes(normalize(origin))) {
    return true;
  }

  try {
    const host = new URL(origin).hostname;
    return host.endsWith(".vercel.app") || host.endsWith(".railway.app");
  } catch {
    return false;
  }
}

/** Express `cors` options shared by HTTP middleware. */
export function createHttpCorsOptions(): CorsOptions {
  return {
    origin(origin, callback) {
      callback(null, isOriginAllowed(origin));
    },
    methods: ALLOWED_METHODS,
    allowedHeaders: ALLOWED_HEADERS,
    exposedHeaders: ["Content-Disposition"],
    credentials: true,
    maxAge: 86400,
    optionsSuccessStatus: 204,
  };
}

/**
 * Socket.IO `cors` options. Must permit the same origins as HTTP so live
 * presence works from the production frontend domain (e.g. *.railway.app).
 */
export function createSocketIoCorsOptions(): CorsOptions {
  return {
    origin(origin, callback) {
      callback(null, isOriginAllowed(origin));
    },
    credentials: true,
  };
}
