import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createUser, findUserByEmail } from "@/lib/database";

const registerSchema = z.object({
  email: z.email("Please provide a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  fullName: z.string().min(2, "Full name is required."),
  organizationName: z.string().optional(),
  role: z.enum(["LEARNER", "EMPLOYER"]).default("LEARNER"),
  location: z.string().optional(),
  skills: z.array(z.string()).optional(),
  qualifications: z.array(z.string()).optional(),
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

    if (parsed.data.role === "EMPLOYER" && !parsed.data.organizationName?.trim()) {
      return NextResponse.json({ error: "Organisation is required for employer accounts." }, { status: 400 });
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
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Registration failed.",
      },
      { status: 500 },
    );
  }
}
