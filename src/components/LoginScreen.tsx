"use client";

import { FormEvent, useState } from "react";
import { FiLock, FiMail, FiTrendingUp } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";

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
    } catch {
      setError("Invalid login details. Contact admin if access is missing.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070b10] px-4 py-8 text-white">
      <section className="w-full max-w-sm">
        <div className="mb-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950 shadow-[0_0_40px_rgba(52,211,153,0.25)]">
            <FiTrendingUp size={24} />
          </div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-emerald-300">
            Private trading desk
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Login with the email and password shared by admin.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/40 backdrop-blur"
        >
          <label className="block text-sm font-medium text-slate-300">
            Email
          </label>
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4">
            <FiMail className="text-slate-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
              placeholder="user@example.com"
            />
          </div>

          <label className="mt-4 block text-sm font-medium text-slate-300">
            Password
          </label>
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4">
            <FiLock className="text-slate-500" />
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
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
