import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { FarmerProfileForm } from "@/components/FarmerProfileForm";
import { ProfileDocumentsPanel } from "@/components/ProfileDocumentsPanel";
import { authOptions } from "@/lib/auth";
import { getUserProfiles, getUserRoles } from "@/lib/database";

export default async function FarmerProfilePage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { userId?: string } | undefined)?.userId;
  if (!userId) redirect("/login?callbackUrl=%2Fprofile%2Ffarmer");
  const roles = await getUserRoles(userId);
  if (!roles.includes("FARMER")) redirect("/dashboard");
  const { farmer } = await getUserProfiles(userId);

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-leaf">Farmer profile</p>
        <h1 className="mt-2 font-display text-4xl text-forest">Tell us about your farm</h1>
        <p className="mt-2 text-inkSoft">This helps us find useful training, funding, mentorship, market and equipment opportunities.</p>
      </div>
      <FarmerProfileForm initialProfile={farmer} />
      <ProfileDocumentsPanel />
    </main>
  );
}
