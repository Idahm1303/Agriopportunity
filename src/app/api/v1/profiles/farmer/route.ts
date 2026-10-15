import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { provinces } from "@/lib/agri-options";
import { getUserProfiles, getUserRoles, updateBusinessContactDetails, upsertFarmerProfile } from "@/lib/database";

const optionalNumber = z.preprocess((value) => value === "" || value === null ? undefined : value, z.coerce.number().min(0).optional());
const farmerSchema = z.object({
  farmName: z.string().trim().min(2, "Enter your farm name.").max(160),
  province: z.enum(provinces),
  district: z.string().trim().min(2, "Enter your town or district.").max(160),
  farmSizeHectares: optionalNumber,
  farmingType: z.enum(["crop", "livestock", "mixed", "agro-processing"]),
  mainCommodities: z.array(z.string().trim().min(1).max(80)).min(1, "Add at least one main commodity.").max(20),
  yearsFarming: z.preprocess((value) => value === "" || value === null ? undefined : value, z.coerce.number().int().min(0).max(100).optional()),
  farmerStage: z.enum(["subsistence", "emerging", "commercial"], "Choose your farm stage."),
  landTenure: z.enum(["owned", "leased", "communal", "land-reform beneficiary"]).optional(),
  hasRegisteredBusiness: z.boolean().default(false),
  needs: z.array(z.enum(["funding", "training", "mentorship", "market access", "equipment"])).default([]),
  phoneNumber: z.string().trim().min(7, "Enter a contact number.").max(30),
  location: z.string().trim().min(2, "Enter your town or district.").max(160),
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
  const { phoneNumber, location, ...profileData } = parsed.data;
  const [profile] = await Promise.all([
    upsertFarmerProfile({ ...profileData, userId: auth.userId }),
    updateBusinessContactDetails({ userId: auth.userId, phoneNumber, location }),
  ]);
  return NextResponse.json({ profile });
}
