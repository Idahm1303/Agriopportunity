import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { provinces } from "@/lib/agri-options";
import { getUserProfiles, getUserRoles, upsertSmmeProfile } from "@/lib/database";

const optionalInteger = z.preprocess((value) => value === "" || value === null ? undefined : value, z.coerce.number().int().min(0).optional());
const smmeSchema = z.object({
  businessName: z.string().trim().max(200).optional(),
  entityType: z.enum(["sole proprietor", "pty ltd", "co-operative", "NPO"]).optional(),
  registrationNumber: z.string().trim().max(80).optional(),
  cipcRegistered: z.boolean().default(false),
  sectorFocus: z.string().trim().max(120).optional(),
  employeesCount: optionalInteger,
  yearsTrading: optionalInteger,
  annualTurnoverBand: z.enum(["pre-revenue", "under-R1m", "R1m-R5m", "R5m-R20m", "over-R20m"]).optional(),
  province: z.enum(provinces),
  fundingStage: z.enum(["idea", "starting", "growing", "expanding"]).optional(),
  needs: z.array(z.enum(["funding", "training", "mentorship", "market access", "equipment", "compliance", "technology"])).default([]),
});

async function getAuthorizedUser() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { userId?: string } | undefined)?.userId;
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!userId) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  if (role !== "SMME" && role !== "COOPERATIVE" && !(await getUserRoles(userId)).some((grantedRole) => grantedRole === "SMME" || grantedRole === "COOPERATIVE")) {
    return { error: NextResponse.json({ error: "An SMME or co-operative role is required." }, { status: 403 }) };
  }
  return { userId };
}

export async function GET() {
  const auth = await getAuthorizedUser();
  if ("error" in auth) return auth.error;
  const profiles = await getUserProfiles(auth.userId);
  return NextResponse.json({ profile: profiles.smme, diagnostic: profiles.diagnostic });
}

export async function PUT(request: Request) {
  const auth = await getAuthorizedUser();
  if ("error" in auth) return auth.error;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Provide valid business profile details." }, { status: 400 });
  }
  const parsed = smmeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid SMME profile." }, { status: 400 });
  const profile = await upsertSmmeProfile({ ...parsed.data, userId: auth.userId });
  return NextResponse.json({ profile });
}
