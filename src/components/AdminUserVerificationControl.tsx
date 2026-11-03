"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type VerificationStatus = "pending" | "verified" | "rejected";

export function AdminUserVerificationControl({
  userId,
  initialStatus,
}: {
  userId: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<VerificationStatus>(
    initialStatus === "verified" || initialStatus === "rejected" ? initialStatus : "pending",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/admin/employers/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to update account verification.");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update account verification.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`verification-${userId}`}>Organization verification status</label>
      <select
        id={`verification-${userId}`}
        value={status}
        onChange={(event) => setStatus(event.target.value as VerificationStatus)}
        className="rounded-xl border border-inkSoft/20 bg-white px-3 py-2 text-sm text-ink"
      >
        <option value="pending">Pending</option>
        <option value="verified">Verified</option>
        <option value="rejected">Rejected</option>
      </select>
      <button
        type="button"
        disabled={isSaving || status === initialStatus}
        onClick={() => void save()}
        className="rounded-full bg-forest px-4 py-2 text-sm font-medium text-cream disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving ? "Saving..." : "Save"}
      </button>
      {error ? <p role="alert" className="basis-full text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
