import { downloadDocument } from "@/lib/object-storage";
import { sendApplicationConfirmation, sendApplicationToEmployer } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function deliverApplicationEmails(applicationId: string, learnerId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      user: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
      opportunity: {
        include: { postedBy: { select: { fullName: true, email: true, organizationName: true } } },
      },
    },
  });
  if (!application || application.userId !== learnerId) throw new Error("Application not found.");

  const sentAt: { employerEmailSentAt?: Date; learnerEmailSentAt?: Date } = {};
  const errors: string[] = [];

  if (!application.employerEmailSentAt) {
    try {
      if (!application.cvUrl || !application.coverNote) throw new Error("Application CV or cover note is missing.");
      const cv = await downloadDocument(application.cvUrl);
      const result = await sendApplicationToEmployer({
        recipient: application.opportunity.applicationEmail ?? application.opportunity.postedBy.email,
        applicantName: application.user.fullName,
        applicantEmail: application.user.email,
        applicantPhone: application.user.phoneNumber,
        opportunityTitle: application.opportunity.title,
        organizationName: application.opportunity.postedBy.organizationName ?? application.opportunity.postedBy.fullName,
        coverNote: application.coverNote,
        cvFileName: application.cvUrl.split("/").pop() ?? "learner-cv",
        cvContent: Buffer.from(cv).toString("base64"),
      });
      if (result.sent) sentAt.employerEmailSentAt = new Date();
      else errors.push(`Employer email: ${result.reason}`);
    } catch (error) {
      errors.push(`Employer email: ${error instanceof Error ? error.message : "Delivery failed."}`);
    }
  }

  if (!application.learnerEmailSentAt) {
    try {
      const result = await sendApplicationConfirmation({
        recipient: application.user.email,
        applicantName: application.user.fullName,
        opportunityTitle: application.opportunity.title,
        organizationName: application.opportunity.postedBy.organizationName ?? application.opportunity.postedBy.fullName,
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
  await prisma.application.update({
    where: { id: application.id },
    data: { ...sentAt, emailError },
  });

  return { employerSent, learnerSent, complete: employerSent && learnerSent, error: emailError };
}