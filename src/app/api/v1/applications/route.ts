import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { addAuditEntry } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { createApplication, getUserApplications } from "@/lib/mock-data";

const applicationSchema = z.object({
  opportunityId: z.string().min(1, "Opportunity ID is required."),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = (session.user as { role?: string } | undefined)?.role ?? "LEARNER";
  const userId = (session.user as { userId?: string } | undefined)?.userId;

  if (role === "EMPLOYER" || role === "ADMIN") {
    return NextResponse.json({ applications: [] });
  }

  if (!userId) {
    return NextResponse.json({ error: "User session missing." }, { status: 400 });
  }

  return NextResponse.json({ applications: getUserApplications(userId) });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = (session.user as { role?: string } | undefined)?.role ?? "LEARNER";
  if (role !== "LEARNER") {
    return NextResponse.json({ error: "Only learners can apply." }, { status: 403 });
  }

  const userId = (session.user as { userId?: string } | undefined)?.userId;
  if (!userId) {
    return NextResponse.json({ error: "User session missing." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = applicationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid application payload." },
        { status: 400 },
      );
    }

    const application = createApplication({
      userId,
      opportunityId: parsed.data.opportunityId,
    });

    if (!application) {
      return NextResponse.json({ error: "Opportunity or user not found." }, { status: 404 });
    }

    addAuditEntry({
      action: "application_submitted",
      entityType: "application",
      entityId: application.id,
      performedBy: userId,
      details: `Applied to opportunity ${parsed.data.opportunityId}`,
    });

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit application." },
      { status: 500 },
    );
  }
}
