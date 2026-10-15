import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createUser, findUserByEmail } from "@/lib/database";
import { languages, provinces } from "@/lib/agri-options";
import { uploadDocument } from "@/lib/object-storage";
import { isAllowedRegistrationEmail, registrationEmailPolicyMessage } from "@/lib/email-validation";
import { isValidPassword, passwordPolicyMessage } from "@/lib/password-validation";

const allowedBusinessDocumentTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const maximumBusinessDocumentSize = 10 * 1024 * 1024;

const registerSchema = z.object({
  email: z.email("Please provide a valid email address.").trim().toLowerCase()
    .refine(isAllowedRegistrationEmail, registrationEmailPolicyMessage),
  password: z.string().refine(isValidPassword, passwordPolicyMessage),
  fullName: z.string().trim().min(2, "Full name is required.").max(120, "Name must be 120 characters or fewer."),
  organizationName: z.string().trim().max(200, "Organisation name must be 200 characters or fewer.").optional(),
  phoneNumber: z.string().trim().max(30, "Contact number must be 30 characters or fewer.").optional(),
  role: z.enum(["LEARNER", "FARMER", "SMME", "COOPERATIVE", "EMPLOYER", "PROVIDER"]).default("LEARNER"),
  location: z.string().trim().max(160, "Location must be 160 characters or fewer.").optional(),
  province: z.enum(provinces).optional(),
  townDistrict: z.string().trim().max(160).optional(),
  preferredLanguage: z.enum(languages).default("English"),
  skills: z.array(z.string()).optional(),
  qualifications: z.array(z.string()).optional(),
}).refine((data) => data.role !== "EMPLOYER" || Boolean(data.organizationName && data.organizationName.length >= 2), {
  message: "Enter an organisation name of at least 2 characters.",
  path: ["organizationName"],
}).refine((data) => data.role !== "EMPLOYER" || Boolean(data.phoneNumber && /^\d{10}$/.test(data.phoneNumber)), {
  message: "Enter a contact number with exactly 10 digits.",
  path: ["phoneNumber"],
}).refine((data) => !["FARMER", "SMME", "COOPERATIVE"].includes(data.role) || Boolean(data.province), {
  message: "Choose your province.",
  path: ["province"],
}).refine((data) => data.role !== "EMPLOYER" || Boolean((data.province ?? data.location)?.length && (data.province ?? data.location)!.length >= 2), {
  message: "Choose your province or enter your region.",
  path: ["province"],
});

export async function POST(request: Request) {
  try {
    let body: unknown;
    let businessDocuments: File[] = [];
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const formData = await request.formData();
      const registration = formData.get("registration");
      if (typeof registration !== "string") {
        return NextResponse.json({ error: "Provide valid registration details." }, { status: 400 });
      }
      try {
        body = JSON.parse(registration);
      } catch {
        return NextResponse.json({ error: "Provide valid registration details." }, { status: 400 });
      }
      const uploadedValues = formData.getAll("businessDocuments");
      if (uploadedValues.some((value) => !(value instanceof File))) {
        return NextResponse.json({ error: "Upload valid business document files." }, { status: 400 });
      }
      businessDocuments = uploadedValues.filter((value): value is File => value instanceof File && value.size > 0);
    } else {
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Provide valid registration details." }, { status: 400 });
      }
    }
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid registration data." },
        { status: 400 },
      );
    }

    if (parsed.data.role === "EMPLOYER" && !businessDocuments.length) {
      return NextResponse.json({ error: "Upload at least one business document to register as an employer." }, { status: 400 });
    }
    if (parsed.data.role !== "EMPLOYER" && businessDocuments.length) {
      return NextResponse.json({ error: "Business documents can only be uploaded when registering as an employer." }, { status: 400 });
    }
    for (const document of businessDocuments) {
      if (!allowedBusinessDocumentTypes.has(document.type)) {
        return NextResponse.json({ error: "Business documents must be PDF, JPG, or PNG files." }, { status: 400 });
      }
      if (document.size > maximumBusinessDocumentSize) {
        return NextResponse.json({ error: "Each business document must be smaller than 10 MB." }, { status: 400 });
      }
    }

    if (await findUserByEmail(parsed.data.email)) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await hash(parsed.data.password, 10);
    const userId = crypto.randomUUID();
    const storedBusinessDocuments = [];
    for (const document of businessDocuments) {
      const storageUrl = await uploadDocument({
        file: document,
        userId,
        documentType: "business_registration",
      });
      storedBusinessDocuments.push({
        documentType: "business_registration",
        fileName: document.name,
        storageUrl,
      });
    }
    const user = await createUser({
      id: userId,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
      fullName: parsed.data.fullName,
      organizationName: parsed.data.organizationName,
      phoneNumber: parsed.data.phoneNumber,
      location: parsed.data.townDistrict || parsed.data.location || parsed.data.province,
      province: parsed.data.province,
      preferredLanguage: parsed.data.preferredLanguage,
      farmerProfile: parsed.data.role === "FARMER" ? { province: parsed.data.province! } : undefined,
      smmeProfile: parsed.data.role === "SMME" || parsed.data.role === "COOPERATIVE"
        ? {
            province: parsed.data.province!,
            businessName: parsed.data.organizationName,
            entityType: parsed.data.role === "COOPERATIVE" ? "co-operative" : undefined,
          }
        : undefined,
      skills: parsed.data.skills ?? [],
      qualifications: parsed.data.qualifications ?? [],
      documents: storedBusinessDocuments,
    });

    return NextResponse.json(
      {
        message: "Registration successful.",
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          province: user.province,
          preferredLanguage: user.preferredLanguage,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    console.error("User registration failed:", error);
    return NextResponse.json(
      { error: "Unable to complete registration right now. Please try again." },
      { status: 500 },
    );
  }
}
