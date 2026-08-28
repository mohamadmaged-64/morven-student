import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { z } from "zod";
import prisma from "../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_DAYS = 7;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error(
    "JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables"
  );
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح").toLowerCase().trim(),
  username: z
    .string()
    .min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل")
    .max(30, "اسم المستخدم يجب أن يكون 30 حرف أو أقل")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "اسم المستخدم يمكن أن يحتوي على أحرف وأرقام وشرطة سفلية فقط"
    )
    .trim(),
  password: z
    .string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .max(128, "كلمة المرور طويلة جداً"),
  displayName: z
    .string()
    .min(1, "الاسم المعروض مطلوب")
    .max(100, "الاسم المعروض طويل جداً")
    .trim(),
});

export const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح").toLowerCase().trim(),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

export interface AccessTokenPayload {
  sub: string;
  role: string;
  username?: string;
  displayName?: string;
}

export function generateAccessToken(userId: string, role: string, username?: string, displayName?: string): string {
  return jwt.sign({ sub: userId, role, username, displayName } satisfies AccessTokenPayload, JWT_SECRET!, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, JWT_SECRET!) as AccessTokenPayload;
}

// ---------------------------------------------------------------------------
// Refresh token helpers
// ---------------------------------------------------------------------------

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateRawRefreshToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

export async function createRefreshToken(userId: string): Promise<string> {
  const rawToken = generateRawRefreshToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { tokenHash, userId, expiresAt },
  });

  return rawToken;
}

export async function validateRefreshToken(
  rawToken: string
): Promise<{ userId: string } | null> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!record) return null;
  if (record.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: record.id } });
    return null;
  }

  return { userId: record.userId };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

export async function revokeAllUserRefreshTokens(
  userId: string
): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

const isProduction = process.env.NODE_ENV === "production";

export const REFRESH_COOKIE_NAME = "morven_refresh_token";
export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  path: "/",
};

export const CSRF_COOKIE_NAME = "morven_csrf_token";
export const CSRF_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: isProduction,
  sameSite: "lax" as const,
  maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  path: "/",
};

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ---------------------------------------------------------------------------
// Business logic
// ---------------------------------------------------------------------------

export async function registerUser(input: RegisterInput) {
  const { email, username, password, displayName } = input;

  // Check uniqueness
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    throw new AuthError("البريد الإلكتروني مسجل بالفعل", 409);
  }

  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });
  if (existingUsername) {
    throw new AuthError("اسم المستخدم مسجل بالفعل", 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Transaction-safe: first user becomes ADMIN, rest become USER
  const result = await prisma.$transaction(async (tx) => {
    // Count existing users inside the transaction to prevent race conditions.
    // SERIALIZABLE isolation handles concurrent registrations safely.
    const userCount = await tx.user.count();
    const role = userCount === 0 ? "ADMIN" : "USER";

    const user = await tx.user.create({
      data: {
        email,
        username,
        passwordHash,
        displayName,
        role,
      },
    });

    await tx.profile.create({
      data: { userId: user.id },
    });

    return user;
  });

  const accessToken = generateAccessToken(result.id, result.role, result.username, result.displayName);
  const refreshToken = await createRefreshToken(result.id);

  return {
    user: sanitizeUser(result, { avatarUrl: null }),
    accessToken,
    refreshToken,
  };
}

export async function loginUser(input: LoginInput) {
  const { email, password } = input;

  const user = await prisma.user.findUnique({ where: { email }, include: { profile: { select: { avatarUrl: true } } } });
  if (!user) {
    throw new AuthError("بيانات تسجيل الدخول غير صحيحة", 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AuthError("بيانات تسجيل الدخول غير صحيحة", 401);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const accessToken = generateAccessToken(user.id, user.role, user.username, user.displayName);
  const refreshToken = await createRefreshToken(user.id);

  return {
    user: sanitizeUser(user, user.profile),
    accessToken,
    refreshToken,
  };
}

export async function refreshAccessToken(rawRefreshToken: string) {
  const result = await validateRefreshToken(rawRefreshToken);
  if (!result) {
    throw new AuthError("رمز التحديث غير صالح أو منتهي الصلاحية", 401);
  }

  // Rotate: revoke old, issue new
  await revokeRefreshToken(rawRefreshToken);

  const user = await prisma.user.findUnique({ where: { id: result.userId }, include: { profile: { select: { avatarUrl: true } } } });
  if (!user) {
    throw new AuthError("المستخدم غير موجود", 401);
  }

  const accessToken = generateAccessToken(user.id, user.role, user.username, user.displayName);
  const refreshToken = await createRefreshToken(user.id);

  return {
    user: sanitizeUser(user, user.profile),
    accessToken,
    refreshToken,
  };
}

export async function logoutUser(rawRefreshToken: string): Promise<void> {
  if (rawRefreshToken) {
    await revokeRefreshToken(rawRefreshToken);
  }
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: { select: { avatarUrl: true } } } });
  if (!user) {
    throw new AuthError("المستخدم غير موجود", 404);
  }
  return sanitizeUser(user, user.profile);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

function sanitizeUser(user: any, profile?: { avatarUrl: string | null } | null) {
  const { passwordHash, ...safe } = user;
  return { ...safe, avatarUrl: profile?.avatarUrl ?? null };
}
