import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { getProfileRecommendations } from "@/lib/database";
import type { Role } from "@/lib/mock-data";

const supportedRoles: Role[] = ["LEARNER", "FARMER", "SMME", "COOPERATIVE", "EMPLOYER", "PROVIDER", "ADMIN"];

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { userId?: string; role?: string } | undefined;
  if (!user?.userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!user.role || !supportedRoles.includes(user.role as Role)) return NextResponse.json({ error: "Unsupported active role." }, { status: 403 });
  return NextResponse.json({ matches: await getProfileRecommendations(user.userId, user.role as Role) });
}
