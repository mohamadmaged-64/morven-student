import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import healthRoutes from "./routes/health";
import convertRoutes from "./routes/convert";
import compressRoutes from "./routes/compress";
import pdfSecurityRoutes from "./routes/pdf-security";
import aiRoutes from "./routes/ai";

const app = express();

const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true; // Non-browser clients (curl, server-to-server).
  if (
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1")
  ) {
    return true;
  }
  try {
    const host = new URL(origin).hostname;
    return host.endsWith(".vercel.app") || host.endsWith(".railway.app");
  } catch {
    return false;
  }
};

// Must run before every route so even 404/error responses carry CORS headers.
app.use(
  cors({
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
    credentials: true,
    maxAge: 86400,
    optionsSuccessStatus: 204,
  })
);
app.use(express.json({ limit: "10mb" }));

app.use("/", healthRoutes);
app.use("/", convertRoutes);
app.use("/", compressRoutes);
app.use("/", pdfSecurityRoutes);
app.use("/", aiRoutes);

// JSON 404 fallback for unknown routes.
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Global error handler: multer, JSON parsing, and route errors become JSON.
app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const e = err as {
      code?: string;
      type?: string;
      status?: number;
      message?: string;
    };

    if (e?.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ error: "File too large. Maximum allowed size is 50MB." });
      return;
    }

    if (e?.type === "entity.parse.failed" || e?.status === 400) {
      res.status(400).json({ error: "Invalid JSON body." });
      return;
    }

    const status =
      typeof e?.status === "number" && e.status >= 400 ? e.status : 500;

    console.error("Unhandled route error:", e);

    res.status(status).json({ error: e?.message || "Internal server error" });
  }
);

export default app;
