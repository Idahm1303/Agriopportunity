import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { moderateOpportunity } from "@/lib/database";

const moderationSchema = z.object({ status: z.enum(["open", "closed", "suspended"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { userId?: string; role?: string } | undefined;
  if (!user?.userId || user.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const parsed = moderationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Status must be open, closed, or suspended." }, { status: 400 });

  try {
    const { id } = await params;
    const opportunity = await moderateOpportunity({ opportunityId: id, status: parsed.data.status, adminId: user.userId });
    return NextResponse.json({ opportunity });
  } catch {
    return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
  }
}
