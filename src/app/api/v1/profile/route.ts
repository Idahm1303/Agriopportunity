import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { createDocument, findUserById, updateUserProfile } from "@/lib/database";
import { extractQualification } from "@/lib/qualification-ocr";

const profileSchema = z.object({
  phoneNumber: z.string().min(7, "Enter a valid contact number."),
  address: z.string().min(3, "Enter your address."),
  location: z.string().min(2, "Enter your province or town."),
  skills: z.array(z.string().min(1)).min(1, "Select at least one skill."),
  qualification: z.string().min(2, "Enter your qualification."),
});

const allowedDocumentTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const maximumDocumentSize = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { userId?: string } | undefined)?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const skills = formData.getAll("skills").map(String);
    const parsed = profileSchema.safeParse({
      phoneNumber: formData.get("phoneNumber"),
      address: formData.get("address"),
      location: formData.get("location"),
      skills,
      qualification: formData.get("qualification"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Complete all profile fields." },
        { status: 400 },
      );
    }

    const currentUser = await findUserById(userId);
    if (!currentUser) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    const document = formData.get("qualificationDocument");
    let extractedSkills: string[] = [];
    let extractedQualifications: string[] = [];
    let extractionConfidence: number | undefined;

    if (document instanceof File && document.size > 0) {
      if (!allowedDocumentTypes.has(document.type)) {
        return NextResponse.json({ error: "Upload a PDF, JPG, or PNG document." }, { status: 400 });
      }
      if (document.size > maximumDocumentSize) {
        return NextResponse.json({ error: "The document must be smaller than 10 MB." }, { status: 400 });
      }

      const extraction = await extractQualification(document);
      extractedSkills = extraction.skills;
      extractedQualifications = extraction.qualifications;
      extractionConfidence = extraction.confidence;
    }

    const profileSkills = Array.from(new Set([...parsed.data.skills, ...extractedSkills]));
    const qualifications = Array.from(new Set([parsed.data.qualification, ...currentUser.qualifications, ...extractedQualifications]));

    await updateUserProfile({
      id: userId,
      phoneNumber: parsed.data.phoneNumber,
      address: parsed.data.address,
      location: parsed.data.location,
      skills: profileSkills,
      qualifications,
    });

    if (document instanceof File && document.size > 0) {
      await createDocument({
        userId,
        documentType: "qualification",
        fileName: document.name,
        extractedQualifications,
        extractedSkills,
        confidence: extractionConfidence,
      });
    }

    return NextResponse.json({
      message: document instanceof File && document.size > 0 ? "Profile updated and qualification scanned." : "Profile updated.",
      extractionConfidence,
      requiresConfirmation: extractionConfidence !== undefined && extractionConfidence < 0.8,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update profile." },
      { status: 500 },
    );
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { userId?: string } | undefined)?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const user = await findUserById(userId);
  if (!user) return NextResponse.json({ error: "User account not found." }, { status: 404 });

  return NextResponse.json({
    user: {
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber ?? "",
      address: user.address ?? "",
      location: user.location ?? "",
      skills: user.skills,
    },
  });
}
