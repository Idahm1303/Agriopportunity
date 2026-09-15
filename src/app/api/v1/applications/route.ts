import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { addAuditEntry } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { createApplication, createDocument, getEmployerApplications, getUserApplications } from "@/lib/database";
import { extractQualification } from "@/lib/qualification-ocr";

const applicationSchema = z.object({ opportunityId: z.string().min(1, "Opportunity ID is required.") });
const allowedDocumentTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const maximumDocumentSize = 10 * 1024 * 1024;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = (session.user as { role?: string } | undefined)?.role ?? "LEARNER";
  const userId = (session.user as { userId?: string } | undefined)?.userId;

  if (role === "EMPLOYER" || role === "ADMIN") {
    if (!userId) return NextResponse.json({ error: "User session missing." }, { status: 400 });
    const category = new URL(request.url).searchParams.get("category") ?? undefined;
    return NextResponse.json({ applications: await getEmployerApplications(userId, role === "ADMIN", category) });
  }

  if (!userId) {
    return NextResponse.json({ error: "User session missing." }, { status: 400 });
  }

  return NextResponse.json({ applications: await getUserApplications(userId) });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = (session.user as { role?: string } | undefined)?.role ?? "LEARNER";
  if (role !== "LEARNER") {
    return NextResponse.json({ error: "Only learners can apply." }, { status: 403 });
  }

  const userId = (session.user as { userId?: string } | undefined)?.userId;
  if (!userId) {
    return NextResponse.json({ error: "User session missing." }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const parsed = applicationSchema.safeParse({ opportunityId: formData.get("opportunityId") });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid application payload." },
        { status: 400 },
      );
    }

    const document = formData.get("qualificationDocument");
    if (!(document instanceof File)) {
      return NextResponse.json({ error: "A qualification document is required." }, { status: 400 });
    }
    if (!allowedDocumentTypes.has(document.type)) {
      return NextResponse.json({ error: "Upload a PDF, JPG, or PNG qualification document." }, { status: 400 });
    }
    if (document.size > maximumDocumentSize) {
      return NextResponse.json({ error: "Qualification documents must be smaller than 10 MB." }, { status: 400 });
    }

    const extraction = await extractQualification(document);

    const application = await createApplication({
      userId,
      opportunityId: parsed.data.opportunityId,
      qualificationDocumentName: document.name,
      extractedText: extraction.extractedText,
      extractedQualifications: extraction.qualifications,
      extractedSkills: extraction.skills,
    });

    if (!application) {
      return NextResponse.json({ error: "Opportunity or user not found." }, { status: 404 });
    }

    await createDocument({
      userId,
      applicationId: application.id,
      opportunityId: parsed.data.opportunityId,
      documentType: "qualification",
      fileName: document.name,
      extractedText: extraction.extractedText,
      extractedQualifications: extraction.qualifications,
      extractedSkills: extraction.skills,
      confidence: extraction.confidence,
    });

    await addAuditEntry({
      action: "application_submitted",
      entityType: "application",
      entityId: application.id,
      performedBy: userId,
      details: `Applied to opportunity ${parsed.data.opportunityId}`,
    });

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit application." },
      { status: 500 },
    );
  }
}
