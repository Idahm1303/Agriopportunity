import Link from "next/link";

import { countLearners } from "@/lib/database";

const featureCards = [
  {
    title: "Career pathways",
    description: "Jobs, learnerships, bursaries, and funding opportunities tailored to agricultural learners and SMMEs.",
  },
  {
    title: "Skills matching",
    description: "Quick match scores help candidates identify roles that align with their experience and qualifications.",
  },
  {
    title: "Visible tracking",
    description: "Learners can follow each application from submission to employer review and final status update.",
  },
];

export default async function Home() {
  const learnerCount = await countLearners();

  return (
    <main className="min-h-screen bg-[#536b43] text-[#f5f4e8]">
      <header className="border-b border-[#9aaa72]/40 bg-[#263a24] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="font-display text-2xl tracking-tight">AgriOpportunity</p>
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/dashboard" className="hover:text-goldSoft">Dashboard</Link>
            <Link href="/register" className="rounded-full bg-[#c4c994] px-4 py-2 text-[#263a24] hover:bg-[#d9dcb5]">Create account</Link>
            <Link href="/employer/dashboard" className="hover:text-goldSoft">Employer</Link>
            <Link href="/opportunities?category=funding" className="hover:text-goldSoft">Funding</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-24">
        <div className="space-y-7">
          <span className="inline-flex rounded-full border border-[#c4c994]/70 bg-[#708957] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#f5f4e8]">
            AgriConnect 360
          </span>
          <h1 className="font-display text-5xl leading-tight text-white sm:text-6xl">
            Grow your future in agriculture.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-cream/85">
            AgriOpportunity connects learners, job seekers, and agricultural SMMEs with the right opportunities in work-integrated learning, employment, funding, and enterprise growth.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-[#c4c994]/70 bg-[#708957] px-6 py-3 font-medium text-white transition hover:bg-[#879d68] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c4c994]"
            >
              Login
            </Link>
          </div>
        </div>

        <div className="rounded-[1.5rem] bg-[#708957] p-4 shadow-lg ring-1 ring-[#9aaa72]/50">
          <div className="grid gap-3">
            <div className="rounded-xl bg-[#879d68] p-3 text-white">
              <p className="text-sm font-medium text-white/85">Open positions</p>
              <p className="mt-1 font-display text-3xl">148</p>
            </div>
            <div className="rounded-xl bg-[#263a24] p-3 text-[#f5f4e8]">
              <p className="text-sm font-medium text-[#c4c994]">Learners</p>
              <p className="mt-1 font-display text-3xl">{learnerCount.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-[#c4c994]/60 bg-[#536b43] p-3 text-[#f5f4e8]">
              <p className="text-sm font-medium text-[#c4c994]">Funding partners</p>
              <p className="mt-1 font-display text-3xl">19</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#263a24]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#c4c994]">Why AgriOpportunity</p>
            <h2 className="mt-3 font-display text-3xl text-white">A marketplace built for agricultural growth.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {featureCards.map((card) => (
              <article key={card.title} className="rounded-3xl border border-[#9aaa72]/50 bg-[#3f5831] p-6 shadow-sm">
                <h3 className="font-display text-2xl text-white">{card.title}</h3>
                <p className="mt-4 text-base leading-7 text-cream/80">{card.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
