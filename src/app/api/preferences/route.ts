import { NextResponse } from "next/server";
import { savePreferencesToKlaviyo } from "@/lib/klaviyo";
import { savePreference } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { email, interests, frequency } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const validEmail = email.trim().toLowerCase();
    const validInterests = Array.isArray(interests) ? interests : [];
    const validFrequency = typeof frequency === "string" ? frequency : "weekly";

    // Save to local database first (fast)
    const dbRecord = savePreference({
      email: validEmail,
      interests: validInterests,
      frequency: validFrequency,
    });

    // Send to Klaviyo (Events API + Profiles API)
    let klaviyoResult = null;
    let klaviyoError = null;

    try {
      klaviyoResult = await savePreferencesToKlaviyo({
        email: validEmail,
        interests: validInterests,
        frequency: validFrequency,
      });
    } catch (err) {
      // Don't fail the whole request if Klaviyo fails
      klaviyoError = err instanceof Error ? err.message : "Klaviyo API error";
      console.error("Klaviyo API error:", klaviyoError);
    }

    return NextResponse.json({
      ok: true,
      id: dbRecord.id,
      klaviyo: klaviyoResult,
      klaviyoError,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Preferences API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
