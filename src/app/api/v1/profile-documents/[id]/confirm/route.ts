import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { confirmProfileDocument, getUserRoles } from "@/lib/database";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { userId?: string; role?: string } | undefined)?.userId;
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!["FARMER", "SMME", "COOPERATIVE"].includes(role ?? "") ||
    !(await getUserRoles(userId)).some((grantedRole) => ["FARMER", "SMME", "COOPERATIVE"].includes(grantedRole))) {
    return NextResponse.json({ error: "A farmer, SMME, or co-operative role is required." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Confirm that you have reviewed the extracted fields." }, { status: 400 });
  }
  const parsed = z.object({ confirmed: z.literal(true) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Review the extracted fields before confirming." }, { status: 400 });

  const document = await confirmProfileDocument(userId, (await params).id);
  return document
    ? NextResponse.json({ message: "Document review confirmed.", extractionStatus: document.extractionStatus })
    : NextResponse.json({ error: "Document not found." }, { status: 404 });
}
