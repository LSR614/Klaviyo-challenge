import { NextResponse } from "next/server";
import { getRecentUpdates, type PreferenceUpdate } from "@/lib/db";

export interface UpdatesResponse {
  ok: boolean;
  updates: PreferenceUpdate[];
  count: number;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10)), 100) : 10;

    const updates = getRecentUpdates(limit);

    const response: UpdatesResponse = {
      ok: true,
      updates,
      count: updates.length,
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Updates API error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
