import { NextResponse } from "next/server";

import { sendFeedbackEmail } from "@/lib/email";

export async function GET() {
  // Delete this test route before launch.
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const result = await sendFeedbackEmail({
    to: "agriopportunity@gmail.com",
    applicantName: "AgriOpportunity applicant",
    subject: "Test application feedback email",
    message: "This is a test email confirming the Resend integration is configured.",
  });

  return NextResponse.json(result, { status: result.success ? 200 : 502 });
}
