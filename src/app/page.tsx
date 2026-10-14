import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { connection } from "next/server";

import { Hero } from "@/components/Hero";
import { countFundingPartners, countLearners, countOpenOpportunities } from "@/lib/database";

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
  await connection();
  const dataSaver = (await cookies()).get("agri-data-saver")?.value === "on";
  const [learnerCount, openOpportunityCount, fundingPartnerCount] = await Promise.all([
    countLearners(),
    countOpenOpportunities(),
    countFundingPartners(),
  ]);

  return (
    <main className="min-h-screen bg-agri-mint text-ink">
      <Hero dataSaver={dataSaver} />

      <section className="bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-leaf">Why AgriOpportunity</p>
              <h2 className="mt-3 font-display text-3xl text-forest">A marketplace built for agricultural growth.</h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-inkSoft">
                Connecting practical agricultural skills with modern tools and opportunities for the future.
              </p>
            </div>
            <div className="flex w-full flex-col gap-4 sm:w-auto sm:items-end">
              {!dataSaver ? (
                <div className="relative aspect-[3/2] w-full max-w-sm overflow-hidden rounded-3xl shadow-lg ring-1 ring-leaf/20">
                  <Image
                    src="/images/hero-tech.jpg"
                    alt="Young agricultural plants alongside digital farming technology graphics"
                    fill
                    sizes="(max-width: 640px) 100vw, 384px"
                    className="object-cover"
                    data-saver-decorative="true"
                  />
                </div>
              ) : null}
              <Link href="/login" className="inline-flex min-h-11 items-center justify-center self-start rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-leaf focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft sm:self-end">
                Login
              </Link>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {featureCards.map((card, index) => (
              <article key={card.title} className="rounded-3xl border border-leaf/15 bg-white p-6 shadow-sm">
                <p className="font-display text-3xl text-gold">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-4 font-display text-2xl text-forest">{card.title}</h3>
                <p className="mt-4 text-base leading-7 text-inkSoft">{card.description}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Open opportunities", value: openOpportunityCount.toLocaleString() },
              { label: "Learners", value: learnerCount.toLocaleString() },
              { label: "Funding partners", value: fundingPartnerCount.toLocaleString() },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-white/70 px-5 py-4 ring-1 ring-leaf/15">
                <p className="text-sm font-medium text-inkSoft">{stat.label}</p>
                <p className="mt-1 font-display text-3xl text-forest">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
