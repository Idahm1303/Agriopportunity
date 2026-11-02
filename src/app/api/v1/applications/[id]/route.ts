import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { addAuditEntry } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { ApplicationClosingDateError, updateEmployerApplication } from "@/lib/database";
import { getApplicationNotificationEmail, sendApplicationUpdateEmail } from "@/lib/email";

const interviewDateSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
});

const statusSchema = z.object({
  status: z.enum(["submitted", "under_review", "shortlisted", "interview", "accepted", "rejected", "successful", "unsuccessful"]).optional(),
  verify: z.boolean().optional(),
  place: z.boolean().optional(),
  interviewDate: interviewDateSchema.nullable().optional(),
  interviewTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  interviewLocation: z.string().trim().min(1).max(500).nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = (session.user as { role?: string } | undefined)?.role ?? "LEARNER";
  if (!['EMPLOYER', 'PROVIDER', 'ADMIN'].includes(role)) {
    return NextResponse.json({ error: "Only employers, providers, and admins can update status." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = statusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid status update." },
        { status: 400 },
      );
    }

    const hasInterviewUpdate = parsed.data.interviewDate !== undefined ||
      parsed.data.interviewTime !== undefined ||
      parsed.data.interviewLocation !== undefined;
    if (!parsed.data.status && !parsed.data.verify && !parsed.data.place && !hasInterviewUpdate) {
      return NextResponse.json({ error: "Choose a status or action." }, { status: 400 });
    }
    const interviewFields = [parsed.data.interviewDate, parsed.data.interviewTime, parsed.data.interviewLocation]
      .filter((value) => value !== undefined);
    if (hasInterviewUpdate && interviewFields.length !== 3) {
      return NextResponse.json({ error: "Provide the interview date, time, and location together." }, { status: 400 });
    }

    const employerId = (session.user as { userId?: string } | undefined)?.userId;
    if (!employerId) return NextResponse.json({ error: "User session missing." }, { status: 400 });
    const updated = await updateEmployerApplication({
      appId: id,
      employerId,
      isAdmin: role === "ADMIN",
      status: parsed.data.status,
      verify: parsed.data.verify,
      place: parsed.data.place,
      interviewDate: parsed.data.interviewDate,
      interviewTime: parsed.data.interviewTime,
      interviewLocation: parsed.data.interviewLocation,
    });
    if (!updated) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const action = parsed.data.place
      ? "application_placed"
      : parsed.data.verify
        ? "application_verified"
        : "application_status_changed";
    let emailResult: { sent: boolean } | null = null;
    if (updated.statusChanged || updated.interviewDetailsChanged) {
      emailResult = { sent: false };
      try {
        emailResult = await sendApplicationUpdateEmail({
          recipient: updated.user.email,
          replyTo: getApplicationNotificationEmail() ?? undefined,
          applicantName: updated.user.fullName,
          opportunityTitle: updated.opportunity.title,
          status: updated.status,
          placed: Boolean(updated.placedAt),
          interviewDate: updated.interviewDate?.toISOString().slice(0, 10) ?? null,
          interviewTime: updated.interviewTime,
          interviewLocation: updated.interviewLocation,
        });
      } catch (emailError) {
        const message = emailError instanceof Error ? emailError.message : "Email delivery failed.";
        console.error("Applicant status email delivery failed:", message);
      }
    }

    await addAuditEntry({
      action,
      entityType: "application",
      entityId: updated.id,
      performedBy: (session.user as { userId?: string } | undefined)?.userId ?? session.user?.email ?? "system",
      details: `Status: ${updated.status}; verified: ${Boolean(updated.verifiedAt)}; placed: ${Boolean(updated.placedAt)}`,
    });
    await addAuditEntry({
      action: "application_email_notification",
      entityType: "application",
      entityId: updated.id,
      performedBy: employerId,
      details: emailResult
        ? emailResult.sent
          ? "Applicant status email sent."
          : "Applicant status email failed; see server logs."
        : "No applicant email needed for this update.",
    });

    return NextResponse.json({
      application: updated,
      ...(emailResult?.sent ? { emailSent: true } : {}),
    });
  } catch (error) {
    if (error instanceof ApplicationClosingDateError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update application status." },
      { status: 500 },
    );
  }
}
