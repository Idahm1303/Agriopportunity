import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { deliverApplicationEmails } from "@/lib/application-email";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!["LEARNER", "FARMER", "SMME", "COOPERATIVE"].includes((session.user as { role?: string } | undefined)?.role ?? "")) {
    return NextResponse.json({ error: "Only applicants can retry their application emails." }, { status: 403 });
  }

  const learnerId = (session.user as { userId?: string } | undefined)?.userId;
  if (!learnerId) return NextResponse.json({ error: "User session missing." }, { status: 400 });

  try {
    const { id } = await params;
    const emailDelivery = await deliverApplicationEmails(id, learnerId);
    return NextResponse.json({ emailDelivery });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to retry email delivery." }, { status: 500 });
  }
}