import { Button } from "@/components/ui/button";
import { getInsforgeBrowserClient } from "@/lib/insforge/client";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const GOOGLE_OAUTH_CODE_VERIFIER_KEY = "shothik.oauth.google.codeVerifier";

function hasGoogleProvider(config) {
  const providers =
    config?.oAuthProviders ??
    config?.oauthProviders ??
    config?.providers ??
    config?.auth?.oAuthProviders ??
    [];

  return Array.isArray(providers) && providers.includes("google");
}

function GoogleLoginButton({ loading, setLoading, title, onBeforeAuthStart, onAuthError }) {
  const [googleAvailability, setGoogleAvailability] = useState("unknown");

  useEffect(() => {
    let active = true;

    async function loadProviderAvailability() {
      try {
        const { data, error } = await getInsforgeBrowserClient().auth.getPublicAuthConfig();
        if (!active) {
          return;
        }

        if (error) {
          setGoogleAvailability("unknown");
          return;
        }

        setGoogleAvailability(hasGoogleProvider(data) ? "enabled" : "disabled");
      } catch (error) {
        if (active) {
          // Keep the Google entry point visible if config probing fails.
          setGoogleAvailability("unknown");
        }
      }
    }

    void loadProviderAvailability();

    return () => {
      active = false;
    };
  }, []);

  if (googleAvailability === "disabled") {
    return null;
  }

  const handleGoogleLogin = async () => {
    setLoading(true);
    window.sessionStorage.removeItem(GOOGLE_OAUTH_CODE_VERIFIER_KEY);

    try {
      onBeforeAuthStart?.();
      const redirectTo = new URL("/auth/post-login", window.location.origin).toString();
      const { data, error } = await getInsforgeBrowserClient().auth.signInWithOAuth("google", {
        redirectTo,
        skipBrowserRedirect: true,
      });

      if (error) {
        throw error;
      }

      if (data?.codeVerifier) {
        window.sessionStorage.setItem(GOOGLE_OAUTH_CODE_VERIFIER_KEY, data.codeVerifier);
      }

      if (data?.url) {
        window.location.assign(data.url);
      }
    } catch (error) {
      window.sessionStorage.removeItem(GOOGLE_OAUTH_CODE_VERIFIER_KEY);
      console.error(error, "google login error");
      onAuthError?.("Google sign-in could not be started. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg"
      onClick={handleGoogleLogin}
      disabled={loading}
    >
      <div className="mt-1">
        {loading ? (
          <Loader2 className="text-primary h-6 w-6 animate-spin" />
        ) : (
          <svg className="h-6 w-6" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
      </div>
      <span className="text-muted-foreground text-base font-semibold">
        Sign {title} with Google
      </span>
    </Button>
  );
}

export default function AuthWithSocial({
  loading,
  setLoading,
  title = "in",
  onBeforeAuthStart,
  onAuthError,
}) {
  return (
    <div className="mt-5">
      <div className="flex justify-center">
        <GoogleLoginButton
          loading={loading}
          setLoading={setLoading}
          title={title}
          onBeforeAuthStart={onBeforeAuthStart}
          onAuthError={onAuthError}
        />
      </div>
    </div>
  );
}
