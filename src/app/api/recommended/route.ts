import { NextResponse } from "next/server";
import {
  getFullRecommendations,
  getRecommendations,
  getSegmentOpportunities,
  findFrequentItemsets,
  getInterestCentrality,
} from "@/lib/recommend";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const type = searchParams.get("type") || "full";

    // If no email, return general insights
    if (!email) {
      if (type === "segments") {
        return NextResponse.json({
          ok: true,
          segments: getSegmentOpportunities(),
        });
      }

      if (type === "patterns") {
        return NextResponse.json({
          ok: true,
          patterns: findFrequentItemsets(0.05).slice(0, 20),
        });
      }

      if (type === "centrality") {
        return NextResponse.json({
          ok: true,
          centrality: getInterestCentrality(),
        });
      }

      // Return all general insights
      return NextResponse.json({
        ok: true,
        segments: getSegmentOpportunities(),
        patterns: findFrequentItemsets(0.05).slice(0, 10),
        centrality: getInterestCentrality().slice(0, 5),
      });
    }

    // Email provided - get personalized recommendations
    const validEmail = email.trim().toLowerCase();

    if (type === "recommendations") {
      return NextResponse.json({
        ok: true,
        email: validEmail,
        recommendations: getRecommendations(validEmail, 5),
      });
    }

    // Full recommendation result
    const result = getFullRecommendations(validEmail);

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Recommend API error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
