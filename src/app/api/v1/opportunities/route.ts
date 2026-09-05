import { NextResponse } from "next/server";
import { z } from "zod";

import { addAuditEntry } from "@/lib/audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOpportunity, listOpportunities } from "@/lib/database";

const opportunitySchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().min(20, "Description must be at least 20 characters."),
  category: z.enum(["job", "learnership", "bursary", "funding"]),
  location: z.string().optional(),
  requiredSkills: z.array(z.string().min(2)).min(1, "Choose at least one required skill."),
});

export async function GET() {
  return NextResponse.json({ opportunities: await listOpportunities() });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role ?? "LEARNER";

  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!['EMPLOYER', 'ADMIN'].includes(role)) {
    return NextResponse.json({ error: "Only employers and admins can post opportunities." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = opportunitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid opportunity payload." },
        { status: 400 },
      );
    }

    const userId = (session.user as { userId?: string } | undefined)?.userId ?? session.user?.email ?? "system";
    const opportunity = await createOpportunity({
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      location: parsed.data.location,
      requiredSkills: parsed.data.requiredSkills,
      postedById: userId,
    });

    addAuditEntry({
      action: "opportunity_created",
      entityType: "opportunity",
      entityId: opportunity.id,
      performedBy: userId,
      details: `Created ${parsed.data.category} opportunity: ${parsed.data.title}`,
    });

    return NextResponse.json({ opportunity }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create opportunity." },
      { status: 500 },
    );
  }
}
