"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function FarmBusinessActions() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = session?.user as { roles?: string[] } | undefined;

  const openOpportunityPosting = async () => {
    setIsSwitching(true);
    setError(null);
    try {
      if (!user?.roles?.includes("EMPLOYER")) {
        const addRole = await fetch("/api/v1/profile/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "EMPLOYER" }),
        });
        const addRoleResult = await addRole.json();
        if (!addRole.ok) throw new Error(addRoleResult.error ?? "Unable to enable opportunity posting.");
      }

      const switchRole = await fetch("/api/v1/profile/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "EMPLOYER" }),
      });
      const switchRoleResult = await switchRole.json();
      if (!switchRole.ok) throw new Error(switchRoleResult.error ?? "Unable to open opportunity posting.");

      const updatedSession = await update({ activeRole: "EMPLOYER" });
      const updatedUser = updatedSession?.user as { role?: string } | undefined;
      if (updatedUser?.role !== "EMPLOYER") throw new Error("Unable to switch to the employer dashboard.");
      router.push("/employer/dashboard");
      router.refresh();
    } catch (switchError) {
      setError(switchError instanceof Error ? switchError.message : "Unable to open opportunity posting.");
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="space-y-2">
      <button type="button" onClick={() => void openOpportunityPosting()} disabled={isSwitching} className="w-full rounded-xl bg-forest px-5 py-4 text-left font-semibold text-white disabled:opacity-60">
        {isSwitching ? "Opening employer tools..." : "Post an opportunity"}
        <span className="mt-1 block text-sm font-normal text-white/80">Open employer tools to post a vacancy, seasonal role, learnership, internship, or partnership need.</span>
      </button>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
