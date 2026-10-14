import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createUser, findUserByEmail } from "@/lib/database";
import { languages, provinces } from "@/lib/agri-options";

const registerSchema = z.object({
  email: z.email("Please provide a valid email address.").trim().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters."),
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
}).refine((data) => data.role !== "EMPLOYER" || Boolean(data.phoneNumber && data.phoneNumber.length >= 7), {
  message: "Enter a contact number of at least 7 characters.",
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
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Provide valid registration details." }, { status: 400 });
    }
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid registration data." },
        { status: 400 },
      );
    }

    if (await findUserByEmail(parsed.data.email)) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await hash(parsed.data.password, 10);
    const user = await createUser({
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
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Registration failed.",
      },
      { status: 500 },
    );
  }
}
