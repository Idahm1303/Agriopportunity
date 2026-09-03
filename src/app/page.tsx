import Link from "next/link";

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

export default function Home() {
  return (
    <main className="min-h-screen bg-cream text-ink">
      <header className="border-b border-forest/10 bg-forest text-cream">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="font-display text-2xl tracking-tight">AgriOpportunity</p>
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/opportunities" className="hover:text-goldSoft">Opportunities</Link>
            <Link href="/dashboard" className="hover:text-goldSoft">Dashboard</Link>
            <Link href="/login" className="rounded-full bg-gold px-4 py-2 text-ink hover:bg-goldSoft">Login</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-24">
        <div className="space-y-7">
          <span className="inline-flex rounded-full border border-forest/20 bg-forest/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-forest">
            AgriConnect 360
          </span>
          <h1 className="font-display text-5xl leading-tight text-forest sm:text-6xl">
            Grow your future in agriculture.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-inkSoft">
            AgriOpportunity connects learners, job seekers, and agricultural SMMEs with the right opportunities in work-integrated learning, employment, funding, and enterprise growth.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full bg-forest px-6 py-3 font-medium text-cream transition hover:bg-leaf focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
            >
              Create account
            </Link>
            <Link
              href="/opportunities"
              className="inline-flex items-center justify-center rounded-full border border-forest/20 bg-white px-6 py-3 font-medium text-forest transition hover:bg-cream2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
            >
              Browse opportunities
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-lg ring-1 ring-forest/10">
          <div className="grid gap-4">
            <div className="rounded-2xl bg-cream2 p-4">
              <p className="text-sm font-medium text-forest">Open positions</p>
              <p className="mt-2 font-display text-4xl text-ink">148</p>
            </div>
            <div className="rounded-2xl bg-forest p-4 text-cream">
              <p className="text-sm font-medium text-goldSoft">Active learners</p>
              <p className="mt-2 font-display text-4xl">3,240</p>
            </div>
            <div className="rounded-2xl bg-goldSoft p-4 text-ink">
              <p className="text-sm font-medium text-forest">Funding partners</p>
              <p className="mt-2 font-display text-4xl">19</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-leaf">Why AgriOpportunity</p>
            <h2 className="mt-3 font-display text-3xl text-forest">A marketplace built for agricultural growth.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {featureCards.map((card) => (
              <article key={card.title} className="rounded-3xl border border-forest/10 bg-cream p-6 shadow-sm">
                <h3 className="font-display text-2xl text-forest">{card.title}</h3>
                <p className="mt-4 text-base leading-7 text-inkSoft">{card.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
