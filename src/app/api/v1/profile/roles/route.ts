import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { addUserRole, getUserRoles, setUserActiveRole } from "@/lib/database";
import { roles } from "@/lib/agri-options";

const roleSchema = z.object({ role: z.enum(roles as [typeof roles[number], ...typeof roles[number][]]) });
const activeRoleSchema = z.object({ role: z.enum(["LEARNER", "FARMER", "SMME", "COOPERATIVE", "EMPLOYER", "PROVIDER", "ADMIN"]) });

async function readBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function getUserId() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { userId?: string } | undefined)?.userId;
  return userId;
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await readBody(request);
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a supported role." }, { status: 400 });

  await addUserRole(userId, parsed.data.role);
  return NextResponse.json({ roles: await getUserRoles(userId) });
}

export async function PATCH(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await readBody(request);
  const parsed = activeRoleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a supported active role." }, { status: 400 });
  const updated = await setUserActiveRole(userId, parsed.data.role);
  if (!updated) return NextResponse.json({ error: "You do not have this role." }, { status: 403 });
  return NextResponse.json({ role: parsed.data.role, roles: await getUserRoles(userId) });
}
