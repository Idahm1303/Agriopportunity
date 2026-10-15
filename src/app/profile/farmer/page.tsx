import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FarmerProfileForm } from "@/components/FarmerProfileForm";
import { ProfileDocumentsPanel } from "@/components/ProfileDocumentsPanel";
import { authOptions } from "@/lib/auth";
import { findUserById, getFarmBusinessOnboardingStatus, getUserProfiles, getUserRoles } from "@/lib/database";

export default async function FarmerProfilePage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { userId?: string } | undefined)?.userId;
  if (!userId) redirect("/login?callbackUrl=%2Fprofile%2Ffarmer");
  const roles = await getUserRoles(userId);
  if (!roles.includes("FARMER")) redirect("/dashboard");
  const [user, profiles, onboarding] = await Promise.all([
    findUserById(userId),
    getUserProfiles(userId),
    getFarmBusinessOnboardingStatus(userId, "FARMER"),
  ]);
  const farmer = profiles.farmer;
  if (!user) redirect("/login?callbackUrl=%2Fprofile%2Ffarmer");

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-leaf">Farmer profile</p>
        <h1 className="mt-2 font-display text-4xl text-forest">{onboarding.complete ? "Manage your farm profile" : "Set up your farm to continue"}</h1>
        <p className="mt-2 text-inkSoft">Complete your farm and contact details to continue. You can upload an ID, business registration, or certificate now, or add those documents later from your profile.</p>
        {onboarding.complete ? <Link href="/dashboard" className="mt-4 inline-flex rounded-xl bg-forest px-5 py-3 text-sm font-semibold text-white">Go to your dashboard</Link> : null}
      </div>
      <FarmerProfileForm initialProfile={farmer} initialContact={{ phoneNumber: user.phoneNumber, location: user.location }} />
      <ProfileDocumentsPanel onboardingMode={!onboarding.complete} onboardingProfileComplete={onboarding.profileComplete} allowProfileOnlyContinue />
    </main>
  );
}
