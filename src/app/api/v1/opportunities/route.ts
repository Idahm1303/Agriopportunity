import { NextResponse } from "next/server";
import { z } from "zod";

import { addAuditEntry } from "@/lib/audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOpportunity, listOpportunities } from "@/lib/database";
import { opportunityTypes } from "@/lib/agri-options";
import { hasValidAdditionalGrantDocuments } from "@/lib/grant-application";

const opportunitySchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().min(20, "Description must be at least 20 characters."),
  category: z.enum(opportunityTypes as [typeof opportunityTypes[number], ...typeof opportunityTypes[number][]]).optional(),
  type: z.enum(opportunityTypes as [typeof opportunityTypes[number], ...typeof opportunityTypes[number][]]).optional(),
  applicationEmail: z.string().email("Enter a valid application email."),
  location: z.string().optional(),
  province: z.string().max(80).optional(),
  targetAudience: z.array(z.enum(["learner", "farmer", "smme", "cooperative", "graduate"])).default([]),
  closingDate: z.string().date("Choose an opportunity closing date."),
  fundingAmountRange: z.string().max(100).optional(),
  eligibilityCriteria: z.record(z.string(), z.unknown()).refine(hasValidAdditionalGrantDocuments, "Add up to 10 valid extra grant document names.").optional(),
  applyUrl: z.url().optional(),
  requiredSkills: z.array(z.string().min(2)).min(1, "Choose at least one required skill."),
  expiresAt: z.string().optional(),
}).refine((data) => Boolean(data.type ?? data.category), { message: "Choose an opportunity type.", path: ["type"] });

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const type = query.get("type") ?? undefined;
  const audience = query.get("audience") ?? undefined;
  const province = query.get("province") ?? undefined;
  if (type && !opportunityTypes.includes(type as typeof opportunityTypes[number])) {
    return NextResponse.json({ error: "Unknown opportunity type." }, { status: 400 });
  }
  if (audience && !["learner", "farmer", "smme", "cooperative", "graduate"].includes(audience)) {
    return NextResponse.json({ error: "Unknown target audience." }, { status: 400 });
  }
  if (province && province.length > 80) return NextResponse.json({ error: "Province filter is too long." }, { status: 400 });
  const opportunities = await listOpportunities({
    type: type as typeof opportunityTypes[number] | undefined,
    audience,
    province,
  });
  return NextResponse.json({ opportunities });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role ?? "LEARNER";

  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!['EMPLOYER', 'PROVIDER', 'ADMIN'].includes(role)) {
    return NextResponse.json({ error: "Only employers, providers, and admins can post opportunities." }, { status: 403 });
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Provide a valid opportunity payload." }, { status: 400 });
    }
    const parsed = opportunitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid opportunity payload." },
        { status: 400 },
      );
    }

    const closingDate = new Date(`${parsed.data.closingDate}T23:59:59.999Z`);
    if (closingDate <= new Date()) {
      return NextResponse.json({ error: "The opportunity closing date must be today or later." }, { status: 400 });
    }

    const userId = (session.user as { userId?: string } | undefined)?.userId ?? session.user?.email ?? "system";
    const opportunity = await createOpportunity({
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.type ?? parsed.data.category!,
      type: parsed.data.type ?? parsed.data.category!,
      targetAudience: parsed.data.targetAudience,
      province: parsed.data.province,
      closingDate,
      fundingAmountRange: parsed.data.fundingAmountRange,
      eligibilityCriteria: parsed.data.eligibilityCriteria as import("@prisma/client").Prisma.InputJsonValue | undefined,
      applyUrl: parsed.data.applyUrl,
      applicationEmail: parsed.data.applicationEmail,
      location: parsed.data.location,
      requiredSkills: parsed.data.requiredSkills,
      postedById: userId,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    });

    await addAuditEntry({
      action: "opportunity_created",
      entityType: "opportunity",
      entityId: opportunity.id,
      performedBy: userId,
      details: `Created ${parsed.data.type ?? parsed.data.category} opportunity: ${parsed.data.title}`,
    });

    return NextResponse.json({ opportunity }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create opportunity." },
      { status: 500 },
    );
  }
}
