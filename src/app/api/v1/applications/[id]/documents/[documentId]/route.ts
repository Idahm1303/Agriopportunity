import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { getApplicationDocumentForUser } from "@/lib/database";
import { downloadDocument } from "@/lib/object-storage";

function encodeFileName(fileName: string) {
  return encodeURIComponent(fileName).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { userId?: string; role?: string } | undefined;
  if (!user?.userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const canManageApplications = ["EMPLOYER", "PROVIDER", "ADMIN"].includes(user.role ?? "");
  const { id, documentId } = await params;
  const document = await getApplicationDocumentForUser({
    applicationId: id,
    documentId,
    userId: user.userId,
    canManageApplications,
    isAdmin: user.role === "ADMIN",
  });
  if (!document?.storageUrl) return NextResponse.json({ error: "Application document not found." }, { status: 404 });

  try {
    const bytes = await downloadDocument(document.storageUrl);
    const body = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(body).set(bytes);
    return new Response(body, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeFileName(document.fileName)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Unable to download an application document:", error);
    return NextResponse.json({ error: "Unable to retrieve this application document." }, { status: 500 });
  }
}
