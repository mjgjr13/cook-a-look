import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

// Cloudflare Turnstile ("are you human?") check for sign-up, sign-in and
// password reset. Supabase Auth verifies the token server-side (Authentication
// -> Attack Protection -> CAPTCHA, provider Turnstile, with the secret key).
// Managed mode: most people never see a puzzle.
//
// The site key is public by design. Locally we use Cloudflare's always-pass
// test key, since the real widget only works on cookalook.com.
const PROD_SITE_KEY = "0x4AAAAAAFY_NZqv-qxk3RRZ";
const TEST_SITE_KEY = "1x00000000000000000000AA";

const isLocalhost = () =>
  typeof window !== "undefined" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

export const TURNSTILE_SITE_KEY: string =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || (isLocalhost() ? TEST_SITE_KEY : PROD_SITE_KEY);

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;
const loadScript = (): Promise<void> => {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
};

export interface TurnstileHandle {
  /** Get a fresh token after a failed attempt (tokens are single-use). */
  reset: () => void;
}

interface Props {
  onToken: (token: string | null) => void;
  className?: string;
}

const TurnstileWidget = forwardRef<TurnstileHandle, Props>(({ onToken, className }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useImperativeHandle(ref, () => ({
    reset: () => {
      onTokenRef.current(null);
      if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
    },
  }));

  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action: "auth",
          appearance: "interaction-only",
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  return <div ref={containerRef} className={className} />;
});

TurnstileWidget.displayName = "TurnstileWidget";

export default TurnstileWidget;
