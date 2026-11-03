"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Role } from "@/lib/mock-data";

const accountRoles: Role[] = ["LEARNER", "FARMER", "SMME", "COOPERATIVE", "EMPLOYER", "PROVIDER", "ADMIN"];

function roleLabel(role: Role) {
  return role === "ADMIN" ? "Administrator" : role.replaceAll("_", " ");
}

export function AdminUserControls({
  userId,
  adminId,
  accountStatus,
  accountStatusReason,
  assignedRoles,
}: {
  userId: string;
  adminId: string;
  accountStatus: string;
  accountStatusReason: string | null;
  assignedRoles: Role[];
}) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role>("LEARNER");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const updateAccount = async (action: string, extra: Record<string, string> = {}) => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to update this account.");
      setReason("");
      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update this account.");
    } finally {
      setIsSaving(false);
    }
  };

  const changeStatus = (action: "suspend" | "delete") => {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 5) {
      setError("Enter a reason with at least 5 characters.");
      return;
    }
    void updateAccount(action, { reason: trimmedReason });
  };

  const isActive = accountStatus === "active";
  const canChangeOwnRoles = userId !== adminId;

  return (
    <div className="w-full space-y-3 rounded-xl border border-forest/10 bg-white p-3">
      <p className="text-sm font-semibold text-ink">
        Account: {accountStatus === "active" ? "Active" : accountStatus === "deleted" ? "Soft deleted" : "Suspended"}
      </p>
      {accountStatusReason ? <p className="text-xs text-inkSoft">Reason: {accountStatusReason}</p> : null}
      {isActive ? (
        <>
          <label className="block text-xs font-medium text-inkSoft" htmlFor={`account-reason-${userId}`}>
            Reason for suspension or soft deletion
            <input
              id={`account-reason-${userId}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              className="mt-1 block w-full rounded-lg border border-inkSoft/20 px-2 py-1.5 text-sm text-ink"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={isSaving} onClick={() => changeStatus("suspend")} className="rounded-full border border-forest/20 px-3 py-1.5 text-xs font-medium text-forest disabled:opacity-50">
              Suspend / block
            </button>
            <button type="button" disabled={isSaving} onClick={() => changeStatus("delete")} className="rounded-full border border-red-700/20 px-3 py-1.5 text-xs font-medium text-red-700 disabled:opacity-50">
              Soft delete
            </button>
          </div>
        </>
      ) : (
        <button type="button" disabled={isSaving} onClick={() => void updateAccount("reactivate")} className="rounded-full bg-forest px-3 py-1.5 text-xs font-medium text-cream disabled:opacity-50">
          Reactivate account
        </button>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`account-role-${userId}`}>Role to assign or revoke</label>
        <select
          id={`account-role-${userId}`}
          value={selectedRole}
          onChange={(event) => {
            const role = accountRoles.find((item) => item === event.target.value);
            if (role) setSelectedRole(role);
          }}
          className="rounded-lg border border-inkSoft/20 bg-white px-2 py-1.5 text-xs text-ink"
        >
          {accountRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
        </select>
        <button
          type="button"
          disabled={isSaving || assignedRoles.includes(selectedRole) || !canChangeOwnRoles}
          onClick={() => void updateAccount("assignRole", { role: selectedRole })}
          className="rounded-full border border-forest/20 px-3 py-1.5 text-xs font-medium text-forest disabled:opacity-50"
        >
          Assign role
        </button>
        <button
          type="button"
          disabled={isSaving || !assignedRoles.includes(selectedRole) || !canChangeOwnRoles}
          onClick={() => void updateAccount("revokeRole", { role: selectedRole })}
          className="rounded-full border border-forest/20 px-3 py-1.5 text-xs font-medium text-forest disabled:opacity-50"
        >
          Revoke role
        </button>
      </div>
      {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
