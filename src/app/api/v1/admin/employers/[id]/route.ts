import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { updateEmployerVerification } from "@/lib/database";

const verificationSchema = z.object({
  status: z.enum(["verified", "rejected", "pending"]),
  verificationDocumentUrl: z.string().url().nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { userId?: string; role?: string } | undefined;
  if (!user?.userId || user.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const parsed = verificationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "A valid verification status is required." }, { status: 400 });

  try {
    const { id } = await params;
    const employer = await updateEmployerVerification({
      employerId: id,
      status: parsed.data.status,
      documentUrl: parsed.data.verificationDocumentUrl,
      adminId: user.userId,
    });
    return NextResponse.json({ employer: { id: employer.id, verificationStatus: employer.verificationStatus } });
  } catch {
    return NextResponse.json({ error: "Employer not found." }, { status: 404 });
  }
}
