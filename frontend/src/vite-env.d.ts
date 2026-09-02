/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ---------------------------------------------------------------------------
// Google Identity Services (GIS) globals — loaded dynamically from the GIS
// script, so Typings are declared here and never bundled.
// https://developers.google.com/identity/gsi/web/reference/js-reference
// ---------------------------------------------------------------------------
declare namespace google.accounts.id {
  interface CredentialResponse {
    credential: string;
    select_by?: string;
  }

  interface InitConfiguration {
    client_id: string;
    auto_select?: boolean;
    callback: (response: CredentialResponse) => void;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
  }

  interface GsiButtonConfiguration {
    type: 'standard' | 'icon';
    theme?: 'outline' | 'filled_blue' | 'filled_black';
    size?: 'large' | 'medium' | 'small';
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
    logo_alignment?: 'left' | 'center';
    width?: number | string;
    locale?: string;
    click_listener?: () => void;
  }

  function initialize(config: InitConfiguration): void;
  function renderButton(parent: HTMLElement, options: GsiButtonConfiguration): void;
  function prompt(_options?: unknown): void;
}

declare const google: {
  accounts: {
    id: {
      initialize: (config: google.accounts.id.InitConfiguration) => void;
      renderButton: (parent: HTMLElement, options: google.accounts.id.GsiButtonConfiguration) => void;
      prompt: (options?: unknown) => void;
    };
  };
};
