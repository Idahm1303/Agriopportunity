import { NextResponse } from "next/server";

import { getPlatformSettings } from "@/lib/platform-settings";

export async function GET() {
  try {
    const settings = await getPlatformSettings();
    return NextResponse.json(
      {
        registrationEnabled: settings.registrationEnabled,
        enabledOpportunityTypes: settings.enabledOpportunityTypes,
        siteName: settings.siteName,
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Unable to load public platform settings:", error);
    return NextResponse.json({ error: "Unable to load platform settings." }, { status: 500 });
  }
}
