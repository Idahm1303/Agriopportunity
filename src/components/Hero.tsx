import Link from "next/link";
import Image from "next/image";

export function Hero() {
  return (
    <section className="relative isolate min-h-[34rem] w-full overflow-hidden text-white sm:min-h-[38rem]">
      <Image
        src="/images/hero-seedling.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[center_55%]"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-forest/95 via-forest/75 to-forest/25" />
      <div className="relative mx-auto flex min-h-[34rem] max-w-6xl items-center px-4 py-16 sm:min-h-[38rem] sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="inline-flex rounded-full border border-goldSoft/70 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-goldSoft">
            AgriConnect 360
          </p>
          <h1 className="mt-6 font-display text-5xl leading-tight sm:text-6xl lg:text-7xl">
            Grow your future in agriculture.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/90 sm:text-xl">
            Find work-integrated learning, employment, funding, and enterprise opportunities built for agricultural learners and SMMEs.
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/opportunities"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-gold px-6 py-3 font-semibold text-forest transition hover:bg-goldSoft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
            >
              Explore opportunities
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/70 bg-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
            >
              Create account learner
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
