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

    router.push("/dashboard");
    router.refresh();
    setIsSubmitting(false);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-forest/10 lg:grid-cols-2">
        <div className="bg-forest p-8 text-cream lg:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-goldSoft">Welcome back</p>
          <h1 className="mt-4 font-display text-4xl text-cream">Log in to continue</h1>
          <p className="mt-5 text-base leading-7 text-cream/90">
            Access your learner dashboard, track applications, and discover opportunities that match your skills.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-8 lg:p-12">
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
            className="inline-flex w-full items-center justify-center rounded-full bg-forest px-5 py-3 font-medium text-cream transition hover:bg-leaf disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
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
