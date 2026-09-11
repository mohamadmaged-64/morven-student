import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { useAuthStore } from '@/pages/auth/useAuthStore';
import { GoogleSignInButton } from './GoogleSignInButton';
import * as googleIdentity from '@/services/googleIdentity';

// Simulate a real Google ID token credential response from GIS.
interface CredentialResponseLike {
  credential?: string;
  select_by?: string;
}

// Mock the Google Identity Services module so tests never touch real Google.
vi.mock('@/services/googleIdentity', () => ({
  getGoogleClientId: vi.fn(),
  loadGoogleIdentityScript: vi.fn(),
  mapGoogleAuthError: vi.fn((_err) => 'mapped-google-error'),
}));

const clientId = 'test-client.apps.googleusercontent.com';

function makeFakeGoogle() {
  const initialize = vi.fn();
  const renderButton = vi.fn();
  const prompt = vi.fn();
  const fake = {
    accounts: { id: { initialize, renderButton, prompt } },
  } as unknown as typeof google;
  return { fake, initialize, renderButton, prompt };
}

function resetStore(googleLogin: (credential: string) => Promise<void>) {
  useAuthStore.setState({
    user: null,
    loading: false,
    error: null,
    initialized: true,
    googleLogin,
  });
}

function getCallback(initialize: ReturnType<typeof vi.fn>) {
  return initialize.mock.calls[0][0].callback;
}

function getRenderParent(renderButton: ReturnType<typeof vi.fn>) {
  return renderButton.mock.calls[0][0];
}

function getRenderOptions(renderButton: ReturnType<typeof vi.fn>) {
  return renderButton.mock.calls[0][1];
}

async function deliverCredential(callback: (r: CredentialResponseLike) => void, credential: string) {
  await act(async () => {
    callback({ credential });
  });
}

async function setupRendered(fake: typeof google) {
  (googleIdentity.loadGoogleIdentityScript as ReturnType<typeof vi.fn>).mockResolvedValue(fake);
  resetStore(vi.fn().mockResolvedValue(undefined));
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(<GoogleSignInButton mode="login" />);
  });
  await waitFor(() => expect(fake.accounts.id.renderButton).toHaveBeenCalledTimes(1));
  return view;
}

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (googleIdentity.getGoogleClientId as ReturnType<typeof vi.fn>).mockReturnValue(clientId);
  });

  afterEach(() => {
    useAuthStore.setState({ error: null, loading: false });
  });

  it('loads GIS once, initializes with the client id, and renders the official Google button', async () => {
    const { fake, initialize, renderButton, prompt } = makeFakeGoogle();
    await setupRendered(fake);

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: clientId }));

    // Uses the official GIS button (renderButton), NOT the unsupported prompt().
    expect(renderButton).toHaveBeenCalledTimes(1);
    expect(prompt).not.toHaveBeenCalled();

    // Rendered into the full-width container div with Arabic "sign in" text.
    const options = getRenderOptions(renderButton);
    expect(options).toMatchObject({
      locale: 'ar',
      text: 'signin_with',
      type: 'standard',
      theme: 'outline',
    });

    const parent = getRenderParent(renderButton);
    expect(parent).toBeInstanceOf(HTMLElement);
    expect((parent as HTMLElement).style).toBeTruthy();
  });

  it('never re-renders or re-initializes Google on a store-driven re-render', async () => {
    const { fake, initialize, renderButton } = makeFakeGoogle();
    await setupRendered(fake);

    // The component subscribes to the Morven store; a store update re-renders
    // it but must not double-init or double-render the GIS button.
    await act(async () => {
      useAuthStore.setState({ loading: true });
      useAuthStore.setState({ loading: false });
    });

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(renderButton).toHaveBeenCalledTimes(1);
  });

  it('sends the GIS credential to the Morven auth store (reusing the existing session system)', async () => {
    const { fake, initialize } = makeFakeGoogle();
    (googleIdentity.loadGoogleIdentityScript as ReturnType<typeof vi.fn>).mockResolvedValue(fake);
    const googleLogin = vi.fn().mockResolvedValue(undefined);
    resetStore(googleLogin);

    render(<GoogleSignInButton mode="login" />);
    await waitFor(() => expect(initialize).toHaveBeenCalled());

    const callback = getCallback(initialize);
    await deliverCredential(callback, 'fake-id-token');

    await waitFor(() => expect(googleLogin).toHaveBeenCalledWith('fake-id-token'));
  });

  it('maps a backend GOOGLE_EMAIL_EXISTS error into the shared store error (no auto-merge)', async () => {
    const { fake, initialize } = makeFakeGoogle();
    (googleIdentity.loadGoogleIdentityScript as ReturnType<typeof vi.fn>).mockResolvedValue(fake);
    const err = new Error('backend error') as Error & { code?: string };
    err.code = 'GOOGLE_EMAIL_EXISTS';
    const googleLogin = vi.fn().mockRejectedValue(err);
    resetStore(googleLogin);

    render(<GoogleSignInButton mode="login" />);
    await waitFor(() => expect(initialize).toHaveBeenCalled());
    const callback = getCallback(initialize);

    await deliverCredential(callback, 'fake-id-token');

    await waitFor(() => {
      expect(googleLogin).toHaveBeenCalledWith('fake-id-token');
      // The mapped Arabic message is pushed into the shared auth store error.
      expect(useAuthStore.getState().error).toBe('mapped-google-error');
    });
  });

  it('navigates via onSuccess after a successful Google login', async () => {
    const { fake, initialize } = makeFakeGoogle();
    (googleIdentity.loadGoogleIdentityScript as ReturnType<typeof vi.fn>).mockResolvedValue(fake);
    const success = vi.fn();
    const googleLogin = vi.fn().mockResolvedValue(undefined);
    resetStore(googleLogin);

    render(<GoogleSignInButton mode="login" onSuccess={success} />);
    await waitFor(() => expect(initialize).toHaveBeenCalled());
    const callback = getCallback(initialize);

    await deliverCredential(callback, 'fake-id-token');

    await waitFor(() => expect(success).toHaveBeenCalledTimes(1));
  });

  it('uses register text (signup_with) when mode is register', async () => {
    const { fake, renderButton } = makeFakeGoogle();
    (googleIdentity.loadGoogleIdentityScript as ReturnType<typeof vi.fn>).mockResolvedValue(fake);
    resetStore(vi.fn().mockResolvedValue(undefined));

    render(<GoogleSignInButton mode="register" />);

    await waitFor(() => expect(renderButton).toHaveBeenCalledTimes(1));
    expect(getRenderOptions(renderButton)).toMatchObject({ text: 'signup_with', locale: 'ar' });
  });

  it('shows a clear Arabic message when the client id is missing (no SDK call)', async () => {
    (googleIdentity.getGoogleClientId as ReturnType<typeof vi.fn>).mockReturnValue(null);
    resetStore(vi.fn().mockResolvedValue(undefined));

    render(<GoogleSignInButton mode="login" />);

    expect(screen.getByText(/تسجيل الدخول عبر Google غير متاح حالياً/)).toBeTruthy();
    expect(googleIdentity.loadGoogleIdentityScript).not.toHaveBeenCalled();
  });

  it('surfaces a clear Arabic message when the GIS SDK fails to load', async () => {
    (googleIdentity.loadGoogleIdentityScript as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('load failed'),
    );
    resetStore(vi.fn().mockResolvedValue(undefined));

    render(<GoogleSignInButton mode="login" />);

    await waitFor(() => expect(screen.getByText(/تعذر تحميل خدمة Google/)).toBeTruthy());
  });
});
