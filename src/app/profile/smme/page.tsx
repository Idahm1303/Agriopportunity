import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SmmeDiagnosticWizard } from "@/components/SmmeDiagnosticWizard";
import { SmmeProfileForm } from "@/components/SmmeProfileForm";
import { ProfileDocumentsPanel } from "@/components/ProfileDocumentsPanel";
import { authOptions } from "@/lib/auth";
import { findUserById, getFarmBusinessOnboardingStatus, getUserProfiles, getUserRoles } from "@/lib/database";

export default async function SmmeProfilePage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { userId?: string } | undefined)?.userId;
  if (!userId) redirect("/login?callbackUrl=%2Fprofile%2Fsmme");
  const roles = await getUserRoles(userId);
  if (!roles.includes("SMME") && !roles.includes("COOPERATIVE")) redirect("/dashboard");
  const activeRole = (session?.user as { role?: string } | undefined)?.role;
  const onboarding = await getFarmBusinessOnboardingStatus(userId, activeRole === "COOPERATIVE" ? "COOPERATIVE" : "SMME");
  const [user, profiles] = await Promise.all([findUserById(userId), getUserProfiles(userId)]);
  const smme = profiles.smme;
  if (!user) redirect("/login?callbackUrl=%2Fprofile%2Fsmme");

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-leaf">SMME profile</p>
        <h1 className="mt-2 font-display text-4xl text-forest">{onboarding.profileComplete ? "Manage your business profile" : "Set up your business to continue"}</h1>
        <p className="mt-2 text-inkSoft">Save your business and contact details to open your SMME dashboard and explore support programmes and funding. You can upload business documents after saving your profile.</p>
        {onboarding.profileComplete ? <Link href="/dashboard" className="mt-4 inline-flex rounded-xl bg-forest px-5 py-3 text-sm font-semibold text-white">Go to your dashboard</Link> : null}
      </div>
      <SmmeProfileForm initialProfile={smme} initialContact={{ phoneNumber: user.phoneNumber, location: user.location }} />
      {onboarding.profileComplete ? <SmmeDiagnosticWizard /> : null}
      <ProfileDocumentsPanel
        onboardingMode={!onboarding.profileComplete}
        onboardingProfileComplete={onboarding.profileComplete}
        allowProfileOnlyContinue
        documentsEnabled={onboarding.profileComplete}
      />
    </main>
  );
}
