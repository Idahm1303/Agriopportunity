import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { getSupportProgrammeRecommendations, getUserRoles } from "@/lib/database";
import { diagnosticQuestions } from "@/lib/smme-diagnostic";

const acceptedGaps = diagnosticQuestions.flatMap(({ key, gap }) => [key, gap]);
const recommendationSchema = z.object({
  userId: z.string().uuid().optional(),
  gaps: z.array(z.string().min(1).max(120)).min(1).max(12),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Provide a valid diagnostic gap list." }, { status: 400 });
  }
  const parsed = recommendationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Provide between 1 and 12 valid diagnostic gaps." }, { status: 400 });
  if (parsed.data.gaps.some((gap) => !acceptedGaps.includes(gap as typeof acceptedGaps[number]))) {
    return NextResponse.json({ error: "One or more diagnostic gaps are not supported." }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { userId?: string; role?: string } | undefined;
  const integrationToken = process.env.AGRISMME_API_TOKEN;
  const validIntegration = Boolean(integrationToken && request.headers.get("authorization") === `Bearer ${integrationToken}`);
  const userId = sessionUser?.userId ?? (validIntegration ? parsed.data.userId : undefined);
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (sessionUser?.userId && parsed.data.userId && parsed.data.userId !== sessionUser.userId) {
    return NextResponse.json({ error: "You can only request recommendations for your own profile." }, { status: 403 });
  }
  if (sessionUser?.role !== "SMME" && sessionUser?.role !== "COOPERATIVE" && !validIntegration) {
    return NextResponse.json({ error: "An SMME or co-operative role is required." }, { status: 403 });
  }
  const roles = await getUserRoles(userId);
  if (!roles.some((role) => role === "SMME" || role === "COOPERATIVE")) {
    return NextResponse.json({ error: "The supplied user does not have an SMME or co-operative role." }, { status: 403 });
  }

  const opportunities = await getSupportProgrammeRecommendations(userId, parsed.data.gaps);
  return NextResponse.json({ userId, opportunities });
}
