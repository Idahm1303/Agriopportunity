import { downloadDocument } from "@/lib/object-storage";
import {
  sendApplicationConfirmation,
  sendApplicationNotification,
  isValidEmailAddress,
  sendGrantApplicationConfirmation,
  sendGrantApplicationToProvider,
} from "@/lib/email";
import { prisma } from "@/lib/prisma";

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function deliverApplicationEmails(applicationId: string, learnerId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      user: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
      documents: { select: { fileName: true } },
      opportunity: {
        include: { postedBy: { select: { fullName: true, email: true, organizationName: true } } },
      },
    },
  });
  if (!application || application.userId !== learnerId) throw new Error("Application not found.");
  const grantData = toRecord(application.applicationData);
  if (grantData?.applicationType === "employer_grant") {
    const errors: string[] = [];
    const sentAt: { employerEmailSentAt?: Date; learnerEmailSentAt?: Date } = {};
    const stringValue = (key: string) => typeof grantData[key] === "string" ? grantData[key] as string : "";

    if (!application.employerEmailSentAt) {
      try {
        const result = await sendGrantApplicationToProvider({
          recipient: application.opportunity.applicationEmail ?? application.opportunity.postedBy.email,
          applicantName: application.user.fullName,
          applicantEmail: application.user.email,
          opportunityTitle: application.opportunity.title,
          companyName: stringValue("companyName"),
          registrationNumber: stringValue("registrationNumber"),
          sdlNumber: stringValue("sdlNumber"),
          requestedAmount: stringValue("requestedAmount"),
          documentNames: application.documents.map((document) => document.fileName),
        });
        if (result.sent) sentAt.employerEmailSentAt = new Date();
        else errors.push(`Grant provider email: ${result.reason}`);
      } catch (error) {
        errors.push(`Grant provider email: ${error instanceof Error ? error.message : "Delivery failed."}`);
      }
    }

    if (!application.learnerEmailSentAt) {
      try {
        const result = await sendGrantApplicationConfirmation({
          recipient: application.user.email,
          applicantName: application.user.fullName,
          opportunityTitle: application.opportunity.title,
          appliedAt: application.createdAt,
        });
        if (result.sent) sentAt.learnerEmailSentAt = new Date();
        else errors.push(`Confirmation email: ${result.reason}`);
      } catch (error) {
        errors.push(`Confirmation email: ${error instanceof Error ? error.message : "Delivery failed."}`);
      }
    }

    const employerSent = Boolean(application.employerEmailSentAt || sentAt.employerEmailSentAt);
    const learnerSent = Boolean(application.learnerEmailSentAt || sentAt.learnerEmailSentAt);
    const emailError = errors.length ? errors.join(" ") : null;
    await prisma.application.update({ where: { id: application.id }, data: { ...sentAt, emailError } });
    return { employerSent, learnerSent, employerSkipped: false, complete: employerSent && learnerSent, error: emailError };
  }

  const sentAt: { employerEmailSentAt?: Date; learnerEmailSentAt?: Date } = {};
  const errors: string[] = [];
  let employerSkipped = false;
  let employerAttempted = false;
  const employerName = application.opportunity.postedBy.organizationName ?? application.opportunity.postedBy.fullName;
  const employerRecipient = [
    application.opportunity.applicationEmail,
    application.opportunity.postedBy.email,
  ].find((email): email is string => isValidEmailAddress(email))?.trim() ?? null;

  if (!application.employerEmailSentAt) {
    employerAttempted = true;
    if (!employerRecipient) {
      employerSkipped = true;
      const warning = "Employer notification skipped: employer email is missing or invalid.";
      console.warn(warning);
      errors.push(warning);
    } else {
      try {
        if (!application.cvUrl || !application.coverNote) throw new Error("Application CV or cover note is missing.");
        const cv = await downloadDocument(application.cvUrl);
        const result = await sendApplicationNotification({
          recipient: employerRecipient,
          applicantName: application.user.fullName,
          applicantEmail: application.user.email,
          applicantPhone: application.user.phoneNumber,
          opportunityTitle: application.opportunity.title,
          organizationName: employerName,
          coverNote: application.coverNote,
          cvFileName: application.cvUrl.split("/").pop() ?? "learner-cv",
          cvContent: Buffer.from(cv).toString("base64"),
        });
        if (result.sent) sentAt.employerEmailSentAt = new Date();
        else errors.push(`Employer notification email: ${result.reason}`);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Delivery failed.";
        console.error("Employer notification email failed:", { to: employerRecipient, error: reason });
        errors.push(`Employer notification email: ${reason}`);
      }
    }
  }

  if (!application.learnerEmailSentAt) {
    if (employerAttempted) await wait(600);
    try {
      const result = await sendApplicationConfirmation({
        recipient: application.user.email,
        replyTo: employerRecipient ?? undefined,
        applicantName: application.user.fullName,
        opportunityTitle: application.opportunity.title,
        organizationName: employerName,
        appliedAt: application.createdAt,
      });
      if (result.sent) sentAt.learnerEmailSentAt = new Date();
      else errors.push(`Applicant confirmation email: ${result.reason}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Delivery failed.";
      console.error("Applicant confirmation email failed:", { to: application.user.email, error: reason });
      errors.push(`Applicant confirmation email: ${reason}`);
    }
  }

  const employerSent = Boolean(application.employerEmailSentAt || sentAt.employerEmailSentAt);
  const learnerSent = Boolean(application.learnerEmailSentAt || sentAt.learnerEmailSentAt);
  const emailError = errors.length ? errors.join(" ") : null;
  await prisma.application.update({
    where: { id: application.id },
    data: { ...sentAt, emailError },
  });

  return { employerSent, learnerSent, employerSkipped, complete: employerSent && learnerSent, error: emailError };
}