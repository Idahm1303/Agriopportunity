import { cookies } from "next/headers";
import { connection } from "next/server";

import { Hero } from "@/components/Hero";

export default async function Home() {
  await connection();
  const dataSaver = (await cookies()).get("agri-data-saver")?.value === "on";

  return (
    <main className="min-h-screen bg-agri-mint">
      <Hero dataSaver={dataSaver} />
    </main>
  );
}
