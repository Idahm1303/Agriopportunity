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

export async function sendApplicationUpdateEmail(input: ApplicationEmailInput) {
  return sendResendEmail({
    recipient: input.recipient,
    subject: `Application update: ${input.opportunityTitle}`,
    text: [
        `Hello ${input.applicantName},`,
        "",
        `Your application for ${input.opportunityTitle} has been updated.`,
        `Status: ${input.status}`,
        `Verified: ${input.verified ? "Yes" : "No"}`,
        `Placement: ${input.placed ? "Placed" : "Not placed"}`,
    ].join("\n"),
  });
}