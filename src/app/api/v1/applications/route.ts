import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { addAuditEntry } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { deliverApplicationEmails } from "@/lib/application-email";
import { createApplication, createDocument, getEmployerApplications, getUserApplications, getUserGrantApplications } from "@/lib/database";
import { prisma } from "@/lib/prisma";
import { extractQualification } from "@/lib/qualification-ocr";
import { uploadDocument } from "@/lib/object-storage";
import { additionalGrantDocuments, standardGrantDocuments } from "@/lib/grant-application";
import type { Role } from "@/lib/mock-data";

const applicationSchema = z.object({
  opportunityId: z.string().min(1, "Opportunity ID is required."),
  coverNote: z.string().trim().min(10, "Write a cover note of at least 10 characters.").max(2000, "Cover notes must be 2,000 characters or fewer."),
});
const allowedDocumentTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const allowedCVTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const maximumDocumentSize = 10 * 1024 * 1024;
const grantApplicationSchema = z.object({
  companyName: z.string().trim().min(2).max(200),
  registrationNumber: z.string().trim().min(2).max(80),
  sdlNumber: z.string().trim().min(2).max(80),
  companyAddress: z.string().trim().min(5).max(300),
  province: z.string().trim().min(2).max(80),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.email(),
  contactPhone: z.string().trim().min(7).max(30),
  requestedAmount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Enter the requested amount as a number."),
  motivation: z.string().trim().min(50).max(5000),
}).refine((data) => Number(data.requestedAmount) > 0, {
  message: "The requested amount must be greater than zero.",
  path: ["requestedAmount"],
});

async function submitEmployerGrantApplication(formData: FormData, userId: string) {
  const opportunityId = formData.get("opportunityId");
  if (typeof opportunityId !== "string" || !opportunityId) {
    return NextResponse.json({ error: "Choose a funding opportunity." }, { status: 400 });
  }

  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      closingDate: true,
      expiresAt: true,
      postedById: true,
      applicationEmail: true,
      eligibilityCriteria: true,
      postedBy: { select: { email: true } },
    },
  });
  if (!opportunity || !["funding", "funding_call"].includes(opportunity.type)) {
    return NextResponse.json({ error: "This is not a funding grant opportunity." }, { status: 404 });
  }
  if (opportunity.postedById === userId) {
    return NextResponse.json({ error: "You cannot apply to a grant published by your own organisation." }, { status: 403 });
  }
  if (opportunity.status !== "open" ||
    (opportunity.expiresAt && opportunity.expiresAt <= new Date()) ||
    (opportunity.closingDate && opportunity.closingDate <= new Date())) {
    return NextResponse.json({ error: "This grant is no longer accepting applications." }, { status: 409 });
  }

  const existingApplication = await prisma.application.findFirst({
    where: { userId, opportunityId },
    select: { id: true },
  });
  if (existingApplication) {
    return NextResponse.json({ error: "Your organisation has already applied for this grant." }, { status: 409 });
  }

  const parsedDetails = grantApplicationSchema.safeParse({
    companyName: formData.get("companyName"),
    registrationNumber: formData.get("registrationNumber"),
    sdlNumber: formData.get("sdlNumber"),
    companyAddress: formData.get("companyAddress"),
    province: formData.get("province"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    requestedAmount: formData.get("requestedAmount"),
    motivation: formData.get("motivation"),
  });
  if (!parsedDetails.success) {
    return NextResponse.json({ error: parsedDetails.error.issues[0]?.message ?? "Complete all required company and grant details." }, { status: 400 });
  }

  const additionalDocuments = additionalGrantDocuments(opportunity.eligibilityCriteria);
  const requiredDocuments = [
    ...standardGrantDocuments.map((document) => ({ ...document, documentType: `grant_${document.key}` })),
    ...additionalDocuments.map((label, index) => ({
      key: `extra_${index}`,
      label,
      required: true,
      documentType: `grant_extra_${index + 1}`,
    })),
  ];
  const suppliedDocuments: Array<{ file: File; documentType: string }> = [];
  for (const document of requiredDocuments) {
    const file = formData.get(`document_${document.key}`);
    if (!(file instanceof File) || file.size === 0) {
      if (!document.required) continue;
      return NextResponse.json({ error: `Upload the required document: ${document.label}.` }, { status: 400 });
    }
    if (!allowedDocumentTypes.has(file.type)) {
      return NextResponse.json({ error: `${document.label} must be a PDF, JPG, or PNG file.` }, { status: 400 });
    }
    if (file.size > maximumDocumentSize) {
      return NextResponse.json({ error: `${document.label} must be smaller than 10 MB.` }, { status: 400 });
    }
    suppliedDocuments.push({ file, documentType: document.documentType });
  }

  const documents: Array<{ documentType: string; fileName: string; storageUrl: string }> = [];
  for (const document of suppliedDocuments) {
    const storageUrl = await uploadDocument({
      file: document.file,
      userId,
      documentType: document.documentType,
      referenceId: opportunityId,
    });
    documents.push({
      documentType: document.documentType,
      fileName: document.file.name,
      storageUrl,
    });
  }

  const application = await createApplication({
    userId,
    opportunityId,
    activeRole: "EMPLOYER",
    coverNote: parsedDetails.data.motivation,
    applicationData: {
      applicationType: "employer_grant",
      ...parsedDetails.data,
      contactEmail: parsedDetails.data.contactEmail.toLowerCase(),
      additionalRequiredDocuments: additionalDocuments,
    },
    documents,
  });
  if (!application) {
    return NextResponse.json({ error: "The grant application could not be saved. Check whether it is still open or already submitted." }, { status: 409 });
  }

  await addAuditEntry({
    action: "grant_application_submitted",
    entityType: "application",
    entityId: application.id,
    performedBy: userId,
    details: `Applied to grant opportunity ${opportunityId}.`,
  });

  let emailDelivery: { complete: boolean; employerSent: boolean; learnerSent: boolean; error: string | null } = {
    complete: false,
    employerSent: false,
    learnerSent: false,
    error: "Email delivery could not be confirmed. You can retry it from your employer dashboard.",
  };
  try {
    emailDelivery = await deliverApplicationEmails(application.id, userId);
  } catch (emailError) {
    emailDelivery.error = emailError instanceof Error ? emailError.message : emailDelivery.error;
  }

  return NextResponse.json({
    application,
    emailDelivery,
    message: emailDelivery.complete
      ? "Grant application submitted. Confirmation emails have been sent."
      : "Grant application saved, but email delivery could not be confirmed.",
  }, { status: 201 });
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = (session.user as { role?: string } | undefined)?.role ?? "LEARNER";
  const userId = (session.user as { userId?: string } | undefined)?.userId;

  if (role === "EMPLOYER" || role === "PROVIDER" || role === "ADMIN") {
    if (!userId) return NextResponse.json({ error: "User session missing." }, { status: 400 });
    const searchParams = new URL(request.url).searchParams;
    const applications = await getEmployerApplications(userId, role === "ADMIN", {
      category: searchParams.get("category") ?? undefined,
      field: searchParams.get("field") ?? undefined,
      verification: searchParams.get("verification") ?? undefined,
    });
    return NextResponse.json({
      applications,
      ...(role === "EMPLOYER" ? { submittedGrantApplications: await getUserGrantApplications(userId) } : {}),
    });
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
  if (!["LEARNER", "FARMER", "SMME", "COOPERATIVE", "EMPLOYER"].includes(role)) {
    return NextResponse.json({ error: "Choose an applicant account to apply." }, { status: 403 });
  }

  const userId = (session.user as { userId?: string } | undefined)?.userId;
  if (!userId) {
    return NextResponse.json({ error: "User session missing." }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    if (role === "EMPLOYER") return await submitEmployerGrantApplication(formData, userId);
    const parsed = applicationSchema.safeParse({ opportunityId: formData.get("opportunityId"), coverNote: formData.get("coverNote") });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid application payload." },
        { status: 400 },
      );
    }

    const existingApplication = await prisma.application.findFirst({
      where: { userId, opportunityId: parsed.data.opportunityId },
      include: { opportunity: { select: { title: true } } },
    });
    if (existingApplication) {
      return NextResponse.json(
        { error: `You have already applied for ${existingApplication.opportunity.title}.`, application: existingApplication },
        { status: 409 },
      );
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id: parsed.data.opportunityId },
      select: { status: true, expiresAt: true, closingDate: true },
    });
    if (!opportunity) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    if (opportunity.status !== "open" ||
      (opportunity.expiresAt && opportunity.expiresAt <= new Date()) ||
      (opportunity.closingDate && opportunity.closingDate <= new Date())) {
      return NextResponse.json({ error: "This opportunity is no longer accepting applications." }, { status: 409 });
    }

    const cv = formData.get("cv");
    if (!(cv instanceof File) || cv.size === 0) {
      return NextResponse.json({ error: "Upload your CV before applying." }, { status: 400 });
    }
    if (!allowedCVTypes.has(cv.type)) {
      return NextResponse.json({ error: "Upload your CV as a PDF, DOC, or DOCX file." }, { status: 400 });
    }
    if (cv.size > maximumDocumentSize) {
      return NextResponse.json({ error: "CVs must be smaller than 10 MB." }, { status: 400 });
    }

    const qualificationDocument = formData.get("qualificationDocument");
    if (qualificationDocument instanceof File && qualificationDocument.size > 0) {
      if (!allowedDocumentTypes.has(qualificationDocument.type)) {
        return NextResponse.json({ error: "Upload a qualification document as a PDF, JPG, or PNG." }, { status: 400 });
      }
      if (qualificationDocument.size > maximumDocumentSize) {
        return NextResponse.json({ error: "Qualification documents must be smaller than 10 MB." }, { status: 400 });
      }
    }

    const cvStorageKey = await uploadDocument({
      file: cv,
      userId,
      documentType: "cv",
      referenceId: parsed.data.opportunityId,
    });
    const qualificationStorageKey = qualificationDocument instanceof File && qualificationDocument.size > 0
      ? await uploadDocument({ file: qualificationDocument, userId, documentType: "qualification", referenceId: parsed.data.opportunityId })
      : null;
    const extraction = qualificationStorageKey && qualificationDocument instanceof File
      ? await extractQualification(qualificationDocument)
      : { extractedText: "", qualifications: [], skills: [], confidence: 0 };

    const application = await createApplication({
      userId,
      opportunityId: parsed.data.opportunityId,
      activeRole: role as Role,
      qualificationDocumentName: qualificationDocument instanceof File && qualificationDocument.size > 0 ? qualificationDocument.name : null,
      coverNote: parsed.data.coverNote,
      cvUrl: cvStorageKey,
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
      documentType: "cv",
      fileName: cv.name,
      storageUrl: cvStorageKey,
    });
    if (qualificationStorageKey && qualificationDocument instanceof File) {
      await createDocument({
        userId,
        applicationId: application.id,
        opportunityId: parsed.data.opportunityId,
        documentType: "qualification",
        fileName: qualificationDocument.name,
        storageUrl: qualificationStorageKey,
        extractedText: extraction.extractedText,
        extractedQualifications: extraction.qualifications,
        extractedSkills: extraction.skills,
        confidence: extraction.confidence,
      });
    }

    await addAuditEntry({
      action: "application_submitted",
      entityType: "application",
      entityId: application.id,
      performedBy: userId,
      details: `Applied to opportunity ${parsed.data.opportunityId}`,
    });

    let emailDelivery: { complete: boolean; employerSent: boolean; learnerSent: boolean; error: string | null } = {
      complete: false,
      employerSent: false,
      learnerSent: false,
      error: "Email delivery could not be confirmed. Retry it from My Applications.",
    };
    try {
      emailDelivery = await deliverApplicationEmails(application.id, userId);
    } catch (emailError) {
      emailDelivery.error = emailError instanceof Error ? emailError.message : emailDelivery.error;
    }
    await addAuditEntry({
      action: "application_email_notification",
      entityType: "application",
      entityId: application.id,
      performedBy: userId,
      details: emailDelivery.complete ? "Employer and learner emails sent." : emailDelivery.error ?? "Email delivery pending.",
    });
    return NextResponse.json({
      application,
      emailDelivery,
      message: emailDelivery.complete
        ? "Application submitted. A confirmation email has been sent."
        : "Application saved, but an email could not be sent. You can retry from My Applications.",
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "You have already applied for this opportunity." }, { status: 409 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit application." },
      { status: 500 },
    );
  }
}
