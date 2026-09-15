import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { saveOpportunity, unsaveOpportunity } from "@/lib/database";

const savedSchema = z.object({ opportunityId: z.string().min(1) });

async function getLearner() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { userId?: string; role?: string } | undefined;
  return user?.userId && user.role === "LEARNER" ? user.userId : null;
}

export async function POST(request: Request) {
  const userId = await getLearner();
  if (!userId) return NextResponse.json({ error: "Only authenticated applicants can save opportunities." }, { status: 403 });
  const parsed = savedSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Opportunity ID is required." }, { status: 400 });
  await saveOpportunity(userId, parsed.data.opportunityId);
  return NextResponse.json({ saved: true });
}

export async function DELETE(request: Request) {
  const userId = await getLearner();
  if (!userId) return NextResponse.json({ error: "Only authenticated applicants can remove saved opportunities." }, { status: 403 });
  const parsed = savedSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Opportunity ID is required." }, { status: 400 });
  await unsaveOpportunity(userId, parsed.data.opportunityId);
  return NextResponse.json({ saved: false });
}
