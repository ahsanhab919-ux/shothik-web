"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import Link from "next/link";
import AuthWithSocial from "@/components/auth/AuthWithSocial";
import AuthComplianceNotice from "@/components/auth/AuthComplianceNotice";
import { ArrowRight, BookOpen, FilePenLine, FlaskConical, Layers3, Sparkles } from "lucide-react";
import {
  getLoginFlowVariant,
  isSafeInternalPath,
  normalizeAuthIntent,
  saveAuthFlowState,
  type AuthIntent,
  type LoginFlowVariant,
} from "@/lib/auth-flow";
import {
  clearRememberedLoginEmail,
  getRememberedLoginEmail,
  saveRememberedLoginEmail,
} from "@/lib/auth-login-preferences";
import { trackLoginIntentCaptured } from "@/lib/posthog";

const INTENT_CONFIG: Record<
  AuthIntent,
  {
    label: string;
    title: string;
    description: string;
    href: string;
    icon: React.ElementType;
  }
> = {
  continue: {
    label: "Continue",
    title: "Continue where I left off",
    description: "Resume your latest writing workflow, project, or workspace after login.",
    href: "/writing-studio?projects=1",
    icon: Layers3,
  },
  writing_studio: {
    label: "Writing Studio",
    title: "Start in Writing Studio",
    description: "Open the main writing workspace for drafting, revising, and publishing.",
    href: "/writing-studio",
    icon: Sparkles,
  },
  research: {
    label: "Research Paper",
    title: "Start a research paper",
    description: "Open Writing Studio in research mode with structure, sources, and academic guidance.",
    href: "/writing-studio?intent=research",
    icon: FlaskConical,
  },
  assignment: {
    label: "Assignment",
    title: "Start an assignment",
    description: "Open Writing Studio in assignment mode with guided planning and rubric-aware writing.",
    href: "/writing-studio?intent=assignment",
    icon: FilePenLine,
  },
  twin: {
    label: "Twin",
    title: "Open Twin",
    description: "Continue with your Twin writing assistant, training data, and delegated writing tasks.",
    href: "/twin",
    icon: BookOpen,
  },
};

const LoginPage = () => {
    const { login } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
    const [success, setSuccess] = useState("");
    const [googleLoading, setGoogleLoading] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");
    const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
    const [isSendingVerificationEmail, setIsSendingVerificationEmail] = useState(false);

    const [loginVariant, setLoginVariant] = useState<LoginFlowVariant>("contextual");
    const initialIntent = normalizeAuthIntent(searchParams.get("intent"));
    const redirectTo = searchParams.get("redirect");
    const registeredEmail = searchParams.get("email");
    const shouldVerifyEmail = searchParams.get("verifyEmail") === "1";
    const verificationCompleted =
        searchParams.get("verified") === "1" ||
        (
            searchParams.get("insforge_status") === "success" &&
            searchParams.get("insforge_type") === "verify_email"
        );
    const [intent, setIntent] = useState<AuthIntent>(initialIntent);

    useEffect(() => {
        setLoginVariant(getLoginFlowVariant());
    }, []);

    useEffect(() => {
        const rememberedEmail = getRememberedLoginEmail();
        if (rememberedEmail) {
            setEmail(rememberedEmail);
            setRememberMe(true);
        }
    }, []);

    useEffect(() => {
        if (registeredEmail) {
            setEmail(registeredEmail);
        }
        if (verificationCompleted) {
            setSuccess("Email verified. You can now sign in.");
        } else if (shouldVerifyEmail) {
            setSuccess(
                "Registration successful. Enter the verification code from your email before signing in.",
            );
        } else if (searchParams.get("registered") === "1") {
            setSuccess("Registration successful. You can now sign in.");
        } else if (searchParams.get("reset") === "1") {
            setSuccess("Password reset successful. You can now sign in.");
        }
    }, [registeredEmail, searchParams, shouldVerifyEmail, verificationCompleted]);

    const validateEmail = (email: string) => {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email);
    };

    const validatePassword = (password: string) => {
        return password.length >= 6;
    };

    const getLoginFailureMessage = (error: unknown) => {
        const message = error instanceof Error ? error.message : "";

        if (
            shouldVerifyEmail ||
            /email verification|verify your email|unverified/i.test(message)
        ) {
            return "Your account needs email verification before you can sign in.";
        }

        if (/too many|rate limit|throttl|please wait|retry-after/i.test(message)) {
            return "Too many authentication attempts. Please wait before trying again.";
        }

        return "Login failed. Please check your credentials and try again.";
    };

    const handleResendVerificationEmail = async () => {
        const verificationEmail = (registeredEmail || email).trim();

        if (!validateEmail(verificationEmail)) {
            setError("Enter the same email address you used to register, then request a new code.");
            return;
        }

        setError("");
        setIsSendingVerificationEmail(true);

        try {
            const response = await fetch("/api/auth/send-verify-email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: verificationEmail }),
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload?.message || "Unable to send verification email.");
            }

            setSuccess(`Verification code sent to ${verificationEmail}.`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to send verification email.");
        } finally {
            setIsSendingVerificationEmail(false);
        }
    };

    const handleVerifyEmail = async () => {
        const verificationEmail = (registeredEmail || email).trim();

        if (!validateEmail(verificationEmail)) {
            setError("Enter the same email address you used to register before verifying.");
            return;
        }

        if (verificationCode.trim().length < 6) {
            setError("Enter the verification code from your email.");
            return;
        }

        setError("");
        setIsVerifyingEmail(true);

        try {
            const response = await fetch("/api/auth/verify-email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: verificationEmail,
                    code: verificationCode.trim(),
                }),
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload?.message || "Unable to verify email.");
            }

            const nextParams = new URLSearchParams();
            nextParams.set("intent", intent);
            nextParams.set("verified", "1");
            nextParams.set("email", verificationEmail);
            if (redirectTo) {
                nextParams.set("redirect", redirectTo);
            }
            router.replace(`/auth/login?${nextParams.toString()}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to verify email.");
        } finally {
            setIsVerifyingEmail(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setFieldErrors({});
        const normalizedEmail = email.trim();

        const nextFieldErrors: { email?: string; password?: string } = {};
        if (!validateEmail(normalizedEmail)) {
            nextFieldErrors.email = "Enter a valid email address.";
        }

        if (!validatePassword(password)) {
            nextFieldErrors.password = "Password must be at least 6 characters long.";
        }

        if (Object.keys(nextFieldErrors).length > 0) {
            setFieldErrors(nextFieldErrors);
            setError("Please fix the highlighted fields before continuing.");
            return;
        }

        setIsLoading(true);

        try {
            saveAuthFlowState({
                intent,
                redirectTo,
                source: "login",
                variant: loginVariant,
            });
            trackLoginIntentCaptured(intent, loginVariant, "password");
            await login(normalizedEmail, password);
            if (rememberMe) {
                saveRememberedLoginEmail(normalizedEmail);
            } else {
                clearRememberedLoginEmail();
            }
            setIsLoading(false);
            setSuccess("Login successful! Preparing your workspace...");
            const postLoginDestination = isSafeInternalPath(redirectTo)
                ? `/auth/post-login?redirect=${encodeURIComponent(redirectTo)}`
                : "/auth/post-login";
            router.replace(postLoginDestination);
        } catch (err) {
            setError(getLoginFailureMessage(err));
            setIsLoading(false);
        }
    };

    const selectedIntentConfig = INTENT_CONFIG[intent];
    const SelectedIntentIcon = selectedIntentConfig.icon;

    const handleSocialStart = () => {
        saveAuthFlowState({
            intent,
            redirectTo,
            source: "login",
            variant: loginVariant,
        });
        trackLoginIntentCaptured(intent, loginVariant, "google");
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
                <section className="flex flex-col justify-between border-b border-border px-6 py-10 lg:border-b-0 lg:border-r lg:px-12 lg:py-12">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                            <Sparkles className="h-3.5 w-3.5 text-brand" />
                            Shothik AI Writing Workspace
                        </div>
                        <h1 className="mt-6 max-w-xl text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
                            Login into a workflow, not just an account
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground lg:text-base">
                            Continue your writing projects, launch a research paper, start an assignment, or train your Twin.
                            We&apos;ll use your selected intent and recent activity to recommend the fastest next step after login.
                        </p>
                    </div>

                    <div className="mt-10 rounded-3xl border border-border bg-card/80 p-5">
                        <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10">
                                <SelectedIntentIcon className="h-5 w-5 text-brand" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                    Selected first step
                                </p>
                                <h2 className="mt-1 text-xl font-semibold text-foreground">{selectedIntentConfig.title}</h2>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    {selectedIntentConfig.description}
                                </p>
                                <p className="mt-3 text-xs text-muted-foreground">
                                    Recommended destination after login:{" "}
                                    <span className="font-medium text-foreground">{selectedIntentConfig.href}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        {(Object.entries(INTENT_CONFIG) as [AuthIntent, (typeof INTENT_CONFIG)[AuthIntent]][]).map(([key, config]) => {
                            const Icon = config.icon;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setIntent(key)}
                                    aria-pressed={intent === key}
                                    className={`rounded-2xl border p-4 text-left transition-all ${
                                        intent === key
                                            ? "border-brand/50 bg-brand/10 shadow-sm"
                                            : "border-border bg-card/60 hover:border-border/80 hover:bg-card"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background">
                                            <Icon className={`h-4.5 w-4.5 ${intent === key ? "text-brand" : "text-muted-foreground"}`} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">{config.label}</p>
                                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{config.description}</p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-8 rounded-3xl border border-border bg-card/50 p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Login flow variant
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {loginVariant === "contextual"
                                ? "Contextual flow shows intent-first guidance so new users understand where to go after authentication."
                                : "Streamlined flow minimizes copy while still preserving intent capture and smart routing."}
                        </p>
                    </div>
                </section>

                <section className="flex items-center justify-center px-6 py-10 lg:px-12 lg:py-12">
                    <form
                        onSubmit={handleSubmit}
                        className="w-full max-w-xl rounded-3xl border border-border bg-card p-8 shadow-sm"
                        data-login-variant={loginVariant}
                    >
                        <div className="mb-8">
                            <p className="text-sm font-medium text-brand">Welcome back</p>
                            <h2 className="mt-2 text-3xl font-bold text-foreground">Sign in to continue</h2>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                Sign in and we&apos;ll guide you to the best next step based on your selected intent, recent work,
                                and available account context.
                            </p>
                        </div>

                        <div className="mb-5">
                            <label htmlFor="email" className="block text-sm font-medium text-foreground">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                                autoComplete="email"
                                disabled={isLoading}
                                required
                                aria-invalid={Boolean(fieldErrors.email)}
                                aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
                            />
                            {fieldErrors.email && (
                                <p id="login-email-error" className="mt-2 text-sm text-destructive">
                                    {fieldErrors.email}
                                </p>
                            )}
                        </div>

                        <div className="mb-5">
                            <label htmlFor="password" className="block text-sm font-medium text-foreground">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                                autoComplete="current-password"
                                disabled={isLoading}
                                required
                                aria-invalid={Boolean(fieldErrors.password)}
                                aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
                            />
                            {fieldErrors.password && (
                                <p id="login-password-error" className="mt-2 text-sm text-destructive">
                                    {fieldErrors.password}
                                </p>
                            )}
                        </div>

                        <div className="mb-6 flex items-center justify-between gap-4">
                            <label className="flex items-center gap-2 text-sm text-foreground">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={() => {
                                        const nextRememberMe = !rememberMe;
                                        setRememberMe(nextRememberMe);
                                        if (!nextRememberMe) {
                                            clearRememberedLoginEmail();
                                        }
                                    }}
                                    className="h-4 w-4 rounded border-input"
                                    disabled={isLoading}
                                />
                                Remember email on this device
                            </label>

                            <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                                Forgot password?
                            </Link>
                        </div>

                        <div className="mb-6">
                            <AuthComplianceNotice mode="login" />
                        </div>

                        <button
                            type="submit"
                            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                            disabled={isLoading}
                        >
                            {isLoading ? "Signing in..." : "Sign in and continue"}
                            {!isLoading && <ArrowRight className="h-4 w-4" />}
                        </button>

                        {error && (
                            <p role="alert" className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                {error}
                            </p>
                        )}
                        {success && (
                            <p role="status" className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
                                {success}
                            </p>
                        )}

                        {shouldVerifyEmail && !verificationCompleted && (
                            <div className="mt-4 rounded-2xl border border-border bg-muted/30 p-4">
                                <p className="text-sm font-semibold text-foreground">Verify your email</p>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    Enter the verification code we sent to your inbox. If you did not receive one,
                                    request a new code with the same email address.
                                </p>
                                <div className="mt-4">
                                    <label htmlFor="verification-code" className="block text-sm font-medium text-foreground">
                                        Verification code
                                    </label>
                                    <input
                                        id="verification-code"
                                        type="text"
                                        inputMode="numeric"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                        className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        placeholder="Enter the code from your email"
                                        disabled={isVerifyingEmail || isSendingVerificationEmail}
                                    />
                                </div>
                                <div className="mt-4 flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={handleVerifyEmail}
                                        disabled={isVerifyingEmail || isSendingVerificationEmail}
                                        className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        {isVerifyingEmail ? "Verifying..." : "Verify email"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResendVerificationEmail}
                                        disabled={isVerifyingEmail || isSendingVerificationEmail}
                                        className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2 font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                                    >
                                        {isSendingVerificationEmail ? "Sending..." : "Resend code"}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                After login
                            </p>
                            <p className="mt-2 text-sm text-foreground">{selectedIntentConfig.title}</p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">{selectedIntentConfig.description}</p>
                        </div>

                        <AuthWithSocial
                            loading={googleLoading}
                            setLoading={setGoogleLoading}
                            title="in"
                            onBeforeAuthStart={handleSocialStart}
                            onAuthError={setError}
                        />

                        <div className="mt-6 flex items-center justify-between gap-4 text-sm">
                            <Link
                                href={`/auth/register?intent=${intent}${redirectTo ? `&redirect=${encodeURIComponent(redirectTo)}` : ""}`}
                                className="text-primary hover:underline"
                            >
                                Create a new account
                            </Link>
                            <span className="text-muted-foreground">
                                Intent saved: <span className="font-medium text-foreground">{selectedIntentConfig.label}</span>
                            </span>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
};

export default LoginPage;
