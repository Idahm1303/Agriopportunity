import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createUser, findUserByEmail } from "@/lib/database";

const registerSchema = z.object({
  email: z.email("Please provide a valid email address.").trim().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  fullName: z.string().trim().min(2, "Full name is required.").max(120, "Name must be 120 characters or fewer."),
  organizationName: z.string().trim().max(200, "Organisation name must be 200 characters or fewer.").optional(),
  role: z.enum(["LEARNER", "EMPLOYER"]).default("LEARNER"),
  location: z.string().trim().max(160, "Location must be 160 characters or fewer.").optional(),
  skills: z.array(z.string()).optional(),
  qualifications: z.array(z.string()).optional(),
}).refine((data) => data.role !== "EMPLOYER" || Boolean(data.organizationName && data.organizationName.length >= 2), {
  message: "Enter an organisation name of at least 2 characters.",
  path: ["organizationName"],
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
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
      location: parsed.data.location,
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
