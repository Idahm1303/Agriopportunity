import "server-only";

import { Resend } from "resend";
import { z } from "zod";

import { getFarmerEmailCopy } from "@/lib/notification-copy";

type ApplicationEmailInput = {
  recipient: string;
  replyTo?: string;
  applicantName: string;
  opportunityTitle: string;
  status: string;
  verified?: boolean;
  placed: boolean;
  interviewDate?: string | null;
  interviewTime?: string | null;
  interviewLocation?: string | null;
};

type ResendEmailInput = {
  recipient: string;
  replyTo?: string;
  from?: string;
  failureLabel?: string;
  subject: string;
  text: string;
  attachment?: { filename: string; content: string };
};

export function getApplicationNotificationEmail() {
  return process.env.APPLICATION_NOTIFICATION_EMAIL?.trim() || null;
}

const sender = "AgriOpportunity <onboarding@resend.dev>";
const defaultReplyTo = "agriopportunity@gmail.com";
const emailSchema = z.email();

export function isValidEmailAddress(value: string | null | undefined) {
  return Boolean(value && emailSchema.safeParse(value.trim()).success);
}

function logEmailFailure(input: ResendEmailInput, error: string) {
  if (input.failureLabel) {
    console.error(`${input.failureLabel} failed:`, { to: input.recipient, error });
  } else {
    console.error("Resend email delivery failed:", error);
  }
}

function isRateLimitError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  const errorWithStatus = error as { statusCode?: unknown; status?: unknown };
  return errorWithStatus.statusCode === 429 || errorWithStatus.status === 429;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatEmailHtml(text: string) {
  return `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">${text
    .split("\n\n")
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("")}</div>`;
}

async function sendResendEmail(input: ResendEmailInput) {
  const intendedRecipient = input.recipient.trim();
  if (!emailSchema.safeParse(intendedRecipient).success) {
    const reason = "A valid recipient email address is required.";
    logEmailFailure(input, reason);
    return { sent: false, reason };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    const reason = "RESEND_API_KEY is not configured.";
    logEmailFailure(input, reason);
    return { sent: false, reason };
  }

  const testMode = process.env.EMAIL_TEST_MODE === "true";
  let recipient = intendedRecipient;
  if (testMode) {
    const testRecipient = process.env.TEST_EMAIL_RECIPIENT?.trim();
    if (!testRecipient) {
      const reason = "TEST_EMAIL_RECIPIENT is required when EMAIL_TEST_MODE is true.";
      logEmailFailure(input, reason);
      return { sent: false, reason };
    }
    if (!emailSchema.safeParse(testRecipient).success) {
      const reason = "TEST_EMAIL_RECIPIENT must be a valid email address.";
      logEmailFailure(input, reason);
      return { sent: false, reason };
    }
    recipient = testRecipient;
  }

  const subject = testMode
    ? `[TEST - intended for ${intendedRecipient}] ${input.subject}`
    : input.subject;
  const text = testMode ? `${input.text}\n\nIntended recipient: ${intendedRecipient}` : input.text;

  const resend = new Resend(apiKey);
  const replyTo = input.replyTo?.trim();
  let retries = 0;
  while (true) {
    try {
      const { data, error } = await resend.emails.send({
        from: input.from ?? sender,
        to: recipient,
        replyTo: replyTo && emailSchema.safeParse(replyTo).success ? replyTo : defaultReplyTo,
        subject,
        text,
        html: formatEmailHtml(text),
        ...(input.attachment
          ? { attachments: [{ filename: input.attachment.filename, content: input.attachment.content }] }
          : {}),
      });

      if (error && isRateLimitError(error) && retries === 0) {
        retries += 1;
        await wait(1000);
        continue;
      }
      if (error) {
        logEmailFailure(input, error.message);
        return { sent: false, reason: error.message };
      }

      if (data) return { sent: true, reason: "Email sent." };
      const reason = "Resend did not confirm email delivery.";
      logEmailFailure(input, reason);
      return { sent: false, reason };
    } catch (error) {
      if (isRateLimitError(error) && retries === 0) {
        retries += 1;
        await wait(1000);
        continue;
      }
      const reason = error instanceof Error ? error.message : "Email delivery failed.";
      logEmailFailure(input, reason);
      return { sent: false, reason };
    }
  }
}

export async function sendFeedbackEmail(input: {
  to: string;
  applicantName: string;
  subject: string;
  message: string;
  fromName?: string;
  replyTo?: string;
  failureLabel?: string;
}) {
  const fromName = input.fromName
    ?.replace(/["'<>\r\n\u2028\u2029]/g, "")
    .trim() || "AgriOpportunity";
  const replyTo = input.replyTo?.trim();
  const result = await sendResendEmail({
    recipient: input.to,
    replyTo: replyTo && isValidEmailAddress(replyTo) ? replyTo : defaultReplyTo,
    from: `${fromName} <onboarding@resend.dev>`,
    failureLabel: input.failureLabel ?? "Feedback email",
    subject: input.subject,
    text: `Dear ${input.applicantName},\n\n${input.message}\n\n${fromName}`,
  });
  return { success: result.sent, error: result.sent ? null : result.reason };
}

export function sendApplicationNotification(input: {
  recipient?: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string | null;
  opportunityTitle: string;
  organizationName: string;
  coverNote: string;
  cvFileName: string;
  cvContent: string;
}) {
  const recipient = input.recipient ?? getApplicationNotificationEmail();
  if (!recipient) {
    return Promise.resolve({
      sent: false,
      reason: "APPLICATION_NOTIFICATION_EMAIL is not configured.",
    });
  }

  return sendResendEmail({
    recipient,
    failureLabel: "Employer notification email",
    replyTo: input.applicantEmail,
    subject: `New application: ${input.opportunityTitle}`,
    text: [
      `Applicant: ${input.applicantName}`,
      `Email: ${input.applicantEmail}`,
      `Phone: ${input.applicantPhone ?? "Not provided"}`,
      `Opportunity: ${input.opportunityTitle} at ${input.organizationName}`,
      "",
      "Cover note:",
      input.coverNote,
    ].join("\n"),
    attachment: { filename: input.cvFileName, content: input.cvContent },
  });
}

export function sendApplicationToEmployer(input: Parameters<typeof sendApplicationNotification>[0] & { recipient: string }) {
  return sendApplicationNotification(input);
}

export function sendApplicationConfirmation(input: {
  recipient: string;
  replyTo?: string;
  applicantName: string;
  opportunityTitle: string;
  organizationName: string;
  appliedAt: Date;
}) {
  const employerName = input.organizationName.trim() || "AgriOpportunity";
  return sendFeedbackEmail({
    to: input.recipient,
    applicantName: input.applicantName,
    fromName: employerName,
    replyTo: input.replyTo,
    failureLabel: "Applicant confirmation email",
    subject: `Application received: ${input.opportunityTitle} at ${employerName}`,
    message: `Thank you for applying for ${input.opportunityTitle} at ${employerName}. We confirm that we have received your application and will be in touch regarding next steps.\n\nKind regards,`,
  }).then((result) => ({
    sent: result.success,
    reason: result.error ?? "Email sent.",
  }));
}

export function sendGrantApplicationConfirmation(input: {
  recipient: string;
  applicantName: string;
  opportunityTitle: string;
  appliedAt: Date;
}) {
  return sendResendEmail({
    recipient: input.recipient,
    subject: `Grant application received: ${input.opportunityTitle}`,
    text: [
      `Hello ${input.applicantName},`,
      "",
      `Your company's application for ${input.opportunityTitle} was received on ${input.appliedAt.toLocaleDateString("en-ZA", { dateStyle: "long" })}.`,
      "You can track the application status and submitted documents from your employer dashboard.",
    ].join("\n"),
  });
}

export function sendGrantApplicationToProvider(input: {
  recipient: string;
  applicantName: string;
  applicantEmail: string;
  opportunityTitle: string;
  companyName: string;
  registrationNumber: string;
  sdlNumber: string;
  requestedAmount: string;
  documentNames: string[];
}) {
  return sendResendEmail({
    recipient: input.recipient,
    subject: `New grant application: ${input.opportunityTitle}`,
    text: [
      `Applicant: ${input.applicantName} (${input.applicantEmail})`,
      `Company: ${input.companyName}`,
      `Registration number: ${input.registrationNumber}`,
      `SDL number: ${input.sdlNumber}`,
      `Requested amount: ${input.requestedAmount}`,
      `Grant opportunity: ${input.opportunityTitle}`,
      "",
      `Submitted documents (${input.documentNames.length}):`,
      ...input.documentNames.map((name) => `- ${name}`),
      "",
      "Sign in to the employer dashboard to securely review the application and its documents.",
    ].join("\n"),
  });
}

export function sendNewOpportunityMatchEmail(input: {
  recipient: string;
  businessName: string;
  opportunityTitle: string;
  opportunityId: string;
  matchReason: string;
  audience?: "FARMER" | "SMME";
  preferredLanguage?: string;
}) {
  const baseUrl = (process.env.NEXTAUTH_URL ?? "https://agriopportunity.vercel.app").replace(/\/+$/, "");
  const farmerCopy = input.audience === "FARMER" ? getFarmerEmailCopy(input.preferredLanguage ?? "English") : null;
  return sendResendEmail({
    recipient: input.recipient,
    subject: farmerCopy ? `${farmerCopy.subject}: ${input.opportunityTitle}` : `New opportunity match: ${input.opportunityTitle}`,
    text: [
      ...(farmerCopy ? [] : [`Hello ${input.businessName},`, ""]),
      farmerCopy
        ? `${input.opportunityTitle}: ${farmerCopy.intro}`
        : `A new opportunity that may fit your business is now open: ${input.opportunityTitle}.`,
      farmerCopy ? "" : input.matchReason,
      "",
      `${farmerCopy?.action ?? "View details and apply"}: ${baseUrl}/opportunities/${input.opportunityId}`,
      ...(farmerCopy ? [] : ["", "You can update your business profile and support needs from your AgriOpportunity dashboard."]),
    ].join("\n"),
  });
}

export async function sendApplicationUpdateEmail(input: ApplicationEmailInput) {
  const successful = input.status === "successful" || input.status === "accepted";
  const shortlisted = input.status === "shortlisted" || input.status === "interview";
  const unsuccessful = input.status === "rejected" || input.status === "unsuccessful";
  const hasInterviewDetails = Boolean(input.interviewDate && input.interviewTime && input.interviewLocation);
  const outcome = input.placed || successful
    ? "Congratulations! Your application has been successful."
    : shortlisted
      ? "Congratulations! You have been shortlisted. We would like to invite you to an interview."
      : unsuccessful
        ? "Thank you for applying. Your application for this opportunity was unsuccessful."
        : `Your application status is now ${input.status.replaceAll("_", " ")}.`;

  return sendFeedbackEmail({
    to: input.recipient,
    applicantName: input.applicantName,
    subject: input.placed || successful
      ? `Successful application: ${input.opportunityTitle}`
      : shortlisted
        ? `You have been shortlisted: ${input.opportunityTitle}`
        : unsuccessful
          ? `Application outcome: ${input.opportunityTitle}`
          : `Application update: ${input.opportunityTitle}`,
    message: [
      `Regarding your application for ${input.opportunityTitle}:`,
      outcome,
      ...(shortlisted && hasInterviewDetails
        ? [
            "",
            "Interview details:",
            `Date: ${input.interviewDate}`,
            `Time: ${input.interviewTime}`,
            `Location: ${input.interviewLocation}`,
          ]
        : shortlisted
          ? ["We will contact you with the interview date, time, and location."]
          : []),
    ].join("\n"),
  }).then((result) => ({
    sent: result.success,
    reason: result.error ?? "Email sent.",
  }));
}