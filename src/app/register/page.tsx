"use client";

import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { languages, provinces } from "@/lib/agri-options";

export default function RegisterPage({ searchParams }: { searchParams: Promise<{ role?: string | string[] }> }) {
  const router = useRouter();
  const query = use(searchParams);
  const requestedRole = Array.isArray(query.role) ? query.role[0] : query.role;
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: ["LEARNER", "FARMER", "SMME", "COOPERATIVE", "EMPLOYER", "PROVIDER"].includes(requestedRole ?? "") ? requestedRole! : "LEARNER",
    organizationName: "",
    phoneNumber: "",
    location: "",
    province: "",
    preferredLanguage: "English",
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
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          organizationName: form.organizationName.trim(),
          phoneNumber: form.phoneNumber.trim(),
          location: form.location.trim(),
          townDistrict: form.location.trim(),
          province: form.province || undefined,
          preferredLanguage: form.preferredLanguage,
          skills: form.role === "LEARNER" ? ["Crop science", "Farm operations"] : [],
          qualifications: form.role === "LEARNER" ? ["National Diploma"] : [],
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Registration failed.");
      }

      const login = await signIn("credentials", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        redirect: false,
      });

      if (login?.error) {
        router.push("/login");
      } else {
        router.push(form.role === "EMPLOYER" || form.role === "PROVIDER" ? "/employer/dashboard" : form.role === "LEARNER" ? "/profile" : "/dashboard");
      }
      router.refresh();
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
              {form.role === "EMPLOYER" || form.role === "PROVIDER"
                ? "Create an organisation account to post opportunities, receive applications, and manage applicant progress."
                : form.role === "FARMER"
                  ? "Create a farmer profile to find training, mentors, markets, equipment and funding for your farm."
                  : form.role === "SMME" || form.role === "COOPERATIVE"
                    ? "Build your agricultural business profile, find support programmes and funding, and track applications."
                    : "Create a learner account to find opportunities that match your skills and track your applications."}
          </p>
          {form.role === "FARMER" ? (
            <div className="relative mt-7 aspect-[16/8] w-full max-w-lg overflow-hidden rounded-2xl ring-1 ring-white/20">
              <Image
                src="/images/farmer-farm.jpg"
                alt="Green crop fields and farm machinery beneath the mountains"
                fill
                sizes="(max-width: 1024px) 100vw, 512px"
                className="object-cover"
              />
            </div>
          ) : null}
          <div className="mt-8 space-y-4">
            {[
              "Tailored opportunity matching",
              "Visible application tracking",
              "Support for learners, farmers, and SMMEs",
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
            <h2 className="mt-3 font-display text-3xl text-forest">{form.role === "EMPLOYER" || form.role === "PROVIDER" ? "Create organisation account" : "Build your profile"}</h2>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-ink" htmlFor="fullName">{form.role === "EMPLOYER" ? "Name and surname" : "Full name"}</label>
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
              minLength={8}
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
              <option value="FARMER">Farmer</option>
              <option value="SMME">Small business (SMME)</option>
              <option value="COOPERATIVE">Co-operative</option>
              <option value="EMPLOYER">Employer</option>
              <option value="PROVIDER">Training or support provider</option>
            </select>
          </div>

          {["EMPLOYER", "PROVIDER", "SMME", "COOPERATIVE"].includes(form.role) ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-ink" htmlFor="organizationName">Organisation name</label>
              <input
                id="organizationName"
                value={form.organizationName}
                onChange={(event) => setForm({ ...form, organizationName: event.target.value })}
                className="w-full rounded-xl border border-inkSoft/20 bg-cream px-3 py-3 text-base text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
                required={form.role === "EMPLOYER" || form.role === "PROVIDER"}
              />
              <p className="mt-2 text-xs text-inkSoft">Use the organisation name applicants will see on your listings.</p>
            </div>
          ) : null}

          {form.role === "EMPLOYER" || form.role === "PROVIDER" ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-ink" htmlFor="phoneNumber">Contact number</label>
              <input
                id="phoneNumber"
                type="tel"
                autoComplete="tel"
                value={form.phoneNumber}
                onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })}
                className="w-full rounded-xl border border-inkSoft/20 bg-cream px-3 py-3 text-base text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
                required
              />
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-medium text-ink" htmlFor="province">Province</label>
            <select
              id="province"
              value={form.province}
              onChange={(event) => setForm({ ...form, province: event.target.value })}
              required={["FARMER", "SMME", "COOPERATIVE", "EMPLOYER", "PROVIDER"].includes(form.role)}
              className="w-full rounded-xl border border-inkSoft/20 bg-cream px-3 py-3 text-base text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
            >
              <option value="">Choose a province</option>
              {provinces.map((province) => <option key={province} value={province}>{province}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink" htmlFor="location">Town or district (optional)</label>
            <input
              id="location"
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
              className="w-full rounded-xl border border-inkSoft/20 bg-cream px-3 py-3 text-base text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink" htmlFor="preferredLanguage">Preferred language</label>
            <select
              id="preferredLanguage"
              value={form.preferredLanguage}
              onChange={(event) => setForm({ ...form, preferredLanguage: event.target.value })}
              className="w-full rounded-xl border border-inkSoft/20 bg-cream px-3 py-3 text-base text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
            >
              {languages.map((language) => <option key={language} value={language}>{language}</option>)}
            </select>
          </div>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-full bg-forest px-5 py-3.5 font-medium text-cream shadow-lg shadow-forest/15 transition hover:bg-leaf disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
          >
              {isSubmitting ? "Creating account..." : form.role === "EMPLOYER" || form.role === "PROVIDER" ? "Create organisation account" : "Create account"}
          </button>

          <p className="text-sm text-inkSoft">
            Already have an account? <Link href="/login" className="font-medium text-forest underline">Log in</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
