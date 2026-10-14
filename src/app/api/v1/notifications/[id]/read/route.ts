import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { getUserRoles, markOpportunityNotificationRead } from "@/lib/database";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { userId?: string } | undefined)?.userId;
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const roles = await getUserRoles(userId);
  if (!roles.some((role) => role === "SMME" || role === "COOPERATIVE")) {
    return NextResponse.json({ error: "An SMME or co-operative role is required." }, { status: 403 });
  }

  const { id } = await params;
  const updated = await markOpportunityNotificationRead(id, userId);
  if (!updated) return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  return NextResponse.json({ read: true });
}
