// ---------------------------------------------------------------------------
// Email abstraction.
//
// All outbound email for Morven goes through this module so the provider can
// be swapped without touching callers.
//
// - Production: Resend (transactional email API). Requires RESEND_API_KEY and
//   EMAIL_FROM. Reset URLs are built ONLY from the server-side PUBLIC_BASE_URL
//   env var (never client-supplied), preventing open-redirect / host injection.
// - Tests: EMAIL_TRANSPORT=mock disables the real API (no network, no key
//   required) and records sent messages so integration tests can assert what
//   would have been emailed without sending real mail.
//
// Safety: we never log reset tokens or API keys. On any send failure the
// caller treats the result uniformly so account existence is never revealed.
// ---------------------------------------------------------------------------

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;
// Absolute origin used to build password-reset confirmation links. It is a
// server-side env var only — never derived from the request.
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");
// The app's real Morven icon (served from the frontend static assets at the
// same origin as the reset link). Used in the email header in place of a
// hardcoded/placeholder glyph.
const ICON_URL = PUBLIC_BASE_URL ? `${PUBLIC_BASE_URL}/morven.png` : "";

// Test hook: EMAIL_TRANSPORT=mock records messages instead of calling Resend.
export type MockedEmailRecord = {
  to: string;
  subject: string;
  html: string;
};

const mockedEmails: MockedEmailRecord[] = [];
const isMockMode = process.env.EMAIL_TRANSPORT === "mock";

// Deterministic engineering hint so tests can wait / inspect. Not part of the
// public API surface of the app; exported for the integration test only.
export function getMockedEmails(): MockedEmailRecord[] {
  return mockedEmails;
}

export function clearMockedEmails(): void {
  mockedEmails.length = 0;
}

export function isEmailMockMode(): boolean {
  return isMockMode;
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Build a clean Arabic, RTL password-reset email body.
 * `resetUrl` is fully server-controlled; the display name is HTML-escaped
 * before being injected, so a display name cannot inject markup.
 */
export function passwordResetEmailHtml(
  displayName: string,
  resetUrl: string
): string {
  const safeName = escapeHtml(displayName || "مستخدم");
  const safeUrl = escapeHtml(resetUrl);
  const expiryHours = resetTokenTTLHours();

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>إعادة تعيين كلمة المرور - مورفن</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    <center>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background-color:#059669;padding:32px 24px;text-align:center;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="text-align:center;padding-bottom:12px;color:#ffffff;font-size:40px;line-height:1;">
                  <img src="${ICON_URL}" alt="مورفن" width="56" height="56" style="display:inline-block;vertical-align:middle;width:56px;height:56px;border-radius:12px;" />
                </td>
              </tr>
              <tr>
                <td style="color:#ffffff;font-size:24px;font-weight:bold;"> مورفن للطلاب</td>
              </tr>
              <tr>
                <td style="color:#d1fae5;font-size:14px;padding-top:4px;">منصتك الشاملة للدراسة والانتاجية  </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 24px;">
            <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">إعادة تعيين كلمة المرور</h1>
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.8;">مرحباً ${safeName}،</p>
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.8;">
              لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في مورفن. يمكنك إعادة تعيين كلمة المرور بالضغط على الزر أدناه:
            </p>
            <p style="margin:0 0 24px;text-align:center;">
              <a href="${safeUrl}" target="_blank" rel="noopener"
                 style="display:inline-block;background-color:#059669;color:#ffffff;padding:14px 32px;border-radius:10px;font-size:16px;font-weight:bold;text-decoration:none;">
                إعادة تعيين كلمة المرور
              </a>
            </p>
            <p style="margin:0 0 12px;font-size:13px;color:#6b7280;line-height:1.7;">
              يكون الرابط صالحاً لمدة <strong>${expiryHours} ساعة</strong>، ويمكن استخدامه مرة واحدة فقط. إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان.
            </p>
            <p style="margin:0 0 12px;font-size:13px;color:#6b7280;line-height:1.7;">
              إذا لم يعمل الزر أعلاه، انسخ الرابط التالي والصقه في متصفحك:
            </p>
            <p dir="ltr" style="margin:0 0 20px;font-size:12px;color:#059669;word-break:break-all;direction:ltr;text-align:left;">${safeUrl}</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.7;">
              هذه رسالة آلية أُرسلت من منصة مورفن. إذا لم تكن أنت من طلب إعادة التعيين، لا حاجة لأي إجراء — لن تتغير كلمة مرورك.
            </p>
          </td>
        </tr>
      </table>
    </center>
  </body>
</html>`;
}

function resetTokenTTLHours(): number {
  const raw = process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) {
    return Math.max(1, Math.round(n / 60));
  }
  return 1;
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

export interface SendPasswordResetEmailInput {
  to: string;
  displayName: string;
  resetUrl: string;
}

/**
 * Send a password-reset email.
 *
 * In mock mode (EMAIL_TRANSPORT=mock) the message is simply recorded and the
 * call resolves — used by integration tests so no real email is ever sent.
 *
 * In production this calls Resend. The resolved value is intentionally minimal
 * (void) so callers cannot accidentally branch on delivery in a way that leaks
 * account existence. Exceptions propagate to the caller, which must still
 * return a uniform response to the user.
 */
export async function sendPasswordResetEmail(
  input: SendPasswordResetEmailInput
): Promise<void> {
  const { to, displayName, resetUrl } = input;
  const html = passwordResetEmailHtml(displayName, resetUrl);
  const subject = "إعادة تعيين كلمة المرور - مورفن";

  if (isMockMode) {
    mockedEmails.push({ to, subject, html });
    return;
  }

  if (!RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is not configured; cannot send password reset email"
    );
  }
  if (!EMAIL_FROM) {
    throw new Error(
      "EMAIL_FROM is not configured; cannot send password reset email"
    );
  }
  if (!PUBLIC_BASE_URL) {
    throw new Error(
      "PUBLIC_BASE_URL is not configured; cannot build password reset link"
    );
  }

  const resend = new Resend(RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });
  } catch (err) {
    // Log at error level WITHOUT the recipient or token; the raw payload would
    // disclose the (non-secret) address but we keep it minimal and never log
    // the reset token (which we never hold raw here anyway).
    console.error("Failed to send password reset email:", (err as Error)?.message);
    throw err;
  }
}

/** Build the reset-password URL from the server-side PUBLIC_BASE_URL only. */
export function buildPasswordResetUrl(token: string): string {
  if (!PUBLIC_BASE_URL) {
    throw new Error(
      "PUBLIC_BASE_URL is not configured; cannot build password reset link"
    );
  }
  return `${PUBLIC_BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;
}
