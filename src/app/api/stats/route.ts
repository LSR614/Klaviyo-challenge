import { NextResponse } from "next/server";
import { getStats } from "@/lib/db";

export interface StatsResponse {
  ok: boolean;
  totalUpdates: number;
  uniqueEmails: number;
  interestCounts: Record<string, number>;
  frequencyCounts: Record<string, number>;
  mostPopularInterest: string | null;
  mostPopularFrequency: string | null;
}

export async function GET() {
  try {
    const stats = getStats();

    // Find most popular interest
    let mostPopularInterest: string | null = null;
    let maxInterestCount = 0;
    for (const [interest, count] of Object.entries(stats.interestCounts)) {
      if (count > maxInterestCount) {
        maxInterestCount = count;
        mostPopularInterest = interest;
      }
    }

    // Find most popular frequency
    let mostPopularFrequency: string | null = null;
    let maxFrequencyCount = 0;
    for (const [frequency, count] of Object.entries(stats.frequencyCounts)) {
      if (count > maxFrequencyCount) {
        maxFrequencyCount = count;
        mostPopularFrequency = frequency;
      }
    }

    const response: StatsResponse = {
      ok: true,
      ...stats,
      mostPopularInterest,
      mostPopularFrequency,
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stats API error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
