"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "LEARNER",
    location: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          skills: ["Crop science", "Farm operations"],
          qualifications: ["National Diploma"],
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Registration failed.");
      }

      router.push("/login");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_70px_rgba(17,42,29,0.12)] ring-1 ring-forest/10 lg:grid-cols-[1.05fr_1.1fr]">
        <div className="bg-[linear-gradient(135deg,#244C35_0%,#315d42_46%,#1d382d_100%)] p-8 text-cream lg:p-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg font-semibold ring-1 ring-white/20">
            A
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-goldSoft">Join AgriOpportunity</p>
          <h1 className="mt-4 font-display text-4xl text-cream lg:text-5xl">Create your account</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-cream/90">
            Sign up as a learner, employer, or admin to unlock tailored agricultural opportunities and application tracking.
          </p>
          <div className="mt-8 space-y-4">
            {[
              "Tailored opportunity matching",
              "Visible application tracking",
              "Access to learnerships, jobs, and funding",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-cream/90">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold/20 text-goldSoft">✓</span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-8 lg:p-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-leaf">Get started</p>
            <h2 className="mt-3 font-display text-3xl text-forest">Build your profile</h2>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-ink" htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              value={form.fullName}
              onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              className="w-full rounded-xl border border-inkSoft/20 bg-cream px-3 py-3 text-base text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
              required
            />
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

          <div>
            <label className="mb-2 block text-sm font-medium text-ink" htmlFor="role">Role</label>
            <select
              id="role"
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
              className="w-full rounded-xl border border-inkSoft/20 bg-cream px-3 py-3 text-base text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
            >
              <option value="LEARNER">Learner</option>
              <option value="EMPLOYER">Employer</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-ink" htmlFor="location">Location</label>
            <input
              id="location"
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
              className="w-full rounded-xl border border-inkSoft/20 bg-cream px-3 py-3 text-base text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
            />
          </div>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-full bg-forest px-5 py-3.5 font-medium text-cream shadow-lg shadow-forest/15 transition hover:bg-leaf disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>

          <p className="text-sm text-inkSoft">
            Already have an account? <Link href="/login" className="font-medium text-forest underline">Log in</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
