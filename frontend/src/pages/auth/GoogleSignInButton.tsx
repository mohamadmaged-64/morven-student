import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/pages/auth/useAuthStore';
import { getGoogleClientId, loadGoogleIdentityScript, mapGoogleAuthError } from '@/services/googleIdentity';

type GoogleSignInMode = 'login' | 'register';
type GoogleButtonTheme = 'outline' | 'filled_blue' | 'filled_black';

interface GoogleSignInButtonProps {
  /** 'login' and 'register' only affect the Google button's text. */
  mode?: GoogleSignInMode;
  /** GIS button theme (outline adapts to Morven light/dark well). */
  theme?: GoogleButtonTheme;
  /** Called only after a Google login succeeds and the session is set. */
  onSuccess?: () => void;
  className?: string;
}

/**
 * Reusable "Sign in with Google" button, fully integrated with the existing
 * Morven auth store/session (POST /api/auth/google via authApi.googleLogin).
 *
 * Uses Google's official Identity Services BUTTON flow: the GIS script is
 * loaded once (single loader), `google.accounts.id.initialize` binds the
 * credential callback, and `google.accounts.id.renderButton` renders Google's
 * official credential button that opens the account chooser on click. No
 * separate auth state or JWT handling exists here.
 */
export function GoogleSignInButton({
  mode = 'login',
  theme = 'outline',
  onSuccess,
  className = '',
}: GoogleSignInButtonProps) {
  const googleLogin = useAuthStore((s) => s.googleLogin);
  const authLoading = useAuthStore((s) => s.loading);
  const clearError = useAuthStore((s) => s.clearError);

  const [ready, setReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [configMissing, setConfigMissing] = useState(false);

  const gadRef = useRef<typeof google | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const didInitializeRef = useRef(false);
  const didRenderRef = useRef(false);
  const inFlight = useRef(false);
  const navigateRef = useRef(onSuccess);
  navigateRef.current = onSuccess;

  const clientId = getGoogleClientId();

  // Called by GIS with the verified ID token (One Tap handled internally by GIS
  // button). Sends it to the existing Morven backend/store session flow.
  const handleCredential = useCallback(
    async (credential: string) => {
      if (inFlight.current || !credential) return;
      inFlight.current = true;
      try {
        await googleLogin(credential);
        navigateRef.current?.();
      } catch (err) {
        // Map any backend code (e.g. GOOGLE_EMAIL_EXISTS) to a clear Arabic
        // message and push it into the shared store error so the page shows it.
        const message = mapGoogleAuthError(err);
        useAuthStore.setState({ error: message });
      } finally {
        inFlight.current = false;
      }
    },
    [googleLogin],
  );

  // Load the GIS script once and initialize the client (single init/render).
  useEffect(() => {
    if (!clientId) {
      setConfigMissing(true);
      return;
    }
    setConfigMissing(false);
    setSdkError(null);
    let cancelled = false;

    loadGoogleIdentityScript()
      .then((g) => {
        if (cancelled) return;
        gadRef.current = g;
        if (!didInitializeRef.current) {
          didInitializeRef.current = true;
          g.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
              void handleCredential(response.credential);
            },
          });
        }
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setSdkError('تعذر تحميل خدمة Google. يرجى التحقق من الاتصال والمحاولة مجدداً.');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // Render Google's official button into the container once the SDK is ready.
  useEffect(() => {
    if (!ready || configMissing || !gadRef.current || didRenderRef.current) return;
    const parent = containerRef.current;
    if (!parent) return;

    didRenderRef.current = true;
    const text = mode === 'register' ? 'signup_with' : 'signin_with';
    let width = typeof parent.clientWidth === 'number' && parent.clientWidth > 0 ? parent.clientWidth : 320;

    try {
      gadRef.current.accounts.id.renderButton(parent, {
        type: 'standard',
        theme,
        size: 'large',
        text,
        shape: 'rectangular',
        logo_alignment: 'left',
        width, // responsive: matches the (full-width) container
        locale: 'ar',
        click_listener: () => clearError(),
      });
    } catch {
      didRenderRef.current = false;
      setSdkError('تعذر عرض زر تسجيل الدخول عبر Google. يرجى المحاولة مجدداً.');
      return;
    }

    // Keep the rendered Google button full-width and responsive within Morven's
    // card, including on window resize.
    const resizeIframe = () => {
      const frame = parent.querySelector('iframe');
      if (frame) frame.style.width = '100%';
    };
    const id = window.setTimeout(resizeIframe, 0);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            width = Math.max(containerRef.current?.clientWidth || 320, 320);
            resizeIframe();
          })
        : null;
    resizeObserver?.observe(parent);
    return () => {
      window.clearTimeout(id);
      resizeObserver?.disconnect();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, configMissing, clientId, mode, theme]);

  // Prevent duplicate re-renders from re-initializing/re-rendering GIS.
  const showPlaceholder = ready === false && !configMissing && !sdkError;

  return (
    <div className={`${className} w-full`}>
      {configMissing && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-6">
          تسجيل الدخول عبر Google غير متاح حالياً.
        </p>
      )}

      {!configMissing && (
        <>
          <div ref={containerRef} className="w-full" style={{ minHeight: 48 }} />
          {showPlaceholder && (
            <div
              className="flex items-center justify-center gap-2.5 bg-white/80 dark:bg-dark-surface/60 border border-light-border dark:border-dark-border rounded-xl w-full h-12 text-sm text-gray-500 dark:text-gray-400"
              aria-busy="true"
            >
              <svg
                className="animate-spin shrink-0"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>جارٍ تجهيز خدمة Google…</span>
            </div>
          )}
        </>
      )}

      {sdkError && !configMissing && (
        <p className="mt-2 text-sm text-red-500 text-center" role="alert">
          {sdkError}
        </p>
      )}
    </div>
  );
}

export type { GoogleSignInButtonProps, GoogleSignInMode, GoogleButtonTheme };