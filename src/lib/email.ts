import { getFarmerEmailCopy } from "@/lib/notification-copy";

type ApplicationEmailInput = {
  recipient: string;
  applicantName: string;
  opportunityTitle: string;
  status: string;
  verified: boolean;
  placed: boolean;
};

type ResendEmailInput = {
  recipient: string;
  subject: string;
  text: string;
  attachment?: { filename: string; content: string };
};

async function sendResendEmail(input: ResendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { sent: false, reason: "Email provider is not configured." };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.recipient],
      subject: input.subject,
      text: input.text,
      ...(input.attachment ? { attachments: [input.attachment] } : {}),
    }),
  });
  if (!response.ok) throw new Error(`Email provider rejected the message: ${await response.text()}`);
  return { sent: true, reason: "Email sent." };
}

export function sendApplicationToEmployer(input: {
  recipient: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string | null;
  opportunityTitle: string;
  organizationName: string;
  coverNote: string;
  cvFileName: string;
  cvContent: string;
}) {
  return sendResendEmail({
    recipient: input.recipient,
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

export function sendApplicationConfirmation(input: {
  recipient: string;
  applicantName: string;
  opportunityTitle: string;
  organizationName: string;
  appliedAt: Date;
}) {
  return sendResendEmail({
    recipient: input.recipient,
    subject: `Application received: ${input.opportunityTitle}`,
    text: [
      `Hello ${input.applicantName},`,
      "",
      `You have applied for ${input.opportunityTitle} at ${input.organizationName} on ${input.appliedAt.toLocaleDateString("en-ZA", { dateStyle: "long" })}.`,
      "Your application status is Submitted. You can track updates from My Applications in your AgriOpportunity dashboard.",
    ].join("\n"),
  });
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
  const outcome = input.placed
    ? "You have been selected for placement."
    : input.status === "shortlisted"
      ? "You have been shortlisted for the next stage."
      : input.status === "rejected"
        ? "Your application has not been selected for this opportunity."
        : input.status === "unsuccessful"
          ? "Your application was not successful on this occasion."
          : `Your application status is now ${input.status.replaceAll("_", " ")}.`;

  return sendResendEmail({
    recipient: input.recipient,
    subject: input.placed
      ? `Placement update: ${input.opportunityTitle}`
      : input.status === "shortlisted"
        ? `You have been shortlisted: ${input.opportunityTitle}`
        : input.status === "rejected" || input.status === "unsuccessful"
          ? `Application outcome: ${input.opportunityTitle}`
          : `Application update: ${input.opportunityTitle}`,
    text: [
      `Hello ${input.applicantName},`,
      "",
      `There is an update to your application for ${input.opportunityTitle}.`,
      outcome,
      `Status: ${input.status}`,
      `Verified: ${input.verified ? "Yes" : "No"}`,
      `Placement: ${input.placed ? "Placed" : "Not placed"}`,
    ].join("\n"),
  });
}