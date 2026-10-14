import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { createSmmeDiagnostic, getUserRoles } from "@/lib/database";
import { diagnosticQuestions } from "@/lib/smme-diagnostic";

const questionKeys = diagnosticQuestions.map(({ key }) => key);
const diagnosticSchema = z.object({
  answers: z.record(z.string(), z.number().int().min(0).max(3)),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { userId?: string } | undefined)?.userId;
  const activeRole = (session?.user as { role?: string } | undefined)?.role;
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const userRoles = await getUserRoles(userId);
  if ((activeRole !== "SMME" && activeRole !== "COOPERATIVE") || !userRoles.some((role) => role === "SMME" || role === "COOPERATIVE")) {
    return NextResponse.json({ error: "An SMME or co-operative role is required." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Provide diagnostic answers." }, { status: 400 });
  }
  const parsed = diagnosticSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Answer every readiness question from 0 to 3." }, { status: 400 });
  if (questionKeys.some((key) => parsed.data.answers[key] === undefined) || Object.keys(parsed.data.answers).length !== questionKeys.length) {
    return NextResponse.json({ error: "Answer every readiness question exactly once." }, { status: 400 });
  }

  const gaps = diagnosticQuestions
    .filter(({ key }) => parsed.data.answers[key] < 2)
    .sort((left, right) => parsed.data.answers[left.key] - parsed.data.answers[right.key])
    .map(({ key, gap, recommendedTypes }) => ({ key, label: gap, recommendedTypes: [...recommendedTypes] }));
  const score = Math.round(Object.values(parsed.data.answers).reduce((total, answer) => total + answer, 0) / (diagnosticQuestions.length * 3) * 100);
  const diagnostic = await createSmmeDiagnostic({ userId, answers: parsed.data.answers, score, gaps });
  return NextResponse.json({ diagnostic }, { status: 201 });
}
