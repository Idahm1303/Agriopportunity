import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { AdminUserUpdateError, updateAdminUserRole, updateAdminUserStatus } from "@/lib/database";

const userActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("suspend"),
    reason: z.string().trim().min(5).max(500),
  }),
  z.object({
    action: z.literal("reactivate"),
  }),
  z.object({
    action: z.literal("delete"),
    reason: z.string().trim().min(5).max(500),
  }),
  z.object({
    action: z.literal("assignRole"),
    role: z.enum(["LEARNER", "FARMER", "SMME", "COOPERATIVE", "EMPLOYER", "PROVIDER", "ADMIN"]),
  }),
  z.object({
    action: z.literal("revokeRole"),
    role: z.enum(["LEARNER", "FARMER", "SMME", "COOPERATIVE", "EMPLOYER", "PROVIDER", "ADMIN"]),
  }),
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { userId?: string; role?: string } | undefined;
  if (!admin?.userId || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Provide a valid account action." }, { status: 400 });
  }
  const parsed = userActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid account action." }, { status: 400 });
  }

  try {
    const { id } = await params;
    if (parsed.data.action === "assignRole" || parsed.data.action === "revokeRole") {
      const result = await updateAdminUserRole({
        userId: id,
        adminId: admin.userId,
        role: parsed.data.role,
        action: parsed.data.action === "assignRole" ? "assign" : "revoke",
      });
      return NextResponse.json({ user: result });
    }

    const status = parsed.data.action === "reactivate"
      ? "active"
      : parsed.data.action === "delete"
        ? "deleted"
        : "suspended";
    const user = await updateAdminUserStatus({
      userId: id,
      adminId: admin.userId,
      status,
      reason: "reason" in parsed.data ? parsed.data.reason : undefined,
    });
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof AdminUserUpdateError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Unable to update administrator-managed account:", error);
    return NextResponse.json({ error: "Unable to update the user account." }, { status: 500 });
  }
}
