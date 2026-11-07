"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Brand, Button, Notice } from "@/components/primitives";
import { ThemeControl } from "@/components/theme-control";
import { browserClient } from "@/lib/supabase/browser";
import { message } from "@/lib/domain";
import { signupErrorMessage } from "@/lib/auth-errors";

export type AuthMode =
  | "sign-in"
  | "sign-up"
  | "forgot-password"
  | "update-password";
const headings: Record<AuthMode, string> = {
  "sign-in": "A clear head starts here.",
  "sign-up": "Make space for your best work.",
  "forgot-password": "Let’s get you back in.",
  "update-password": "A fresh start for your password.",
};
export function AuthForm({
  mode,
  enabled,
  notice = "",
}: {
  mode: AuthMode;
  enabled: boolean;
  notice?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const needsPassword = mode !== "forgot-password";
  const needsEmail = mode !== "update-password";
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setSuccess("");
    if (!enabled) {
      setError(
        "Accounts are not connected yet. Explore the interactive preview while setup is completed.",
      );
      return;
    }
    if (needsEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      emailRef.current?.focus();
      return;
    }
    if (
      needsPassword &&
      (!password ||
        password.length > 256 ||
        ((mode === "sign-up" || mode === "update-password") &&
          password.length < 12))
    ) {
      setError(
        mode === "sign-in"
          ? "Enter your password."
          : "Use a password between 12 and 256 characters. Spaces and paste are supported.",
      );
      passwordRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const client = browserClient();
      if (mode === "sign-in") {
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error || !data.user)
          throw new Error(
            "Sign-in was not completed. Check your email and password, verify your email, or request a password reset.",
          );
        router.replace("/");
        router.refresh();
      } else if (mode === "sign-up") {
        const { error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${location.origin}/auth/callback` },
        });
        if (error) {
          setError(signupErrorMessage(error));
          return;
        }
        setPassword("");
        setSuccess(
          "If this address can be registered, a verification email will arrive. Open its link to finish joining NenSync.",
        );
      } else if (mode === "forgot-password") {
        const { error } = await client.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${location.origin}/auth/confirm`,
          },
        );
        if (error)
          throw new Error(
            "A reset request could not be completed. Try again in a moment.",
          );
        setSuccess(
          "If an account exists for this address, you’ll receive a password reset link. Check your inbox and spam folder.",
        );
      } else {
        const response = await fetch("/api/password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        const result: unknown = await response.json();
        if (!response.ok)
          throw new Error(
            result && typeof result === "object" && "message" in result
              ? String(result.message)
              : "Your password could not be changed. Request a new link.",
          );
        setPassword("");
        await client.auth.signOut({ scope: "local" });
        setSuccess("Your password is updated. Sign in with your new password.");
      }
    } catch (e) {
      setError(mode === "sign-up" ? signupErrorMessage(e) : message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-shell auth-page" id="main">
      <section className="auth-card auth-split" aria-labelledby="auth-heading">
        <div className="auth-intro">
          <Link
            href="/demo"
            aria-label="NenSync preview"
            className="auth-brand"
          >
            <Brand />
          </Link>
          <div className="auth-intro-copy">
            <h1 id="auth-heading">{headings[mode]}</h1>
            <p className="supporting">
              Your standup, three priorities and next focus interval.
            </p>
          </div>
          <p className="auth-privacy">
            Private by default. Your work is yours.
          </p>
        </div>
        <div className="auth-form-panel">
          <div className="auth-form-top">
            <h2>
              {mode === "sign-in"
                ? "Sign in to NenSync"
                : mode === "sign-up"
                  ? "Create your account"
                  : mode === "forgot-password"
                    ? "Reset your password"
                    : "Update your password"}
            </h2>
            <ThemeControl />
          </div>
          <p className="supporting">
            {mode === "sign-in"
              ? "Welcome back to your workday."
              : mode === "sign-up"
                ? "A private workspace for a calmer, more intentional workday."
                : mode === "forgot-password"
                  ? "Enter your email and we’ll send a recovery link."
                  : "Choose a strong password you haven’t used elsewhere."}
          </p>
          {!enabled && (
            <Notice>
              Account services are not connected yet. The interactive preview
              works on this device.
            </Notice>
          )}
          {notice && <Notice>{notice}</Notice>}
          <form noValidate onSubmit={(e) => void submit(e)}>
            {needsEmail && (
              <label className="field">
                <span>Email address</span>
                <input
                  ref={emailRef}
                  type="email"
                  name="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  maxLength={254}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!error}
                  aria-describedby={error ? "auth-error" : undefined}
                  placeholder="you@example.com"
                />
              </label>
            )}
            {needsPassword && (
              <label className="field">
                <span>
                  {mode === "update-password" ? "New password" : "Password"}
                </span>
                <div className="password-field">
                  <input
                    ref={passwordRef}
                    type={show ? "text" : "password"}
                    name="password"
                    autoComplete={
                      mode === "sign-in" ? "current-password" : "new-password"
                    }
                    value={password}
                    maxLength={256}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!error}
                    aria-describedby={error ? "auth-error" : undefined}
                  />
                  <Button
                    variant="ghost"
                    onClick={() => setShow((x) => !x)}
                    aria-label={show ? "Hide password" : "Show password"}
                    aria-pressed={show}
                  >
                    {show ? "Hide" : "Show"}
                  </Button>
                </div>
                {mode !== "sign-in" && (
                  <span className="field-help">
                    At least 12 characters; your workspace may require more.
                    Password managers and paste are welcome.
                  </span>
                )}
              </label>
            )}
            {error && (
              <div id="auth-error">
                <Notice error>{error}</Notice>
              </div>
            )}
            {success && <Notice>{success}</Notice>}
            <Button
              type="submit"
              busy={busy}
              disabled={!enabled}
              className="w-full"
            >
              {mode === "sign-in"
                ? "Sign in"
                : mode === "sign-up"
                  ? "Create account"
                  : mode === "forgot-password"
                    ? "Send reset link"
                    : "Update password"}
            </Button>
          </form>
          <div className="auth-links">
            {mode === "sign-in" ? (
              <>
                <Link href="/forgot-password">Forgot password?</Link>
                <p>
                  New to NenSync? <Link href="/sign-up">Create an account</Link>
                </p>
              </>
            ) : (
              <Link href="/sign-in">Back to sign in</Link>
            )}
            <Link href="/demo">Explore the interactive preview</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
