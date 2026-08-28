import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type AccessTokenPayload } from "../services/auth.service";

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "رمز الوصول غير صالح أو منتهي الصلاحية" });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      req.user = verifyAccessToken(token);
    } catch {
      // Token invalid — continue as unauthenticated
    }
  }

  next();
}
