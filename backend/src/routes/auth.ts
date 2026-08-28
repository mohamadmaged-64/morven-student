import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import {
  registerSchema,
  loginSchema,
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getUserById,
  AuthError,
  REFRESH_COOKIE_OPTIONS,
  REFRESH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  CSRF_COOKIE_OPTIONS,
  generateCsrfToken,
} from "../services/auth.service";
import { authenticate } from "../middleware/auth";

const router = Router();

function handleAuthError(err: unknown, res: Response): void {
  if (err instanceof AuthError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error("Auth error:", err);
  res.status(500).json({ error: "حدث خطأ في الخادم" });
}

function validateCsrfToken(req: Request, res: Response): boolean {
  const headerToken = req.headers["x-csrf-token"];
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

  if (
    !headerToken ||
    typeof headerToken !== "string" ||
    !cookieToken ||
    typeof cookieToken !== "string" ||
    headerToken.length !== 64 ||
    cookieToken.length !== 64
  ) {
    res.status(403).json({ error: "غير مصرح" });
    return false;
  }

  try {
    const headerBuf = Buffer.from(headerToken, "utf8");
    const cookieBuf = Buffer.from(cookieToken, "utf8");
    if (headerBuf.length !== cookieBuf.length || !crypto.timingSafeEqual(headerBuf, cookieBuf)) {
      res.status(403).json({ error: "غير مصرح" });
      return false;
    }
  } catch {
    res.status(403).json({ error: "غير مصرح" });
    return false;
  }

  return true;
}

// POST /api/auth/register
router.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      res.status(400).json({ error: firstError.message });
      return;
    }

    const result = await registerUser(parsed.data);

    const csrfToken = generateCsrfToken();
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.cookie(CSRF_COOKIE_NAME, csrfToken, CSRF_COOKIE_OPTIONS);
    res.status(201).json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    handleAuthError(err, res);
  }
});

// POST /api/auth/login
router.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات تسجيل الدخول غير صحيحة" });
      return;
    }

    const result = await loginUser(parsed.data);

    const csrfToken = generateCsrfToken();
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.cookie(CSRF_COOKIE_NAME, csrfToken, CSRF_COOKIE_OPTIONS);
    res.json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    handleAuthError(err, res);
  }
});

// POST /api/auth/logout
router.post("/api/auth/logout", async (req: Request, res: Response) => {
  try {
    if (!validateCsrfToken(req, res)) return;

    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await logoutUser(refreshToken || "");
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
    res.clearCookie(CSRF_COOKIE_NAME, { path: "/" });
    res.json({ message: "تم تسجيل الخروج بنجاح" });
  } catch (err) {
    handleAuthError(err, res);
  }
});

// POST /api/auth/refresh
router.post("/api/auth/refresh", async (req: Request, res: Response) => {
  try {
    if (!validateCsrfToken(req, res)) return;

    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      res.status(401).json({ error: "رمز التحديث غير موجود" });
      return;
    }

    const result = await refreshAccessToken(refreshToken);

    const csrfToken = generateCsrfToken();
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.cookie(CSRF_COOKIE_NAME, csrfToken, CSRF_COOKIE_OPTIONS);
    res.json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    handleAuthError(err, res);
  }
});

// GET /api/auth/me
router.get("/api/auth/me", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "غير مصرح" });
      return;
    }

    const user = await getUserById(req.user.sub);
    res.json({ user });
  } catch (err) {
    handleAuthError(err, res);
  }
});

export default router;
