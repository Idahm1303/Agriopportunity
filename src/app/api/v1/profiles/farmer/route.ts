import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { provinces } from "@/lib/agri-options";
import { getUserProfiles, getUserRoles, upsertFarmerProfile } from "@/lib/database";

const optionalNumber = z.preprocess((value) => value === "" || value === null ? undefined : value, z.coerce.number().min(0).optional());
const farmerSchema = z.object({
  farmName: z.string().trim().max(160).optional(),
  province: z.enum(provinces),
  district: z.string().trim().max(160).optional(),
  farmSizeHectares: optionalNumber,
  farmingType: z.enum(["crop", "livestock", "mixed", "agro-processing"]).optional(),
  mainCommodities: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  yearsFarming: z.preprocess((value) => value === "" || value === null ? undefined : value, z.coerce.number().int().min(0).max(100).optional()),
  farmerStage: z.enum(["subsistence", "emerging", "commercial"]).optional(),
  landTenure: z.enum(["owned", "leased", "communal", "land-reform beneficiary"]).optional(),
  hasRegisteredBusiness: z.boolean().default(false),
  needs: z.array(z.enum(["funding", "training", "mentorship", "market access", "equipment"])).default([]),
});

async function getAuthorizedUser() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { userId?: string; role?: string } | undefined)?.userId;
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!userId) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  if (role !== "FARMER" && !(await getUserRoles(userId)).includes("FARMER")) {
    return { error: NextResponse.json({ error: "A farmer role is required." }, { status: 403 }) };
  }
  return { userId };
}

export async function GET() {
  const auth = await getAuthorizedUser();
  if ("error" in auth) return auth.error;
  return NextResponse.json({ profile: (await getUserProfiles(auth.userId)).farmer });
}

export async function PUT(request: Request) {
  const auth = await getAuthorizedUser();
  if ("error" in auth) return auth.error;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Provide valid farm profile details." }, { status: 400 });
  }
  const parsed = farmerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid farm profile." }, { status: 400 });
  const profile = await upsertFarmerProfile({ ...parsed.data, userId: auth.userId });
  return NextResponse.json({ profile });
}
