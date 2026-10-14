import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { SmmeDiagnosticWizard } from "@/components/SmmeDiagnosticWizard";
import { SmmeProfileForm } from "@/components/SmmeProfileForm";
import { ProfileDocumentsPanel } from "@/components/ProfileDocumentsPanel";
import { authOptions } from "@/lib/auth";
import { getUserProfiles, getUserRoles } from "@/lib/database";

export default async function SmmeProfilePage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { userId?: string } | undefined)?.userId;
  if (!userId) redirect("/login?callbackUrl=%2Fprofile%2Fsmme");
  const roles = await getUserRoles(userId);
  if (!roles.includes("SMME") && !roles.includes("COOPERATIVE")) redirect("/dashboard");
  const { smme } = await getUserProfiles(userId);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-leaf">SMME profile</p>
        <h1 className="mt-2 font-display text-4xl text-forest">Build your business growth plan</h1>
        <p className="mt-2 text-inkSoft">Save your profile, then take a short readiness check to find practical next steps and support programmes.</p>
      </div>
      <SmmeProfileForm initialProfile={smme} />
      <SmmeDiagnosticWizard />
      <ProfileDocumentsPanel />
    </main>
  );
}
