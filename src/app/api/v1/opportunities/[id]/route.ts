import { NextResponse } from "next/server";

import { getOpportunityById } from "@/lib/database";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const opportunity = await getOpportunityById(id);

  if (!opportunity) {
    return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
  }

  return NextResponse.json({ opportunity });
}
