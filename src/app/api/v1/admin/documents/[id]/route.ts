import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { addAuditEntry } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { getAdminDocument } from "@/lib/database";
import { downloadDocument } from "@/lib/object-storage";

function encodeFileName(fileName: string) {
  return encodeURIComponent(fileName).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { userId?: string; role?: string } | undefined;
  if (!user?.userId || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  const { id } = await params;
  const document = await getAdminDocument(id);
  if (!document?.storageUrl) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  let bytes: Uint8Array;
  try {
    bytes = await downloadDocument(document.storageUrl);
  } catch (error) {
    console.error("Unable to download an admin document:", error);
    return NextResponse.json({ error: "Unable to retrieve this document." }, { status: 500 });
  }

  await addAuditEntry({
    action: "admin_document_downloaded",
    entityType: "document",
    entityId: document.id,
    performedBy: user.userId,
    details: `Downloaded ${document.fileName}`,
  });

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
}
