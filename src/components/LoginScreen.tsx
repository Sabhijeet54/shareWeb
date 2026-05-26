"use client";

import { FormEvent, useState } from "react";
import { FiLock, FiMail, FiTrendingUp } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";

function getAuthErrorMessage(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: string }).code)
      : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Invalid email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again in a few minutes.";
    case "auth/network-request-failed":
      return "Network issue. Check internet and retry.";
    case "auth/invalid-api-key":
      return "Firebase API key is invalid/missing in deployment environment.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized in Firebase Authentication settings.";
    default:
      return "Login failed. Please verify Firebase production env and auth setup.";
  }
}

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email.trim(), password);
    } catch (error) {
      setError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-8 text-[var(--text-primary)]">
      <section className="w-full max-w-sm">
        <div className="mb-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950 shadow-[0_0_40px_rgba(52,211,153,0.25)]">
            <FiTrendingUp size={24} />
          </div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[var(--accent-label)]">
            Private trading desk
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Login with the email and password shared by admin.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-2xl shadow-black/40 backdrop-blur"
        >
          <label className="block text-sm font-medium text-[var(--text-secondary)]">
            Email
          </label>
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--background)]/80 px-4">
            <FiMail className="text-[var(--text-muted)]" />
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              placeholder="user@example.com"
            />
          </div>

          <label className="mt-4 block text-sm font-medium text-[var(--text-secondary)]">
            Password
          </label>
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--background)]/80 px-4">
            <FiLock className="text-[var(--text-muted)]" />
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              placeholder="Password"
            />
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 h-12 w-full rounded-2xl bg-emerald-400 text-sm font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}
