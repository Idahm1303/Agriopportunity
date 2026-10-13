import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { findUserById, getRecommendedBursaries, getRecommendedFunding, getRecommendedJobs, getRecommendedLearnerships } from "@/lib/database";

const recommendationServices = {
  jobs: getRecommendedJobs,
  learnerships: getRecommendedLearnerships,
  bursaries: getRecommendedBursaries,
  funding: getRecommendedFunding,
} as const;

export async function GET(_request: Request, { params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!Object.hasOwn(recommendationServices, category)) {
    return NextResponse.json({ error: "Unknown opportunity category." }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { userId?: string } | undefined)?.userId;
  const learner = userId ? await findUserById(userId) : undefined;
  const service = recommendationServices[category as keyof typeof recommendationServices];
  const opportunities = await service(learner?.skills ?? [], learner?.location);
  return NextResponse.json({ opportunities });
}