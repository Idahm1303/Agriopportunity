type ApplicationEmailInput = {
  recipient: string;
  applicantName: string;
  opportunityTitle: string;
  status: string;
  verified: boolean;
  placed: boolean;
};

export async function sendApplicationUpdateEmail(input: ApplicationEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    return { sent: false, reason: "Email provider is not configured." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.recipient],
      subject: `Application update: ${input.opportunityTitle}`,
      text: [
        `Hello ${input.applicantName},`,
        "",
        `Your application for ${input.opportunityTitle} has been updated.`,
        `Status: ${input.status}`,
        `Verified: ${input.verified ? "Yes" : "No"}`,
        `Placement: ${input.placed ? "Placed" : "Not placed"}`,
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Email provider rejected the message: ${details}`);
  }

  return { sent: true, reason: "Email sent." };
}