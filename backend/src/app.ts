import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import healthRoutes from "./routes/health";
import convertRoutes from "./routes/convert";
import compressRoutes from "./routes/compress";
import pdfSecurityRoutes from "./routes/pdf-security";
import pptRoutes from "./routes/ppt";
import mediaRoutes from "./routes/media";
import authRoutes from "./routes/auth";
import profileRoutes from "./routes/profile";
import groupRoutes from "./routes/group";
import pomodoroRoutes from "./routes/pomodoro";
import resourceRoutes from "./routes/resource";

const app = express();

// ---------------------------------------------------------------------------
// Static file serving for uploads
// ---------------------------------------------------------------------------
const UPLOADS_DIR = path.resolve(__dirname, "..", "uploads");
try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch { /* ignore */ }
app.use("/uploads", express.static(UPLOADS_DIR, { maxAge: "30d", immutable: true }));

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------
app.use(helmet({ crossOriginResourcePolicy: false }));

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:3000",
];

const envOrigins = process.env.CORS_ORIGINS?.split(",").map((o) => o.trim());
if (envOrigins) allowedOrigins.push(...envOrigins);

const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true;
  if (allowedOrigins.some((o) => origin.startsWith(o))) return true;
  try {
    const host = new URL(origin).hostname;
    return host.endsWith(".vercel.app") || host.endsWith(".railway.app");
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With",
      "X-CSRF-Token",
    ],
    exposedHeaders: ["Content-Disposition"],
    credentials: true,
    maxAge: 86400,
    optionsSuccessStatus: 204,
  })
);

// ---------------------------------------------------------------------------
// Body parsing + cookie parsing
// ---------------------------------------------------------------------------
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || "30", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "تم تجاوز الحد المسموح. يرجى المحاولة لاحقاً" },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.REFRESH_RATE_LIMIT_MAX || "60", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "تم تجاوز الحد المسموح. يرجى المحاولة لاحقاً" },
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use("/", healthRoutes);

// Auth routes with rate limiting
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/refresh", refreshLimiter);
app.use(authRoutes);
app.use(profileRoutes);
app.use(groupRoutes);
app.use(pomodoroRoutes);
app.use(resourceRoutes);

// Existing file-processing routes (no auth required)
app.use("/", convertRoutes);
app.use("/", compressRoutes);
app.use("/", pdfSecurityRoutes);
app.use("/", pptRoutes);
app.use("/", mediaRoutes);

// JSON 404 fallback for unknown routes.
app.use((req: Request, res: Response) => {
  res
    .status(404)
    .json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Global error handler
app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const e = err as {
      code?: string;
      type?: string;
      status?: number;
      message?: string;
    };

    if (e?.code === "LIMIT_FILE_SIZE") {
      res
        .status(413)
        .json({ error: "File too large. Maximum allowed size is 50MB." });
      return;
    }

    if (e?.type === "entity.parse.failed" || e?.status === 400) {
      res.status(400).json({ error: "Invalid JSON body." });
      return;
    }

    const status =
      typeof e?.status === "number" && e.status >= 400 ? e.status : 500;

    console.error("Unhandled route error:", e);

    res
      .status(status)
      .json({ code: e?.code, error: e?.message || "Internal server error" });
  }
);

export default app;
