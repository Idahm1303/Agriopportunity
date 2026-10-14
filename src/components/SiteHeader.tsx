"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { roles } from "@/lib/agri-options";

const roleLabels: Record<string, string> = {
  LEARNER: "Learner",
  FARMER: "Farmer",
  SMME: "SMME",
  COOPERATIVE: "Co-operative",
  EMPLOYER: "Employer",
  PROVIDER: "Provider",
  ADMIN: "Admin",
};

function dashboardFor(role: string) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "EMPLOYER" || role === "PROVIDER") return "/employer/dashboard";
  return "/dashboard";
}

export function SiteHeader() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = session?.user as { role?: string; roles?: string[] } | undefined;
  const activeRole = user?.role ?? "";
  const assignedRoles = user?.roles ?? (activeRole ? [activeRole] : []);

  const switchRole = async (nextRole: string) => {
    if (!nextRole || nextRole === activeRole) return;
    setIsSwitching(true);
    setError(null);
    try {
      if (!assignedRoles.includes(nextRole)) {
        const response = await fetch("/api/v1/profile/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: nextRole }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Unable to add this role.");
      }
      const activeRoleResponse = await fetch("/api/v1/profile/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const activeRolePayload = await activeRoleResponse.json();
      if (!activeRoleResponse.ok) throw new Error(activeRolePayload.error ?? "Unable to switch active role.");
      const updatedSession = await update({ activeRole: nextRole });
      const updatedUser = updatedSession?.user as { role?: string } | undefined;
      if (updatedUser?.role !== nextRole) throw new Error("Unable to switch active role.");
      router.push(dashboardFor(nextRole));
      router.refresh();
    } catch (switchError) {
      setError(switchError instanceof Error ? switchError.message : "Unable to switch active role.");
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <header className="border-b border-white/15 bg-forest text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-display text-2xl tracking-tight">AgriOpportunity</Link>
        <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <Link href="/opportunities" className="rounded-full border border-goldSoft/70 px-3 py-2 text-white/90 hover:bg-leaf">Opportunities</Link>
          {status === "authenticated" ? (
            <>
              <Link href={dashboardFor(activeRole)} className="rounded-full border border-goldSoft/70 px-3 py-2 text-white/90 hover:bg-leaf">Dashboard</Link>
              <label className="flex items-center gap-2 rounded-full border border-white/25 px-3 py-1.5">
                <span className="sr-only">Active role</span>
                <select value={activeRole} disabled={isSwitching} onChange={(event) => void switchRole(event.target.value)} className="max-w-40 bg-forest text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldSoft">
                  {roles.map((role) => <option key={role} value={role}>{roleLabels[role]}{assignedRoles.includes(role) ? "" : " (add role)"}</option>)}
                  {assignedRoles.includes("ADMIN") && !roles.includes("ADMIN" as typeof roles[number]) ? <option value="ADMIN">Admin</option> : null}
                </select>
                {isSwitching ? <span aria-live="polite" className="text-xs text-goldSoft">Saving</span> : null}
              </label>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-full border border-goldSoft/70 px-3 py-2 text-white/90 hover:bg-leaf">Log in</Link>
              <Link href="/register" className="rounded-full bg-gold px-4 py-2 text-forest hover:bg-goldSoft">Join</Link>
            </>
          )}
        </nav>
        {error ? <p role="alert" className="basis-full text-right text-sm text-red-100">{error}</p> : null}
      </div>
    </header>
  );
}
