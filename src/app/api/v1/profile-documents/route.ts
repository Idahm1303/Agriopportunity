import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { createDocument, getProfileDocuments, getUserRoles } from "@/lib/database";
import { extractProfileDocument } from "@/lib/qualification-ocr";
import { uploadDocument } from "@/lib/object-storage";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const documentTypes = new Set(["id_document", "business_registration", "funding_proof", "certificate"]);
const maximumSize = 10 * 1024 * 1024;

function maskFields(value: unknown, documentType: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const fields = { ...(value as Record<string, string>) };
  if (documentType === "id_document") {
    for (const key of Object.keys(fields)) {
      if (/id.?number|identity number/i.test(key)) {
        const digits = fields[key].replace(/\D/g, "");
        fields[key] = digits.length > 4 ? `••••••••${digits.slice(-4)}` : "••••";
      }
    }
  }
  return fields;
}

async function getApplicant() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { userId?: string; role?: string } | undefined;
  if (!user?.userId) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  const roles = await getUserRoles(user.userId);
  if (!["FARMER", "SMME", "COOPERATIVE"].includes(user.role ?? "") ||
    !roles.some((role) => role === "FARMER" || role === "SMME" || role === "COOPERATIVE")) {
    return { error: NextResponse.json({ error: "A farmer, SMME, or co-operative role is required." }, { status: 403 }) };
  }
  return { userId: user.userId };
}

export async function GET() {
  const auth = await getApplicant();
  if ("error" in auth) return auth.error;
  const documents = await getProfileDocuments(auth.userId);
  return NextResponse.json({
    documents: documents.map((document) => ({
      id: document.id,
      documentType: document.documentType,
      fileName: document.fileName,
      fields: maskFields(document.extractedData, document.documentType),
      extractionStatus: document.extractionStatus,
      confidence: document.confidence,
      createdAt: document.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await getApplicant();
  if ("error" in auth) return auth.error;
  try {
    const form = await request.formData();
    const documentType = String(form.get("documentType") ?? "");
    const file = form.get("document");
    if (!documentTypes.has(documentType)) return NextResponse.json({ error: "Choose an ID, business registration, funding, or certificate document." }, { status: 400 });
    if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Choose a document to upload." }, { status: 400 });
    if (!allowedTypes.has(file.type)) return NextResponse.json({ error: "Upload a PDF, JPG, or PNG document." }, { status: 400 });
    if (file.size > maximumSize) return NextResponse.json({ error: "The document must be smaller than 10 MB." }, { status: 400 });

    const typedDocument = documentType as "id_document" | "business_registration" | "funding_proof" | "certificate";
    const extraction = await extractProfileDocument(file, typedDocument);
    const storageKey = await uploadDocument({ file, userId: auth.userId, documentType });
    const document = await createDocument({
      userId: auth.userId,
      documentType,
      fileName: file.name,
      storageUrl: storageKey,
      extractedText: extraction.extractedText,
      extractedData: extraction.fields,
      extractionStatus: "pending_confirmation",
      confidence: extraction.confidence,
    });
    return NextResponse.json({
      document: {
        id: document.id,
        documentType: document.documentType,
        fileName: document.fileName,
        fields: maskFields(extraction.fields, documentType),
        extractionStatus: document.extractionStatus,
        confidence: document.confidence,
      },
      requiresReview: true,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to upload and read the document." }, { status: 500 });
  }
}
