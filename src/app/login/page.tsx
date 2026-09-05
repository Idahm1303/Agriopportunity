"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "learner@agriopportunity.co.za", password: "Password123!" });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setIsSubmitting(false);
      return;
    }

    router.push("/profile");
    router.refresh();
    setIsSubmitting(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_70px_rgba(17,42,29,0.12)] ring-1 ring-forest/10 lg:grid-cols-[1.05fr_1.1fr]">
        <div className="bg-[linear-gradient(135deg,#244C35_0%,#315d42_46%,#1d382d_100%)] p-8 text-cream lg:p-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg font-semibold ring-1 ring-white/20">
            A
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-goldSoft">Welcome back</p>
          <h1 className="mt-4 font-display text-4xl text-cream lg:text-5xl">Log in to continue</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-cream/90">
            Access your learner dashboard, track applications, and discover opportunities that match your skills.
          </p>
          <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-sm text-cream/80">Demo learner access</p>
            <p className="mt-2 font-medium text-white">learner@agriopportunity.co.za</p>
            <p className="text-sm text-goldSoft">Password123!</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-8 lg:p-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-leaf">Account access</p>
            <h2 className="mt-3 font-display text-3xl text-forest">Sign in</h2>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-ink" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="w-full rounded-xl border border-inkSoft/20 bg-cream px-3 py-3 text-base text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-ink" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className="w-full rounded-xl border border-inkSoft/20 bg-cream px-3 py-3 text-base text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
              required
            />
          </div>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-full bg-forest px-5 py-3.5 font-medium text-cream shadow-lg shadow-forest/15 transition hover:bg-leaf disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
          >
            {isSubmitting ? "Signing in..." : "Log in"}
          </button>

          <p className="text-sm text-inkSoft">
            Need an account? <Link href="/register" className="font-medium text-forest underline">Register</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
