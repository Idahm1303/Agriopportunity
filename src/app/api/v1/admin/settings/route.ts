import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { getPlatformSettings, savePlatformSettings } from "@/lib/platform-settings";
import { platformSettingsSchema } from "@/lib/platform-settings-schema";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  try {
    return NextResponse.json({ settings: await getPlatformSettings() });
  } catch (error) {
    console.error("Unable to load platform settings:", error);
    return NextResponse.json({ error: "Unable to load platform settings." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { userId?: string; role?: string } | undefined;
  if (!user?.userId || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Provide valid platform settings." }, { status: 400 });
  }
  const parsed = platformSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid platform settings." }, { status: 400 });
  }

  try {
    await savePlatformSettings(parsed.data, user.userId);
    return NextResponse.json({ settings: parsed.data });
  } catch (error) {
    console.error("Unable to save platform settings:", error);
    return NextResponse.json({ error: "Unable to save platform settings." }, { status: 500 });
  }
}
